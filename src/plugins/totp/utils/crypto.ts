/**
 * Encryption layer for TOTP accounts.
 *
 * Architecture:
 *   Password → PBKDF2 → Master Key (MK)
 *   MK encrypts/decrypts all TOTP data via AES-256-GCM.
 *
 * Biometrics (optional per-device convenience):
 *   Passkey PRF → wrapping key → wraps MK
 *   So user can unlock with biometrics instead of retyping password.
 *
 * Storage layout in IndexedDB ("totp-vault"):
 *   "vault-meta"  → { salt, iv, verifier }   (plaintext metadata)
 *   "vault-data"  → { iv, ciphertext }        (encrypted accounts blob)
 *   "vault-bio"   → { iv, wrappedMK }         (MK wrapped with PRF key, per-device)
 */

import type { TotpAccount } from "./db";

// ── Constants ──────────────────────────────────────────────────────

const DB_NAME = "totp-vault";
const DB_VERSION = 1;
const META_STORE = "meta";
const DATA_STORE = "data";

const META_KEY = "vault-meta";
const DATA_KEY = "vault-data";
const BIO_KEY = "vault-bio";

/** PBKDF2 iterations — 600k is OWASP recommended for SHA-256 (2023). */
const PBKDF2_ITERATIONS = 600_000;

/** A known plaintext we encrypt with the MK to verify password correctness. */
const VERIFIER_PLAINTEXT = new TextEncoder().encode("totp-vault-ok");

// ── Types ──────────────────────────────────────────────────────────

export interface VaultMeta {
  id: string; // always META_KEY
  salt: ArrayBuffer; // PBKDF2 salt (16 bytes)
  verifierIv: ArrayBuffer; // IV for the verifier ciphertext
  verifier: ArrayBuffer; // AES-GCM(MK, verifierIv, VERIFIER_PLAINTEXT)
  accountCount: number; // readable without decryption (for restore UI)
  updatedAt: number; // last write timestamp
}

interface VaultData {
  id: string; // always DATA_KEY
  iv: ArrayBuffer;
  ciphertext: ArrayBuffer;
}

interface VaultBio {
  id: string; // always BIO_KEY
  iv: ArrayBuffer;
  wrappedMK: ArrayBuffer; // AES-KW or AES-GCM wrapped raw MK bytes
}

// ── IndexedDB helpers ──────────────────────────────────────────────

function openVaultDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(META_STORE))
        db.createObjectStore(META_STORE, { keyPath: "id" });
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

function idbDelete(db: IDBDatabase, store: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Key derivation ─────────────────────────────────────────────────

/** Derive an AES-256-GCM key from password + salt via PBKDF2. */
async function deriveKeyFromPassword(
  password: string,
  salt: ArrayBuffer,
): Promise<CryptoKey> {
  const encoded = new TextEncoder().encode(password);
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoded,
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    true, // extractable — we need to export raw bytes for bio wrapping
    ["encrypt", "decrypt"],
  );
}

// ── Encrypt / Decrypt ──────────────────────────────────────────────

async function encryptData(
  key: CryptoKey,
  data: TotpAccount[],
): Promise<{ iv: ArrayBuffer; ciphertext: ArrayBuffer }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );
  return { iv: iv.buffer as ArrayBuffer, ciphertext };
}

async function decryptData(
  key: CryptoKey,
  iv: ArrayBuffer,
  ciphertext: ArrayBuffer,
): Promise<TotpAccount[]> {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );
  return JSON.parse(new TextDecoder().decode(plain));
}

// ── Verifier (password correctness check) ──────────────────────────

async function createVerifier(
  key: CryptoKey,
): Promise<{ iv: ArrayBuffer; ciphertext: ArrayBuffer }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    VERIFIER_PLAINTEXT,
  );
  return { iv: iv.buffer as ArrayBuffer, ciphertext };
}

async function checkVerifier(
  key: CryptoKey,
  iv: ArrayBuffer,
  ciphertext: ArrayBuffer,
): Promise<boolean> {
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext,
    );
    const decoded = new TextDecoder().decode(plain);
    return decoded === new TextDecoder().decode(VERIFIER_PLAINTEXT);
  } catch {
    return false; // wrong password → decryption fails
  }
}

// ── Biometric key wrapping ─────────────────────────────────────────

/** Wrap MK raw bytes with a biometric-derived key (AES-GCM). */
async function wrapMKWithBioKey(
  mk: CryptoKey,
  bioKey: CryptoKey,
): Promise<{ iv: ArrayBuffer; wrappedMK: ArrayBuffer }> {
  const rawMK = await crypto.subtle.exportKey("raw", mk);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrappedMK = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    bioKey,
    rawMK,
  );
  return { iv: iv.buffer as ArrayBuffer, wrappedMK };
}

