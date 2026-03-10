import { useState, useMemo } from "react";
import type { RgbColor } from "../utils/types";
import { contrastRatio, rgbToHex, parseCssColor } from "../utils/color";

interface Props {
  rgb: RgbColor;
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

export function ContrastChecker({ rgb }: Props) {
  const [bgInput, setBgInput] = useState("#ffffff");
  const bg = useMemo(
    () => parseCssColor(bgInput) ?? { r: 255, g: 255, b: 255, a: 1 },
    [bgInput],
  );
  const result = useMemo(() => contrastRatio(rgb, bg), [rgb, bg]);

  const fgHex = rgbToHex(rgb);
  const bgHex = rgbToHex(bg);

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

      {/* Ratio */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-text">{result.ratio}:1</span>
        <div className="flex flex-wrap gap-1">
          <Badge pass={result.aaLarge} label="AA Large" />
          <Badge pass={result.aa} label="AA" />
          <Badge pass={result.aaaLarge} label="AAA Large" />
          <Badge pass={result.aaa} label="AAA" />
        </div>
      </div>
    </div>
  );
}
