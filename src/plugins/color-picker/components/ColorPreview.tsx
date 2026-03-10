import { useMemo, useState, useCallback } from "react";
import { Pipette, Copy, Check, MonitorSmartphone } from "lucide-react";
import type { RgbColor } from "../utils/types";
import { rgbToHex, rgbToHsl } from "../utils/color";
import { ScreenCapturePicker } from "./ScreenCapturePicker";

interface Props {
  rgb: RgbColor;
  onColorChange: (rgb: RgbColor) => void;
}

export function ColorPreview({ rgb, onColorChange }: Props) {
  const hex = rgbToHex(rgb);
  const hsl = rgbToHsl(rgb);
  const [copied, setCopied] = useState(false);
  const [showCapturePicker, setShowCapturePicker] = useState(false);

  const isLight = hsl.l > 60;

  const supportsEyedropper = useMemo(
    () => typeof window !== "undefined" && "EyeDropper" in window,
    [],
  );

  const supportsDisplayMedia = useMemo(
    () =>
      typeof window !== "undefined" &&
      !!navigator.mediaDevices?.getDisplayMedia,
    [],
  );

  const pickNativeEyedropper = useCallback(async () => {
    try {
      // @ts-expect-error EyeDropper is not yet in TS lib
      const dropper = new window.EyeDropper();
      const result = await dropper.open();
      if (result?.sRGBHex) {
        const parsed = parseHexDirect(result.sRGBHex);
        if (parsed) onColorChange(parsed);
      }
    } catch {
      // User cancelled or unsupported
    }
  }, [onColorChange]);

  const handlePickClick = useCallback(() => {
    if (supportsEyedropper) {
      pickNativeEyedropper();
    } else {
      setShowCapturePicker(true);
    }
  }, [supportsEyedropper, pickNativeEyedropper, setShowCapturePicker]);

  const handleCapturePick = useCallback(
    (pickedRgb: RgbColor) => {
      onColorChange(pickedRgb);
      setShowCapturePicker(false);
    },
    [onColorChange, setShowCapturePicker],
  );

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [hex]);

  const canPick = supportsEyedropper || supportsDisplayMedia;

  return (
    <>
      <div className="flex items-center gap-3">
        {/* Large swatch */}
        <div className="relative shrink-0">
          <div
            className="w-16 h-16 rounded-lg border border-border shadow-sm"
            style={{
              backgroundImage: `
                linear-gradient(${hex}, ${hex}),
                repeating-conic-gradient(#d0d0d0 0% 25%, #ffffff 0% 50%)
              `,
              backgroundSize: "100% 100%, 8px 8px",
            }}
          />
          {canPick && (
            <button
              onClick={handlePickClick}
              className="absolute -bottom-1 -right-1 p-1 rounded-full bg-bg-surface border border-border shadow-sm hover:bg-bg-hover transition-colors cursor-pointer"
              title={
                supportsEyedropper
                  ? "Pick color from screen"
                  : "Capture screen to pick color"
              }
            >
              {supportsEyedropper ? (
                <Pipette size={12} className="text-text-muted" />
              ) : (
                <MonitorSmartphone size={12} className="text-text-muted" />
              )}
            </button>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-text font-mono">{hex}</span>
            <button
              onClick={handleCopy}
              className="p-0.5 rounded text-text-muted hover:text-text transition-colors cursor-pointer"
              title="Copy hex"
            >
              {copied ? (
                <Check size={12} className="text-success" />
              ) : (
                <Copy size={12} />
              )}
            </button>
          </div>
          <div className="text-xs text-text-muted">
            {isLight ? "Light" : "Dark"} · H:{Math.round(hsl.h)}° S:
            {Math.round(hsl.s)}% L:{Math.round(hsl.l)}%
            {rgb.a < 1 && ` · ${Math.round(rgb.a * 100)}% opacity`}
          </div>
        </div>
      </div>

      {/* Screen capture picker overlay */}
      {showCapturePicker && (
        <ScreenCapturePicker
          onPick={handleCapturePick}
          onClose={() => setShowCapturePicker(false)}
        />
      )}
    </>
  );
}

function parseHexDirect(hex: string): RgbColor | null {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  if (hex.length !== 6) return null;
  const n = parseInt(hex, 16);
  if (isNaN(n)) return null;
  return {
    r: (n >> 16) & 0xff,
    g: (n >> 8) & 0xff,
    b: n & 0xff,
    a: 1,
  };
}
