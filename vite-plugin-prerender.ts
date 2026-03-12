/**
 * Vite plugin that handles all post-build static generation:
 *
 * 1. SSR pre-renders the home page into dist/index.html
 * 2. Generates per-plugin HTML pages with SEO meta (no SSR content)
 * 3. Builds blog CSS, SSRs blog pages into dist/blog/
 * 4. Generates PWA shortcut icons + updates manifest.webmanifest
 * 5. Generates sitemap.xml
 *
 * In dev mode, fills in index.html placeholders with sensible defaults
 * via transformIndexHtml so dev/prod HTML behave the same way.
 */

import type { Plugin, ViteDevServer } from "vite";
import { execSync } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";

// ── Git metadata ────────────────────────────────────────────────────

function parseToUTC(dateStr: string): Date {
  const iso = dateStr
    .replace(" ", "T")
    .replace(" +", "+")
    .replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  return new Date(iso);
}

function getCommitInfo() {
  const hash =
    process.env.SW_VERSION ||
    execSync("git rev-parse --short HEAD").toString().trim();
  const dateRaw =
    process.env.SW_DATE ||
    execSync("git log -1 --format=%cd --date=iso", { env: { TZ: "UTC" } })
      .toString()
      .trim();
  const date = parseToUTC(dateRaw).toISOString();
  return { hash, date };
}

// ── Shared helpers ──────────────────────────────────────────────────

const BASE_URL = "https://utilities.brijbyte.com";

interface PluginMeta {
  id: string;
  name: string;
  icon: React.ReactNode;
  meta: { description: string; keywords?: string[] };
}

function buildDescription(plugins: PluginMeta[]) {
  const toolNames = plugins
    .filter((p) => p.id !== "pipeline")
    .map((p) => p.name);
  const toolList = toolNames.join(", ");
  return (
    `Free, open-source developer tools that run entirely in your browser. ` +
    `Completely offline, no server, no data ever leaves your device. ` +
    `Privacy-first — zero tracking, zero analytics. ` +
    `Includes: ${toolList}. ` +
    `No install, no signup, works offline.`
  );
}

function buildKeywords(plugins: PluginMeta[]) {
  const all = [
    "developer tools",
    "browser tools",
    "offline tools",
    "privacy first",
    "no tracking",
    "client-side",
    "open source",
    ...plugins.flatMap((p) => p.meta?.keywords ?? []),
  ];
  return [...new Set(all)].join(", ");
}

function buildHomeJsonLd(description: string, plugins: PluginMeta[]) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "utilities",
    url: `${BASE_URL}/`,
    description,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires a modern browser with JavaScript enabled",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    featureList: plugins.filter((p) => p.id !== "pipeline").map((p) => p.name),
    author: { "@type": "Person", name: "brijbyte" },
  });
}

function fillTemplate(html: string, vars: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(key, value);
  }
  return result;
}

// ── Plugin ──────────────────────────────────────────────────────────

export function prerenderPlugin(): Plugin {
  const commit = getCommitInfo();
  let rootDir: string;

  return {
    name: "prerender",
    apply: "build",

    configResolved(config) {
      rootDir = config.root;
    },

    closeBundle: {
      sequential: true,
      async handler() {
        const distDir = path.resolve(rootDir, "dist");

        // Spin up a Vite server for ssrLoadModule (transforms TSX on the fly)
        const { createServer } = await import("vite");
        const vite = await createServer({
          root: rootDir,
          appType: "custom",
          plugins: [
            {
              name: "ignore-css",
              enforce: "pre" as const,
              resolveId(id: string) {
                if (id.endsWith(".css")) return "\0empty-css";
              },
              load(id: string) {
                if (id === "\0empty-css") return "";
              },
            },
          ],
        });

        try {
          await generateAll(vite, distDir, rootDir, commit);
        } finally {
          await vite.close();
        }
      },
    },
  };
}

