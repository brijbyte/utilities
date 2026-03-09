import { useRef, useEffect } from "react";
import { X } from "lucide-react";
import type { ImageFile } from "../utils/types";

interface ImageStripProps {
  images: ImageFile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

/**
 * Horizontal scrollable strip of image thumbnails.
 * Shown above the editor so users can switch images without going back.
 * The selected image is highlighted and auto-scrolled into view.
 */
export function ImageStrip({
  images,
  selectedId,
  onSelect,
  onRemove,
}: ImageStripProps) {
  const selectedRef = useRef<HTMLDivElement>(null);

  // Auto-scroll selected thumbnail into view
  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [selectedId]);

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1 scrollbar-thin">
      {images.map((img) => {
        const isSelected = img.id === selectedId;
        return (
          <div
            key={img.id}
            ref={isSelected ? selectedRef : undefined}
            onClick={() => onSelect(img.id)}
            className={`group relative shrink-0 w-14 h-14 rounded-md overflow-hidden cursor-pointer border-2 transition-all ${
              isSelected
                ? "border-primary ring-1 ring-primary/20"
                : "border-transparent hover:border-border opacity-70 hover:opacity-100"
            }`}
          >
            <img
              src={img.url}
              alt={img.file.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* Remove button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(img.id);
              }}
              className="absolute top-0 right-0 p-px rounded-bl bg-bg-overlay/70 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-bg-overlay/90"
            >
              <X size={9} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
