/**
 * Storage context — manages vault state, encryption, and sync.
 *
 * State machine:
 *   LOADING → check if vault exists
 *   FRESH   → no vault, no accounts (or has plaintext accounts in old IDB)
 *   LOCKED  → vault exists, needs password/biometric to unlock
 *   UNLOCKED → MK in memory, can read/write accounts
 *
 * Sync is layered on top: when enabled + authenticated, writes go to
 * both local vault and Drive (as encrypted blob).
 */

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  isVaultSetUp,
  setupVault,
  unlockVault,
  readVaultData,
  writeVaultData,
  exportVaultBlob,
  importVaultBlob,
  hasBioWrappedMK,
  saveBioWrappedMK,
  unlockWithBioKey,
  removeBioWrappedMK,
  type EncryptedBlob,
} from "./crypto";
import {
  isBiometricsSupported,
  hasBioCredential,
  registerBiometrics,
  authenticateBiometrics,
  clearBioCredential,
} from "./biometrics";
import {
  getStoredToken,
  getStoredUser,
  requestToken,
  requestTokenSilent,
  tryRefreshToken,
  logout as googleLogout,
  isGoogleSyncEnabled,
  setGoogleSyncEnabled,
} from "./google-auth";
import { downloadBlob, uploadBlob } from "./drive-sync";
import { getAllAccounts, deleteAccount as idbDeleteAccount } from "./db";
import type { TotpAccount } from "./db";
import { StorageCtx } from "./storage-ctx";

// ── Types ──────────────────────────────────────────────────────────

export type VaultState = "loading" | "fresh" | "locked" | "unlocked";

export interface StorageContextValue {
  // Vault state
  vaultState: VaultState;
  mk: CryptoKey | null;

  // Vault operations
  createVault: (password: string) => Promise<void>;
  unlock: (password: string) => Promise<boolean>;
  unlockWithBio: () => Promise<boolean>;
  lock: () => void;

  // Biometrics
  bioSupported: boolean;
  bioEnabled: boolean;
  enableBio: () => Promise<boolean>;
  disableBio: () => Promise<void>;

  // Account CRUD (encrypted)
  accounts: TotpAccount[];
  addAccount: (account: TotpAccount) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  refreshAccounts: () => Promise<void>;

  // Google Drive sync
  isGoogleLinked: boolean;
  isGoogleAuthenticated: boolean;
  googleLoading: boolean;
  googleUser: string | null;
  linkGoogle: () => Promise<void>;
  unlinkGoogle: () => Promise<void>;
  syncNow: () => Promise<void>;
  syncing: boolean;

  // Restore from Drive (for new device)
  checkDriveBackup: () => Promise<EncryptedBlob | null>;
  restoreFromDrive: (blob: EncryptedBlob, password: string) => Promise<boolean>;
}

const SYNC_INTERVAL = 5 * 60_000; // 5 minutes

// ── Provider ───────────────────────────────────────────────────────

