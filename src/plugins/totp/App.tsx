import { Toast } from "@base-ui/react/toast";
import { useState } from "react";
import type { TotpAccount } from "./db";
import { parseUri, decodeQrFromImage, isImportError } from "./qr-import";
import { StorageProvider } from "./StorageContext";
import { useStorage } from "./useStorage";
import { TotpToolbar } from "./TotpToolbar";
import { ScanDialog } from "./ScanDialog";
import { AccountList } from "./AccountList";
import { SetupScreen } from "./SetupScreen";
import { LockScreen } from "./LockScreen";
import { SettingsDialog } from "./SettingsDialog";
import { TotpGridSkeleton } from "./Skeleton";

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
  const toastManager = Toast.useToastManager();
  const { vaultState, accounts, addAccount, removeAccount } = useStorage();

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

  async function handleScan(uri: string) {
    const result = parseUri(uri);
    if (isImportError(result)) {
      toastManager.add({ title: result.error });
      return;
    }
    const { account } = result;
    const exists = accounts.some(
      (a: TotpAccount) =>
        a.secret === account.secret &&
        a.issuer === account.issuer &&
        a.label === account.label,
    );
    if (exists) {
      toastManager.add({ title: "Account already exists." });
      setIsScanning(false);
      return;
    }
    setIsScanning(false);
    await addAccount(account);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await decodeQrFromImage(file);
    if (data) {
      handleScan(data);
    } else {
      toastManager.add({ title: "No QR code found in image." });
    }
  }

  async function handleDelete(id: string) {
    if (confirm("Delete this account?")) {
      await removeAccount(id);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <TotpToolbar
        onScanClick={() => setIsScanning(true)}
        onFileUpload={handleFileUpload}
        onSettingsClick={() => setShowSettings(true)}
      />
      <ScanDialog
        open={isScanning}
        onOpenChange={setIsScanning}
        onScan={handleScan}
      />
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      <div className="flex-1 p-pn-y px-pn-x overflow-auto flex flex-col gap-md mx-auto w-full">
        <AccountList accounts={accounts} onDelete={handleDelete} />
      </div>
    </div>
  );
}
