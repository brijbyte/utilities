"use no memo";
import { useState, useCallback, useRef } from "react";
import { Toolbar } from "@base-ui/react/toolbar";
import { Copy, Check } from "lucide-react";
import { SplitPanel } from "../../components/SplitPanel";
import { Button } from "../../components/Button";

const ALGORITHMS = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"] as const;
type Algorithm = (typeof ALGORITHMS)[number];
type Hashes = Partial<Record<Algorithm, string>>;

interface FileEntry {
  id: string;
  name: string;
  size: number;
  phase: "reading" | "hashing" | "done" | "error";
  readProgress: number;
  hashes: Hashes;
}

interface FileWithPath {
  file: File;
  path: string;
}

function hexFromBuffer(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hashInWorker(
  buffer: ArrayBuffer,
  signal: AbortSignal,
  onResult: (algo: Algorithm, hex: string) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./hash-worker.js", import.meta.url), {
      type: "module",
    });

    signal.addEventListener("abort", () => {
      worker.terminate();
      reject(new DOMException("Aborted", "AbortError"));
    });

    worker.onmessage = (e) => {
      if (e.data.type === "result") {
        onResult(e.data.algo, e.data.hex);
      } else if (e.data.type === "done") {
        resolve();
        worker.terminate();
      }
    };

    worker.onerror = (err) => {
      reject(err);
      worker.terminate();
    };

    worker.postMessage({ buffer }, [buffer]);
  });
}

async function hashTextDirect(
  text: string,
): Promise<Record<Algorithm, string>> {
  const encoded = new TextEncoder().encode(text);
  const results = {} as Record<Algorithm, string>;
  await Promise.all(
    ALGORITHMS.map(async (algo) => {
      const hash = await crypto.subtle.digest(algo, encoded.buffer);
      results[algo] = hexFromBuffer(hash);
    }),
  );
  return results;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

let entryIdCounter = 0;

function readEntriesPromise(
  reader: FileSystemDirectoryReader,
): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => reader.readEntries(resolve, reject));
}

