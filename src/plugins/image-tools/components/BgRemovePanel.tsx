import { Button } from "../../../components/Button";
import type { BgRemoveConfig, BgFill } from "../utils/bg-remove";

interface BgRemovePanelProps {
  config: BgRemoveConfig;
  onChange: (config: BgRemoveConfig) => void;
}

const FILL_PRESETS: { label: string; fill: BgFill }[] = [
  { label: "Transparent", fill: { type: "transparent" } },
  { label: "White", fill: { type: "color", color: "#ffffff" } },
  { label: "Black", fill: { type: "color", color: "#000000" } },
  { label: "Blue", fill: { type: "color", color: "#0066ff" } },
  { label: "Green", fill: { type: "color", color: "#00cc44" } },
];

function fillsEqual(a: BgFill, b: BgFill): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "transparent") return true;
  return (a as { color: string }).color === (b as { color: string }).color;
}

export function BgRemovePanel({ config, onChange }: BgRemovePanelProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Background fill */}
      <div>
        <div className="text-[0.5625rem] text-text-muted mb-1">
          Background Fill
        </div>
        <div className="flex flex-wrap gap-1">
          {FILL_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              active={fillsEqual(config.fill, preset.fill)}
              className="text-[0.625rem] px-2 py-1 gap-1.5"
              onClick={() => onChange({ ...config, fill: preset.fill })}
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm border border-border-muted shrink-0"
                style={{
                  backgroundColor:
                    preset.fill.type === "color"
                      ? preset.fill.color
                      : undefined,
                  backgroundImage:
                    preset.fill.type === "transparent"
                      ? "repeating-conic-gradient(#ccc 0% 25%, transparent 0% 50%)"
                      : undefined,
                  backgroundSize:
                    preset.fill.type === "transparent" ? "6px 6px" : undefined,
                }}
              />
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Custom color */}
      <label className="flex items-center gap-2">
        <span className="text-xs text-text">Custom color</span>
        <input
          type="color"
          value={config.fill.type === "color" ? config.fill.color : "#ffffff"}
          onChange={(e) =>
            onChange({
              ...config,
              fill: { type: "color", color: e.target.value },
            })
          }
          className="w-6 h-6 rounded border border-border-muted cursor-pointer"
        />
      </label>

      {/* Threshold */}
      <label className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text">Threshold</span>
          <span className="text-xs text-text-muted">
            {Math.round(config.threshold * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0.1}
          max={0.9}
          step={0.05}
          value={config.threshold}
          onChange={(e) =>
            onChange({ ...config, threshold: parseFloat(e.target.value) })
          }
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[0.5rem] text-text-muted">
          <span>More background</span>
          <span>More foreground</span>
        </div>
      </label>

      {/* Edge softness */}
      <label className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text">Edge Softness</span>
          <span className="text-xs text-text-muted">
            {Math.round(config.edgeSoftness * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={0.2}
          step={0.01}
          value={config.edgeSoftness}
          onChange={(e) =>
            onChange({ ...config, edgeSoftness: parseFloat(e.target.value) })
          }
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[0.5rem] text-text-muted">
          <span>Hard edge</span>
          <span>Feathered</span>
        </div>
      </label>
    </div>
  );
}
