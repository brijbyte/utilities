import { Toast } from "@base-ui/react/toast";
import { useEffect, useRef, useState } from "react";
import { AccountList } from "./components/AccountList";
import { LockScreen } from "./components/LockScreen";
import { consumePendingUri } from "./utils/pending-uri";
import { decodeQrFromImage, isImportError, parseUri } from "./utils/qr-import";
import { ScanDialog } from "./components/ScanDialog";
import { SettingsDialog } from "./components/SettingsDialog";
import { SetupScreen } from "./components/SetupScreen";
import { TotpGridSkeleton } from "./components/Skeleton";
import { StorageProvider } from "./components/StorageContext";
import { TotpToolbar } from "./components/TotpToolbar";
import { useStorage } from "./utils/useStorage";

export default function TotpApp() {
  return (
    <StorageProvider>
      <TotpAppInner />
    </StorageProvider>
  );
}

function TotpAppInner() {
  const [isScanning, setIsScanning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [addSource, setAddSource] =
    useState<React.ComponentProps<typeof TotpToolbar>["addSource"]>(null);
  const toastManager = Toast.useToastManager();
  const { vaultState, accounts, addAccount, removeAccount } = useStorage();

  // ── Protocol handler: auto-import otpauth URI from URL ───────────
  // Stash the URI immediately (before any re-render clears the URL),
  // then process it once the vault reaches the "unlocked" state.
  const pendingRef = useRef<string | null>(consumePendingUri());

  async function handleScan(
    uri: string,
    addingSource: "image" | "camera" = "camera",
  ) {
    const result = parseUri(uri);
    if (isImportError(result)) {
      toastManager.add({ title: result.error });
      return;
    }
    const { account } = result;
    setIsScanning(false);
    setAddSource(addingSource);

    try {
      await addAccount(account);
    } catch (e) {
      if (e instanceof Error && e.message === "EXISTS") {
        toastManager.add({ title: "Account already exists." });
      }
    } finally {
      setAddSource(null);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await decodeQrFromImage(file);
    if (data) {
      handleScan(data, "image");
    } else {
      toastManager.add({ title: "No QR code found in image." });
    }
  }

  async function handleDelete(id: string) {
    await removeAccount(id);
  }

  useEffect(() => {
    if (vaultState !== "unlocked" || !pendingRef.current) return;
    const uri = pendingRef.current;
    pendingRef.current = null;

    handleScan(uri, "camera");
    // Run only when vaultState transitions to "unlocked"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vaultState]);

  // ── State-based rendering ────────────────────────────────────────

  if (vaultState === "loading") {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-tb px-tb-x py-tb-y border-b border-border bg-bg-surface">
          <div className="w-24 h-4 bg-bg-hover animate-pulse" />
          <div className="ml-auto flex gap-tb">
            <div className="w-16 h-6 bg-bg-hover animate-pulse" />
            <div className="w-20 h-6 bg-bg-hover animate-pulse" />
          </div>
        </div>
        <TotpGridSkeleton />
      </div>
    );
  }

  if (vaultState === "fresh") {
    return (
      <div className="h-full flex flex-col">
        <SetupScreen />
      </div>
    );
  }

  if (vaultState === "locked") {
    return (
      <div className="h-full flex flex-col">
        <LockScreen />
      </div>
    );
  }

  // ── Unlocked state ───────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col">
      <TotpToolbar
        onScanClick={() => setIsScanning(true)}
        onFileUpload={handleFileUpload}
        onSettingsClick={() => setShowSettings(true)}
        addSource={addSource}
      />
      <ScanDialog
        open={isScanning}
        onOpenChange={setIsScanning}
        onScan={handleScan}
      />
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      <div className="flex-1 p-pn-y px-pn-x overflow-auto flex flex-col gap-3 mx-auto w-full">
        <AccountList accounts={accounts} onDelete={handleDelete} />
      </div>
    </div>
  );
}
