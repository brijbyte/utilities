/**
 * Color conversion engine.
 *
 * All conversions go through a common intermediate: linear-light sRGB or
 * OKLCH depending on the path. We use the CSS Color Level 4 algorithms
 * throughout for accuracy.
 *
 * No external dependencies — pure math only.
 */

import type {
  OklchColor,
  RgbColor,
  HslColor,
  HwbColor,
  LabColor,
  LchColor,
  OklabColor,
  P3Color,
  ColorFormat,
  Gamut,
  HarmonyType,
  ContrastResult,
} from "./types";

// ── Helpers ─────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function round(v: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

// ── sRGB gamma ──────────────────────────────────────────────

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
}

/** Create an RgbColor from unclamped linear-light sRGB values.
 *  Clamps to 0–255 for display but preserves the unclamped linear triplet
 *  so gamut checks can detect out-of-sRGB colors. */
function linearToRgbColor(
  lr: number,
  lg: number,
  lb: number,
  a: number,
): RgbColor {
  const outOfSrgb =
    lr < -0.001 ||
    lr > 1.001 ||
    lg < -0.001 ||
    lg > 1.001 ||
    lb < -0.001 ||
    lb > 1.001;
  return {
    r: clamp(Math.round(linearToSrgb(lr) * 255), 0, 255),
    g: clamp(Math.round(linearToSrgb(lg) * 255), 0, 255),
    b: clamp(Math.round(linearToSrgb(lb) * 255), 0, 255),
    a,
    ...(outOfSrgb ? { linear: [lr, lg, lb] as [number, number, number] } : {}),
  };
}

// ── RGB ↔ HEX ───────────────────────────────────────────────

export function rgbToHex(rgb: RgbColor): string {
  const r = clamp(Math.round(rgb.r), 0, 255);
  const g = clamp(Math.round(rgb.g), 0, 255);
  const b = clamp(Math.round(rgb.b), 0, 255);
  const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  if (rgb.a < 1) {
    const a = clamp(Math.round(rgb.a * 255), 0, 255);
    return `${hex}${a.toString(16).padStart(2, "0")}`;
  }
  return hex;
}

export function hexToRgb(hex: string): RgbColor | null {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3 || hex.length === 4) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (hex.length === 6) hex += "ff";
  if (hex.length !== 8) return null;
  const n = parseInt(hex, 16);
  if (isNaN(n)) return null;
  return {
    r: (n >>> 24) & 0xff,
    g: (n >>> 16) & 0xff,
    b: (n >>> 8) & 0xff,
    a: round((n & 0xff) / 255, 3),
  };
}

// ── RGB ↔ HSL ───────────────────────────────────────────────

export function rgbToHsl(rgb: RgbColor): HslColor {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (d > 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  return {
    h: round(h * 360, 1),
    s: round(s * 100, 1),
    l: round(l * 100, 1),
    a: rgb.a,
  };
}

export function hslToRgb(hsl: HslColor): RgbColor {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v, a: hsl.a };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: round(hue2rgb(p, q, h + 1 / 3) * 255, 0),
    g: round(hue2rgb(p, q, h) * 255, 0),
    b: round(hue2rgb(p, q, h - 1 / 3) * 255, 0),
    a: hsl.a,
  };
}

// ── RGB ↔ HWB ───────────────────────────────────────────────

export function rgbToHwb(rgb: RgbColor): HwbColor {
  const hsl = rgbToHsl(rgb);
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const w = Math.min(r, g, b);
  const bl = 1 - Math.max(r, g, b);
  return {
    h: hsl.h,
    w: round(w * 100, 1),
    b: round(bl * 100, 1),
    a: rgb.a,
  };
}

export function hwbToRgb(hwb: HwbColor): RgbColor {
  const w = hwb.w / 100;
  const b = hwb.b / 100;
  if (w + b >= 1) {
    const s = w / (w + b);
    const gray = Math.round(s * 255);
    return { r: gray, g: gray, b: gray, a: hwb.a };
  }
  const rgb = hslToRgb({ h: hwb.h, s: 100, l: 50, a: hwb.a });
  const f = (c: number) => Math.round((c / 255) * (1 - w - b) * 255 + w * 255);
  return { r: f(rgb.r), g: f(rgb.g), b: f(rgb.b), a: hwb.a };
}

// ── sRGB linear ↔ XYZ D65 ──────────────────────────────────

function linearRgbToXyz(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  return [
    0.4123907993 * r + 0.3575843394 * g + 0.1804807884 * b,
    0.2126390059 * r + 0.7151686788 * g + 0.0721923154 * b,
    0.0193308187 * r + 0.1191947798 * g + 0.9505321522 * b,
  ];
}

function xyzToLinearRgb(
  x: number,
  y: number,
  z: number,
): [number, number, number] {
  return [
    3.2409699419 * x - 1.5373831776 * y - 0.4986107603 * z,
    -0.9692436363 * x + 1.8759675015 * y + 0.0415550574 * z,
    0.0556300797 * x - 0.2039769589 * y + 1.0569715142 * z,
  ];
}

