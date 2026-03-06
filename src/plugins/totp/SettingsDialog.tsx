/**
 * Settings panel — biometric unlock, Google sync, and vault info.
 */

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import {
  X,
  Fingerprint,
  Loader2,
  Check,
  Shield,
  Cloud,
  LogOut,
} from "lucide-react";
import { Button } from "../../components/Button";
import { useStorage } from "./useStorage";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: Props) {
  const {
    bioSupported,
    bioEnabled,
    enableBio,
    disableBio,
    accounts,
    isGoogleLinked,
    googleUser,
    unlinkGoogle,
  } = useStorage();

  const [bioLoading, setBioLoading] = useState(false);
  const [bioError, setBioError] = useState("");

  async function handleToggleBio() {
    setBioError("");
    setBioLoading(true);
    try {
      if (bioEnabled) {
        await disableBio();
      } else {
        const ok = await enableBio();
        if (!ok) {
          setBioError(
            "Failed to enable biometrics. Your device may not support PRF.",
          );
        }
      }
    } catch (err) {
      setBioError("Biometric setup failed.");
      console.error(err);
    } finally {
      setBioLoading(false);
    }
  }

  async function handleSignOut() {
    await unlinkGoogle();
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-bg-overlay z-50" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-bg-surface border border-border shadow-lg rounded-xl w-[90vw] md:w-100 max-w-full p-lg z-50 outline-none flex flex-col gap-lg">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-sm font-medium text-text flex items-center gap-sm">
              <Shield size={16} /> Settings
            </Dialog.Title>
            <Dialog.Close className="text-text-muted hover:text-text bg-transparent border-none cursor-pointer p-xs rounded hover:bg-bg-hover transition-colors flex items-center justify-center">
              <X size={16} />
            </Dialog.Close>
          </div>

          <div className="flex flex-col gap-md">
            {/* Vault info */}
            <div className="flex flex-col gap-xs p-md bg-bg border border-border-muted rounded-lg">
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">Accounts</span>
                <span className="text-text">{accounts.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">Encryption</span>
                <span className="text-success flex items-center gap-xs">
                  <Check size={12} /> AES-256-GCM
                </span>
              </div>
            </div>

            {/* Biometric unlock */}
            {bioSupported && (
              <div className="flex items-center justify-between p-md bg-bg border border-border-muted rounded-lg">
                <div className="flex items-center gap-sm">
                  <Fingerprint
                    size={16}
                    className={bioEnabled ? "text-accent" : "text-text-muted"}
                  />
                  <div>
                    <div className="text-xs font-medium text-text">
                      Biometric Unlock
                    </div>
                    <div className="text-[10px] text-text-muted">
                      {bioEnabled
                        ? "Enabled — unlock with FaceID / fingerprint"
                        : "Use FaceID / fingerprint instead of password"}
                    </div>
                  </div>
                </div>
                <Button
                  variant={bioEnabled ? "outline" : "primary"}
                  onClick={handleToggleBio}
                  disabled={bioLoading}
                  className="shrink-0"
                >
                  {bioLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : bioEnabled ? (
                    "Disable"
                  ) : (
                    "Enable"
                  )}
                </Button>
              </div>
            )}

            {bioError && <p className="text-xs text-danger">{bioError}</p>}

            {/* Google Drive sync */}
            {isGoogleLinked && (
              <div className="flex items-center justify-between p-md bg-bg border border-border-muted rounded-lg">
                <div className="flex items-center gap-sm">
                  <Cloud size={16} className="text-success" />
                  <div>
                    <div className="text-xs font-medium text-text">
                      Google Drive Sync
                    </div>
                    <div className="text-[10px] text-text-muted truncate max-w-48">
                      {googleUser ?? "Connected"}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="shrink-0 text-danger"
                >
                  <LogOut size={14} />
                  Sign out
                </Button>
              </div>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
