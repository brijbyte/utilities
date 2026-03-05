import { useRef } from "react";
import { Toolbar } from "@base-ui/react/toolbar";
import { Camera, Image as ImageIcon } from "lucide-react";
import { Button } from "../../components/Button";
import { GoogleSyncButton } from "./GoogleSyncButton";

interface Props {
  syncing: boolean;
  onScanClick: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function TotpToolbar({ syncing, onScanClick, onFileUpload }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Toolbar.Root className="flex flex-wrap items-center gap-x-tb gap-y-xs px-tb-x py-tb-y border-b border-border bg-bg-surface">
      <GoogleSyncButton syncing={syncing} />
      <Toolbar.Group className="ml-auto flex items-center gap-tb shrink-0">
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          className="hidden"
          onChange={onFileUpload}
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
            <Button {...props} variant="primary" onClick={onScanClick}>
              <Camera size={14} className="mr-sm" />
              Scan QR
            </Button>
          )}
        />
      </Toolbar.Group>
    </Toolbar.Root>
  );
}
