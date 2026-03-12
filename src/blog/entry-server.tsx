/**
 * Blog SSR entry — used by the prerender Vite plugin to render blog routes to static HTML.
 * Separate from the main app's entry-server.tsx so the blog can be rendered
 * independently with its own component tree (no app providers, no toasts, etc).
 */

import { renderToString } from "react-dom/server";
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from "react-router";
import type { RouteObject } from "react-router";
import { BlogIndexPage } from "./BlogIndexPage";
import { BlogArticlePage } from "./BlogArticlePage";

const routes: RouteObject[] = [
  { path: "/blog", Component: BlogIndexPage },
  { path: "/blog/:slug", Component: BlogArticlePage },
];

export async function renderBlog(url: string): Promise<string> {
  const handler = createStaticHandler(routes);
  const request = new Request(`http://localhost${url}`, { method: "GET" });
  const context = await handler.query(request);

  if (context instanceof Response) return "";

  const router = createStaticRouter(routes, context);
  return renderToString(
    <StaticRouterProvider router={router} context={context} />,
  );
}
