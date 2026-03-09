import { useRef, useCallback, useEffect, useState } from "react";
import type { CropRegion } from "../utils/crop";

interface CropOverlayProps {
  crop: CropRegion;
  imgWidth: number;
  imgHeight: number;
  /** Whether aspect ratio is locked (template or non-free preset) */
  lockAspect: boolean;
  /** Called while user drags — receives updated crop region */
  onCropChange: (crop: CropRegion) => void;
}

// ── Handle identifiers ──────────────────────────────────────

type DragKind = "move" | "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

const CURSORS: Record<DragKind, string> = {
  move: "cursor-move",
  n: "cursor-ns-resize",
  s: "cursor-ns-resize",
  e: "cursor-ew-resize",
  w: "cursor-ew-resize",
  nw: "cursor-nwse-resize",
  ne: "cursor-nesw-resize",
  sw: "cursor-nesw-resize",
  se: "cursor-nwse-resize",
};

// Minimum crop size in image pixels
const MIN_SIZE = 20;

/**
 * Interactive SVG crop overlay.
 *
 * Supports drag-to-move and resize via edges/corners.
 * When aspect ratio is locked, only corners resize (maintaining ratio)
 * and edges just move the crop. When free, edges resize in one axis.
 *
 * All pointer math converts screen deltas to image-coordinate deltas
 * using the SVG's CTM (current transform matrix) so it works regardless
 * of how the image is scaled/letterboxed on screen.
 */
