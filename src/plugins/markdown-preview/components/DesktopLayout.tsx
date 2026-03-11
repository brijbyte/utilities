"use no memo";

import { useCallback, useEffect, useRef } from "react";
import { LoaderCircle } from "lucide-react";
import { SplitPanel } from "../../../components/SplitPanel";
import {
  CodeEditor,
  type CodeEditorHandle,
} from "../../../components/CodeEditor";
import Preview from "./Preview";
import type { DocStats } from "../utils/markdown";

/** Monaco options tuned for a markdown editing experience. */
const MD_EDITOR_OPTIONS = {
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  parameterHints: { enabled: false },
  codeLens: false,
  inlayHints: { enabled: "off" },
  hover: { enabled: false },
  lightbulb: { enabled: false },
  gotoLocation: { multiple: "goto" },
  bracketPairColorization: { enabled: false },
  matchBrackets: "never" as const,
  autoClosingBrackets: "never" as const,
  autoClosingQuotes: "never" as const,
  autoSurround: "never" as const,
  folding: false,
  glyphMargin: false,
  occurrencesHighlight: "off" as const,
  selectionHighlight: false,
  renderWhitespace: "none" as const,
  guides: { indentation: false, bracketPairs: false },
};

interface DesktopLayoutProps {
  source: string;
  setSource: (value: string) => void;
  html: string;
  tocHtml: string;
  showToc: boolean;
  ready: boolean;
  isParsing: boolean;
  stats: DocStats;
  syncScroll: boolean;
}

const noopFn = () => {};

