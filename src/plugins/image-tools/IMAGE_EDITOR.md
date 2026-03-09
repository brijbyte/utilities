# Image Tools — Architecture & Design

## Overview

Fully client-side image processing plugin. All operations run in the browser using Canvas API, Web Workers, and MediaPipe (lazy-loaded from CDN). No server, no uploads, no network calls except CDN model loading.

## Feature Set

### Implemented

```
✅ Multi-image upload (drag-drop, file picker, paste)
✅ Image gallery with quality badges
✅ Image strip for quick switching in editor view
✅ Quality scoring (blur, exposure, resolution — pure Canvas, no ML)
✅ Image metadata & EXIF extraction (pure JS parser, no library)
✅ Report popover (quality + file + image + EXIF + GPS with Maps link)
✅ Face detection (MediaPipe BlazeFace, lazy CDN load, GPU-accelerated)
✅ Face overlay (bounding boxes + keypoints, expanded to include full head)
✅ Smart crop (face-aware, configurable aspect ratio + padding)
✅ Passport / visa photo templates (9 templates, auto-framing per spec)
✅ Resize with presets + custom dimensions (step-down for sharpness)
✅ Format conversion (PNG ↔ JPEG ↔ WebP with quality control)
✅ Side-by-side original / processed preview with size comparison
```

### Planned

```
⬜ Background removal (MediaPipe Selfie Segmentation)
⬜ Batch resize / convert all
⬜ Batch download as ZIP
⬜ Before/after comparison slider
```

## File Structure

```
plugins/
  image-tools/
    App.tsx                       Root: toolbar, upload, gallery/strip, editor routing.
    IMAGE_EDITOR.md               This file.
    utils/
      types.ts                    ImageFile, ImageMeta, QualityReport, ResizeConfig,
                                  ConvertConfig, ProcessedResult, format helpers.
      quality.ts                  Blur detection (Laplacian variance), exposure (histogram),
                                  resolution check. assessQuality() + analyzeImage().
      exif.ts                     Pure JS EXIF parser. Reads first 128KB of JPEG.
                                  Camera, exposure, GPS, dates, copyright.
      face-detect.ts              MediaPipe Face Detection wrapper. Lazy CDN singleton.
                                  BlazeFace short-range model, GPU delegate.
                                  Bounding boxes expanded to include full head.
      crop.ts                     Smart crop engine. computeSmartCrop() for manual mode,
                                  computePassportCrop() for passport templates.
                                  9 passport/visa templates with specs.
      resize.ts                   Canvas resize (step-down for quality), format conversion,
                                  processImage() and processPassportPhoto() pipelines.
    components/
      UploadZone.tsx              Multi-file drag-drop + paste + compact toolbar mode.
      ImageGallery.tsx            Responsive grid of ImageCards.
      ImageCard.tsx               Thumbnail + quality badge + dimensions + remove button.
      ImageStrip.tsx              Horizontal scrollable thumbnail strip for editor view.
                                  Auto-scrolls selected image into view.
      EditorView.tsx              Single-image editor. Collapsible panels for face detection,
                                  smart crop, resize, convert. Original/processed preview.
      FaceOverlay.tsx             SVG overlay: bounding boxes, confidence labels, keypoints.
      CropOverlay.tsx             SVG overlay: darkened outside area, dashed crop border,
                                  rule-of-thirds grid, corner handles.
      CropPanel.tsx               Passport template dropdown (GroupedSelect), aspect ratio
                                  buttons, padding slider, template requirements card.
      ResizePanel.tsx             Preset buttons (1080p/720p/480p/custom), custom dimensions,
                                  aspect ratio lock, output dimension preview.
      ConvertPanel.tsx            Format buttons (JPEG/PNG/WebP), quality slider.
      ImageInfo.tsx               Report popover (ScrollArea). Quality, file, image, EXIF
                                  (camera, exposure, date, GPS + Maps link), location.
      Skeleton.tsx                Loading skeleton for the plugin.
```

## Technology Choices

