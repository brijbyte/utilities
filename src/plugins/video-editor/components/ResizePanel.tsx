import { useId } from "react";
import { Select } from "../../../components/Select";
import { Button } from "../../../components/Button";
import type { ResizeConfig, ResizeFit, VideoMeta } from "../utils/types";
import { RESOLUTION_PRESETS, clampToSource } from "../utils/types";

interface ResizePanelProps {
  config: ResizeConfig;
  meta: VideoMeta;
  onChange: (config: ResizeConfig) => void;
}

const PRESET_OPTIONS = [
  { value: "original", label: `Original` },
  ...Object.entries(RESOLUTION_PRESETS).map(([key, p]) => ({
    value: key,
    label: p.label,
  })),
  { value: "custom", label: "Custom" },
];

const FIT_OPTIONS: { value: ResizeFit; label: string; description: string }[] =
  [
    { value: "pad", label: "Pad", description: "Black bars, no content lost" },
    { value: "crop", label: "Crop", description: "Fill frame, edges cut off" },
    { value: "stretch", label: "Stretch", description: "Distort to fill" },
  ];

export function ResizePanel({ config, meta, onChange }: ResizePanelProps) {
  const widthId = useId();
  const heightId = useId();

  // Determine effective (clamped) target dimensions
  let targetW = config.width;
  let targetH = config.height;
  if (config.preset !== "original" && config.preset !== "custom") {
    const p = RESOLUTION_PRESETS[config.preset];
    const clamped = clampToSource(p.width, p.height, meta.width, meta.height);
    targetW = clamped.width;
    targetH = clamped.height;
  } else if (config.preset === "custom") {
    const clamped = clampToSource(
      config.width,
      config.height,
      meta.width,
      meta.height,
    );
    targetW = clamped.width;
    targetH = clamped.height;
  }

  // Check if target aspect ratio differs from source
  const sourceRatio = meta.width / meta.height;
  const targetRatio = targetW / targetH;
  const ratioMismatch =
    config.preset !== "original" && Math.abs(sourceRatio - targetRatio) > 0.05;

  // Check if clamping changed the dimensions
  const wasClamped =
    config.preset !== "original" &&
    config.preset !== "custom" &&
    (() => {
      const p = RESOLUTION_PRESETS[config.preset];
      return targetW !== p.width || targetH !== p.height;
    })();

  const handlePreset = (preset: string) => {
    if (preset === "original") {
      onChange({
        ...config,
        preset: "original",
        width: meta.width,
        height: meta.height,
      });
    } else if (preset === "custom") {
      onChange({ ...config, preset: "custom" });
    } else {
      const p = RESOLUTION_PRESETS[preset];
      const clamped = clampToSource(p.width, p.height, meta.width, meta.height);
      onChange({
        ...config,
        preset: preset as ResizeConfig["preset"],
        width: clamped.width,
        height: clamped.height,
      });
    }
  };

  const handleWidth = (w: number) => {
    if (config.maintainAspect && meta.width > 0) {
      const ratio = meta.height / meta.width;
      onChange({ ...config, width: w, height: Math.round(w * ratio) });
    } else {
      onChange({ ...config, width: w });
    }
  };

  const handleHeight = (h: number) => {
    if (config.maintainAspect && meta.height > 0) {
      const ratio = meta.width / meta.height;
      onChange({ ...config, height: h, width: Math.round(h * ratio) });
    } else {
      onChange({ ...config, height: h });
    }
  };

  const handleFit = (fit: ResizeFit) => {
    onChange({
      ...config,
      fit,
      // "stretch" means no aspect ratio preservation
      maintainAspect: fit !== "stretch",
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-text-muted">Preset</span>
          <Select
            value={config.preset}
            onValueChange={handlePreset}
            options={PRESET_OPTIONS}
            align="start"
            popupMinWidth="min-w-52"
          />
        </div>

        <label className="flex items-center gap-1.5 text-xs text-text cursor-pointer">
          <input
            type="checkbox"
            checked={config.maintainAspect}
            onChange={(e) =>
              onChange({
                ...config,
                maintainAspect: e.target.checked,
                fit: e.target.checked ? config.fit : "stretch",
              })
            }
            className="accent-primary"
          />
          Keep aspect ratio
        </label>
      </div>

      {config.preset === "custom" && (
        <div className="flex flex-col gap-2">
          <div className="flex items-end gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor={widthId} className="text-[10px] text-text-muted">
                Width
              </label>
              <input
                id={widthId}
                type="number"
                min={2}
                max={meta.width}
                step={2}
                value={config.width}
                onChange={(e) => handleWidth(Number(e.target.value) || 2)}
                className="w-24 bg-bg-surface border border-border text-sm text-text px-2 py-1 rounded font-mono tabular-nums focus:border-primary outline-none transition-colors"
              />
            </div>
            <span className="text-text-muted text-xs pb-1">×</span>
            <div className="flex flex-col gap-1">
              <label htmlFor={heightId} className="text-[10px] text-text-muted">
                Height
              </label>
              <input
                id={heightId}
                type="number"
                min={2}
                max={meta.height}
                step={2}
                value={config.height}
                onChange={(e) => handleHeight(Number(e.target.value) || 2)}
                className="w-24 bg-bg-surface border border-border text-sm text-text px-2 py-1 rounded font-mono tabular-nums focus:border-primary outline-none transition-colors"
              />
            </div>
          </div>
          {(config.width > meta.width || config.height > meta.height) && (
            <span className="text-[10px] text-warning">
              Clamped to {targetW}×{targetH} — upscaling beyond source
              resolution ({meta.width}×{meta.height}) is avoided.
            </span>
          )}
        </div>
      )}

      {/* Fit mode — shown when target aspect ratio differs from source */}
      {ratioMismatch && config.maintainAspect && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] text-text-muted">
            Aspect ratio mismatch — how to fit?
          </span>
          <div className="flex gap-1.5">
            {FIT_OPTIONS.filter((o) => o.value !== "stretch").map((opt) => (
              <Button
                key={opt.value}
                variant="outline"
                active={config.fit === opt.value}
                onClick={() => handleFit(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          <span className="text-[10px] text-text-muted">
            {FIT_OPTIONS.find((o) => o.value === config.fit)?.description}
          </span>
        </div>
      )}

      {config.preset !== "original" && (
        <span className="text-[10px] text-text-muted">
          Output: {targetW}×{targetH}
          {wasClamped && (
            <>
              {" "}
              <span className="text-warning">
                (clamped from {RESOLUTION_PRESETS[config.preset]?.width}×
                {RESOLUTION_PRESETS[config.preset]?.height} to avoid upscaling)
              </span>
            </>
          )}
          {config.preset !== "custom" &&
            !wasClamped &&
            (config.maintainAspect
              ? config.fit === "crop"
                ? " (cropped to fill)"
                : " (padded to fit)"
              : " (stretched)")}
        </span>
      )}
    </div>
  );
}