// ── XYZ D65 ↔ Lab ───────────────────────────────────────────

const D65 = [0.3127 / 0.329, 1.0, (1.0 - 0.3127 - 0.329) / 0.329] as const;

function labF(t: number): number {
  const delta = 6 / 29;
  return t > delta ** 3 ? Math.cbrt(t) : t / (3 * delta * delta) + 4 / 29;
}

function labFInv(t: number): number {
  const delta = 6 / 29;
  return t > delta ? t ** 3 : 3 * delta * delta * (t - 4 / 29);
}

export function rgbToLab(rgb: RgbColor): LabColor {
  const lr = srgbToLinear(rgb.r / 255);
  const lg = srgbToLinear(rgb.g / 255);
  const lb = srgbToLinear(rgb.b / 255);
  const [x, y, z] = linearRgbToXyz(lr, lg, lb);
  const fx = labF(x / D65[0]);
  const fy = labF(y / D65[1]);
  const fz = labF(z / D65[2]);
  return {
    l: round(116 * fy - 16, 2),
    a: round(500 * (fx - fy), 2),
    b: round(200 * (fy - fz), 2),
    alpha: rgb.a,
  };
}

export function labToRgb(lab: LabColor): RgbColor {
  const fy = (lab.l + 16) / 116;
  const fx = lab.a / 500 + fy;
  const fz = fy - lab.b / 200;
  const x = labFInv(fx) * D65[0];
  const y = labFInv(fy) * D65[1];
  const z = labFInv(fz) * D65[2];
  const [lr, lg, lb] = xyzToLinearRgb(x, y, z);
  return linearToRgbColor(lr, lg, lb, lab.alpha);
}

// ── Lab ↔ LCH ───────────────────────────────────────────────

export function labToLch(lab: LabColor): LchColor {
  const c = Math.sqrt(lab.a ** 2 + lab.b ** 2);
  let h = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: lab.l, c: round(c, 2), h: round(h, 1), a: lab.alpha };
}

export function lchToLab(lch: LchColor): LabColor {
  const hRad = (lch.h * Math.PI) / 180;
  return {
    l: lch.l,
    a: round(lch.c * Math.cos(hRad), 2),
    b: round(lch.c * Math.sin(hRad), 2),
    alpha: lch.a,
  };
}

export function rgbToLch(rgb: RgbColor): LchColor {
  return labToLch(rgbToLab(rgb));
}

export function lchToRgb(lch: LchColor): RgbColor {
  return labToRgb(lchToLab(lch));
}

// ── sRGB linear ↔ OKLab ────────────────────────────────────

function linearRgbToOklab(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
}

function oklabToLinearRgb(
  L: number,
  a: number,
  b: number,
): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export function rgbToOklab(rgb: RgbColor): OklabColor {
  const lr = srgbToLinear(rgb.r / 255);
  const lg = srgbToLinear(rgb.g / 255);
  const lb = srgbToLinear(rgb.b / 255);
  const [l, a, b] = linearRgbToOklab(lr, lg, lb);
  return { l: round(l, 4), a: round(a, 4), b: round(b, 4), alpha: rgb.a };
}

export function oklabToRgb(oklab: OklabColor): RgbColor {
  const [lr, lg, lb] = oklabToLinearRgb(oklab.l, oklab.a, oklab.b);
  return linearToRgbColor(lr, lg, lb, oklab.alpha);
}

// ── OKLab ↔ OKLCH ───────────────────────────────────────────

