import { useState } from "react";
import { Link } from "react-router";
import { LayoutGrid, WifiOff } from "lucide-react";
import { useParams } from "react-router";
import { Popover } from "../components/Popover";
import { usePlugin } from "../registry";
import { useOnline } from "../useOnline";
import { AppGrid } from "./AppGrid";
import { AppInfo } from "./AppInfo";

export function Header() {
  const { id } = useParams<{ id: string }>();
  const plugin = usePlugin(id ?? "");
  const [open, setOpen] = useState(false);
  const online = useOnline();

  return (
    <header className="h-hdr border-b border-border flex items-center justify-between px-md bg-bg-surface">
      <div className="flex items-center gap-md shrink-0">
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger className="w-8 h-8 flex items-center justify-center border border-border rounded bg-bg-surface hover:bg-bg-hover cursor-pointer text-text-muted hover:text-text transition-colors">
            <LayoutGrid size={14} />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Backdrop />
            <Popover.Positioner align="start">
              <Popover.Popup className="rounded-sm">
                <Popover.Arrow />
                <AppGrid compact onSelect={() => setOpen(false)} />
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>

        <span className="flex gap-1">
          <Link
            to="/"
            className="text-xs text-text-muted hover:text-text transition-colors no-underline"
          >
            home
          </Link>
          <span className="text-xs">&nbsp;/</span>
          {plugin && (
            <span className="flex items-center gap-sm text-xs text-text-muted">
              &nbsp;
              <span className="text-text [&>svg]:size-3.5">{plugin.icon}</span>
              <span className="text-text">{plugin.name}</span>
            </span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-md">
        {!online && (
          <span className="flex items-center gap-xs text-danger text-xs">
            <WifiOff size={14} />
            <span className="hidden sm:inline">Offline</span>
          </span>
        )}
        <AppInfo />
      </div>
    </header>
  );
}
