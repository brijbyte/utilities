export type ColorModel = "rgb" | "hsl" | "hwb" | "oklch";

export const COLOR_MODELS: { value: ColorModel; label: string }[] = [
  { value: "rgb", label: "RGB" },
  { value: "hsl", label: "HSL" },
  { value: "hwb", label: "HWB" },
  { value: "oklch", label: "OKLCH" },
];
