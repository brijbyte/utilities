import { useState, useMemo, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import type { RgbColor, ColorFormat } from "../utils/types";
import { generateScale, rgbToHex, formatCss } from "../utils/color";
import { Select } from "../../../components/Select";
import { Button } from "../../../components/Button";

const FORMAT_OPTIONS = [
  { value: "hex", label: "HEX" },
  { value: "rgb", label: "RGB" },
  { value: "hsl", label: "HSL" },
  { value: "oklch", label: "OKLCH" },
] satisfies { value: ColorFormat; label: string }[];

const EXPORT_OPTIONS = [
  { value: "css", label: "CSS Variables" },
  { value: "tailwind", label: "Tailwind" },
  { value: "scss", label: "SCSS" },
  { value: "json", label: "JSON" },
] as const;

type ExportFormat = (typeof EXPORT_OPTIONS)[number]["value"];

interface Props {
  rgb: RgbColor;
  onColorChange: (rgb: RgbColor) => void;
}

function formatExport(
  scale: { step: number; color: RgbColor }[],
  exportFmt: ExportFormat,
  colorFmt: ColorFormat,
): string {
  switch (exportFmt) {
    case "css":
      return scale
        .map(
          ({ step, color }) =>
            `  --color-${step}: ${formatCss(color, colorFmt)};`,
        )
        .join("\n")
        .replace(/^/, ":root {\n")
        .concat("\n}");

    case "tailwind":
      return scale
        .map(
          ({ step, color }) => `  '${step}': '${formatCss(color, colorFmt)}',`,
        )
        .join("\n")
        .replace(/^/, "{\n")
        .concat("\n}");

    case "scss":
      return scale
        .map(
          ({ step, color }) => `$color-${step}: ${formatCss(color, colorFmt)};`,
        )
        .join("\n");

    case "json":
      return JSON.stringify(
        Object.fromEntries(
          scale.map(({ step, color }) => [
            String(step),
            formatCss(color, colorFmt),
          ]),
        ),
        null,
        2,
      );
  }
}

export function ColorScale({ rgb, onColorChange }: Props) {
  const [colorFmt, setColorFmt] = useState<ColorFormat>("hex");
  const [exportFmt, setExportFmt] = useState<ExportFormat>("css");
  const [copied, setCopied] = useState(false);

  const scale = useMemo(() => generateScale(rgb), [rgb]);

  // Find closest step to the base color for highlighting
  const closestStep = useMemo(() => {
    let closest = 500;
    let minDist = Infinity;
    for (const { step, color } of scale) {
      const dist =
        Math.abs(color.r - rgb.r) +
        Math.abs(color.g - rgb.g) +
        Math.abs(color.b - rgb.b);
      if (dist < minDist) {
        minDist = dist;
        closest = step;
      }
    }
    return closest;
  }, [scale, rgb]);

  const exportText = useMemo(
    () => formatExport(scale, exportFmt, colorFmt),
    [scale, exportFmt, colorFmt],
  );

  const handleCopyAll = useCallback(async () => {
    await navigator.clipboard.writeText(exportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [exportText]);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-text-muted leading-relaxed">
        Generate a full shade scale from the current color using OKLCH lightness
        interpolation. Chroma scales proportionally to keep shades vibrant
        without clipping. Click a shade to set it as the active color.
      </p>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
          Scale
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <Select
            value={colorFmt}
            onValueChange={(v) => setColorFmt(v as ColorFormat)}
            options={FORMAT_OPTIONS}
            align="end"
          />
          <Select
            value={exportFmt}
            onValueChange={(v) => setExportFmt(v as ExportFormat)}
            options={EXPORT_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
            align="end"
          />
        </div>
      </div>

      {/* Scale strip */}
      <div className="flex rounded-lg overflow-hidden border border-border-muted">
        {scale.map(({ step, color }) => {
          const hex = rgbToHex(color);
          const isBase = step === closestStep;
          return (
            <button
              key={step}
              onClick={() => onColorChange(color)}
              title={`${step}: ${formatCss(color, colorFmt)}`}
              className="flex-1 flex flex-col items-center justify-end cursor-pointer transition-transform hover:scale-y-110 origin-bottom"
              style={{ backgroundColor: hex, minHeight: "48px" }}
            >
              <span
                className={`text-xs font-mono leading-tight pb-0.5 ${
                  step <= 400 ? "text-black/50" : "text-white/60"
                } ${isBase ? "font-bold !text-black dark:!text-white" : ""}`}
              >
                {step}
              </span>
            </button>
          );
        })}
      </div>

      {/* Shade rows */}
      <div className="flex flex-col gap-0.5">
        {scale.map(({ step, color }) => {
          const hex = rgbToHex(color);
          const css = formatCss(color, colorFmt);
          const isBase = step === closestStep;
          return (
            <ShadeRow
              key={step}
              step={step}
              hex={hex}
              css={css}
              isBase={isBase}
              onApply={() => onColorChange(color)}
            />
          );
        })}
      </div>

      {/* Export */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={handleCopyAll}
          className="text-xs gap-1.5"
        >
          {copied ? (
            <Check size={12} className="text-success" />
          ) : (
            <Copy size={12} />
          )}
          {copied
            ? "Copied!"
            : `Copy ${EXPORT_OPTIONS.find((o) => o.value === exportFmt)?.label}`}
        </Button>
      </div>

      {/* Preview */}
      <pre className="text-xs font-mono bg-bg-inset border border-border-muted rounded p-2 overflow-x-auto max-h-48 text-text-muted">
        {exportText}
      </pre>
    </div>
  );
}

function ShadeRow({
  step,
  hex,
  css,
  isBase,
  onApply,
}: {
  step: number;
  hex: string;
  css: string;
  isBase: boolean;
  onApply: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(css);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [css]);

  return (
    <div
      className={`flex items-center gap-2 px-2 py-1 rounded ${
        isBase ? "bg-primary/5 border border-primary/20" : ""
      }`}
    >
      <button
        onClick={onApply}
        title="Set as active color"
        className="w-6 h-6 rounded border border-border shrink-0 cursor-pointer hover:scale-110 transition-transform"
        style={{ backgroundColor: hex }}
      />
      <span className="text-xs font-mono text-text-muted w-8 shrink-0">
        {step}
      </span>
      <span className="text-xs font-mono text-text truncate flex-1 min-w-0">
        {css}
      </span>
      {isBase && (
        <span className="text-xs text-primary font-medium shrink-0">BASE</span>
      )}
      <button
        onClick={handleCopy}
        title="Copy CSS value"
        className="p-1 rounded text-text-muted hover:text-text hover:bg-bg-hover transition-colors cursor-pointer shrink-0"
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
