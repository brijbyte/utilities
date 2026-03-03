import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import App from "./App";

import "./index.css";

const root = document.getElementById("root")!;

const app = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

// Only the home page is pre-rendered (SSG), so only hydrate on "/"
if (root.children.length > 0 && window.location.pathname === "/") {
  hydrateRoot(root, app);
} else {
  // Clear any pre-rendered content if we're on a different route
  root.innerHTML = "";
  createRoot(root).render(app);
}
