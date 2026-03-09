import type { CropRegion } from "../utils/crop";

interface CropOverlayProps {
  crop: CropRegion;
  imgWidth: number;
  imgHeight: number;
}

/**
 * SVG overlay showing the crop region.
 * The area outside the crop is darkened, the crop region is clear
 * with a dashed border.
 */
export function CropOverlay({ crop, imgWidth, imgHeight }: CropOverlayProps) {
  const sw = Math.max(1, Math.round(imgWidth / 400));

  return (
    <svg
      viewBox={`0 0 ${imgWidth} ${imgHeight}`}
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="xMidYMid meet"
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
      />

      {/* Crop border */}
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
      />

      {/* Rule-of-thirds grid lines */}
      {[1 / 3, 2 / 3].map((frac) => (
        <g key={frac} opacity={0.3}>
          {/* Vertical */}
          <line
            x1={crop.x + crop.width * frac}
            y1={crop.y}
            x2={crop.x + crop.width * frac}
            y2={crop.y + crop.height}
            stroke="white"
            strokeWidth={Math.max(0.5, sw / 2)}
          />
          {/* Horizontal */}
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

      {/* Corner handles */}
      {[
        [crop.x, crop.y],
        [crop.x + crop.width, crop.y],
        [crop.x, crop.y + crop.height],
        [crop.x + crop.width, crop.y + crop.height],
      ].map(([cx, cy], i) => {
        const len = Math.max(8, Math.round(imgWidth / 60));
        const dx = i % 2 === 0 ? 1 : -1;
        const dy = i < 2 ? 1 : -1;
        return (
          <g key={i}>
            <line
              x1={cx}
              y1={cy}
              x2={cx + len * dx}
              y2={cy}
              stroke="white"
              strokeWidth={sw * 2}
            />
            <line
              x1={cx}
              y1={cy}
              x2={cx}
              y2={cy + len * dy}
              stroke="white"
              strokeWidth={sw * 2}
            />
          </g>
        );
      })}
    </svg>
  );
}
