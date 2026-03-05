import { useEffect } from "react";
import { useLocation } from "react-router";
import { persistRoute } from "./pwa";

/** Persists the current route on every navigation (PWA mode only). */
export function PwaRoutePersist() {
  const { pathname } = useLocation();

  useEffect(() => {
    persistRoute(pathname);
  }, [pathname]);

  return null;
}
