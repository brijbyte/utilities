import { createContext, useContext } from "react";
import type { Semaphore } from "./semaphore";

interface HashContextValue {
  signal: AbortSignal;
  semaphore: Semaphore;
  flashCopied: (key: string) => void;
}

const HashContext = createContext<HashContextValue | null>(null);

export const HashContextProvider = HashContext.Provider;

export function useHashContext(): HashContextValue {
  const ctx = useContext(HashContext);
  if (!ctx) throw new Error("useHashContext must be used within HashContextProvider");
  return ctx;
}
