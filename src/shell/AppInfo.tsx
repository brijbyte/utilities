import { Popover } from "@base-ui/react/popover";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { Github, Globe, Info, Monitor, Moon, Sun } from "lucide-react";
import { isPwa } from "../pwa";
import { applyUpdate } from "../sw-update";
import { useTheme, type Theme } from "../theme";
import { useSwUpdate } from "../useSwUpdate";
import { PopoverArrow } from "./PopoverArrow";

const themeOptions: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
];

export function AppInfo() {
  const updateAvailable = useSwUpdate();
  const { theme, setTheme } = useTheme();

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
            <PopoverArrow />

            <div className="px-lg py-md flex flex-col gap-sm">
              <div className="font-medium text-sm">⚙ utilities</div>
              <p className="text-text-muted leading-relaxed">
                Free, open-source developer tools that run entirely in your
                browser. No data leaves your device, unless you explicitly share
                it.
              </p>
            </div>

            <div className="border-t border-border px-lg py-sm flex flex-col gap-xs text-text-muted">
              <div className="flex items-center justify-between">
                <span>Release</span>
                <a
                  href={`https://github.com/brijbyte/utilities/commit/${__COMMIT_HASH__}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono underline text-primary"
                >
                  {__COMMIT_HASH__}
                </a>
              </div>
              {__COMMIT_DATE__ && (
                <div className="flex items-center justify-between">
                  <span className="font-mono">
                    {formatDistanceToNow(__COMMIT_DATE__)} ago
                  </span>
                </div>
              )}
              {isPwa && (
                <div className="flex items-center justify-between">
                  <span>Mode</span>
                  <span className="text-text">PWA</span>
                </div>
              )}
            </div>

            <div className="border-t border-border px-lg py-sm">
              <RadioGroup
                value={theme}
                onValueChange={(v) => setTheme(v as Theme)}
                className="flex justify-between gap-xs w-full"
                aria-label="Theme"
              >
                {themeOptions.map((opt) => (
                  <Radio.Root
                    key={opt.value}
                    value={opt.value}
                    className="flex flex-col grow items-center gap-0.5 px-sm py-xs rounded-lg cursor-pointer transition-colors data-checked:bg-secondary data-checked:text-bg data-unchecked:text-text-muted data-unchecked:hover:bg-bg-hover data-unchecked:hover:text-text"
                  >
                    <opt.icon size={13} />
                    <span className="text-[10px] leading-none">
                      {opt.label}
                    </span>
                  </Radio.Root>
                ))}
              </RadioGroup>
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

            <div className="border-t border-border px-lg py-sm flex items-center justify-end gap-md">
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
