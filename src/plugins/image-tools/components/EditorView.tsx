import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  LayoutGrid,
  Maximize,
  ArrowRightLeft,
  ScanFace,
  Crop,
  Loader2,
  Expand,
  Eraser,
} from "lucide-react";
import { CollapsibleGroup, Collapsible } from "../../../components/Collapsible";
import { Button } from "../../../components/Button";
import { ResizePanel } from "./ResizePanel";
import { ConvertPanel } from "./ConvertPanel";
import { CropPanel } from "./CropPanel";
import { BgRemovePanel } from "./BgRemovePanel";
import { ImageReport } from "./ImageInfo";
import { FaceOverlay } from "./FaceOverlay";
import { CropOverlay } from "./CropOverlay";
import { CropDialog } from "./CropDialog";
import { BgMaskOverlay } from "./BgMaskOverlay";
import type {
  ImageFile,
  ResizeConfig,
  ConvertConfig,
  ProcessedResult,
} from "../utils/types";
import {
  formatFileSize,
  formatDimensions,
  FORMAT_EXTENSIONS,
} from "../utils/types";
import { processImage, processPassportPhoto } from "../utils/resize";
import { detectFaces } from "../utils/face-detect";
import type { FaceResult } from "../utils/face-detect";
import {
  segmentPerson,
  applyMask,
  DEFAULT_BG_CONFIG,
} from "../utils/bg-remove";
import type { BgRemoveConfig } from "../utils/bg-remove";
import {
  computeSmartCrop,
  computePassportCrop,
  PHOTO_TEMPLATES,
} from "../utils/crop";
import type { CropConfig, CropRegion } from "../utils/crop";

export interface EditorActions {
  process: () => void;
  download: () => void;
  processing: boolean;
  hasResult: boolean;
}

interface EditorViewProps {
  image: ImageFile;
  onBack: () => void;
  onUpdate: (id: string, patch: Partial<ImageFile>) => void;
  onActionsChange?: (actions: EditorActions) => void;
}

