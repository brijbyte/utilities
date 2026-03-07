/**
 * Pending OTPAuth URI — set from URL search params, consumed by TotpApp.
 *
 * Flow:
 *   1. PWA protocol handler navigates to /a/totp-authenticator?uri=web+otpauth://totp/...
 *   2. On mount, TotpApp calls `consumePendingUri()` which extracts, normalises,
 *      and clears the URI from the URL bar.
 *   3. The normalised `otpauth://` URI is returned for import.
 */

/**
 * Extract and consume a pending otpauth URI from the current URL.
 * Returns the normalised `otpauth://` URI, or null if none found.
 * Cleans up the URL bar as a side effect.
 */
export function consumePendingUri(): string | null {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("uri");
  if (!raw) return null;

  // The protocol handler delivers `web+otpauth://totp/...`
  // Normalise back to `otpauth://` which parseOtpAuthUri expects.
  const uri = raw.replace(/^web\+otpauth:/, "otpauth:");

  // Validate it looks like an otpauth URI before consuming
  if (!uri.startsWith("otpauth://")) return null;

  // Clean the URL bar (remove ?uri=… without triggering navigation)
  params.delete("uri");
  const clean =
    window.location.pathname +
    (params.size ? `?${params}` : "") +
    window.location.hash;
  window.history.replaceState(null, "", clean);

  return uri;
}
