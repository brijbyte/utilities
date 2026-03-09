import type { ImageFile } from "../utils/types";
import { ImageCard } from "./ImageCard";

interface ImageGalleryProps {
  images: ImageFile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

export function ImageGallery({
  images,
  selectedId,
  onSelect,
  onRemove,
}: ImageGalleryProps) {
  if (images.length === 0) return null;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
      {images.map((img) => (
        <ImageCard
          key={img.id}
          image={img}
          selected={img.id === selectedId}
          onSelect={() => onSelect(img.id)}
          onRemove={() => onRemove(img.id)}
        />
      ))}
    </div>
  );
}
