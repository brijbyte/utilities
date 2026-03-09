/**
 * Generic IndexedDB helpers for the chat plugin.
 */

const DB_NAME = "chat-agent";
const DB_VERSION = 2;
const AUTH_STORE = "auth";
const SESSIONS_STORE = "sessions";
const SESSION_META_STORE = "session-meta";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(AUTH_STORE)) {
        db.createObjectStore(AUTH_STORE);
      }
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        db.createObjectStore(SESSIONS_STORE);
      }
      if (!db.objectStoreNames.contains(SESSION_META_STORE)) {
        db.createObjectStore(SESSION_META_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Auth store ──────────────────────────────────────────────

export async function getAuthData(): Promise<string | undefined> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUTH_STORE, "readonly");
    const store = tx.objectStore(AUTH_STORE);
    const req = store.get("credentials");
    req.onsuccess = () => resolve(req.result as string | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function setAuthData(data: string): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUTH_STORE, "readwrite");
    const store = tx.objectStore(AUTH_STORE);
    store.put(data, "credentials");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Session store ───────────────────────────────────────────

export interface SessionMeta {
  id: string;
  name?: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  firstMessage: string;
}

export async function getSessionEntries(
  sessionId: string,
): Promise<string | undefined> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSIONS_STORE, "readonly");
    const store = tx.objectStore(SESSIONS_STORE);
    const req = store.get(sessionId);
    req.onsuccess = () => resolve(req.result as string | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function setSessionEntries(
  sessionId: string,
  data: string,
): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSIONS_STORE, "readwrite");
    const store = tx.objectStore(SESSIONS_STORE);
    store.put(data, sessionId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteSession(sessionId: string): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      [SESSIONS_STORE, SESSION_META_STORE],
      "readwrite",
    );
    tx.objectStore(SESSIONS_STORE).delete(sessionId);
    tx.objectStore(SESSION_META_STORE).delete(sessionId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSessionMeta(
  sessionId: string,
): Promise<SessionMeta | undefined> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSION_META_STORE, "readonly");
    const store = tx.objectStore(SESSION_META_STORE);
    const req = store.get(sessionId);
    req.onsuccess = () => resolve(req.result as SessionMeta | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function setSessionMeta(meta: SessionMeta): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSION_META_STORE, "readwrite");
    const store = tx.objectStore(SESSION_META_STORE);
    store.put(meta, meta.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllSessionMetas(): Promise<SessionMeta[]> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSION_META_STORE, "readonly");
    const store = tx.objectStore(SESSION_META_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as SessionMeta[]);
    req.onerror = () => reject(req.error);
  });
}