| Feature                | Technology                              | Size               | Why                                                 |
| ---------------------- | --------------------------------------- | ------------------ | --------------------------------------------------- |
| **Face detection**     | MediaPipe Face Detection (WASM/WebGL)   | ~5MB lazy from CDN | Fast, accurate, GPU-accelerated via WebGL           |
| **Background removal** | MediaPipe Selfie Segmentation (planned) | ~5MB lazy from CDN | Real person segmentation, not generic               |
| **Blur detection**     | Canvas + Laplacian variance (pure JS)   | 0KB (built-in)     | No ML needed, subsampled for speed on large images  |
| **Exposure check**     | Canvas histogram analysis (pure JS)     | 0KB                | Luminance mean + standard deviation                 |
| **EXIF parsing**       | Manual binary parser (pure JS)          | 0KB                | Reads JPEG APP1 marker, TIFF IFDs, GPS sub-IFD      |
| **Resize**             | OffscreenCanvas + step-down halving     | 0KB                | Native browser, Lanczos-quality at large reductions |
| **Format convert**     | `OffscreenCanvas.convertToBlob()`       | 0KB                | Native browser API                                  |
| **Scrollable popover** | Base UI ScrollArea                      | Bundled            | Styled scrollbar, no scroll-to-bottom issue         |
| **Grouped dropdown**   | Base UI Select (Group + GroupLabel)     | Bundled            | Accessible, themed, grouped passport templates      |

## Architecture Decisions

### 1. Lazy Model Loading — No Upfront Cost

MediaPipe models load from CDN only when the user first triggers face detection. The WASM runtime (~5MB) and BlazeFace model (~200KB tflite) are cached as singletons. Concurrent init calls are deduped via a shared promise. Subsequent `detectFaces()` calls are instant.

```ts
// face-detect.ts — lazy singleton with CDN dynamic import
const VISION_ESM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/+esm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite";

let detector: MPFaceDetector | null = null;
let initPromise: Promise<void> | null = null;

async function ensureDetector(onProgress?) {
  if (detector) return;
  if (initPromise) {
    await initPromise;
    return;
  }
  initPromise = (async () => {
    const vision = await import(/* @vite-ignore */ VISION_ESM_URL);
    const fileset =
      await vision.FilesetResolver.forVisionTasks(VISION_WASM_CDN);
    detector = await vision.FaceDetector.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      runningMode: "IMAGE",
      minDetectionConfidence: 0.5,
    });
  })();
  await initPromise;
}
```

### 2. Face Detection — Expanded Head Bounding Box

BlazeFace returns a tight "face box" (roughly eyes to chin). We expand it to include the full head:

- **50% upward** — adds half the face height above the top edge (forehead, hair, top of head)
- **10% wider** on each side — more natural framing
- **Clamped** to image bounds

### 3. Quality Scoring — Pure Canvas, No ML

Runs automatically on upload via `analyzeImage()`. Subsamples large images to ~512px for speed (<50ms).

- **Blur:** Laplacian variance on grayscale. Higher = sharper. Thresholds: >500 sharp, >100 soft, else blurry.
- **Exposure:** Luminance histogram mean + standard deviation. Low σ = flat, low μ = dark, high μ = bright.
- **Resolution:** Megapixels. >2 MP = high, >0.5 = medium, else low.
- **Overall:** Composite of all three.

### 4. EXIF Parsing — Pure JS, No Library

Reads the first 128KB of JPEG files. Parses APP1 marker → TIFF header → IFD0 → Exif sub-IFD → GPS sub-IFD. Extracts:

- Camera: make, model, lens, software
- Exposure: shutter speed, aperture, ISO, focal length, flash, metering, program, white balance
- GPS: latitude/longitude (DMS → decimal), with Google Maps link
- Dates: original capture date, modification date
- Other: color space, artist, copyright, description

