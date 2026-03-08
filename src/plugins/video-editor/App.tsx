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
import { defaultOperations } from "./utils/types";
import { processVideo, terminate } from "./utils/process";

// ═══════════════════════════════════════════════════════════════════

export default function VideoEditor() {
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<VideoMeta | null>(null);
  const [ops, setOps] = useState<Operations | null>(null);
  const [state, setState] = useState<ProcessingState>({ status: "idle" });
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const abortCtrlRef = useRef<AbortController | null>(null);
  const outputUrlRef = useRef<string | null>(null);
  const fileBufferRef = useRef<ArrayBuffer | null>(null);

  // Refs for scroll targets
  const progressRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const opsRef = useRef<HTMLDivElement>(null);

  // Cleanup on unmount: abort any processing, revoke URLs, terminate FFmpeg
  useEffect(() => {
    return () => {
      abortCtrlRef.current?.abort();
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
      fileBufferRef.current = null;
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

  // Auto-scroll to progress when processing starts
  useEffect(() => {
    if (state.status === "loading-ffmpeg" || state.status === "processing") {
      progressRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [state.status === "loading-ffmpeg"]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to output when done
  useEffect(() => {
    if (state.status === "done") {
      // Small delay so the DOM has rendered the output section
      requestAnimationFrame(() => {
        outputRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  }, [state.status === "done"]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handle file upload ────────────────────────────────────────

  const handleFile = useCallback(
    (f: File, buffer: ArrayBuffer | null) => {
      // Revoke previous URLs
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (outputUrlRef.current) {
        URL.revokeObjectURL(outputUrlRef.current);
        outputUrlRef.current = null;
      }

      // Store pre-read buffer if provided (drag-and-drop).
      // For file picker files, buffer is null — we read lazily at process time
      // since file picker File references stay valid.
      fileBufferRef.current = buffer;

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
      // Determine input: pre-read buffer, lazy read, or File for WORKERFS
      let input: ArrayBuffer | File;
      const buffer = fileBufferRef.current;

      if (buffer) {
        // Drag-and-drop: already read into buffer
        input = buffer;
      } else if (file.size > 2 * 1024 * 1024 * 1024) {
        // >2GB: pass File directly — worker will use WORKERFS mount
        // (FFmpeg reads on demand, no full copy into memory)
        input = file;
      } else {
        // File picker, ≤2GB: read now (File ref is stable for picker files)
        setState({
          status: "processing",
          progress: 0,
          message: "Reading file...",
          logs: [],
        });
        try {
          const buf = await file.arrayBuffer();
          fileBufferRef.current = buf;
          input = buf;
        } catch {
          setState({
            status: "error",
            error:
              "Could not read the file. Please re-select it and try again.",
          });
          return;
        }
      }

      const result = await processVideo(
        input,
        file.name,
        meta,
        ops,
        setState,
        ctrl.signal,
      );

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
    fileBufferRef.current = null;
    setFile(null);
    setMeta(null);
    setOps(null);
    setVideoUrl(null);
    setState({ status: "idle" });
  }, [videoUrl]);

  // ── Preset applied — scroll to ops ────────────────────────────

  const handlePresetApply = useCallback((newOps: Operations) => {
    setOps(newOps);
    requestAnimationFrame(() => {
      opsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  // ── Derived state ─────────────────────────────────────────────

  const anyEnabled = ops ? Object.values(ops).some((o) => o.enabled) : false;

  // ── Active operations summary (for compact mobile display) ────

  const activeOps = ops
    ? [
        ops.compress.enabled && "Compress",
        ops.trim.enabled && "Trim",
        ops.resize.enabled && "Resize",
        ops.convert.enabled && "Convert",
        ops.audio.enabled &&
          (ops.audio.action === "remove" ? "Mute" : "Extract Audio"),
        ops.rotate.enabled && "Rotate",
      ].filter(Boolean)
    : [];

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
        <div className="max-w-5xl mx-auto p-4 sm:p-6 flex flex-col gap-4">
          {/* Upload zone or video preview */}
          {!file ? (
            <UploadZone onFile={handleFile} />
          ) : (
            <>
              {/* Two-column on desktop: preview left, info + presets right */}
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Video preview — compact on mobile */}
                {videoUrl && (
                  <div className="sm:flex-1 sm:min-w-0">
                    <VideoPreview
                      key={videoUrl}
                      url={videoUrl}
                      type={file.type}
                      name={file.name}
                    />
                  </div>
                )}

                {/* File info + quick presets — stacked beside preview on desktop */}
                <div className="flex flex-col gap-3 sm:w-64 sm:shrink-0">
                  {meta && <FileInfo meta={meta} />}
                  {meta && (
                    <QuickPresets meta={meta} onApply={handlePresetApply} />
                  )}
                </div>
              </div>

              {/* Active operations summary — visible confirmation of what's enabled */}
              {activeOps.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-text-muted uppercase tracking-wider">
                    Active:
                  </span>
                  {activeOps.map((op) => (
                    <span
                      key={op as string}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                    >
                      {op}
                    </span>
                  ))}
                </div>
              )}

              {/* Progress — above operations so it's visible immediately */}
              <div ref={progressRef}>
                <ProgressBar state={state} onCancel={cancel} />
              </div>

              {/* Output — above operations when done */}
              {state.status === "done" && meta && (
                <div ref={outputRef}>
                  <OutputSection
                    outputUrl={state.outputUrl}
                    outputName={state.outputName}
                    outputSize={state.outputSize}
                    inputMeta={meta}
                    onReset={() => setState({ status: "idle" })}
                  />
                </div>
              )}

              {/* Operations — further down, collapsed by default */}
              {ops && (
                <div ref={opsRef}>
                  <CollapsibleGroup>
                    <Collapsible
                      value="compress"
                      title="Compress"
                      icon={<Shrink size={13} className="text-text-muted" />}
                      badge={compressBadge}
                    >
                      <p className="text-[10px] text-text-muted leading-relaxed -mt-1 mb-2">
                        Reduce file size by re-encoding. Lower CRF = better
                        quality but larger file. Use "Target File Size" to aim
                        for a specific size. MP4 (H.264) is the most compatible
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
                      <p className="text-[10px] text-text-muted leading-relaxed -mt-1 mb-2">
                        Cut out a portion of the video by setting a start and
                        end time. Enter time as m:ss.ms (e.g. 1:30.00) or raw
                        seconds (e.g. 90).
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
                      <p className="text-[10px] text-text-muted leading-relaxed -mt-1 mb-2">
                        Change the video resolution. Smaller resolution =
                        smaller file size. When the target aspect ratio differs
                        from the source, choose Pad (black bars) or Crop (cut
                        edges to fill the frame).
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
                      <p className="text-[10px] text-text-muted leading-relaxed -mt-1 mb-2">
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
                      <p className="text-[10px] text-text-muted leading-relaxed -mt-1 mb-2">
                        Remove the audio track to create a silent video, or
                        extract just the audio as a separate file (MP3, AAC,
                        WAV, or OGG).
                      </p>
                      <label className="flex items-center gap-1.5 text-xs text-text cursor-pointer mb-1">
                        <input
                          type="checkbox"
                          checked={ops.audio.enabled}
                          onChange={(e) =>
                            setOps({
                              ...ops,
                              audio: {
                                ...ops.audio,
                                enabled: e.target.checked,
                              },
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
                      <p className="text-[10px] text-text-muted leading-relaxed -mt-1 mb-2">
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
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
