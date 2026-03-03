import React, { createContext, useContext } from "react";
import type { Semaphore } from "./semaphore";

interface HashContextValue {
  signal: React.RefObject<AbortController | null>;
  semaphore: React.RefObject<Semaphore>;
  flashCopied: (key: string) => void;
  onFileComplete: () => void;
}

const HashContext = createContext<HashContextValue | null>(null);

export const HashContextProvider = HashContext.Provider;

export function useHashContext(): HashContextValue {
  const ctx = useContext(HashContext);
  if (!ctx)
    throw new Error("useHashContext must be used within HashContextProvider");
  return ctx;
}