async function generateAll(
  vite: ViteDevServer,
  distDir: string,
  rootDir: string,
  commit: { hash: string; date: string },
) {
  // ── Load plugin registry ────────────────────────────────────────
  const { plugins } = (await vite.ssrLoadModule("./src/plugins/index.tsx")) as {
    plugins: PluginMeta[];
  };

  const description = buildDescription(plugins);
  const keywords = buildKeywords(plugins);
  const homeJsonLd = buildHomeJsonLd(description, plugins);

  // ── Read the built index.html template ──────────────────────────
  let template = await fs.readFile(path.join(distDir, "index.html"), "utf-8");
  template = fillTemplate(template, {
    "<!--app:hash-->": commit.hash,
    "<!--app:date-->": commit.date,
  });

  // Save shell template before SSR injection (for plugin pages)
  const shellTemplate = template;

  // ── 1. SSR the home page ────────────────────────────────────────
  template = fillTemplate(template, {
    "<!--meta:description-->": description,
    "<!--meta:keywords-->": keywords,
    "<!--meta:title-->": "utilities — tools in the browser",
    "<!--meta:url-->": `${BASE_URL}/`,
    "<!--meta:jsonld-->": homeJsonLd,
  });

  const { render } = await vite.ssrLoadModule("./src/entry-server.tsx");
  const homeHtml = await render("/");
  template = template.replace("<!--ssr-outlet-->", homeHtml);

  await fs.writeFile(path.join(distDir, "index.html"), template);
  console.log("✓ Pre-rendered home page into dist/index.html");

  // ── 2. Per-plugin HTML pages (SEO meta only) ───────────────────
  const pluginDir = path.join(distDir, "a");
  await fs.mkdir(pluginDir, { recursive: true });

  for (const plugin of plugins) {
    const title = `${plugin.name} — utilities`;
    const desc = plugin.meta.description;
    const url = `${BASE_URL}/a/${plugin.id}`;
    const kw = [
      ...(plugin.meta.keywords ?? []),
      "developer tools",
      "browser tools",
      "offline",
      "privacy first",
    ].join(", ");
    const jsonLd = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: plugin.name,
      url,
      description: desc,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires a modern browser with JavaScript enabled",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      isPartOf: {
        "@type": "WebApplication",
        name: "utilities",
        url: `${BASE_URL}/`,
      },
      author: { "@type": "Person", name: "brijbyte" },
    });

    let html = shellTemplate;
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
    html = fillTemplate(html, {
      "<!--meta:description-->": desc,
      "<!--meta:title-->": title,
      "<!--meta:url-->": url,
      "<!--meta:keywords-->": kw,
      "<!--meta:jsonld-->": jsonLd,
      "<!--ssr-outlet-->": "",
    });

    await fs.writeFile(path.join(pluginDir, `${plugin.id}.html`), html);
  }
  console.log(`✓ Generated HTML pages for ${plugins.length} plugins`);

  // ── 3. PWA shortcut icons + manifest ────────────────────────────
  const { renderToStaticMarkup } = await import("react-dom/server");
  const sharp = (await import("sharp")).default;

  const shortcuts = [];
  const iconsDir = path.join(distDir, "icons");
  await fs.mkdir(iconsDir, { recursive: true });

  const iconSize = 192;
  const padding = 32;
  const innerSize = iconSize - padding * 2;

  for (const plugin of plugins) {
    let svgMarkup = renderToStaticMarkup(plugin.icon as React.ReactElement);
    svgMarkup = svgMarkup
      .replace(/width="24"/, `width="${innerSize}"`)
      .replace(/height="24"/, `height="${innerSize}"`)
      .replace(/stroke="currentColor"/g, 'stroke="#1c1917"');

    const wrappedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 ${iconSize} ${iconSize}">
      <rect width="${iconSize}" height="${iconSize}" rx="32" fill="#f5f5f4"/>
      <g transform="translate(${padding}, ${padding})">${svgMarkup}</g>
    </svg>`;

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

  const manifestPath = path.join(distDir, "manifest.webmanifest");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"));
  manifest.shortcuts = shortcuts;
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(
    `✓ Generated ${shortcuts.length} shortcut icons and updated manifest`,
  );

  // ── 4. Blog pages ──────────────────────────────────────────────

  // Build blog CSS via a separate Vite build (own Tailwind entry)
  const { build: viteBuild } = await import("vite");
  const blogCssBuild = await viteBuild({
    configFile: false,
    plugins: [(await import("@tailwindcss/vite")).default()],
    build: {
      emptyOutDir: false,
      copyPublicDir: false,
      outDir: distDir,
      rolldownOptions: {
        input: {
          "blog-style": path.resolve(rootDir, "src/blog/blog.css"),
        },
        output: {
          assetFileNames: "assets/[name]-[hash][extname]",
          entryFileNames: "assets/[name]-[hash].js",
        },
      },
    },
    logLevel: "silent",
  });

  const blogBuildOutput = Array.isArray(blogCssBuild)
    ? blogCssBuild[0]
    : blogCssBuild;

  // build() with watch disabled returns RolldownOutput, not RolldownWatcher
  const blogOutputs = "output" in blogBuildOutput ? blogBuildOutput.output : [];
  const blogCssAsset = blogOutputs.find(
    (o) => o.type === "asset" && o.fileName.endsWith(".css"),
  );
  const blogCssPath = blogCssAsset ? `/${blogCssAsset.fileName}` : "";

  // Clean up the empty JS stub
  const blogJsStub = blogOutputs.find(
    (o) => o.type === "chunk" && o.fileName.includes("blog-style"),
  );
  if (blogJsStub) {
    await fs.rm(path.join(distDir, blogJsStub.fileName), { force: true });
  }

  // Read blog.html template
  const blogTemplate = await fs.readFile(
    path.resolve(rootDir, "src/blog/blog.html"),
    "utf-8",
  );

  // Load blog SSR entry and article data
  const { renderBlog } = await vite.ssrLoadModule(
    "./src/blog/entry-server.tsx",
  );
  const { getAllArticles } = await vite.ssrLoadModule("./src/blog/renderer.ts");
  const articles = (await getAllArticles()) as {
    slug: string;
    title: string;
    description: string;
    date: string;
    tags: string[];
  }[];

  // Generate each blog page
  const blogRoutes = [
    { path: "/blog", file: path.join(distDir, "blog", "index.html") },
    ...articles.map((a) => ({
      path: `/blog/${a.slug}`,
      file: path.join(distDir, "blog", `${a.slug}.html`),
    })),
  ];

  for (const route of blogRoutes) {
    const article = articles.find((a) => route.path === `/blog/${a.slug}`);
    const title =
      route.path === "/blog"
        ? "blog — utilities"
        : `${article?.title ?? "blog"} — utilities blog`;
    const desc =
      route.path === "/blog"
        ? "Updates, tips, and deep dives into browser-based developer tools that run entirely in your browser."
        : (article?.description ?? "");
    const url = `${BASE_URL}${route.path}`;
    const kw =
      route.path === "/blog"
        ? "blog, developer tools, browser tools, offline, privacy first"
        : [
            ...(article?.tags ?? []),
            "blog",
            "developer tools",
            "browser tools",
          ].join(", ");
    const jsonLd =
      route.path === "/blog"
        ? JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "utilities blog",
            url,
            description: desc,
            author: { "@type": "Person", name: "brijbyte" },
          })
        : JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: article?.title ?? "",
            description: desc,
            url,
            datePublished: article?.date ?? "",
            author: { "@type": "Person", name: "brijbyte" },
            isPartOf: {
              "@type": "Blog",
              name: "utilities blog",
              url: `${BASE_URL}/blog`,
            },
          });

    const ssrHtml = await renderBlog(route.path);

    let html = fillTemplate(blogTemplate, {
      "<!--app:hash-->": commit.hash,
      "<!--app:date-->": commit.date,
      "<!--meta:title-->": title,
      "<!--meta:description-->": desc,
      "<!--meta:url-->": url,
      "<!--meta:keywords-->": kw,
    });
    html = html.replace("<!--meta:jsonld-->", jsonLd);
    html = html.replace(
      "<!--blog:css-->",
      blogCssPath ? `<link rel="stylesheet" href="${blogCssPath}">` : "",
    );
    html = html.replace("<!--blog:script-->", "");
    html = html.replace("<!--ssr-outlet-->", ssrHtml);

    await fs.mkdir(path.dirname(route.file), { recursive: true });
    await fs.writeFile(route.file, html);
  }
  console.log(
    `✓ Generated blog index + ${articles.length} article pages (CSS: ${blogCssPath})`,
  );

  // ── 5. Sitemap ─────────────────────────────────────────────────

  const sitemapEntries = [
    { loc: `${BASE_URL}/`, changefreq: "weekly", priority: "1.0" },
    ...plugins.map((p) => ({
      loc: `${BASE_URL}/a/${p.id}`,
      changefreq: "monthly",
      priority: "0.8",
    })),
    { loc: `${BASE_URL}/blog/`, changefreq: "weekly", priority: "0.7" },
    ...articles.map((a) => ({
      loc: `${BASE_URL}/blog/${a.slug}`,
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
      if ("lastmod" in e && e.lastmod)
        entry += `\n    <lastmod>${e.lastmod}</lastmod>`;
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
}
