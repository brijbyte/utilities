/**
 * Background removal using MediaPipe Image Segmenter.
 *
 * Lazy-loads the @mediapipe/tasks-vision library from CDN on first use.
 * Reuses the same WASM runtime URL as face-detect.ts — if both are used
 * in the same session, the WASM binary is loaded only once (browser cache).
 *
 * Uses the selfie_segmenter model (float16, ~250KB) which outputs a
 * single-channel confidence mask: 1.0 = person, 0.0 = background.
 */

// ── Types ───────────────────────────────────────────────────

export type BgFill = { type: "transparent" } | { type: "color"; color: string };

export interface BgRemoveConfig {
  enabled: boolean;
  /** Confidence threshold: pixels below this are considered background. 0–1. */
  threshold: number;
  /** Edge softness: width of the feathered edge in normalized units. 0 = hard. */
  edgeSoftness: number;
  /** What to fill the background with */
  fill: BgFill;
}

export const DEFAULT_BG_CONFIG: BgRemoveConfig = {
  enabled: false,
  threshold: 0.5,
  edgeSoftness: 0.05,
  fill: { type: "transparent" },
};

// ── MediaPipe types (minimal, for dynamic import) ───────────

interface MPSegmenterResult {
  confidenceMasks?: Array<{
    width: number;
    height: number;
    getAsFloat32Array(): Float32Array;
  }>;
}

interface MPImageSegmenter {
  segment(image: ImageBitmap | HTMLImageElement): MPSegmenterResult;
  close(): void;
}

// ── CDN URLs ────────────────────────────────────────────────

const VISION_WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";

const VISION_ESM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/+esm";

// ── Lazy singleton ──────────────────────────────────────────

let segmenter: MPImageSegmenter | null = null;
let initPromise: Promise<void> | null = null;

async function ensureSegmenter(
  onProgress?: (msg: string) => void,
): Promise<void> {
  if (segmenter) return;

  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
    try {
      onProgress?.("Loading segmentation model…");

      const vision = await import(/* @vite-ignore */ VISION_ESM_URL);
      const { ImageSegmenter, FilesetResolver } = vision;

      const fileset = await FilesetResolver.forVisionTasks(VISION_WASM_CDN);

      segmenter = await ImageSegmenter.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: "GPU",
        },
        runningMode: "IMAGE",
        outputConfidenceMasks: true,
        outputCategoryMask: false,
      });

      onProgress?.("Segmentation ready");
    } catch (err) {
      initPromise = null;
      throw err;
    }
  })();

  await initPromise;
}

// ── Public API ──────────────────────────────────────────────

/**
 * Segment a person from the background.
 *
 * Returns a Float32Array confidence mask where each value is 0.0–1.0
 * (1.0 = person, 0.0 = background). The mask dimensions correspond to
 * the (possibly downscaled) image fed to the model.
 *
 * Large images are downscaled before segmentation to avoid freezing.
 * The selfie segmenter model internally works at 256×256 — feeding it
 * a multi-megapixel image is wasteful. We cap at 1024px on the long
 * edge for a good balance of speed and mask quality.
 *
 * The returned `origWidth` and `origHeight` are the full original image
 * dimensions — needed by `applyMask` to map mask coords correctly.
 *
 * On first call, downloads the MediaPipe WASM runtime (~5MB) and
 * selfie segmenter model (~250KB) from CDN.
 */

const MAX_SEGMENTATION_DIM = 1024;

export async function segmentPerson(
  image: ImageBitmap,
  onProgress?: (msg: string) => void,
): Promise<{
  mask: Float32Array;
  width: number;
  height: number;
  origWidth: number;
  origHeight: number;
}> {
  await ensureSegmenter(onProgress);

  onProgress?.("Segmenting image…");

  const origW = image.width;
  const origH = image.height;

  // Downscale large images for faster segmentation
  let input: ImageBitmap = image;

  let downscaled: ImageBitmap | null = null;
  if (origW > MAX_SEGMENTATION_DIM || origH > MAX_SEGMENTATION_DIM) {
    const scale = MAX_SEGMENTATION_DIM / Math.max(origW, origH);
    const inputW = Math.round(origW * scale);
    const inputH = Math.round(origH * scale);

    const canvas = new OffscreenCanvas(inputW, inputH);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0, inputW, inputH);
    downscaled = await createImageBitmap(canvas);
    input = downscaled;
  }

  // Yield to browser before blocking synchronous call
  await new Promise((r) => setTimeout(r, 0));

  const result = segmenter!.segment(input);
  downscaled?.close();

  if (!result.confidenceMasks || result.confidenceMasks.length === 0) {
    throw new Error("Segmentation produced no confidence mask");
  }

  const maskData = result.confidenceMasks[0];
  return {
    mask: maskData.getAsFloat32Array(),
    width: maskData.width,
    height: maskData.height,
    origWidth: origW,
    origHeight: origH,
  };
}

