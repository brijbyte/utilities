/** Format a number with locale-aware grouping (no currency symbol). */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString();
}
