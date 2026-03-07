import { Button } from "../../../components/Button";
import { RotateCw, FlipHorizontal, FlipVertical } from "lucide-react";
import type { RotateConfig } from "../utils/types";

interface RotatePanelProps {
  config: RotateConfig;
  onChange: (config: RotateConfig) => void;
}

const ROTATIONS: { value: RotateConfig["rotation"]; label: string }[] = [
  { value: 0, label: "0°" },
  { value: 90, label: "90°" },
  { value: 180, label: "180°" },
  { value: 270, label: "270°" },
];

export function RotatePanel({ config, onChange }: RotatePanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-[0.625rem] text-text-muted">Rotation</span>
        <div className="flex gap-1.5">
          {ROTATIONS.map((r) => (
            <Button
              key={r.value}
              variant="outline"
              active={config.rotation === r.value}
              onClick={() => onChange({ ...config, rotation: r.value })}
              className="gap-1"
            >
              <RotateCw size={11} />
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[0.625rem] text-text-muted">Flip</span>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            active={config.flipH}
            onClick={() => onChange({ ...config, flipH: !config.flipH })}
            className="gap-1"
          >
            <FlipHorizontal size={11} />
            Horizontal
          </Button>
          <Button
            variant="outline"
            active={config.flipV}
            onClick={() => onChange({ ...config, flipV: !config.flipV })}
            className="gap-1"
          >
            <FlipVertical size={11} />
            Vertical
          </Button>
        </div>
      </div>
    </div>
  );
}
