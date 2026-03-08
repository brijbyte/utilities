import { Film, HardDrive, Maximize, Clock, TriangleAlert } from "lucide-react";
import type { VideoMeta } from "../utils/types";
import { formatBytes, formatTime } from "../utils/types";

interface FileInfoProps {
  meta: VideoMeta;
}

// Lower thresholds on mobile since browsers have tighter memory limits
const isMobile =
  typeof navigator !== "undefined" &&
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

const SIZE_WARN_MB = isMobile ? 100 : 500;
const SIZE_DANGER_MB = isMobile ? 300 : 1000;

export function FileInfo({ meta }: FileInfoProps) {
  const sizeMB = meta.size / (1024 * 1024);

  const items = [
    {
      icon: <Film size={11} />,
      label: "Format",
      value: meta.type.split("/")[1]?.toUpperCase() ?? meta.type,
    },
    {
      icon: <HardDrive size={11} />,
      label: "Size",
      value: formatBytes(meta.size),
    },
    {
      icon: <Maximize size={11} />,
      label: "Res",
      value:
        meta.width === 1920 && meta.height === 1080 && meta.duration === 0
          ? "Unknown"
          : `${meta.width}×${meta.height}`,
    },
    {
      icon: <Clock size={11} />,
      label: "Duration",
      value: meta.duration > 0 ? formatTime(meta.duration) : "Unknown",
    },
  ];

  let warningMessage: string | null = null;
  let warningLevel: "danger" | "warning" = "warning";

  if (sizeMB >= SIZE_DANGER_MB) {
    warningMessage = isMobile
      ? "Very large file for a mobile device — processing will likely fail or crash the browser tab."
      : "Very large file — processing may be slow and use significant memory.";
    warningLevel = "danger";
  } else if (sizeMB >= SIZE_WARN_MB) {
    warningMessage = isMobile
      ? "Large file for a mobile device — processing may be slow or cause the tab to reload."
      : "Large file — processing may take a while.";
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-1.5">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-bg-inset"
          >
            <span className="text-text-muted">{item.icon}</span>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] text-text-muted uppercase tracking-wider leading-none">
                {item.label}
              </span>
              <span className="text-[11px] font-medium text-text truncate">
                {item.value}
              </span>
            </div>
          </div>
        ))}
      </div>
      {warningMessage && (
        <div
          className={`flex items-start gap-1.5 px-2 py-1.5 rounded border text-[10px] leading-snug ${
            warningLevel === "danger"
              ? "border-danger/30 bg-danger/5 text-danger"
              : "border-warning/30 bg-warning/5 text-warning"
          }`}
        >
          <TriangleAlert size={11} className="shrink-0 mt-px" />
          <span>{warningMessage}</span>
        </div>
      )}
    </div>
  );
}
