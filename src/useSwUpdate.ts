import { useSyncExternalStore } from "react";
import { isUpdateAvailable, subscribeToUpdate } from "./sw-update";

const serverSnapshot = () => false;

export function useSwUpdate() {
  return useSyncExternalStore(
    subscribeToUpdate,
    isUpdateAvailable,
    serverSnapshot,
  );
}
