/**
 * Cached Google Drive adapter.
 * - getAll: returns encrypted cache instantly, then syncs from Drive in background
 * - add/remove: update cache optimistically, then persist to Drive
 * - On errors, cache stays consistent with last known good state
 */

import type { TotpAccount } from "./db";
import type { StorageAdapter } from "./storage";
import { createGoogleDriveAdapter } from "./storage";
import { readCache, writeCache } from "./crypto-cache";

export function createCachedDriveAdapter(
  getToken: () => string | null,
  /** Called when background sync updates data (so UI can refresh). */
  onBackgroundSync?: (accounts: TotpAccount[]) => void,
): StorageAdapter {
  const drive = createGoogleDriveAdapter(getToken);

  /** Try to sync from Drive and update cache. Returns merged accounts. */
  async function syncFromDrive(): Promise<TotpAccount[] | null> {
    try {
      const token = getToken();
      if (!token) return null;
      const remote = await drive.getAll();
      await writeCache(remote);
      return remote;
    } catch {
      return null;
    }
  }

  return {
    async getAll() {
      // Return cache immediately
      const cached = await readCache();

      // Background sync from Drive
      syncFromDrive().then((remote) => {
        if (remote && onBackgroundSync) {
          onBackgroundSync(remote);
        }
      });

      return cached;
    },

    async add(account) {
      // Update cache immediately
      const cached = await readCache();
      const idx = cached.findIndex((a) => a.id === account.id);
      if (idx >= 0) cached[idx] = account;
      else cached.push(account);
      await writeCache(cached);

      // Persist to Drive
      await drive.add(account);

      // Re-sync to pick up any Drive-side state
      const remote = await syncFromDrive();
      if (remote && onBackgroundSync) onBackgroundSync(remote);
    },

    async remove(id) {
      // Update cache immediately
      const cached = await readCache();
      await writeCache(cached.filter((a) => a.id !== id));

      // Persist to Drive
      await drive.remove(id);

      // Re-sync
      const remote = await syncFromDrive();
      if (remote && onBackgroundSync) onBackgroundSync(remote);
    },
  };
}
