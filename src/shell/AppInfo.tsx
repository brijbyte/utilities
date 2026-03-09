import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { Github, Globe, Info, Monitor, Moon, Sun } from "lucide-react";
import { isPwa } from "../pwa";
import { applyUpdate } from "../sw-update";
import {
  useTheme,
  FONT_SIZE_PRESETS,
  type Theme,
  type FontSize,
} from "../theme";
import { useSwUpdate } from "../useSwUpdate";
import { Popover } from "../components/Popover";
import { Button } from "../components/Button";

const commitHash = (globalThis as unknown as Record<string, string>).__APP_VERSION__ ?? "";
const commitDate = (globalThis as unknown as Record<string, string>).__APP_DATE__ ?? "";

const themeOptions: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
];

export function AppInfo() {
  const updateAvailable = useSwUpdate();
  const { theme, setTheme, fontSize, setFontSize } = useTheme();

  return (
    <Popover.Root>
      <Popover.Trigger
        className={`flex items-center justify-center text-text-muted cursor-pointer hover:text-text transition-colors ${updateAvailable ? "animate-shake" : ""}`}
      >
        <Info size={16} className={updateAvailable ? "text-accent" : ""} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Backdrop />

        <Popover.Positioner>
          <Popover.Popup className="text-text text-xs w-56">
            <Popover.Arrow />
            <Popover.Viewport>
              <div className="px-4 py-3 flex flex-col gap-2">
                <Popover.Title className="font-medium text-sm">
                  ⚙ utilities
                </Popover.Title>
                <Popover.Description className="text-text-muted leading-relaxed">
                  Free, open-source developer tools that run entirely in your
                  browser. No data leaves your device, unless you explicitly
                  share it.
                </Popover.Description>
              </div>

              {updateAvailable && (
                <div className="border-t border-border px-4 py-2 flex flex-col gap-2 items-center justify-between">
                  <span className="font-medium text-text-muted">
                    New update available
                  </span>
                  <Button
                    onClick={applyUpdate}
                    variant="primary"
                    className="rounded-sm"
                  >
                    Apply Update
                  </Button>
                </div>
              )}

              <div className="border-t border-border px-4 py-2 flex flex-col gap-1 text-text-muted">
                <div className="flex items-center justify-between">
                  <span>Release</span>
                  <a
                    href={`https://github.com/brijbyte/utilities/commit/${commitHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono underline text-primary"
                  >
                    {commitHash}
                  </a>
                </div>
                {commitDate && (
                  <div className="flex items-center justify-between">
                    <span className="font-mono">
                      {formatDistanceToNow(commitDate)} ago
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

              <div className="border-t border-border px-4 py-2">
                <RadioGroup
                  value={theme}
                  onValueChange={(v) => setTheme(v as Theme)}
                  className="flex justify-between gap-1 w-full"
                  aria-label="Theme"
                >
                  {themeOptions.map((opt) => (
                    <Radio.Root
                      key={opt.value}
                      value={opt.value}
                      className="flex flex-col grow items-center gap-0.5 px-2 py-1 rounded-lg cursor-pointer transition-colors data-checked:bg-secondary data-checked:text-bg data-unchecked:text-text-muted data-unchecked:hover:bg-bg-hover data-unchecked:hover:text-text"
                    >
                      <opt.icon size={13} />
                      <span className="text-[0.625rem] leading-none">
                        {opt.label}
                      </span>
                    </Radio.Root>
                  ))}
                </RadioGroup>
              </div>

              <div className="border-t border-border px-4 py-2">
                <RadioGroup
                  value={fontSize}
                  onValueChange={(v) => setFontSize(v as FontSize)}
                  className="flex justify-between gap-1 w-full"
                  aria-label="Font Size"
                >
                  {FONT_SIZE_PRESETS.map((preset) => (
                    <Radio.Root
                      key={preset.id}
                      value={preset.id}
                      className="flex flex-col grow items-center gap-0.5 px-1 py-1 rounded-lg cursor-pointer transition-colors data-checked:bg-secondary data-checked:text-bg data-unchecked:text-text-muted data-unchecked:hover:bg-bg-hover data-unchecked:hover:text-text"
                    >
                      <span
                        className="font-medium leading-none"
                        style={{ fontSize: `${preset.px - 2}px` }}
                      >
                        A
                      </span>
                      <span className="text-[9px] leading-none">
                        {preset.label}
                      </span>
                    </Radio.Root>
                  ))}
                </RadioGroup>
              </div>

              <div className="border-t border-border px-4 py-2 flex items-center justify-end gap-3">
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
            </Popover.Viewport>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
