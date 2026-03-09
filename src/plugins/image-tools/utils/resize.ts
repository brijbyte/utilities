import type { ResizeConfig, ConvertConfig, ProcessedResult } from "./types";
import type { CropRegion, PhotoTemplate } from "./crop";
import { templatePixels } from "./crop";

/**
 * Compute output dimensions from a resize config, preserving aspect ratio
 * and ensuring even dimensions (important for many codecs/displays).
 */
export function computeOutputDimensions(
  srcWidth: number,
  srcHeight: number,
  config: ResizeConfig,
): { width: number; height: number } {
  let w: number;
  let h: number;

  if (config.preset === "custom") {
    w = config.width;
    h = config.height;
  } else {
    const maxDim = parseInt(config.preset, 10);
    if (srcWidth >= srcHeight) {
      w = maxDim;
      h = Math.round((srcHeight / srcWidth) * maxDim);
    } else {
      h = maxDim;
      w = Math.round((srcWidth / srcHeight) * maxDim);
    }
  }

  if (config.maintainAspect && config.preset === "custom") {
    const aspect = srcWidth / srcHeight;
    // Fit within the target box
    if (w / h > aspect) {
      w = Math.round(h * aspect);
    } else {
      h = Math.round(w / aspect);
    }
  }

  // Ensure even dimensions and at least 1px
  w = Math.max(2, w % 2 === 0 ? w : w + 1);
  h = Math.max(2, h % 2 === 0 ? h : h + 1);

  return { width: w, height: h };
}

/**
 * Step-down resize: repeatedly halve dimensions until within 2× of target,
 * then do one final resize. This avoids the blurriness of a single large
 * downscale — each halving step is a clean 2:1 reduction that preserves
 * sharpness much better than jumping from e.g. 5712px to 1080px in one pass.
 *
 * For upscales or small reductions (<2×), a single draw is fine.
 */
function stepDownResize(
  source: ImageBitmap,
  targetW: number,
  targetH: number,
): OffscreenCanvas {
  let curW = source.width;
  let curH = source.height;

  // If reduction ratio < 2× on both axes, single pass is fine
  if (curW < targetW * 2 && curH < targetH * 2) {
    const canvas = new OffscreenCanvas(targetW, targetH);
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, targetW, targetH);
    return canvas;
  }

  // Step 1: halve repeatedly into intermediate canvases
  let current: OffscreenCanvas | ImageBitmap = source;

  while (curW >= targetW * 2 || curH >= targetH * 2) {
    const nextW = Math.max(targetW, Math.ceil(curW / 2));
    const nextH = Math.max(targetH, Math.ceil(curH / 2));

    const step = new OffscreenCanvas(nextW, nextH);
    const sCtx = step.getContext("2d")!;
    sCtx.imageSmoothingEnabled = true;
    sCtx.imageSmoothingQuality = "high";
    sCtx.drawImage(current, 0, 0, nextW, nextH);

    current = step;
    curW = nextW;
    curH = nextH;
  }

  // Step 2: final resize to exact target (may be a no-op if halving landed exactly)
  if (curW === targetW && curH === targetH) {
    return current as OffscreenCanvas;
  }

  const final = new OffscreenCanvas(targetW, targetH);
  const fCtx = final.getContext("2d")!;
  fCtx.imageSmoothingEnabled = true;
  fCtx.imageSmoothingQuality = "high";
  fCtx.drawImage(current, 0, 0, targetW, targetH);
  return final;
}

/**
 * Resize and/or convert an image file using OffscreenCanvas.
 * Returns a Blob + Object URL of the processed result.
 *
 * Pipeline: crop (optional) → resize (optional) → convert.
 * Uses step-down resizing for large reductions (>2×) to preserve sharpness.
 */
export async function processImage(
  file: File,
  srcWidth: number,
  srcHeight: number,
  resize: ResizeConfig | null,
  convert: ConvertConfig,
  crop?: CropRegion | null,
): Promise<ProcessedResult> {
  let bitmap = await createImageBitmap(file);

  // Step 1: Crop (if provided)
  if (crop) {
    const cropped = await createImageBitmap(
      bitmap,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
    );
    bitmap.close();
    bitmap = cropped;
    // Update effective source dimensions for resize computation
    srcWidth = crop.width;
    srcHeight = crop.height;
  }

  // Step 2: Compute output dimensions
  let outW = srcWidth;
  let outH = srcHeight;

  if (resize) {
    const dims = computeOutputDimensions(srcWidth, srcHeight, resize);
    outW = dims.width;
    outH = dims.height;
  }

  // Step 3: Resize (or just draw 1:1)
  let canvas: OffscreenCanvas;

  if (outW === bitmap.width && outH === bitmap.height) {
    canvas = new OffscreenCanvas(outW, outH);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0);
  } else {
    canvas = stepDownResize(bitmap, outW, outH);
  }

  bitmap.close();

  // Step 4: Convert to target format
  const blob = await canvas.convertToBlob({
    type: convert.format,
    quality: convert.format === "image/png" ? undefined : convert.quality,
  });

  const url = URL.createObjectURL(blob);

  return { blob, url, width: outW, height: outH };
}

/**
 * Process a passport/visa photo:
 *   1. Crop to the computed passport crop region
 *   2. Resize to the template's exact pixel dimensions
 *   3. Fill background with the template's required color
 *
 * The background fill works by drawing the bg color first, then the
 * cropped image on top. This means any transparent areas or areas outside
 * the face get the correct background. For best results with non-uniform
 * backgrounds, pair with background removal (future feature).
 */
export async function processPassportPhoto(
  file: File,
  crop: CropRegion,
  template: PhotoTemplate,
): Promise<ProcessedResult> {
  const { width: outW, height: outH } = templatePixels(template);

  // Crop the source image
  const bitmap = await createImageBitmap(file);
  const cropped = await createImageBitmap(
    bitmap,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
  );
  bitmap.close();

  // Resize cropped image to template pixels using step-down
  const resized = stepDownResize(cropped, outW, outH);
  cropped.close();

  // Create final canvas with background color
  const canvas = new OffscreenCanvas(outW, outH);
  const ctx = canvas.getContext("2d")!;

  // Fill background
  ctx.fillStyle = template.bgColor;
  ctx.fillRect(0, 0, outW, outH);

  // Draw the resized photo on top
  ctx.drawImage(resized, 0, 0);

  // Output as JPEG (standard for passport photos) at high quality
  const blob = await canvas.convertToBlob({
    type: "image/jpeg",
    quality: 0.95,
  });

  const url = URL.createObjectURL(blob);
  return { blob, url, width: outW, height: outH };
}
