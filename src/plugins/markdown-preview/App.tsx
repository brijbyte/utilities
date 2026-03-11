"use no memo";

import "./md-preview.css";
import {
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
  useDeferredValue,
  useSyncExternalStore,
} from "react";
import { lazy, Suspense } from "react";
import { Toolbar } from "@base-ui/react/toolbar";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Button } from "../../components/Button";
import {
  ListTree,
  FileDown,
  Printer,
  ClipboardCopy,
  FileCode,
  Eraser,
  Check,
  LoaderCircle,
  Pencil,
  Eye,
  Link,
  Upload,
} from "lucide-react";

const DesktopLayout = lazy(() => import("./components/DesktopLayout"));

import Preview from "./components/Preview";
import {
  parseMarkdown,
  renderToc,
  getStats,
  buildHtmlDocument,
  DEFAULT_MARKDOWN,
} from "./utils/markdown";

const ICON = 14;

/* ── Mobile detection ────────────────────────────────────────── */

const MQ = "(min-width: 768px)";
const mql = typeof window !== "undefined" ? window.matchMedia(MQ) : undefined;
const subscribe = (cb: () => void) => {
  mql?.addEventListener("change", cb);
  return () => mql?.removeEventListener("change", cb);
};
const getSnapshot = () => mql?.matches ?? true;
const getServerSnapshot = () => true;

function useIsDesktop() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/* ── Component ───────────────────────────────────────────────── */

const STORAGE_KEY = "md-preview-source";

function loadSavedSource(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ?? DEFAULT_MARKDOWN;
  } catch {
    return DEFAULT_MARKDOWN;
  }
}

