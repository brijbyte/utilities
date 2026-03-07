import { Slider } from "@base-ui/react/slider";
import { Select } from "../../../components/Select";
import type { CompressConfig } from "../utils/types";

interface CompressPanelProps {
  config: CompressConfig;
  onChange: (config: CompressConfig) => void;
}

const FORMAT_OPTIONS = [
  { value: "mp4", label: "MP4 (H.264)" },
  { value: "webm", label: "WebM (VP9)" },
];

const MODE_OPTIONS = [
  { value: "crf", label: "Quality (CRF)" },
  { value: "target-size", label: "Target File Size" },
];

function getCrfLabel(crf: number): string {
  if (crf <= 18) return "High Quality";
  if (crf <= 23) return "Medium";
  if (crf <= 28) return "Low Quality";
  if (crf <= 35) return "Very Low";
  return "Minimum";
}

export function CompressPanel({ config, onChange }: CompressPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[0.625rem] text-text-muted">Format</span>
          <Select
            value={config.format}
            onValueChange={(v) =>
              onChange({ ...config, format: v as CompressConfig["format"] })
            }
            options={FORMAT_OPTIONS}
            align="start"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[0.625rem] text-text-muted">Mode</span>
          <Select
            value={config.mode}
            onValueChange={(v) =>
              onChange({ ...config, mode: v as CompressConfig["mode"] })
            }
            options={MODE_OPTIONS}
            align="start"
          />
        </div>
      </div>

      {config.mode === "crf" ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-text-muted">
              Quality (CRF): {config.crf}
            </span>
            <span className="text-[0.625rem] text-text-muted">
              {getCrfLabel(config.crf)}
            </span>
          </div>
          <Slider.Root
            value={config.crf}
            onValueChange={(v) => onChange({ ...config, crf: v })}
            min={0}
            max={51}
            step={1}
          >
            <Slider.Control className="flex items-center h-4 w-full cursor-pointer touch-none">
              <Slider.Track className="relative h-1.5 w-full rounded-full bg-border-muted">
                <Slider.Indicator className="absolute h-full rounded-full bg-primary" />
                <Slider.Thumb className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-sm border-2 border-bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-shadow hover:shadow-md" />
              </Slider.Track>
            </Slider.Control>
          </Slider.Root>
          <div className="flex justify-between text-[0.625rem] text-text-muted">
            <span>0 (Best)</span>
            <span>51 (Worst)</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-text-muted">Target Size (MB)</span>
          <input
            type="number"
            min={1}
            max={4096}
            value={config.targetSizeMB}
            onChange={(e) =>
              onChange({
                ...config,
                targetSizeMB: Math.max(1, Number(e.target.value) || 1),
              })
            }
            className="w-32 bg-bg-surface border border-border text-sm text-text px-2 py-1 rounded font-mono tabular-nums focus:border-primary outline-none transition-colors"
          />
        </div>
      )}
    </div>
  );
}
