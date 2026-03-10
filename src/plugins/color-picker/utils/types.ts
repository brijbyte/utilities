/** All internal color representation uses OKLCH as the canonical model.
 *  OKLCH is perceptually uniform and supports wide-gamut colors natively. */

export interface OklchColor {
  /** Lightness 0–1 */
  l: number;
  /** Chroma 0–0.4 (theoretically unbounded but ~0.37 is max for visible) */
  c: number;
  /** Hue 0–360 */
  h: number;
  /** Alpha 0–1 */
  a: number;
}

export interface RgbColor {
  r: number; // 0–255
  g: number; // 0–255
  b: number; // 0–255
  a: number; // 0–1
  /** Unclamped linear-light sRGB triplet. Present when parsed from a
   *  wide-gamut color space so gamut checks can detect out-of-sRGB colors
   *  that were clipped during the conversion to 0–255 integer RGB. */
  linear?: [number, number, number];
}

export interface HslColor {
  h: number; // 0–360
  s: number; // 0–100
  l: number; // 0–100
  a: number; // 0–1
}

export interface HwbColor {
  h: number; // 0–360
  w: number; // 0–100
  b: number; // 0–100
  a: number; // 0–1
}

export interface LabColor {
  l: number; // 0–100
  a: number; // -125–125
  b: number; // -125–125
  alpha: number; // 0–1
}

export interface LchColor {
  l: number; // 0–100
  c: number; // 0–150
  h: number; // 0–360
  a: number; // 0–1
}

export interface OklabColor {
  l: number; // 0–1
  a: number; // -0.4–0.4
  b: number; // -0.4–0.4
  alpha: number; // 0–1
}

export interface P3Color {
  r: number; // 0–1
  g: number; // 0–1
  b: number; // 0–1
  a: number; // 0–1
}

export type ColorFormat =
  | "hex"
  | "rgb"
  | "hsl"
  | "hwb"
  | "lab"
  | "lch"
  | "oklab"
  | "oklch"
  | "display-p3"
  | "a98-rgb"
  | "prophoto-rgb"
  | "rec2020";

export type Gamut =
  | "srgb"
  | "display-p3"
  | "a98-rgb"
  | "prophoto-rgb"
  | "rec2020";

export type HarmonyType =
  | "complementary"
  | "analogous"
  | "triadic"
  | "split-complementary"
  | "tetradic"
  | "monochromatic";

export interface ContrastResult {
  ratio: number;
  aa: boolean;
  aaLarge: boolean;
  aaa: boolean;
  aaaLarge: boolean;
}