/** Unwrap MK raw bytes with a biometric-derived key. */
async function unwrapMKWithBioKey(
  bioKey: CryptoKey,
  iv: ArrayBuffer,
  wrappedMK: ArrayBuffer,
): Promise<CryptoKey> {
  const rawMK = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    bioKey,
    wrappedMK,
  );
  return crypto.subtle.importKey("raw", rawMK, { name: "AES-GCM" }, true, [
    "encrypt",
    "decrypt",
  ]);
}

// ── Public API ─────────────────────────────────────────────────────

/** Check if a vault (password) has been set up. */
export async function isVaultSetUp(): Promise<boolean> {
  const db = await openVaultDB();
  const meta = await idbGet<VaultMeta>(db, META_STORE, META_KEY);
  return !!meta;
}

/** Get vault metadata (for restore UI — account count, timestamp). */
export async function getVaultMeta(): Promise<VaultMeta | null> {
  const db = await openVaultDB();
  return (await idbGet<VaultMeta>(db, META_STORE, META_KEY)) ?? null;
}

/**
 * Set up the vault with a password.
 * Encrypts any existing plaintext accounts and stores them.
 * Returns the derived MK for the current session.
 */
export async function setupVault(
  password: string,
  existingAccounts: TotpAccount[],
): Promise<CryptoKey> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const mk = await deriveKeyFromPassword(password, salt.buffer as ArrayBuffer);
  const { iv: verifierIv, ciphertext: verifier } = await createVerifier(mk);

  const db = await openVaultDB();

  // Store meta
  const meta: VaultMeta = {
    id: META_KEY,
    salt: salt.buffer as ArrayBuffer,
    verifierIv,
    verifier,
    accountCount: existingAccounts.length,
    updatedAt: Date.now(),
  };
  await idbPut(db, META_STORE, meta);

  // Encrypt and store accounts
  if (existingAccounts.length > 0) {
    const { iv, ciphertext } = await encryptData(mk, existingAccounts);
    await idbPut(db, DATA_STORE, { id: DATA_KEY, iv, ciphertext });
  }

  return mk;
}

/**
 * Unlock the vault with a password.
 * Returns the MK if correct, null if wrong password.
 */
export async function unlockVault(password: string): Promise<CryptoKey | null> {
  const db = await openVaultDB();
  const meta = await idbGet<VaultMeta>(db, META_STORE, META_KEY);
  if (!meta) return null;

  const mk = await deriveKeyFromPassword(password, meta.salt);
  const ok = await checkVerifier(mk, meta.verifierIv, meta.verifier);
  if (!ok) return null;
  return mk;
}

/**
 * Change the vault password.
 * Re-encrypts all data with the new key.
 */
export async function changePassword(
  oldPassword: string,
  newPassword: string,
): Promise<boolean> {
  const oldMK = await unlockVault(oldPassword);
  if (!oldMK) return false;

  // Read current accounts
  const accounts = await readVaultData(oldMK);

  // Derive new key
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const newMK = await deriveKeyFromPassword(
    newPassword,
    salt.buffer as ArrayBuffer,
  );
  const { iv: verifierIv, ciphertext: verifier } = await createVerifier(newMK);

  const db = await openVaultDB();

  // Update meta with new salt + verifier
  const meta: VaultMeta = {
    id: META_KEY,
    salt: salt.buffer as ArrayBuffer,
    verifierIv,
    verifier,
    accountCount: accounts.length,
    updatedAt: Date.now(),
  };
  await idbPut(db, META_STORE, meta);

  // Re-encrypt data
  if (accounts.length > 0) {
    const { iv, ciphertext } = await encryptData(newMK, accounts);
    await idbPut(db, DATA_STORE, { id: DATA_KEY, iv, ciphertext });
  }

  // Remove biometric wrapping (must re-enroll after password change)
  await idbDelete(db, META_STORE, BIO_KEY);

  return true;
}

/** Read encrypted accounts from vault. */
export async function readVaultData(mk: CryptoKey): Promise<TotpAccount[]> {
  const db = await openVaultDB();
  const entry = await idbGet<VaultData>(db, DATA_STORE, DATA_KEY);
  if (!entry) return [];
  try {
    return await decryptData(mk, entry.iv, entry.ciphertext);
  } catch {
    return [];
  }
}

