import { Select } from "../../../components/Select";
import type { AudioConfig } from "../utils/types";

interface AudioPanelProps {
  config: AudioConfig;
  onChange: (config: AudioConfig) => void;
}

const ACTION_OPTIONS = [
  { value: "remove", label: "Remove Audio" },
  { value: "extract", label: "Extract Audio" },
];

const EXTRACT_FORMAT_OPTIONS = [
  { value: "mp3", label: "MP3" },
  { value: "aac", label: "AAC" },
  { value: "wav", label: "WAV" },
  { value: "ogg", label: "OGG Vorbis" },
];

export function AudioPanel({ config, onChange }: AudioPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[0.625rem] text-text-muted">Action</span>
          <Select
            value={config.action}
            onValueChange={(v) =>
              onChange({ ...config, action: v as AudioConfig["action"] })
            }
            options={ACTION_OPTIONS}
            align="start"
          />
        </div>

        {config.action === "extract" && (
          <div className="flex flex-col gap-1">
            <span className="text-[0.625rem] text-text-muted">Format</span>
            <Select
              value={config.extractFormat}
              onValueChange={(v) =>
                onChange({
                  ...config,
                  extractFormat: v as AudioConfig["extractFormat"],
                })
              }
              options={EXTRACT_FORMAT_OPTIONS}
              align="start"
            />
          </div>
        )}
      </div>

      <span className="text-[0.625rem] text-text-muted">
        {config.action === "remove"
          ? "ⓘ The audio track will be stripped from the output video."
          : "ⓘ Only the audio track will be extracted — no video in output."}
      </span>
    </div>
  );
}
