import { useState, useMemo, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import type { RgbColor, HarmonyType, ColorFormat } from "../utils/types";
import { generateHarmony, rgbToHex, rgbToHsl, formatCss } from "../utils/color";
import { Select } from "../../../components/Select";

const HARMONY_OPTIONS = [
  { value: "complementary", label: "Complementary" },
  { value: "analogous", label: "Analogous" },
  { value: "triadic", label: "Triadic" },
  { value: "split-complementary", label: "Split Complementary" },
  { value: "tetradic", label: "Tetradic" },
  { value: "monochromatic", label: "Monochromatic" },
] satisfies { value: HarmonyType; label: string }[];

const HARMONY_DESCRIPTIONS: Record<HarmonyType, string> = {
  complementary:
    "Two colors opposite each other on the color wheel (180° apart). High contrast, bold and vibrant — great for call-to-action elements against a background.",
  analogous:
    "Three colors next to each other on the wheel (±30°). Low contrast, naturally harmonious — common in nature and comfortable to look at.",
  triadic:
    "Three colors evenly spaced around the wheel (120° apart). Balanced and colorful while retaining contrast — works well when you need variety without clashing.",
  "split-complementary":
    "The base color plus two colors adjacent to its complement (±150°). Similar contrast to complementary but less tension — easier to balance in designs.",
  tetradic:
    "Four colors forming a rectangle on the wheel (90° apart). Rich and diverse — best when one color dominates and the others accent.",
  monochromatic:
    "Five variations of the same hue at lightness levels spaced ±15% and ±30% from the base. Cohesive and elegant — the safest harmony for a unified, clean look.",
};

const FORMAT_OPTIONS = [
  { value: "hex", label: "HEX" },
  { value: "rgb", label: "RGB" },
  { value: "hsl", label: "HSL" },
  { value: "oklch", label: "OKLCH" },
] satisfies { value: ColorFormat; label: string }[];

interface Props {
  rgb: RgbColor;
  onColorChange: (rgb: RgbColor) => void;
}

export function HarmonyPalette({ rgb, onColorChange }: Props) {
  const [harmony, setHarmony] = useState<HarmonyType>("complementary");
  const [format, setFormat] = useState<ColorFormat>("hex");
  const colors = useMemo(() => generateHarmony(rgb, harmony), [rgb, harmony]);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-text-muted leading-relaxed">
        Generate palettes based on color theory relationships. Click a swatch to
        set it as the active color. Use the copy icon to copy its CSS value.
      </p>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
          Harmony
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <Select
            value={format}
            onValueChange={(v) => setFormat(v as ColorFormat)}
            options={FORMAT_OPTIONS}
            align="end"
          />
          <Select
            value={harmony}
            onValueChange={(v) => setHarmony(v as HarmonyType)}
            options={HARMONY_OPTIONS}
            align="end"
          />
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {colors.map((c, i) => (
          <SwatchCard
            key={i}
            rgb={c}
            format={format}
            onSetActive={() => onColorChange(c)}
          />
        ))}
      </div>

      <PaletteExport colors={colors} harmony={harmony} format={format} />

      {harmony !== "monochromatic" && <HarmonyWheel colors={colors} />}

      <p className="text-xs text-text-muted leading-relaxed">
        {HARMONY_DESCRIPTIONS[harmony]}
      </p>
    </div>
  );
}

const EXPORT_LABELS: Record<string, string> = {
  css: "CSS Variables",
  scss: "SCSS",
  json: "JSON",
};

function formatPaletteExport(
  colors: RgbColor[],
  harmony: HarmonyType,
  format: ColorFormat,
  exportFmt: string,
): string {
  const names =
    colors.length === 2
      ? ["base", "accent"]
      : colors.map((_, i) => (i === 0 ? "base" : `accent-${i}`));

  switch (exportFmt) {
    case "css":
      return (
        `:root {\n` +
        colors
          .map((c, i) => `  --${harmony}-${names[i]}: ${formatCss(c, format)};`)
          .join("\n") +
        `\n}`
      );
    case "scss":
      return colors
        .map((c, i) => `$${harmony}-${names[i]}: ${formatCss(c, format)};`)
        .join("\n");
    case "json":
      return JSON.stringify(
        Object.fromEntries(
          colors.map((c, i) => [names[i], formatCss(c, format)]),
        ),
        null,
        2,
      );
    default:
      return "";
  }
}

