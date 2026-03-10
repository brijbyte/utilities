/**
 * Vite plugin for the blog system:
 *
 * 1. Provides `virtual:blog-data` — a virtual module that exports compiled
 *    article metadata and HTML fragments from MDX files.
 *
 * 2. In dev mode, adds middleware to serve `/blog` and `/blog/:slug` routes
 *    by SSR-rendering the blog React components and injecting them into
 *    blog.html. The blog CSS is loaded via Vite's dev pipeline.
 */

import type { Plugin, ViteDevServer } from "vite";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const VIRTUAL_ID = "virtual:blog-data";
const RESOLVED_ID = "\0" + VIRTUAL_ID;

const BLOG_HTML_PATH = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "blog.html",
);

export function blogPlugin(): Plugin {
  return {
    name: "blog-data",

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },

    async load(id) {
      if (id !== RESOLVED_ID) return;

      const { getAllArticles, getArticle } = await import("./renderer.ts");

      const articles = await getAllArticles();

      const articleMap: Record<
        string,
        { meta: (typeof articles)[0]; contentHtml: string }
      > = {};
      for (const meta of articles) {
        const compiled = await getArticle(meta.slug);
        if (compiled) {
          articleMap[meta.slug] = {
            meta: compiled.meta,
            contentHtml: compiled.contentHtml,
          };
        }
      }

      return `export const articles = ${JSON.stringify(articles)};
export const articleMap = ${JSON.stringify(articleMap)};`;
    },

    configureServer(server: ViteDevServer) {
      // Serve blog routes in dev by SSR-rendering into blog.html
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0] ?? "";

        // Match /blog or /blog/ or /blog/:slug
        if (
          url !== "/blog" &&
          url !== "/blog/" &&
          !/^\/blog\/[a-z0-9-]+\/?$/.test(url)
        ) {
          return next();
        }

        try {
          // Load blog.html template and transform it through Vite's pipeline
          let template = await fs.readFile(BLOG_HTML_PATH, "utf-8");
          template = await server.transformIndexHtml(url, template);

          // Replace the CSS placeholder with a dev-mode <link> to blog.css
          // (Vite serves and hot-reloads it through its dev pipeline)
          template = template.replace(
            "<!--blog:css-->",
            '<link rel="stylesheet" href="/src/blog/blog.css">',
          );

          // SSR render the blog route
          const { renderBlog } = await server.ssrLoadModule(
            "./src/blog/entry-server.tsx",
          );
          const ssrHtml = renderBlog(url.replace(/\/$/, "") || "/blog");

          // Fill in placeholders with dev-mode defaults
          template = template.replaceAll("<!--app:hash-->", "dev");
          template = template.replaceAll(
            "<!--app:date-->",
            new Date().toISOString(),
          );
          template = template.replaceAll(
            "<!--meta:title-->",
            "blog — utilities",
          );
          template = template.replaceAll("<!--meta:description-->", "");
          template = template.replaceAll("<!--meta:url-->", "");
          template = template.replaceAll("<!--meta:keywords-->", "");
          template = template.replace("<!--meta:jsonld-->", "{}");
          template = template.replace("<!--ssr-outlet-->", ssrHtml);

          // In dev, load the blog client entry as a module script
          // (Vite serves and transforms it through its dev pipeline)
          template = template.replace(
            "<!--blog:script-->",
            '<script type="module" src="/src/blog/blog-client.tsx"></script>',
          );

          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(template);
        } catch (err) {
          console.error("[blog] Dev render error:", err);
          next(err);
        }
      });
    },
  };
}
