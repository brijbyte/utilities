import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { Scanner } from "./Scanner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (uri: string) => void;
}

export function ScanDialog({ open, onOpenChange, onScan }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
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
          {open && <Scanner onScan={onScan} />}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
