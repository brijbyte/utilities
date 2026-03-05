import { createContext } from "react";
import type { StorageContextValue } from "./StorageContext";

export const StorageCtx = createContext<StorageContextValue | null>(null);
