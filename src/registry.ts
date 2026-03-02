import { createContext, useContext } from "react";
import type { Plugin } from "./types";

const RegistryContext = createContext<ReadonlyArray<Plugin>>([]);

export const RegistryProvider = RegistryContext.Provider;

export function usePlugins(): ReadonlyArray<Plugin> {
  return useContext(RegistryContext);
}

export function usePlugin(id: string): Plugin | undefined {
  const plugins = usePlugins();
  return plugins.find((p) => p.id === id);
}
