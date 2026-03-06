import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import App from "./App";
import { getPersistedRoute, isPwa } from "./pwa";
import { initServiceWorker } from "./sw-update";

import "./index.css";

const root = document.getElementById("root")!;

// In PWA mode on "/", restore the last visited route
const initialPath = window.location.pathname;
if (isPwa && initialPath === "/") {
  const saved = getPersistedRoute();
  if (saved && saved !== "/") {
    window.history.replaceState(null, "", saved);
  }
}

const app = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

initServiceWorker();

// Only the home page is pre-rendered (SSG), so only hydrate on "/"
if (root.children.length > 0 && window.location.pathname === "/") {
  hydrateRoot(root, app);
} else {
  // Clear any pre-rendered content if we're on a different route
  root.innerHTML = "";
  createRoot(root).render(app);
}
