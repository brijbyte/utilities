// SW build-time defines (only used in sw.ts)
declare const __COMMIT_HASH__: string;
declare const __PRECACHE_ASSETS__: string[];

// Runtime globals set via inline script in index.html
interface Window {
  __APP_VERSION__?: string;
  __APP_DATE__?: string;
}

// Virtual module provided by src/blog/vite-plugin.ts
declare module "virtual:blog-data" {
  import type { ArticleMeta } from "./blog/types";
  export const articles: ArticleMeta[];
  export const articleMap: Record<
    string,
    { meta: ArticleMeta; contentHtml: string }
  >;
}
