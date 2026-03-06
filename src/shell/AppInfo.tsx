import { Popover } from "@base-ui/react/popover";
import { Info } from "lucide-react";
import { useSwUpdate } from "../useSwUpdate";
import { applyUpdate } from "../sw-update";

export function AppInfo() {
  const updateAvailable = useSwUpdate();

  return (
    <Popover.Root>
      <Popover.Trigger
        className={`flex items-center justify-center text-text-muted cursor-pointer hover:text-text transition-colors ${updateAvailable ? "animate-shake" : ""}`}
      >
        <Info size={16} className={updateAvailable ? "text-accent" : ""} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6}>
          <Popover.Popup className="bg-bg-surface border border-border text-text text-xs px-md py-sm rounded-lg shadow-lg flex items-center gap-md">
            {updateAvailable ? (
              <>
                <span>New version available</span>
                <button
                  onClick={applyUpdate}
                  className="bg-primary text-bg px-md py-xs rounded-lg cursor-pointer text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  Reload
                </button>
              </>
            ) : (
              <span>Release {__COMMIT_HASH__}</span>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
