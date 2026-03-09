// ── Quality report ──────────────────────────────────────────

export interface BlurScore {
  score: number;
  label: "sharp" | "soft" | "blurry";
}

export interface ExposureScore {
  mean: number;
  stdDev: number;
  label: "good" | "dark" | "bright" | "flat";
}

export interface ResolutionScore {
  megapixels: number;
  label: "high" | "medium" | "low";
}

export type OverallQuality = "good" | "fair" | "poor";

export interface QualityReport {
  blur: BlurScore;
  exposure: ExposureScore;
  resolution: ResolutionScore;
  overall: OverallQuality;
}

// ── Image metadata ──────────────────────────────────────────

export interface ImageMeta {
  name: string;
  size: number;
  type: string; // MIME type
  lastModified: number;
  width: number;
  height: number;
  megapixels: number;
  aspectRatio: string; // e.g. "16:9", "4:3", "1:1"
  bitDepth: string; // estimated from format
  colorMode: string; // "RGB", "RGBA"
}

// ── Image file ──────────────────────────────────────────────

export interface ImageFile {
  id: string;
  file: File;
  url: string; // Object URL
  width: number;
  height: number;
  quality: QualityReport | null;
  meta: ImageMeta | null;
  exif: import("./exif").ExifData | null;
  faces: import("./face-detect").FaceResult[] | null; // null = not yet detected
}

// ── Resize config ───────────────────────────────────────────

export type ResizePreset = "1080" | "720" | "480" | "custom";

export interface ResizeConfig {
  preset: ResizePreset;
  width: number;
  height: number;
  maintainAspect: boolean;
}

// ── Convert config ──────────────────────────────────────────

export type OutputFormat = "image/png" | "image/jpeg" | "image/webp";

export interface ConvertConfig {
  format: OutputFormat;
  quality: number; // 0-1, only for jpeg/webp
}

// ── Processed result ────────────────────────────────────────

export interface ProcessedResult {
  blob: Blob;
  url: string; // Object URL for preview
  width: number;
  height: number;
}

// ── Helpers ─────────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDimensions(w: number, h: number): string {
  return `${w}×${h}`;
}

export const FORMAT_LABELS: Record<OutputFormat, string> = {
  "image/png": "PNG",
  "image/jpeg": "JPEG",
  "image/webp": "WebP",
};

export const FORMAT_EXTENSIONS: Record<OutputFormat, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

let nextId = 0;
export function generateId(): string {
  return `img-${Date.now()}-${nextId++}`;
}

// ── Aspect ratio ────────────────────────────────────────────

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

export function computeAspectRatio(w: number, h: number): string {
  if (w === 0 || h === 0) return "—";
  const d = gcd(w, h);
  const rw = w / d;
  const rh = h / d;
  // Simplify common large ratios to friendly names
  const ratio = rw / rh;
  if (Math.abs(ratio - 16 / 9) < 0.02) return "16:9";
  if (Math.abs(ratio - 4 / 3) < 0.02) return "4:3";
  if (Math.abs(ratio - 3 / 2) < 0.02) return "3:2";
  if (Math.abs(ratio - 1) < 0.02) return "1:1";
  if (Math.abs(ratio - 9 / 16) < 0.02) return "9:16";
  if (Math.abs(ratio - 3 / 4) < 0.02) return "3:4";
  if (Math.abs(ratio - 2 / 3) < 0.02) return "2:3";
  if (Math.abs(ratio - 21 / 9) < 0.02) return "21:9";
  // If the simplified ratio is reasonable, show it
  if (rw <= 100 && rh <= 100) return `${rw}:${rh}`;
  // Fall back to decimal
  return `${ratio.toFixed(2)}:1`;
}

export function buildImageMeta(
  file: File,
  width: number,
  height: number,
): ImageMeta {
  const hasAlpha =
    file.type === "image/png" ||
    file.type === "image/webp" ||
    file.type === "image/gif";
  return {
    name: file.name,
    size: file.size,
    type: file.type || "unknown",
    lastModified: file.lastModified,
    width,
    height,
    megapixels: Math.round((width * height) / 100_000) / 10,
    aspectRatio: computeAspectRatio(width, height),
    bitDepth: file.type === "image/png" ? "8/16-bit" : "8-bit",
    colorMode: hasAlpha ? "RGBA" : "RGB",
  };
}
