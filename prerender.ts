import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");

async function prerender() {
  // Build SSR bundle
  const { build } = await import("vite");
  await build({
    build: {
      ssr: "src/entry-server.tsx",
      outDir: "dist/server",
      rollupOptions: {
        output: { format: "es" },
      },
    },
    logLevel: "warn",
  });

  // Load the SSR module
  const { render } = await import(
    path.join(distDir, "server", "entry-server.js")
  );

  // Render home page
  const html = render("/");

  // Read the client index.html
  const indexPath = path.join(distDir, "index.html");
  let template = fs.readFileSync(indexPath, "utf-8");

  // Inject SSR content into #root
  template = template.replace(
    '<div id="root"></div>',
    `<div id="root">${html}</div>`,
  );

  // Write back
  fs.writeFileSync(indexPath, template);

  // Clean up server build
  fs.rmSync(path.join(distDir, "server"), { recursive: true, force: true });

  console.log("✓ Pre-rendered home page into dist/index.html");
}

prerender().catch((err) => {
  console.error("Pre-render failed:", err);
  process.exit(1);
});
