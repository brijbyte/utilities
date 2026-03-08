import type { Operations, VideoMeta, ProcessingState } from "./types";
import { buildCommand, getMimeType } from "./commands";

export interface ProcessResult {
  outputUrl: string;
  outputName: string;
  outputSize: number;
}

let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./worker.js", import.meta.url), {
      type: "module",
    });
  }
  return worker;
}

/**
 * Terminate the worker and FFmpeg inside it.
 */
export function terminate(): void {
  if (worker) {
    worker.postMessage({ type: "terminate" });
    worker.terminate();
    worker = null;
  }
}

/**
 * Process a video file through FFmpeg in a Web Worker.
 *
 * For files ≤2GB: pass a pre-read ArrayBuffer (zero-copy transfer).
 * For files >2GB: pass the File object and use WORKERFS mount
 * (FFmpeg reads on demand, no full copy into memory).
 *
 * @param input    Pre-read ArrayBuffer, or File object for large files
 * @param fileName Original file name (for extension detection)
 * @param meta     Video metadata
 * @param ops      Enabled operations
 * @param onState  Callback for progress/state updates
 * @param signal   AbortSignal — abort to cancel processing and terminate worker
 * @returns        Output blob URL, filename, and size
 * @throws         DOMException with name "AbortError" if aborted
 */
export function processVideo(
  input: ArrayBuffer | File,
  fileName: string,
  meta: VideoMeta,
  ops: Operations,
  onState: (state: ProcessingState) => void,
  signal: AbortSignal,
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }

    const w = getWorker();

    // Build command on main thread (lightweight, needs types)
    const ext = fileName.split(".").pop() || "mp4";
    const inputName = `input_video.${ext}`;
    const [args, outputName] = buildCommand(inputName, ops, meta);
    const outputExt = outputName.split(".").pop() || "mp4";
    const mimeType = getMimeType(outputExt);

    // Effective duration for progress
    const duration = ops.trim.enabled
      ? ops.trim.end - ops.trim.start
      : meta.duration;

    console.log("[video-editor] ffmpeg", args.join(" "));

    const onAbort = () => {
      cleanup();
      terminate();
      reject(new DOMException("Aborted", "AbortError"));
    };

    // Throttle progress updates to ~4 per second to avoid render thrashing
    let lastProgressUpdate = 0;
    const PROGRESS_THROTTLE_MS = 250;

    const onMessage = (e: MessageEvent) => {
      const msg = e.data;

      if (signal.aborted) return;

      switch (msg.type) {
        case "state":
          if (msg.status === "loading-ffmpeg") {
            onState({ status: "loading-ffmpeg" });
          }
          break;

        case "progress": {
          const now = performance.now();
          if (now - lastProgressUpdate < PROGRESS_THROTTLE_MS) break;
          lastProgressUpdate = now;
          onState({
            status: "processing",
            progress: msg.progress,
            message: msg.message,
            logs: msg.logs,
          });
          break;
        }

        case "done": {
          cleanup();
          const blob = msg.blob as Blob;
          const outputUrl = URL.createObjectURL(blob);
          resolve({
            outputUrl,
            outputName: msg.outputName,
            outputSize: blob.size,
          });
          break;
        }

        case "error":
          cleanup();
          reject(new Error(msg.error));
          break;
      }
    };

    function cleanup() {
      signal.removeEventListener("abort", onAbort);
      w.removeEventListener("message", onMessage);
    }

    signal.addEventListener("abort", onAbort, { once: true });
    w.addEventListener("message", onMessage);

    onState({
      status: "processing",
      progress: 0,
      message: "Preparing...",
      logs: [],
    });

    if (input instanceof ArrayBuffer) {
      // Small file path: copy buffer and transfer (zero-copy) to worker
      const copy = input.slice(0);
      w.postMessage(
        {
          type: "process",
          buffer: copy,
          args,
          inputName,
          outputName,
          duration,
          mimeType,
        },
        [copy],
      );
    } else {
      // Large file path: pass File object for WORKERFS mount
      // File picker File references are stable and survive structured clone
      w.postMessage({
        type: "process",
        file: input,
        args,
        inputName,
        outputName,
        duration,
        mimeType,
      });
    }
  });
}
