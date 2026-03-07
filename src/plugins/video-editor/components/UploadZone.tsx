import { useState, useRef, useCallback } from "react";
import { Upload, Film } from "lucide-react";

interface UploadZoneProps {
  onFile: (file: File) => void;
}

const ACCEPT = "video/*,.mp4,.webm,.avi,.mov,.mkv,.flv,.wmv,.m4v,.3gp";

export function UploadZone({ onFile }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (
        file.type.startsWith("video/") ||
        /\.(mp4|webm|avi|mov|mkv|flv|wmv|m4v|3gp)$/i.test(file.name)
      ) {
        onFile(file);
      }
    },
    [onFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      if (inputRef.current) inputRef.current.value = "";
    },
    [handleFile],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex flex-col items-center justify-center gap-4 p-10 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
        dragging
          ? "border-primary bg-accent-subtle"
          : "border-border-muted hover:border-border hover:bg-bg-hover"
      }`}
    >
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-bg-hover">
        {dragging ? (
          <Film size={28} className="text-primary" />
        ) : (
          <Upload size={28} className="text-text-muted" />
        )}
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm text-text">
          {dragging ? "Drop video here" : "Click or drag a video file"}
        </span>
        <span className="text-[0.625rem] text-text-muted">
          MP4, WebM, AVI, MOV, MKV and more
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
