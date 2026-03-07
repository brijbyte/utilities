/**
 * First-launch screen: Start Fresh or Restore from Google Drive.
 */

import { useState } from "react";
import { Plus, Cloud, Loader2, ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "../../../components/Button";
import { useStorage } from "../utils/useStorage";
import type { EncryptedBlob } from "../utils/crypto";

export function SetupScreen() {
  const [mode, setMode] = useState<
    "choose" | "create" | "restore-loading" | "restore-password"
  >("choose");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [blob, setBlob] = useState<EncryptedBlob | null>(null);
  const { createVault, checkDriveBackup, restoreFromDrive } = useStorage();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await createVault(password);
    } catch (err) {
      setError("Failed to create vault.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckDrive() {
    setMode("restore-loading");
    setError("");
    try {
      const found = await checkDriveBackup();
      if (found) {
        setBlob(found);
        setMode("restore-password");
      } else {
        setError("No backup found on this Google account.");
        setMode("choose");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to Google Drive.");
      setMode("choose");
    }
  }

  async function handleRestore(e: React.FormEvent) {
    e.preventDefault();
    if (!blob) return;
    setError("");
    setLoading(true);
    try {
      const ok = await restoreFromDrive(blob, password);
      if (!ok) {
        setError("Incorrect password.");
      }
    } catch (err) {
      setError("Restore failed.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (mode === "create") {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl flex flex-col gap-6">
          <button
            onClick={() => setMode("choose")}
            className="self-start flex items-center gap-1 text-text-muted hover:text-text text-xs cursor-pointer bg-transparent border-none"
          >
            <ArrowLeft size={14} /> Back
          </button>

          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-medium text-text">Create Password</h2>
            <p className="text-xs text-text-muted leading-relaxed">
              This password encrypts your TOTP secrets. You'll need it to unlock
              the app and to restore on new devices.
            </p>
          </div>

          <div className="flex items-start gap-2 p-3 bg-bg border border-border rounded-lg">
            <AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" />
            <p className="text-xs text-text-muted leading-relaxed">
              If you forget this password, your secrets cannot be recovered.
              There is no reset option.
            </p>
          </div>

          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-muted">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent transition-colors"
                placeholder="Minimum 8 characters"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-muted">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent transition-colors"
                placeholder="Re-enter password"
              />
            </div>

            {error && <p className="text-xs text-danger">{error}</p>}

            <Button
              variant="primary"
              disabled={loading}
              className="w-full py-2"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Encrypting…
                </>
              ) : (
                "Create Vault"
              )}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (mode === "restore-loading") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <Loader2 size={32} className="animate-spin text-text-muted" />
        <p className="text-sm text-text-muted">Connecting to Google Drive…</p>
      </div>
    );
  }

  if (mode === "restore-password" && blob) {
    const date = new Date(blob.updatedAt);
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl flex flex-col gap-6">
          <button
            onClick={() => {
              setMode("choose");
              setBlob(null);
              setPassword("");
              setError("");
            }}
            className="self-start flex items-center gap-1 text-text-muted hover:text-text text-xs cursor-pointer bg-transparent border-none"
          >
            <ArrowLeft size={14} /> Back
          </button>

          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-medium text-text">Restore Backup</h2>
            <p className="text-xs text-text-muted leading-relaxed">
              Found a backup on Google Drive. Enter your encryption password to
              restore.
            </p>
          </div>

          <div className="flex flex-col gap-1 p-3 bg-bg-surface border border-border rounded-lg">
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Accounts</span>
              <span className="text-text">{blob.accountCount}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Last synced</span>
              <span className="text-text">
                {date.toLocaleDateString()} {date.toLocaleTimeString()}
              </span>
            </div>
          </div>

          <form onSubmit={handleRestore} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-muted">
                Encryption Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent transition-colors"
                placeholder="Enter your password"
                autoFocus
              />
            </div>

            {error && <p className="text-xs text-danger">{error}</p>}

            <Button
              variant="primary"
              disabled={loading}
              className="w-full py-2"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Restoring…
                </>
              ) : (
                "Restore"
              )}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Default: choose mode
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-lg font-medium text-text">Authenticator</h2>
          <p className="text-xs text-text-muted leading-relaxed">
            Your TOTP secrets are encrypted with a password. Set one up to get
            started, or restore from a backup.
          </p>
        </div>

        {error && <p className="text-xs text-danger text-center">{error}</p>}

        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              setMode("create");
              setError("");
            }}
            className="flex items-center gap-3 p-4 bg-bg-surface border border-border rounded-xl hover:border-accent cursor-pointer transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center shrink-0">
              <Plus size={20} className="text-accent" />
            </div>
            <div>
              <div className="text-sm font-medium text-text">Start Fresh</div>
              <div className="text-xs text-text-muted">
                Create a new encrypted vault
              </div>
            </div>
          </button>

          <button
            onClick={handleCheckDrive}
            className="flex items-center gap-3 p-4 bg-bg-surface border border-border rounded-xl hover:border-accent cursor-pointer transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center shrink-0">
              <Cloud size={20} className="text-accent" />
            </div>
            <div>
              <div className="text-sm font-medium text-text">
                Restore from Google Drive
              </div>
              <div className="text-xs text-text-muted">
                Recover accounts from another device
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
