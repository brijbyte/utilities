// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./google-auth.d.ts" />

/**
 * Google Identity Services (GIS) integration for Drive appdata access.
 * Uses the token model (implicit grant) — no backend needed.
 */

const CLIENT_ID =
  "655924708327-188epndo2r7l9fotkhjgtg7jjque1skl.apps.googleusercontent.com";
const SCOPES =
  "https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email";
const TOKEN_KEY = "totp-google-token-v2";
const EXPIRY_KEY = "totp-google-token-expiry-v2";
const USER_KEY = "totp-google-user-v2";

let gisLoaded: Promise<void> | null = null;

/** Load the GIS script once. */
function loadGis(): Promise<void> {
  if (gisLoaded) return gisLoaded;
  gisLoaded = new Promise((resolve, reject) => {
    if (document.querySelector('script[src*="accounts.google.com/gsi"]')) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () =>
      reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(s);
  });
  return gisLoaded;
}

/** Get stored token if still valid (by local expiry check). */
export function getStoredToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(EXPIRY_KEY);
  if (token && expiry && Date.now() < Number(expiry)) return token;
  // Expired — clean up
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  return null;
}

/** Get the raw stored token without checking expiry. */
function getRawToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Try to validate a token by making a lightweight API call.
 * If the token is still accepted by Google, re-store it and return it.
 */
export async function tryRefreshToken(): Promise<string | null> {
  const token = getRawToken();
  if (!token) return null;
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const email: string = data.email ?? null;
    if (email) localStorage.setItem(USER_KEY, email);
    // Token is still valid — re-store with a fresh 5-minute window
    storeToken(token, 300);
    return token;
  } catch {
    return null;
  }
}

function storeToken(token: string, expiresIn: number) {
  localStorage.setItem(TOKEN_KEY, token);
  // Store with 60s buffer
  localStorage.setItem(
    EXPIRY_KEY,
    String(Date.now() + (expiresIn - 60) * 1000),
  );
}

/** Check if user has previously opted into Google sync. */
export function isGoogleSyncEnabled(): boolean {
  return localStorage.getItem("totp-google-sync") === "true";
}

export function setGoogleSyncEnabled(v: boolean) {
  if (v) localStorage.setItem("totp-google-sync", "true");
  else localStorage.removeItem("totp-google-sync");
}

/** Fetch and cache the user's email. */
async function fetchAndStoreUser(token: string): Promise<string | null> {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const email: string = data.email ?? null;
    if (email) localStorage.setItem(USER_KEY, email);
    return email;
  } catch {
    return null;
  }
}

/** Get stored user email. */
export function getStoredUser(): string | null {
  return localStorage.getItem(USER_KEY);
}

/** Request an access token interactively. Returns the token. */
export async function requestToken(): Promise<string> {
  await loadGis();

  return new Promise<string>((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: async (resp: google.accounts.oauth2.TokenResponse) => {
        if (resp.error) {
          reject(new Error(resp.error_description || resp.error));
          return;
        }
        storeToken(resp.access_token, Number(resp.expires_in));
        await fetchAndStoreUser(resp.access_token);
        resolve(resp.access_token);
      },
    });
    client.requestAccessToken();
  });
}

/**
 * Silently refresh the token.
 * Only works if user previously granted consent.
 * Does NOT fall back to interactive prompt.
 */
export async function requestTokenSilent(): Promise<string> {
  await loadGis();

  return new Promise<string>((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: async (resp: google.accounts.oauth2.TokenResponse) => {
        if (resp.error) {
          reject(new Error(resp.error_description || resp.error));
          return;
        }
        storeToken(resp.access_token, Number(resp.expires_in));
        await fetchAndStoreUser(resp.access_token);
        resolve(resp.access_token);
      },
      error_callback: (err: { type: string; message: string }) => {
        reject(err);
      },
    });
    client.requestAccessToken({ prompt: "none" });
  });
}

/** Revoke token and clear storage. */
export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  localStorage.removeItem(USER_KEY);
  setGoogleSyncEnabled(false);
}
