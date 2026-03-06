import { defineConfig, type Plugin } from "vite";
import { execSync } from "child_process";
import { build } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
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

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    tailwindcss(),
    buildServiceWorker(),
  ],
  define: {
    ...DEFINE,
  },
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
