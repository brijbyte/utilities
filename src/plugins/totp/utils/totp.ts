// Base32 Decoder and TOTP Generator

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function decodeBase32(encoded: string): Uint8Array {
  const clean = encoded.toUpperCase().replace(/=/g, "").replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  let index = 0;
  const output = new Uint8Array(((clean.length * 5) / 8) | 0);

  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_ALPHABET.indexOf(clean[i]);
    if (val === -1) throw new Error(`Invalid Base32 character: ${clean[i]}`);
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  return output;
}

export async function generateTotp(
  secretBase32: string,
  algorithm: "SHA-1" | "SHA-256" | "SHA-512" = "SHA-1",
  digits: number = 6,
  period: number = 30,
  time: number = Date.now(),
): Promise<string> {
  const secretBytes = decodeBase32(secretBase32);
  let counter = Math.floor(time / 1000 / period);

  // Convert counter to 8-byte buffer (big-endian)
  const counterBytes = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = counter & 0xff;
    counter = Math.floor(counter / 256);
  }

  // Import key
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes.buffer as ArrayBuffer,
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"],
  );

  // Sign counter
  const signature = await crypto.subtle.sign("HMAC", key, counterBytes);
  const hash = new Uint8Array(signature);

  // Dynamic truncation
  const offset = hash[hash.length - 1] & 0xf;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  const otp = (binary % Math.pow(10, digits)).toString();
  return otp.padStart(digits, "0");
}
