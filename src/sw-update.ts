/**
 * Service Worker update detection.
 * Exposes a subscribable store for components to react to available updates.
 */

type Listener = () => void;

let waitingWorker: ServiceWorker | null = null;
let updateAvailable = false;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function isUpdateAvailable() {
  return updateAvailable;
}

export function applyUpdate() {
  if (waitingWorker) {
    waitingWorker.postMessage("SKIP_WAITING");
  }
}

export function subscribeToUpdate(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Call once on app boot to set up SW registration and update detection. */
export function initServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.register("/sw.js").then((reg) => {
    // Check for updates periodically
    setInterval(() => reg.update(), 60_000);

    reg.addEventListener("updatefound", () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener("statechange", () => {
        if (nw.state === "installed" && navigator.serviceWorker.controller) {
          waitingWorker = nw;
          updateAvailable = true;
          notify();
        }
      });
    });
  });

  // Reload when new SW takes over
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}
