/**
 * PWA detection and route persistence.
 * - `isPwa`: true when running in standalone/installed mode
 * - Persists the last visited URL to localStorage and restores on launch
 */

const PWA_ROUTE_KEY = "pwa-last-route";

export const isPwa =
  window.matchMedia("(display-mode: standalone)").matches ||
  ("standalone" in navigator &&
    (navigator as { standalone?: boolean }).standalone === true);

/** Save current path to localStorage (call on route changes). */
export function persistRoute(path: string) {
  if (isPwa) {
    localStorage.setItem(PWA_ROUTE_KEY, path);
  }
}

/** Get the persisted route, or null. Only meaningful in PWA mode. */
export function getPersistedRoute(): string | null {
  if (!isPwa) return null;
  return localStorage.getItem(PWA_ROUTE_KEY);
}