export function oklabToOklch(oklab: OklabColor): OklchColor {
  const c = Math.sqrt(oklab.a ** 2 + oklab.b ** 2);
  let h = (Math.atan2(oklab.b, oklab.a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: oklab.l, c: round(c, 4), h: round(h, 1), a: oklab.alpha };
}

export function oklchToOklab(oklch: OklchColor): OklabColor {
  const hRad = (oklch.h * Math.PI) / 180;
  return {
    l: oklch.l,
    a: round(oklch.c * Math.cos(hRad), 4),
    b: round(oklch.c * Math.sin(hRad), 4),
    alpha: oklch.a,
  };
}

// ── RGB ↔ OKLCH (convenience) ───────────────────────────────

export function rgbToOklch(rgb: RgbColor): OklchColor {
  return oklabToOklch(rgbToOklab(rgb));
}

export function oklchToRgb(oklch: OklchColor): RgbColor {
  return oklabToRgb(oklchToOklab(oklch));
}

// ── Display-P3 ↔ XYZ D65 ───────────────────────────────────

function p3ToXyz(r: number, g: number, b: number): [number, number, number] {
  // Display P3 uses the same gamma as sRGB
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  return [
    0.4865709486 * lr + 0.2656676932 * lg + 0.1982172852 * lb,
    0.2289745641 * lr + 0.6917385218 * lg + 0.0792869141 * lb,
    0.0 * lr + 0.0451133819 * lg + 1.0439443689 * lb,
  ];
}

function xyzToP3(x: number, y: number, z: number): [number, number, number] {
  const lr = 2.4934969119 * x - 0.9313836179 * y - 0.4027107845 * z;
  const lg = -0.8294889696 * x + 1.7626640603 * y + 0.0236246858 * z;
  const lb = 0.0358458302 * x - 0.0761723893 * y + 0.956884524 * z;
  return [linearToSrgb(lr), linearToSrgb(lg), linearToSrgb(lb)];
}

export function rgbToP3(rgb: RgbColor): P3Color {
  const lr = srgbToLinear(rgb.r / 255);
  const lg = srgbToLinear(rgb.g / 255);
  const lb = srgbToLinear(rgb.b / 255);
  const [x, y, z] = linearRgbToXyz(lr, lg, lb);
  const [pr, pg, pb] = xyzToP3(x, y, z);
  return { r: round(pr, 4), g: round(pg, 4), b: round(pb, 4), a: rgb.a };
}

export function p3ToRgb(p3: P3Color): RgbColor {
  const [x, y, z] = p3ToXyz(p3.r, p3.g, p3.b);
  const [lr, lg, lb] = xyzToLinearRgb(x, y, z);
  return linearToRgbColor(lr, lg, lb, p3.a);
}

// ── A98-RGB ↔ XYZ D65 ──────────────────────────────────────

function a98ToLinear(c: number): number {
  return Math.sign(c) * Math.abs(c) ** (563 / 256);
}

function linearToA98(c: number): number {
  return Math.sign(c) * Math.abs(c) ** (256 / 563);
}

function a98LinearToXyz(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  return [
    0.5766690429 * r + 0.1855582379 * g + 0.1882286462 * b,
    0.2973449753 * r + 0.6273635663 * g + 0.0752914585 * b,
    0.0270313614 * r + 0.0706888525 * g + 0.9913375368 * b,
  ];
}

function xyzToA98Linear(
  x: number,
  y: number,
  z: number,
): [number, number, number] {
  return [
    2.0415879039 * x - 0.5650069743 * y - 0.3447313508 * z,
    -0.9692436363 * x + 1.8759675015 * y + 0.0415550574 * z,
    0.0134442806 * x - 0.1183623922 * y + 1.0151749944 * z,
  ];
}

export function rgbToA98(rgb: RgbColor): P3Color {
  const lr = srgbToLinear(rgb.r / 255);
  const lg = srgbToLinear(rgb.g / 255);
  const lb = srgbToLinear(rgb.b / 255);
  const [x, y, z] = linearRgbToXyz(lr, lg, lb);
  const [ar, ag, ab] = xyzToA98Linear(x, y, z);
  return {
    r: round(linearToA98(ar), 4),
    g: round(linearToA98(ag), 4),
    b: round(linearToA98(ab), 4),
    a: rgb.a,
  };
}

export function a98ToRgb(a98: P3Color): RgbColor {
  const lr = a98ToLinear(a98.r);
  const lg = a98ToLinear(a98.g);
  const lb = a98ToLinear(a98.b);
  const [x, y, z] = a98LinearToXyz(lr, lg, lb);
  const [sr, sg, sb] = xyzToLinearRgb(x, y, z);
  return linearToRgbColor(sr, sg, sb, a98.a);
}

// ── ProPhoto RGB ↔ XYZ D50 → D65 ───────────────────────────

function prophotoToLinear(c: number): number {
  return Math.abs(c) <= 1 / 512 ? c / 16 : Math.sign(c) * Math.abs(c) ** 1.8;
}

function linearToProphoto(c: number): number {
  return Math.abs(c) >= 1 / 512
    ? Math.sign(c) * Math.abs(c) ** (1 / 1.8)
    : 16 * c;
}

// D50 to D65 chromatic adaptation (Bradford)
function d50ToD65(x: number, y: number, z: number): [number, number, number] {
  return [
    0.9554734528 * x - 0.0230985369 * y + 0.0632593086 * z,
    -0.0283697069 * x + 1.009995458 * y + 0.0210415381 * z,
    0.0123140016 * x - 0.0205076964 * y + 1.3303659366 * z,
  ];
}

function d65ToD50(x: number, y: number, z: number): [number, number, number] {
  return [
    1.0479298208 * x + 0.0229467933 * y - 0.0501922295 * z,
    0.0296278156 * x + 0.9904344268 * y - 0.017073825 * z,
    -0.0092430581 * x + 0.0150551448 * y + 0.752151586 * z,
  ];
}

export function rgbToProphoto(rgb: RgbColor): P3Color {
  const lr = srgbToLinear(rgb.r / 255);
  const lg = srgbToLinear(rgb.g / 255);
  const lb = srgbToLinear(rgb.b / 255);
  const [x65, y65, z65] = linearRgbToXyz(lr, lg, lb);
  const [x50, y50, z50] = d65ToD50(x65, y65, z65);
  // XYZ D50 → ProPhoto linear
  const pr = 1.345943301 * x50 - 0.2556075298 * y50 - 0.0511118294 * z50;
  const pg = -0.5445989113 * x50 + 1.508167343 * y50 + 0.0205351443 * z50;
  const pb = 0.0 * x50 + 0.0 * y50 + 1.2118127757 * z50;
  return {
    r: round(linearToProphoto(pr), 4),
    g: round(linearToProphoto(pg), 4),
    b: round(linearToProphoto(pb), 4),
    a: rgb.a,
  };
}

export function prophotoToRgb(pp: P3Color): RgbColor {
  const lr = prophotoToLinear(pp.r);
  const lg = prophotoToLinear(pp.g);
  const lb = prophotoToLinear(pp.b);
  // ProPhoto linear → XYZ D50
  const x50 = 0.7977604896 * lr + 0.1351917082 * lg + 0.0313493495 * lb;
  const y50 = 0.2880711282 * lr + 0.7118432178 * lg + 0.000085654 * lb;
  const z50 = 0.0 * lr + 0.0 * lg + 0.8251046026 * lb;
  const [x65, y65, z65] = d50ToD65(x50, y50, z50);
  const [sr, sg, sb] = xyzToLinearRgb(x65, y65, z65);
  return linearToRgbColor(sr, sg, sb, pp.a);
}

// ── Rec2020 ↔ XYZ D65 ──────────────────────────────────────

const REC2020_ALPHA = 1.09929682680944;
const REC2020_BETA = 0.018053968510807;

function rec2020ToLinear(c: number): number {
  return Math.abs(c) < REC2020_BETA * 4.5
    ? c / 4.5
    : Math.sign(c) *
        ((Math.abs(c) + REC2020_ALPHA - 1) / REC2020_ALPHA) ** (1 / 0.45);
}

function linearToRec2020(c: number): number {
  return Math.abs(c) >= REC2020_BETA
    ? Math.sign(c) * (REC2020_ALPHA * Math.abs(c) ** 0.45 - (REC2020_ALPHA - 1))
    : 4.5 * c;
}

function rec2020LinearToXyz(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  return [
    0.6369580483 * r + 0.1446169036 * g + 0.1688809752 * b,
    0.262700212 * r + 0.6779980715 * g + 0.0593017165 * b,
    0.0 * r + 0.028072693 * g + 1.0609850577 * b,
  ];
}

function xyzToRec2020Linear(
  x: number,
  y: number,
  z: number,
): [number, number, number] {
  return [
    1.716651188 * x - 0.3556707838 * y - 0.2533662814 * z,
    -0.6666843518 * x + 1.6164812366 * y + 0.0157685458 * z,
    0.0176398574 * x - 0.0427706133 * y + 0.9421031212 * z,
  ];
}

export function rgbToRec2020(rgb: RgbColor): P3Color {
  const lr = srgbToLinear(rgb.r / 255);
  const lg = srgbToLinear(rgb.g / 255);
  const lb = srgbToLinear(rgb.b / 255);
  const [x, y, z] = linearRgbToXyz(lr, lg, lb);
  const [rr, rg, rb] = xyzToRec2020Linear(x, y, z);
  return {
    r: round(linearToRec2020(rr), 4),
    g: round(linearToRec2020(rg), 4),
    b: round(linearToRec2020(rb), 4),
    a: rgb.a,
  };
}

export function rec2020ToRgb(rec: P3Color): RgbColor {
  const lr = rec2020ToLinear(rec.r);
  const lg = rec2020ToLinear(rec.g);
  const lb = rec2020ToLinear(rec.b);
  const [x, y, z] = rec2020LinearToXyz(lr, lg, lb);
  const [sr, sg, sb] = xyzToLinearRgb(x, y, z);
  return linearToRgbColor(sr, sg, sb, rec.a);
}

// ── Gamut checking ──────────────────────────────────────────

function isInRange(
  v: number,
  min: number,
  max: number,
  epsilon = 0.001,
): boolean {
  return v >= min - epsilon && v <= max + epsilon;
}

/** Get unclamped linear sRGB. Uses the preserved `linear` triplet when
 *  available (wide-gamut parsed colors), otherwise derives from clamped r/g/b. */
function getLinearRgb(rgb: RgbColor): [number, number, number] {
  if (rgb.linear) return rgb.linear;
  return [
    srgbToLinear(rgb.r / 255),
    srgbToLinear(rgb.g / 255),
    srgbToLinear(rgb.b / 255),
  ];
}

/** Get unclamped XYZ D65 from an RgbColor, preserving wide-gamut precision. */
function getXyz(rgb: RgbColor): [number, number, number] {
  const [lr, lg, lb] = getLinearRgb(rgb);
  return linearRgbToXyz(lr, lg, lb);
}

export function isInSrgb(rgb: RgbColor): boolean {
  const [lr, lg, lb] = getLinearRgb(rgb);
  return isInRange(lr, 0, 1) && isInRange(lg, 0, 1) && isInRange(lb, 0, 1);
}

export function isInP3(rgb: RgbColor): boolean {
  const [x, y, z] = getXyz(rgb);
  const [pr, pg, pb] = xyzToP3(x, y, z);
  return isInRange(pr, 0, 1) && isInRange(pg, 0, 1) && isInRange(pb, 0, 1);
}

export function isInA98(rgb: RgbColor): boolean {
  const [x, y, z] = getXyz(rgb);
  const [ar, ag, ab] = xyzToA98Linear(x, y, z);
  const r = linearToA98(ar);
  const g = linearToA98(ag);
  const b = linearToA98(ab);
  return isInRange(r, 0, 1) && isInRange(g, 0, 1) && isInRange(b, 0, 1);
}

export function isInProphoto(rgb: RgbColor): boolean {
  const [x65, y65, z65] = getXyz(rgb);
  const [x50, y50, z50] = d65ToD50(x65, y65, z65);
  const pr = 1.345943301 * x50 - 0.2556075298 * y50 - 0.0511118294 * z50;
  const pg = -0.5445989113 * x50 + 1.508167343 * y50 + 0.0205351443 * z50;
  const pb = 0.0 * x50 + 0.0 * y50 + 1.2118127757 * z50;
  const r = linearToProphoto(pr);
  const g = linearToProphoto(pg);
  const b = linearToProphoto(pb);
  return isInRange(r, 0, 1) && isInRange(g, 0, 1) && isInRange(b, 0, 1);
}

export function isInRec2020(rgb: RgbColor): boolean {
  const [x, y, z] = getXyz(rgb);
  const [rr, rg, rb] = xyzToRec2020Linear(x, y, z);
  const r = linearToRec2020(rr);
  const g = linearToRec2020(rg);
  const b = linearToRec2020(rb);
  return isInRange(r, 0, 1) && isInRange(g, 0, 1) && isInRange(b, 0, 1);
}

export function getGamuts(rgb: RgbColor): Gamut[] {
  const gamuts: Gamut[] = [];
  if (isInSrgb(rgb)) gamuts.push("srgb");
  if (isInP3(rgb)) gamuts.push("display-p3");
  if (isInA98(rgb)) gamuts.push("a98-rgb");
  if (isInRec2020(rgb)) gamuts.push("rec2020");
  if (isInProphoto(rgb)) gamuts.push("prophoto-rgb");
  return gamuts;
}

// ── CSS string formatting ───────────────────────────────────

export function formatCss(rgb: RgbColor, format: ColorFormat): string {
  const alphaStr = (a: number) => (a < 1 ? ` / ${round(a * 100, 1)}%` : "");

  // For wide-gamut / perceptual formats, use unclamped linear sRGB → XYZ path
  // so parsed wide-gamut colors round-trip accurately.
  const [lr, lg, lb] = getLinearRgb(rgb);

  switch (format) {
    case "hex":
      return rgbToHex(rgb);

    case "rgb":
      return `rgb(${Math.round(rgb.r)} ${Math.round(rgb.g)} ${Math.round(rgb.b)}${alphaStr(rgb.a)})`;

    case "hsl": {
      const hsl = rgbToHsl(rgb);
      return `hsl(${round(hsl.h, 1)} ${round(hsl.s, 1)}% ${round(hsl.l, 1)}%${alphaStr(hsl.a)})`;
    }

    case "hwb": {
      const hwb = rgbToHwb(rgb);
      return `hwb(${round(hwb.h, 1)} ${round(hwb.w, 1)}% ${round(hwb.b, 1)}%${alphaStr(hwb.a)})`;
    }

    case "lab": {
      const [x, y, z] = linearRgbToXyz(lr, lg, lb);
      const [x50, y50, z50] = d65ToD50(x, y, z);
      const L = labF(y50 / D65[1]) * 116 - 16;
      const a = (labF(x50 / D65[0]) - labF(y50 / D65[1])) * 500;
      const b = (labF(y50 / D65[1]) - labF(z50 / D65[2])) * 200;
      return `lab(${round(L, 2)}% ${round(a, 2)} ${round(b, 2)}${alphaStr(rgb.a)})`;
    }

    case "lch": {
      const [x, y, z] = linearRgbToXyz(lr, lg, lb);
      const [x50, y50, z50] = d65ToD50(x, y, z);
      const L = labF(y50 / D65[1]) * 116 - 16;
      const a = (labF(x50 / D65[0]) - labF(y50 / D65[1])) * 500;
      const b = (labF(y50 / D65[1]) - labF(z50 / D65[2])) * 200;
      const c = Math.sqrt(a * a + b * b);
      const h = mod(Math.atan2(b, a) * (180 / Math.PI), 360);
      return `lch(${round(L, 2)}% ${round(c, 2)} ${round(h, 1)}${alphaStr(rgb.a)})`;
    }

    case "oklab": {
      const [ol, oa, ob] = linearRgbToOklab(lr, lg, lb);
      return `oklab(${round(ol * 100, 2)}% ${round(oa, 4)} ${round(ob, 4)}${alphaStr(rgb.a)})`;
    }

    case "oklch": {
      const [ol, oa, ob] = linearRgbToOklab(lr, lg, lb);
      const c = Math.sqrt(oa * oa + ob * ob);
      const h = mod(Math.atan2(ob, oa) * (180 / Math.PI), 360);
      return `oklch(${round(ol * 100, 2)}% ${round(c, 4)} ${round(h, 1)}${alphaStr(rgb.a)})`;
    }

    case "display-p3": {
      const [x, y, z] = linearRgbToXyz(lr, lg, lb);
      const [pr, pg, pb] = xyzToP3(x, y, z);
      return `color(display-p3 ${round(pr, 4)} ${round(pg, 4)} ${round(pb, 4)}${alphaStr(rgb.a)})`;
    }

    case "a98-rgb": {
      const [x, y, z] = linearRgbToXyz(lr, lg, lb);
      const [ar, ag, ab] = xyzToA98Linear(x, y, z);
      return `color(a98-rgb ${round(linearToA98(ar), 4)} ${round(linearToA98(ag), 4)} ${round(linearToA98(ab), 4)}${alphaStr(rgb.a)})`;
    }

    case "prophoto-rgb": {
      const [x65, y65, z65] = linearRgbToXyz(lr, lg, lb);
      const [x50, y50, z50] = d65ToD50(x65, y65, z65);
      const pr = 1.345943301 * x50 - 0.2556075298 * y50 - 0.0511118294 * z50;
      const pg = -0.5445989113 * x50 + 1.508167343 * y50 + 0.0205351443 * z50;
      const pb = 0.0 * x50 + 0.0 * y50 + 1.2118127757 * z50;
      return `color(prophoto-rgb ${round(linearToProphoto(pr), 4)} ${round(linearToProphoto(pg), 4)} ${round(linearToProphoto(pb), 4)}${alphaStr(rgb.a)})`;
    }

    case "rec2020": {
      const [x, y, z] = linearRgbToXyz(lr, lg, lb);
      const [rr, rg, rb] = xyzToRec2020Linear(x, y, z);
      return `color(rec2020 ${round(linearToRec2020(rr), 4)} ${round(linearToRec2020(rg), 4)} ${round(linearToRec2020(rb), 4)}${alphaStr(rgb.a)})`;
    }
  }
}

// ── CSS string parsing ──────────────────────────────────────

export function parseCssColor(input: string): RgbColor | null {
  const s = input.trim().toLowerCase();

  // Hex
  if (s.startsWith("#")) return hexToRgb(s);

  // Named colors (common subset)
  const named = NAMED_COLORS[s];
  if (named) return hexToRgb(named);

  // Function-form colors
  const match = s.match(/^(\w[\w-]*)\((.+)\)$/);
  if (!match) return null;
  const [, fn, args] = match;
  const parts = args
    .replace(/,/g, " ")
    .replace(/\//g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const parseNum = (v: string, max = Infinity): number => {
    if (v.endsWith("%")) return (parseFloat(v) / 100) * max;
    return parseFloat(v);
  };

  const parseAlpha = (v?: string): number => {
    if (!v) return 1;
    if (v.endsWith("%")) return clamp(parseFloat(v) / 100, 0, 1);
    return clamp(parseFloat(v), 0, 1);
  };

  switch (fn) {
    case "rgb":
    case "rgba": {
      if (parts.length < 3) return null;
      return {
        r: clamp(parseNum(parts[0], 255), 0, 255),
        g: clamp(parseNum(parts[1], 255), 0, 255),
        b: clamp(parseNum(parts[2], 255), 0, 255),
        a: parseAlpha(parts[3]),
      };
    }
    case "hsl":
    case "hsla": {
      if (parts.length < 3) return null;
      return hslToRgb({
        h: parseFloat(parts[0]),
        s: parseFloat(parts[1]),
        l: parseFloat(parts[2]),
        a: parseAlpha(parts[3]),
      });
    }
    case "hwb": {
      if (parts.length < 3) return null;
      return hwbToRgb({
        h: parseFloat(parts[0]),
        w: parseFloat(parts[1]),
        b: parseFloat(parts[2]),
        a: parseAlpha(parts[3]),
      });
    }
    case "lab": {
      if (parts.length < 3) return null;
      return labToRgb({
        l: parseNum(parts[0], 100),
        a: parseFloat(parts[1]),
        b: parseFloat(parts[2]),
        alpha: parseAlpha(parts[3]),
      });
    }
    case "lch": {
      if (parts.length < 3) return null;
      return lchToRgb({
        l: parseNum(parts[0], 100),
        c: parseFloat(parts[1]),
        h: parseFloat(parts[2]),
        a: parseAlpha(parts[3]),
      });
    }
    case "oklab": {
      if (parts.length < 3) return null;
      return oklabToRgb({
        l: parseNum(parts[0], 1),
        a: parseFloat(parts[1]),
        b: parseFloat(parts[2]),
        alpha: parseAlpha(parts[3]),
      });
    }
    case "oklch": {
      if (parts.length < 3) return null;
      return oklchToRgb({
        l: parseNum(parts[0], 1),
        c: parseFloat(parts[1]),
        h: parseFloat(parts[2]),
        a: parseAlpha(parts[3]),
      });
    }
    case "color": {
      // color(display-p3 r g b / a) — first part is colorspace
      if (parts.length < 4) return null;
      const space = parts[0];
      const r = parseFloat(parts[1]);
      const g = parseFloat(parts[2]);
      const b = parseFloat(parts[3]);
      const a = parseAlpha(parts[4]);
      const c = { r, g, b, a };
      switch (space) {
        case "display-p3":
          return p3ToRgb(c);
        case "a98-rgb":
          return a98ToRgb(c);
        case "prophoto-rgb":
          return prophotoToRgb(c);
        case "rec2020":
          return rec2020ToRgb(c);
        case "srgb":
          return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255),
            a,
          };
        default:
          return null;
      }
    }
    default:
      return null;
  }
}

