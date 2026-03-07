import { createContext } from "react";
import type { StorageContextValue } from "../components/StorageContext";

export const StorageCtx = createContext<StorageContextValue | null>(null);
