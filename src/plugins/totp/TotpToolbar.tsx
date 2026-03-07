import { useRef } from "react";
import { Toolbar } from "@base-ui/react/toolbar";
import { Camera, QrCode, Settings, Lock, Loader2 } from "lucide-react";
import { Button } from "../../components/Button";
import { GoogleSyncButton } from "./GoogleSyncButton";
import { useStorage } from "./useStorage";

interface Props {
  addSource: "image" | "camera" | null;
  onScanClick: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSettingsClick: () => void;
}

export function TotpToolbar({
  onScanClick,
  onFileUpload,
  onSettingsClick,
  addSource,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { lock } = useStorage();

  return (
    <Toolbar.Root className="flex flex-wrap items-center gap-x-tb gap-y-xs px-md py-tb-y border-b border-border bg-bg-surface">
      <GoogleSyncButton />

      <Toolbar.Button
        render={(props) => (
          <Button
            {...props}
            variant="ghost"
            onClick={lock}
            title="Lock vault"
            className="text-text-muted"
          >
            <Lock size={14} />
          </Button>
        )}
      />

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
              {addSource === "image" ? (
                <>
                  <Loader2 size={14} className="mr-sm animate-spin" /> Adding
                </>
              ) : (
                <>
                  <QrCode size={14} className="mr-sm" /> Upload QR
                </>
              )}
            </Button>
          )}
        />
        <Toolbar.Button
          disabled={addSource !== null}
          render={(props) => (
            <Button {...props} variant="primary" onClick={onScanClick}>
              {addSource === "camera" ? (
                <>
                  <Loader2 size={14} className="mr-sm animate-spin" />
                  Scanning
                </>
              ) : (
                <>
                  <Camera size={14} className="mr-sm" />
                  Scan QR
                </>
              )}
            </Button>
          )}
        />
        <Toolbar.Button
          render={(props) => (
            <Button
              {...props}
              variant="ghost"
              onClick={onSettingsClick}
              title="Settings"
              className="text-text-muted"
            >
              <Settings size={14} />
            </Button>
          )}
        />
      </Toolbar.Group>
    </Toolbar.Root>
  );
}
