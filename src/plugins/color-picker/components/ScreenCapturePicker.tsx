import { useState, useRef, useCallback } from "react";
import { X, MonitorSmartphone } from "lucide-react";
import type { RgbColor } from "../utils/types";
import { rgbToHex } from "../utils/color";

interface Props {
  onPick: (rgb: RgbColor) => void;
  onClose: () => void;
}

type Phase = "idle" | "capturing" | "ready";

/**
 * Screen capture–based color picker for browsers without EyeDropper API.
 *
 * Flow:
 * 1. User clicks "Capture Screen" to trigger getDisplayMedia
 * 2. Captures a single frame, renders it on a full-screen canvas overlay
 * 3. User clicks a pixel to pick its color
 * 4. Reads the pixel via getImageData and returns the RGB value
 *
 * The canvas is always mounted so the ref is available during the async
 * capture flow. It is visually hidden until the "ready" phase.
 */
export function ScreenCapturePicker({ onPick, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    rgb: RgbColor;
  } | null>(null);
  const imageDataRef = useRef<ImageData | null>(null);
  const dimensionsRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  const startCapture = useCallback(async () => {
    setPhase("capturing");
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 3840 }, height: { ideal: 2160 } },
        audio: false,
      });

      const video = document.createElement("video");
      video.srcObject = stream;
      video.playsInline = true;
      await video.play();

      // Wait for the video to produce a frame
      await new Promise<void>((resolve) => {
        if (video.readyState >= 2) {
          resolve();
        } else {
          video.addEventListener("loadeddata", () => resolve(), { once: true });
        }
      });
      // Extra frame to ensure pixels are rendered
      await new Promise((r) => requestAnimationFrame(r));

      const canvas = canvasRef.current;
      if (!canvas) {
        stream.getTracks().forEach((t) => t.stop());
        onClose();
        return;
      }

      const w = video.videoWidth;
      const h = video.videoHeight;
      canvas.width = w;
      canvas.height = h;
      dimensionsRef.current = { w, h };

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        stream.getTracks().forEach((t) => t.stop());
        onClose();
        return;
      }

      ctx.drawImage(video, 0, 0, w, h);
      imageDataRef.current = ctx.getImageData(0, 0, w, h);

      // Stop the stream immediately — we only needed one frame
      stream.getTracks().forEach((t) => t.stop());
      video.srcObject = null;

      setPhase("ready");
    } catch {
      // User denied permission or cancelled
      onClose();
    }
  }, [onClose]);

  const getPixel = useCallback(
    (clientX: number, clientY: number): RgbColor | null => {
      const canvas = canvasRef.current;
      const data = imageDataRef.current;
      if (!canvas || !data) return null;

      const rect = canvas.getBoundingClientRect();
      const { w, h } = dimensionsRef.current;

      const px = Math.round(((clientX - rect.left) / rect.width) * w);
      const py = Math.round(((clientY - rect.top) / rect.height) * h);

      if (px < 0 || py < 0 || px >= w || py >= h) return null;

      const i = (py * w + px) * 4;
      return {
        r: data.data[i],
        g: data.data[i + 1],
        b: data.data[i + 2],
        a: 1,
      };
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const rgb = getPixel(e.clientX, e.clientY);
      if (rgb) setHover({ x: e.clientX, y: e.clientY, rgb });
    },
    [getPixel],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const rgb = getPixel(e.clientX, e.clientY);
      if (rgb) onPick(rgb);
    },
    [getPixel, onPick],
  );

  const isReady = phase === "ready";
  const previewHex = hover ? rgbToHex(hover.rgb) : null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        isReady ? "bg-black cursor-crosshair" : "bg-bg-overlay"
      }`}
    >
      {/* ── Canvas: always mounted, hidden until ready ── */}
      <canvas
        ref={canvasRef}
        className={`max-w-full max-h-full object-contain ${isReady ? "" : "hidden"}`}
        onPointerMove={isReady ? handlePointerMove : undefined}
        onClick={isReady ? handleClick : undefined}
        onKeyDown={
          isReady
            ? (e) => {
                if (e.key === "Escape") onClose();
              }
            : undefined
        }
        tabIndex={isReady ? 0 : -1}
      />

      {/* ── Idle overlay ── */}
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-3 p-6 rounded-lg bg-bg-surface border border-border shadow-lg max-w-xs text-center">
          <MonitorSmartphone size={24} className="text-primary" />
          <p className="text-xs text-text leading-relaxed">
            Your browser doesn&apos;t support the EyeDropper API. Instead,
            we&apos;ll capture a screenshot and let you pick a color from it.
          </p>
          <div className="flex gap-2">
            <button
              onClick={startCapture}
              className="px-3 py-1.5 text-xs rounded bg-primary text-primary-text hover:bg-primary-hover transition-colors cursor-pointer"
            >
              Capture Screen
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded bg-bg-hover text-text hover:bg-bg-active transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Capturing overlay ── */}
      {phase === "capturing" && (
        <p className="text-sm text-text-muted">
          Select a screen or window to capture…
        </p>
      )}

      {/* ── Ready: controls + loupe ── */}
      {isReady && (
        <>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
            title="Cancel"
          >
            <X size={16} />
          </button>

          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full bg-black/60 text-white text-xs">
            Click anywhere to pick a color · Esc to cancel
          </div>

          {hover && previewHex && (
            <div
              className="pointer-events-none absolute z-10"
              style={{ left: hover.x + 16, top: hover.y + 16 }}
            >
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/80 border border-white/20 shadow-lg">
                <div
                  className="w-4 h-4 rounded-sm border border-white/30"
                  style={{ backgroundColor: previewHex }}
                />
                <span className="text-xs font-mono text-white">
                  {previewHex}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
