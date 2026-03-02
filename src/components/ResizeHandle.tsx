import { Separator } from "react-resizable-panels";
import { GripVertical } from "lucide-react";

export function ResizeHandle() {
  return (
    <Separator className="group relative w-1 flex items-center justify-center bg-transparent hover:bg-accent/10 data-resize-handle-active:bg-accent/10 transition-colors">
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border-muted group-hover:bg-accent group-data-resize-handle-active:bg-accent transition-colors" />
      <GripVertical
        size={24}
        className="relative z-10 text-border-muted group-hover:text-accent group-data-resize-handle-active:text-accent transition-colors"
      />
    </Separator>
  );
}
