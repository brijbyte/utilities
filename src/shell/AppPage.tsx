import { Suspense, lazy, type ComponentType } from "react";
import { useParams, Navigate } from "react-router";
import { usePlugin } from "../registry";
import { Header } from "./Header";
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

export function AppPage() {
  const { id } = useParams<{ id: string }>();
  const plugin = usePlugin(id ?? "");

  if (!plugin) {
    return <Navigate to="/" replace />;
  }

  const LazyComponent = getLazyComponent(plugin);
  const fallback = plugin.skeleton ? plugin.skeleton() : <DefaultSkeleton />;

  return (
    <div className="h-full flex flex-col">
      <Header />
      <main className="flex-1 min-h-0">
        <Suspense key={id} fallback={fallback}>
          <LazyComponent />
        </Suspense>
      </main>
    </div>
  );
}
