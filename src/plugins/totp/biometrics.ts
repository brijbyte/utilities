/**
 * Biometric authentication via WebAuthn PRF extension.
 *
 * This module provides a CONVENIENCE unlock layer. It derives a key from
 * the passkey's PRF output, which is then used to wrap/unwrap the master key
 * from the vault (see crypto.ts).
 *
 * The biometric key is NOT the root of trust — the password is.
 */

const CREDENTIAL_ID_KEY = "totp-bio-credential-id";

const PRF_SALT = new Uint8Array([
  0x54, 0x4f, 0x54, 0x50, 0x56, 0x41, 0x55, 0x4c, 0x54, 0x50, 0x52, 0x46, 0x53,
  0x41, 0x4c, 0x54, 0x32, 0x30, 0x32, 0x36, 0x56, 0x45, 0x52, 0x31, 0x54, 0x4f,
  0x54, 0x50, 0x56, 0x41, 0x55, 0x4c,
]);

export async function isBiometricsSupported(): Promise<boolean> {
  return (
    !!window.PublicKeyCredential &&
    !!PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable &&
    (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
  );
}

export function hasBioCredential(): boolean {
  return !!localStorage.getItem(CREDENTIAL_ID_KEY);
}

export function clearBioCredential(): void {
  localStorage.removeItem(CREDENTIAL_ID_KEY);
}

/**
 * Register a new passkey and derive a wrapping key from PRF.
 * Returns the AES-GCM key derived from the PRF output, or null.
 */
export async function registerBiometrics(): Promise<CryptoKey | null> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: "Utilities TOTP",
        id: window.location.hostname || "localhost",
      },
      user: {
        id: userId,
        name: "totp-user",
        displayName: "TOTP User",
      },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
      },
      extensions: {
        prf: { eval: { first: PRF_SALT } },
      } as any,
      timeout: 60000,
    },
  })) as any;

  if (!credential) return null;

  const prfResults = credential.getClientExtensionResults()?.prf;
  if (!prfResults?.results?.first) {
    throw new Error(
      "Device does not support PRF — biometric unlock unavailable.",
    );
  }

  // Store credential ID
  const idBase64 = btoa(
    String.fromCharCode(...new Uint8Array(credential.rawId)),
  );
  localStorage.setItem(CREDENTIAL_ID_KEY, idBase64);

  return deriveKeyFromPrf(prfResults.results.first);
}

/**
 * Authenticate with existing passkey and derive the wrapping key.
 */
export async function authenticateBiometrics(): Promise<CryptoKey | null> {
  const idBase64 = localStorage.getItem(CREDENTIAL_ID_KEY);
  if (!idBase64) return null;

  const credentialId = Uint8Array.from(atob(idBase64), (c) => c.charCodeAt(0));
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{ id: credentialId, type: "public-key" }],
      userVerification: "required",
      extensions: {
        prf: { eval: { first: PRF_SALT } },
      } as any,
      timeout: 60000,
    },
  })) as any;

  if (!assertion) return null;

  const prfResults = assertion.getClientExtensionResults()?.prf;
  if (!prfResults?.results?.first) return null;

  return deriveKeyFromPrf(prfResults.results.first);
}

async function deriveKeyFromPrf(prfOutput: ArrayBuffer): Promise<CryptoKey> {
  const masterKey = await crypto.subtle.importKey(
    "raw",
    prfOutput,
    "HKDF",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      salt: new Uint8Array(0),
      info: new TextEncoder().encode("totp-vault-bio-wrap"),
      hash: "SHA-256",
    },
    masterKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
