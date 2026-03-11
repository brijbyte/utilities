/**
 * Generic code editor component powered by modern-monaco.
 *
 * Loads monaco-editor-core lazily from CDN on first mount. Until ready,
 * shows a shiki-highlighted read-only preview (rendered by modern-monaco
 * itself via the `<monaco-editor>` web component).
 *
 * Features:
 * - Automatic theme sync with app light/dark mode (vitesse-light / vitesse-dark)
 * - Language grammars loaded on demand from CDN
 * - Controlled value via `value` / `onChange` props
 * - Configurable read-only, word wrap, minimap, line numbers, font size
 */

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import { useTheme, FONT_SIZE_PRESETS } from "../theme";

/* ── modern-monaco singleton ─────────────────────────────────── */

type Monaco = typeof import("modern-monaco/editor-core");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IStandaloneCodeEditor = any;

let monacoPromise: Promise<Monaco> | null = null;
let monacoInstance: Monaco | null = null;

async function getMonaco(): Promise<Monaco> {
  if (monacoInstance) return monacoInstance;
  if (!monacoPromise) {
    monacoPromise = (async () => {
      const isDark = document.documentElement.classList.contains("dark");
      const { init } = await import("modern-monaco");
      const monaco = await init({
        defaultTheme: isDark ? "vitesse-dark" : "vitesse-light",
        themes: ["vitesse-light", "vitesse-dark"],
      });
      monacoInstance = monaco;
      return monaco;
    })();
  }
  return monacoPromise;
}

/* ── Props ───────────────────────────────────────────────────── */

export interface CodeEditorHandle {
  /** Get current scroll fraction (0–1). */
  getScrollFraction: () => number;
  /** Set scroll position by fraction (0–1). */
  setScrollFraction: (fraction: number) => void;
  /** Focus the editor. */
  focus: () => void;
}