/**
 * Apply a segmentation mask to an image, replacing the background.
 *
 * Takes the original image bitmap and the confidence mask, applies
 * threshold + edge softness to produce an alpha channel, then composites
 * onto the background fill.
 *
 * `origWidth`/`origHeight` are the full original image dimensions that
 * the mask corresponds to. The mask may be at a lower resolution than
 * the original (downscaled for speed).
 *
 * If `srcRegion` is provided, the mask is sampled from that region of
 * the original image (for when the bitmap has been cropped/resized).
 * srcRegion is in original image pixel coordinates.
 *
 * Returns an OffscreenCanvas with the background removed/replaced.
 */
export function applyMask(
  bitmap: ImageBitmap,
  mask: Float32Array,
  maskW: number,
  maskH: number,
  origWidth: number,
  origHeight: number,
  config: BgRemoveConfig,
  srcRegion?: { x: number; y: number; width: number; height: number } | null,
): OffscreenCanvas {
  const w = bitmap.width;
  const h = bitmap.height;

  // Draw original image
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d")!;

  // Step 1: Fill background (if color fill, draw it first)
  if (config.fill.type === "color") {
    ctx.fillStyle = config.fill.color;
    ctx.fillRect(0, 0, w, h);
  }

  // Step 2: Draw the original image
  ctx.drawImage(bitmap, 0, 0);

  // Step 3: Get pixel data and apply mask as alpha
  const imageData = ctx.getImageData(0, 0, w, h);
  const pixels = imageData.data;

  // The mask was generated from a (possibly downscaled) version of the
  // original image. Map bitmap pixels → original image coords → mask coords.
  //
  // For bitmap pixel (bx, by):
  //   origX = srcRegion.x + bx * srcRegion.width / bitmapW
  //   origY = srcRegion.y + by * srcRegion.height / bitmapH
  //   maskX = origX * maskW / origWidth
  //   maskY = origY * maskH / origHeight
  //
  // When no crop, srcRegion spans the full original image.
  const regX = srcRegion?.x ?? 0;
  const regY = srcRegion?.y ?? 0;
  const regW = srcRegion?.width ?? origWidth;
  const regH = srcRegion?.height ?? origHeight;
  const mScaleX = maskW / origWidth;
  const mScaleY = maskH / origHeight;

  const { threshold, edgeSoftness } = config;
  // Compute the soft edge range
  const softLo = Math.max(0, threshold - edgeSoftness);
  const softHi = Math.min(1, threshold + edgeSoftness);
  const softRange = softHi - softLo;

  // Pre-parse fill color if needed
  let fillR = 0,
    fillG = 0,
    fillB = 0;
  if (config.fill.type === "color") {
    const tmp = new OffscreenCanvas(1, 1);
    const tmpCtx = tmp.getContext("2d")!;
    tmpCtx.fillStyle = config.fill.color;
    tmpCtx.fillRect(0, 0, 1, 1);
    const d = tmpCtx.getImageData(0, 0, 1, 1).data;
    fillR = d[0];
    fillG = d[1];
    fillB = d[2];
  }

  for (let y = 0; y < h; y++) {
    const origY = regY + (y / h) * regH;
    const mY = Math.min(maskH - 1, Math.max(0, Math.round(origY * mScaleY)));
    for (let x = 0; x < w; x++) {
      const origX = regX + (x / w) * regW;
      const mX = Math.min(maskW - 1, Math.max(0, Math.round(origX * mScaleX)));
      const confidence = mask[mY * maskW + mX];

      // Compute alpha: 1.0 = keep (person), 0.0 = remove (background)
      let alpha: number;
      if (softRange > 0.001) {
        // Smooth transition in the soft edge range
        alpha = Math.min(1, Math.max(0, (confidence - softLo) / softRange));
      } else {
        // Hard threshold
        alpha = confidence >= threshold ? 1 : 0;
      }

      const idx = (y * w + x) * 4;

      if (config.fill.type === "transparent") {
        // Multiply existing alpha by mask alpha
        pixels[idx + 3] = Math.round(pixels[idx + 3] * alpha);
      } else {
        // Blend original over fill color
        if (alpha < 1) {
          pixels[idx] = Math.round(pixels[idx] * alpha + fillR * (1 - alpha));
          pixels[idx + 1] = Math.round(
            pixels[idx + 1] * alpha + fillG * (1 - alpha),
          );
          pixels[idx + 2] = Math.round(
            pixels[idx + 2] * alpha + fillB * (1 - alpha),
          );
          pixels[idx + 3] = 255;
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Check if the segmenter is already loaded.
 */
export function isSegmenterReady(): boolean {
  return segmenter !== null;
}

/**
 * Cleanup: close the segmenter and free WASM memory.
 */
export function disposeSegmenter(): void {
  if (segmenter) {
    segmenter.close();
    segmenter = null;
  }
  initPromise = null;
}
