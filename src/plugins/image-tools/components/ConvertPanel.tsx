import { Button } from "../../../components/Button";
import type { ConvertConfig, OutputFormat } from "../utils/types";

interface ConvertPanelProps {
  config: ConvertConfig;
  onChange: (config: ConvertConfig) => void;
}

const FORMATS: { value: OutputFormat; label: string }[] = [
  { value: "image/jpeg", label: "JPEG" },
  { value: "image/png", label: "PNG" },
  { value: "image/webp", label: "WebP" },
];

export function ConvertPanel({ config, onChange }: ConvertPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Format buttons */}
      <div className="flex items-center gap-1.5">
        {FORMATS.map((f) => (
          <Button
            key={f.value}
            variant="outline"
            active={config.format === f.value}
            className="text-[0.625rem] px-2 py-1"
            onClick={() => onChange({ ...config, format: f.value })}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Quality slider (JPEG / WebP only) */}
      {config.format !== "image/png" && (
        <label className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text">Quality</span>
            <span className="text-xs text-text-muted">
              {Math.round(config.quality * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={config.quality}
            onChange={(e) =>
              onChange({ ...config, quality: parseFloat(e.target.value) })
            }
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[0.5rem] text-text-muted">
            <span>Smaller</span>
            <span>Higher quality</span>
          </div>
        </label>
      )}

      {config.format === "image/png" && (
        <p className="text-[0.5625rem] text-text-muted">
          PNG is lossless — no quality slider needed.
        </p>
      )}
    </div>
  );
}