// ── Contrast ────────────────────────────────────────────────

function relativeLuminance(rgb: RgbColor): number {
  const r = srgbToLinear(rgb.r / 255);
  const g = srgbToLinear(rgb.g / 255);
  const b = srgbToLinear(rgb.b / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(c1: RgbColor, c2: RgbColor): ContrastResult {
  const l1 = relativeLuminance(c1);
  const l2 = relativeLuminance(c2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = round((lighter + 0.05) / (darker + 0.05), 2);
  return {
    ratio,
    aa: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaa: ratio >= 7,
    aaaLarge: ratio >= 4.5,
  };
}

/** Suggest a foreground color that meets the given contrast ratio against `bg`.
 *  Adjusts OKLCH lightness via binary search while preserving chroma and hue.
 *  Searches in one direction (lighter or darker) and finds the value closest
 *  to the original lightness that still meets the target ratio.
 *  Returns null if no solution exists in the given direction. */
export function suggestContrast(
  fg: RgbColor,
  bg: RgbColor,
  targetRatio: number,
): { lighter: RgbColor | null; darker: RgbColor | null } {
  const oklch = rgbToOklch(fg);

  function search(boundL: number): RgbColor | null {
    // boundL is the extreme end (0 or 1). Check if extreme even passes.
    const extreme = oklchToRgb({ ...oklch, l: boundL });
    if (contrastRatio(extreme, bg).ratio < targetRatio) return null;

    // Binary search: find L closest to oklch.l that still meets target
    let lo = Math.min(oklch.l, boundL);
    let hi = Math.max(oklch.l, boundL);
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      const candidate = oklchToRgb({ ...oklch, l: mid });
      const r = contrastRatio(candidate, bg).ratio;
      if (r >= targetRatio) {
        // Passes — move closer to original
        if (boundL > oklch.l) hi = mid;
        else lo = mid;
      } else {
        // Fails — move toward extreme
        if (boundL > oklch.l) lo = mid;
        else hi = mid;
      }
    }
    const finalL = boundL > oklch.l ? hi : lo;
    const final = oklchToRgb({ ...oklch, l: finalL });
    return contrastRatio(final, bg).ratio >= targetRatio ? final : null;
  }

  return {
    lighter: search(1),
    darker: search(0),
  };
}

// ── Harmony / Palette ───────────────────────────────────────

export function generateHarmony(rgb: RgbColor, type: HarmonyType): RgbColor[] {
  const hsl = rgbToHsl(rgb);

  const rotateHue = (h: number, deg: number): number => mod(h + deg, 360);

  switch (type) {
    case "complementary":
      return [rgb, hslToRgb({ ...hsl, h: rotateHue(hsl.h, 180) })];

    case "analogous":
      return [
        hslToRgb({ ...hsl, h: rotateHue(hsl.h, -30) }),
        rgb,
        hslToRgb({ ...hsl, h: rotateHue(hsl.h, 30) }),
      ];

    case "triadic":
      return [
        rgb,
        hslToRgb({ ...hsl, h: rotateHue(hsl.h, 120) }),
        hslToRgb({ ...hsl, h: rotateHue(hsl.h, 240) }),
      ];

    case "split-complementary":
      return [
        rgb,
        hslToRgb({ ...hsl, h: rotateHue(hsl.h, 150) }),
        hslToRgb({ ...hsl, h: rotateHue(hsl.h, 210) }),
      ];

    case "tetradic":
      return [
        rgb,
        hslToRgb({ ...hsl, h: rotateHue(hsl.h, 90) }),
        hslToRgb({ ...hsl, h: rotateHue(hsl.h, 180) }),
        hslToRgb({ ...hsl, h: rotateHue(hsl.h, 270) }),
      ];

    case "monochromatic":
      return [
        hslToRgb({ ...hsl, l: clamp(hsl.l - 30, 0, 100) }),
        hslToRgb({ ...hsl, l: clamp(hsl.l - 15, 0, 100) }),
        rgb,
        hslToRgb({ ...hsl, l: clamp(hsl.l + 15, 0, 100) }),
        hslToRgb({ ...hsl, l: clamp(hsl.l + 30, 0, 100) }),
      ];
  }
}

// ── Named CSS colors (subset) ───────────────────────────────

const NAMED_COLORS: Record<string, string> = {
  transparent: "#00000000",
  black: "#000000",
  white: "#ffffff",
  red: "#ff0000",
  green: "#008000",
  blue: "#0000ff",
  yellow: "#ffff00",
  cyan: "#00ffff",
  magenta: "#ff00ff",
  orange: "#ffa500",
  purple: "#800080",
  pink: "#ffc0cb",
  lime: "#00ff00",
  maroon: "#800000",
  navy: "#000080",
  olive: "#808000",
  teal: "#008080",
  aqua: "#00ffff",
  fuchsia: "#ff00ff",
  silver: "#c0c0c0",
  gray: "#808080",
  grey: "#808080",
  coral: "#ff7f50",
  salmon: "#fa8072",
  tomato: "#ff6347",
  gold: "#ffd700",
  khaki: "#f0e68c",
  violet: "#ee82ee",
  indigo: "#4b0082",
  turquoise: "#40e0d0",
  tan: "#d2b48c",
  crimson: "#dc143c",
  orchid: "#da70d6",
  plum: "#dda0dd",
  sienna: "#a0522d",
  peru: "#cd853f",
  chocolate: "#d2691e",
  firebrick: "#b22222",
  darkred: "#8b0000",
  darkgreen: "#006400",
  darkblue: "#00008b",
  darkcyan: "#008b8b",
  darkmagenta: "#8b008b",
  darkorange: "#ff8c00",
  darkviolet: "#9400d3",
  deeppink: "#ff1493",
  deepskyblue: "#00bfff",
  dodgerblue: "#1e90ff",
  forestgreen: "#228b22",
  hotpink: "#ff69b4",
  lawngreen: "#7cfc00",
  lemonchiffon: "#fffacd",
  lightblue: "#add8e6",
  lightcoral: "#f08080",
  lightgreen: "#90ee90",
  lightgray: "#d3d3d3",
  lightgrey: "#d3d3d3",
  lightyellow: "#ffffe0",
  mediumblue: "#0000cd",
  mediumpurple: "#9370db",
  midnightblue: "#191970",
  mintcream: "#f5fffa",
  mistyrose: "#ffe4e1",
  moccasin: "#ffe4b5",
  navajowhite: "#ffdead",
  oldlace: "#fdf5e6",
  orangered: "#ff4500",
  palegreen: "#98fb98",
  papayawhip: "#ffefd5",
  peachpuff: "#ffdab9",
  powderblue: "#b0e0e6",
  rosybrown: "#bc8f8f",
  royalblue: "#4169e1",
  saddlebrown: "#8b4513",
  sandybrown: "#f4a460",
  seagreen: "#2e8b57",
  seashell: "#fff5ee",
  skyblue: "#87ceeb",
  slateblue: "#6a5acd",
  slategray: "#708090",
  slategrey: "#708090",
  springgreen: "#00ff7f",
  steelblue: "#4682b4",
  thistle: "#d8bfd8",
  wheat: "#f5deb3",
  whitesmoke: "#f5f5f5",
  yellowgreen: "#9acd32",
  rebeccapurple: "#663399",
  aliceblue: "#f0f8ff",
  antiquewhite: "#faebd7",
  aquamarine: "#7fffd4",
  azure: "#f0ffff",
  beige: "#f5f5dc",
  bisque: "#ffe4c4",
  blanchedalmond: "#ffebcd",
  blueviolet: "#8a2be2",
  brown: "#a52a2a",
  burlywood: "#deb887",
  cadetblue: "#5f9ea0",
  chartreuse: "#7fff00",
  cornflowerblue: "#6495ed",
  cornsilk: "#fff8dc",
  darkgoldenrod: "#b8860b",
  darkgray: "#a9a9a9",
  darkgrey: "#a9a9a9",
  darkolivegreen: "#556b2f",
  darkorchid: "#9932cc",
  darksalmon: "#e9967a",
  darkseagreen: "#8fbc8f",
  darkslateblue: "#483d8b",
  darkslategray: "#2f4f4f",
  darkslategrey: "#2f4f4f",
  darkturquoise: "#00ced1",
  dimgray: "#696969",
  dimgrey: "#696969",
  floralwhite: "#fffaf0",
  gainsboro: "#dcdcdc",
  ghostwhite: "#f8f8ff",
  goldenrod: "#daa520",
  greenyellow: "#adff2f",
  honeydew: "#f0fff0",
  ivory: "#fffff0",
  lavender: "#e6e6fa",
  lavenderblush: "#fff0f5",
  lightcyan: "#e0ffff",
  lightgoldenrodyellow: "#fafad2",
  lightpink: "#ffb6c1",
  lightsalmon: "#ffa07a",
  lightseagreen: "#20b2aa",
  lightskyblue: "#87cefa",
  lightslategray: "#778899",
  lightslategrey: "#778899",
  lightsteelblue: "#b0c4de",
  limegreen: "#32cd32",
  linen: "#faf0e6",
  mediumaquamarine: "#66cdaa",
  mediumorchid: "#ba55d3",
  mediumseagreen: "#3cb371",
  mediumslateblue: "#7b68ee",
  mediumspringgreen: "#00fa9a",
  mediumturquoise: "#48d1cc",
  mediumvioletred: "#c71585",
  paleturquoise: "#afeeee",
  palevioletred: "#db7093",
};
