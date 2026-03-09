import { Button } from "../../../components/Button";
import type { ResizeConfig, ResizePreset } from "../utils/types";
import { computeOutputDimensions } from "../utils/resize";

interface ResizePanelProps {
  config: ResizeConfig;
  srcWidth: number;
  srcHeight: number;
  onChange: (config: ResizeConfig) => void;
}

const PRESETS: { value: ResizePreset; label: string }[] = [
  { value: "1080", label: "1080p" },
  { value: "720", label: "720p" },
  { value: "480", label: "480p" },
  { value: "custom", label: "Custom" },
];

export function ResizePanel({
  config,
  srcWidth,
  srcHeight,
  onChange,
}: ResizePanelProps) {
  const out = computeOutputDimensions(srcWidth, srcHeight, config);

  return (
    <div className="flex flex-col gap-3">
      {/* Presets */}
      <div className="flex items-center gap-1.5">
        {PRESETS.map((p) => (
          <Button
            key={p.value}
            variant="outline"
            active={config.preset === p.value}
            className="text-[0.625rem] px-2 py-1"
            onClick={() => {
              const next = { ...config, preset: p.value };
              if (p.value !== "custom") {
                const dim = parseInt(p.value, 10);
                next.width = dim;
                next.height = dim;
              }
              onChange(next);
            }}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Custom dimensions */}
      {config.preset === "custom" && (
        <div className="flex items-center gap-2">
          <label className="flex flex-col gap-0.5">
            <span className="text-[0.5625rem] text-text-muted">Width</span>
            <input
              type="number"
              min={2}
              max={10000}
              value={config.width}
              onChange={(e) =>
                onChange({
                  ...config,
                  width: parseInt(e.target.value, 10) || 2,
                })
              }
              className="w-20 px-2 py-1 text-xs rounded border border-border bg-bg-surface text-text"
            />
          </label>
          <span className="text-text-muted mt-4">×</span>
          <label className="flex flex-col gap-0.5">
            <span className="text-[0.5625rem] text-text-muted">Height</span>
            <input
              type="number"
              min={2}
              max={10000}
              value={config.height}
              onChange={(e) =>
                onChange({
                  ...config,
                  height: parseInt(e.target.value, 10) || 2,
                })
              }
              className="w-20 px-2 py-1 text-xs rounded border border-border bg-bg-surface text-text"
            />
          </label>
        </div>
      )}

      {/* Maintain aspect ratio */}
      <label className="flex items-center gap-1.5 text-xs text-text cursor-pointer">
        <input
          type="checkbox"
          checked={config.maintainAspect}
          onChange={(e) =>
            onChange({ ...config, maintainAspect: e.target.checked })
          }
          className="accent-primary"
        />
        Maintain aspect ratio
      </label>

      {/* Output preview */}
      <div className="text-[0.5625rem] text-text-muted">
        Output: {out.width}×{out.height}
        {" · "}
        {Math.round((out.width * out.height) / 10000) / 100} MP
      </div>
    </div>
  );
}
