/**
 * Face detection using MediaPipe Face Detector.
 *
 * Lazy-loads the @mediapipe/tasks-vision library from CDN on first use.
 * The detector instance and WASM runtime are cached as singletons —
 * subsequent calls reuse them with no loading overhead.
 *
 * Uses the BlazeFace short-range model (float16, ~200KB) which is
 * optimized for faces within ~2m of the camera. Runs on WebGL GPU
 * delegate for speed.
 */

// ── Types ───────────────────────────────────────────────────

export interface FaceBoundingBox {
  x: number; // origin x (pixels)
  y: number; // origin y (pixels)
  width: number; // box width (pixels)
  height: number; // box height (pixels)
}

export interface FaceKeypoint {
  x: number; // normalized 0-1
  y: number; // normalized 0-1
  name?: string; // "leftEye", "rightEye", "noseTip", "mouth", "leftEar", "rightEar"
}

export interface FaceResult {
  box: FaceBoundingBox;
  confidence: number; // 0-1
  keypoints: FaceKeypoint[];
}

// ── MediaPipe types (minimal, for dynamic import) ───────────

interface MPDetection {
  boundingBox?: {
    originX: number;
    originY: number;
    width: number;
    height: number;
  };
  categories?: { score: number }[];
  keypoints?: { x: number; y: number; name?: string }[];
}

interface MPFaceDetectorResult {
  detections: MPDetection[];
}

interface MPFaceDetector {
  detect(image: ImageBitmap | HTMLImageElement): MPFaceDetectorResult;
  close(): void;
}

// ── CDN URLs ────────────────────────────────────────────────

const VISION_WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite";

const VISION_ESM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/+esm";

// ── Lazy singleton ──────────────────────────────────────────

let detector: MPFaceDetector | null = null;
let initPromise: Promise<void> | null = null;

async function ensureDetector(
  onProgress?: (msg: string) => void,
): Promise<void> {
  if (detector) return;

  // Dedupe concurrent init calls
  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
    try {
      onProgress?.("Loading face detection model…");

      // Dynamically import the ESM bundle from CDN
      const vision = await import(/* @vite-ignore */ VISION_ESM_URL);

      const { FaceDetector, FilesetResolver } = vision;

      const fileset = await FilesetResolver.forVisionTasks(VISION_WASM_CDN);

      detector = await FaceDetector.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: "GPU",
        },
        runningMode: "IMAGE",
        minDetectionConfidence: 0.5,
      });

      onProgress?.("Face detection ready");
    } catch (err) {
      initPromise = null;
      throw err;
    }
  })();

  await initPromise;
}

// ── Public API ──────────────────────────────────────────────

/**
 * Detect faces in an image.
 *
 * On first call, downloads the MediaPipe WASM runtime (~5MB) and
 * BlazeFace model (~200KB) from CDN. These are cached by the browser
 * for subsequent calls.
 *
 * @param image  ImageBitmap or HTMLImageElement to analyze
 * @param imgWidth   Actual pixel width (for denormalizing keypoints)
 * @param imgHeight  Actual pixel height
 * @param onProgress Optional callback for loading status messages
 * @returns Array of detected faces with bounding boxes and keypoints
 */
export async function detectFaces(
  image: ImageBitmap | HTMLImageElement,
  imgWidth: number,
  imgHeight: number,
  onProgress?: (msg: string) => void,
): Promise<FaceResult[]> {
  await ensureDetector(onProgress);

  const result = detector!.detect(image);

  return result.detections.map((d: MPDetection) => {
    // BlazeFace returns a "face box" (roughly eyes-to-chin). We expand it
    // upward to include forehead/hair/top-of-head. The extension is 50%
    // of the face box height added above the top edge, plus a small
    // horizontal expansion (10% each side) for a more natural head crop.
    let box: FaceBoundingBox;

    if (d.boundingBox) {
      const raw = d.boundingBox;
      const headExtY = raw.height * 0.5; // extend upward by 50% of face height
      const headExtX = raw.width * 0.1; // extend sides by 10% of face width

      const x = Math.max(0, raw.originX - headExtX);
      const y = Math.max(0, raw.originY - headExtY);
      const right = Math.min(imgWidth, raw.originX + raw.width + headExtX);
      const bottom = Math.min(imgHeight, raw.originY + raw.height);

      box = {
        x,
        y,
        width: right - x,
        height: bottom - y,
      };
    } else {
      box = { x: 0, y: 0, width: 0, height: 0 };
    }

    const confidence = d.categories?.[0]?.score ?? 0;

    const keypoints: FaceKeypoint[] = (d.keypoints ?? []).map(
      (kp: { x: number; y: number; name?: string }) => ({
        x: kp.x,
        y: kp.y,
        name: kp.name,
      }),
    );

    return { box, confidence, keypoints };
  });
}

/**
 * Check if the face detector is already loaded (no network needed).
 */
export function isDetectorReady(): boolean {
  return detector !== null;
}

/**
 * Cleanup: close the detector and free WASM memory.
 */
export function disposeDetector(): void {
  if (detector) {
    detector.close();
    detector = null;
  }
  initPromise = null;
}
