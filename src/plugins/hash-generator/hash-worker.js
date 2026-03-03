const ALGORITHMS = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"];

function hexFromBuffer(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

self.onmessage = async (e) => {
  const { buffer } = e.data;
  const results = {};

  await Promise.all(
    ALGORITHMS.map(async (algo) => {
      const hash = await crypto.subtle.digest(algo, buffer);
      results[algo] = hexFromBuffer(hash);
      self.postMessage({ type: "result", algo, hex: results[algo] });
    }),
  );

  self.postMessage({ type: "done" });
};
