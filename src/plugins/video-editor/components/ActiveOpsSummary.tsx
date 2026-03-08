import type { Operations } from "../utils/types";

interface ActiveOpsSummaryProps {
  ops: Operations;
}

export function ActiveOpsSummary({ ops }: ActiveOpsSummaryProps) {
  const activeOps = [
    ops.compress.enabled && "Compress",
    ops.trim.enabled && "Trim",
    ops.resize.enabled && "Resize",
    ops.convert.enabled && "Convert",
    ops.audio.enabled &&
      (ops.audio.action === "remove" ? "Mute" : "Extract Audio"),
    ops.rotate.enabled && "Rotate",
  ].filter(Boolean) as string[];

  if (activeOps.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] text-text-muted uppercase tracking-wider">
        Active:
      </span>
      {activeOps.map((op) => (
        <span
          key={op}
          className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
        >
          {op}
        </span>
      ))}
    </div>
  );
}
