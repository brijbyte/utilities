import { useContext } from "react";
import { StorageCtx } from "./storage-ctx";
import type { StorageContextValue } from "./StorageContext";

export function useStorage(): StorageContextValue {
  const v = useContext(StorageCtx);
  if (!v) throw new Error("useStorage must be used within StorageProvider");
  return v;
}
