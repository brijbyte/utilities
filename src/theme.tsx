import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "utilities-theme";

const isServer = typeof window === "undefined";

function getStoredTheme(): Theme {
  if (isServer) return "system";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "system";
}

function getResolvedTheme(theme: Theme): "light" | "dark" {
  if (theme !== "system") return theme;
  if (isServer) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(resolved: "light" | "dark") {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

interface ThemeContext {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (t: Theme) => void;
}

const Ctx = createContext<ThemeContext>({
  theme: "system",
  resolved: "light",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(Ctx);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [resolved, setResolved] = useState<"light" | "dark">(() => getResolvedTheme(theme));

  function setTheme(t: Theme) {
    localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
    const r = getResolvedTheme(t);
    setResolved(r);
    applyTheme(r);
  }

  // listen for system changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    function handler() {
      if (theme === "system") {
        const r = getResolvedTheme("system");
        setResolved(r);
        applyTheme(r);
      }
    }
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  // apply on mount
  useEffect(() => {
    applyTheme(getResolvedTheme(theme));
  }, []);

  return <Ctx value={{ theme, resolved, setTheme }}>{children}</Ctx>;
}
