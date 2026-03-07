/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// ── Theme ───────────────────────────────────────────────────────────

export type Theme = "light" | "dark" | "system";

const THEME_KEY = "utilities-theme";

const isServer = typeof window === "undefined";

function getStoredTheme(): Theme {
  if (isServer) return "system";
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark" || stored === "system")
    return stored;
  return "system";
}

function getResolvedTheme(theme: Theme): "light" | "dark" {
  if (theme !== "system") return theme;
  if (isServer) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(resolved: "light" | "dark") {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

// ── Font size ───────────────────────────────────────────────────────

export type FontSize = "xs" | "sm" | "base" | "lg" | "xl";

export interface FontSizePreset {
  id: FontSize;
  label: string;
  /** Root font-size in px */
  px: number;
}

export const FONT_SIZE_PRESETS: FontSizePreset[] = [
  { id: "sm", label: "Small", px: 14 },
  { id: "base", label: "Default", px: 16 },
  { id: "lg", label: "Large", px: 18 },
  { id: "xl", label: "XL", px: 20 },
];

const FONT_SIZE_KEY = "utilities-font-size";
const DEFAULT_FONT_SIZE: FontSize = "base";

function getStoredFontSize(): FontSize {
  if (isServer) return DEFAULT_FONT_SIZE;
  const stored = localStorage.getItem(FONT_SIZE_KEY);
  if (FONT_SIZE_PRESETS.some((p) => p.id === stored)) return stored as FontSize;
  return DEFAULT_FONT_SIZE;
}

function applyFontSize(size: FontSize) {
  const preset = FONT_SIZE_PRESETS.find((p) => p.id === size);
  if (preset) {
    document.documentElement.style.fontSize = `${preset.px}px`;
  }
}

// ── Combined context ────────────────────────────────────────────────

interface ThemeContext {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (t: Theme) => void;
  fontSize: FontSize;
  setFontSize: (s: FontSize) => void;
}

const Ctx = createContext<ThemeContext>({
  theme: "system",
  resolved: "light",
  setTheme: () => {},
  fontSize: DEFAULT_FONT_SIZE,
  setFontSize: () => {},
});

export function useTheme() {
  return useContext(Ctx);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [resolved, setResolved] = useState<"light" | "dark">(() =>
    getResolvedTheme(theme),
  );
  const [fontSize, setFontSizeState] = useState<FontSize>(getStoredFontSize);

  function setTheme(t: Theme) {
    localStorage.setItem(THEME_KEY, t);
    setThemeState(t);
    const r = getResolvedTheme(t);
    setResolved(r);
    applyTheme(r);
  }

  function setFontSize(s: FontSize) {
    localStorage.setItem(FONT_SIZE_KEY, s);
    setFontSizeState(s);
    applyFontSize(s);
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
    applyFontSize(fontSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Ctx value={{ theme, resolved, setTheme, fontSize, setFontSize }}>
      {children}
    </Ctx>
  );
}
