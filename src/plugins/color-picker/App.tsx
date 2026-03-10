import { useState, useCallback, useMemo } from "react";
import type { RgbColor } from "./utils/types";
import {
  rgbToHsl,
  hslToRgb,
  oklchToRgb,
  hwbToRgb,
  rgbToOklch,
} from "./utils/color";
import { SaturationPanel } from "./components/SaturationPanel";
import { HueSlider } from "./components/HueSlider";
import { AlphaSlider } from "./components/AlphaSlider";
import { ColorPreview } from "./components/ColorPreview";
import { ChannelSliders } from "./components/ChannelSliders";
import { COLOR_MODELS } from "./utils/models";
import { ColorInputs } from "./components/ColorInputs";
import { GamutInfo } from "./components/GamutInfo";
import { ContrastChecker } from "./components/ContrastChecker";
import { HarmonyPalette } from "./components/HarmonyPalette";
import { CssInput } from "./components/CssInput";
import { Select } from "../../components/Select";
import { CollapsibleGroup, Collapsible } from "../../components/Collapsible";
import { ColorScale } from "./components/ColorScale";
import { ColorBlindness } from "./components/ColorBlindness";
import { Palette, ScanEye, SwatchBook, Code, Layers, Eye } from "lucide-react";

/**
 * Internal state: we store HSV (hue, saturation, value/brightness)
 * + alpha separately because HSL/RGB round-trip through gray loses hue.
 * The saturation panel is HSV-native; we convert to RGB for display.
 */
function hsvToRgb(h: number, s: number, v: number, a: number): RgbColor {
  // Convert HSV to HSL then to RGB
  const sF = s / 100;
  const vF = v / 100;
  const l = vF * (1 - sF / 2);
  const sl = l === 0 || l === 1 ? 0 : (vF - l) / Math.min(l, 1 - l);
  return hslToRgb({ h, s: sl * 100, l: l * 100, a });
}

function rgbToHsv(rgb: RgbColor): { h: number; s: number; v: number } {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : (d / max) * 100;
  const v = max * 100;
  if (d > 0) {
    if (max === r) h = (((g - b) / d) % 6) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
    if (h < 0) h += 360;
  }
  return { h, s, v };
}

