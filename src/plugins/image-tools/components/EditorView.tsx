import { useState, useCallback, useMemo } from "react";
import {
  LayoutGrid,
  Maximize,
  ArrowRightLeft,
  Download,
  ScanFace,
  Crop,
  Loader2,
} from "lucide-react";
import { CollapsibleGroup, Collapsible } from "../../../components/Collapsible";
import { Button } from "../../../components/Button";
import { ResizePanel } from "./ResizePanel";
import { ConvertPanel } from "./ConvertPanel";
import { CropPanel } from "./CropPanel";
import { ImageReport } from "./ImageInfo";
import { FaceOverlay } from "./FaceOverlay";
import { CropOverlay } from "./CropOverlay";
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
  computeSmartCrop,
  computePassportCrop,
  PHOTO_TEMPLATES,
} from "../utils/crop";
import type { CropConfig } from "../utils/crop";

interface EditorViewProps {
  image: ImageFile;
  onBack: () => void;
  onUpdate: (id: string, patch: Partial<ImageFile>) => void;
}

export function EditorView({ image, onBack, onUpdate }: EditorViewProps) {
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

  // ── Derived ───────────────────────────────────────────────

  const faces: FaceResult[] | null = image.faces;
  const hasFaces = faces !== null && faces.length > 0;

  const activeTemplate = cropConfig.template
    ? (PHOTO_TEMPLATES.find((t) => t.id === cropConfig.template) ?? null)
    : null;

  const cropRegion = useMemo(() => {
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
  ]);

  // ── Download ──────────────────────────────────────────────

  const handleDownload = useCallback(() => {
    if (!result) return;
    const ext = FORMAT_EXTENSIONS[convert.format];
    const baseName = image.file.name.replace(/\.[^.]+$/, "");
    const a = document.createElement("a");
    a.href = result.url;
    a.download = `${baseName}-processed${ext}`;
    a.click();
  }, [result, convert.format, image.file.name]);

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
          <div className="relative rounded-lg border border-border-muted overflow-hidden bg-bg-inset">
            <img
              src={image.url}
              alt="Original"
              className="w-full h-auto max-h-80 object-contain"
            />
            {/* Show face overlay when not cropping, or crop overlay when cropping */}
            {cropEnabled && cropRegion ? (
              <CropOverlay
                crop={cropRegion}
                imgWidth={image.width}
                imgHeight={image.height}
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

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={handleProcess} disabled={processing}>
          {processing ? "Processing…" : "Process Image"}
        </Button>
        {result && (
          <Button variant="outline" onClick={handleDownload}>
            <Download size={12} />
            Download
          </Button>
        )}
      </div>
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
