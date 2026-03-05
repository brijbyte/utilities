import jsQR from "jsqr";
import type { TotpAccount } from "./db";

export function parseOtpAuthUri(uri: string): Omit<TotpAccount, "id" | "createdAt"> | null {
  try {
    const url = new URL(uri);
    if (url.protocol !== "otpauth:" || url.host !== "totp") {
      return null;
    }

    const pathSegments = decodeURIComponent(url.pathname).replace(/^\//, "").split(":");
    let issuer = "";
    let label = "";

    if (pathSegments.length > 1) {
      issuer = pathSegments[0];
      label = pathSegments[1];
    } else {
      label = pathSegments[0];
    }

    const secret = url.searchParams.get("secret");
    if (!secret) return null;

    const paramIssuer = url.searchParams.get("issuer");
    if (paramIssuer) {
      issuer = paramIssuer;
    }

    const algorithmParam = url.searchParams.get("algorithm")?.toUpperCase() || "SHA1";
    const algorithm = algorithmParam === "SHA256" ? "SHA-256" : algorithmParam === "SHA512" ? "SHA-512" : "SHA-1";
    
    const digits = parseInt(url.searchParams.get("digits") || "6", 10);
    const period = parseInt(url.searchParams.get("period") || "30", 10);

    return {
      issuer,
      label,
      secret,
      algorithm: algorithm as "SHA-1" | "SHA-256" | "SHA-512",
      digits,
      period,
    };
  } catch {
    return null;
  }
}

export function scanImage(imageSource: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement, width: number, height: number): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(imageSource, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const code = jsQR(imageData.data, imageData.width, imageData.height);
  
  if (code) {
    return code.data;
  }
  return null;
}
