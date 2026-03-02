import { Link } from "react-router";
import { LayoutGrid } from "lucide-react";
import { Popover } from "@base-ui/react/popover";
import { useParams } from "react-router";
import { usePlugin } from "../registry";
import { AppGrid } from "./AppGrid";
import { ThemeSwitcher } from "./ThemeSwitcher";

export function Header() {
  const { id } = useParams<{ id: string }>();
  const plugin = usePlugin(id ?? "");

  return (
    <header className="h-hdr border-b border-border flex items-center justify-between px-hdr-x bg-bg-surface">
      <div className="flex items-center gap-md shrink-0">
        <Popover.Root>
          <Popover.Trigger className="w-8 h-8 flex items-center justify-center border border-border bg-bg-surface hover:bg-bg-hover cursor-pointer text-text-muted hover:text-text transition-colors">
            <LayoutGrid size={14} />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Backdrop className="fixed inset-0 bg-bg-overlay transition-opacity data-starting-style:opacity-0 data-ending-style:opacity-0" />
            <Popover.Positioner sideOffset={6} align="start">
              <Popover.Popup className="bg-bg-surface border border-border rounded-sm outline-none transition-[transform,opacity] origin-(--transform-origin) data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0">
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
                <AppGrid compact />
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>

        <Link
          to="/"
          className="text-xs text-text-muted hover:text-text transition-colors no-underline"
        >
          / home /
        </Link>

        {plugin && (
          <span className="flex items-center gap-sm text-xs text-text-muted">
            <span className="text-text [&>svg]:size-3.5">{plugin.icon}</span>
            <span className="text-text">{plugin.name}</span>
          </span>
        )}
      </div>

      <ThemeSwitcher />
    </header>
  );
}
