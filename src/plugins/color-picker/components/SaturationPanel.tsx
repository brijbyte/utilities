import { useRef, useCallback, useEffect } from "react";

interface Props {
  hue: number;
  saturation: number;
  brightness: number;
  onChange: (s: number, v: number) => void;
}

/**
 * 2D saturation–brightness picker. Renders a hue-tinted gradient on canvas.
 * X = saturation (0–100), Y = brightness/value (100–0 top to bottom).
 */
export function SaturationPanel({
  hue,
  saturation,
  brightness,
  onChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    if (!ctx) return;
    const { width, height } = canvas;

    // Hue base fill
    ctx.fillStyle = `hsl(${hue} 100% 50%)`;
    ctx.fillRect(0, 0, width, height);

    // White gradient left → right
    const whiteGrad = ctx.createLinearGradient(0, 0, width, 0);
    whiteGrad.addColorStop(0, "rgba(255,255,255,1)");
    whiteGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = whiteGrad;
    ctx.fillRect(0, 0, width, height);

    // Black gradient top → bottom
    const blackGrad = ctx.createLinearGradient(0, 0, 0, height);
    blackGrad.addColorStop(0, "rgba(0,0,0,0)");
    blackGrad.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = blackGrad;
    ctx.fillRect(0, 0, width, height);
  }, [hue]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Resize canvas to match container
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          canvas.width = Math.round(width);
          canvas.height = Math.round(height);
          draw();
        }
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [draw]);

  const update = useCallback(
    (clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      onChange(x * 100, (1 - y) * 100);
    },
    [onChange],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      update(e.clientX, e.clientY);
    },
    [update],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      update(e.clientX, e.clientY);
    },
    [update],
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // Thumb position
  const thumbX = `${saturation}%`;
  const thumbY = `${100 - brightness}%`;

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[4/3] cursor-crosshair select-none touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Canvas in its own clipping context for rounded corners */}
      <div className="absolute inset-0 rounded-lg overflow-hidden border border-border-muted">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
      {/* Thumb sits outside the clipping context so it's never cut off */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: thumbX,
          top: thumbY,
          transform: "translate(-50%, -50%)",
        }}
      >
        <div className="w-4 h-4 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.3),inset_0_0_0_1px_rgba(0,0,0,0.3)]" />
      </div>
    </div>
  );
}
