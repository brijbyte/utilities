/**
 * Storage context — manages active adapter and Google sync state.
 * Wraps the TOTP app to provide transparent storage switching.
 */

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import {
  type StorageAdapter,
  indexedDBAdapter,
  createGoogleDriveAdapter,
} from "./storage";
import {
  getStoredToken,
  getStoredUser,
  requestToken,
  logout as googleLogout,
  isGoogleSyncEnabled,
  setGoogleSyncEnabled,
} from "./google-auth";

export interface StorageContextValue {
  adapter: StorageAdapter;
  isGoogleLinked: boolean;
  googleLoading: boolean;
  googleUser: string | null;
  linkGoogle: () => Promise<void>;
  unlinkGoogle: () => Promise<void>;
}

import { StorageCtx } from "./storage-ctx";

export function StorageProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLinked, setIsLinked] = useState(isGoogleSyncEnabled);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<string | null>(getStoredUser);

  // On mount, if sync enabled, try to restore token silently
  useEffect(() => {
    if (!isGoogleSyncEnabled()) return;
    const stored = getStoredToken();
    if (stored) {
      setToken(stored);
      setIsLinked(true);
      setUser(getStoredUser());
    }
  }, []);

  const driveAdapter = useMemo(
    () =>
      createGoogleDriveAdapter(() => token ?? getStoredToken()),
    [token],
  );

  const adapter: StorageAdapter =
    isLinked && (token || getStoredToken()) ? driveAdapter : indexedDBAdapter;

  const ensureToken = useCallback(async (): Promise<string> => {
    const existing = getStoredToken();
    if (existing) {
      setToken(existing);
      return existing;
    }
    const t = await requestToken();
    setToken(t);
    return t;
  }, []);

  const linkGoogle = useCallback(async () => {
    setLoading(true);
    try {
      await ensureToken();

      // Migrate local data to Drive
      const localAccounts = await indexedDBAdapter.getAll();
      if (localAccounts.length > 0) {
        const tempAdapter = createGoogleDriveAdapter(() => getStoredToken());
        const remoteAccounts = await tempAdapter.getAll();
        const remoteIds = new Set(remoteAccounts.map((a) => a.id));

        for (const acc of localAccounts) {
          if (!remoteIds.has(acc.id)) {
            // Merge: add each missing account individually to avoid overwriting
            remoteAccounts.push(acc);
          }
        }
        // Write merged set
        for (const acc of remoteAccounts) {
          await tempAdapter.add(acc);
        }
        // Clear local
        await indexedDBAdapter.clear!();
      }

      setGoogleSyncEnabled(true);
      setIsLinked(true);
      setUser(getStoredUser());
    } finally {
      setLoading(false);
    }
  }, [ensureToken]);

  const unlinkGoogle = useCallback(async () => {
    setLoading(true);
    try {
      // Migrate Drive data back to local
      if (token || getStoredToken()) {
        try {
          const tempAdapter = createGoogleDriveAdapter(
            () => token ?? getStoredToken(),
          );
          const remoteAccounts = await tempAdapter.getAll();
          for (const acc of remoteAccounts) {
            await indexedDBAdapter.add(acc);
          }
        } catch {
          // If we can't read from Drive, just proceed with unlink
        }
      }
      googleLogout();
      setToken(null);
      setUser(null);
      setIsLinked(false);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const value = useMemo<StorageContextValue>(
    () => ({
      adapter,
      isGoogleLinked: isLinked,
      googleLoading: loading,
      googleUser: user,
      linkGoogle,
      unlinkGoogle,
    }),
    [adapter, isLinked, loading, user, linkGoogle, unlinkGoogle],
  );

  return <StorageCtx value={value}>{children}</StorageCtx>;
}
