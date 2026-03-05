import { useState, useEffect, useRef } from "react";
import { Toolbar } from "@base-ui/react/toolbar";
import { Dialog } from "@base-ui/react/dialog";
import { Toast } from "@base-ui/react/toast";
import { Plus, Camera, Image as ImageIcon, X } from "lucide-react";
import { Button } from "../../components/Button";
import {
  getAllAccounts,
  addAccount,
  deleteAccount,
  type TotpAccount,
} from "./db";
import { parseOtpAuthUri } from "./qr";
import jsQR from "jsqr";
import { AccountItem } from "./AccountItem";
import { Scanner } from "./Scanner";

export default function TotpApp() {
  const [accounts, setAccounts] = useState<TotpAccount[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastManager = Toast.useToastManager();

  async function loadAccounts() {
    try {
      const accs = await getAllAccounts();
      setAccounts(accs);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAccounts();
  }, []);

  async function handleAddFromUri(uri: string) {
    const parsed = parseOtpAuthUri(uri);
    if (!parsed) {
      console.log(toastManager);
      toastManager.add({
        title: "Invalid QR code. This is not a valid TOTP URI.",
      });
      return;
    }

    const exists = accounts.some(
      (a) =>
        a.secret === parsed.secret &&
        a.issuer === parsed.issuer &&
        a.label === parsed.label,
    );

    if (exists) {
      toastManager.add({
        title: "Account already exists.",
      });
      setIsScanning(false);
      return;
    }

    const account: TotpAccount = {
      ...parsed,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };

    await addAccount(account);
    loadAccounts();
    setIsScanning(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          handleAddFromUri(code.data);
        } else {
          toastManager.add({
            title: "No QR code found in image.",
          });
        }
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  async function handleDelete(id: string) {
    if (confirm("Delete this account?")) {
      await deleteAccount(id);
      loadAccounts();
    }
  }

  return (
    <div className="h-full flex flex-col">
      <Toolbar.Root className="flex items-center gap-tb px-tb-x py-tb-y border-b border-border bg-bg-surface">
        <span className="text-xs text-text-muted">TOTP Authenticator</span>
        <Toolbar.Group className="ml-auto flex items-center gap-tb">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
          />
          <Toolbar.Button
            render={(props) => (
              <Button
                {...props}
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                title="Upload QR Image"
              >
                <ImageIcon size={14} /> Upload
              </Button>
            )}
          />
          <Toolbar.Button
            render={(props) => (
              <Button
                {...props}
                variant="primary"
                onClick={() => setIsScanning(true)}
              >
                <Camera size={14} className="mr-sm" />
                Scan QR
              </Button>
            )}
          />
        </Toolbar.Group>
      </Toolbar.Root>

      <Dialog.Root open={isScanning} onOpenChange={setIsScanning}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 bg-bg-overlay z-50" />
          <Dialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-bg-surface border border-border shadow-lg rounded-xl w-[90vw] md:w-150 max-w-full p-md z-50 outline-none flex flex-col gap-md">
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-sm font-medium text-text">
                Scan QR Code
              </Dialog.Title>
              <Dialog.Close className="text-text-muted hover:text-text bg-transparent border-none cursor-pointer p-xs rounded hover:bg-bg-hover transition-colors flex items-center justify-center">
                <X size={16} />
              </Dialog.Close>
            </div>
            {isScanning && <Scanner onScan={handleAddFromUri} />}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="flex-1 p-pn-y px-pn-x overflow-auto flex flex-col gap-md mx-auto w-full">
        {loading ? null : accounts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-text-muted gap-md">
            <Plus size={48} className="opacity-20" />
            <p>No accounts added yet.</p>
            <p className="text-sm">
              Scan a QR code or upload an image to begin.
            </p>
          </div>
        ) : (
          <div className="grid gap-md grid-cols-1 md:grid-cols-2">
            {accounts.map((acc) => (
              <AccountItem key={acc.id} account={acc} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
