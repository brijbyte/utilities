import type { FaceResult } from "./face-detect";

// ── Types ───────────────────────────────────────────────────

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AspectPreset =
  | "1:1"
  | "4:5"
  | "3:4"
  | "2:3"
  | "9:16"
  | "4:3"
  | "3:2"
  | "16:9"
  | "free";

export interface CropConfig {
  aspect: AspectPreset;
  padding: number; // 0-1, fraction of face-group size added around
  template: string | null; // passport template id, or null for manual
}

// ── Passport / visa photo templates ─────────────────────────

export interface PhotoTemplate {
  id: string;
  name: string;
  /** Country or region */
  region: string;
  /** Physical width in mm */
  widthMm: number;
  /** Physical height in mm */
  heightMm: number;
  /** Print DPI — used to compute pixel dimensions */
  dpi: number;
  /**
   * How much of the frame height the head (crown to chin) should occupy.
   * Expressed as [min, max] fraction of total photo height.
   * e.g. [0.70, 0.80] means head should be 70-80% of photo height.
   */
  headRatio: [number, number];
  /**
   * Where the eye line should sit, as a fraction from the top of the photo.
   * e.g. 0.55 means eyes should be 55% down from the top.
   * null = no specific requirement (use headRatio center).
   */
  eyeLine: number | null;
  /** Required background color as CSS color string */
  bgColor: string;
  /** Human-readable requirements for display */
  requirements: string[];
}

/**
 * Compute output pixel dimensions from mm + DPI.
 */
export function templatePixels(t: PhotoTemplate): {
  width: number;
  height: number;
} {
  return {
    width: Math.round((t.widthMm / 25.4) * t.dpi),
    height: Math.round((t.heightMm / 25.4) * t.dpi),
  };
}

export const PHOTO_TEMPLATES: PhotoTemplate[] = [
  {
    id: "schengen",
    name: "Schengen Visa",
    region: "Europe (EU)",
    widthMm: 35,
    heightMm: 45,
    dpi: 300,
    headRatio: [0.7, 0.8],
    eyeLine: 0.55,
    bgColor: "#f0f0f0",
    requirements: [
      "35×45 mm, white/light-grey background",
      "Head 70–80% of frame height",
      "Full face, neutral expression, eyes open",
      "No glasses, hats, or head coverings (unless religious)",
      "Taken within the last 6 months",
    ],
  },
  {
    id: "us-visa",
    name: "US Visa / Passport",
    region: "United States",
    widthMm: 51,
    heightMm: 51,
    dpi: 300,
    headRatio: [0.5, 0.69],
    eyeLine: 0.56,
    bgColor: "#ffffff",
    requirements: [
      "2×2 inches (51×51 mm), white background",
      "Head 50–69% of frame height (1–1⅜ inches)",
      "Eyes between 56–69% from bottom",
      "Full face, neutral expression",
      "No glasses",
    ],
  },
  {
    id: "uk-passport",
    name: "UK Passport",
    region: "United Kingdom",
    widthMm: 35,
    heightMm: 45,
    dpi: 300,
    headRatio: [0.66, 0.75],
    eyeLine: 0.55,
    bgColor: "#f5f5f5",
    requirements: [
      "35×45 mm, light grey or cream background",
      "Head 29–34 mm tall",
      "Full face, neutral, mouth closed",
      "No glasses, hats, or shadows",
    ],
  },
  {
    id: "india-passport",
    name: "Indian Passport / Visa",
    region: "India",
    widthMm: 51,
    heightMm: 51,
    dpi: 300,
    headRatio: [0.5, 0.7],
    eyeLine: 0.55,
    bgColor: "#ffffff",
    requirements: [
      "2×2 inches (51×51 mm), white background",
      "Head 50–70% of frame, centered",
      "Full face, eyes open, mouth closed",
      "No glasses or head coverings",
    ],
  },
  {
    id: "india-oci",
    name: "Indian OCI Card",
    region: "India",
    widthMm: 35,
    heightMm: 45,
    dpi: 300,
    headRatio: [0.6, 0.75],
    eyeLine: 0.55,
    bgColor: "#ffffff",
    requirements: [
      "35×45 mm, white background",
      "Head 60–75% of frame",
      "Full face, front-facing",
      "No glasses, hats, or shadows",
    ],
  },
  {
    id: "canada-passport",
    name: "Canadian Passport",
    region: "Canada",
    widthMm: 50,
    heightMm: 70,
    dpi: 300,
    headRatio: [0.47, 0.54],
    eyeLine: 0.53,
    bgColor: "#ffffff",
    requirements: [
      "50×70 mm, white or light-coloured background",
      "Head 31–36 mm tall",
      "Full face, neutral expression",
      "No glasses, hats, or shadows",
    ],
  },
  {
    id: "australia-passport",
    name: "Australian Passport",
    region: "Australia",
    widthMm: 35,
    heightMm: 45,
    dpi: 300,
    headRatio: [0.64, 0.78],
    eyeLine: 0.55,
    bgColor: "#ffffff",
    requirements: [
      "35×45 mm, white background",
      "Head 32–36 mm tall",
      "Full face, neutral, mouth closed",
      "No glasses or head coverings",
    ],
  },
  {
    id: "china-visa",
    name: "Chinese Visa",
    region: "China",
    widthMm: 33,
    heightMm: 48,
    dpi: 300,
    headRatio: [0.58, 0.73],
    eyeLine: 0.55,
    bgColor: "#ffffff",
    requirements: [
      "33×48 mm, white background",
      "Head 28–33 mm tall, width 15–22 mm",
      "Full face, neutral expression",
      "No glasses, head coverings, or earrings",
    ],
  },
  {
    id: "japan-visa",
    name: "Japanese Visa / Passport",
    region: "Japan",
    widthMm: 35,
    heightMm: 45,
    dpi: 300,
    headRatio: [0.7, 0.8],
    eyeLine: 0.55,
    bgColor: "#ffffff",
    requirements: [
      "35×45 mm, white or light background",
      "Head 70–80% of frame",
      "Full face, neutral, looking straight",
      "No glasses or head coverings",
    ],
  },
];

