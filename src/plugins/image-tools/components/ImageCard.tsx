import { X } from "lucide-react";
import type { ImageFile } from "../utils/types";
import { formatFileSize, formatDimensions } from "../utils/types";

interface ImageCardProps {
  image: ImageFile;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

const qualityColors: Record<string, string> = {
  good: "bg-success/15 text-success",
  fair: "bg-warning/15 text-warning",
  poor: "bg-danger/15 text-danger",
};

const qualityDots: Record<string, string> = {
  good: "bg-success",
  fair: "bg-warning",
  poor: "bg-danger",
};

export function ImageCard({
  image,
  selected,
  onSelect,
  onRemove,
}: ImageCardProps) {
  const q = image.quality;

  return (
    <div
      onClick={onSelect}
      className={`group relative rounded-lg border overflow-hidden cursor-pointer transition-all ${
        selected
          ? "border-primary ring-2 ring-primary/20"
          : "border-border-muted hover:border-border"
      }`}
    >
      {/* Thumbnail */}
      <div className="aspect-square bg-bg-inset overflow-hidden">
        <img
          src={image.url}
          alt={image.file.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-1 right-1 p-0.5 rounded bg-bg-overlay/60 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-bg-overlay/80"
      >
        <X size={12} />
      </button>

      {/* Info bar */}
      <div className="px-2 py-1.5 bg-bg-surface border-t border-border-muted">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[0.5625rem] text-text-muted truncate">
            {formatDimensions(image.width, image.height)}
          </span>
          <span className="text-[0.5625rem] text-text-muted whitespace-nowrap">
            {formatFileSize(image.file.size)}
          </span>
        </div>

        {q && (
          <div className="flex items-center gap-1 mt-0.5">
            <span
              className={`inline-flex items-center gap-1 px-1 py-px text-[0.5rem] rounded-full font-medium ${qualityColors[q.overall]}`}
            >
              <span
                className={`w-1 h-1 rounded-full ${qualityDots[q.overall]}`}
              />
              {q.overall === "good"
                ? "Good"
                : q.overall === "fair"
                  ? "Fair"
                  : "Poor"}
            </span>
            <span className="text-[0.5rem] text-text-muted">
              {q.resolution.megapixels} MP
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
