"use no memo";
import type { ReactNode } from "react";
import { Panel, Group } from "react-resizable-panels";
import { ResizeHandle } from "./ResizeHandle";

interface SplitPanelProps {
  leftLabel: ReactNode;
  rightLabel: ReactNode;
  left: ReactNode;
  right: ReactNode;
  defaultSize?: number;
  minSize?: number;
}

export function SplitPanel({
  leftLabel,
  rightLabel,
  left,
  right,
  defaultSize = 50,
  minSize = 20,
}: SplitPanelProps) {
  return (
    <Group orientation="horizontal" className="flex-1 min-h-0">
      <Panel
        defaultSize={defaultSize}
        minSize={minSize}
        className="flex flex-col min-h-0"
      >
        <div className="px-pn-x py-pn-lbl border-b border-border-muted">
          <span className="text-[0.625rem] uppercase tracking-widest text-text-muted">
            {leftLabel}
          </span>
        </div>
        <div className="flex-1 min-h-0 flex flex-col">{left}</div>
      </Panel>
      <ResizeHandle />
      <Panel
        defaultSize={100 - defaultSize}
        minSize={minSize}
        className="flex flex-col min-h-0"
      >
        <div className="px-pn-x py-pn-lbl border-b border-border-muted">
          <span className="text-[0.625rem] uppercase tracking-widest text-text-muted">
            {rightLabel}
          </span>
        </div>
        <div className="flex-1 min-h-0 flex flex-col">{right}</div>
      </Panel>
    </Group>
  );
}