// ── Preset ratios (width/height) ────────────────────────────

const ASPECT_RATIOS: Record<Exclude<AspectPreset, "free">, number> = {
  "1:1": 1,
  "4:5": 4 / 5,
  "3:4": 3 / 4,
  "2:3": 2 / 3,
  "9:16": 9 / 16,
  "4:3": 4 / 3,
  "3:2": 3 / 2,
  "16:9": 16 / 9,
};

// ── Crop computation ────────────────────────────────────────

/**
 * Center crop: no faces detected, crop to target aspect ratio from center.
 */
function centerCrop(imgW: number, imgH: number, ratio: number): CropRegion {
  const imgRatio = imgW / imgH;
  let w: number, h: number;

  if (imgRatio > ratio) {
    // Image is wider — crop width
    h = imgH;
    w = Math.round(h * ratio);
  } else {
    // Image is taller — crop height
    w = imgW;
    h = Math.round(w / ratio);
  }

  return {
    x: Math.round((imgW - w) / 2),
    y: Math.round((imgH - h) / 2),
    width: w,
    height: h,
  };
}

/**
 * Compute the optimal crop region that includes all detected faces,
 * with configurable padding and aspect ratio.
 *
 * Strategy:
 * 1. Compute a bounding box around all face boxes
 * 2. Add padding (fraction of the face-group size)
 * 3. Expand the padded box to match the target aspect ratio
 * 4. Shift to keep within image bounds (prefer keeping faces centered)
 * 5. Clamp to image dimensions
 *
 * For "free" aspect, the padded face-group box is used as-is.
 */
export function computeSmartCrop(
  imgWidth: number,
  imgHeight: number,
  faces: FaceResult[],
  config: CropConfig,
): CropRegion {
  const ratio = config.aspect === "free" ? null : ASPECT_RATIOS[config.aspect];

  // No faces — fall back to center crop
  if (faces.length === 0) {
    if (ratio === null) {
      return { x: 0, y: 0, width: imgWidth, height: imgHeight };
    }
    return centerCrop(imgWidth, imgHeight, ratio);
  }

  // 1. Bounding box of all face boxes
  let minX = Infinity,
    minY = Infinity,
    maxX = 0,
    maxY = 0;

  for (const face of faces) {
    const { x, y, width, height } = face.box;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }

  const groupW = maxX - minX;
  const groupH = maxY - minY;
  const groupCx = (minX + maxX) / 2;
  const groupCy = (minY + maxY) / 2;

  // 2. Add padding
  const padX = groupW * config.padding;
  const padY = groupH * config.padding;

  let cropW = groupW + padX * 2;
  let cropH = groupH + padY * 2;

  // 3. Expand to target aspect ratio (if not "free")
  if (ratio !== null) {
    const currentRatio = cropW / cropH;
    if (currentRatio < ratio) {
      // Too tall — expand width
      cropW = cropH * ratio;
    } else {
      // Too wide — expand height
      cropH = cropW / ratio;
    }
  }

  // Ensure crop doesn't exceed image
  cropW = Math.min(cropW, imgWidth);
  cropH = Math.min(cropH, imgHeight);

  // If aspect is locked and crop was clamped, re-enforce ratio
  if (ratio !== null) {
    const clampedRatio = cropW / cropH;
    if (Math.abs(clampedRatio - ratio) > 0.01) {
      if (clampedRatio > ratio) {
        cropW = cropH * ratio;
      } else {
        cropH = cropW / ratio;
      }
    }
  }

  // 4. Position: center on face group, then shift into bounds
  let x = groupCx - cropW / 2;
  let y = groupCy - cropH / 2;

  // Shift into bounds
  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x + cropW > imgWidth) x = imgWidth - cropW;
  if (y + cropH > imgHeight) y = imgHeight - cropH;

  // Final clamp (floating point safety)
  x = Math.max(0, Math.round(x));
  y = Math.max(0, Math.round(y));
  const w = Math.round(Math.min(cropW, imgWidth - x));
  const h = Math.round(Math.min(cropH, imgHeight - y));

  return { x, y, width: w, height: h };
}

