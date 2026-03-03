import { Copy, Check } from "lucide-react";
import { ALGORITHMS } from "./types";
import type { Hashes } from "./types";

interface HashTableProps {
  hashes: Hashes;
  keyPrefix: string;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
}

export function HashTable({
  hashes,
  keyPrefix,
  copied,
  onCopy,
}: HashTableProps) {
  return (
    <table className="w-full border-collapse">
      <tbody>
        {ALGORITHMS.map((algo) => {
          const copyKey = `${keyPrefix}-${algo}`;
          return (
            <tr
              key={algo}
              className="group border-b border-border-muted last:border-b-0 cursor-pointer hover:bg-bg-surface transition-colors"
              onClick={() => {
                if (!hashes[algo]) return;
                onCopy(hashes[algo]!, copyKey);
              }}
            >
              <td className="text-[10px] tracking-widest text-text-muted py-xs px-pn-x whitespace-nowrap align-middle w-0">
                {algo}
              </td>
              <td className="text-xs font-mono text-text break-all leading-relaxed py-xs px-sm group-hover:text-accent transition-colors">
                {hashes[algo] ? (
                  hashes[algo]
                ) : (
                  <span className="text-text-muted animate-pulse">
                    computing...
                  </span>
                )}
              </td>
              <td className="py-xs px-pn-x w-0 align-middle">
                {hashes[algo] &&
                  (copied === copyKey ? (
                    <Check size={14} className="text-accent" />
                  ) : (
                    <Copy
                      size={14}
                      className="text-text-muted group-hover:text-accent transition-colors"
                    />
                  ))}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
