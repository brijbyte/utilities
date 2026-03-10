import { useMemo } from "react";
import type { RgbColor } from "../utils/types";
import { rgbToHsl, rgbToOklch, rgbToHwb } from "../utils/color";
import {
  rgbRedGradient,
  rgbGreenGradient,
  rgbBlueGradient,
  hslHueGradient,
  hslSatGradient,
  hslLightGradient,
  hwbHueGradient,
  hwbWhitenessGradient,
  hwbBlacknessGradient,
  oklchLightnessGradient,
  oklchChromaGradient,
  oklchHueGradient,
} from "../utils/gradients";
import { NumberInput } from "./NumberInput";
import type { ColorModel } from "../utils/models";

interface Props {
  rgb: RgbColor;
  model: ColorModel;
  onRgbChange: (rgb: RgbColor) => void;
  onHslChange: (h: number, s: number, l: number) => void;
  onOklchChange: (l: number, c: number, h: number) => void;
  onHwbChange: (h: number, w: number, b: number) => void;
}

export function ChannelSliders({
  rgb,
  model,
  onRgbChange,
  onHslChange,
  onOklchChange,
  onHwbChange,
}: Props) {
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb]);
  const oklch = useMemo(() => rgbToOklch(rgb), [rgb]);
  const hwb = useMemo(() => rgbToHwb(rgb), [rgb]);

  // ── RGB gradients ──
  const rGrad = useMemo(() => rgbRedGradient(rgb), [rgb]);
  const gGrad = useMemo(() => rgbGreenGradient(rgb), [rgb]);
  const bGrad = useMemo(() => rgbBlueGradient(rgb), [rgb]);

  // ── HSL gradients ──
  const hslHGrad = useMemo(() => hslHueGradient(), []);
  const hslSGrad = useMemo(() => hslSatGradient(hsl), [hsl]);
  const hslLGrad = useMemo(() => hslLightGradient(hsl), [hsl]);

  // ── HWB gradients ──
  const hwbHGrad = useMemo(() => hwbHueGradient(), []);
  const hwbWGrad = useMemo(() => hwbWhitenessGradient(hwb), [hwb]);
  const hwbBGrad = useMemo(() => hwbBlacknessGradient(hwb), [hwb]);

  // ── OKLCH gradients ──
  const oklchLGrad = useMemo(() => oklchLightnessGradient(oklch), [oklch]);
  const oklchCGrad = useMemo(() => oklchChromaGradient(oklch), [oklch]);
  const oklchHGrad = useMemo(() => oklchHueGradient(oklch), [oklch]);

  switch (model) {
    case "rgb":
      return (
        <div className="flex flex-col gap-1.5">
          <NumberInput
            label="R"
            value={rgb.r}
            min={0}
            max={255}
            onChange={(r) => onRgbChange({ ...rgb, r })}
            trackBackground={rGrad}
          />
          <NumberInput
            label="G"
            value={rgb.g}
            min={0}
            max={255}
            onChange={(g) => onRgbChange({ ...rgb, g })}
            trackBackground={gGrad}
          />
          <NumberInput
            label="B"
            value={rgb.b}
            min={0}
            max={255}
            onChange={(b) => onRgbChange({ ...rgb, b })}
            trackBackground={bGrad}
          />
        </div>
      );

    case "hsl":
      return (
        <div className="flex flex-col gap-1.5">
          <NumberInput
            label="H"
            value={hsl.h}
            min={0}
            max={360}
            step={1}
            suffix="°"
            onChange={(h) => onHslChange(h, hsl.s, hsl.l)}
            trackBackground={hslHGrad}
          />
          <NumberInput
            label="S"
            value={hsl.s}
            min={0}
            max={100}
            step={0.1}
            decimals={1}
            suffix="%"
            onChange={(s) => onHslChange(hsl.h, s, hsl.l)}
            trackBackground={hslSGrad}
          />
          <NumberInput
            label="L"
            value={hsl.l}
            min={0}
            max={100}
            step={0.1}
            decimals={1}
            suffix="%"
            onChange={(l) => onHslChange(hsl.h, hsl.s, l)}
            trackBackground={hslLGrad}
          />
        </div>
      );

    case "hwb":
      return (
        <div className="flex flex-col gap-1.5">
          <NumberInput
            label="H"
            value={hwb.h}
            min={0}
            max={360}
            step={1}
            suffix="°"
            onChange={(h) => onHwbChange(h, hwb.w, hwb.b)}
            trackBackground={hwbHGrad}
          />
          <NumberInput
            label="W"
            value={hwb.w}
            min={0}
            max={100}
            step={0.1}
            decimals={1}
            suffix="%"
            onChange={(w) => onHwbChange(hwb.h, w, hwb.b)}
            trackBackground={hwbWGrad}
          />
          <NumberInput
            label="B"
            value={hwb.b}
            min={0}
            max={100}
            step={0.1}
            decimals={1}
            suffix="%"
            onChange={(b) => onHwbChange(hwb.h, hwb.w, b)}
            trackBackground={hwbBGrad}
          />
        </div>
      );

    case "oklch":
      return (
        <div className="flex flex-col gap-1.5">
          <NumberInput
            label="L"
            value={oklch.l * 100}
            min={0}
            max={100}
            step={0.1}
            decimals={1}
            suffix="%"
            onChange={(l) => onOklchChange(l / 100, oklch.c, oklch.h)}
            trackBackground={oklchLGrad}
          />
          <NumberInput
            label="C"
            value={oklch.c}
            min={0}
            max={0.4}
            step={0.001}
            decimals={3}
            onChange={(c) => onOklchChange(oklch.l, c, oklch.h)}
            trackBackground={oklchCGrad}
          />
          <NumberInput
            label="H"
            value={oklch.h}
            min={0}
            max={360}
            step={1}
            suffix="°"
            onChange={(h) => onOklchChange(oklch.l, oklch.c, h)}
            trackBackground={oklchHGrad}
          />
        </div>
      );
  }
}
