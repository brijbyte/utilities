import { defineConfig, type Plugin } from "vite";
import { execSync } from "child_process";
import { build } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

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

console.log({ commitDateRaw });
const commitDate = parseToUTC(commitDateRaw).toISOString();

const DEFINE = {
  __COMMIT_HASH__: JSON.stringify(commitHash),
  __COMMIT_DATE__: JSON.stringify(commitDate),
};
/**
 * Vite plugin that builds src/sw.ts into dist/sw.js as a
 * separate entry after the main build completes.
 */
function buildServiceWorker(): Plugin {
  return {
    name: "build-sw",
    apply: "build",
    closeBundle: {
      sequential: true,
      async handler() {
        await build({
          configFile: false,
          define: DEFINE,
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
  define: DEFINE,
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("/react-dom/") || id.includes("/react/")) {
              return "vendor-react";
            }
            return null;
          }
        },
      },
    },
  },
});