function fileFromEntry(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

async function collectFiles(
  entry: FileSystemEntry,
  basePath: string,
): Promise<FileWithPath[]> {
  if (entry.isFile) {
    const file = await fileFromEntry(entry as FileSystemFileEntry);
    return [{ file, path: basePath + entry.name }];
  }
  if (entry.isDirectory) {
    const dirReader = (entry as FileSystemDirectoryEntry).createReader();
    const results: FileWithPath[] = [];
    // readEntries may return partial results, must call until empty
    let batch: FileSystemEntry[];
    do {
      batch = await readEntriesPromise(dirReader);
      for (const child of batch) {
        results.push(
          ...(await collectFiles(child, basePath + entry.name + "/")),
        );
      }
    } while (batch.length > 0);
    return results;
  }
  return [];
}

export default function HashGenerator() {
  const [input, setInput] = useState("");
  const [textHashes, setTextHashes] = useState<Record<
    Algorithm,
    string
  > | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashCopied = useCallback((key: string) => {
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    setCopied(key);
    copiedTimer.current = setTimeout(() => setCopied(null), 1500);
  }, []);

  const updateFile = useCallback((id: string, update: Partial<FileEntry>) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...update } : f)),
    );
  }, []);

  const updateFileHash = useCallback(
    (id: string, algo: Algorithm, hex: string) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, hashes: { ...f.hashes, [algo]: hex } } : f,
        ),
      );
    },
    [],
  );

  const onTextChange = useCallback(async (text: string) => {
    setInput(text);
    if (!text) {
      setTextHashes(null);
      return;
    }
    setTextHashes(await hashTextDirect(text));
  }, []);

  const processFiles = useCallback(
    async (fileList: FileWithPath[]) => {
      // Cancel any previous text-triggered abort
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setInput("");
      setTextHashes(null);

      const entries: FileEntry[] = fileList.map((f) => ({
        id: `file-${++entryIdCounter}`,
        name: f.path,
        size: f.file.size,
        phase: "reading" as const,
        readProgress: 0,
        hashes: {},
      }));

      setFiles((prev) => [...prev, ...entries]);

      // Process files with concurrency limit of 5
      const CONCURRENCY = 5;
      let next = 0;

      async function processOne(): Promise<void> {
        while (next < fileList.length) {
          if (controller.signal.aborted) return;
          const i = next++;
          const file = fileList[i].file;
          const entry = entries[i];

          try {
            const stream = file.stream();
            const reader = stream.getReader();
            const chunks: Uint8Array[] = [];
            let bytesRead = 0;

            while (true) {
              if (controller.signal.aborted)
                throw new DOMException("Aborted", "AbortError");
              const { done, value } = await reader.read();
              if (done) break;
              chunks.push(value);
              bytesRead += value.byteLength;
              updateFile(entry.id, {
                readProgress: Math.round((bytesRead / file.size) * 100),
              });
            }

            const combined = new Uint8Array(bytesRead);
            let offset = 0;
            for (const chunk of chunks) {
              combined.set(chunk, offset);
              offset += chunk.byteLength;
            }
            chunks.length = 0;

            updateFile(entry.id, { phase: "hashing" });
            await hashInWorker(
              combined.buffer,
              controller.signal,
              (algo, hex) => {
                updateFileHash(entry.id, algo, hex);
              },
            );
            if (!controller.signal.aborted) {
              updateFile(entry.id, { phase: "done" });
            }
          } catch (err) {
            if ((err as Error).name !== "AbortError") {
              console.error("Hash failed:", err);
              updateFile(entry.id, { phase: "error" });
            }
          }
        }
      }

      // Launch up to CONCURRENCY workers
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, fileList.length) }, () =>
          processOne(),
        ),
      );
    },
    [updateFile, updateFileHash],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files;
      if (selected && selected.length > 0) {
        processFiles(
          Array.from(selected).map((f) => ({ file: f, path: f.name })),
        );
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [processFiles],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const items = e.dataTransfer.items;
      if (!items || items.length === 0) return;

      const allFiles: FileWithPath[] = [];
      // Collect entries first (must be done synchronously from the event)
      const fsEntries: FileSystemEntry[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry) fsEntries.push(entry);
      }

      for (const entry of fsEntries) {
        allFiles.push(...(await collectFiles(entry, "")));
      }

      if (allFiles.length > 0) processFiles(allFiles);
    },
    [processFiles],
  );

  function clear() {
    abortRef.current?.abort();
    setInput("");
    setTextHashes(null);
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function copyAllForEntry(hashes: Hashes, key: string) {
    const text = ALGORITHMS.filter((a) => hashes[a])
      .map((a) => `${a}: ${hashes[a]}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    flashCopied(key);
  }

  const hasContent = !!input || files.length > 0;

  const anyActive = files.some(
    (f) => f.phase === "reading" || f.phase === "hashing",
  );

  function HashTable({
    hashes,
    keyPrefix,
  }: {
    hashes: Hashes;
    keyPrefix: string;
  }) {
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
                  navigator.clipboard.writeText(hashes[algo]!);
                  flashCopied(copyKey);
                }}
              >
                <td className="text-[10px] uppercase tracking-widest text-text-muted py-xs px-pn-x whitespace-nowrap align-middle w-0">
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

  const rightContent = textHashes ? (
    <div className="overflow-auto px-pn-x py-pn-y">
      <HashTable hashes={textHashes} keyPrefix="text" />
    </div>
  ) : files.length > 0 ? (
    <div className="overflow-auto">
      {files.map((entry) => (
        <div key={entry.id} className="border-b border-border last:border-b-0">
          <div className="flex items-center gap-sm px-pn-x py-pn-lbl border-b border-border-muted bg-bg-surface">
            <span className="text-[10px] uppercase tracking-widest text-text-muted truncate flex-1">
              {entry.name}
              <span className="normal-case tracking-normal">
                {" "}
                — {formatSize(entry.size)}
              </span>
            </span>
            {entry.phase === "reading" && (
              <span className="text-[10px] text-text-muted whitespace-nowrap">
                reading {entry.readProgress}%
              </span>
            )}
            {entry.phase === "hashing" && (
              <span className="text-[10px] text-text-muted whitespace-nowrap">
                hashing...
              </span>
            )}
            {entry.phase === "done" && (
              <button
                type="button"
                onClick={() => copyAllForEntry(entry.hashes, `all-${entry.id}`)}
                className="text-[10px] text-accent cursor-pointer bg-transparent border-none p-0 whitespace-nowrap hover:underline"
              >
                {copied === `all-${entry.id}` ? "copied!" : "copy all"}
              </button>
            )}
            {entry.phase === "error" && (
              <span className="text-[10px] text-danger whitespace-nowrap">
                error
              </span>
            )}
          </div>
          {entry.phase === "reading" ? (
            <div className="h-0.5 bg-border-muted overflow-hidden relative">
              <div
                className="h-full bg-accent transition-[width] duration-300 ease-out"
                style={{ width: `${entry.readProgress}%` }}
              />
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1s_ease-in-out_infinite]" />
            </div>
          ) : null}
          {(entry.phase === "hashing" || entry.phase === "done") && (
            <HashTable hashes={entry.hashes} keyPrefix={entry.id} />
          )}
        </div>
      ))}
    </div>
  ) : (
    <p className="text-xs text-text-muted px-pn-x py-pn-y">
      hashes will appear here...
    </p>
  );

  return (
    <div className="h-full flex flex-col">
      <Toolbar.Root className="flex items-center gap-tb px-tb-x py-tb-y border-b border-border bg-bg-surface">
        <Toolbar.Button
          render={(props) => (
            <Button
              {...props}
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              files
            </Button>
          )}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />

        <Toolbar.Separator className="w-px h-5 bg-border-muted mx-xs" />

        {textHashes && (
          <Toolbar.Button
            render={(props) => (
              <Button
                {...props}
                variant="outline"
                onClick={() => copyAllForEntry(textHashes, "all-text")}
              >
                {copied === "all-text" ? "copied!" : "copy all"}
              </Button>
            )}
          />
        )}

        <Toolbar.Group className="ml-auto flex items-center gap-tb">
          <Toolbar.Button
            render={(props) => (
              <Button
                {...props}
                variant="ghost"
                onClick={clear}
                disabled={!hasContent && !anyActive}
              >
                clear
              </Button>
            )}
          />
        </Toolbar.Group>
      </Toolbar.Root>

      <SplitPanel
        leftLabel="input — drop files or folders, or type text"
        rightLabel={
          files.length > 0
            ? `hashes — ${files.length} file${files.length > 1 ? "s" : ""}`
            : "hashes"
        }
        left={
          <div
            className={`flex-1 flex flex-col min-h-0 ${dragging ? "ring-1 ring-inset ring-accent" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <textarea
              value={input}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="type or paste text to hash..."
              spellCheck={false}
              className="flex-1 resize-none px-pn-x py-pn-y text-xs bg-transparent text-text border-none outline-none font-mono leading-relaxed"
            />
          </div>
        }
        right={rightContent}
      />
    </div>
  );
}
