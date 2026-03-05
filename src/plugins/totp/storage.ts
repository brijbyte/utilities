/**
 * Storage adapter interface and implementations for TOTP accounts.
 * Supports IndexedDB (default) and Google Drive appdata (opt-in).
 */

import type { TotpAccount } from "./db";
import {
  getAllAccounts as idbGetAll,
  addAccount as idbAdd,
  deleteAccount as idbDelete,
} from "./db";

// ── Adapter interface ──────────────────────────────────────────────

export interface StorageAdapter {
  getAll(): Promise<TotpAccount[]>;
  add(account: TotpAccount): Promise<void>;
  remove(id: string): Promise<void>;
  /** Optional: clear all data (used during migration) */
  clear?(): Promise<void>;
}

// ── IndexedDB adapter ──────────────────────────────────────────────

export const indexedDBAdapter: StorageAdapter = {
  getAll: idbGetAll,
  add: idbAdd,
  remove: idbDelete,
  async clear() {
    const accounts = await idbGetAll();
    for (const a of accounts) await idbDelete(a.id);
  },
};

// ── Google Drive appdata adapter ───────────────────────────────────

const DRIVE_FILE_NAME = "totp-accounts.json";
const DRIVE_API = "https://www.googleapis.com/";

async function driveHeaders(token: string): Promise<HeadersInit> {
  return { Authorization: `Bearer ${token}` };
}

/** Find the file ID of our data file in appdata, or null. */
async function findFile(token: string): Promise<string | null> {
  const params = new URLSearchParams({
    spaces: "appDataFolder",
    q: `name='${DRIVE_FILE_NAME}'`,
    fields: "files(id)",
  });
  const res = await fetch(`${DRIVE_API}drive/v3/files?${params}`, {
    headers: await driveHeaders(token),
  });
  if (!res.ok) throw new Error(`Drive list failed: ${res.status}`);
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

export function createGoogleDriveAdapter(
  getToken: () => string | null,
): StorageAdapter {
  let cachedFileId: string | null | undefined; // undefined = not looked up yet

  function token(): string {
    const t = getToken();
    if (!t) throw new Error("Not authenticated with Google");
    return t;
  }

  async function resolveFileId(t: string): Promise<string | null> {
    if (cachedFileId !== undefined) return cachedFileId;
    cachedFileId = await findFile(t);
    return cachedFileId;
  }

  async function read(t: string): Promise<TotpAccount[]> {
    const fileId = await resolveFileId(t);
    if (!fileId) return [];
    const res = await fetch(`${DRIVE_API}drive/v3/files/${fileId}?alt=media`, {
      headers: await driveHeaders(t),
    });
    if (!res.ok) throw new Error(`Drive read failed: ${res.status}`);
    return res.json();
  }

  async function write(t: string, accounts: TotpAccount[]): Promise<void> {
    const fileId = await resolveFileId(t);
    const body = JSON.stringify(accounts);

    if (fileId) {
      const res = await fetch(
        `${DRIVE_API}upload/drive/v3/files/${fileId}?uploadType=media`,
        {
          method: "PATCH",
          headers: {
            ...(await driveHeaders(t)),
            "Content-Type": "application/json",
          },
          body,
        },
      );
      if (!res.ok) throw new Error(`Drive update failed: ${res.status}`);
    } else {
      const metadata = {
        name: DRIVE_FILE_NAME,
        parents: ["appDataFolder"],
      };
      const boundary = "totp_boundary";
      const multipart =
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;

      const res = await fetch(
        `${DRIVE_API}upload/drive/v3/files?uploadType=multipart`,
        {
          method: "POST",
          headers: {
            ...(await driveHeaders(t)),
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
          body: multipart,
        },
      );
      if (!res.ok) throw new Error(`Drive create failed: ${res.status}`);
      // Cache the new file ID
      const data = await res.json();
      cachedFileId = data.id;
    }
  }

  return {
    async getAll() {
      return read(token());
    },
    async add(account) {
      const t = token();
      const accounts = await read(t);
      const idx = accounts.findIndex((a) => a.id === account.id);
      if (idx >= 0) accounts[idx] = account;
      else accounts.push(account);
      await write(t, accounts);
    },
    async remove(id) {
      const t = token();
      const accounts = await read(t);
      await write(
        t,
        accounts.filter((a) => a.id !== id),
      );
    },
    async clear() {
      const t = token();
      const fileId = await resolveFileId(t);
      if (fileId) {
        await fetch(`${DRIVE_API}drive/v3/files/${fileId}`, {
          method: "DELETE",
          headers: await driveHeaders(t),
        });
        cachedFileId = undefined;
      }
    },
  };
}
