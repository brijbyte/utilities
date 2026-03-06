import { Popover } from "@base-ui/react/popover";
import { Info } from "lucide-react";
import { AppGrid } from "./AppGrid";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useSwUpdate } from "../useSwUpdate";
import { applyUpdate } from "../sw-update";

export function HomePage() {
  const updateAvailable = useSwUpdate();

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-end p-md">
        <ThemeSwitcher />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-2xl pb-3xl">
        <div className="text-center mb-3xl">
          <h1 className="text-xl text-text mb-xs">⚙ utilities</h1>
          <p className="text-xs text-text-muted">
            developer tools in the browser
          </p>
        </div>
        <AppGrid />
      </div>
      <footer className="flex items-center justify-end gap-xs pb-md pe-md text-text-muted">
        <Popover.Root>
          <Popover.Trigger
            className={`flex items-center gap-xs text-text-muted cursor-pointer hover:text-text transition-colors ${updateAvailable ? "animate-shake" : ""}`}
          >
            <Info size={18} className={updateAvailable ? "text-accent" : ""} />
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
      </footer>
    </div>
  );
}
