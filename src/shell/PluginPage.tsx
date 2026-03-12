import { Navigate, useParams } from "react-router";
import { usePlugin } from "../registry";
import { lazy, Suspense, type ComponentType } from "react";
import type { Plugin } from "../types";

function DefaultSkeleton() {
  return (
    <div className="flex items-center justify-center h-full text-text-muted text-sm">
      loading...
    </div>
  );
}

const lazyCache = new Map<string, React.LazyExoticComponent<ComponentType>>();

function getLazyComponent(plugin: Plugin) {
  let cached = lazyCache.get(plugin.id);
  if (!cached) {
    cached = lazy(plugin.load);
    lazyCache.set(plugin.id, cached);
  }
  return cached;
}

export function PluginPage() {
  const { id } = useParams<{ id: string }>();
  const plugin = usePlugin(id ?? "");

  if (!plugin) {
    return <Navigate to="/" replace />;
  }

  const LazyComponent = getLazyComponent(plugin);
  const fallback = plugin.skeleton?.() ?? <DefaultSkeleton />;
  return (
    <Suspense key={plugin.id} fallback={fallback}>
      {/* eslint-disable-next-line react-hooks/static-components */}
      <LazyComponent />
    </Suspense>
  );
}
