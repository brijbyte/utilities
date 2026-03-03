import type { ProcessFn } from "../../types";

function hexFromBuffer(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function createHashFn(algo: string): ProcessFn {
  return async (input) => {
    const data =
      input.type === "text"
        ? new TextEncoder().encode(input.data as string)
        : (input.data as Uint8Array);
    const hash = await crypto.subtle.digest(algo, data.buffer as ArrayBuffer);
    return { type: "text", data: hexFromBuffer(hash) };
  };
}
