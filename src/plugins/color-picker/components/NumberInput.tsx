import { useState, useCallback, useRef, useId } from "react";
import { Slider } from "@base-ui/react/slider";

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  decimals?: number;
  suffix?: string;
  onChange: (v: number) => void;
  /** CSS linear-gradient for the slider track. When set, replaces the
   *  default muted track + primary indicator with a custom gradient. */
  trackBackground?: string;
}

/**
 * Compact number input with label and Base UI Slider.
 * Uses a ref to track editing state to avoid setState-in-effect.
 */
export function NumberInput({
  label,
  value,
  min,
  max,
  step = 1,
  decimals = 0,
  suffix = "",
  onChange,
  trackBackground,
}: Props) {
  const labelId = useId();
  const [editText, setEditText] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue = editText ?? value.toFixed(decimals);

  const commit = useCallback(
    (raw: string) => {
      const n = parseFloat(raw);
      if (!isNaN(n)) {
        onChange(Math.max(min, Math.min(max, n)));
      }
      setEditText(null);
    },
    [min, max, onChange],
  );

  const hasCustomTrack = !!trackBackground;

  return (
    <div className="flex items-center gap-2">
      <label
        id={labelId}
        className="text-xs font-medium text-text-muted w-6 shrink-0 text-right uppercase cursor-pointer"
      >
        {label}
      </label>
      <Slider.Root
        value={value}
        onValueChange={onChange}
        min={min}
        max={max}
        step={step}
        aria-labelledby={labelId}
        className="flex-1"
      >
        <Slider.Control className="flex items-center h-4 w-full cursor-pointer touch-none">
          {hasCustomTrack ? (
            <Slider.Track
              className="relative h-2 w-full rounded-full"
              style={{ background: trackBackground }}
            >
              <Slider.Thumb className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)] bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" />
            </Slider.Track>
          ) : (
            <Slider.Track className="relative h-1 w-full rounded-full bg-border-muted">
              <Slider.Indicator className="absolute h-full rounded-full bg-primary" />
              <Slider.Thumb className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-sm border-2 border-bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-shadow hover:shadow-md" />
            </Slider.Track>
          )}
        </Slider.Control>
      </Slider.Root>
      <div className="flex items-center gap-0.5">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={(e) => setEditText(e.target.value)}
          onFocus={() => setEditText(value.toFixed(decimals))}
          onBlur={() => commit(editText ?? value.toFixed(decimals))}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="w-14 px-1.5 py-0.5 text-xs text-right bg-bg-inset border border-border-muted rounded font-mono text-text outline-none focus:border-primary transition-colors"
        />
        {suffix && <span className="text-xs text-text-muted">{suffix}</span>}
      </div>
    </div>
  );
}
