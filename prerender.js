import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");

function parseToUTC(dateStr) {
  const iso = dateStr
    .replace(" ", "T")
    .replace(" +", "+")
    .replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  return new Date(iso);
}

const commitHash =
  process.env.SW_VERSION ||
  execSync("git rev-parse --short HEAD").toString().trim();
const commitDateRaw =
  process.env.SW_DATE ||
  execSync("git log -1 --format=%cd --date=iso", { env: { TZ: "UTC" } })
    .toString()
    .trim();
const commitDate = parseToUTC(commitDateRaw).toISOString();

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

  // Inject app version info into the inline script
  template = template.replaceAll("<!--app:hash-->", commitHash);
  template = template.replaceAll("<!--app:date-->", commitDate);

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

  const pluginDir = path.join(distDir, "a");
  await fs.mkdir(pluginDir, { recursive: true });

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

    // Write to dist/a/<id>.html
    await fs.writeFile(path.join(pluginDir, `${plugin.id}.html`), pluginHtml);
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
      url: `/a/${plugin.id}?utm_source=pwa_shortcut&utm_medium=manifest&utm_campaign=utilities`,
      icons: [
        {
          src: `/icons/${pngFilename}`,
          sizes: `${iconSize}x${iconSize}`,
          type: "image/png",
        },
      ],
    });
  }

  // --- Generate blog pages ---
  // Blog pages are fully separate from the main app: own HTML template,
  // own CSS bundle, own SSR entry. No JS loads at all.

  // 1. Build blog CSS via Vite (processes blog.css through Tailwind,
  //    scanning blog components for class usage).
  const { build: viteBuild } = await import("vite");
  const blogCssBuild = await viteBuild({
    configFile: false,
    plugins: [(await import("@tailwindcss/vite")).default()],
    build: {
      emptyOutDir: false,
      outDir: "dist",
      rolldownOptions: {
        input: { "blog-style": path.resolve(__dirname, "src/blog/blog.css") },
        output: {
          assetFileNames: "assets/[name]-[hash][extname]",
          // The CSS input becomes an empty JS file + a CSS asset.
          // We only care about the CSS asset.
          entryFileNames: "assets/[name]-[hash].js",
        },
      },
    },
    logLevel: "silent",
  });

  // Find the emitted CSS file from the blog build
  const blogBuildOutput = Array.isArray(blogCssBuild)
    ? blogCssBuild[0]
    : blogCssBuild;
  const blogCssAsset = blogBuildOutput.output.find(
    (o) => o.type === "asset" && o.fileName.endsWith(".css"),
  );
  const blogCssPath = blogCssAsset ? `/${blogCssAsset.fileName}` : "";

  // Clean up the empty JS stub emitted for the CSS entry
  const blogJsStub = blogBuildOutput.output.find(
    (o) => o.type === "chunk" && o.fileName.includes("blog-style"),
  );
  if (blogJsStub) {
    await fs.rm(path.join(distDir, blogJsStub.fileName), { force: true });
  }

  // 2. Read blog.html template
  const blogTemplate = await fs.readFile(
    path.resolve(__dirname, "src/blog/blog.html"),
    "utf-8",
  );

  // 3. Load blog SSR entry and article data
  const { renderBlog } = await vite.ssrLoadModule(
    "./src/blog/entry-server.tsx",
  );
  const { getAllArticles } = await vite.ssrLoadModule("./src/blog/renderer.ts");
  const articles = await getAllArticles();

  // 4. Generate each blog page
  const blogRoutes = [
    { path: "/blog", file: path.join(distDir, "blog", "index.html") },
    ...articles.map((a) => ({
      path: `/blog/${a.slug}`,
      file: path.join(distDir, "blog", `${a.slug}.html`),
    })),
  ];

  for (const route of blogRoutes) {
    const article = articles.find((a) => route.path === `/blog/${a.slug}`);
    const blogTitle =
      route.path === "/blog"
        ? "blog — utilities"
        : `${article?.title ?? "blog"} — utilities blog`;
    const blogDesc =
      route.path === "/blog"
        ? "Updates, tips, and deep dives into browser-based developer tools that run entirely in your browser."
        : (article?.description ?? "");
    const blogUrl = `${baseUrl}${route.path}`;
    const blogKeywords =
      route.path === "/blog"
        ? "blog, developer tools, browser tools, offline, privacy first"
        : [
            ...(article?.tags ?? []),
            "blog",
            "developer tools",
            "browser tools",
          ].join(", ");
    const blogJsonLd =
      route.path === "/blog"
        ? JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "utilities blog",
            url: blogUrl,
            description: blogDesc,
            author: { "@type": "Person", name: "brijbyte" },
          })
        : JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: article?.title ?? "",
            description: blogDesc,
            url: blogUrl,
            datePublished: article?.date ?? "",
            author: { "@type": "Person", name: "brijbyte" },
            isPartOf: {
              "@type": "Blog",
              name: "utilities blog",
              url: `${baseUrl}/blog`,
            },
          });

    const blogSsrHtml = await renderBlog(route.path);

    let blogPageHtml = blogTemplate;
    blogPageHtml = blogPageHtml.replaceAll("<!--app:hash-->", commitHash);
    blogPageHtml = blogPageHtml.replaceAll("<!--app:date-->", commitDate);
    blogPageHtml = blogPageHtml.replaceAll("<!--meta:title-->", blogTitle);
    blogPageHtml = blogPageHtml.replaceAll("<!--meta:description-->", blogDesc);
    blogPageHtml = blogPageHtml.replaceAll("<!--meta:url-->", blogUrl);
    blogPageHtml = blogPageHtml.replaceAll(
      "<!--meta:keywords-->",
      blogKeywords,
    );
    blogPageHtml = blogPageHtml.replace("<!--meta:jsonld-->", blogJsonLd);
    blogPageHtml = blogPageHtml.replace(
      "<!--blog:css-->",
      blogCssPath ? `<link rel="stylesheet" href="${blogCssPath}">` : "",
    );
    blogPageHtml = blogPageHtml.replace("<!--ssr-outlet-->", blogSsrHtml);

    await fs.mkdir(path.dirname(route.file), { recursive: true });
    await fs.writeFile(route.file, blogPageHtml);
  }

  console.log(
    `✓ Generated blog index + ${articles.length} article pages (CSS: ${blogCssPath})`,
  );

  // Read the manifest, inject shortcuts, write back
  const manifestPath = path.join(distDir, "manifest.webmanifest");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"));
  manifest.shortcuts = shortcuts;
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(
    `✓ Generated ${shortcuts.length} shortcut icons and updated manifest`,
  );

  // --- Generate sitemap.xml ---

  const sitemapEntries = [
    // Home
    { loc: `${baseUrl}/`, changefreq: "weekly", priority: "1.0" },
    // Plugin pages
    ...plugins.map((p) => ({
      loc: `${baseUrl}/a/${p.id}`,
      changefreq: "monthly",
      priority: "0.8",
    })),
    // Blog index
    { loc: `${baseUrl}/blog/`, changefreq: "weekly", priority: "0.7" },
    // Blog articles
    ...articles.map((a) => ({
      loc: `${baseUrl}/blog/${a.slug}`,
      lastmod: a.date,
      changefreq: "yearly",
      priority: "0.6",
    })),
  ];

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sitemapEntries.map((e) => {
      let entry = `  <url>\n    <loc>${e.loc}</loc>`;
      if (e.lastmod) entry += `\n    <lastmod>${e.lastmod}</lastmod>`;
      entry += `\n    <changefreq>${e.changefreq}</changefreq>`;
      entry += `\n    <priority>${e.priority}</priority>`;
      entry += `\n  </url>`;
      return entry;
    }),
    "</urlset>",
    "",
  ].join("\n");

  await fs.writeFile(path.join(distDir, "sitemap.xml"), sitemap);
  console.log(`✓ Generated sitemap.xml (${sitemapEntries.length} URLs)`);

  await vite.close();
}

await prerender().catch((err) => {
  console.error("Pre-render failed:", err);
  process.exit(1);
});