export default function ColorPicker() {
  // HSV + alpha as source of truth (preserves hue through grays)
  const [hue, setHue] = useState(210);
  const [sat, setSat] = useState(80);
  const [val, setVal] = useState(70);
  const [alpha, setAlpha] = useState(1);
  const [model, setModel] = useState<"rgb" | "hsl" | "hwb" | "oklch">("rgb");
  // Unclamped linear sRGB for wide-gamut colors (preserved from parsing)
  const [linear, setLinear] = useState<[number, number, number] | undefined>();

  const rgb = useMemo(() => {
    const c = hsvToRgb(hue, sat, val, alpha);
    if (linear) c.linear = linear;
    return c;
  }, [hue, sat, val, alpha, linear]);

  const rgbString = `${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}`;

  const setFromRgb = useCallback((c: RgbColor) => {
    const hsv = rgbToHsv(c);
    setHue(hsv.h);
    setSat(hsv.s);
    setVal(hsv.v);
    setAlpha(c.a);
    setLinear(c.linear);
  }, []);

  // Picker/slider interactions clear wide-gamut linear since user is in sRGB
  const handleSatBrightness = useCallback((s: number, v: number) => {
    setSat(s);
    setVal(v);
    setLinear(undefined);
  }, []);

  const handleHueChange = useCallback((h: number) => {
    setHue(h);
    setLinear(undefined);
  }, []);

  const handleAlphaChange = useCallback((a: number) => {
    setAlpha(a);
    setLinear(undefined);
  }, []);

  // Channel slider callbacks
  const handleRgbChange = useCallback(
    (c: RgbColor) => setFromRgb(c),
    [setFromRgb],
  );

  const handleHslChange = useCallback(
    (h: number, s: number, l: number) => {
      setFromRgb(hslToRgb({ h, s, l, a: alpha }));
    },
    [alpha, setFromRgb],
  );

  const handleOklchChange = useCallback(
    (l: number, c: number, h: number) => {
      setFromRgb(oklchToRgb({ l, c, h, a: alpha }));
    },
    [alpha, setFromRgb],
  );

  const handleHwbChange = useCallback(
    (h: number, w: number, b: number) => {
      setFromRgb(hwbToRgb({ h, w, b, a: alpha }));
    },
    [alpha, setFromRgb],
  );

  const oklch = useMemo(() => rgbToOklch(rgb), [rgb]);
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb]);

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto p-4 flex flex-col gap-4">
        {/* ── Top section: picker + controls ── */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left: visual picker */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            <SaturationPanel
              hue={hue}
              saturation={sat}
              brightness={val}
              onChange={handleSatBrightness}
            />
            <HueSlider hue={hue} onChange={handleHueChange} />
            <AlphaSlider
              alpha={alpha}
              rgbString={rgbString}
              onChange={handleAlphaChange}
            />
          </div>

          {/* Right: preview + channel sliders */}
          <div className="w-full lg:w-64 flex flex-col gap-3 shrink-0">
            <ColorPreview rgb={rgb} onColorChange={setFromRgb} />

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Channels
              </span>
              <div className="ml-auto">
                <Select
                  value={model}
                  onValueChange={(v) => setModel(v as typeof model)}
                  options={COLOR_MODELS}
                  align="end"
                />
              </div>
            </div>

            <ChannelSliders
              rgb={rgb}
              model={model}
              onRgbChange={handleRgbChange}
              onHslChange={handleHslChange}
              onOklchChange={handleOklchChange}
              onHwbChange={handleHwbChange}
            />

            <CssInput onColorChange={setFromRgb} />
          </div>
        </div>

        {/* ── Gamut info ── */}
        <GamutInfo rgb={rgb} />

        {/* ── Collapsible panels ── */}
        <CollapsibleGroup defaultValue={["css-values", "harmony"]}>
          <Collapsible
            value="css-values"
            title="CSS Values"
            icon={<Code size={14} className="text-primary" />}
            badge="12 formats"
          >
            <ColorInputs rgb={rgb} onColorChange={setFromRgb} />
          </Collapsible>

          <Collapsible
            value="harmony"
            title="Color Harmony"
            icon={<Palette size={14} className="text-primary" />}
            badge={`H:${Math.round(hue)}°`}
          >
            <HarmonyPalette rgb={rgb} onColorChange={setFromRgb} />
          </Collapsible>

          <Collapsible
            value="scale"
            title="Color Scale"
            icon={<Layers size={14} className="text-primary" />}
            badge="11 shades"
          >
            <ColorScale rgb={rgb} onColorChange={setFromRgb} />
          </Collapsible>

          <Collapsible
            value="contrast"
            title="Contrast Checker"
            icon={<ScanEye size={14} className="text-primary" />}
            badge={`L:${Math.round(hsl.l)}%`}
          >
            <ContrastChecker rgb={rgb} onColorChange={setFromRgb} />
          </Collapsible>

          <Collapsible
            value="cvd"
            title="Color Blindness"
            icon={<Eye size={14} className="text-primary" />}
            badge="4 types"
          >
            <ColorBlindness rgb={rgb} onColorChange={setFromRgb} />
          </Collapsible>

          <Collapsible
            value="details"
            title="Color Details"
            icon={<SwatchBook size={14} className="text-primary" />}
          >
            <ColorDetails rgb={rgb} oklch={oklch} hsl={hsl} />
          </Collapsible>
        </CollapsibleGroup>
      </div>
    </div>
  );
}

// ── Color details panel ────────────────────────────────────

function ColorDetails({
  rgb,
  oklch,
  hsl,
}: {
  rgb: RgbColor;
  oklch: { l: number; c: number; h: number; a: number };
  hsl: { h: number; s: number; l: number; a: number };
}) {
  const luminance = useMemo(() => {
    const srgbToLinear = (c: number) =>
      c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    const r = srgbToLinear(rgb.r / 255);
    const g = srgbToLinear(rgb.g / 255);
    const b = srgbToLinear(rgb.b / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }, [rgb]);

  const rows = [
    ["Perceptual Lightness (OKLCH)", `${(oklch.l * 100).toFixed(1)}%`],
    ["Chroma (OKLCH)", oklch.c.toFixed(4)],
    ["Hue Angle", `${Math.round(oklch.h)}°`],
    ["HSL Saturation", `${Math.round(hsl.s)}%`],
    ["HSL Lightness", `${Math.round(hsl.l)}%`],
    ["Relative Luminance", luminance.toFixed(4)],
    [
      "Red Channel",
      `${Math.round(rgb.r)} (${((rgb.r / 255) * 100).toFixed(1)}%)`,
    ],
    [
      "Green Channel",
      `${Math.round(rgb.g)} (${((rgb.g / 255) * 100).toFixed(1)}%)`,
    ],
    [
      "Blue Channel",
      `${Math.round(rgb.b)} (${((rgb.b / 255) * 100).toFixed(1)}%)`,
    ],
    ["Opacity", `${(rgb.a * 100).toFixed(0)}%`],
  ];

  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <span className="text-xs text-text-muted">{label}</span>
          <span className="text-xs text-text font-mono text-right">
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}
