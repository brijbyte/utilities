import { defineConfig } from "vite";
import { execSync } from "child_process";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const commitHash =
  process.env.SW_VERSION ||
  execSync("git rev-parse --short HEAD").toString().trim();

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    tailwindcss(),
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