export default function DesktopLayout({
  source,
  setSource,
  html,
  tocHtml,
  showToc,
  ready,
  isParsing,
  stats,
  syncScroll,
}: DesktopLayoutProps) {
  const editorRef = useRef<CodeEditorHandle>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(ready);
  useEffect(() => {
    readyRef.current = ready;
  }, [ready]);

  /* ── Sync scroll state (ref for stable callbacks) ──────────── */

  const syncScrollRef = useRef(syncScroll);
  useEffect(() => {
    syncScrollRef.current = syncScroll;
  }, [syncScroll]);

  /* ── Re-entrancy guard ─────────────────────────────────────── */

  /** "editor" = editor scroll in progress, "cursor" = cursor-driven preview scroll,
   *  "preview" = user scrolling the preview pane. */
  const scrollLockRef = useRef<"editor" | "cursor" | "preview" | null>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const releaseScrollLock = useCallback(() => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      scrollLockRef.current = null;
    }, 150);
  }, []);

  /* ── Find preview element by source line ───────────────────── */

  const findPreviewElement = useCallback((line: number): Element | null => {
    const container = previewRef.current;
    if (!container) return null;
    const els = container.querySelectorAll("[data-source-line]");
    let best: Element | null = null;
    for (const el of els) {
      const elLine = parseInt(el.getAttribute("data-source-line")!, 10);
      if (elLine <= line) best = el;
      else break;
    }
    return best;
  }, []);

  /* ── Active line highlight ─────────────────────────────────── */

  const activeLineElRef = useRef<Element | null>(null);

  const highlightCurrentLine = useCallback((el: Element | null) => {
    if (activeLineElRef.current === el) return;
    activeLineElRef.current?.classList.remove("md-active-line");
    activeLineElRef.current = el;
    el?.classList.add("md-active-line");
  }, []);

  /* ── Selection highlight (CSS Custom Highlight API) ────────── */

  const highlightSelection = useCallback((text: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const highlights = (CSS as any).highlights;
    if (!highlights) return;
    highlights.delete("md-selection");
    if (!text || text.length < 2) return;

    const container = previewRef.current;
    if (!container) return;

    const ranges: Range[] = [];
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
    );
    const needle = text.toLowerCase();
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      const haystack = node.textContent?.toLowerCase() ?? "";
      let idx = 0;
      while ((idx = haystack.indexOf(needle, idx)) !== -1) {
        const range = new Range();
        range.setStart(node, idx);
        range.setEnd(node, idx + text.length);
        ranges.push(range);
        idx += text.length;
      }
    }
    if (ranges.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      highlights.set("md-selection", new (window as any).Highlight(...ranges));
    }
  }, []);

  /* ── Scroll preview to a source line ───────────────────────── */

  const scrollPreviewToLine = useCallback(
    (line: number) => {
      const el = findPreviewElement(line);
      const tgt = previewRef.current;

      if (el && tgt) {
        const containerRect = tgt.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const offset = elRect.top - containerRect.top + tgt.scrollTop;
        tgt.scrollTop = Math.max(0, offset - containerRect.height * 0.25);
      } else if (tgt) {
        const fraction = editorRef.current?.getScrollFraction() ?? 0;
        tgt.scrollTop = fraction * (tgt.scrollHeight - tgt.clientHeight);
      }
    },
    [findPreviewElement],
  );

  /* ── Editor scroll → preview (top visible line) ────────────── */

  const handleEditorScroll = useCallback(() => {
    if (!readyRef.current || !syncScrollRef.current) return;
    if (scrollLockRef.current === "preview") return;
    scrollLockRef.current = "editor";

    const topLine = editorRef.current?.getTopVisibleLine() ?? 1;
    scrollPreviewToLine(topLine);
    releaseScrollLock();
  }, [scrollPreviewToLine, releaseScrollLock]);

  /* ── Cursor change → line highlight + scroll + selection (throttled) */

  const cursorThrottleRef = useRef<ReturnType<typeof setTimeout>>(null);

  const handleCursorChange = useCallback(() => {
    if (cursorThrottleRef.current) return;
    cursorThrottleRef.current = setTimeout(() => {
      cursorThrottleRef.current = null;
      if (!readyRef.current || !syncScrollRef.current) return;

      const line = editorRef.current?.getCursorLine() ?? 1;
      const el = findPreviewElement(line);
      highlightCurrentLine(el);

      // Lock as "cursor" so preview scroll doesn't bounce back to editor
      scrollLockRef.current = "cursor";
      scrollPreviewToLine(line);
      releaseScrollLock();

      const selectedText = editorRef.current?.getSelectedText() ?? "";
      highlightSelection(selectedText);
    }, 150);
  }, [
    findPreviewElement,
    highlightCurrentLine,
    scrollPreviewToLine,
    highlightSelection,
    releaseScrollLock,
  ]);

  /* ── Preview scroll → editor (proportional) ────────────────── */

  const handlePreviewScroll = useCallback(() => {
    if (!readyRef.current || !syncScrollRef.current) return;
    if (
      scrollLockRef.current === "editor" ||
      scrollLockRef.current === "cursor"
    )
      return;
    scrollLockRef.current = "preview";

    const src = previewRef.current;
    if (src) {
      const srcMax = src.scrollHeight - src.clientHeight;
      const fraction = srcMax > 0 ? src.scrollTop / srcMax : 0;
      editorRef.current?.setScrollFraction(fraction);
    }
    releaseScrollLock();
  }, [releaseScrollLock]);

  /* ── Clear highlights when sync toggled off ────────────────── */

  useEffect(() => {
    if (!syncScroll) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (CSS as any).highlights?.delete("md-selection");
      highlightCurrentLine(null);
    }
  }, [syncScroll, highlightCurrentLine]);

  /* ── Disable keybindings on editor creation ────────────────── */

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCreated = useCallback((editor: any, monaco: any) => {
    const { KeyMod, KeyCode } = monaco;
    editor.addCommand(KeyCode.F1, noopFn);
    editor.addCommand(KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyP, noopFn);
    editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyG, noopFn);
    editor.addCommand(KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyO, noopFn);
  }, []);

  /* ── Render ────────────────────────────────────────────────── */

  return (
    <SplitPanel
      leftLabel={
        <>
          markdown
          <span className="ml-3 font-normal normal-case tracking-normal opacity-60">
            {stats.words} words · {stats.lines} lines · {stats.readingTime}
          </span>
        </>
      }
      rightLabel={
        <>
          preview
          {isParsing && (
            <LoaderCircle
              size={10}
              className="ml-2 inline-block animate-spin opacity-50 align-middle"
            />
          )}
        </>
      }
      left={
        <CodeEditor
          ref={editorRef}
          value={source}
          onChange={setSource}
          language="markdown"
          onScroll={handleEditorScroll}
          onCursorChange={handleCursorChange}
          editorOptions={MD_EDITOR_OPTIONS}
          onCreated={handleCreated}
        />
      }
      right={
        <Preview
          ref={previewRef}
          html={html}
          tocHtml={tocHtml}
          showToc={showToc}
          ready={ready}
          onScroll={handlePreviewScroll}
        />
      }
    />
  );
}
