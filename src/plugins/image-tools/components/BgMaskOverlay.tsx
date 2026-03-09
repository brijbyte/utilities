import { useEffect, useRef, useState } from "react";
import type { BgRemoveConfig } from "../utils/bg-remove";

interface BgMaskOverlayProps {
  mask: Float32Array;
  maskW: number;
  maskH: number;
  imgWidth: number;
  imgHeight: number;
  config: BgRemoveConfig;
}

/**
 * Canvas-based overlay that visualises the segmentation mask.
 *
 * Person pixels are shown as a translucent green tint.
 * Background pixels are shown as a translucent red tint.
 * The overlay uses the same threshold + edge softness settings
 * as the actual processing so the preview matches the output.
 *
 * The mask is rendered to an OffscreenCanvas at mask resolution,
 * then displayed via object URL — lightweight regardless of the
 * original image size.
 */
export function BgMaskOverlay({
  mask,
  maskW,
  maskH,
  config,
}: BgMaskOverlayProps) {
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null);
  const prevUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Render mask to a small canvas at mask resolution
    const canvas = new OffscreenCanvas(maskW, maskH);
    const ctx = canvas.getContext("2d")!;
    const imageData = ctx.createImageData(maskW, maskH);
    const pixels = imageData.data;

    const { threshold, edgeSoftness } = config;
    const softLo = Math.max(0, threshold - edgeSoftness);
    const softHi = Math.min(1, threshold + edgeSoftness);
    const softRange = softHi - softLo;

    for (let i = 0; i < mask.length; i++) {
      const confidence = mask[i];

      let alpha: number;
      if (softRange > 0.001) {
        alpha = Math.min(1, Math.max(0, (confidence - softLo) / softRange));
      } else {
        alpha = confidence >= threshold ? 1 : 0;
      }

      const idx = i * 4;

      if (alpha > 0.5) {
        // Person — subtle green tint
        pixels[idx] = 0; // R
        pixels[idx + 1] = 200; // G
        pixels[idx + 2] = 80; // B
        pixels[idx + 3] = Math.round(40 + alpha * 30); // ~40-70 opacity
      } else {
        // Background — subtle red tint
        pixels[idx] = 220; // R
        pixels[idx + 1] = 40; // G
        pixels[idx + 2] = 40; // B
        pixels[idx + 3] = Math.round((1 - alpha) * 80); // ~0-80 opacity
      }
    }

    ctx.putImageData(imageData, 0, 0);

    let cancelled = false;
    canvas.convertToBlob({ type: "image/png" }).then((blob) => {
      if (cancelled) return;
      const url = URL.createObjectURL(blob);

      // Revoke previous URL
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
      }
      prevUrlRef.current = url;
      setOverlayUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [mask, maskW, maskH, config.threshold, config.edgeSoftness, config]);

  // Revoke URL on unmount
  useEffect(() => {
    return () => {
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
      }
    };
  }, []);

  if (!overlayUrl) return null;

  return (
    <img
      src={overlayUrl}
      alt=""
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{
        objectFit: "contain",
        imageRendering: "auto",
      }}
      draggable={false}
    />
  );
}
