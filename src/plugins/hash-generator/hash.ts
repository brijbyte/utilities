import type { Algorithm } from "./types";
import { ALGORITHMS } from "./types";

function hexFromBuffer(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hashInWorker(
  buffer: ArrayBuffer,
  signal: AbortSignal,
  onResult: (algo: Algorithm, hex: string) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./hash-worker.js", import.meta.url), {
      type: "module",
    });

    signal.addEventListener("abort", () => {
      worker.terminate();
      reject(new DOMException("Aborted", "AbortError"));
    });

    worker.onmessage = (e) => {
      if (e.data.type === "result") {
        onResult(e.data.algo, e.data.hex);
      } else if (e.data.type === "done") {
        resolve();
        worker.terminate();
      }
    };

    worker.onerror = (err) => {
      reject(err);
      worker.terminate();
    };

    worker.postMessage({ buffer }, [buffer]);
  });
}

// For small text, hash on main thread. For large text, use worker to avoid blocking UI.
const WORKER_THRESHOLD = 64 * 1024; // 64KB

export async function hashText(
  text: string,
  signal: AbortSignal,
): Promise<Record<Algorithm, string>> {
  const encoded = new TextEncoder().encode(text);

  if (encoded.byteLength > WORKER_THRESHOLD) {
    const results = {} as Record<Algorithm, string>;
    await hashInWorker(encoded.buffer, signal, (algo, hex) => {
      results[algo] = hex;
    });
    return results;
  }

  const results = {} as Record<Algorithm, string>;
  await Promise.all(
    ALGORITHMS.map(async (algo) => {
      const hash = await crypto.subtle.digest(algo, encoded.buffer);
      results[algo] = hexFromBuffer(hash);
    }),
  );
  return results;
}
