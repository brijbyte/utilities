import type { FaceResult } from "../utils/face-detect";

interface FaceOverlayProps {
  faces: FaceResult[];
  imgWidth: number;
  imgHeight: number;
}

const KEYPOINT_COLORS: Record<string, string> = {
  leftEye: "var(--color-primary)",
  rightEye: "var(--color-primary)",
  noseTip: "var(--color-success)",
  mouth: "var(--color-danger)",
  leftEarTragion: "var(--color-warning)",
  rightEarTragion: "var(--color-warning)",
};

const DEFAULT_KP_COLOR = "var(--color-primary)";

/**
 * SVG overlay that renders face detection bounding boxes and keypoints.
 * Positioned absolutely over the image — parent must be `relative`.
 *
 * Uses a viewBox matching the original image dimensions so all coordinates
 * map 1:1 regardless of how the image is displayed.
 */
export function FaceOverlay({ faces, imgWidth, imgHeight }: FaceOverlayProps) {
  if (faces.length === 0) return null;

  return (
    <svg
      viewBox={`0 0 ${imgWidth} ${imgHeight}`}
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="xMidYMid meet"
    >
      {faces.map((face, i) => {
        const { box, confidence, keypoints } = face;

        return (
          <g key={i}>
            {/* Bounding box */}
            <rect
              x={box.x}
              y={box.y}
              width={box.width}
              height={box.height}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth={Math.max(1, Math.round(imgWidth / 400))}
              strokeOpacity={0.9}
              rx={Math.max(2, Math.round(imgWidth / 300))}
            />

            {/* Confidence label */}
            <text
              x={box.x + 4}
              y={box.y - Math.max(4, Math.round(imgWidth / 200))}
              fill="var(--color-primary)"
              fontSize={Math.max(10, Math.round(imgWidth / 80))}
              fontFamily="var(--font-mono)"
              fontWeight="600"
            >
              {Math.round(confidence * 100)}%
            </text>

            {/* Keypoints */}
            {keypoints.map((kp, j) => {
              // Keypoint coords are normalized 0-1, denormalize to pixels
              const cx = kp.x * imgWidth;
              const cy = kp.y * imgHeight;
              const r = Math.max(2, Math.round(imgWidth / 250));
              const color = KEYPOINT_COLORS[kp.name ?? ""] ?? DEFAULT_KP_COLOR;

              return (
                <circle
                  key={j}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={color}
                  fillOpacity={0.9}
                  stroke="white"
                  strokeWidth={Math.max(0.5, r / 3)}
                  strokeOpacity={0.7}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
