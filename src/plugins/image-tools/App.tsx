import { useState, useCallback, useEffect, useRef } from "react";
import { Trash2, ImageIcon, Download, Loader2 } from "lucide-react";
import { Button } from "../../components/Button";
import { UploadZone } from "./components/UploadZone";
import { ImageGallery } from "./components/ImageGallery";
import { ImageStrip } from "./components/ImageStrip";
import { EditorView } from "./components/EditorView";
import type { EditorActions } from "./components/EditorView";
import type { ImageFile } from "./utils/types";
import { generateId, buildImageMeta } from "./utils/types";
import { analyzeImage } from "./utils/quality";
import { extractExif } from "./utils/exif";

// ═══════════════════════════════════════════════════════════════════

export default function ImageTools() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(0); // count of images being analyzed
  const urlsRef = useRef<Set<string>>(new Set());
  const [editorActions, setEditorActions] = useState<EditorActions | null>(
    null,
  );

  // ── Cleanup on unmount ────────────────────────────────────

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const urls = urlsRef.current;
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, []);

  // ── Add images ────────────────────────────────────────────

  const handleFiles = useCallback((files: File[]) => {
    const newImages: ImageFile[] = files.map((file) => {
      const url = URL.createObjectURL(file);
      urlsRef.current.add(url);
      return {
        id: generateId(),
        file,
        url,
        width: 0,
        height: 0,
        quality: null,
        meta: null,
        exif: null,
        faces: null,
      };
    });

    setImages((prev) => [...prev, ...newImages]);

    // Analyze each image in background
    setAnalyzing((c) => c + files.length);

    for (const img of newImages) {
      Promise.all([analyzeImage(img.file), extractExif(img.file)])
        .then(([{ quality, width, height }, exif]) => {
          const meta = buildImageMeta(img.file, width, height);
          setImages((prev) =>
            prev.map((i) =>
              i.id === img.id
                ? { ...i, quality, width, height, meta, exif }
                : i,
            ),
          );
        })
        .catch(() => {
          // If analysis fails, try to at least get dimensions
          const el = new Image();
          el.onload = () => {
            const meta = buildImageMeta(
              img.file,
              el.naturalWidth,
              el.naturalHeight,
            );
            setImages((prev) =>
              prev.map((i) =>
                i.id === img.id
                  ? {
                      ...i,
                      width: el.naturalWidth,
                      height: el.naturalHeight,
                      meta,
                    }
                  : i,
              ),
            );
          };
          el.src = img.url;
        })
        .finally(() => {
          setAnalyzing((c) => c - 1);
        });
    }
  }, []);

  // ── Remove image ──────────────────────────────────────────

  const handleRemove = useCallback(
    (id: string) => {
      setImages((prev) => {
        const img = prev.find((i) => i.id === id);
        if (img) {
          URL.revokeObjectURL(img.url);
          urlsRef.current.delete(img.url);
        }
        return prev.filter((i) => i.id !== id);
      });
      if (selectedId === id) {
        setSelectedId(null);
        setEditorActions(null);
      }
    },
    [selectedId],
  );

  // ── Clear all ─────────────────────────────────────────────

  const handleClearAll = useCallback(() => {
    for (const img of images) {
      URL.revokeObjectURL(img.url);
      urlsRef.current.delete(img.url);
    }
    setImages([]);
    setSelectedId(null);
    setEditorActions(null);
  }, [images]);

  // ── Select & navigate ─────────────────────────────────────

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedId(null);
    setEditorActions(null);
  }, []);

  // ── Update image (from editor) ────────────────────────────

  const handleUpdateImage = useCallback(
    (id: string, patch: Partial<ImageFile>) => {
      setImages((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...patch } : i)),
      );
    },
    [],
  );

  // ── Derived ───────────────────────────────────────────────

  const selectedImage = images.find((i) => i.id === selectedId) ?? null;

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-tb px-tb-x py-tb-y border-b border-border bg-bg-surface">
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <ImageIcon size={13} />
          <span>
            {images.length === 0
              ? "No images"
              : `${images.length} image${images.length !== 1 ? "s" : ""}`}
          </span>
          {analyzing > 0 && (
            <span className="text-[0.5625rem] text-primary animate-pulse">
              · Analyzing {analyzing}…
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {/* Editor actions — shown when an image is selected */}
          {selectedImage && editorActions && (
            <>
              <Button
                variant="primary"
                onClick={editorActions.process}
                disabled={editorActions.processing}
                className="text-xs"
              >
                {editorActions.processing ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Processing…
                  </>
                ) : (
                  "Process"
                )}
              </Button>
              {editorActions.hasResult && (
                <Button
                  variant="outline"
                  onClick={editorActions.download}
                  className="text-xs"
                >
                  <Download size={12} />
                  Download
                </Button>
              )}
              <div className="w-px h-4 bg-border mx-0.5" />
            </>
          )}
          <UploadZone onFiles={handleFiles} compact />
          <Button
            variant="ghost"
            className="text-danger hover:text-danger-hover"
            onClick={handleClearAll}
            disabled={images.length === 0}
          >
            <Trash2 size={12} />
            Clear All
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 flex flex-col gap-4">
          {images.length === 0 ? (
            <UploadZone onFiles={handleFiles} />
          ) : !selectedImage ? (
            <>
              <UploadZone onFiles={handleFiles} />
              <ImageGallery
                images={images}
                selectedId={selectedId}
                onSelect={handleSelect}
                onRemove={handleRemove}
              />
            </>
          ) : (
            <>
              {/* Image strip for switching between images */}
              {images.length > 1 && (
                <ImageStrip
                  images={images}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                  onRemove={handleRemove}
                />
              )}
              <EditorView
                image={selectedImage}
                onBack={handleBack}
                onUpdate={handleUpdateImage}
                onActionsChange={setEditorActions}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
