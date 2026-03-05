/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Plugin, PluginOperation } from "./types";

interface RegistryContextValue {
  plugins: ReadonlyArray<Plugin>;
  operations: Map<string, PluginOperation>;
}

const RegistryContext = createContext<RegistryContextValue>({
  plugins: [],
  operations: new Map(),
});

export function RegistryProvider({
  plugins,
  children,
}: {
  plugins: Plugin[];
  children: ReactNode;
}) {
  const value = useMemo(() => {
    const operations = new Map<string, PluginOperation>();
    for (const plugin of plugins) {
      for (const op of plugin.operations ?? []) {
        operations.set(op.id, op);
      }
    }
    return { plugins, operations };
  }, [plugins]);

  return <RegistryContext value={value}>{children}</RegistryContext>;
}

export function usePlugins(): ReadonlyArray<Plugin> {
  return useContext(RegistryContext).plugins;
}

export function usePlugin(id: string): Plugin | undefined {
  const { plugins } = useContext(RegistryContext);
  return plugins.find((p) => p.id === id);
}

export function useOperations(): Map<string, PluginOperation> {
  return useContext(RegistryContext).operations;
}

export function useOperation(id: string): PluginOperation | undefined {
  return useOperations().get(id);
}
