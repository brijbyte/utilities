/**
 * React context for the chat store.
 */

import { createContext, useContext, useSyncExternalStore } from "react";
import { Store, type StoreState } from "./store";

export const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used within StoreProvider");
  return store;
}

export function useStoreState(): StoreState {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