export default function MarkdownPreview() {
  const [source, setSource] = useState(loadSavedSource);
  const [html, setHtml] = useState("");
  const [tocHtml, setTocHtml] = useState("");
  const [showToc, setShowToc] = useState(false);
  const [syncScroll, setSyncScroll] = useState(true);
  const [copied, setCopied] = useState<"html" | "md" | null>(null);
  const [ready, setReady] = useState(false);
  const [mobileTab, setMobileTab] = useState<"editor" | "preview">("editor");

  const isDesktop = useIsDesktop();

  const mobilePreviewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readyRef = useRef(false);
  const parseGenRef = useRef(0);

  /** Deferred source — React keeps showing old preview while this lags behind. */
  const deferredSource = useDeferredValue(source);
  const isParsing = deferredSource !== source;

  /* ── Parsing (async — shiki lazy-loads language grammars) ──── */

  useEffect(() => {
    let cancelled = false;
    const gen = ++parseGenRef.current;

    parseMarkdown(deferredSource).then((result) => {
      if (cancelled || gen !== parseGenRef.current) return;
      setHtml(result.html);
      setTocHtml(renderToc(result.toc));
      if (!readyRef.current) {
        readyRef.current = true;
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [deferredSource]);

  /* ── Persist to localStorage (skip default content) ────────── */

  useEffect(() => {
    try {
      if (source === DEFAULT_MARKDOWN) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, source);
      }
    } catch {
      /* storage full or unavailable — ignore */
    }
  }, [source]);

  const stats = useMemo(() => getStats(source), [source]);

  /* ── Actions ────────────────────────────────────────────────── */

  const copyAs = useCallback(
    async (format: "html" | "md") => {
      const text = format === "html" ? html : source;
      await navigator.clipboard.writeText(text);
      setCopied(format);
      setTimeout(() => setCopied(null), 1500);
    },
    [html, source],
  );

  const exportHtml = useCallback(() => {
    const firstLine = source.split("\n").find((l) => l.trim()) ?? "Document";
    const title = firstLine.replace(/^#+\s*/, "").trim();
    const toc = showToc ? tocHtml : undefined;
    const doc = buildHtmlDocument(html, title, true, toc);
    const blob = new Blob([doc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^\w]+/g, "-") || "document"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [html, source, showToc, tocHtml]);

  const printPreview = useCallback(() => {
    const firstLine = source.split("\n").find((l) => l.trim()) ?? "Document";
    const title = firstLine.replace(/^#+\s*/, "").trim();
    const toc = showToc ? tocHtml : undefined;
    const doc = buildHtmlDocument(html, title, true, toc, true);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(doc);
    win.document.close();
  }, [html, source, showToc, tocHtml]);

  const clear = useCallback(() => {
    setSource("");
  }, []);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") setSource(reader.result);
      };
      reader.readAsText(file);
      // Reset so the same file can be re-uploaded
      e.target.value = "";
    },
    [],
  );

  const handleMobileTabChange = useCallback((value: string[]) => {
    if (value.length > 0) setMobileTab(value[0] as "editor" | "preview");
  }, []);

  /* ── Layout ─────────────────────────────────────────────────── */

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <Toolbar.Root className="flex items-center gap-tb px-tb-x py-tb-y border-b border-border bg-bg-surface flex-wrap">
        {/* Left: source actions */}
        <Toolbar.Button
          render={(props) => (
            <Button {...props} variant="outline" onClick={() => copyAs("md")}>
              {copied === "md" ? (
                <Check size={ICON} />
              ) : (
                <ClipboardCopy size={ICON} />
              )}
              {copied === "md" ? "copied!" : "copy md"}
            </Button>
          )}
        />
        <Toolbar.Button
          render={(props) => (
            <Button
              {...props}
              variant="ghost"
              onClick={clear}
              disabled={!source}
            >
              <Eraser size={ICON} />
              clear
            </Button>
          )}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.mdx,.markdown,.txt,.text"
          onChange={handleFileUpload}
          className="hidden"
          aria-hidden
        />
        <Toolbar.Button
          render={(props) => (
            <Button
              {...props}
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={ICON} />
              <span className="hidden sm:inline">open</span>
            </Button>
          )}
        />

        {/* Right: preview actions */}
        <div className="ml-auto flex items-center gap-tb">
          <Toggle
            pressed={syncScroll}
            onPressedChange={setSyncScroll}
            className="hidden md:inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs leading-none rounded border cursor-pointer transition-colors border-border bg-bg-surface hover:bg-bg-hover text-text data-pressed:bg-accent-subtle data-pressed:border-accent data-pressed:text-accent data-pressed:ring-1 data-pressed:ring-accent/20"
            aria-label="Toggle scroll sync"
          >
            <Link size={ICON} />
            <span className="hidden lg:inline">sync scroll</span>
          </Toggle>
          <Toggle
            pressed={showToc}
            onPressedChange={setShowToc}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs leading-none rounded border cursor-pointer transition-colors border-border bg-bg-surface hover:bg-bg-hover text-text data-pressed:bg-accent-subtle data-pressed:border-accent data-pressed:text-accent data-pressed:ring-1 data-pressed:ring-accent/20"
            aria-label="Toggle table of contents"
          >
            <ListTree size={ICON} />
            <span className="hidden sm:inline">TOC</span>
          </Toggle>

          <Toolbar.Separator className="w-px h-5 bg-border-muted mx-1 hidden sm:block" />

          <Toolbar.Button
            className="hidden sm:inline-flex"
            render={(props) => (
              <Button {...props} variant="outline" onClick={exportHtml}>
                <FileDown size={ICON} />
                export
              </Button>
            )}
          />
          <Toolbar.Button
            className="hidden sm:inline-flex"
            render={(props) => (
              <Button {...props} variant="outline" onClick={printPreview}>
                <Printer size={ICON} />
                print
              </Button>
            )}
          />
          <Toolbar.Button
            render={(props) => (
              <Button
                {...props}
                variant="outline"
                onClick={() => copyAs("html")}
              >
                {copied === "html" ? (
                  <Check size={ICON} />
                ) : (
                  <FileCode size={ICON} />
                )}
                {copied === "html" ? "copied!" : "copy html"}
              </Button>
            )}
          />
        </div>
      </Toolbar.Root>

      {/* Desktop: side-by-side split panel (lazy — avoids loading Monaco on mobile) */}
      {isDesktop ? (
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center text-text-muted text-xs">
              <LoaderCircle size={16} className="animate-spin mr-2" />
              Loading editor…
            </div>
          }
        >
          <DesktopLayout
            source={source}
            setSource={setSource}
            html={html}
            tocHtml={tocHtml}
            showToc={showToc}
            ready={ready}
            isParsing={isParsing}
            stats={stats}
            syncScroll={syncScroll}
          />
        </Suspense>
      ) : (
        /* Mobile: tabbed editor / preview */
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Tab switcher */}
          <div className="flex items-center justify-between px-pn-x py-pn-lbl border-b border-border-muted bg-bg-surface">
            <ToggleGroup
              value={[mobileTab]}
              onValueChange={handleMobileTabChange}
              className="flex rounded border border-border overflow-hidden"
            >
              <Toggle
                value="editor"
                className="flex items-center gap-1.5 px-3 py-1 text-[0.625rem] uppercase tracking-widest text-text-muted cursor-pointer transition-colors data-pressed:bg-accent-subtle data-pressed:text-accent"
              >
                <Pencil size={10} />
                editor
              </Toggle>
              <Toggle
                value="preview"
                className="flex items-center gap-1.5 px-3 py-1 text-[0.625rem] uppercase tracking-widest text-text-muted cursor-pointer transition-colors data-pressed:bg-accent-subtle data-pressed:text-accent"
              >
                <Eye size={10} />
                preview
                {isParsing && (
                  <LoaderCircle size={8} className="animate-spin opacity-50" />
                )}
              </Toggle>
            </ToggleGroup>
            <span className="text-[0.5625rem] text-text-muted opacity-60">
              {stats.words}w · {stats.lines}L
            </span>
          </div>

          {/* Tab content */}
          {mobileTab === "editor" ? (
            <textarea
              value={source}
              onChange={(e) => setSource(e.target.value)}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              placeholder="Type your markdown here..."
              className="flex-1 min-h-0 resize-none bg-bg-surface text-text font-mono text-[0.8125rem] leading-[1.7] px-pn-x py-pn-y outline-none"
            />
          ) : (
            <Preview
              ref={mobilePreviewRef}
              html={html}
              tocHtml={tocHtml}
              showToc={showToc}
              ready={ready}
            />
          )}
        </div>
      )}
    </div>
  );
}
