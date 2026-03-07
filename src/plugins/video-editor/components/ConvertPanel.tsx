import { Select } from "../../../components/Select";
import type { ConvertConfig } from "../utils/types";

interface ConvertPanelProps {
  config: ConvertConfig;
  onChange: (config: ConvertConfig) => void;
}

const FORMAT_OPTIONS = [
  { value: "mp4", label: "MP4 (H.264)" },
  { value: "webm", label: "WebM (VP9)" },
  { value: "gif", label: "GIF (Animated)" },
  { value: "avi", label: "AVI" },
  { value: "mov", label: "MOV" },
  { value: "mp3", label: "MP3 (Audio Only)" },
  { value: "aac", label: "AAC (Audio Only)" },
  { value: "wav", label: "WAV (Audio Only)" },
  { value: "ogg", label: "OGG (Audio Only)" },
];

export function ConvertPanel({ config, onChange }: ConvertPanelProps) {
  const isAudioOnly = ["mp3", "aac", "wav", "ogg"].includes(config.format);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-[0.625rem] text-text-muted">Output Format</span>
        <Select
          value={config.format}
          onValueChange={(v) =>
            onChange({ ...config, format: v as ConvertConfig["format"] })
          }
          options={FORMAT_OPTIONS}
          align="start"
          popupMinWidth="min-w-48"
        />
      </div>
      {isAudioOnly && (
        <span className="text-[0.625rem] text-text-muted">
          ⓘ Audio-only format selected — video track will be discarded.
        </span>
      )}
      {config.format === "gif" && (
        <span className="text-[0.625rem] text-text-muted">
          ⓘ GIF output can be large. Consider trimming and resizing first.
        </span>
      )}
    </div>
  );
}
