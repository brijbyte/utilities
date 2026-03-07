import { Progress } from "@base-ui/react/progress";
import { X } from "lucide-react";
import { Button } from "../../../components/Button";
import type { ProcessingState } from "../utils/types";

interface ProgressBarProps {
  state: ProcessingState;
  onCancel: () => void;
}

export function ProgressBar({ state, onCancel }: ProgressBarProps) {
  if (state.status === "idle" || state.status === "done") return null;

  const isError = state.status === "error";
  const isLoading = state.status === "loading-ffmpeg";
  const isProcessing = state.status === "processing";

  // null = indeterminate (loading), 0-100 = determinate (processing)
  const value = isProcessing ? Math.round(state.progress * 100) : null;
  const logs = isProcessing ? state.logs : [];

  return (
    <div
      className={`flex flex-col gap-2 px-3 py-2.5 rounded-lg border ${
        isError
          ? "bg-danger/5 border-danger/20"
          : "bg-bg-inset border-border-muted"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text">
              {isLoading && "Loading FFmpeg..."}
              {isProcessing && state.message}
              {isError && "Processing failed"}
            </span>
            {isProcessing && (
              <span className="text-[10px] text-text-muted tabular-nums font-mono">
                {value}%
              </span>
            )}
          </div>

          {(isLoading || isProcessing) && (
            <Progress.Root
              value={value}
              className="flex flex-col gap-0"
              aria-label="Video processing progress"
            >
              <Progress.Track className="relative h-1.5 w-full rounded-full bg-border-muted overflow-hidden">
                <Progress.Indicator className="h-full rounded-full bg-primary transition-[width] duration-300 data-[state=indeterminate]:w-1/3 data-[state=indeterminate]:animate-pulse" />
              </Progress.Track>
            </Progress.Root>
          )}

          {isError && (
            <span className="text-[10px] text-danger">{state.error}</span>
          )}
        </div>

        {!isError && (
          <Button variant="ghost" onClick={onCancel} className="shrink-0">
            <X size={13} />
          </Button>
        )}
      </div>

      {/* Recent FFmpeg log lines */}
      {logs.length > 0 && (
        <div className="flex flex-col gap-0.5 pt-1 border-t border-border-muted">
          {logs.map((line, i) => (
            <span
              key={i}
              className={`text-[10px] font-mono leading-tight truncate ${
                i === logs.length - 1 ? "text-text-muted" : "text-text-muted/50"
              }`}
            >
              {line}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
