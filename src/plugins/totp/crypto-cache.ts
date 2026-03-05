/**
 * Encrypted local cache using AES-GCM with a non-extractable CryptoKey.
 * Key and encrypted data are stored in a dedicated IndexedDB database.
 * Deleting the key renders cached data irrecoverable.
 */

import type { TotpAccount } from "./db";

const DB_NAME = "totp-cache";
const DB_VERSION = 1;
const KEY_STORE = "crypto-keys";
const DATA_STORE = "encrypted-data";
const KEY_ID = "cache-key";
const DATA_ID = "accounts";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(KEY_STORE))
        db.createObjectStore(KEY_STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(DATA_STORE))
        db.createObjectStore(DATA_STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet<T>(
  db: IDBDatabase,
  store: string,
  key: string,
): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, store: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbClear(db: IDBDatabase, store: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Key management ─────────────────────────────────────────────────

async function getOrCreateKey(): Promise<CryptoKey> {
  const db = await openDB();
  const existing = await idbGet<{ id: string; key: CryptoKey }>(
    db,
    KEY_STORE,
    KEY_ID,
  );
  if (existing) return existing.key;

  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false, // non-extractable
    ["encrypt", "decrypt"],
  );
  await idbPut(db, KEY_STORE, { id: KEY_ID, key });
  return key;
}

// ── Encrypt / decrypt ──────────────────────────────────────────────

async function encrypt(
  key: CryptoKey,
  data: TotpAccount[],
): Promise<{ iv: Uint8Array; cipher: ArrayBuffer }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );
  return { iv, cipher };
}

async function decrypt(
  key: CryptoKey,
  iv: Uint8Array,
  cipher: ArrayBuffer,
): Promise<TotpAccount[]> {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as Uint8Array<ArrayBuffer> },
    key,
    cipher,
  );
  const json = new TextDecoder().decode(decrypted);
  return JSON.parse(json);
}

// ── Public API ─────────────────────────────────────────────────────

/** Read cached accounts (returns [] if no cache or decryption fails). */
export async function readCache(): Promise<TotpAccount[]> {
  try {
    const db = await openDB();
    const entry = await idbGet<{
      id: string;
      iv: Uint8Array;
      cipher: ArrayBuffer;
    }>(db, DATA_STORE, DATA_ID);
    if (!entry) return [];
    const keyEntry = await idbGet<{ id: string; key: CryptoKey }>(
      db,
      KEY_STORE,
      KEY_ID,
    );
    if (!keyEntry) return [];
    return await decrypt(keyEntry.key, entry.iv, entry.cipher);
  } catch {
    return [];
  }
}

/** Write accounts to encrypted cache. */
export async function writeCache(accounts: TotpAccount[]): Promise<void> {
  const key = await getOrCreateKey();
  const { iv, cipher } = await encrypt(key, accounts);
  const db = await openDB();
  await idbPut(db, DATA_STORE, { id: DATA_ID, iv, cipher });
}

/** Destroy all cached data and the encryption key. */
export async function destroyCache(): Promise<void> {
  const db = await openDB();
  await idbClear(db, DATA_STORE);
  await idbClear(db, KEY_STORE);
}
