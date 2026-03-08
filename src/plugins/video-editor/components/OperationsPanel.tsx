import {
  Shrink,
  Scissors,
  Maximize,
  ArrowRightLeft,
  Volume2,
  RotateCw,
} from "lucide-react";
import { CollapsibleGroup, Collapsible } from "../../../components/Collapsible";
import { CompressPanel } from "./CompressPanel";
import { TrimPanel } from "./TrimPanel";
import { ResizePanel } from "./ResizePanel";
import { ConvertPanel } from "./ConvertPanel";
import { AudioPanel } from "./AudioPanel";
import { RotatePanel } from "./RotatePanel";
import type { Operations, VideoMeta } from "../utils/types";

interface OperationsPanelProps {
  ops: Operations;
  meta: VideoMeta;
  onChange: (ops: Operations) => void;
}

// ── Badge helpers ───────────────────────────────────────────────

function compressBadge(ops: Operations): string | undefined {
  if (!ops.compress.enabled) return;
  return ops.compress.mode === "crf"
    ? `CRF ${ops.compress.crf}`
    : `${ops.compress.targetSizeMB} MB`;
}

function resizeBadge(ops: Operations): string | undefined {
  if (!ops.resize.enabled) return;
  return ops.resize.preset === "custom"
    ? `${ops.resize.width}×${ops.resize.height}`
    : ops.resize.preset;
}

function rotateBadge(ops: Operations): string | undefined {
  if (!ops.rotate.enabled) return;
  return (
    [
      ops.rotate.rotation > 0 && `${ops.rotate.rotation}°`,
      ops.rotate.flipH && "H-Flip",
      ops.rotate.flipV && "V-Flip",
    ]
      .filter(Boolean)
      .join(", ") || undefined
  );
}

// ── Shared toggle + description wrapper ─────────────────────────

function OpToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-text cursor-pointer mb-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-primary"
      />
      {label}
    </label>
  );
}

function OpDesc({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] text-text-muted leading-relaxed -mt-1 mb-2">
      {children}
    </p>
  );
}

// ── Component ───────────────────────────────────────────────────

export function OperationsPanel({ ops, meta, onChange }: OperationsPanelProps) {
  const setOp = <K extends keyof Operations>(key: K, value: Operations[K]) => {
    onChange({ ...ops, [key]: value });
  };

  return (
    <CollapsibleGroup>
      {/* Compress */}
      <Collapsible
        value="compress"
        title="Compress"
        icon={<Shrink size={13} className="text-text-muted" />}
        badge={compressBadge(ops)}
      >
        <OpDesc>
          Reduce file size by re-encoding. Lower CRF = better quality but larger
          file. Use "Target File Size" to aim for a specific size. MP4 (H.264)
          is the most compatible format.
        </OpDesc>
        <OpToggle
          label="Enable compression"
          checked={ops.compress.enabled}
          onChange={(v) => setOp("compress", { ...ops.compress, enabled: v })}
        />
        {ops.compress.enabled && (
          <CompressPanel
            config={ops.compress}
            onChange={(compress) => setOp("compress", compress)}
          />
        )}
      </Collapsible>

      {/* Trim */}
      <Collapsible
        value="trim"
        title="Trim / Cut"
        icon={<Scissors size={13} className="text-text-muted" />}
        badge={ops.trim.enabled ? "Active" : undefined}
      >
        <OpDesc>
          Cut out a portion of the video by setting a start and end time. Enter
          time as m:ss.ms (e.g. 1:30.00) or raw seconds (e.g. 90).
        </OpDesc>
        <OpToggle
          label="Enable trimming"
          checked={ops.trim.enabled}
          onChange={(v) => setOp("trim", { ...ops.trim, enabled: v })}
        />
        {ops.trim.enabled && (
          <TrimPanel
            config={ops.trim}
            duration={meta.duration}
            onChange={(trim) => setOp("trim", trim)}
          />
        )}
      </Collapsible>

      {/* Resize */}
      <Collapsible
        value="resize"
        title="Resize / Scale"
        icon={<Maximize size={13} className="text-text-muted" />}
        badge={resizeBadge(ops)}
      >
        <OpDesc>
          Change the video resolution. Smaller resolution = smaller file size.
          When the target aspect ratio differs from the source, choose Pad
          (black bars) or Crop (cut edges to fill the frame).
        </OpDesc>
        <OpToggle
          label="Enable resize"
          checked={ops.resize.enabled}
          onChange={(v) => setOp("resize", { ...ops.resize, enabled: v })}
        />
        {ops.resize.enabled && (
          <ResizePanel
            config={ops.resize}
            meta={meta}
            onChange={(resize) => setOp("resize", resize)}
          />
        )}
      </Collapsible>

      {/* Convert */}
      <Collapsible
        value="convert"
        title="Convert Format"
        icon={<ArrowRightLeft size={13} className="text-text-muted" />}
        badge={
          ops.convert.enabled ? ops.convert.format.toUpperCase() : undefined
        }
      >
        <OpDesc>
          Change the video container format. MP4 works everywhere. WebM is great
          for the web. You can also extract just the audio as MP3, AAC, WAV, or
          OGG.
        </OpDesc>
        <OpToggle
          label="Enable format conversion"
          checked={ops.convert.enabled}
          onChange={(v) => setOp("convert", { ...ops.convert, enabled: v })}
        />
        {ops.convert.enabled && (
          <ConvertPanel
            config={ops.convert}
            onChange={(convert) => setOp("convert", convert)}
          />
        )}
      </Collapsible>

      {/* Audio */}
      <Collapsible
        value="audio"
        title="Audio"
        icon={<Volume2 size={13} className="text-text-muted" />}
        badge={
          ops.audio.enabled
            ? ops.audio.action === "remove"
              ? "Remove"
              : `Extract ${ops.audio.extractFormat.toUpperCase()}`
            : undefined
        }
      >
        <OpDesc>
          Remove the audio track to create a silent video, or extract just the
          audio as a separate file (MP3, AAC, WAV, or OGG).
        </OpDesc>
        <OpToggle
          label="Enable audio processing"
          checked={ops.audio.enabled}
          onChange={(v) => setOp("audio", { ...ops.audio, enabled: v })}
        />
        {ops.audio.enabled && (
          <AudioPanel
            config={ops.audio}
            onChange={(audio) => setOp("audio", audio)}
          />
        )}
      </Collapsible>

      {/* Rotate */}
      <Collapsible
        value="rotate"
        title="Rotate / Flip"
        icon={<RotateCw size={13} className="text-text-muted" />}
        badge={rotateBadge(ops)}
      >
        <OpDesc>
          Rotate the video by 90°, 180°, or 270°. You can also mirror it
          horizontally or vertically. Useful for fixing sideways recordings.
        </OpDesc>
        <OpToggle
          label="Enable rotation / flip"
          checked={ops.rotate.enabled}
          onChange={(v) => setOp("rotate", { ...ops.rotate, enabled: v })}
        />
        {ops.rotate.enabled && (
          <RotatePanel
            config={ops.rotate}
            onChange={(rotate) => setOp("rotate", rotate)}
          />
        )}
      </Collapsible>
    </CollapsibleGroup>
  );
}
