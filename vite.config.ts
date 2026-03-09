import { defineConfig, type Plugin } from "vite";
import { execSync } from "child_process";
import { build } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { blogPlugin } from "./src/blog/vite-plugin.ts";
import * as path from "node:path";
import * as fs from "node:fs/promises";

function parseToUTC(dateStr: string): Date {
  const iso = dateStr
    .replace(" ", "T") // date-time separator
    .replace(" +", "+") // remove space before timezone
    .replace(/([+-]\d{2})(\d{2})$/, "$1:$2"); // +0530 → +05:30

  return new Date(iso);
}

const commitHash =
  process.env.SW_VERSION ||
  execSync("git rev-parse --short HEAD").toString().trim();
const commitDateRaw =
  process.env.SW_DATE ||
  execSync("git log -1 --format=%cd --date=iso", {
    env: {
      TZ: "UTC",
    },
  })
    .toString()
    .trim();

const commitDate = parseToUTC(commitDateRaw).toISOString();

const DEFINE = {
  __COMMIT_HASH__: JSON.stringify(commitHash),
  __COMMIT_DATE__: JSON.stringify(commitDate),
};

/**
 * Read the Vite manifest and scan dist/assets/ for any files the manifest
 * missed (e.g. web workers emitted via `new URL()` + `new Worker()`).
 */
async function collectAssets(distDir: string): Promise<string[]> {
  const files = new Set<string>();

  // 1. Manifest: covers all modules in the import graph
  const manifestPath = path.join(distDir, ".vite", "manifest.json");
  if (
    await fs
      .access(manifestPath)
      .then(() => true)
      .catch(() => false)
  ) {
    const manifest: Record<
      string,
      { file: string; css?: string[]; assets?: string[] }
    > = JSON.parse(await fs.readFile(manifestPath, "utf-8"));
    for (const entry of Object.values(manifest)) {
      files.add(`/${entry.file}`);
      entry.css?.forEach((f) => files.add(`/${f}`));
      entry.assets?.forEach((f) => files.add(`/${f}`));
    }
  }

  // 2. Directory scan: catches workers and other assets not in the manifest
  const assetsDir = path.join(distDir, "assets");
  if (
    await fs
      .access(assetsDir)
      .then(() => true)
      .catch(() => false)
  ) {
    for (const f of await fs.readdir(assetsDir)) {
      if (/\.(js|css)$/.test(f)) {
        files.add(`/assets/${f}`);
      }
    }
  }

  return [...files];
}

/**
 * Vite plugin that builds src/sw.ts into dist/sw.js as a
 * separate entry after the main build completes.
 * Reads the Vite manifest to inject the full asset list for precaching.
 */
function buildServiceWorker(): Plugin {
  return {
    name: "build-sw",
    apply: "build",
    closeBundle: {
      sequential: true,
      async handler() {
        const distDir = path.resolve(__dirname, "dist");
        const assets = await collectAssets(distDir);

        await build({
          configFile: false,
          define: {
            ...DEFINE,
            __PRECACHE_ASSETS__: JSON.stringify(assets),
          },
          build: {
            emptyOutDir: false,
            lib: {
              entry: path.resolve(__dirname, "src/sw.ts"),
              formats: ["es"],
              fileName: () => "sw.js",
            },
            outDir: "dist",
          },
        });
        await fs.rm(path.join(distDir, ".vite"), {
          recursive: true,
          force: true,
        });
      },
    },
  };
}

/**
 * Dev-only plugin that handles /api/proxy requests directly in the Vite dev
 * server, mirroring the Cloudflare Pages Function in functions/api/proxy.ts.
 * This avoids needing to run `wrangler pages dev` locally.
 */
function devCorsProxy(): Plugin {
  return {
    name: "dev-cors-proxy",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/proxy", async (req, res) => {
        // Handle CORS preflight
        if (req.method === "OPTIONS") {
          res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers":
              "Content-Type, Authorization, X-Proxy-URL",
            "Access-Control-Max-Age": "86400",
          });
          res.end();
          return;
        }

        if (req.method !== "POST") {
          res.writeHead(405, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        // Read request body
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(chunk as Buffer);
        }
        const bodyStr = Buffer.concat(chunks).toString("utf-8");

        let proxyReq: {
          url: string;
          method: string;
          headers: Record<string, string>;
          body?: string;
        };
        try {
          proxyReq = JSON.parse(bodyStr);
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
          return;
        }

        if (!proxyReq.url || !proxyReq.method) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing url or method" }));
          return;
        }

        try {
          const targetHeaders = new Headers(proxyReq.headers || {});
          targetHeaders.delete("host");
          targetHeaders.delete("origin");
          targetHeaders.delete("referer");

          const fetchInit: RequestInit = {
            method: proxyReq.method,
            headers: targetHeaders,
          };

          if (
            proxyReq.body &&
            proxyReq.method !== "GET" &&
            proxyReq.method !== "HEAD"
          ) {
            fetchInit.body = proxyReq.body;
          }

          const upstream = await fetch(proxyReq.url, fetchInit);

          // Forward status and headers
          const corsHeaders: Record<string, string> = {
            "Access-Control-Allow-Origin": "*",
          };
          const ct = upstream.headers.get("content-type") || "application/json";
          corsHeaders["Content-Type"] = ct;

          for (const h of ["x-request-id", "request-id", "retry-after"]) {
            const val = upstream.headers.get(h);
            if (val) corsHeaders[h] = val;
          }

          const isStreaming =
            ct.includes("text/event-stream") ||
            ct.includes("application/x-ndjson");

          if (isStreaming && upstream.body) {
            res.writeHead(upstream.status, {
              ...corsHeaders,
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            });

            const reader = upstream.body.getReader();
            const pump = async () => {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
              }
              res.end();
            };
            pump().catch(() => res.end());
          } else {
            const text = await upstream.text();
            res.writeHead(upstream.status, corsHeaders);
            res.end(text);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          res.writeHead(502, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({ error: message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    blogPlugin(),
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    tailwindcss(),
    buildServiceWorker(),
    devCorsProxy(),
  ],
  define: {},
  build: {
    manifest: true,
    rolldownOptions: {
      output: {
        codeSplitting: {
          minSize: 10 * 1024, // 10KB — smaller chunks get inlined
          groups: [
            {
              name: "vendor-react",
              test: /node_modules\/(react|react-dom)\//,
              priority: 10,
            },
            {
              name: "vendor-base-ui",
              test: /@base-ui\/react/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
});