/**
 * Presets with labels for UI display.
 */
export const ASPECT_PRESETS: { value: AspectPreset; label: string }[] = [
  { value: "1:1", label: "1:1" },
  { value: "4:5", label: "4:5" },
  { value: "3:4", label: "3:4" },
  { value: "2:3", label: "2:3" },
  { value: "9:16", label: "9:16" },
  { value: "4:3", label: "4:3" },
  { value: "3:2", label: "3:2" },
  { value: "16:9", label: "16:9" },
  { value: "free", label: "Free" },
];

// ── Passport photo crop ─────────────────────────────────────

/**
 * Compute a crop region optimized for a passport/visa photo template.
 *
 * The logic positions the face within the frame according to the template's
 * head-to-frame ratio and eye-line requirements:
 *
 * 1. Find the primary face (highest confidence, or largest if similar).
 * 2. Use the face bounding box (which already includes forehead from our
 *    expanded BlazeFace box) as the "head" region.
 * 3. Compute the required crop height so the head fills the target ratio
 *    of the frame (using the midpoint of headRatio range).
 * 4. Set the crop width from the template's aspect ratio.
 * 5. Position vertically so the eye line sits at the specified fraction.
 * 6. Center horizontally on the face.
 * 7. Clamp to image bounds.
 *
 * Returns null if no faces are detected — caller should show a warning.
 */
export function computePassportCrop(
  imgWidth: number,
  imgHeight: number,
  faces: FaceResult[],
  template: PhotoTemplate,
): CropRegion | null {
  if (faces.length === 0) return null;

  // Pick the primary face: highest confidence, tiebreak by area
  const primary = faces.reduce((best, f) => {
    const bestArea = best.box.width * best.box.height;
    const fArea = f.box.width * f.box.height;
    if (f.confidence > best.confidence + 0.05) return f;
    if (Math.abs(f.confidence - best.confidence) <= 0.05 && fArea > bestArea)
      return f;
    return best;
  });

  const head = primary.box;
  const headH = head.height;
  const headCx = head.x + head.width / 2;

  // Find eye line from keypoints (average Y of left and right eye)
  let eyeY: number | null = null;
  const leftEye = primary.keypoints.find((k) => k.name === "leftEye");
  const rightEye = primary.keypoints.find((k) => k.name === "rightEye");
  if (leftEye && rightEye) {
    eyeY = ((leftEye.y + rightEye.y) / 2) * imgHeight;
  }

  // Target head ratio (use midpoint of range for optimal framing)
  const targetHeadRatio = (template.headRatio[0] + template.headRatio[1]) / 2;
  const templateAspect = template.widthMm / template.heightMm;

  // Crop height: head should fill targetHeadRatio of the frame
  let cropH = headH / targetHeadRatio;

  // Crop width from aspect ratio
  let cropW = cropH * templateAspect;

  // Ensure crop fits within image
  if (cropW > imgWidth) {
    cropW = imgWidth;
    cropH = cropW / templateAspect;
  }
  if (cropH > imgHeight) {
    cropH = imgHeight;
    cropW = cropH * templateAspect;
  }

  // Vertical position: place eye line at the specified fraction from top
  let cropY: number;
  if (template.eyeLine !== null && eyeY !== null) {
    // Position so eyeY lands at (template.eyeLine * cropH) from crop top
    cropY = eyeY - template.eyeLine * cropH;
  } else {
    // Fall back: center the head vertically with slight upward bias
    // (head should be in upper portion of the frame)
    const headCy = head.y + headH / 2;
    cropY = headCy - cropH * 0.45; // head center at 45% from top
  }

  // Horizontal position: center on face
  let cropX = headCx - cropW / 2;

  // Clamp to image bounds
  if (cropX < 0) cropX = 0;
  if (cropY < 0) cropY = 0;
  if (cropX + cropW > imgWidth) cropX = imgWidth - cropW;
  if (cropY + cropH > imgHeight) cropY = imgHeight - cropH;

  return {
    x: Math.max(0, Math.round(cropX)),
    y: Math.max(0, Math.round(cropY)),
    width: Math.round(Math.min(cropW, imgWidth)),
    height: Math.round(Math.min(cropH, imgHeight)),
  };
}
