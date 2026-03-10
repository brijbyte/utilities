import { useState, useMemo, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import type { RgbColor, ContrastResult } from "../utils/types";
import {
  contrastRatio,
  rgbToHex,
  parseCssColor,
  suggestContrast,
} from "../utils/color";

interface Props {
  rgb: RgbColor;
  onColorChange: (rgb: RgbColor) => void;
}

function Badge({ pass, label }: { pass: boolean; label: string }) {
  return (
    <span
      className={`px-1.5 py-0.5 rounded text-xs font-medium ${
        pass
          ? "bg-success/10 text-success border border-success/30"
          : "bg-danger/10 text-danger border border-danger/30"
      }`}
    >
      {pass ? "✓" : "✕"} {label}
    </span>
  );
}

/** Highest failing WCAG level — returns the target ratio needed, or null if all pass. */
function getHighestFailingTarget(result: ContrastResult): {
  ratio: number;
  label: string;
} | null {
  // Check from strictest to loosest
  if (!result.aaa) return { ratio: 7, label: "AAA" };
  // All pass
  return null;
}

function SuggestionSwatch({
  rgb,
  bg,
  label,
  onApply,
}: {
  rgb: RgbColor;
  bg: RgbColor;
  label: string;
  onApply: (c: RgbColor) => void;
}) {
  const hex = rgbToHex(rgb);
  const ratio = useMemo(() => contrastRatio(rgb, bg).ratio, [rgb, bg]);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [hex]);

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded border border-border-muted bg-bg-surface">
      <button
        onClick={() => onApply(rgb)}
        title="Use this color"
        className="w-6 h-6 rounded border border-border shrink-0 cursor-pointer hover:scale-110 transition-transform"
        style={{ backgroundColor: hex }}
      />
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-xs font-mono text-text truncate">{hex}</span>
        <span className="text-xs text-text-muted">
          {label} · {ratio}:1
        </span>
      </div>
      <button
        onClick={handleCopy}
        title="Copy hex"
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

export function ContrastChecker({ rgb, onColorChange }: Props) {
  const [bgInput, setBgInput] = useState("#ffffff");
  const bg = useMemo(
    () => parseCssColor(bgInput) ?? { r: 255, g: 255, b: 255, a: 1 },
    [bgInput],
  );
  const result = useMemo(() => contrastRatio(rgb, bg), [rgb, bg]);

  const fgHex = rgbToHex(rgb);
  const bgHex = rgbToHex(bg);

  // Compute suggestions for the highest failing WCAG level
  const suggestions = useMemo(() => {
    const target = getHighestFailingTarget(result);
    if (!target) return null;
    const { lighter, darker } = suggestContrast(rgb, bg, target.ratio);
    return { target, lighter, darker };
  }, [result, rgb, bg]);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-text-muted leading-relaxed">
        Check WCAG 2.1 contrast ratio between the picked color and a background.
        AA requires 4.5:1 for normal text (3:1 for large), AAA requires 7:1
        (4.5:1 for large).
      </p>

      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted w-8 shrink-0 font-medium">
          BG
        </span>
        <div className="flex items-center gap-1.5 flex-1">
          <div
            className="w-5 h-5 rounded border border-border shrink-0"
            style={{ backgroundColor: bgHex }}
          />
          <input
            type="text"
            value={bgInput}
            onChange={(e) => setBgInput(e.target.value)}
            spellCheck={false}
            className="flex-1 min-w-0 px-2 py-1 text-xs leading-tight bg-bg-inset border border-border-muted rounded font-mono text-text outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-lg overflow-hidden border border-border">
        <div className="p-3 text-center" style={{ backgroundColor: bgHex }}>
          <span className="text-sm font-medium" style={{ color: fgHex }}>
            Sample Text
          </span>
        </div>
        <div className="p-3 text-center" style={{ backgroundColor: fgHex }}>
          <span className="text-sm font-medium" style={{ color: bgHex }}>
            Reversed
          </span>
        </div>
      </div>

      {/* Ratio + badges */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-text">{result.ratio}:1</span>
        <div className="flex flex-wrap gap-1">
          <Badge pass={result.aaLarge} label="AA Large" />
          <Badge pass={result.aa} label="AA" />
          <Badge pass={result.aaaLarge} label="AAA Large" />
          <Badge pass={result.aaa} label="AAA" />
        </div>
      </div>

      {/* Suggestions for failing levels */}
      {suggestions && (suggestions.lighter || suggestions.darker) && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-muted">
            Suggested colors to pass {suggestions.target.label} (
            {suggestions.target.ratio}:1)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {suggestions.lighter && (
              <SuggestionSwatch
                rgb={suggestions.lighter}
                bg={bg}
                label="Lighter"
                onApply={onColorChange}
              />
            )}
            {suggestions.darker && (
              <SuggestionSwatch
                rgb={suggestions.darker}
                bg={bg}
                label="Darker"
                onApply={onColorChange}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
