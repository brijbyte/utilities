/**
 * Generate CSS linear-gradient strings for channel slider tracks.
 * Each gradient shows how the color changes as that single channel varies
 * from min to max, with all other channels held constant.
 */

import type { RgbColor, HslColor, HwbColor, OklchColor } from "./types";
import { hslToRgb, hwbToRgb, oklchToRgb, rgbToHex } from "./color";

const STOPS = 8; // enough stops for smooth perceptual gradients

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function stopsToGradient(colors: string[]): string {
  return `linear-gradient(to right, ${colors.join(", ")})`;
}

function sampleGradient(
  count: number,
  colorAt: (t: number) => RgbColor,
): string {
  const colors: string[] = [];
  for (let i = 0; i <= count; i++) {
    colors.push(rgbToHex({ ...colorAt(i / count), a: 1 }));
  }
  return stopsToGradient(colors);
}

// ── RGB gradients ───────────────────────────────────────────

export function rgbRedGradient(rgb: RgbColor): string {
  return stopsToGradient([
    rgbToHex({ r: 0, g: rgb.g, b: rgb.b, a: 1 }),
    rgbToHex({ r: 255, g: rgb.g, b: rgb.b, a: 1 }),
  ]);
}

export function rgbGreenGradient(rgb: RgbColor): string {
  return stopsToGradient([
    rgbToHex({ r: rgb.r, g: 0, b: rgb.b, a: 1 }),
    rgbToHex({ r: rgb.r, g: 255, b: rgb.b, a: 1 }),
  ]);
}

export function rgbBlueGradient(rgb: RgbColor): string {
  return stopsToGradient([
    rgbToHex({ r: rgb.r, g: rgb.g, b: 0, a: 1 }),
    rgbToHex({ r: rgb.r, g: rgb.g, b: 255, a: 1 }),
  ]);
}

// ── HSL gradients ───────────────────────────────────────────

export function hslHueGradient(): string {
  return "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)";
}

export function hslSatGradient(hsl: HslColor): string {
  return sampleGradient(STOPS, (t) =>
    hslToRgb({ h: hsl.h, s: lerp(0, 100, t), l: hsl.l, a: 1 }),
  );
}

export function hslLightGradient(hsl: HslColor): string {
  return sampleGradient(STOPS, (t) =>
    hslToRgb({ h: hsl.h, s: hsl.s, l: lerp(0, 100, t), a: 1 }),
  );
}

// ── HWB gradients ───────────────────────────────────────────

export function hwbHueGradient(): string {
  return hslHueGradient();
}

export function hwbWhitenessGradient(hwb: HwbColor): string {
  return sampleGradient(STOPS, (t) =>
    hwbToRgb({ h: hwb.h, w: lerp(0, 100, t), b: hwb.b, a: 1 }),
  );
}

export function hwbBlacknessGradient(hwb: HwbColor): string {
  return sampleGradient(STOPS, (t) =>
    hwbToRgb({ h: hwb.h, w: hwb.w, b: lerp(0, 100, t), a: 1 }),
  );
}

// ── OKLCH gradients ─────────────────────────────────────────

export function oklchLightnessGradient(oklch: OklchColor): string {
  return sampleGradient(STOPS, (t) =>
    oklchToRgb({ l: lerp(0, 1, t), c: oklch.c, h: oklch.h, a: 1 }),
  );
}

export function oklchChromaGradient(oklch: OklchColor): string {
  return sampleGradient(STOPS, (t) =>
    oklchToRgb({ l: oklch.l, c: lerp(0, 0.4, t), h: oklch.h, a: 1 }),
  );
}

export function oklchHueGradient(oklch: OklchColor): string {
  return sampleGradient(12, (t) =>
    oklchToRgb({ l: oklch.l, c: oklch.c, h: lerp(0, 360, t), a: 1 }),
  );
}
