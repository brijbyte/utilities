import { Sun, Moon, Monitor } from "lucide-react";
import { Menu } from "@base-ui/react/menu";
import { useTheme, type Theme } from "../theme";
import type { ReactNode } from "react";

const options: { value: Theme; label: string; icon: ReactNode }[] = [
  { value: "light", label: "Light", icon: <Sun size={14} /> },
  { value: "dark", label: "Dark", icon: <Moon size={14} /> },
  { value: "system", label: "System", icon: <Monitor size={14} /> },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const current = options.find((o) => o.value === theme)!;

  return (
    <Menu.Root>
      <Menu.Trigger
        className="
          w-8 h-8 flex items-center justify-center
          border border-border bg-bg-surface hover:bg-bg-hover
          cursor-pointer text-text-muted hover:text-text transition-colors
        "
      >
        {current.icon}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end" className="outline-none">
          <Menu.Popup
            className="
              bg-bg-surface border border-border py-xs min-w-35
              origin-(--transform-origin)
              transition-[transform,scale,opacity]
              data-starting-style:scale-95 data-starting-style:opacity-0
              data-ending-style:scale-95 data-ending-style:opacity-0
            "
          >
            <Menu.RadioGroup
              value={theme}
              onValueChange={(v) => setTheme(v as Theme)}
            >
              {options.map((opt) => (
                <Menu.RadioItem
                  key={opt.value}
                  value={opt.value}
                  className="
                    grid grid-cols-[1rem_1fr] items-center gap-sm
                    py-mi-y px-mi-x
                    text-xs cursor-default outline-none select-none
                    text-text
                    data-highlighted:bg-bg-hover
                  "
                >
                  <Menu.RadioItemIndicator className="col-start-1 text-accent">
                    ✓
                  </Menu.RadioItemIndicator>
                  <span className="col-start-2 flex items-center gap-sm">
                    <span className="text-text-muted">{opt.icon}</span>
                    {opt.label}
                  </span>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