Returns `null` for non-JPEG files (PNG/WebP don't carry EXIF).

### 5. Step-Down Resize for Sharp Downscaling

Single-pass `drawImage()` from e.g. 5712px → 1080px produces blurry results. `stepDownResize()` repeatedly halves dimensions until within 2× of target, then does one final resize. Each 2:1 halving cleanly averages 4 source pixels per output pixel.

Example for 5712 → 1080: `5712 → 2856 → 1428 → 1080`.

### 6. Smart Crop with Passport Photo Templates

Two crop modes, both face-aware:

**Manual mode:** `computeSmartCrop()` — bounding box around all faces + configurable padding + aspect ratio expansion. 9 aspect presets (1:1, 4:5, 3:4, 2:3, 9:16, 4:3, 3:2, 16:9, free). Falls back to center crop when no faces detected.

**Passport template mode:** `computePassportCrop()` — specialized framing per template spec:

1. Pick primary face (highest confidence)
2. Size crop so head fills the template's required head-to-frame ratio (midpoint of range)
3. Position vertically so eye line (from keypoints) sits at the specified fraction
4. Center horizontally on face
5. Clamp to image bounds

`processPassportPhoto()` pipeline: crop → step-down resize to exact template pixels → fill background with template's required color → output as JPEG 95%.

#### Passport / Visa Templates

| Template               | Region         | Size (mm) | Pixels (300 DPI) | Head Ratio | Eye Line | Background |
| ---------------------- | -------------- | --------- | ---------------- | ---------- | -------- | ---------- |
| Schengen Visa          | Europe (EU)    | 35×45     | 413×531          | 70–80%     | 55%      | `#f0f0f0`  |
| US Visa / Passport     | United States  | 51×51     | 602×602          | 50–69%     | 56%      | `#ffffff`  |
| UK Passport            | United Kingdom | 35×45     | 413×531          | 66–75%     | 55%      | `#f5f5f5`  |
| Indian Passport/Visa   | India          | 51×51     | 602×602          | 50–70%     | 55%      | `#ffffff`  |
| Indian OCI Card        | India          | 35×45     | 413×531          | 60–75%     | 55%      | `#ffffff`  |
| Canadian Passport      | Canada         | 50×70     | 591×827          | 47–54%     | 53%      | `#ffffff`  |
| Australian Passport    | Australia      | 35×45     | 413×531          | 64–78%     | 55%      | `#ffffff`  |
| Chinese Visa           | China          | 33×48     | 390×567          | 58–73%     | 55%      | `#ffffff`  |
| Japanese Visa/Passport | Japan          | 35×45     | 413×531          | 70–80%     | 55%      | `#ffffff`  |

### 7. Processing Pipeline

```
Input File
  │
  ├── Regular mode:   crop (optional) → step-down resize (optional) → format convert
  │
  └── Passport mode:  passport crop → step-down resize to template pixels → bg color fill → JPEG 95%
```

Both paths use `createImageBitmap()` for sub-rectangle extraction (crop) and `OffscreenCanvas` for drawing/conversion.

## UI Layout

### Gallery View (no image selected)

```
┌──────────────────────────────────────────────────────────────┐
│ Toolbar: [🖼 N images] ··· [Add Images] [Clear All]         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │          Drop images here or click to upload        │     │
│  │          PNG, JPG, WebP • Paste from clipboard      │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐               │
│  │ img1   │ │ img2   │ │ img3   │ │ img4   │               │
│  │ 🟢 Good │ │ 🟡 Fair │ │ 🔴 Poor│ │ 🟢 Good │               │
│  │ 3.2 MP │ │ 1.1 MP │ │ 0.3 MP │ │ 5.0 MP │               │
│  └────────┘ └────────┘ └────────┘ └────────┘               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Editor View (image selected)

```
┌──────────────────────────────────────────────────────────────┐
│ Toolbar: [🖼 N images] ··· [Add Images] [Clear All]         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Image Strip (horizontal scroll, click to switch):           │
│  [img1] [img2] [■img3■] [img4] [img5]                       │
│                                                              │
│  ☰ All images                              [📄 Report]      │
│                                                              │
│  ┌─── Original ───────┐  ┌─── Processed ──────┐             │
│  │                     │  │                     │             │
│  │  (image + overlays) │  │  (processed result) │             │
│  │                     │  │                     │             │
│  └─────────────────────┘  └─────────────────────┘             │
│  4284×5712 · 6.7 MB          1080×1440 · 245 KB ↓96%        │
│                                                              │
│  ▸ 😀 Face Detection           1 face                       │
│  ▸ ✂️  Smart Crop               Schengen Visa                │
│  ▸ 📏 Resize                   1080p                        │
│  ▸ 🔄 Convert Format           JPEG                         │
│                                                              │
│  [Process Image] [Download]                                  │
└──────────────────────────────────────────────────────────────┘
```

## State Management

All state in `App.tsx`. View is derived from `selectedId` — no separate view state.

```ts
interface ImageFile {
  id: string;
  file: File;
  url: string; // Object URL
  width: number;
  height: number;
  quality: QualityReport | null; // auto-analyzed on upload
  meta: ImageMeta | null; // file + image metadata
  exif: ExifData | null; // EXIF (JPEG only)
  faces: FaceResult[] | null; // null = not yet detected
}

const [images, setImages] = useState<ImageFile[]>([]);
const [selectedId, setSelectedId] = useState<string | null>(null);
// selectedId === null → gallery view
// selectedId !== null → editor view (with image strip above)
```

`EditorView` owns its own local state for operations (resize config, crop config, convert config, processing state, result). Face detection results are pushed back to parent via `onUpdate(id, patch)` so they persist across editor open/close.

## Component Architecture

- **App.tsx** — All image state, upload/remove/clear handlers, `onUpdate` callback. Routes between gallery and editor based on `selectedId`. Runs `analyzeImage()` + `extractExif()` in parallel on upload.
- **ImageGallery / ImageCard** — Responsive grid (3–6 columns). Cards show thumbnail, quality badge, dimensions, file size. Click to select.
- **ImageStrip** — Horizontal scroll strip shown above editor when 2+ images. 56×56px thumbnails, selected image highlighted + auto-scrolled into view. Click to switch.
- **EditorView** — Single-image editor. Local state for operations. Collapsible panels via shared `Collapsible` component. Processes image via `processImage()` or `processPassportPhoto()`.
- **ImageReport (ImageInfo.tsx)** — Popover with Base UI ScrollArea. Quality section at top (color-coded), then file, image, EXIF, location sections.
- **FaceOverlay / CropOverlay** — SVG overlays on the image preview. FaceOverlay shows bounding boxes + keypoints. CropOverlay shows darkened outside area + dashed border + rule-of-thirds + corner handles. Only one shows at a time (crop takes priority).
- **CropPanel** — GroupedSelect dropdown for passport templates (grouped by region), manual aspect ratio buttons, padding slider, template requirements card.

## Conventions

- All images tracked as `ImageFile` objects with Object URLs. URLs are revoked on remove/unmount via a `Set<string>` ref.
- Quality analysis and EXIF extraction run in parallel on upload (`Promise.all`).
- Face detection is lazy — only runs when the user clicks "Detect Faces" or enables smart crop.
- Passport template mode auto-triggers face detection if not done yet.
- `processImage()` accepts optional crop region — pipeline is crop → resize → convert.
- `processPassportPhoto()` is a dedicated pipeline: crop → resize to template pixels → bg fill → JPEG 95%.
- Step-down resize (halving until within 2×) used for all downscaling >2× to preserve sharpness.
- EXIF parser only reads first 128KB of JPEG files — fast and memory-efficient.
- No npm dependencies added. MediaPipe loaded via dynamic ESM import from CDN.

## Implementation Status

1. ✅ Upload + Gallery + Quality scoring
2. ✅ Face detection + overlay
3. ✅ Smart crop + passport photo templates
4. ✅ Resize + format conversion
5. ✅ EXIF extraction + metadata report
6. ✅ Image strip for editor navigation
7. ⬜ Background removal (MediaPipe Selfie Segmentation)
8. ⬜ Batch operations (resize all, convert all)
9. ⬜ ZIP download
10. ⬜ Before/after comparison slider
