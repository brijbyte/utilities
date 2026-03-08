import { useState, useCallback, useRef, useEffect } from "react";
import { UploadZone } from "./components/UploadZone";
import { VideoPreview } from "./components/VideoPreview";
import { FileInfo } from "./components/FileInfo";
import { QuickPresets } from "./components/QuickPresets";
import { EditorToolbar } from "./components/EditorToolbar";
import { ActiveOpsSummary } from "./components/ActiveOpsSummary";
import { OperationsPanel } from "./components/OperationsPanel";
import { ProgressBar } from "./components/ProgressBar";
import { OutputSection } from "./components/OutputSection";
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

  // ── Derived state ─────────────────────────────────────────────

  const isProcessing =
    state.status === "loading-ffmpeg" || state.status === "processing";
  const anyEnabled = ops ? Object.values(ops).some((o) => o.enabled) : false;

  // ── Effects ───────────────────────────────────────────────────

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortCtrlRef.current?.abort();
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
      fileBufferRef.current = null;
      terminate();
    };
  }, [videoUrl]);

  // Block page reload while processing
  useEffect(() => {
    if (!isProcessing) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isProcessing]);

  // Auto-scroll to progress when processing starts
  useEffect(() => {
    if (isProcessing) {
      progressRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [state.status === "loading-ffmpeg"]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to output when done
  useEffect(() => {
    if (state.status === "done") {
      requestAnimationFrame(() => {
        outputRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  }, [state.status === "done"]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Callbacks ─────────────────────────────────────────────────

  const handleFile = useCallback(
    (f: File, buffer: ArrayBuffer | null) => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (outputUrlRef.current) {
        URL.revokeObjectURL(outputUrlRef.current);
        outputUrlRef.current = null;
      }
      fileBufferRef.current = buffer;

      setVideoUrl(URL.createObjectURL(f));
      setFile(f);
      setState({ status: "idle" });

      // Probe metadata — falls back to defaults for unsupported formats
      const probeUrl = URL.createObjectURL(f);
      const video = document.createElement("video");
      video.preload = "metadata";

      const apply = (duration: number, width: number, height: number) => {
        const m: VideoMeta = {
          duration,
          width,
          height,
          size: f.size,
          type: f.type || "video/x-matroska",
          name: f.name,
        };
        setMeta(m);
        setOps(defaultOperations(m));
        URL.revokeObjectURL(probeUrl);
      };

      video.onloadedmetadata = () =>
        apply(video.duration, video.videoWidth, video.videoHeight);
      video.onerror = () => apply(0, 1920, 1080);
      video.src = probeUrl;
    },
    [videoUrl],
  );

  const handleProcess = useCallback(async () => {
    if (!file || !meta || !ops || !anyEnabled) return;

    abortCtrlRef.current?.abort();
    const ctrl = new AbortController();
    abortCtrlRef.current = ctrl;

    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = null;
    }

    try {
      // Resolve input: buffer, lazy read, or File (>2GB WORKERFS)
      let input: ArrayBuffer | File;
      const buf = fileBufferRef.current;

      if (buf) {
        input = buf;
      } else if (file.size > 2 * 1024 * 1024 * 1024) {
        input = file;
      } else {
        setState({
          status: "processing",
          progress: 0,
          message: "Reading file...",
          logs: [],
        });
        try {
          const read = await file.arrayBuffer();
          fileBufferRef.current = read;
          input = read;
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
  }, [file, meta, ops, anyEnabled]);

  const handleCancel = useCallback(() => {
    abortCtrlRef.current?.abort();
    setState({ status: "idle" });
  }, []);

  const handleClear = useCallback(() => {
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

  const handlePresetApply = useCallback((newOps: Operations) => {
    setOps(newOps);
    requestAnimationFrame(() => {
      opsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col">
      <EditorToolbar
        hasFile={!!file}
        hasMeta={!!meta}
        anyEnabled={anyEnabled}
        isProcessing={isProcessing}
        onProcess={handleProcess}
        onResetOps={() => meta && setOps(defaultOperations(meta))}
        onClear={handleClear}
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 flex flex-col gap-4">
          {!file ? (
            <UploadZone onFile={handleFile} />
          ) : (
            <>
              {/* Preview + info + presets */}
              <div className="flex flex-col sm:flex-row gap-4">
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
                <div className="flex flex-col gap-3 sm:w-64 sm:shrink-0">
                  {meta && <FileInfo meta={meta} />}
                  {meta && (
                    <QuickPresets meta={meta} onApply={handlePresetApply} />
                  )}
                </div>
              </div>

              {/* Active ops summary */}
              {ops && <ActiveOpsSummary ops={ops} />}

              {/* Progress */}
              <div ref={progressRef}>
                <ProgressBar state={state} onCancel={handleCancel} />
              </div>

              {/* Output */}
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

              {/* Operations */}
              {ops && meta && (
                <div ref={opsRef}>
                  <OperationsPanel ops={ops} meta={meta} onChange={setOps} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
