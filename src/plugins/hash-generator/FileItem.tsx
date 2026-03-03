import { useState, useEffect, useCallback, useRef, memo } from "react";
import { HashTable } from "./HashTable";
import { formatSize } from "./files";
import { hashInWorker } from "./hash";
import { ALGORITHMS } from "./types";
import type { Hashes } from "./types";
import { useHashContext } from "./context";

interface FileItemProps {
  file: File;
  path: string;
}

export const FileItem = memo(function FileItem({ file, path }: FileItemProps) {
  const { signal, semaphore } = useHashContext();
  const [phase, setPhase] = useState<
    "queued" | "reading" | "hashing" | "done" | "error"
  >("queued");
  const [readProgress, setReadProgress] = useState(0);
  const [hashes, setHashes] = useState<Hashes>({});
  const [copied, setCopied] = useState<string | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(false);

  const localFlashCopied = useCallback((key: string) => {
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    setCopied(key);
    copiedTimer.current = setTimeout(() => setCopied(null), 1500);
  }, []);

  const handleCopy = useCallback(
    (text: string, key: string) => {
      navigator.clipboard.writeText(text);
      localFlashCopied(key);
    },
    [localFlashCopied],
  );

  const handleCopyAll = useCallback(() => {
    const text = ALGORITHMS.filter((a) => hashes[a])
      .map((a) => `${a}: ${hashes[a]}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    localFlashCopied("all");
  }, [hashes, localFlashCopied]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // Capture the current signal at start — this is the one controlling this batch
    const abortSignal = signal.current?.signal;
    if (!abortSignal || abortSignal.aborted) return;

    (async () => {
      try {
        await semaphore.current?.acquire();
        if (abortSignal.aborted) {
          semaphore.current?.release();
          return;
        }

        setPhase("reading");
        const stream = file.stream();
        const reader = stream.getReader();
        const chunks: Uint8Array[] = [];
        let bytesRead = 0;

        while (true) {
          if (abortSignal.aborted)
            throw new DOMException("Aborted", "AbortError");
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          bytesRead += value.byteLength;
          setReadProgress(Math.round((bytesRead / file.size) * 100));
        }

        const combined = new Uint8Array(bytesRead);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.byteLength;
        }
        chunks.length = 0;

        setPhase("hashing");
        await hashInWorker(combined.buffer, abortSignal, (algo, hex) => {
          setHashes((prev) => ({ ...prev, [algo]: hex }));
        });

        if (!abortSignal.aborted) {
          setPhase("done");
        }
        semaphore.current?.release();
      } catch (err) {
        semaphore.current?.release();
        if ((err as Error).name !== "AbortError") {
          console.error("Hash failed:", err);
          setPhase("error");
        }
      }
    })();
  }, [file, signal, semaphore]);

  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-sm px-pn-x py-pn-lbl border-b border-border-muted bg-bg-surface">
        <span className="text-[10px] tracking-widest text-text-muted truncate flex-1">
          {path}
          <span className="normal-case tracking-normal">
            {" "}
            — {formatSize(file.size)}
          </span>
        </span>
        {phase === "reading" && (
          <span className="text-[10px] text-text-muted whitespace-nowrap">
            reading {readProgress}%
          </span>
        )}
        {phase === "hashing" && (
          <span className="text-[10px] text-text-muted whitespace-nowrap">
            hashing...
          </span>
        )}
        {phase === "done" && (
          <button
            type="button"
            onClick={handleCopyAll}
            className="text-[10px] text-accent cursor-pointer bg-transparent border-none p-0 whitespace-nowrap hover:underline"
          >
            {copied === "all" ? "copied!" : "copy all"}
          </button>
        )}
        {phase === "error" && (
          <span className="text-[10px] text-danger whitespace-nowrap">
            error
          </span>
        )}
      </div>
      {phase === "reading" && (
        <div className="h-0.5 bg-border-muted overflow-hidden relative">
          <div
            className="h-full bg-accent transition-[width] duration-300 ease-out"
            style={{ width: `${readProgress}%` }}
          />
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1s_ease-in-out_infinite]" />
        </div>
      )}
      {(phase === "hashing" || phase === "done") && (
        <HashTable
          hashes={hashes}
          keyPrefix="h"
          copied={copied}
          onCopy={handleCopy}
        />
      )}
    </div>
  );
});
