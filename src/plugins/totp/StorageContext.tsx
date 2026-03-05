/**
 * Storage context — manages active adapter and Google sync state.
 * Wraps the TOTP app to provide transparent storage switching.
 */

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { type StorageAdapter, indexedDBAdapter } from "./storage";
import { createCachedDriveAdapter } from "./cached-drive-adapter";
import { readCache, writeCache, destroyCache } from "./crypto-cache";
import { mergeAccounts } from "./merge";
import {
  getStoredToken,
  getStoredUser,
  requestToken,
  logout as googleLogout,
  isGoogleSyncEnabled,
  setGoogleSyncEnabled,
} from "./google-auth";
import { StorageCtx, BgSyncContext } from "./storage-ctx";
import type { TotpAccount } from "./db";

export interface StorageContextValue {
  adapter: StorageAdapter;
  isGoogleLinked: boolean;
  googleLoading: boolean;
  googleUser: string | null;
  linkGoogle: () => Promise<void>;
  unlinkGoogle: () => Promise<void>;
}

export function StorageProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLinked, setIsLinked] = useState(isGoogleSyncEnabled);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<string | null>(getStoredUser);

  // Ref for background sync callback — avoids stale closure in adapter
  const bgSyncRef = useRef<((accounts: TotpAccount[]) => void) | null>(null);

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

  const cachedDriveAdapter = useMemo(
    () =>
      createCachedDriveAdapter(
        () => token ?? getStoredToken(),
        (accounts) => bgSyncRef.current?.(accounts),
      ),
    [token],
  );

  const hasToken = !!(token || getStoredToken());
  const adapter: StorageAdapter = useMemo(() => {
    if (!isLinked) return indexedDBAdapter;
    if (hasToken) return cachedDriveAdapter;
    // Offline — no token but sync enabled: read/write encrypted cache only
    return {
      async getAll() {
        return readCache();
      },
      async add(account) {
        const cached = await readCache();
        const idx = cached.findIndex((a) => a.id === account.id);
        if (idx >= 0) cached[idx] = account;
        else cached.push(account);
        await writeCache(cached);
      },
      async remove(id) {
        const cached = await readCache();
        await writeCache(cached.filter((a) => a.id !== id));
      },
    };
  }, [isLinked, hasToken, cachedDriveAdapter]);

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
      const t = await ensureToken();

      // Collect local accounts before clearing
      const localAccounts = await indexedDBAdapter.getAll();

      // Fetch remote accounts from Drive
      const { createGoogleDriveAdapter } = await import("./storage");
      const tempDrive = createGoogleDriveAdapter(() => t);
      const remoteAccounts = await tempDrive.getAll();

      // Merge: dedupe by (issuer + label + secret), prefer remote for conflicts
      const merged = mergeAccounts(remoteAccounts, localAccounts);

      // Write merged set to Drive
      // We need to do a full write — use the raw Drive functions via the adapter
      // Clear and rewrite: remove all then add merged
      if (merged.length > 0) {
        // Write all at once — clear remote first if it existed, then write merged
        for (const acc of merged) {
          await tempDrive.add(acc);
        }
      }

      // Encrypt and cache locally
      await writeCache(merged);

      // Clear plaintext local data
      await indexedDBAdapter.clear!();

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
      // Read from cache (works offline too) and restore to local IDB
      const cached = await readCache();
      for (const acc of cached) {
        await indexedDBAdapter.add(acc);
      }

      // Destroy encrypted cache and key
      await destroyCache();

      googleLogout();
      setToken(null);
      setUser(null);
      setIsLinked(false);
    } finally {
      setLoading(false);
    }
  }, []);

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

  return (
    <BgSyncContext.Provider value={bgSyncRef}>
      <StorageCtx value={value}>{children}</StorageCtx>
    </BgSyncContext.Provider>
  );
}
