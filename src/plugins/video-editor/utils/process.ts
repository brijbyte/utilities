import type { Operations, VideoMeta, ProcessingState } from "./types";
import { getFFmpeg, writeInputFile, exec, cleanup, terminate } from "./ffmpeg";
import { buildCommand, getMimeType } from "./commands";

export interface ProcessResult {
  outputUrl: string;
  outputName: string;
  outputSize: number;
}

/**
 * Process a video file through FFmpeg with the given operations.
 *
 * @param file    Input video file
 * @param meta    Video metadata
 * @param ops     Enabled operations
 * @param onState Callback for progress/state updates
 * @param signal  AbortSignal — abort to cancel processing and terminate FFmpeg
 * @returns       Output blob URL, filename, and size
 * @throws        DOMException with name "AbortError" if aborted
 */
export async function processVideo(
  file: File,
  meta: VideoMeta,
  ops: Operations,
  onState: (state: ProcessingState) => void,
  signal: AbortSignal,
): Promise<ProcessResult> {
  // Terminate FFmpeg on abort — kills the web worker immediately
  const onAbort = () => terminate();
  signal.addEventListener("abort", onAbort, { once: true });

  const inputName = `input_video.${file.name.split(".").pop() || "mp4"}`;
  let outputName: string | undefined;

  // Compute effective duration for progress calculation
  const effectiveDuration = ops.trim.enabled
    ? ops.trim.end - ops.trim.start
    : meta.duration;

  try {
    // Load FFmpeg
    signal.throwIfAborted();
    onState({ status: "loading-ffmpeg" });
    await getFFmpeg(
      (progress, message, logs) => {
        if (signal.aborted) return;
        onState({ status: "processing", progress, message, logs });
      },
      effectiveDuration,
      signal,
    );

    signal.throwIfAborted();

    // Write input file
    onState({
      status: "processing",
      progress: 0,
      message: "Writing input file...",
      logs: [],
    });
    await writeInputFile(file, inputName, signal);

    signal.throwIfAborted();

    // Build and execute command
    const [args, outName] = buildCommand(inputName, ops, meta);
    outputName = outName;
    console.log("[video-editor] ffmpeg", args.join(" "));
    onState({
      status: "processing",
      progress: 0,
      message: "Processing...",
      logs: [],
    });

    const outputData = await exec(args, outputName, signal);

    signal.throwIfAborted();

    // Create output blob
    const outputExt = outputName.split(".").pop() || "mp4";
    const mimeType = getMimeType(outputExt);
    const blob = new Blob([new Uint8Array(outputData)], { type: mimeType });
    const outputUrl = URL.createObjectURL(blob);

    // Cleanup FFmpeg virtual FS
    await cleanup([inputName, outputName]);

    return { outputUrl, outputName, outputSize: blob.size };
  } catch (err) {
    // Best-effort cleanup of virtual FS on error
    const filesToClean = [inputName];
    if (outputName) filesToClean.push(outputName);
    await cleanup(filesToClean).catch(() => {});

    throw err;
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}
