import { useState, useCallback, useRef, useEffect } from "react";
import { Toolbar } from "@base-ui/react/toolbar";
import {
  Shrink,
  Scissors,
  Maximize,
  ArrowRightLeft,
  Volume2,
  RotateCw,
  Play,
  Trash2,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { Button } from "../../components/Button";
import { CollapsibleGroup, Collapsible } from "../../components/Collapsible";
import { UploadZone } from "./components/UploadZone";
import { VideoPreview } from "./components/VideoPreview";
import { FileInfo } from "./components/FileInfo";
import { CompressPanel } from "./components/CompressPanel";
import { TrimPanel } from "./components/TrimPanel";
import { ResizePanel } from "./components/ResizePanel";
import { ConvertPanel } from "./components/ConvertPanel";
import { AudioPanel } from "./components/AudioPanel";
import { RotatePanel } from "./components/RotatePanel";
import { ProgressBar } from "./components/ProgressBar";
import { OutputSection } from "./components/OutputSection";
import { QuickPresets } from "./components/QuickPresets";
import type { VideoMeta, Operations, ProcessingState } from "./utils/types";
import { defaultOperations, formatBytes } from "./utils/types";
import { terminate } from "./utils/ffmpeg";
import { processVideo } from "./utils/process";

// ═══════════════════════════════════════════════════════════════════

const SIZE_WARNING_MB = 500;

export default function VideoEditor() {
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<VideoMeta | null>(null);
  const [ops, setOps] = useState<Operations | null>(null);
  const [state, setState] = useState<ProcessingState>({ status: "idle" });
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const abortCtrlRef = useRef<AbortController | null>(null);
  const outputUrlRef = useRef<string | null>(null);

  // Cleanup on unmount: abort any processing, revoke URLs, terminate FFmpeg
  useEffect(() => {
    return () => {
      abortCtrlRef.current?.abort();
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
      terminate();
    };
  }, [videoUrl]);

  // Warn before closing/reloading while processing
  const isProcessing =
    state.status === "loading-ffmpeg" || state.status === "processing";

  useEffect(() => {
    if (!isProcessing) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isProcessing]);

  // ── Handle file upload ────────────────────────────────────────

  const handleFile = useCallback(
    (f: File) => {
      // Revoke previous URLs
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (outputUrlRef.current) {
        URL.revokeObjectURL(outputUrlRef.current);
        outputUrlRef.current = null;
      }

      const url = URL.createObjectURL(f);
      setVideoUrl(url);
      setFile(f);
      setState({ status: "idle" });

      // Extract metadata using a <video> element
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        const m: VideoMeta = {
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          size: f.size,
          type: f.type,
          name: f.name,
        };
        setMeta(m);
        setOps(defaultOperations(m));
        URL.revokeObjectURL(video.src);
      };
      video.src = URL.createObjectURL(f);
    },
    [videoUrl],
  );

  // ── Process video ─────────────────────────────────────────────

  const process = useCallback(async () => {
    if (!file || !meta || !ops) return;
    if (!Object.values(ops).some((o) => o.enabled)) return;

    // Abort any previous run
    abortCtrlRef.current?.abort();
    const ctrl = new AbortController();
    abortCtrlRef.current = ctrl;

    // Revoke previous output
    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = null;
    }

    try {
      const result = await processVideo(file, meta, ops, setState, ctrl.signal);

      outputUrlRef.current = result.outputUrl;
      setState({
        status: "done",
        outputUrl: result.outputUrl,
        outputName: result.outputName,
        outputSize: result.outputSize,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setState({
        status: "error",
        error: err instanceof Error ? err.message : "An unknown error occurred",
      });
    }
  }, [file, meta, ops]);

  // ── Cancel processing ─────────────────────────────────────────

  const cancel = useCallback(() => {
    abortCtrlRef.current?.abort();
    setState({ status: "idle" });
  }, []);

  // ── Reset everything ──────────────────────────────────────────

  const reset = useCallback(() => {
    abortCtrlRef.current?.abort();
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = null;
    }
    setFile(null);
    setMeta(null);
    setOps(null);
    setVideoUrl(null);
    setState({ status: "idle" });
  }, [videoUrl]);

  // ── Derived state ─────────────────────────────────────────────

  const anyEnabled = ops ? Object.values(ops).some((o) => o.enabled) : false;
  const showSizeWarning =
    file !== null && file.size > SIZE_WARNING_MB * 1024 * 1024;

  // ── Operation badges ──────────────────────────────────────────

  const compressBadge = ops?.compress.enabled
    ? ops.compress.mode === "crf"
      ? `CRF ${ops.compress.crf}`
      : `${ops.compress.targetSizeMB} MB`
    : undefined;

  const trimBadge = ops?.trim.enabled ? "Active" : undefined;

  const resizeBadge = ops?.resize.enabled
    ? ops.resize.preset === "custom"
      ? `${ops.resize.width}×${ops.resize.height}`
      : ops.resize.preset
    : undefined;

  const convertBadge = ops?.convert.enabled
    ? ops.convert.format.toUpperCase()
    : undefined;

  const audioBadge = ops?.audio.enabled
    ? ops.audio.action === "remove"
      ? "Remove"
      : `Extract ${ops.audio.extractFormat.toUpperCase()}`
    : undefined;

  const rotateBadge = ops?.rotate.enabled
    ? [
        ops.rotate.rotation > 0 && `${ops.rotate.rotation}°`,
        ops.rotate.flipH && "H-Flip",
        ops.rotate.flipV && "V-Flip",
      ]
        .filter(Boolean)
        .join(", ") || undefined
    : undefined;

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <Toolbar.Root className="flex items-center gap-tb px-tb-x py-tb-y border-b border-border bg-bg-surface">
        <>
          <Toolbar.Button
            disabled={!file || !anyEnabled || isProcessing}
            render={(props) => (
              <Button
                {...props}
                variant="primary"
                onClick={process}
                className="gap-1"
              >
                <Play size={11} />
                Process
              </Button>
            )}
          />

          <Toolbar.Separator className="w-px h-5 bg-border-muted mx-1" />
        </>

        <Toolbar.Group className="ml-auto flex items-center gap-tb">
          {file && meta && (
            <Toolbar.Button
              disabled={isProcessing}
              render={(props) => (
                <Button
                  {...props}
                  variant="ghost"
                  onClick={() => setOps(defaultOperations(meta))}
                  className="gap-1"
                >
                  <RotateCcw size={11} />
                  Reset
                </Button>
              )}
            />
          )}
          {file && (
            <Toolbar.Button
              disabled={isProcessing}
              render={(props) => (
                <Button
                  {...props}
                  variant="ghost"
                  onClick={reset}
                  className="gap-1"
                >
                  <Trash2 size={11} />
                  Clear
                </Button>
              )}
            />
          )}
        </Toolbar.Group>
      </Toolbar.Root>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-6 flex flex-col gap-4">
          {/* Upload zone or video preview */}
          {!file ? (
            <UploadZone onFile={handleFile} />
          ) : (
            <>
              {/* Size warning */}
              {showSizeWarning && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-danger/20 bg-danger/5 text-xs text-danger">
                  <AlertTriangle size={13} />
                  Large file ({formatBytes(file.size)}). Processing may be slow
                  or run out of memory in the browser.
                </div>
              )}

              {/* Video preview */}
              {videoUrl && (
                <VideoPreview
                  key={videoUrl}
                  url={videoUrl}
                  type={file.type}
                  name={file.name}
                />
              )}

              {/* File info */}
              {meta && <FileInfo meta={meta} />}

              {/* Quick presets */}
              {meta && <QuickPresets meta={meta} onApply={setOps} />}

              {/* Operations */}
              {ops && (
                <CollapsibleGroup>
                  <Collapsible
                    value="compress"
                    title="Compress"
                    icon={<Shrink size={13} className="text-text-muted" />}
                    badge={compressBadge}
                  >
                    <p className="text-[0.625rem] text-text-muted leading-relaxed -mt-1 mb-2">
                      Reduce file size by re-encoding. Lower CRF = better
                      quality but larger file. Use "Target File Size" to aim for
                      a specific size. MP4 (H.264) is the most compatible
                      format.
                    </p>
                    <label className="flex items-center gap-1.5 text-xs text-text cursor-pointer mb-1">
                      <input
                        type="checkbox"
                        checked={ops.compress.enabled}
                        onChange={(e) =>
                          setOps({
                            ...ops,
                            compress: {
                              ...ops.compress,
                              enabled: e.target.checked,
                            },
                          })
                        }
                        className="accent-primary"
                      />
                      Enable compression
                    </label>
                    {ops.compress.enabled && (
                      <CompressPanel
                        config={ops.compress}
                        onChange={(compress) => setOps({ ...ops, compress })}
                      />
                    )}
                  </Collapsible>

                  <Collapsible
                    value="trim"
                    title="Trim / Cut"
                    icon={<Scissors size={13} className="text-text-muted" />}
                    badge={trimBadge}
                  >
                    <p className="text-[0.625rem] text-text-muted leading-relaxed -mt-1 mb-2">
                      Cut out a portion of the video by setting a start and end
                      time. Enter time as m:ss.ms (e.g. 1:30.00) or raw seconds
                      (e.g. 90).
                    </p>
                    <label className="flex items-center gap-1.5 text-xs text-text cursor-pointer mb-1">
                      <input
                        type="checkbox"
                        checked={ops.trim.enabled}
                        onChange={(e) =>
                          setOps({
                            ...ops,
                            trim: { ...ops.trim, enabled: e.target.checked },
                          })
                        }
                        className="accent-primary"
                      />
                      Enable trimming
                    </label>
                    {ops.trim.enabled && meta && (
                      <TrimPanel
                        config={ops.trim}
                        duration={meta.duration}
                        onChange={(trim) => setOps({ ...ops, trim })}
                      />
                    )}
                  </Collapsible>

                  <Collapsible
                    value="resize"
                    title="Resize / Scale"
                    icon={<Maximize size={13} className="text-text-muted" />}
                    badge={resizeBadge}
                  >
                    <p className="text-[0.625rem] text-text-muted leading-relaxed -mt-1 mb-2">
                      Change the video resolution. Smaller resolution = smaller
                      file size. When the target aspect ratio differs from the
                      source, choose Pad (black bars) or Crop (cut edges to fill
                      the frame).
                    </p>
                    <label className="flex items-center gap-1.5 text-xs text-text cursor-pointer mb-1">
                      <input
                        type="checkbox"
                        checked={ops.resize.enabled}
                        onChange={(e) =>
                          setOps({
                            ...ops,
                            resize: {
                              ...ops.resize,
                              enabled: e.target.checked,
                            },
                          })
                        }
                        className="accent-primary"
                      />
                      Enable resize
                    </label>
                    {ops.resize.enabled && meta && (
                      <ResizePanel
                        config={ops.resize}
                        meta={meta}
                        onChange={(resize) => setOps({ ...ops, resize })}
                      />
                    )}
                  </Collapsible>

                  <Collapsible
                    value="convert"
                    title="Convert Format"
                    icon={
                      <ArrowRightLeft size={13} className="text-text-muted" />
                    }
                    badge={convertBadge}
                  >
                    <p className="text-[0.625rem] text-text-muted leading-relaxed -mt-1 mb-2">
                      Change the video container format. MP4 works everywhere.
                      WebM is great for the web. You can also extract just the
                      audio as MP3, AAC, WAV, or OGG.
                    </p>
                    <label className="flex items-center gap-1.5 text-xs text-text cursor-pointer mb-1">
                      <input
                        type="checkbox"
                        checked={ops.convert.enabled}
                        onChange={(e) =>
                          setOps({
                            ...ops,
                            convert: {
                              ...ops.convert,
                              enabled: e.target.checked,
                            },
                          })
                        }
                        className="accent-primary"
                      />
                      Enable format conversion
                    </label>
                    {ops.convert.enabled && (
                      <ConvertPanel
                        config={ops.convert}
                        onChange={(convert) => setOps({ ...ops, convert })}
                      />
                    )}
                  </Collapsible>

                  <Collapsible
                    value="audio"
                    title="Audio"
                    icon={<Volume2 size={13} className="text-text-muted" />}
                    badge={audioBadge}
                  >
                    <p className="text-[0.625rem] text-text-muted leading-relaxed -mt-1 mb-2">
                      Remove the audio track to create a silent video, or
                      extract just the audio as a separate file (MP3, AAC, WAV,
                      or OGG).
                    </p>
                    <label className="flex items-center gap-1.5 text-xs text-text cursor-pointer mb-1">
                      <input
                        type="checkbox"
                        checked={ops.audio.enabled}
                        onChange={(e) =>
                          setOps({
                            ...ops,
                            audio: { ...ops.audio, enabled: e.target.checked },
                          })
                        }
                        className="accent-primary"
                      />
                      Enable audio processing
                    </label>
                    {ops.audio.enabled && (
                      <AudioPanel
                        config={ops.audio}
                        onChange={(audio) => setOps({ ...ops, audio })}
                      />
                    )}
                  </Collapsible>

                  <Collapsible
                    value="rotate"
                    title="Rotate / Flip"
                    icon={<RotateCw size={13} className="text-text-muted" />}
                    badge={rotateBadge}
                  >
                    <p className="text-[0.625rem] text-text-muted leading-relaxed -mt-1 mb-2">
                      Rotate the video by 90°, 180°, or 270°. You can also
                      mirror it horizontally or vertically. Useful for fixing
                      sideways recordings.
                    </p>
                    <label className="flex items-center gap-1.5 text-xs text-text cursor-pointer mb-1">
                      <input
                        type="checkbox"
                        checked={ops.rotate.enabled}
                        onChange={(e) =>
                          setOps({
                            ...ops,
                            rotate: {
                              ...ops.rotate,
                              enabled: e.target.checked,
                            },
                          })
                        }
                        className="accent-primary"
                      />
                      Enable rotation / flip
                    </label>
                    {ops.rotate.enabled && (
                      <RotatePanel
                        config={ops.rotate}
                        onChange={(rotate) => setOps({ ...ops, rotate })}
                      />
                    )}
                  </Collapsible>
                </CollapsibleGroup>
              )}

              {/* Progress */}
              <ProgressBar state={state} onCancel={cancel} />

              {/* Output */}
              {state.status === "done" && meta && (
                <OutputSection
                  outputUrl={state.outputUrl}
                  outputName={state.outputName}
                  outputSize={state.outputSize}
                  inputMeta={meta}
                  onReset={() => setState({ status: "idle" })}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
