import { Suspense, lazy, useEffect, type ComponentType } from "react";
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

function usePluginMeta(plugin: Plugin) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = `${plugin.name} — utilities`;

    const meta = plugin.meta;
    const descTag = document.querySelector('meta[name="description"]')
      ?? Object.assign(document.createElement("meta"), { name: "description" });
    descTag.setAttribute("content", meta.description);
    if (!descTag.parentNode) document.head.appendChild(descTag);

    const kwTag = document.querySelector('meta[name="keywords"]')
      ?? Object.assign(document.createElement("meta"), { name: "keywords" });
    kwTag.setAttribute("content", meta.keywords?.join(", ") ?? "");
    if (!kwTag.parentNode) document.head.appendChild(kwTag);

    return () => {
      document.title = prevTitle;
    };
  }, [plugin]);
}

export function AppPage() {
  const { id } = useParams<{ id: string }>();
  const plugin = usePlugin(id ?? "");

  if (!plugin) {
    return <Navigate to="/" replace />;
  }

  usePluginMeta(plugin);

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
