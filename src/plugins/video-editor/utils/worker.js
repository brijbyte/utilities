import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

const CORE_BASE_URL =
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";
const MAX_LOG_LINES = 5;
const MOUNT_DIR = "/work";

/** @type {FFmpeg | null} */
let ffmpeg = null;

/**
 * Parse time= from FFmpeg log line → seconds or null.
 */
function parseLogTime(message) {
  const match = message.match(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) return null;
  return (
    parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3])
  );
}

/**
 * Ensure FFmpeg is loaded inside this worker.
 */
async function ensureLoaded() {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;

  ffmpeg = new FFmpeg();

  self.postMessage({ type: "state", status: "loading-ffmpeg" });

  await ffmpeg.load({
    coreURL: await toBlobURL(
      `${CORE_BASE_URL}/ffmpeg-core.js`,
      "text/javascript",
    ),
    wasmURL: await toBlobURL(
      `${CORE_BASE_URL}/ffmpeg-core.wasm`,
      "application/wasm",
    ),
  });

  return ffmpeg;
}

/**
 * Attach progress/log listeners. Returns a cleanup function.
 */
function attachListeners(ff, duration) {
  const recentLogs = [];

  const logCb = ({ type, message }) => {
    recentLogs.push(message);
    if (recentLogs.length > MAX_LOG_LINES) recentLogs.shift();

    if (duration > 0) {
      const timeSec = parseLogTime(message);
      if (timeSec !== null) {
        const progress = Math.max(0, Math.min(1, timeSec / duration));
        self.postMessage({
          type: "progress",
          progress,
          message: `Processing... ${Math.round(progress * 100)}%`,
          logs: [...recentLogs],
        });
      }
    }
  };

  const progressCb = ({ progress }) => {
    const clamped = Math.max(0, Math.min(1, progress));
    if (clamped > 0) {
      self.postMessage({
        type: "progress",
        progress: clamped,
        message: `Processing... ${Math.round(clamped * 100)}%`,
        logs: [...recentLogs],
      });
    }
  };

  ff.on("log", logCb);
  ff.on("progress", progressCb);

  return () => {
    ff.off("log", logCb);
    ff.off("progress", progressCb);
  };
}

/**
 * Process using a pre-read ArrayBuffer (files ≤2GB).
 */
async function processBuffer({
  buffer,
  args,
  inputName,
  outputName,
  duration,
  mimeType,
}) {
  const ff = await ensureLoaded();
  const cleanup = attachListeners(ff, duration);

  try {
    self.postMessage({
      type: "progress",
      progress: 0,
      message: "Preparing...",
      logs: [],
    });
    await ff.writeFile(inputName, new Uint8Array(buffer));

    self.postMessage({
      type: "progress",
      progress: 0,
      message: "Processing...",
      logs: [],
    });
    console.log("[video-editor:worker] ffmpeg", args.join(" "));
    await ff.exec(args);

    const outputData = await ff.readFile(outputName);
    const blob = new Blob([outputData], { type: mimeType });

    try {
      await ff.deleteFile(inputName);
    } catch {}
    try {
      await ff.deleteFile(outputName);
    } catch {}

    self.postMessage({ type: "done", blob, outputName });
  } finally {
    cleanup();
  }
}

/**
 * Process using WORKERFS mount (files >2GB).
 * The File is mounted directly into FFmpeg's virtual filesystem —
 * FFmpeg reads from it on demand without loading everything into memory.
 */
async function processMount({
  file,
  args,
  inputName,
  outputName,
  duration,
  mimeType,
}) {
  const ff = await ensureLoaded();
  const cleanup = attachListeners(ff, duration);
  let mounted = false;

  try {
    self.postMessage({
      type: "progress",
      progress: 0,
      message: "Mounting file...",
      logs: [],
    });

    // Mount the File via WORKERFS — FFmpeg reads on demand, no full copy
    await ff.mount("WORKERFS", { files: [file] }, MOUNT_DIR);
    mounted = true;

    // WORKERFS mounts files with their original name inside the mount dir
    const mountedInput = `${MOUNT_DIR}/${file.name}`;

    // Rewrite args to use the mounted path instead of the original input name
    const mountedArgs = args.map((a) => (a === inputName ? mountedInput : a));

    self.postMessage({
      type: "progress",
      progress: 0,
      message: "Processing...",
      logs: [],
    });
    console.log(
      "[video-editor:worker] ffmpeg (mounted)",
      mountedArgs.join(" "),
    );
    await ff.exec(mountedArgs);

    const outputData = await ff.readFile(outputName);
    const blob = new Blob([outputData], { type: mimeType });

    try {
      await ff.deleteFile(outputName);
    } catch {}

    self.postMessage({ type: "done", blob, outputName });
  } finally {
    cleanup();
    if (mounted) {
      try {
        await ff.unmount(MOUNT_DIR);
      } catch {}
    }
  }
}

self.onmessage = async (e) => {
  const { type } = e.data;

  if (type === "process") {
    try {
      if (e.data.buffer) {
        await processBuffer(e.data);
      } else if (e.data.file) {
        await processMount(e.data);
      }
    } catch (err) {
      self.postMessage({
        type: "error",
        error: err instanceof Error ? err.message : "Processing failed",
      });
    }
  } else if (type === "terminate") {
    if (ffmpeg) {
      ffmpeg.terminate();
      ffmpeg = null;
    }
    self.postMessage({ type: "terminated" });
  }
};
