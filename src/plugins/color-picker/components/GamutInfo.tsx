import { Check, X } from "lucide-react";
import type { RgbColor } from "../utils/types";
import {
  isInSrgb,
  isInP3,
  isInA98,
  isInRec2020,
  isInProphoto,
} from "../utils/color";

interface Props {
  rgb: RgbColor;
}

const GAMUTS = [
  { name: "sRGB", check: isInSrgb },
  { name: "Display P3", check: isInP3 },
  { name: "A98 RGB", check: isInA98 },
  { name: "Rec. 2020", check: isInRec2020 },
  { name: "ProPhoto", check: isInProphoto },
] as const;

export function GamutInfo({ rgb }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-xs font-medium text-text-muted uppercase tracking-wider">
        Gamut Coverage
      </div>
      <p className="text-xs text-text-muted leading-relaxed">
        Shows which color spaces can reproduce this color. sRGB is the standard
        web gamut. Wider gamuts like Display P3 (modern Apple/OLED screens) and
        Rec.&nbsp;2020 (HDR) cover colors that sRGB cannot. A ✕ means the color
        falls outside that gamut&apos;s range — it will be clipped on displays
        limited to that space.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {GAMUTS.map(({ name, check }) => {
          const inGamut = check(rgb);
          return (
            <div
              key={name}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${
                inGamut
                  ? "border-success/30 bg-success/5 text-success"
                  : "border-border-muted bg-bg-inset text-text-muted"
              }`}
            >
              {inGamut ? <Check size={10} /> : <X size={10} />}
              {name}
            </div>
          );
        })}
      </div>
    </div>
  );
}
