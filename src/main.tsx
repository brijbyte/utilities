import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

const root = document.getElementById("root")!;

if (root.children.length > 0) {
  hydrateRoot(
    root,
    <StrictMode>
      <App />
    </StrictMode>,
  );
} else {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
