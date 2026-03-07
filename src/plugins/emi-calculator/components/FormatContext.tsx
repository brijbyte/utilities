/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createFmt,
  PRESETS,
  FORMAT_STORAGE_KEY,
  type Fmt,
} from "../utils/format";

// ── React context for locale-aware formatting ───────────────────────

interface FormatContextValue {
  fmt: Fmt;
  setLocale: (id: string) => void;
}

function loadPresetId(): string {
  if (typeof localStorage === "undefined") return "auto";
  return localStorage.getItem(FORMAT_STORAGE_KEY) ?? "auto";
}

function resolvePreset(id: string) {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}

const FormatCtx = createContext<FormatContextValue | null>(null);

export function FormatProvider({ children }: { children: ReactNode }) {
  const [presetId, setPresetId] = useState(loadPresetId);

  const fmt = useMemo(() => createFmt(resolvePreset(presetId)), [presetId]);

  const setLocale = useMemo(
    () => (id: string) => {
      const preset = PRESETS.find((p) => p.id === id);
      if (!preset) return;
      setPresetId(id);
      if (typeof localStorage !== "undefined") {
        if (id === "auto") localStorage.removeItem(FORMAT_STORAGE_KEY);
        else localStorage.setItem(FORMAT_STORAGE_KEY, id);
      }
    },
    [],
  );

  const value = useMemo(() => ({ fmt, setLocale }), [fmt, setLocale]);

  return <FormatCtx value={value}>{children}</FormatCtx>;
}

/** Returns { fmt, setLocale }. Must be used inside FormatProvider. */
export function useFormat(): FormatContextValue {
  const ctx = useContext(FormatCtx);
  if (!ctx) throw new Error("useFormat must be used inside FormatProvider");
  return ctx;
}
