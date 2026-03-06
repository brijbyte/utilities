import { defineConfig, type Plugin } from "vite";
import { execSync } from "child_process";
import { build } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const commitHash =
  process.env.SW_VERSION ||
  execSync("git rev-parse --short HEAD").toString().trim();

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
          define: {
            __COMMIT_HASH__: JSON.stringify(commitHash),
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
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
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
