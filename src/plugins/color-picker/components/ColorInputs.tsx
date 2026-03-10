import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import type { RgbColor, ColorFormat } from "../utils/types";
import { formatCss, parseCssColor } from "../utils/color";

const ALL_FORMATS: { value: ColorFormat; label: string }[] = [
  { value: "hex", label: "HEX" },
  { value: "rgb", label: "RGB" },
  { value: "hsl", label: "HSL" },
  { value: "hwb", label: "HWB" },
  { value: "lab", label: "LAB" },
  { value: "lch", label: "LCH" },
  { value: "oklab", label: "OKLAB" },
  { value: "oklch", label: "OKLCH" },
  { value: "display-p3", label: "Display P3" },
  { value: "a98-rgb", label: "A98 RGB" },
  { value: "prophoto-rgb", label: "ProPhoto" },
  { value: "rec2020", label: "Rec. 2020" },
];

interface Props {
  rgb: RgbColor;
  onColorChange: (rgb: RgbColor) => void;
}

export function ColorInputs({ rgb, onColorChange }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-xs font-medium text-text-muted uppercase tracking-wider">
        CSS Values
      </div>
      {ALL_FORMATS.map((f) => (
        <FormatRow
          key={f.value}
          format={f.value}
          label={f.label}
          rgb={rgb}
          onColorChange={onColorChange}
        />
      ))}
    </div>
  );
}

function FormatRow({
  format,
  label,
  rgb,
  onColorChange,
}: {
  format: ColorFormat;
  label: string;
  rgb: RgbColor;
  onColorChange: (rgb: RgbColor) => void;
}) {
  const cssValue = formatCss(rgb, format);
  // null = not editing (display computed value), string = actively editing
  const [editText, setEditText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const displayValue = editText ?? cssValue;

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(cssValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [cssValue]);

  const handleBlur = useCallback(() => {
    if (editText !== null) {
      const parsed = parseCssColor(editText);
      if (parsed) onColorChange(parsed);
    }
    setEditText(null);
  }, [editText, onColorChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === "Escape") {
      setEditText(null);
      (e.target as HTMLInputElement).blur();
    }
  }, []);

  return (
    <div className="flex items-center gap-2 group">
      <span className="text-xs font-medium text-text-muted w-16 shrink-0 text-right uppercase">
        {label}
      </span>
      <input
        type="text"
        value={displayValue}
        onChange={(e) => setEditText(e.target.value)}
        onFocus={() => setEditText(cssValue)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        className="flex-1 min-w-0 px-2 py-1 text-xs leading-tight bg-bg-inset border border-border-muted rounded font-mono text-text outline-none focus:border-primary transition-colors"
      />
      <button
        onClick={handleCopy}
        className="p-1 rounded text-text-muted hover:text-text hover:bg-bg-hover transition-colors cursor-pointer shrink-0"
        title={`Copy ${label}`}
      >
        {copied ? (
          <Check size={12} className="text-success" />
        ) : (
          <Copy size={12} />
        )}
      </button>
    </div>
  );
}