export function StorageProvider({ children }: { children: ReactNode }) {
  const [vaultState, setVaultState] = useState<VaultState>("loading");
  const [mk, setMK] = useState<CryptoKey | null>(null);
  const [accounts, setAccounts] = useState<TotpAccount[]>([]);

  // Biometrics
  const [bioSupported, setBioSupported] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);

  // Google sync
  const [token, setToken] = useState<string | null>(null);
  const [isLinked, setIsLinked] = useState(isGoogleSyncEnabled);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [user, setUser] = useState<string | null>(getStoredUser);
  const [syncing, setSyncing] = useState(false);

  const hasToken = !!(token || getStoredToken());

  /** Timestamp of last successful sync. Used to throttle and schedule auto-sync. */
  const lastSyncRef = useRef(0);

  // ── Init: check vault state + biometric support ──────────────────

  useEffect(() => {
    async function init() {
      const [vaultExists, bioSup] = await Promise.all([
        isVaultSetUp(),
        isBiometricsSupported(),
      ]);
      setBioSupported(bioSup);

      if (vaultExists) {
        const hasBio = hasBioCredential() && (await hasBioWrappedMK());
        setBioEnabled(hasBio);
        setVaultState("locked");
      } else {
        // Check for legacy plaintext accounts
        setVaultState("fresh");
      }
    }
    init();
  }, []);

  // ── Init: restore Google token ───────────────────────────────────

  useEffect(() => {
    if (!isGoogleSyncEnabled()) return;
    const stored = getStoredToken();
    if (stored) {
      setToken(stored);
      setIsLinked(true);
      setUser(getStoredUser());
    } else {
      setIsLinked(true);
      setUser(getStoredUser());
      tryRefreshToken()
        .then((t) => {
          if (t) {
            setToken(t);
            setUser(getStoredUser());
            return;
          }
          return requestTokenSilent().then((t2) => {
            setToken(t2);
            setUser(getStoredUser());
          });
        })
        .catch(() => {
          // Stay in offline mode
        });
    }
  }, []);

  // ── Vault operations ─────────────────────────────────────────────

  const loadAccounts = useCallback(async (key: CryptoKey) => {
    const data = await readVaultData(key);
    setAccounts(data);
  }, []);

  const createVault = useCallback(
    async (password: string) => {
      // Migrate any existing plaintext accounts
      let existing: TotpAccount[] = [];
      try {
        existing = await getAllAccounts();
      } catch {
        // No legacy data
      }

      const key = await setupVault(password, existing);
      setMK(key);
      setAccounts(existing);
      setVaultState("unlocked");

      // Clean up plaintext IDB
      for (const a of existing) {
        try {
          await idbDeleteAccount(a.id);
        } catch {
          // ignore
        }
      }

      // If Google sync is active, upload the encrypted blob
      if (isLinked && hasToken) {
        try {
          const blob = await exportVaultBlob();
          if (blob) {
            const t = token ?? getStoredToken();
            if (t) await uploadBlob(t, blob);
          }
        } catch (e) {
          console.error("Failed to sync after vault creation:", e);
        }
      }
    },
    [isLinked, hasToken, token],
  );

  const unlock = useCallback(
    async (password: string): Promise<boolean> => {
      const key = await unlockVault(password);
      if (!key) return false;
      setMK(key);
      setVaultState("unlocked");
      await loadAccounts(key);
      return true;
    },
    [loadAccounts],
  );

  const unlockWithBio = useCallback(async (): Promise<boolean> => {
    try {
      const bioKey = await authenticateBiometrics();
      if (!bioKey) return false;
      const key = await unlockWithBioKey(bioKey);
      if (!key) return false;
      setMK(key);
      setVaultState("unlocked");
      await loadAccounts(key);
      return true;
    } catch {
      return false;
    }
  }, [loadAccounts]);

  const lock = useCallback(() => {
    setMK(null);
    setAccounts([]);
    setVaultState("locked");
  }, []);

  // ── Account CRUD ─────────────────────────────────────────────────

  const persistAndSync = useCallback(
    async (key: CryptoKey, updated: TotpAccount[]) => {
      await writeVaultData(key, updated);

      // Sync to Drive if enabled and not synced very recently
      if (isLinked) {
        const t = token ?? getStoredToken();
        if (t) {
          try {
            const blob = await exportVaultBlob();
            if (blob) {
              await uploadBlob(t, blob);
              lastSyncRef.current = Date.now();
            }
          } catch (e) {
            console.error("Drive sync failed:", e);
          }
        }
      }
    },
    [isLinked, token],
  );

  const addAccount = useCallback(
    async (account: TotpAccount) => {
      if (!mk) return;
      const updated = [...accounts, account];
      setAccounts(updated);
      await persistAndSync(mk, updated);
    },
    [mk, accounts, persistAndSync],
  );

  const removeAccount = useCallback(
    async (id: string) => {
      if (!mk) return;
      const updated = accounts.filter((a) => a.id !== id);
      setAccounts(updated);
      await persistAndSync(mk, updated);
    },
    [mk, accounts, persistAndSync],
  );

  const refreshAccounts = useCallback(async () => {
    if (!mk) return;
    await loadAccounts(mk);
  }, [mk, loadAccounts]);

  // ── Biometrics ───────────────────────────────────────────────────

  const enableBio = useCallback(async (): Promise<boolean> => {
    if (!mk) return false;
    try {
      const bioKey = await registerBiometrics();
      if (!bioKey) return false;
      await saveBioWrappedMK(mk, bioKey);
      setBioEnabled(true);
      return true;
    } catch {
      return false;
    }
  }, [mk]);

  const disableBio = useCallback(async () => {
    await removeBioWrappedMK();
    clearBioCredential();
    setBioEnabled(false);
  }, []);

  // ── Google Drive sync ────────────────────────────────────────────

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
    if (!mk) return;
    setGoogleLoading(true);
    try {
      const t = await ensureToken();

      const localBlob = await exportVaultBlob();
      const remote = await downloadBlob(t);

      if (remote && localBlob) {
        if (remote.updatedAt > localBlob.updatedAt) {
          // Remote is newer — accept remote
          const remoteAccounts = await decryptBlobWithMK(remote, mk);
          if (remoteAccounts) {
            await writeVaultData(mk, remoteAccounts);
            setAccounts(remoteAccounts);
          } else {
            // Can't decrypt remote (different password) — upload local
            await uploadBlob(t, localBlob);
          }
        } else {
          // Local is newer or equal — upload local
          await uploadBlob(t, localBlob);
        }
      } else if (localBlob) {
        await uploadBlob(t, localBlob);
      } else if (remote) {
        const remoteAccounts = await decryptBlobWithMK(remote, mk);
        if (remoteAccounts) {
          await writeVaultData(mk, remoteAccounts);
          setAccounts(remoteAccounts);
        }
      }

      setGoogleSyncEnabled(true);
      setIsLinked(true);
      setUser(getStoredUser());
    } finally {
      setGoogleLoading(false);
    }
  }, [mk, ensureToken]);

  const unlinkGoogle = useCallback(async () => {
    setGoogleLoading(true);
    try {
      googleLogout();
      setToken(null);
      setUser(null);
      setIsLinked(false);
    } finally {
      setGoogleLoading(false);
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!mk || !isLinked) return;
    const t = token ?? getStoredToken();
    if (!t) return;
    setSyncing(true);
    try {
      const localBlob = await exportVaultBlob();
      const remote = await downloadBlob(t);

      if (remote && localBlob) {
        if (remote.updatedAt > localBlob.updatedAt) {
          // Remote is newer — accept remote
          const remoteAccounts = await decryptBlobWithMK(remote, mk);
          if (remoteAccounts) {
            await writeVaultData(mk, remoteAccounts);
            setAccounts(remoteAccounts);
          }
        } else if (localBlob.updatedAt > remote.updatedAt) {
          // Local is newer — push to remote
          await uploadBlob(t, localBlob);
        }
        // Equal timestamps — already in sync, nothing to do
      } else if (localBlob && !remote) {
        // No remote — upload local
        await uploadBlob(t, localBlob);
      } else if (remote && !localBlob) {
        // No local — accept remote
        const remoteAccounts = await decryptBlobWithMK(remote, mk);
        if (remoteAccounts) {
          await writeVaultData(mk, remoteAccounts);
          setAccounts(remoteAccounts);
        }
      }
      lastSyncRef.current = Date.now();
    } catch (e) {
      console.error("Sync failed:", e);
    } finally {
      setSyncing(false);
    }
  }, [mk, isLinked, token]);

  // ── Auto-sync on interval ────────────────────────────────────────

  useEffect(() => {
    if (!mk || !isLinked) return;
    const id = setInterval(() => {
      if (Date.now() - lastSyncRef.current >= SYNC_INTERVAL) {
        syncNow();
      }
    }, 60_000); // check every minute
    return () => clearInterval(id);
  }, [mk, isLinked, syncNow]);

  // ── Restore from Drive ───────────────────────────────────────────

  const checkDriveBackup =
    useCallback(async (): Promise<EncryptedBlob | null> => {
      try {
        const t = await ensureToken();
        return await downloadBlob(t);
      } catch {
        return null;
      }
    }, [ensureToken]);

  const restoreFromDrive = useCallback(
    async (blob: EncryptedBlob, password: string): Promise<boolean> => {
      const key = await importVaultBlob(blob, password);
      if (!key) return false;
      setMK(key);
      await loadAccounts(key);
      setVaultState("unlocked");
      setGoogleSyncEnabled(true);
      setIsLinked(true);
      setUser(getStoredUser());
      return true;
    },
    [loadAccounts],
  );

  // ── Context value ────────────────────────────────────────────────

  const value = useMemo<StorageContextValue>(
    () => ({
      vaultState,
      mk,
      createVault,
      unlock,
      unlockWithBio,
      lock,
      bioSupported,
      bioEnabled,
      enableBio,
      disableBio,
      accounts,
      addAccount,
      removeAccount,
      refreshAccounts,
      isGoogleLinked: isLinked,
      isGoogleAuthenticated: hasToken,
      googleLoading,
      googleUser: user,
      linkGoogle,
      unlinkGoogle,
      syncNow,
      syncing,
      checkDriveBackup,
      restoreFromDrive,
    }),
    [
      vaultState,
      mk,
      createVault,
      unlock,
      unlockWithBio,
      lock,
      bioSupported,
      bioEnabled,
      enableBio,
      disableBio,
      accounts,
      addAccount,
      removeAccount,
      refreshAccounts,
      isLinked,
      hasToken,
      googleLoading,
      user,
      linkGoogle,
      unlinkGoogle,
      syncNow,
      syncing,
      checkDriveBackup,
      restoreFromDrive,
    ],
  );

  return <StorageCtx value={value}>{children}</StorageCtx>;
}

// ── Helpers ────────────────────────────────────────────────────────

/** Try to decrypt a remote blob with the current MK (same password). */
async function decryptBlobWithMK(
  blob: EncryptedBlob,
  mk: CryptoKey,
): Promise<TotpAccount[] | null> {
  if (!blob.ciphertext) return [];
  try {
    const iv = base64ToBuf(blob.dataIv);
    const ciphertext = base64ToBuf(blob.ciphertext);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      mk,
      ciphertext,
    );
    return JSON.parse(new TextDecoder().decode(plain));
  } catch {
    return null; // Different password
  }
}

function base64ToBuf(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}
