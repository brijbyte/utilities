import type { ProcessFn } from "../../types";

function base64UrlDecode(str: string): string {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4;
  const final = pad ? padded + "=".repeat(4 - pad) : padded;
  return decodeURIComponent(
    atob(final)
      .split("")
      .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join(""),
  );
}

export interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
}

export function decodeJwt(token: string): DecodedJwt {
  const parts = token.trim().split(".");
  if (parts.length !== 3) {
    throw new Error(`Invalid JWT: expected 3 parts, got ${parts.length}`);
  }

  const header = JSON.parse(base64UrlDecode(parts[0]));
  const payload = JSON.parse(base64UrlDecode(parts[1]));
  const signature = parts[2];

  return { header, payload, signature };
}

export const decode: ProcessFn = async (input) => {
  const { payload } = decodeJwt(input.data as string);
  return { type: "text", data: JSON.stringify(payload, null, 2) };
};

export const decodeHeader: ProcessFn = async (input) => {
  const { header } = decodeJwt(input.data as string);
  return { type: "text", data: JSON.stringify(header, null, 2) };
};
