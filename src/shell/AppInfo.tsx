import { Popover } from "@base-ui/react/popover";
import { Info, Github, Globe } from "lucide-react";
import { useSwUpdate } from "../useSwUpdate";
import { applyUpdate } from "../sw-update";
import { isPwa } from "../pwa";

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
          <Popover.Popup className="bg-bg-surface border border-border text-text text-xs rounded-xl shadow-lg w-56">
            <Popover.Arrow className="data-[side=bottom]:-top-1.75 data-[side=top]:-bottom-1.75 data-[side=top]:rotate-180 data-[side=left]:-right-3.25 data-[side=left]:rotate-90 data-[side=right]:-left-3.25 data-[side=right]:-rotate-90">
              <svg width="20" height="10" viewBox="0 0 20 10" fill="none">
                <path
                  d="M9.66437 2.60207L4.80758 6.97318C4.07308 7.63423 3.11989 8 2.13172 8H0V10H20V8H18.5349C17.5468 8 16.5936 7.63423 15.8591 6.97318L11.0023 2.60207C10.622 2.2598 10.0447 2.25979 9.66437 2.60207Z"
                  className="fill-bg-surface"
                />
                <path
                  d="M8.99542 1.85876C9.75604 1.17425 10.9106 1.17422 11.6713 1.85878L16.5281 6.22989C17.0789 6.72568 17.7938 7.00001 18.5349 7.00001L15.89 7L11.0023 2.60207C10.622 2.2598 10.0447 2.2598 9.66436 2.60207L4.77734 7L2.13171 7.00001C2.87284 7.00001 3.58774 6.72568 4.13861 6.22989L8.99542 1.85876Z"
                  className="fill-border"
                />
              </svg>
            </Popover.Arrow>
            <div className="px-lg py-md flex flex-col gap-sm">
              <div className="font-medium text-sm">⚙ utilities</div>
              <p className="text-text-muted leading-relaxed">
                Free, open-source developer tools that run entirely in your
                browser. No data leaves your device.
              </p>
            </div>

            <div className="border-t border-border px-lg py-sm flex flex-col gap-xs text-text-muted">
              <div className="flex items-center justify-between">
                <span>Release</span>
                <span className="font-mono text-text">{__COMMIT_HASH__}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Mode</span>
                <span className="text-text">{isPwa ? "PWA" : "Browser"}</span>
              </div>
            </div>

            {updateAvailable && (
              <div className="border-t border-border px-lg py-sm flex items-center justify-between">
                <span className="text-accent font-medium">
                  Update available
                </span>
                <button
                  onClick={applyUpdate}
                  className="bg-primary text-bg px-md py-xs rounded-lg cursor-pointer text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  Reload
                </button>
              </div>
            )}

            <div className="border-t border-border px-lg py-sm flex items-center gap-md">
              <a
                href="https://github.com/brijbyte/utilities"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-text transition-colors"
                title="GitHub"
              >
                <Github size={14} />
              </a>
              <a
                href="https://utilities.brijbyte.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-text transition-colors"
                title="Website"
              >
                <Globe size={14} />
              </a>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
