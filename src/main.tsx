import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";

import { routes } from "./routes";
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

const router = createBrowserRouter(routes);

const app = (
  <StrictMode>
    <RouterProvider router={router} />
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