/** Write accounts to the vault (encrypted). Also updates meta accountCount. */
export async function writeVaultData(
  mk: CryptoKey,
  accounts: TotpAccount[],
): Promise<void> {
  const db = await openVaultDB();

  const { iv, ciphertext } = await encryptData(mk, accounts);
  await idbPut(db, DATA_STORE, { id: DATA_KEY, iv, ciphertext });

  // Update meta accountCount + timestamp
  const meta = await idbGet<VaultMeta>(db, META_STORE, META_KEY);
  if (meta) {
    meta.accountCount = accounts.length;
    meta.updatedAt = Date.now();
    await idbPut(db, META_STORE, meta);
  }
}

/** Destroy the entire vault (factory reset). */
export async function destroyVault(): Promise<void> {
  const db = await openVaultDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([META_STORE, DATA_STORE], "readwrite");
    tx.objectStore(META_STORE).clear();
    tx.objectStore(DATA_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Biometric wrapping ─────────────────────────────────────────────

/** Save the MK wrapped with a biometric-derived key. */
export async function saveBioWrappedMK(
  mk: CryptoKey,
  bioKey: CryptoKey,
): Promise<void> {
  const { iv, wrappedMK } = await wrapMKWithBioKey(mk, bioKey);
  const db = await openVaultDB();
  await idbPut(db, META_STORE, { id: BIO_KEY, iv, wrappedMK });
}

/** Check if biometric wrapping is stored. */
export async function hasBioWrappedMK(): Promise<boolean> {
  const db = await openVaultDB();
  const entry = await idbGet<VaultBio>(db, META_STORE, BIO_KEY);
  return !!entry;
}

/** Unwrap the MK using a biometric-derived key. Returns null on failure. */
export async function unlockWithBioKey(
  bioKey: CryptoKey,
): Promise<CryptoKey | null> {
  const db = await openVaultDB();
  const entry = await idbGet<VaultBio>(db, META_STORE, BIO_KEY);
  if (!entry) return null;
  try {
    return await unwrapMKWithBioKey(bioKey, entry.iv, entry.wrappedMK);
  } catch {
    return null;
  }
}

/** Remove biometric wrapping (disable biometric unlock). */
export async function removeBioWrappedMK(): Promise<void> {
  const db = await openVaultDB();
  await idbDelete(db, META_STORE, BIO_KEY);
}

// ── Export/Import for Google Drive sync ─────────────────────────────

export interface EncryptedBlob {
  version: 1;
  salt: string; // base64
  verifierIv: string; // base64
  verifier: string; // base64
  dataIv: string; // base64
  ciphertext: string; // base64
  accountCount: number;
  updatedAt: number;
}

function bufToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToBuf(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}

/**
 * Export the vault as an encrypted blob for syncing/backup.
 * The blob is encrypted with the same password-derived key — a new device
 * just needs the password to decrypt.
 */
export async function exportVaultBlob(): Promise<EncryptedBlob | null> {
  const db = await openVaultDB();
  const meta = await idbGet<VaultMeta>(db, META_STORE, META_KEY);
  const data = await idbGet<VaultData>(db, DATA_STORE, DATA_KEY);
  if (!meta) return null;

  return {
    version: 1,
    salt: bufToBase64(meta.salt),
    verifierIv: bufToBase64(meta.verifierIv),
    verifier: bufToBase64(meta.verifier),
    dataIv: data ? bufToBase64(data.iv) : "",
    ciphertext: data ? bufToBase64(data.ciphertext) : "",
    accountCount: meta.accountCount,
    updatedAt: meta.updatedAt,
  };
}

/**
 * Import an encrypted blob (from Google Drive) and unlock with password.
 * Returns the MK on success, null on wrong password.
 */
export async function importVaultBlob(
  blob: EncryptedBlob,
  password: string,
): Promise<CryptoKey | null> {
  const salt = base64ToBuf(blob.salt);
  const mk = await deriveKeyFromPassword(password, salt);

  // Verify password
  const ok = await checkVerifier(
    mk,
    base64ToBuf(blob.verifierIv),
    base64ToBuf(blob.verifier),
  );
  if (!ok) return null;

  // Store meta
  const db = await openVaultDB();
  const meta: VaultMeta = {
    id: META_KEY,
    salt,
    verifierIv: base64ToBuf(blob.verifierIv),
    verifier: base64ToBuf(blob.verifier),
    accountCount: blob.accountCount,
    updatedAt: blob.updatedAt,
  };
  await idbPut(db, META_STORE, meta);

  // Store encrypted data
  if (blob.ciphertext) {
    await idbPut(db, DATA_STORE, {
      id: DATA_KEY,
      iv: base64ToBuf(blob.dataIv),
      ciphertext: base64ToBuf(blob.ciphertext),
    });
  }

  return mk;
}
