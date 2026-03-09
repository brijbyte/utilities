import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "../../../components/Button";
import { CropOverlay } from "./CropOverlay";
import type { CropRegion } from "../utils/crop";
import { formatDimensions } from "../utils/types";

interface CropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  imgWidth: number;
  imgHeight: number;
  crop: CropRegion;
  lockAspect: boolean;
  onCropChange: (crop: CropRegion) => void;
}

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 5;
const ZOOM_STEP = 0.25;

/**
 * Fullscreen dialog for precise crop adjustment.
 *
 * Features:
 * - Full viewport image display
 * - Zoom in/out with buttons, scroll wheel, and pinch
 * - Pan by scrolling the container
 * - Interactive crop overlay at any zoom level
 * - Crop region info display
 */
export function CropDialog({
  open,
  onOpenChange,
  imageUrl,
  imgWidth,
  imgHeight,
  crop,
  lockAspect,
  onCropChange,
}: CropDialogProps) {
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const fitZoomRef = useRef(1);

  // ── Compute fit zoom on open ──────────────────────────────

  const computeFitZoom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return 1;
    // Available space: container minus some padding
    const availW = container.clientWidth - 32;
    const availH = container.clientHeight - 32;
    return Math.min(1, availW / imgWidth, availH / imgHeight);
  }, [imgWidth, imgHeight]);

  // Reset zoom when dialog opens
  useEffect(() => {
    if (open) {
      // Defer to next frame so container is measured
      requestAnimationFrame(() => {
        const fit = computeFitZoom();
        fitZoomRef.current = fit;
        setZoom(fit);
      });
    }
  }, [open, computeFitZoom]);

  // ── Zoom controls ─────────────────────────────────────────

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP));
  }, []);

  const zoomFit = useCallback(() => {
    const fit = computeFitZoom();
    fitZoomRef.current = fit;
    setZoom(fit);
  }, [computeFitZoom]);

  // ── Wheel zoom ────────────────────────────────────────────

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY * 0.005;
      setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z + delta)));
    }
  }, []);

  // ── Keyboard zoom ─────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP));
      } else if (e.key === "-") {
        e.preventDefault();
        setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP));
      } else if (e.key === "0") {
        e.preventDefault();
        const fit = computeFitZoom();
        fitZoomRef.current = fit;
        setZoom(fit);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, computeFitZoom]);

  // ── Zoom percentage ───────────────────────────────────────

  const zoomPercent = Math.round(zoom * 100);
  const scaledW = imgWidth * zoom;
  const scaledH = imgHeight * zoom;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={onOpenChange}
      disablePointerDismissal
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/80 z-50" />
        <Dialog.Popup className="fixed inset-0 z-50 outline-none flex flex-col">
          {/* ── Top bar ──────────────────────────────────── */}
          <div className="flex items-center justify-between px-4 py-2 bg-black/60 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3">
              <Dialog.Title className="text-sm font-medium text-white">
                Adjust Crop
              </Dialog.Title>
              <span className="text-xs text-white/60">
                {formatDimensions(imgWidth, imgHeight)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {/* Zoom controls */}
              <Button
                variant="ghost"
                className="text-white/80 hover:text-white hover:bg-white/10"
                onClick={zoomOut}
                disabled={zoom <= ZOOM_MIN}
              >
                <ZoomOut size={14} />
              </Button>
              <span className="text-xs text-white/70 w-10 text-center tabular-nums">
                {zoomPercent}%
              </span>
              <Button
                variant="ghost"
                className="text-white/80 hover:text-white hover:bg-white/10"
                onClick={zoomIn}
                disabled={zoom >= ZOOM_MAX}
              >
                <ZoomIn size={14} />
              </Button>
              <Button
                variant="ghost"
                className="text-white/80 hover:text-white hover:bg-white/10"
                onClick={zoomFit}
                title="Fit to screen"
              >
                <RotateCcw size={14} />
              </Button>

              <div className="w-px h-4 bg-white/20 mx-1" />

              <Dialog.Close className="text-white/80 hover:text-white bg-transparent border-none cursor-pointer p-1.5 rounded hover:bg-white/10 transition-colors flex items-center justify-center">
                <X size={16} />
              </Dialog.Close>
            </div>
          </div>

          {/* ── Scrollable image area ────────────────────── */}
          <div
            ref={containerRef}
            className="flex-1 overflow-auto"
            onWheel={onWheel}
          >
            <div
              className="flex items-center justify-center p-4"
              style={{ minHeight: "100%" }}
            >
              <div
                className="relative shrink-0"
                style={{ width: scaledW, height: scaledH }}
              >
                <img
                  src={imageUrl}
                  alt="Crop preview"
                  className="block"
                  style={{ width: scaledW, height: scaledH }}
                  draggable={false}
                />
                <CropOverlay
                  crop={crop}
                  imgWidth={imgWidth}
                  imgHeight={imgHeight}
                  lockAspect={lockAspect}
                  onCropChange={onCropChange}
                />
              </div>
            </div>
          </div>

          {/* ── Bottom bar ───────────────────────────────── */}
          <div className="flex items-center justify-between px-4 py-2 bg-black/60 backdrop-blur-sm shrink-0">
            <div className="text-xs text-white/60">
              Crop: {formatDimensions(crop.width, crop.height)} at ({crop.x},{" "}
              {crop.y})
              {lockAspect && (
                <span className="ml-2 text-white/40">· Aspect locked</span>
              )}
            </div>
            <div className="text-[0.625rem] text-white/40">
              Scroll to pan · +/− to zoom · 0 to fit ·{" "}
              {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}+scroll to zoom
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
