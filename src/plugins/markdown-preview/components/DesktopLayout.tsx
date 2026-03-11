"use no memo";

import { useCallback, type RefObject } from "react";
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
  // Disable features that don't help with markdown
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  parameterHints: { enabled: false },
  codeLens: false,
  inlayHints: { enabled: "off" },
  hover: { enabled: false },
  // No command palette (F1), go-to-line, etc.
  lightbulb: { enabled: false },
  gotoLocation: { multiple: "goto" },
  // Disable bracket/pair features
  bracketPairColorization: { enabled: false },
  matchBrackets: "never" as const,
  autoClosingBrackets: "never" as const,
  autoClosingQuotes: "never" as const,
  autoSurround: "never" as const,
  // Simpler UI
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
  editorRef: RefObject<CodeEditorHandle | null>;
  previewRef: RefObject<HTMLDivElement | null>;
  onEditorScroll: () => void;
  onPreviewScroll: () => void;
}

const noop = () => {};

export default function DesktopLayout({
  source,
  setSource,
  html,
  tocHtml,
  showToc,
  ready,
  isParsing,
  stats,
  editorRef,
  previewRef,
  onEditorScroll,
  onPreviewScroll,
}: DesktopLayoutProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCreated = useCallback((editor: any, monaco: any) => {
    // Disable IDE-centric keybindings that aren't useful in a markdown editor
    const { KeyMod, KeyCode } = monaco;

    // F1 — command palette
    editor.addCommand(KeyCode.F1, noop);
    // Ctrl/Cmd+Shift+P — command palette
    editor.addCommand(KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyP, noop);
    // Ctrl/Cmd+G — go to line
    editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyG, noop);
    // Ctrl/Cmd+Shift+O — go to symbol
    editor.addCommand(KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyO, noop);
  }, []);

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
          onScroll={onEditorScroll}
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
          onScroll={onPreviewScroll}
        />
      }
    />
  );
}
