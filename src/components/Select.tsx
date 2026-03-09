import { Select as BaseSelect } from "@base-ui/react/select";
import { ChevronDown, Check } from "lucide-react";
import type { ReactNode } from "react";

export interface SelectOption {
  value: string;
  label: ReactNode;
}

export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  /** Map of value → label for Base UI `items` prop (display in trigger).
   *  Auto-derived from `options` if omitted. */
  items?: Record<string, ReactNode>;
  /** Alignment of the popup relative to the trigger */
  align?: "start" | "center" | "end";
  /** Extra classes on the trigger button */
  triggerClassName?: string;
  /** Minimum width of the popup */
  popupMinWidth?: string;
}

export function Select({
  value,
  onValueChange,
  options,
  items: itemsProp,
  align = "end",
  triggerClassName = "",
  popupMinWidth = "min-w-40",
}: SelectProps) {
  const items =
    itemsProp ?? Object.fromEntries(options.map((o) => [o.value, o.label]));

  return (
    <BaseSelect.Root
      value={value}
      onValueChange={(v) => v != null && onValueChange(v)}
      items={items}
    >
      <BaseSelect.Trigger
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs border border-border bg-bg-surface text-text rounded cursor-pointer hover:bg-bg-hover focus:border-primary outline-none transition-colors ${triggerClassName}`}
      >
        <BaseSelect.Value />
        <BaseSelect.Icon>
          <ChevronDown size={11} className="text-text-muted" />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner
          sideOffset={6}
          align={align}
          className="outline-none z-50"
        >
          <BaseSelect.Popup
            className={`bg-bg-surface border border-border rounded-lg py-1 ${popupMinWidth} shadow-lg origin-(--transform-origin) transition-[transform,scale,opacity] data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0`}
          >
            {options.map((o) => (
              <BaseSelect.Item
                key={o.value}
                value={o.value}
                className="grid grid-cols-[1rem_1fr] items-center gap-2 py-1.5 px-3 text-xs cursor-default outline-none select-none text-text data-highlighted:bg-bg-hover"
              >
                <BaseSelect.ItemIndicator className="col-start-1 text-primary">
                  <Check size={12} />
                </BaseSelect.ItemIndicator>
                <BaseSelect.ItemText className="col-start-2">
                  {o.label}
                </BaseSelect.ItemText>
              </BaseSelect.Item>
            ))}
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}

// ── Grouped select ──────────────────────────────────────────

interface GroupedSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  /** Ungrouped options shown before any groups */
  options?: SelectOption[];
  /** Grouped options with labels */
  groups: SelectGroup[];
  /** Map of value → label for Base UI `items` prop (display in trigger).
   *  Auto-derived from options + groups if omitted. */
  items?: Record<string, ReactNode>;
  /** Alignment of the popup relative to the trigger */
  align?: "start" | "center" | "end";
  /** Extra classes on the trigger button */
  triggerClassName?: string;
  /** Minimum width of the popup */
  popupMinWidth?: string;
}

export function GroupedSelect({
  value,
  onValueChange,
  options = [],
  groups,
  items: itemsProp,
  align = "end",
  triggerClassName = "",
  popupMinWidth = "min-w-40",
}: GroupedSelectProps) {
  const items =
    itemsProp ??
    Object.fromEntries([
      ...options.map((o) => [o.value, o.label]),
      ...groups.flatMap((g) => g.options.map((o) => [o.value, o.label])),
    ]);

  return (
    <BaseSelect.Root
      value={value}
      onValueChange={(v) => v != null && onValueChange(v)}
      items={items}
    >
      <BaseSelect.Trigger
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs border border-border bg-bg-surface text-text rounded cursor-pointer hover:bg-bg-hover focus:border-primary outline-none transition-colors ${triggerClassName}`}
      >
        <BaseSelect.Value />
        <BaseSelect.Icon>
          <ChevronDown size={11} className="text-text-muted" />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner
          sideOffset={6}
          align={align}
          className="outline-none z-50"
        >
          <BaseSelect.Popup
            className={`bg-bg-surface border border-border rounded-lg py-1 ${popupMinWidth} max-h-72 overflow-auto shadow-lg origin-(--transform-origin) transition-[transform,scale,opacity] data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0`}
          >
            {/* Ungrouped options first */}
            {options.map((o) => (
              <BaseSelect.Item
                key={o.value}
                value={o.value}
                className="grid grid-cols-[1rem_1fr] items-center gap-2 py-1.5 px-3 text-xs cursor-default outline-none select-none text-text data-highlighted:bg-bg-hover"
              >
                <BaseSelect.ItemIndicator className="col-start-1 text-primary">
                  <Check size={12} />
                </BaseSelect.ItemIndicator>
                <BaseSelect.ItemText className="col-start-2">
                  {o.label}
                </BaseSelect.ItemText>
              </BaseSelect.Item>
            ))}

            {/* Groups */}
            {groups.map((group) => (
              <BaseSelect.Group key={group.label} className="mt-1">
                <BaseSelect.GroupLabel className="px-3 py-1 text-[0.625rem] font-medium text-text-muted uppercase tracking-wider select-none">
                  {group.label}
                </BaseSelect.GroupLabel>
                {group.options.map((o) => (
                  <BaseSelect.Item
                    key={o.value}
                    value={o.value}
                    className="grid grid-cols-[1rem_1fr] items-center gap-2 py-1.5 px-3 text-xs cursor-default outline-none select-none text-text data-highlighted:bg-bg-hover"
                  >
                    <BaseSelect.ItemIndicator className="col-start-1 text-primary">
                      <Check size={12} />
                    </BaseSelect.ItemIndicator>
                    <BaseSelect.ItemText className="col-start-2">
                      {o.label}
                    </BaseSelect.ItemText>
                  </BaseSelect.Item>
                ))}
              </BaseSelect.Group>
            ))}
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
