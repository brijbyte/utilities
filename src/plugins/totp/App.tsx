import { Toast } from "@base-ui/react/toast";
import { useCallback, useContext, useEffect, useState } from "react";
import type { TotpAccount } from "./db";
import { parseUri, decodeQrFromImage, isImportError } from "./qr-import";
import { BgSyncContext } from "./storage-ctx";
import { StorageProvider } from "./StorageContext";
import { useStorage } from "./useStorage";
import { TotpToolbar } from "./TotpToolbar";
import { ScanDialog } from "./ScanDialog";
import { AccountList } from "./AccountList";

export default function TotpApp() {
  return (
    <StorageProvider>
      <TotpAppInner />
    </StorageProvider>
  );
}

function TotpAppInner() {
  const [accounts, setAccounts] = useState<TotpAccount[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [syncState, setSyncState] = useState<"initial" | "syncing" | "idle">(
    "initial",
  );
  const toastManager = Toast.useToastManager();
  const { adapter, adapterVersion } = useStorage();
  const bgSyncRef = useContext(BgSyncContext);

  const loadAccounts = useCallback(async () => {
    setSyncState((s) => (s === "idle" ? "syncing" : s));
    try {
      setAccounts(await adapter.getAll());
    } finally {
      setSyncState("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, adapterVersion]);

  useEffect(() => {
    void loadAccounts();
    const interval = setInterval(loadAccounts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadAccounts]);

  useEffect(() => {
    bgSyncRef.current = (synced) => setAccounts(synced);
    return () => {
      bgSyncRef.current = null;
    };
  }, [bgSyncRef]);

  async function addAccount(account: TotpAccount) {
    const prev = accounts;
    setAccounts((s) => [...s, account]);
    try {
      await adapter.add(account);
    } catch {
      setAccounts(prev);
      toastManager.add({ title: "Failed to sync new account." });
    }
  }

  async function handleScan(uri: string) {
    const result = parseUri(uri);
    if (isImportError(result)) {
      toastManager.add({ title: result.error });
      return;
    }
    const { account } = result;
    const exists = accounts.some(
      (a) =>
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
      const prev = accounts;
      setAccounts((s) => s.filter((a) => a.id !== id));
      try {
        await adapter.remove(id);
      } catch {
        setAccounts(prev);
        toastManager.add({ title: "Failed to delete account." });
      }
    }
  }

  return (
    <div className="h-full flex flex-col">
      <TotpToolbar
        syncing={syncState === "syncing"}
        onScanClick={() => setIsScanning(true)}
        onFileUpload={handleFileUpload}
        onRefresh={loadAccounts}
      />
      <ScanDialog
        open={isScanning}
        onOpenChange={setIsScanning}
        onScan={handleScan}
      />
      <div className="flex-1 p-pn-y px-pn-x overflow-auto flex flex-col gap-md mx-auto w-full">
        <AccountList
          accounts={accounts}
          syncState={syncState}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
