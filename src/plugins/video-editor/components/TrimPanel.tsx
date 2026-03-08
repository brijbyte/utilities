import { useId } from "react";
import type { TrimConfig } from "../utils/types";
import { formatTime } from "../utils/types";

interface TrimPanelProps {
  config: TrimConfig;
  duration: number;
  onChange: (config: TrimConfig) => void;
}

function TimeInput({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const id = useId();

  // Parse h:mm:ss.ms, mm:ss.ms, or raw seconds
  function parseTime(str: string): number {
    const hms = str.match(/^(\d+):(\d+):(\d+(?:\.\d+)?)$/);
    if (hms) {
      return (
        parseInt(hms[1]) * 3600 + parseInt(hms[2]) * 60 + parseFloat(hms[3])
      );
    }
    const ms = str.match(/^(\d+):(\d+(?:\.\d+)?)$/);
    if (ms) {
      return parseInt(ms[1]) * 60 + parseFloat(ms[2]);
    }
    return parseFloat(str) || 0;
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const parsed = parseTime(e.target.value);
    onChange(Math.max(0, Math.min(max, parsed)));
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[0.625rem] text-text-muted">
        {label}
      </label>
      <input
        id={id}
        type="text"
        defaultValue={formatTime(value)}
        key={value} // re-render on external change
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        placeholder="0:00.00"
        className="w-28 bg-bg-surface border border-border text-sm text-text px-2 py-1 rounded font-mono tabular-nums focus:border-primary outline-none transition-colors"
      />
    </div>
  );
}

export function TrimPanel({ config, duration, onChange }: TrimPanelProps) {
  const trimmedDuration = config.end - config.start;
  const hasDuration = duration > 0;

  return (
    <div className="flex flex-col gap-3">
      {!hasDuration && (
        <p className="text-[0.625rem] text-warning leading-relaxed">
          Duration unknown — enter start and end times manually.
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <TimeInput
          label="Start Time"
          value={config.start}
          max={config.end || Infinity}
          onChange={(v) => onChange({ ...config, start: v })}
        />
        <TimeInput
          label="End Time"
          value={config.end}
          max={duration || Infinity}
          onChange={(v) => onChange({ ...config, end: v })}
        />
        {trimmedDuration > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-[0.625rem] text-text-muted">Duration</span>
            <span className="text-xs text-text font-mono tabular-nums px-2 py-1">
              {formatTime(Math.max(0, trimmedDuration))}
            </span>
          </div>
        )}
      </div>

      <p className="text-[0.625rem] text-text-muted leading-relaxed">
        Format: <span className="font-mono">m:ss</span>,{" "}
        <span className="font-mono">h:mm:ss</span>, or seconds. Examples:{" "}
        <span className="font-mono">1:30</span> = 1 min 30s,{" "}
        <span className="font-mono">1:02:15</span> = 1 hr 2 min 15s,{" "}
        <span className="font-mono">90.5</span> = 90.5s
      </p>

      {/* Visual timeline bar — only show when duration is known */}
      {hasDuration && (
        <div className="flex flex-col gap-1">
          <div className="relative h-2 bg-border-muted rounded-full overflow-hidden">
            <div
              className="absolute h-full bg-primary/30 rounded-full"
              style={{
                left: `${(config.start / duration) * 100}%`,
                width: `${(trimmedDuration / duration) * 100}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-[0.625rem] text-text-muted">
            <span>{formatTime(0)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
