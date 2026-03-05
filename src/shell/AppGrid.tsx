import { Link, useParams } from "react-router";
import { Tooltip } from "@base-ui/react/tooltip";
import { usePlugins } from "../registry";

interface AppGridProps {
  onSelect?: () => void;
  compact?: boolean;
}

export function AppGrid({ onSelect, compact }: AppGridProps) {
  const plugins = usePlugins();
  const { id: activeId } = useParams<{ id: string }>();

  if (plugins.length === 0) {
    return (
      <p className="text-text-muted text-xs p-xl text-center">
        No utilities registered.
      </p>
    );
  }

  return (
    <Tooltip.Provider delay={400}>
      <div
        className={
          compact
            ? "grid grid-cols-3 gap-gr-c p-gr-cp"
            : "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-gr p-gr-p"
        }
      >
        {plugins.map((p) => {
          const active = p.id === activeId;
          return (
            <Tooltip.Root key={p.id}>
              <Tooltip.Trigger
                render={
                  <Link
                    to={`/a/${p.id}`}
                    onClick={onSelect}
                    className="group flex flex-col items-center gap-sm no-underline"
                  />
                }
              >
                <div
                  className={`flex items-center justify-center border transition-all ${active ? "bg-accent-subtle border-accent text-accent ring-1 ring-accent/20" : "border-border bg-bg-surface text-text-muted group-hover:bg-bg-hover group-hover:text-text group-hover:border-border"} ${compact ? "w-12 h-12 rounded-xl [&>svg]:size-4" : "w-16 h-16 rounded-2xl [&>svg]:size-6"}`}
                >
                  {p.icon}
                </div>
                <span
                  className={`text-center leading-tight transition-colors ${compact ? "max-w-20 truncate text-[10px]" : "max-w-20 text-[11px] break-words"} ${active ? "text-accent" : "text-text-muted group-hover:text-text"}`}
                >
                  {p.name}
                </span>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Positioner sideOffset={8}>
                  <Tooltip.Popup className="px-md py-sm bg-text text-text-inverse text-[11px] max-w-48 rounded border border-border-muted origin-(--transform-origin) transition-[transform,scale,opacity] data-starting-style:opacity-0 data-starting-style:scale-95 data-ending-style:opacity-0 data-ending-style:scale-95 data-instant:transition-none">
                    {p.meta.description}
                  </Tooltip.Popup>
                </Tooltip.Positioner>
              </Tooltip.Portal>
            </Tooltip.Root>
          );
        })}
      </div>
    </Tooltip.Provider>
  );
}
