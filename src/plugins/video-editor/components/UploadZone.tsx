import { useState, useRef, useCallback } from "react";
import { Upload, Film } from "lucide-react";

interface UploadZoneProps {
  onFile: (file: File, buffer: ArrayBuffer | null) => void;
}

const ACCEPT = "video/*,.mp4,.webm,.avi,.mov,.mkv,.flv,.wmv,.m4v,.3gp";

function isVideo(file: File): boolean {
  return (
    file.type.startsWith("video/") ||
    /\.(mp4|webm|avi|mov|mkv|flv|wmv|m4v|3gp)$/i.test(file.name)
  );
}

/**
 * Read a File into an ArrayBuffer using FileReader.
 * Returns null if the read fails (e.g., >2GB files, stale DnD reference).
 */
function readFileBuffer(file: File): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result instanceof ArrayBuffer ? reader.result : null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsArrayBuffer(file);
  });
}

export function UploadZone({ onFile }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [dropError, setDropError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // File picker: File reference stays valid — pass it directly, read lazily
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && isVideo(file)) {
        setDropError(false);
        onFile(file, null); // null = read lazily from File when needed
      }
      if (inputRef.current) inputRef.current.value = "";
    },
    [onFile],
  );

  // Drag-and-drop: File reference can go stale — try eager read
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (!file || !isVideo(file)) return;

      setDropError(false);

      // Try to read immediately while the DnD file reference is valid.
      // This can fail for very large files (>2GB) or on some browsers.
      readFileBuffer(file).then((buffer) => {
        if (buffer) {
          onFile(file, buffer);
        } else {
          // Read failed — prompt user to use file picker
          setDropError(true);
        }
      });
    },
    [onFile],
  );

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (e.detail === 0) return;
    inputRef.current?.click();
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
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

      {dropError && (
        <div className="flex flex-col items-center gap-2 px-3 py-3 rounded-lg border border-warning/30 bg-warning/5">
          <span className="text-xs text-warning text-center">
            Couldn't read the dropped file — it may be too large for
            drag-and-drop. Please use the file picker instead.
          </span>
          <button
            onClick={() => inputRef.current?.click()}
            className="text-xs font-medium text-primary hover:underline cursor-pointer"
          >
            Open file picker
          </button>
        </div>
      )}
    </div>
  );
}
