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
    plugins: [
      {
        name: "ignore-css",
        enforce: "pre",
        resolveId(id) {
          if (id.endsWith(".css")) {
            return "\0empty-css";
          }
        },
        load(id) {
          if (id === "\0empty-css") {
            return "";
          }
        },
      },
    ],
  });

  let template = await fs.readFile(
    path.resolve(distDir, "index.html"),
    "utf-8",
  );

  // Load plugins to generate dynamic metadata
  const { plugins } = await vite.ssrLoadModule("./src/plugins/index.tsx");

  const toolNames = plugins
    .filter((p) => p.id !== "pipeline")
    .map((p) => p.name);
  const toolList = toolNames.join(", ");

  const description =
    `Free, open-source developer tools that run entirely in your browser. ` +
    `Completely offline, no server, no data ever leaves your device. ` +
    `Privacy-first — zero tracking, zero analytics. ` +
    `Includes: ${toolList}. ` +
    `No install, no signup, works offline.`;

  const allKeywords = [
    "developer tools",
    "browser tools",
    "offline tools",
    "privacy first",
    "no tracking",
    "client-side",
    "open source",
    ...plugins.flatMap((p) => p.meta?.keywords ?? []),
  ];
  const keywords = [...new Set(allKeywords)].join(", ");

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "utilities",
    url: "https://utilities.brijbyte.com/",
    description,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires a modern browser with JavaScript enabled",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: toolNames,
    author: {
      "@type": "Person",
      name: "brijbyte",
    },
  });

  // Replace meta placeholders
  template = template.replaceAll("<!--meta:description-->", description);
  template = template.replaceAll("<!--meta:keywords-->", keywords);
  template = template.replace("<!--meta:jsonld-->", jsonLd);

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
