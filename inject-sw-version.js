/**
 * Injects the current git commit hash (or SW_VERSION env var) into sw.js.
 * Run after `vite build` — operates on dist/sw.js.
 */

import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const version =
  process.env.SW_VERSION ||
  execSync("git rev-parse --short HEAD").toString().trim();

const swPath = "dist/sw.js";
const content = readFileSync(swPath, "utf-8");
writeFileSync(swPath, content.replace("__SW_VERSION__", version));

console.log(`sw.js version → ${version}`);
