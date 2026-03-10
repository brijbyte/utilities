import { useMemo } from "react";
import type { RgbColor, ColorVisionType } from "../utils/types";
import { simulateCVD, rgbToHex, contrastRatio } from "../utils/color";

const CVD_TYPES: {
  type: ColorVisionType;
  label: string;
  shortLabel: string;
  prevalence: string;
  description: string;
}[] = [
  {
    type: "protanopia",
    label: "Protanopia",
    shortLabel: "Protan",
    prevalence: "~1% of males",
    description: "No red cones. Red appears dark; red–green indistinguishable.",
  },
  {
    type: "deuteranopia",
    label: "Deuteranopia",
    shortLabel: "Deutan",
    prevalence: "~1% of males",
    description:
      "No green cones. Most common type. Red–green confusion, but red stays visible.",
  },
  {
    type: "tritanopia",
    label: "Tritanopia",
    shortLabel: "Tritan",
    prevalence: "~0.003%",
    description:
      "No blue cones. Very rare. Blue–yellow confusion; blue appears greenish.",
  },
  {
    type: "achromatopsia",
    label: "Achromatopsia",
    shortLabel: "Achrom",
    prevalence: "~0.003%",
    description:
      "No functioning cones. Complete color blindness — only luminance is perceived.",
  },
];

interface Props {
  rgb: RgbColor;
  onColorChange: (rgb: RgbColor) => void;
}

export function ColorBlindness({ rgb, onColorChange }: Props) {
  const originalHex = rgbToHex(rgb);

  const simulations = useMemo(
    () =>
      CVD_TYPES.map(({ type, label, shortLabel, prevalence, description }) => {
        const simulated = simulateCVD(rgb, type);
        const simHex = rgbToHex(simulated);
        // How different is the simulated color from the original?
        // Use contrast ratio as a rough perceptual distance metric
        const diff = contrastRatio(rgb, simulated);
        const isSame = simHex === originalHex;
        return {
          type,
          label,
          shortLabel,
          prevalence,
          description,
          simulated,
          simHex,
          diff: diff.ratio,
          isSame,
        };
      }),
    [rgb, originalHex],
  );

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-text-muted leading-relaxed">
        Simulate how this color appears under different types of color vision
        deficiency. Uses Viénot et al. matrices in linear sRGB for accurate
        simulation. To verify: enable Chrome DevTools → Rendering → "Emulate
        vision deficiencies" and compare the original swatch against the
        simulated hex shown here — they should match. Any pure gray (R=G=B)
        should be unchanged across all types, and achromatopsia always produces
        grayscale.
      </p>

      {/* Side-by-side comparison strip */}
      <div className="flex flex-col gap-1.5">
        {/* Header row */}
        <div className="flex items-center gap-2 px-2">
          <span className="w-7 h-7 shrink-0" />
          <span className="text-xs font-medium text-text-muted flex-1">
            Type
          </span>
          <span className="text-xs font-medium text-text-muted w-20 text-right">
            Seen as
          </span>
        </div>

        {simulations.map(
          ({
            type,
            label,
            prevalence,
            description,
            simulated,
            simHex,
            diff,
            isSame,
          }) => (
            <div
              key={type}
              className="flex items-center gap-2 px-2 py-1.5 rounded border border-border-muted bg-bg-surface"
            >
              {/* Simulated swatch */}
              <button
                onClick={() => onColorChange(simulated)}
                title={`Set ${label} simulation as active color`}
                className="w-7 h-7 rounded border border-border shrink-0 cursor-pointer hover:scale-110 transition-transform"
                style={{ backgroundColor: simHex }}
              />

              {/* Info */}
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-text">{label}</span>
                  <span className="text-xs text-text-muted">{prevalence}</span>
                </div>
                <span className="text-xs text-text-muted leading-snug">
                  {description}
                </span>
              </div>

              {/* Comparison */}
              <div className="flex flex-col items-end shrink-0">
                <span className="text-xs font-mono text-text">{simHex}</span>
                {isSame ? (
                  <span className="text-xs text-success">Unchanged</span>
                ) : (
                  <span className="text-xs text-text-muted">
                    Δ {diff.toFixed(2)}:1
                  </span>
                )}
              </div>
            </div>
          ),
        )}
      </div>

      {/* Visual comparison: original + all simulations in a strip */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
          Visual comparison
        </span>
        <div className="flex rounded-lg overflow-hidden border border-border-muted h-10">
          <div
            className="flex-1 flex items-center justify-center"
            style={{ backgroundColor: originalHex }}
            title="Original"
          >
            <span
              className={`text-xs font-mono ${
                rgbLuminance(rgb) > 0.5 ? "text-black/50" : "text-white/60"
              }`}
            >
              Original
            </span>
          </div>
          {simulations.map(({ type, shortLabel, simulated, simHex }) => (
            <div
              key={type}
              className="flex-1 flex items-center justify-center"
              style={{ backgroundColor: simHex }}
              title={shortLabel}
            >
              <span
                className={`text-xs font-mono ${
                  rgbLuminance(simulated) > 0.5
                    ? "text-black/50"
                    : "text-white/60"
                }`}
              >
                {shortLabel}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function rgbLuminance(rgb: RgbColor): number {
  const srgbToLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return (
    0.2126 * srgbToLinear(rgb.r / 255) +
    0.7152 * srgbToLinear(rgb.g / 255) +
    0.0722 * srgbToLinear(rgb.b / 255)
  );
}
