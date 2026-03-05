import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { isPwa, persistRoute, getPersistedRoute } from "./pwa";

const hasRestored = { current: false };

export function PwaRouteRestore() {
  const location = useLocation();
  const navigate = useNavigate();

  // On first mount in PWA mode, redirect to persisted route
  useEffect(() => {
    if (!isPwa || hasRestored.current) return;
    hasRestored.current = true;
    const saved = getPersistedRoute();
    if (saved && saved !== "/" && saved !== location.pathname) {
      navigate(saved, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist route on every navigation
  useEffect(() => {
    persistRoute(location.pathname);
  }, [location.pathname]);

  return null;
}
