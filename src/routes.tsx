import type { RouteObject } from "react-router";
import { AppLayout } from "./App";
import { HomePage } from "./shell/HomePage";
import { AppPage } from "./shell/AppPage";
import { PluginPage } from "./shell/PluginPage";

export const routes: RouteObject[] = [
  {
    path: "/",
    Component: AppLayout,
    children: [
      { index: true, Component: HomePage },
      {
        path: "a",
        Component: AppPage,
        children: [{ path: ":id", Component: PluginPage }],
      },
    ],
  },
];
