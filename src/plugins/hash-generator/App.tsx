import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Toolbar } from "@base-ui/react/toolbar";
import { SplitPanel } from "../../components/SplitPanel";
import { Button } from "../../components/Button";
import { ALGORITHMS } from "./types";
import type { Hashes, Algorithm, FileWithPath } from "./types";
import { hashText } from "./hash";
import { collectFiles } from "./files";
import { FileResults } from "./FileResults";
import { Semaphore } from "./semaphore";
import { HashContextProvider } from "./context";

interface FileInfo {
  id: string;
  file: File;
  path: string;
}

let entryIdCounter = 0;

export default function HashGenerator() {
  const [input, setInput] = useState("");
  const [textHashes, setTextHashes] = useState<Record<
    Algorithm,
    string
  > | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [dragging, setDragging] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  const onFileComplete = useCallback(() => {
    setCompleted((prev) => prev + 1);
  }, []);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const semaphoreRef = useRef(new Semaphore(20));

  const flashCopied = useCallback((key: string) => {
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    setCopied(key);
    copiedTimer.current = setTimeout(() => setCopied(null), 1500);
  }, []);

  const handleCopy = useCallback(
    (text: string, key: string) => {
      navigator.clipboard.writeText(text);
      flashCopied(key);
    },
    [flashCopied],
  );

  const handleCopyAll = useCallback(
    (hashes: Hashes, key: string) => {
      const text = ALGORITHMS.filter((a) => hashes[a])
        .map((a) => `${a}: ${hashes[a]}`)
        .join("\n");
      navigator.clipboard.writeText(text);
      flashCopied(key);
    },
    [flashCopied],
  );

  const textAbortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hashTextInput = useCallback(async (text: string) => {
    textAbortRef.current?.abort();
    const controller = new AbortController();
    textAbortRef.current = controller;
    try {
      const results = await hashText(text, controller.signal);
      if (!controller.signal.aborted) {
        setTextHashes(results);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Hash failed:", err);
      }
    }
  }, []);

  const onTextChange = useCallback(
    (text: string) => {
      setInput(text);
      textAbortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!text) {
        setTextHashes(null);
        return;
      }
      debounceRef.current = setTimeout(() => hashTextInput(text), 200);
    },
    [hashTextInput],
  );

  const addFiles = useCallback((fileList: FileWithPath[]) => {
    if (!abortRef.current || abortRef.current.signal.aborted) {
      abortRef.current = new AbortController();
    }

    // Cancel any pending text hash debounce
    textAbortRef.current?.abort();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    setInput("");
    setTextHashes(null);

    const sorted = [...fileList].sort((a, b) => a.file.size - b.file.size);

    const entries: FileInfo[] = sorted.map((f) => ({
      id: `file-${++entryIdCounter}`,
      file: f.file,
      path: f.path,
    }));

    setFiles((prev) => [...prev, ...entries]);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files;
      if (selected && selected.length > 0) {
        addFiles(Array.from(selected).map((f) => ({ file: f, path: f.name })));
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [addFiles],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const items = e.dataTransfer.items;
      if (!items || items.length === 0) return;

      const allFiles: FileWithPath[] = [];
      const fsEntries: FileSystemEntry[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry) fsEntries.push(entry);
      }

      for (const entry of fsEntries) {
        allFiles.push(...(await collectFiles(entry, "")));
      }

      if (allFiles.length > 0) addFiles(allFiles);
    },
    [addFiles],
  );

  const clear = useCallback((ev: React.SyntheticEvent | boolean = false) => {
    const unmount = typeof ev === "boolean" ? ev : false;
    abortRef.current?.abort();
    textAbortRef.current?.abort();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!unmount) {
      setInput("");
      setTextHashes(null);
      setCompleted(0);
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  useEffect(() => () => clear(true), [clear]);

  const hasContent = !!input || files.length > 0;

  const hashCtx = useMemo(
    () => ({
      signal: abortRef,
      semaphore: semaphoreRef,
      flashCopied,
      onFileComplete,
    }),
    [flashCopied, onFileComplete], // files dependency triggers recalc when addFiles creates new controller
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

        <Toolbar.Separator className="w-px h-5 bg-border-muted mx-1" />

        {textHashes && (
          <Toolbar.Button
            render={(props) => (
              <Button
                {...props}
                variant="outline"
                onClick={() => handleCopyAll(textHashes, "all-text")}
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
                disabled={!hasContent}
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
            ? `hashes — ${completed}/${files.length} file${files.length > 1 ? "s" : ""}`
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
        right={
          <HashContextProvider value={hashCtx}>
            <FileResults
              files={files}
              textHashes={textHashes}
              copied={copied}
              onCopy={handleCopy}
            />
          </HashContextProvider>
        }
      />
    </div>
  );
}
