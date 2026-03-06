/**
 * Lock screen — vault exists, needs password or biometric to unlock.
 *
 * When biometrics is enabled, the biometric button is the primary CTA
 * and the password form is tucked below as a secondary option.
 */

import { useState } from "react";
import { Lock, Fingerprint, Loader2, KeyRound } from "lucide-react";
import { Button } from "../../components/Button";
import type { Variant } from "../../components/Button";
import { useStorage } from "./useStorage";

export function LockScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const { unlock, unlockWithBio, bioEnabled } = useStorage();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!password) return;
    setLoading(true);
    try {
      const ok = await unlock(password);
      if (!ok) {
        setError("Incorrect password.");
        setPassword("");
      }
    } catch {
      setError("Unlock failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleBioUnlock() {
    setError("");
    setBioLoading(true);
    try {
      const ok = await unlockWithBio();
      if (!ok) {
        setError("Biometric unlock failed. Try your password.");
        setShowPassword(true);
      }
    } finally {
      setBioLoading(false);
    }
  }

  function PasswordForm({ variant }: { variant: Variant }) {
    return (
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-md">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-bg-surface border border-border rounded-lg px-md py-sm text-sm text-text outline-none focus:border-accent transition-colors text-center"
          placeholder="Enter password"
          autoFocus
        />
        <Button variant={variant} disabled={loading} className="w-full py-sm">
          {loading ? <Loader2 size={14} className="animate-spin" /> : "Unlock"}
        </Button>
      </form>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-xl">
      <div className="w-full max-w-64 flex flex-col items-center gap-xl">
        <div className="bg-bg-surface p-xl rounded-full border border-border shadow-sm">
          <Lock size={40} className="text-text-muted" />
        </div>

        <div className="flex flex-col items-center gap-xs text-center">
          <h2 className="text-lg font-medium text-text">Vault Locked</h2>
          <p className="text-xs text-text-muted">
            {bioEnabled
              ? "Use biometrics or your password to unlock."
              : "Enter your password to access your accounts."}
          </p>
        </div>

        {error && <p className="text-xs text-danger text-center">{error}</p>}

        {bioEnabled ? (
          <>
            <Button
              variant="primary"
              onClick={handleBioUnlock}
              disabled={bioLoading}
              className="w-full py-sm"
            >
              {bioLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  <Fingerprint size={16} />
                  Unlock with Biometrics
                </>
              )}
            </Button>

            {!showPassword ? (
              <button
                onClick={() => setShowPassword(true)}
                className="flex items-center gap-sm text-text-muted hover:text-accent text-xs cursor-pointer bg-transparent border-none transition-colors"
              >
                <KeyRound size={14} />
                Use password instead
              </button>
            ) : (
              <PasswordForm variant="outline" />
            )}
          </>
        ) : (
          <PasswordForm variant="primary" />
        )}
      </div>
    </div>
  );
}
