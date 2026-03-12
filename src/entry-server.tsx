import { renderToString } from "react-dom/server";
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from "react-router";
import { routes } from "./routes";

export async function render(url: string) {
  const handler = createStaticHandler(routes);

  // createStaticHandler.query expects a Request object
  const request = new Request(`http://localhost${url}`, { method: "GET" });
  const context = await handler.query(request);

  // If context is a Response (redirect), return empty — shouldn't happen for "/"
  if (context instanceof Response) {
    return "";
  }

  const router = createStaticRouter(routes, context);

  return renderToString(
    <StaticRouterProvider router={router} context={context} />,
  );
}
