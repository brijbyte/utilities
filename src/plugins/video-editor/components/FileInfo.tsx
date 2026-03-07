import { Film, HardDrive, Maximize, Clock } from "lucide-react";
import type { VideoMeta } from "../utils/types";
import { formatBytes, formatTime } from "../utils/types";

interface FileInfoProps {
  meta: VideoMeta;
}

export function FileInfo({ meta }: FileInfoProps) {
  const items = [
    {
      icon: <Film size={12} />,
      label: "Format",
      value: meta.type.split("/")[1]?.toUpperCase() ?? meta.type,
    },
    {
      icon: <HardDrive size={12} />,
      label: "Size",
      value: formatBytes(meta.size),
    },
    {
      icon: <Maximize size={12} />,
      label: "Resolution",
      value: `${meta.width}×${meta.height}`,
    },
    {
      icon: <Clock size={12} />,
      label: "Duration",
      value: formatTime(meta.duration),
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-inset"
        >
          <span className="text-text-muted">{item.icon}</span>
          <div className="flex flex-col min-w-0">
            <span className="text-[0.625rem] text-text-muted uppercase tracking-wider">
              {item.label}
            </span>
            <span className="text-xs font-medium text-text truncate">
              {item.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
