import { createContext, type RefObject } from "react";
import type { StorageContextValue } from "./StorageContext";
import type { TotpAccount } from "./db";

export const StorageCtx = createContext<StorageContextValue | null>(null);

export const BgSyncContext = createContext<
  RefObject<((accounts: TotpAccount[]) => void) | null>
>({ current: null });
