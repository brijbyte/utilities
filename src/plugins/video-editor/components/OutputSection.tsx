import { Download, RotateCcw } from "lucide-react";
import { Button } from "../../../components/Button";
import { formatBytes } from "../utils/types";
import type { VideoMeta } from "../utils/types";

interface OutputSectionProps {
  outputUrl: string;
  outputName: string;
  outputSize: number;
  inputMeta: VideoMeta;
  onReset: () => void;
}

export function OutputSection({
  outputUrl,
  outputName,
  outputSize,
  inputMeta,
  onReset,
}: OutputSectionProps) {
  const isVideo = /\.(mp4|webm|gif|avi|mov)$/i.test(outputName);
  const isAudio = /\.(mp3|aac|wav|ogg)$/i.test(outputName);
  const sizeDiff = outputSize - inputMeta.size;
  const pctChange =
    inputMeta.size > 0 ? Math.round((sizeDiff / inputMeta.size) * 100) : 0;

  return (
    <div className="flex flex-col gap-3 border border-border rounded-lg p-4 bg-bg-surface">
      <div className="flex items-center justify-between">
        <h3 className="text-xs text-text-muted uppercase tracking-wider">
          Output
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onReset} className="gap-1">
            <RotateCcw size={11} />
            Reset
          </Button>
          <a href={outputUrl} download={outputName}>
            <Button variant="primary" className="gap-1">
              <Download size={11} />
              Download
            </Button>
          </a>
        </div>
      </div>

      {/* Before/After comparison */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-bg-inset">
          <span className="text-[0.625rem] text-text-muted">Input Size</span>
          <span className="font-medium text-text">
            {formatBytes(inputMeta.size)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-bg-inset">
          <span className="text-[0.625rem] text-text-muted">Output Size</span>
          <span className="font-medium text-text">
            {formatBytes(outputSize)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-bg-inset">
          <span className="text-[0.625rem] text-text-muted">Change</span>
          <span
            className={`font-medium ${sizeDiff < 0 ? "text-success" : sizeDiff > 0 ? "text-danger" : "text-text"}`}
          >
            {sizeDiff < 0 ? "" : "+"}
            {pctChange}%
          </span>
        </div>
      </div>

      {/* Preview */}
      {isVideo && (
        <video
          src={outputUrl}
          controls
          className="w-full max-h-64 rounded-lg bg-black"
        />
      )}
      {isAudio && <audio src={outputUrl} controls className="w-full" />}

      <span className="text-[0.625rem] text-text-muted truncate">
        {outputName}
      </span>
    </div>
  );
}
