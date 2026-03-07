// ── Video metadata ──────────────────────────────────────────────────

export interface VideoMeta {
  duration: number; // seconds
  width: number;
  height: number;
  size: number; // bytes
  type: string; // MIME type
  name: string;
}

// ── Operation configs ───────────────────────────────────────────────

export interface CompressConfig {
  enabled: boolean;
  format: "mp4" | "webm";
  mode: "crf" | "target-size";
  crf: number; // 0-51, lower = better quality
  targetSizeMB: number;
}

export interface TrimConfig {
  enabled: boolean;
  start: number; // seconds
  end: number; // seconds
}

export type ResizeFit = "pad" | "crop" | "stretch";

export interface ResizeConfig {
  enabled: boolean;
  preset: "original" | "1080p" | "720p" | "480p" | "360p" | "custom";
  width: number;
  height: number;
  maintainAspect: boolean;
  /** How to handle aspect ratio mismatch: pad (black bars), crop (cut edges), stretch */
  fit: ResizeFit;
}

export interface ConvertConfig {
  enabled: boolean;
  format:
    | "mp4"
    | "webm"
    | "gif"
    | "avi"
    | "mov"
    | "mp3"
    | "aac"
    | "wav"
    | "ogg";
}

export interface AudioConfig {
  enabled: boolean;
  action: "remove" | "extract";
  extractFormat: "mp3" | "aac" | "wav" | "ogg";
}

export interface RotateConfig {
  enabled: boolean;
  rotation: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
}

// ── Combined operations ─────────────────────────────────────────────

export interface Operations {
  compress: CompressConfig;
  trim: TrimConfig;
  resize: ResizeConfig;
  convert: ConvertConfig;
  audio: AudioConfig;
  rotate: RotateConfig;
}

// ── Processing state ────────────────────────────────────────────────

export type ProcessingState =
  | { status: "idle" }
  | { status: "loading-ffmpeg" }
  | { status: "processing"; progress: number; message: string; logs: string[] }
  | {
      status: "done";
      outputUrl: string;
      outputName: string;
      outputSize: number;
    }
  | { status: "error"; error: string };

// ── Resolution presets ──────────────────────────────────────────────

export const RESOLUTION_PRESETS: Record<
  string,
  { width: number; height: number; label: string }
> = {
  "1080p": { width: 1920, height: 1080, label: "1080p (1920×1080)" },
  "720p": { width: 1280, height: 720, label: "720p (1280×720)" },
  "480p": { width: 854, height: 480, label: "480p (854×480)" },
  "360p": { width: 640, height: 360, label: "360p (640×360)" },
};

// ── Audio formats ───────────────────────────────────────────────────

export const AUDIO_FORMATS = ["mp3", "aac", "wav", "ogg"] as const;
export const VIDEO_FORMATS = ["mp4", "webm", "gif", "avi", "mov"] as const;
export const ALL_OUTPUT_FORMATS = [...VIDEO_FORMATS, ...AUDIO_FORMATS] as const;

// ── Helpers ─────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i > 1 ? 1 : 0)} ${sizes[i]}`;
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 100);
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
}

export function formatTimeFfmpeg(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${s.toFixed(3).padStart(6, "0")}`;
}

export function defaultOperations(meta: VideoMeta): Operations {
  return {
    compress: {
      enabled: false,
      format: "mp4",
      mode: "crf",
      crf: 23,
      targetSizeMB: Math.max(1, Math.round(meta.size / (1024 * 1024) / 2)),
    },
    trim: {
      enabled: false,
      start: 0,
      end: meta.duration,
    },
    resize: {
      enabled: false,
      preset: "720p",
      width: meta.width,
      height: meta.height,
      maintainAspect: true,
      fit: "pad",
    },
    convert: {
      enabled: false,
      format: "mp4",
    },
    audio: {
      enabled: false,
      action: "remove",
      extractFormat: "mp3",
    },
    rotate: {
      enabled: false,
      rotation: 0,
      flipH: false,
      flipV: false,
    },
  };
}
