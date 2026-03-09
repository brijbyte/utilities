import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, ImageIcon } from "lucide-react";

interface UploadZoneProps {
  onFiles: (files: File[]) => void;
  compact?: boolean;
}

const ACCEPT = "image/*,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tiff";

function isImage(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif|bmp|tiff?)$/i.test(file.name)
  );
}

export function UploadZone({ onFiles, compact }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // Accept files from input or drop
  const accept = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter(isImage);
      if (files.length > 0) onFiles(files);
    },
    [onFiles],
  );

  // File picker
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) accept(e.target.files);
      if (inputRef.current) inputRef.current.value = "";
    },
    [accept],
  );

  // Drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setDragging(false);
      accept(e.dataTransfer.files);
    },
    [accept],
  );

  // Paste from clipboard
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of items) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        onFiles(files);
      }
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [onFiles]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (e.detail === 0) return;
    inputRef.current?.click();
  }, []);

  if (compact) {
    return (
      <>
        <button
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs leading-none rounded border border-border bg-bg-surface hover:bg-bg-hover cursor-pointer transition-colors"
        >
          <Upload size={12} />
          Add Images
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          onChange={handleChange}
          className="hidden"
        />
      </>
    );
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`flex flex-col items-center justify-center gap-4 p-10 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
        dragging
          ? "border-primary bg-accent-subtle"
          : "border-border-muted hover:border-border hover:bg-bg-hover"
      }`}
    >
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-bg-hover">
        {dragging ? (
          <ImageIcon size={28} className="text-primary" />
        ) : (
          <Upload size={28} className="text-text-muted" />
        )}
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm text-text">
          {dragging ? "Drop images here" : "Click or drag images to upload"}
        </span>
        <span className="text-[0.625rem] text-text-muted">
          PNG, JPG, WebP • Multiple files • Paste from clipboard
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