function PaletteExport({
  colors,
  harmony,
  format,
}: {
  colors: RgbColor[];
  harmony: HarmonyType;
  format: ColorFormat;
}) {
  const [exportFmt, setExportFmt] = useState("css");
  const [copied, setCopied] = useState(false);

  const text = useMemo(
    () => formatPaletteExport(colors, harmony, format, exportFmt),
    [colors, harmony, format, exportFmt],
  );

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);

  return (
    <div className="flex items-center gap-1.5">
      <Select
        value={exportFmt}
        onValueChange={setExportFmt}
        options={Object.entries(EXPORT_LABELS).map(([value, label]) => ({
          value,
          label,
        }))}
        align="end"
      />
      <button
        onClick={handleCopy}
        title={`Copy as ${EXPORT_LABELS[exportFmt]}`}
        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-text-muted hover:text-text hover:bg-bg-hover border border-border-muted transition-colors cursor-pointer"
      >
        {copied ? (
          <Check size={12} className="text-success" />
        ) : (
          <Copy size={12} />
        )}
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

/** SVG color wheel showing harmony positions connected by lines.
 *  Draws the hue ring as arc segments (pure SVG, no foreignObject). */
function HarmonyWheel({ colors }: { colors: RgbColor[] }) {
  const size = 100;
  const cx = size / 2;
  const cy = size / 2;
  const r = 38; // ring center radius
  const ringW = 10;
  const dotSize = 5;
  const segments = 60; // arc segments for smooth hue ring

  // Build hue ring as thick arc stroke segments
  const arcs = useMemo(() => {
    const step = 360 / segments;
    const result: { d: string; color: string }[] = [];
    for (let i = 0; i < segments; i++) {
      const a1 = (i * step - 90) * (Math.PI / 180);
      const a2 = ((i + 1) * step - 90) * (Math.PI / 180);
      const x1 = cx + r * Math.cos(a1);
      const y1 = cy + r * Math.sin(a1);
      const x2 = cx + r * Math.cos(a2);
      const y2 = cy + r * Math.sin(a2);
      result.push({
        d: `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`,
        color: `hsl(${i * step} 100% 50%)`,
      });
    }
    return result;
  }, [cx, cy, r]);

  // Get hue angle + hex for each color
  const points = useMemo(
    () =>
      colors.map((c) => {
        const hsl = rgbToHsl(c);
        const rad = ((hsl.h - 90) * Math.PI) / 180;
        return {
          x: cx + r * Math.cos(rad),
          y: cy + r * Math.sin(rad),
          hex: rgbToHex(c),
        };
      }),
    [colors, cx, cy, r],
  );

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-28 h-28 sm:w-36 sm:h-36 mx-auto shrink-0"
      aria-hidden="true"
    >
      {/* Hue ring drawn as arc segments */}
      {arcs.map((arc, i) => (
        <path
          key={i}
          d={arc.d}
          fill="none"
          stroke={arc.color}
          strokeWidth={ringW}
          strokeLinecap="butt"
        />
      ))}

      {/* Connecting lines between harmony dots */}
      {points.length >= 2 && (
        <polygon
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="var(--color-text-muted)"
          strokeWidth={1}
          strokeOpacity={0.5}
          strokeDasharray="2 2"
        />
      )}

      {/* Color dots on the ring */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={dotSize}
          fill={p.hex}
          stroke={i === 0 ? "var(--color-text)" : "var(--color-bg-surface)"}
          strokeWidth={1.5}
        />
      ))}
    </svg>
  );
}

function SwatchCard({
  rgb,
  format,
  onSetActive,
}: {
  rgb: RgbColor;
  format: ColorFormat;
  onSetActive: () => void;
}) {
  const hex = rgbToHex(rgb);
  const css = formatCss(rgb, format);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(css);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [css]);

  return (
    <div className="flex-1 min-w-20 flex flex-col gap-1.5 rounded-lg border border-border-muted bg-bg-surface overflow-hidden">
      {/* Swatch + label: click to set active */}
      <button
        onClick={onSetActive}
        title="Set as active color"
        className="flex flex-col items-center gap-1.5 p-1.5 pb-0 hover:bg-bg-hover transition-colors cursor-pointer"
      >
        <div className="w-full h-8 rounded" style={{ backgroundColor: hex }} />
      </button>
      {/* Label + copy button */}
      <div className="flex items-center gap-1 px-1.5 pb-1.5">
        <span className="text-xs font-mono text-text-muted truncate flex-1">
          {css}
        </span>
        <button
          onClick={handleCopy}
          title="Copy CSS value"
          className="p-1 rounded text-text-muted hover:text-text hover:bg-bg-hover transition-colors cursor-pointer shrink-0"
        >
          {copied ? (
            <Check size={14} className="text-success" />
          ) : (
            <Copy size={14} />
          )}
        </button>
      </div>
    </div>
  );
}
