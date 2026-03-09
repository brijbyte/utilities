import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";

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

  // Save the template before SSR injection — used as the base for plugin pages
  const shellTemplate = template;

  // Replace meta placeholders
  template = template.replaceAll("<!--meta:description-->", description);
  template = template.replaceAll("<!--meta:keywords-->", keywords);
  template = template.replaceAll(
    "<!--meta:title-->",
    "utilities — tools in the browser",
  );
  template = template.replaceAll(
    "<!--meta:url-->",
    "https://utilities.brijbyte.com/",
  );
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

  // --- Generate per-plugin HTML files ---
  // These are NOT SSR — just static HTML shells with custom <title> and meta
  // tags so search engines see meaningful content for each /a/<id> route.
  // Uses shellTemplate (has asset links but no SSR content in #root).

  const baseUrl = "https://utilities.brijbyte.com";

  for (const plugin of plugins) {
    const pluginTitle = `${plugin.name} — utilities`;
    const pluginDesc = plugin.meta.description;
    const pluginKeywords = [
      ...(plugin.meta.keywords ?? []),
      "developer tools",
      "browser tools",
      "offline",
      "privacy first",
    ].join(", ");
    const pluginUrl = `${baseUrl}/a/${plugin.id}`;

    const pluginJsonLd = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: plugin.name,
      url: pluginUrl,
      description: pluginDesc,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires a modern browser with JavaScript enabled",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      isPartOf: {
        "@type": "WebApplication",
        name: "utilities",
        url: baseUrl + "/",
      },
      author: { "@type": "Person", name: "brijbyte" },
    });

    let pluginHtml = shellTemplate;

    // Replace title
    pluginHtml = pluginHtml.replace(
      /<title>[^<]*<\/title>/,
      `<title>${pluginTitle}</title>`,
    );

    // Replace meta description
    pluginHtml = pluginHtml.replaceAll("<!--meta:description-->", pluginDesc);
    pluginHtml = pluginHtml.replaceAll("<!--meta:title-->", pluginTitle);
    pluginHtml = pluginHtml.replaceAll("<!--meta:url-->", pluginUrl);
    pluginHtml = pluginHtml.replaceAll("<!--meta:keywords-->", pluginKeywords);
    pluginHtml = pluginHtml.replace("<!--meta:jsonld-->", pluginJsonLd);

    // Clear the SSR outlet — leave #root empty for client-side render
    pluginHtml = pluginHtml.replace("<!--ssr-outlet-->", "");

    // Write to dist/a/<id>/index.html
    const pluginDir = path.join(distDir, "a", plugin.id);
    await fs.mkdir(pluginDir, { recursive: true });
    await fs.writeFile(path.join(pluginDir, "index.html"), pluginHtml);
  }

  console.log(`✓ Generated HTML pages for ${plugins.length} plugins`);

  // --- Generate plugin shortcut icons and manifest shortcuts ---

  const shortcuts = [];
  const iconsDir = path.join(distDir, "icons");
  await fs.mkdir(iconsDir, { recursive: true });

  const iconSize = 192;
  const padding = 32;
  const innerSize = iconSize - padding * 2;

  for (const plugin of plugins) {
    // Render the React icon element to an SVG string
    let svgMarkup = renderToStaticMarkup(plugin.icon);

    // Replace currentColor with a concrete color and set viewBox-based sizing
    // Wrap in a padded SVG so the icon doesn't bleed to edges
    svgMarkup = svgMarkup
      .replace(/width="24"/, `width="${innerSize}"`)
      .replace(/height="24"/, `height="${innerSize}"`)
      .replace(/stroke="currentColor"/g, 'stroke="#1c1917"');

    const wrappedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 ${iconSize} ${iconSize}">
      <rect width="${iconSize}" height="${iconSize}" rx="32" fill="#f5f5f4"/>
      <g transform="translate(${padding}, ${padding})">${svgMarkup}</g>
    </svg>`;

    // Convert to 192x192 PNG
    const pngBuffer = await sharp(Buffer.from(wrappedSvg))
      .resize(iconSize, iconSize)
      .png()
      .toBuffer();

    const pngFilename = `${plugin.id}.png`;
    await fs.writeFile(path.join(iconsDir, pngFilename), pngBuffer);

    shortcuts.push({
      name: plugin.name,
      short_name: plugin.name,
      description: plugin.meta.description,
      url: `/a/${plugin.id}?source=pwa`,
      icons: [
        {
          src: `/icons/${pngFilename}`,
          sizes: `${iconSize}x${iconSize}`,
          type: "image/png",
        },
      ],
    });
  }

  // Read the manifest, inject shortcuts, write back
  const manifestPath = path.join(distDir, "manifest.webmanifest");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"));
  manifest.shortcuts = shortcuts;
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(
    `✓ Generated ${shortcuts.length} shortcut icons and updated manifest`,
  );

  await vite.close();
}

await prerender().catch((err) => {
  console.error("Pre-render failed:", err);
  process.exit(1);
});
