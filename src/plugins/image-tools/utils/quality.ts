import type { QualityReport } from "./types";

// ── Grayscale conversion ────────────────────────────────────

function toGrayscale(data: Uint8ClampedArray, length: number): Float32Array {
  const gray = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const off = i * 4;
    // ITU-R BT.601 luma
    gray[i] = 0.299 * data[off] + 0.587 * data[off + 1] + 0.114 * data[off + 2];
  }
  return gray;
}

// ── Blur detection (Laplacian variance) ─────────────────────

/**
 * Compute variance of the Laplacian (3×3 kernel) on a grayscale image.
 * Higher variance → sharper image. Lower → blurrier.
 *
 * For large images we subsample to keep it fast (<50ms).
 */
function measureBlur(imageData: ImageData): number {
  const { width, height, data } = imageData;
  const pixelCount = width * height;

  // Subsample large images: work on a ~512px-wide version
  const maxDim = 512;
  let w = width;
  let h = height;
  let gray: Float32Array;

  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height);
    w = Math.round(width * scale);
    h = Math.round(height * scale);

    // Quick bilinear downsample into grayscale
    gray = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      const srcY = (y / h) * height;
      for (let x = 0; x < w; x++) {
        const srcX = (x / w) * width;
        const si = (Math.floor(srcY) * width + Math.floor(srcX)) * 4;
        gray[y * w + x] =
          0.299 * data[si] + 0.587 * data[si + 1] + 0.114 * data[si + 2];
      }
    }
  } else {
    gray = toGrayscale(data, pixelCount);
  }

  // 3×3 Laplacian: [0 -1 0; -1 4 -1; 0 -1 0]
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const lap =
        -gray[(y - 1) * w + x] -
        gray[y * w + (x - 1)] +
        4 * gray[idx] -
        gray[y * w + (x + 1)] -
        gray[(y + 1) * w + x];
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }

  if (count === 0) return 0;
  const mean = sum / count;
  return sumSq / count - mean * mean; // variance
}

// ── Exposure analysis (histogram) ───────────────────────────

function measureExposure(imageData: ImageData): {
  mean: number;
  stdDev: number;
} {
  const { data } = imageData;
  const len = data.length / 4;
  let sum = 0;
  let sumSq = 0;

  for (let i = 0; i < len; i++) {
    const off = i * 4;
    const lum =
      0.299 * data[off] + 0.587 * data[off + 1] + 0.114 * data[off + 2];
    sum += lum;
    sumSq += lum * lum;
  }

  const mean = sum / len;
  const variance = sumSq / len - mean * mean;
  return { mean, stdDev: Math.sqrt(Math.max(0, variance)) };
}

// ── Quality assessment ──────────────────────────────────────

/**
 * Assess image quality from raw pixel data.
 * Runs entirely on CPU — no ML models needed.
 * For large images, blur detection subsamples for speed.
 */
export function assessQuality(
  imageData: ImageData,
  width: number,
  height: number,
): QualityReport {
  const blurScore = measureBlur(imageData);
  const exposure = measureExposure(imageData);
  const mp = (width * height) / 1_000_000;

  const blur = {
    score: blurScore,
    label: (blurScore > 500 ? "sharp" : blurScore > 100 ? "soft" : "blurry") as
      | "sharp"
      | "soft"
      | "blurry",
  };

  const exp = {
    mean: exposure.mean,
    stdDev: exposure.stdDev,
    label: (exposure.stdDev < 30
      ? "flat"
      : exposure.mean < 60
        ? "dark"
        : exposure.mean > 200
          ? "bright"
          : "good") as "good" | "dark" | "bright" | "flat",
  };

  const resolution = {
    megapixels: Math.round(mp * 10) / 10,
    label: (mp > 2 ? "high" : mp > 0.5 ? "medium" : "low") as
      | "high"
      | "medium"
      | "low",
  };

  const overall =
    blur.label === "sharp" &&
    exp.label === "good" &&
    resolution.label === "high"
      ? "good"
      : blur.label !== "blurry" && resolution.label !== "low"
        ? "fair"
        : "poor";

  return { blur, exposure: exp, resolution, overall };
}

/**
 * Load an image file, draw it to a canvas, and assess quality.
 * Returns quality report + image dimensions.
 */
export async function analyzeImage(
  file: File,
): Promise<{ quality: QualityReport; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  // Draw to canvas to get pixel data
  // Use a capped size for quality analysis to stay fast
  const maxAnalysis = 1024;
  const scale = Math.min(1, maxAnalysis / Math.max(width, height));
  const aw = Math.round(width * scale);
  const ah = Math.round(height * scale);

  const canvas = new OffscreenCanvas(aw, ah);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, aw, ah);
  bitmap.close();

  const imageData = ctx.getImageData(0, 0, aw, ah);
  const quality = assessQuality(imageData, width, height);

  return { quality, width, height };
}
