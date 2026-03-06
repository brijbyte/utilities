import { Tooltip } from "@base-ui/react/tooltip";
import { Info } from "lucide-react";
import { AppGrid } from "./AppGrid";
import { ThemeSwitcher } from "./ThemeSwitcher";

export function HomePage() {
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
      <footer className="flex items-center justify-center gap-xs pb-md text-text-muted">
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger className="flex items-center gap-xs text-text-muted cursor-default">
              <Info size={12} />
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Positioner sideOffset={6}>
                <Tooltip.Popup className="bg-bg-surface border border-border text-text text-xs px-md py-sm rounded-lg shadow-lg">
                  Release {__COMMIT_HASH__}
                </Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      </footer>
    </div>
  );
}