export function CropOverlay({
  crop,
  imgWidth,
  imgHeight,
  lockAspect,
  onCropChange,
}: CropOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{
    kind: DragKind;
    startCrop: CropRegion;
    startPt: { x: number; y: number }; // image-space
    aspect: number; // width/height at drag start
  } | null>(null);

  const [activeCursor, setActiveCursor] = useState<string | null>(null);

  const sw = Math.max(1, Math.round(imgWidth / 400));

  // ── Convert screen point → image-space point ─────────────

  const toImageCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const imgPt = pt.matrixTransform(ctm.inverse());
      return { x: imgPt.x, y: imgPt.y };
    },
    [],
  );

  // ── Clamp helper ──────────────────────────────────────────

  const clampCrop = useCallback(
    (c: CropRegion): CropRegion => {
      let { x, y, width, height } = c;
      width = Math.max(MIN_SIZE, Math.min(width, imgWidth));
      height = Math.max(MIN_SIZE, Math.min(height, imgHeight));
      x = Math.max(0, Math.min(x, imgWidth - width));
      y = Math.max(0, Math.min(y, imgHeight - height));
      return {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
      };
    },
    [imgWidth, imgHeight],
  );

  // ── Start drag ────────────────────────────────────────────

  const startDrag = useCallback(
    (e: React.PointerEvent, kind: DragKind) => {
      e.preventDefault();
      e.stopPropagation();
      const pt = toImageCoords(e.clientX, e.clientY);
      if (!pt) return;
      (e.target as SVGElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        kind,
        startCrop: { ...crop },
        startPt: pt,
        aspect: crop.width / crop.height,
      };
      setActiveCursor(CURSORS[kind]);
    },
    [crop, toImageCoords],
  );

  // ── Pointer move ──────────────────────────────────────────

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      e.preventDefault();

      const pt = toImageCoords(e.clientX, e.clientY);
      if (!pt) return;

      const dx = pt.x - drag.startPt.x;
      const dy = pt.y - drag.startPt.y;
      const sc = drag.startCrop;
      const aspect = drag.aspect;

      let next: CropRegion;

      switch (drag.kind) {
        case "move":
          next = clampCrop({
            x: sc.x + dx,
            y: sc.y + dy,
            width: sc.width,
            height: sc.height,
          });
          break;

        case "nw":
          if (lockAspect) {
            // Move top-left corner, keep aspect
            // Use the larger of dx, dy to drive the resize
            const d = Math.abs(dx) > Math.abs(dy) ? dx : dy * aspect;
            const newW = Math.max(MIN_SIZE, sc.width - d);
            const newH = newW / aspect;
            next = clampCrop({
              x: sc.x + sc.width - newW,
              y: sc.y + sc.height - newH,
              width: newW,
              height: newH,
            });
          } else {
            next = clampCrop({
              x: sc.x + dx,
              y: sc.y + dy,
              width: sc.width - dx,
              height: sc.height - dy,
            });
          }
          break;

        case "ne":
          if (lockAspect) {
            const d = Math.abs(dx) > Math.abs(dy) ? dx : -dy * aspect;
            const newW = Math.max(MIN_SIZE, sc.width + d);
            const newH = newW / aspect;
            next = clampCrop({
              x: sc.x,
              y: sc.y + sc.height - newH,
              width: newW,
              height: newH,
            });
          } else {
            next = clampCrop({
              x: sc.x,
              y: sc.y + dy,
              width: sc.width + dx,
              height: sc.height - dy,
            });
          }
          break;

        case "sw":
          if (lockAspect) {
            const d = Math.abs(dx) > Math.abs(dy) ? -dx : dy * aspect;
            const newW = Math.max(MIN_SIZE, sc.width + d);
            const newH = newW / aspect;
            next = clampCrop({
              x: sc.x + sc.width - newW,
              y: sc.y,
              width: newW,
              height: newH,
            });
          } else {
            next = clampCrop({
              x: sc.x + dx,
              y: sc.y,
              width: sc.width - dx,
              height: sc.height + dy,
            });
          }
          break;

        case "se":
          if (lockAspect) {
            const d = Math.abs(dx) > Math.abs(dy) ? dx : dy * aspect;
            const newW = Math.max(MIN_SIZE, sc.width + d);
            const newH = newW / aspect;
            next = clampCrop({
              x: sc.x,
              y: sc.y,
              width: newW,
              height: newH,
            });
          } else {
            next = clampCrop({
              x: sc.x,
              y: sc.y,
              width: sc.width + dx,
              height: sc.height + dy,
            });
          }
          break;

        // Edge drags: in locked mode these just move, in free mode resize one axis
        case "n":
          if (lockAspect) {
            next = clampCrop({
              x: sc.x,
              y: sc.y + dy,
              width: sc.width,
              height: sc.height,
            });
          } else {
            next = clampCrop({
              x: sc.x,
              y: sc.y + dy,
              width: sc.width,
              height: sc.height - dy,
            });
          }
          break;

        case "s":
          if (lockAspect) {
            next = clampCrop({
              x: sc.x,
              y: sc.y + dy,
              width: sc.width,
              height: sc.height,
            });
          } else {
            next = clampCrop({
              x: sc.x,
              y: sc.y,
              width: sc.width,
              height: sc.height + dy,
            });
          }
          break;

        case "w":
          if (lockAspect) {
            next = clampCrop({
              x: sc.x + dx,
              y: sc.y,
              width: sc.width,
              height: sc.height,
            });
          } else {
            next = clampCrop({
              x: sc.x + dx,
              y: sc.y,
              width: sc.width - dx,
              height: sc.height,
            });
          }
          break;

        case "e":
          if (lockAspect) {
            next = clampCrop({
              x: sc.x + dx,
              y: sc.y,
              width: sc.width,
              height: sc.height,
            });
          } else {
            next = clampCrop({
              x: sc.x,
              y: sc.y,
              width: sc.width + dx,
              height: sc.height,
            });
          }
          break;

        default:
          return;
      }

      onCropChange(next);
    },
    [toImageCoords, clampCrop, lockAspect, onCropChange],
  );

  // ── End drag ──────────────────────────────────────────────

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
    setActiveCursor(null);
  }, []);

  // ── Set body cursor while dragging ────────────────────────

  useEffect(() => {
    if (!activeCursor) return;
    // Map our tailwind cursor class to a CSS cursor value
    const cssMap: Record<string, string> = {
      "cursor-move": "move",
      "cursor-ns-resize": "ns-resize",
      "cursor-ew-resize": "ew-resize",
      "cursor-nwse-resize": "nwse-resize",
      "cursor-nesw-resize": "nesw-resize",
    };
    const prev = document.body.style.cursor;
    document.body.style.cursor = cssMap[activeCursor] ?? "default";
    return () => {
      document.body.style.cursor = prev;
    };
  }, [activeCursor]);

  // ── Hit zone sizing ───────────────────────────────────────

  // Hit zones are sized in image coords — scale so they feel ~8px on screen
  const hitW = Math.max(6, Math.round(imgWidth / 80));
  const hitH = Math.max(6, Math.round(imgHeight / 80));

  const cornerSize = Math.max(12, Math.round(imgWidth / 50));

  // Visual handle length
  const handleLen = Math.max(8, Math.round(imgWidth / 60));

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${imgWidth} ${imgHeight}`}
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid meet"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ touchAction: "none" }}
    >
      {/* Darken outside crop */}
      <defs>
        <mask id="crop-mask">
          <rect width={imgWidth} height={imgHeight} fill="white" />
          <rect
            x={crop.x}
            y={crop.y}
            width={crop.width}
            height={crop.height}
            fill="black"
          />
        </mask>
      </defs>
      <rect
        width={imgWidth}
        height={imgHeight}
        fill="black"
        fillOpacity={0.5}
        mask="url(#crop-mask)"
        className="pointer-events-none"
      />

      {/* Move handle — the crop area itself */}
      <rect
        x={crop.x}
        y={crop.y}
        width={crop.width}
        height={crop.height}
        fill="transparent"
        className="cursor-move"
        onPointerDown={(e) => startDrag(e, "move")}
      />

      {/* Crop border (visual only) */}
      <rect
        x={crop.x}
        y={crop.y}
        width={crop.width}
        height={crop.height}
        fill="none"
        stroke="white"
        strokeWidth={sw}
        strokeOpacity={0.9}
        strokeDasharray={`${sw * 4} ${sw * 3}`}
        className="pointer-events-none"
      />

      {/* Rule-of-thirds grid lines */}
      {[1 / 3, 2 / 3].map((frac) => (
        <g key={frac} opacity={0.3} className="pointer-events-none">
          <line
            x1={crop.x + crop.width * frac}
            y1={crop.y}
            x2={crop.x + crop.width * frac}
            y2={crop.y + crop.height}
            stroke="white"
            strokeWidth={Math.max(0.5, sw / 2)}
          />
          <line
            x1={crop.x}
            y1={crop.y + crop.height * frac}
            x2={crop.x + crop.width}
            y2={crop.y + crop.height * frac}
            stroke="white"
            strokeWidth={Math.max(0.5, sw / 2)}
          />
        </g>
      ))}

      {/* ── Edge handles ─────────────────────────────────── */}
      {/* North edge */}
      <rect
        x={crop.x + cornerSize}
        y={crop.y - hitH / 2}
        width={Math.max(0, crop.width - cornerSize * 2)}
        height={hitH}
        fill="transparent"
        className={lockAspect ? "cursor-move" : "cursor-ns-resize"}
        onPointerDown={(e) => startDrag(e, lockAspect ? "move" : "n")}
      />
      {/* South edge */}
      <rect
        x={crop.x + cornerSize}
        y={crop.y + crop.height - hitH / 2}
        width={Math.max(0, crop.width - cornerSize * 2)}
        height={hitH}
        fill="transparent"
        className={lockAspect ? "cursor-move" : "cursor-ns-resize"}
        onPointerDown={(e) => startDrag(e, lockAspect ? "move" : "s")}
      />
      {/* West edge */}
      <rect
        x={crop.x - hitW / 2}
        y={crop.y + cornerSize}
        width={hitW}
        height={Math.max(0, crop.height - cornerSize * 2)}
        fill="transparent"
        className={lockAspect ? "cursor-move" : "cursor-ew-resize"}
        onPointerDown={(e) => startDrag(e, lockAspect ? "move" : "w")}
      />
      {/* East edge */}
      <rect
        x={crop.x + crop.width - hitW / 2}
        y={crop.y + cornerSize}
        width={hitW}
        height={Math.max(0, crop.height - cornerSize * 2)}
        fill="transparent"
        className={lockAspect ? "cursor-move" : "cursor-ew-resize"}
        onPointerDown={(e) => startDrag(e, lockAspect ? "move" : "e")}
      />

      {/* ── Corner handles ───────────────────────────────── */}
      {(
        [
          ["nw", crop.x, crop.y],
          ["ne", crop.x + crop.width, crop.y],
          ["sw", crop.x, crop.y + crop.height],
          ["se", crop.x + crop.width, crop.y + crop.height],
        ] as [DragKind, number, number][]
      ).map(([kind, cx, cy]) => {
        const isLeft = kind.includes("w");
        const isTop = kind.includes("n");

        return (
          <g key={kind}>
            {/* Invisible hit zone */}
            <rect
              x={isLeft ? cx - cornerSize / 2 : cx - cornerSize / 2}
              y={isTop ? cy - cornerSize / 2 : cy - cornerSize / 2}
              width={cornerSize}
              height={cornerSize}
              fill="transparent"
              className={CURSORS[kind]}
              onPointerDown={(e) => startDrag(e, kind)}
            />
            {/* Visual L-shaped handle */}
            <line
              x1={cx}
              y1={cy}
              x2={cx + handleLen * (isLeft ? 1 : -1)}
              y2={cy}
              stroke="white"
              strokeWidth={sw * 2}
              className="pointer-events-none"
            />
            <line
              x1={cx}
              y1={cy}
              x2={cx}
              y2={cy + handleLen * (isTop ? 1 : -1)}
              stroke="white"
              strokeWidth={sw * 2}
              className="pointer-events-none"
            />
          </g>
        );
      })}
    </svg>
  );
}
