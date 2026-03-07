/**
 * QR code import utilities — parse from URI string or image file.
 */

import jsQR from "jsqr";
import { parseOtpAuthUri } from "./qr";
import type { TotpAccount } from "./db";

export interface ImportResult {
  account: TotpAccount;
}

export interface ImportError {
  error: string;
}

export function parseUri(uri: string): ImportResult | ImportError {
  const parsed = parseOtpAuthUri(uri);
  if (!parsed)
    return { error: "Invalid QR code. This is not a valid TOTP URI." };
  return {
    account: {
      ...parsed,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    },
  };
}

export function decodeQrFromImage(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        URL.revokeObjectURL(url);
        resolve(code?.data ?? null);
      } else {
        URL.revokeObjectURL(url);
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

export function isImportError(r: ImportResult | ImportError): r is ImportError {
  return "error" in r;
}