export function EditorView({
  image,
  onBack,
  onUpdate,
  onActionsChange,
}: EditorViewProps) {
  const [resize, setResize] = useState<ResizeConfig | null>(null);
  const [convert, setConvert] = useState<ConvertConfig>({
    format: image.file.type === "image/png" ? "image/png" : "image/jpeg",
    quality: 0.85,
  });
  const [resizeEnabled, setResizeEnabled] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessedResult | null>(null);

  // Face detection state
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [detectProgress, setDetectProgress] = useState<string | null>(null);

  // Crop state
  const [cropEnabled, setCropEnabled] = useState(false);
  const [cropConfig, setCropConfig] = useState<CropConfig>({
    aspect: "1:1",
    padding: 0.4,
    template: null,
  });
  // User-adjusted crop override — takes precedence over computed crop
  // Reset to null when config/faces change (recomputes from smart crop)
  const [cropOverride, setCropOverride] = useState<CropRegion | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);

  // Background removal state
  const [bgConfig, setBgConfig] = useState<BgRemoveConfig>(DEFAULT_BG_CONFIG);
  const [bgSegmenting, setBgSegmenting] = useState(false);
  const [bgProgress, setBgProgress] = useState<string | null>(null);
  const [bgError, setBgError] = useState<string | null>(null);
  // Cached mask — reused across config changes, recomputed only on new segmentation
  const [bgMask, setBgMask] = useState<{
    mask: Float32Array;
    width: number;
    height: number;
    origWidth: number;
    origHeight: number;
  } | null>(null);

  // ── Derived ───────────────────────────────────────────────

  const faces: FaceResult[] | null = image.faces;
  const hasFaces = faces !== null && faces.length > 0;

  const activeTemplate = cropConfig.template
    ? (PHOTO_TEMPLATES.find((t) => t.id === cropConfig.template) ?? null)
    : null;

  // Auto-computed crop from face detection + config
  const computedCrop = useMemo(() => {
    if (!cropEnabled) return null;

    // Passport template mode — use specialized crop
    if (activeTemplate && faces && faces.length > 0) {
      return computePassportCrop(
        image.width,
        image.height,
        faces,
        activeTemplate,
      );
    }

    // Template mode but no faces — can't compute passport crop
    if (activeTemplate) return null;

    // Manual mode
    return computeSmartCrop(image.width, image.height, faces ?? [], cropConfig);
  }, [
    cropEnabled,
    image.width,
    image.height,
    faces,
    cropConfig,
    activeTemplate,
  ]);

  // Reset user override when the computed crop changes (config/template/faces changed)
  const prevComputedRef = useRef(computedCrop);
  if (prevComputedRef.current !== computedCrop) {
    prevComputedRef.current = computedCrop;
    if (cropOverride !== null) setCropOverride(null);
  }

  // Final crop: user override takes precedence over computed
  const cropRegion = cropOverride ?? computedCrop;

  // Whether aspect ratio is locked (any non-free preset or template)
  const lockAspect = activeTemplate !== null || cropConfig.aspect !== "free";

  // ── Face detection ────────────────────────────────────────

  const runFaceDetection = useCallback(async () => {
    setDetecting(true);
    setDetectError(null);
    setDetectProgress(null);

    try {
      const bitmap = await createImageBitmap(image.file);
      const detected = await detectFaces(
        bitmap,
        image.width,
        image.height,
        (msg) => setDetectProgress(msg),
      );
      bitmap.close();

      onUpdate(image.id, { faces: detected });
      setShowOverlay(true);
      setDetectProgress(null);
      return detected;
    } catch (err) {
      setDetectError(
        err instanceof Error ? err.message : "Face detection failed",
      );
      return null;
    } finally {
      setDetecting(false);
    }
  }, [image, onUpdate]);

  // ── Enable crop (auto-detect faces if needed) ─────────────

  const handleEnableCrop = useCallback(
    async (enabled: boolean) => {
      setCropEnabled(enabled);
      if (enabled && faces === null) {
        // Auto-run face detection for smart crop
        await runFaceDetection();
      }
    },
    [faces, runFaceDetection],
  );

  // ── Background removal ────────────────────────────────────

  const runSegmentation = useCallback(async () => {
    setBgSegmenting(true);
    setBgError(null);
    setBgProgress(null);

    try {
      const bitmap = await createImageBitmap(image.file);
      const maskResult = await segmentPerson(bitmap, (msg) =>
        setBgProgress(msg),
      );
      bitmap.close();
      setBgMask(maskResult);
      setBgProgress(null);
    } catch (err) {
      setBgError(err instanceof Error ? err.message : "Segmentation failed");
    } finally {
      setBgSegmenting(false);
    }
  }, [image.file]);

  const handleEnableBgRemove = useCallback(
    async (enabled: boolean) => {
      setBgConfig((prev) => ({ ...prev, enabled }));
      if (enabled && !bgMask) {
        await runSegmentation();
      }
    },
    [bgMask, runSegmentation],
  );

  // ── Process image ─────────────────────────────────────────

  const handleProcess = useCallback(async () => {
    setProcessing(true);
    try {
      let r: ProcessedResult;

      if (cropEnabled && activeTemplate && cropRegion) {
        // Passport photo mode: crop → resize to template pixels → bg fill
        r = await processPassportPhoto(image.file, cropRegion, activeTemplate);
      } else {
        // Regular mode
        r = await processImage(
          image.file,
          image.width,
          image.height,
          resizeEnabled ? resize : null,
          convert,
          cropEnabled ? cropRegion : null,
        );
      }

      // Apply background removal if enabled and mask is available
      if (bgConfig.enabled && bgMask) {
        // Yield to browser before heavy pixel work
        await new Promise((resolve) => setTimeout(resolve, 0));
        // Decode the processed result into a bitmap
        const processed = await createImageBitmap(r.blob);
        // Pass the crop region so mask coordinates are mapped correctly
        const activeCrop = cropEnabled ? cropRegion : null;
        const bgCanvas = applyMask(
          processed,
          bgMask.mask,
          bgMask.width,
          bgMask.height,
          bgMask.origWidth,
          bgMask.origHeight,
          bgConfig,
          activeCrop,
        );
        processed.close();

        // Re-encode — use PNG for transparency, otherwise keep original format
        const outFormat =
          bgConfig.fill.type === "transparent" ? "image/png" : convert.format;
        const blob = await bgCanvas.convertToBlob({
          type: outFormat,
          quality: outFormat === "image/png" ? undefined : convert.quality,
        });
        const url = URL.createObjectURL(blob);

        // Clean up old result URL
        URL.revokeObjectURL(r.url);
        r = { blob, url, width: r.width, height: r.height };
      }

      if (result) URL.revokeObjectURL(result.url);
      setResult(r);
    } finally {
      setProcessing(false);
    }
  }, [
    image,
    resize,
    convert,
    resizeEnabled,
    result,
    cropEnabled,
    cropRegion,
    activeTemplate,
    bgConfig,
    bgMask,
  ]);

  // ── Download ──────────────────────────────────────────────

  const handleDownload = useCallback(() => {
    if (!result) return;
    // If bg removal with transparency is active, output is always PNG
    const actualFormat =
      bgConfig.enabled && bgConfig.fill.type === "transparent"
        ? "image/png"
        : convert.format;
    const ext = FORMAT_EXTENSIONS[actualFormat];
    const baseName = image.file.name.replace(/\.[^.]+$/, "");
    const a = document.createElement("a");
    a.href = result.url;
    a.download = `${baseName}-processed${ext}`;
    a.click();
  }, [result, convert.format, bgConfig, image.file.name]);

  // ── Report actions to parent toolbar ──────────────────────

  useEffect(() => {
    onActionsChange?.({
      process: handleProcess,
      download: handleDownload,
      processing,
      hasResult: result !== null,
    });
  }, [onActionsChange, handleProcess, handleDownload, processing, result]);

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* Gallery link */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text cursor-pointer transition-colors self-start"
      >
        <LayoutGrid size={13} />
        All images
      </button>

      {/* Image preview */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Original + overlays */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[0.625rem] text-text-muted uppercase tracking-wider">
              Original
            </span>
            {image.meta && (
              <ImageReport
                meta={image.meta}
                exif={image.exif}
                quality={image.quality}
              />
            )}
          </div>
          <div className="relative rounded-lg border border-border-muted overflow-hidden bg-bg-inset group/img">
            <img
              src={image.url}
              alt="Original"
              className="w-full h-auto max-h-80 object-contain"
            />
            {/* Background mask overlay — shows person/background tint */}
            {bgConfig.enabled && bgMask && (
              <BgMaskOverlay
                mask={bgMask.mask}
                maskW={bgMask.width}
                maskH={bgMask.height}
                imgWidth={image.width}
                imgHeight={image.height}
                config={bgConfig}
              />
            )}
            {/* Show face overlay when not cropping, or crop overlay when cropping */}
            {cropEnabled && cropRegion ? (
              <CropOverlay
                crop={cropRegion}
                imgWidth={image.width}
                imgHeight={image.height}
                lockAspect={lockAspect}
                onCropChange={setCropOverride}
              />
            ) : (
              showOverlay &&
              hasFaces && (
                <FaceOverlay
                  faces={faces}
                  imgWidth={image.width}
                  imgHeight={image.height}
                />
              )
            )}
            {/* Expand button — visible when crop is active */}
            {cropEnabled && cropRegion && (
              <button
                onClick={() => setCropDialogOpen(true)}
                className="absolute top-1.5 right-1.5 p-1 rounded bg-black/50 text-white/80 hover:bg-black/70 hover:text-white cursor-pointer transition-colors sm:opacity-0 sm:group-hover/img:opacity-100 z-10"
                title="Expand to full screen"
              >
                <Expand size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[0.5625rem] text-text-muted">
              {formatDimensions(image.width, image.height)}
            </span>
            <span className="text-[0.5625rem] text-text-muted">
              {formatFileSize(image.file.size)}
            </span>
          </div>
        </div>

        {/* Processed */}
        {result && (
          <div className="flex-1 min-w-0">
            <div className="text-[0.625rem] text-text-muted mb-1 uppercase tracking-wider">
              Processed
            </div>
            <div className="rounded-lg border border-border-muted overflow-hidden bg-bg-inset">
              <img
                src={result.url}
                alt="Processed"
                className="w-full h-auto max-h-80 object-contain"
              />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[0.5625rem] text-text-muted">
                {formatDimensions(result.width, result.height)}
              </span>
              <span className="text-[0.5625rem] text-text-muted">
                {formatFileSize(result.blob.size)}
              </span>
              {result.blob.size !== image.file.size && (
                <span
                  className={`text-[0.5625rem] font-medium ${result.blob.size < image.file.size ? "text-success" : "text-warning"}`}
                >
                  {result.blob.size < image.file.size ? "↓" : "↑"}
                  {Math.abs(
                    Math.round((1 - result.blob.size / image.file.size) * 100),
                  )}
                  %
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Operations */}
      <CollapsibleGroup defaultValue={["convert"]}>
        {/* Face Detection */}
        <Collapsible
          value="faces"
          title="Face Detection"
          icon={<ScanFace size={13} className="text-text-muted" />}
          badge={
            faces !== null
              ? `${faces.length} face${faces.length !== 1 ? "s" : ""}`
              : undefined
          }
        >
          <p className="text-[10px] text-text-muted leading-relaxed -mt-1 mb-2">
            Detect faces using MediaPipe BlazeFace. The model (~5MB) is
            downloaded from CDN on first use and cached by your browser.
          </p>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant={faces !== null ? "outline" : "primary"}
                onClick={runFaceDetection}
                disabled={detecting}
                className="text-[0.625rem]"
              >
                {detecting ? (
                  <>
                    <Loader2 size={11} className="animate-spin" />
                    {detectProgress ?? "Detecting…"}
                  </>
                ) : faces !== null ? (
                  "Re-detect"
                ) : (
                  "Detect Faces"
                )}
              </Button>

              {hasFaces && (
                <label className="flex items-center gap-1.5 text-xs text-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOverlay}
                    onChange={(e) => setShowOverlay(e.target.checked)}
                    className="accent-primary"
                  />
                  Show overlay
                </label>
              )}
            </div>

            {detectError && (
              <p className="text-[0.625rem] text-danger">{detectError}</p>
            )}

            {faces !== null && (
              <div className="flex flex-col gap-1.5">
                {faces.length === 0 ? (
                  <p className="text-[0.625rem] text-text-muted italic">
                    No faces detected in this image.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {faces.map((face, i) => (
                      <FaceCard key={i} index={i} face={face} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Collapsible>

        {/* Smart Crop */}
        <Collapsible
          value="crop"
          title="Smart Crop"
          icon={<Crop size={13} className="text-text-muted" />}
          badge={
            cropEnabled
              ? activeTemplate
                ? activeTemplate.name
                : cropRegion
                  ? `${cropConfig.aspect} · ${cropRegion.width}×${cropRegion.height}`
                  : undefined
              : undefined
          }
        >
          <p className="text-[10px] text-text-muted leading-relaxed -mt-1 mb-2">
            Automatically crop around detected faces with a target aspect ratio.
            Face detection runs automatically if not done yet.
          </p>

          <label className="flex items-center gap-1.5 text-xs text-text cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={cropEnabled}
              onChange={(e) => handleEnableCrop(e.target.checked)}
              className="accent-primary"
            />
            Enable smart crop
          </label>

          {cropEnabled && cropRegion && (
            <CropPanel
              config={cropConfig}
              cropRegion={cropRegion}
              hasFaces={hasFaces}
              faceCount={faces?.length ?? 0}
              onChange={setCropConfig}
            />
          )}
        </Collapsible>

        {/* Background Removal */}
        <Collapsible
          value="bgremove"
          title="Remove Background"
          icon={<Eraser size={13} className="text-text-muted" />}
          badge={bgConfig.enabled ? (bgMask ? "Active" : "Pending") : undefined}
        >
          <p className="text-[10px] text-text-muted leading-relaxed -mt-1 mb-2">
            Remove the background using MediaPipe Selfie Segmentation. The model
            (~250KB) is downloaded from CDN on first use and cached by your
            browser.
          </p>

          <label className="flex items-center gap-1.5 text-xs text-text cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={bgConfig.enabled}
              onChange={(e) => handleEnableBgRemove(e.target.checked)}
              className="accent-primary"
            />
            Enable background removal
          </label>

          {bgConfig.enabled && (
            <>
              {bgSegmenting && (
                <p className="text-[0.625rem] text-primary flex items-center gap-1 mb-2">
                  <Loader2 size={11} className="animate-spin" />
                  {bgProgress ?? "Segmenting…"}
                </p>
              )}
              {bgError && (
                <p className="text-[0.625rem] text-danger mb-2">{bgError}</p>
              )}
              {bgMask && (
                <>
                  <BgRemovePanel config={bgConfig} onChange={setBgConfig} />
                  <Button
                    variant="outline"
                    onClick={runSegmentation}
                    disabled={bgSegmenting}
                    className="text-[0.625rem] mt-2"
                  >
                    Re-segment
                  </Button>
                </>
              )}
            </>
          )}
        </Collapsible>

        {/* Resize */}
        <Collapsible
          value="resize"
          title="Resize"
          icon={<Maximize size={13} className="text-text-muted" />}
          badge={
            resizeEnabled && resize
              ? resize.preset === "custom"
                ? `${resize.width}×${resize.height}`
                : `${resize.preset}p`
              : undefined
          }
        >
          <label className="flex items-center gap-1.5 text-xs text-text cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={resizeEnabled}
              onChange={(e) => {
                setResizeEnabled(e.target.checked);
                if (e.target.checked && !resize) {
                  setResize({
                    preset: "1080",
                    width: 1080,
                    height: 1080,
                    maintainAspect: true,
                  });
                }
              }}
              className="accent-primary"
            />
            Enable resize
          </label>
          {resizeEnabled && resize && (
            <ResizePanel
              config={resize}
              srcWidth={
                cropEnabled && cropRegion ? cropRegion.width : image.width
              }
              srcHeight={
                cropEnabled && cropRegion ? cropRegion.height : image.height
              }
              onChange={setResize}
            />
          )}
        </Collapsible>

        {/* Convert */}
        <Collapsible
          value="convert"
          title="Convert Format"
          icon={<ArrowRightLeft size={13} className="text-text-muted" />}
          badge={
            convert.format === "image/png"
              ? "PNG"
              : convert.format === "image/jpeg"
                ? "JPEG"
                : "WebP"
          }
        >
          <ConvertPanel config={convert} onChange={setConvert} />
        </Collapsible>
      </CollapsibleGroup>

      {/* Fullscreen crop dialog */}
      {cropEnabled && cropRegion && (
        <CropDialog
          open={cropDialogOpen}
          onOpenChange={setCropDialogOpen}
          imageUrl={image.url}
          imgWidth={image.width}
          imgHeight={image.height}
          crop={cropRegion}
          lockAspect={lockAspect}
          onCropChange={setCropOverride}
        />
      )}
    </div>
  );
}

// ── Face detail card ────────────────────────────────────────

function FaceCard({ index, face }: { index: number; face: FaceResult }) {
  const { box, confidence, keypoints } = face;

  return (
    <div className="flex flex-col gap-0.5 rounded border border-border-muted bg-bg-inset px-2 py-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[0.625rem] font-medium text-text">
          Face {index + 1}
        </span>
        <span
          className={`text-[0.5625rem] font-medium ${
            confidence > 0.9
              ? "text-success"
              : confidence > 0.7
                ? "text-warning"
                : "text-danger"
          }`}
        >
          {Math.round(confidence * 100)}%
        </span>
      </div>
      <div className="text-[0.5rem] text-text-muted">
        {Math.round(box.width)}×{Math.round(box.height)}px at (
        {Math.round(box.x)}, {Math.round(box.y)})
      </div>
      {keypoints.length > 0 && (
        <div className="flex flex-wrap gap-x-2 gap-y-0 mt-0.5">
          {keypoints.map((kp, j) => (
            <span key={j} className="text-[0.5rem] text-text-muted">
              {kp.name ? kp.name.replace(/([A-Z])/g, " $1").trim() : `kp${j}`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
