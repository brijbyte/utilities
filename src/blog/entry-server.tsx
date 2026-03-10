/**
 * Blog SSR entry — used by prerender.js to render blog routes to static HTML.
 * Separate from the main app's entry-server.tsx so the blog can be rendered
 * independently with its own component tree (no app providers, no toasts, etc).
 */

import { renderToString } from "react-dom/server";
import { StaticRouter, Route, Routes } from "react-router";
import { BlogIndexPage } from "./BlogIndexPage";
import { BlogArticlePage } from "./BlogArticlePage";

export function renderBlog(url: string): string {
  return renderToString(
    <StaticRouter location={url}>
      <Routes>
        <Route path="/blog" element={<BlogIndexPage />} />
        <Route path="/blog/:slug" element={<BlogArticlePage />} />
      </Routes>
    </StaticRouter>,
  );
}
