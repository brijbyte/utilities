import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");

async function prerender() {
  // Build SSR bundle
  const { createServer } = await import("vite");
  const vite = await createServer({
    appType: "custom",
  });

  let template = await fs.readFile(
    path.resolve(distDir, "index.html"),
    "utf-8",
  );

  // Load the SSR module
  const { render } = await vite.ssrLoadModule("./src/entry-server.tsx");

  // Render home page
  const html = await render("/");

  // Inject SSR content into #root
  template = template.replace("<!--ssr-outlet-->", html);

  // Write back
  await fs.writeFile(path.join(distDir, "index.html"), template);

  console.log("✓ Pre-rendered home page into dist/index.html");

  await vite.close();
}

await prerender().catch((err) => {
  console.error("Pre-render failed:", err);
  process.exit(1);
});