export interface CodeEditorProps {
  /** Current editor content (controlled). */
  value: string;
  /** Called on every content change. */
  onChange?: (value: string) => void;
  /** Monaco language id (e.g. "markdown", "json", "typescript"). */
  language?: string;
  /** Read-only mode. Default false. */
  readOnly?: boolean;
  /** Word wrap mode. Default "on". */
  wordWrap?: "on" | "off" | "wordWrapColumn" | "bounded";
  /** Show minimap. Default false. */
  minimap?: boolean;
  /** Line numbers. Default "on". */
  lineNumbers?: "on" | "off" | "relative" | "interval";
  /** Placeholder text when empty. */
  placeholder?: string;
  /** Extra CSS class on the container div. */
  className?: string;
  /** Called when the editor scrolls. */
  onScroll?: () => void;
  /** Extra Monaco editor options merged into create call. Applied once at mount. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editorOptions?: Record<string, any>;
  /** Called after the editor instance is created. Use to customize keybindings, actions, etc. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onCreated?: (editor: any, monaco: any) => void;
}

/* ── Component ───────────────────────────────────────────────── */

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  function CodeEditor(
    {
      value,
      onChange,
      language = "plaintext",
      readOnly = false,
      wordWrap = "on",
      minimap = false,
      lineNumbers = "on",
      placeholder,
      className,
      onScroll,
      editorOptions,
      onCreated,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<IStandaloneCodeEditor>(null);
    const onChangeRef = useRef(onChange);
    const onScrollRef = useRef(onScroll);
    const onCreatedRef = useRef(onCreated);
    const isUpdatingRef = useRef(false);
    const [loading, setLoading] = useState(true);
    const { resolved: currentTheme, fontSize: fontSizeId } = useTheme();
    const fontSizePx =
      FONT_SIZE_PRESETS.find((p) => p.id === fontSizeId)?.px ?? 16;

    // Keep callback refs fresh without re-running effects
    onChangeRef.current = onChange;
    onScrollRef.current = onScroll;
    onCreatedRef.current = onCreated;

    /* ── Imperative handle ────────────────────────────────────── */

    useImperativeHandle(ref, () => ({
      getScrollFraction() {
        const editor = editorRef.current;
        if (!editor) return 0;
        const scrollTop = editor.getScrollTop();
        const scrollHeight = editor.getScrollHeight();
        const clientHeight = editor.getLayoutInfo().height;
        const maxScroll = scrollHeight - clientHeight;
        return maxScroll > 0 ? scrollTop / maxScroll : 0;
      },
      setScrollFraction(fraction: number) {
        const editor = editorRef.current;
        if (!editor) return;
        const scrollHeight = editor.getScrollHeight();
        const clientHeight = editor.getLayoutInfo().height;
        const maxScroll = scrollHeight - clientHeight;
        editor.setScrollTop(fraction * maxScroll);
      },
      focus() {
        editorRef.current?.focus();
      },
    }));

    /* ── Create editor ────────────────────────────────────────── */

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      let disposed = false;

      getMonaco().then((monaco) => {
        if (disposed || !container) return;

        const editor = monaco.editor.create(container, {
          automaticLayout: true,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: fontSizePx * 0.8125,
          lineNumbers,
          minimap: { enabled: minimap },
          readOnly,
          wordWrap,
          scrollBeyondLastLine: false,
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          renderLineHighlight: "none",
          contextmenu: false,
          tabSize: 2,
          padding: { top: 8, bottom: 8 },
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
          theme: currentTheme === "dark" ? "vitesse-dark" : "vitesse-light",
          ...(placeholder && !value ? { placeholder } : {}),
          ...editorOptions,
        });

        const model = monaco.editor.createModel(value, language);
        editor.setModel(model);

        // Listen for changes
        model.onDidChangeContent(() => {
          if (isUpdatingRef.current) return;
          const newValue = model.getValue();
          onChangeRef.current?.(newValue);
        });

        // Listen for scroll
        editor.onDidScrollChange(() => {
          onScrollRef.current?.();
        });

        editorRef.current = editor;
        onCreatedRef.current?.(editor, monaco);
        setLoading(false);
      });

      return () => {
        disposed = true;
        const editor = editorRef.current;
        if (editor) {
          editor.getModel()?.dispose();
          editor.dispose();
          editorRef.current = null;
        }
      };
      // Only run on mount/unmount — all options are set via separate effects
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ── Sync value from parent → editor ──────────────────────── */

    useEffect(() => {
      const editor = editorRef.current;
      if (!editor) return;
      const model = editor.getModel();
      if (!model) return;
      if (model.getValue() !== value) {
        isUpdatingRef.current = true;
        model.setValue(value);
        isUpdatingRef.current = false;
      }
    }, [value]);

    /* ── Sync language ────────────────────────────────────────── */

    useEffect(() => {
      const editor = editorRef.current;
      if (!editor) return;
      const model = editor.getModel();
      if (model) {
        getMonaco().then((monaco) => {
          monaco.editor.setModelLanguage(model, language);
        });
      }
    }, [language]);
    /* ── Sync theme ───────────────────────────────────────────── */

    useEffect(() => {
      if (!monacoInstance) {
        // Monaco not loaded yet — will pick up the right theme on init
        return;
      }
      monacoInstance.editor.setTheme(
        currentTheme === "dark" ? "vitesse-dark" : "vitesse-light",
      );
    }, [currentTheme]);

    /* ── Sync options ─────────────────────────────────────────── */

    const updateOptions = useCallback(
      (opts: Parameters<IStandaloneCodeEditor["updateOptions"]>[0]) => {
        editorRef.current?.updateOptions(opts);
      },
      [],
    );

    useEffect(() => updateOptions({ readOnly }), [readOnly, updateOptions]);
    useEffect(() => updateOptions({ wordWrap }), [wordWrap, updateOptions]);
    useEffect(
      () =>
        updateOptions({
          fontSize: fontSizePx * 0.8125,
        }),
      [fontSizePx, updateOptions],
    );
    useEffect(
      () => updateOptions({ minimap: { enabled: minimap } }),
      [minimap, updateOptions],
    );
    useEffect(
      () => updateOptions({ lineNumbers }),
      [lineNumbers, updateOptions],
    );

    /* ── Render ───────────────────────────────────────────────── */

    return (
      <div
        ref={containerRef}
        className={`flex-1 min-h-0 relative ${className ?? ""}`}
      >
        {loading && <EditorSkeleton />}
      </div>
    );
  },
);

/* ── Loading skeleton ────────────────────────────────────────── */

function EditorSkeleton() {
  return (
    <div className="absolute inset-0 bg-bg-surface animate-pulse p-3 flex gap-3 overflow-hidden">
      {/* Gutter */}
      <div className="flex flex-col gap-1.5 pt-0.5">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="h-3 w-5 rounded bg-bg-hover"
            style={{ opacity: 1 - i * 0.04 }}
          />
        ))}
      </div>
      {/* Lines */}
      <div className="flex-1 flex flex-col gap-1.5 pt-0.5">
        {SKELETON_LINES.map((w, i) => (
          <div
            key={i}
            className="h-3 rounded bg-bg-hover"
            style={{ width: w, opacity: 1 - i * 0.04 }}
          />
        ))}
      </div>
    </div>
  );
}

const SKELETON_LINES = [
  "45%",
  "70%",
  "30%",
  "85%",
  "55%",
  "40%",
  "75%",
  "60%",
  "50%",
  "90%",
  "35%",
  "65%",
  "45%",
  "80%",
  "25%",
  "70%",
  "55%",
  "40%",
  "60%",
  "50%",
];
