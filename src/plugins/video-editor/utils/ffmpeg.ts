import {
  FFmpeg,
  type ProgressEventCallback,
  type LogEventCallback,
} from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;
let currentProgressCb: ProgressEventCallback | null = null;
let currentLogCb: LogEventCallback | null = null;

const CORE_BASE_URL =
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";

const MAX_LOG_LINES = 5;

export type ProgressCallback = (
  progress: number,
  message: string,
  logs: string[],
) => void;

/**
 * Ensure FFmpeg is loaded. Returns the singleton instance.
 */
async function ensureLoaded(signal?: AbortSignal): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;

  ffmpeg = new FFmpeg();

  await ffmpeg.load(
    {
      coreURL: await toBlobURL(
        `${CORE_BASE_URL}/ffmpeg-core.js`,
        "text/javascript",
      ),
      wasmURL: await toBlobURL(
        `${CORE_BASE_URL}/ffmpeg-core.wasm`,
        "application/wasm",
      ),
    },
    { signal },
  );

  return ffmpeg;
}

/**
 * Parse time= from an FFmpeg log line and return seconds, or null.
 */
function parseLogTime(message: string): number | null {
  const match = message.match(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) return null;
  return (
    parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3])
  );
}

/**
 * Load FFmpeg and attach progress + log listeners.
 * Replaces any previously attached listeners.
 *
 * @param onProgress  Called with (progress 0-1, message, recent log lines)
 * @param duration    Total input duration in seconds — used to compute progress from log time=
 * @param signal      AbortSignal for cancellation
 */
export async function getFFmpeg(
  onProgress?: ProgressCallback,
  duration?: number,
  signal?: AbortSignal,
): Promise<FFmpeg> {
  const ff = await ensureLoaded(signal);

  // Clean up previous listeners
  if (currentProgressCb) {
    ff.off("progress", currentProgressCb);
    currentProgressCb = null;
  }
  if (currentLogCb) {
    ff.off("log", currentLogCb);
    currentLogCb = null;
  }

  const recentLogs: string[] = [];

  // Attach log listener — parses time= for accurate progress
  const logCb: LogEventCallback = ({ type, message }) => {
    console.log(`[ffmpeg:${type}]`, message);

    // Keep last N log lines
    recentLogs.push(message);
    if (recentLogs.length > MAX_LOG_LINES) recentLogs.shift();

    // Parse time= for progress
    if (onProgress && duration && duration > 0) {
      const timeSec = parseLogTime(message);
      if (timeSec !== null) {
        const progress = Math.max(0, Math.min(1, timeSec / duration));
        onProgress(progress, `Processing... ${Math.round(progress * 100)}%`, [
          ...recentLogs,
        ]);
      }
    }
  };
  ff.on("log", logCb);
  currentLogCb = logCb;

  // Attach progress listener as fallback (fires less reliably)
  if (onProgress) {
    const progressCb: ProgressEventCallback = ({ progress }) => {
      // Only use if we haven't gotten a log-based update yet
      // (log-based is more accurate)
      const clamped = Math.max(0, Math.min(1, progress));
      if (clamped > 0) {
        onProgress(clamped, `Processing... ${Math.round(clamped * 100)}%`, [
          ...recentLogs,
        ]);
      }
    };
    ff.on("progress", progressCb);
    currentProgressCb = progressCb;
  }

  return ff;
}

/**
 * Write an input file to FFmpeg's virtual filesystem.
 */
export async function writeInputFile(
  file: File,
  name: string,
  signal?: AbortSignal,
): Promise<void> {
  const ff = await ensureLoaded();
  const data = await fetchFile(file);
  await ff.writeFile(name, data, { signal });
}

/**
 * Execute an FFmpeg command and return the output file data.
 */
export async function exec(
  args: string[],
  outputName: string,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  const ff = await ensureLoaded();
  await ff.exec(args, undefined, { signal });
  const data = await ff.readFile(outputName, undefined, { signal });
  return data as Uint8Array;
}

/**
 * Clean up files from FFmpeg's virtual filesystem.
 */
export async function cleanup(files: string[]): Promise<void> {
  if (!ffmpeg || !ffmpeg.loaded) return;
  for (const file of files) {
    try {
      await ffmpeg.deleteFile(file);
    } catch {
      // ignore — file may not exist after terminate
    }
  }
}

/**
 * Remove listeners, terminate the FFmpeg instance, and free memory.
 * `getFFmpeg()` must be called again after this.
 */
export function terminate(): void {
  if (ffmpeg) {
    if (currentProgressCb) {
      ffmpeg.off("progress", currentProgressCb);
      currentProgressCb = null;
    }
    if (currentLogCb) {
      ffmpeg.off("log", currentLogCb);
      currentLogCb = null;
    }
    ffmpeg.terminate();
    ffmpeg = null;
  }
}
