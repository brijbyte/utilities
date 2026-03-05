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
const TOKEN_KEY = "totp-google-token";
const EXPIRY_KEY = "totp-google-token-expiry";
const USER_KEY = "totp-google-user";

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

/** Get stored token if still valid. */
export function getStoredToken(): string | null {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const expiry = sessionStorage.getItem(EXPIRY_KEY);
  if (token && expiry && Date.now() < Number(expiry)) return token;
  // Expired — clean up
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(EXPIRY_KEY);
  return null;
}

function storeToken(token: string, expiresIn: number) {
  sessionStorage.setItem(TOKEN_KEY, token);
  // Store with 60s buffer
  sessionStorage.setItem(
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
    const res = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const email: string = data.email ?? null;
    if (email) sessionStorage.setItem(USER_KEY, email);
    return email;
  } catch {
    return null;
  }
}

/** Get stored user email. */
export function getStoredUser(): string | null {
  return sessionStorage.getItem(USER_KEY);
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

/** Revoke token and clear storage. */
export function logout() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(EXPIRY_KEY);
  sessionStorage.removeItem(USER_KEY);
  setGoogleSyncEnabled(false);
}
