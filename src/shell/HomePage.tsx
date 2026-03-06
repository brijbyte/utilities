import { Popover } from "@base-ui/react/popover";
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
        <Popover.Root>
          <Popover.Trigger className="flex items-center gap-xs text-text-muted cursor-pointer hover:text-text transition-colors">
            <Info size={12} />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner sideOffset={6}>
              <Popover.Popup className="bg-bg-surface border border-border text-text text-xs px-md py-sm rounded-lg shadow-lg">
                Release {__COMMIT_HASH__}
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      </footer>
    </div>
  );
}
