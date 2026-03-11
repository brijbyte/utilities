"use no memo";

import { useCallback } from "react";
import { Settings, Square, SquareCheck } from "lucide-react";
import { SplitPanel } from "../../components/SplitPanel";
import { CodeEditor } from "../../components/CodeEditor";
import { Button } from "../../components/Button";
import { Select } from "../../components/Select";
import { Popover } from "../../components/Popover";

/** Monaco options tuned for JSON editing. */
const JSON_EDITOR_OPTIONS = {
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  parameterHints: { enabled: false },
  codeLens: false,
  inlayHints: { enabled: "off" },
  hover: { enabled: false },
  lightbulb: { enabled: false },
  bracketPairColorization: { enabled: true },
  folding: true,
  glyphMargin: false,
  occurrencesHighlight: "off" as const,
  selectionHighlight: false,
  renderWhitespace: "none" as const,
  guides: { indentation: true, bracketPairs: true },
};

const INDENT_OPTIONS = [
  { value: "2", label: "2 spaces" },
  { value: "4", label: "4 spaces" },
  { value: "8", label: "8 spaces" },
];

const noopFn = () => {};

/* ── JSON validation via Monaco's built-in JSON worker ───────── */

let jsonLspReady = false;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureJsonValidation(monaco: any) {
  if (jsonLspReady) return;
  jsonLspReady = true;
  try {
    const cdnUrl =
      "https://esm.sh/modern-monaco@0.4.0/es2022/lsp/json/setup.mjs";
    const { setup } = await import(/* @vite-ignore */ cdnUrl);
    setup(monaco, "json");
  } catch {
    jsonLspReady = false;
  }
}

interface DesktopLayoutProps {
  input: string;
  setInput: (value: string) => void;
  output: string;
  indent: number;
  setIndent: (indent: number) => void;
  jsonc: boolean;
  setJsonc: (jsonc: boolean) => void;
  onFormat: () => void;
  onMinify: () => void;
  onCopyInput: () => void;
  onCopyOutput: () => void;
  onClear: () => void;
}

export default function DesktopLayout({
  input,
  setInput,
  output,
  indent,
  setIndent,
  jsonc,
  setJsonc,
  onFormat,
  onMinify,
  onCopyInput,
  onCopyOutput,
  onClear,
}: DesktopLayoutProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCreated = useCallback((editor: any, monaco: any) => {
    const { KeyMod, KeyCode } = monaco;
    editor.addCommand(KeyCode.F1, noopFn);
    editor.addCommand(KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyP, noopFn);
    ensureJsonValidation(monaco);
  }, []);

  return (
    <SplitPanel
      leftLabel={
        <span className="flex items-center gap-tb w-full h-6">
          input
          <span className="ml-auto flex items-center gap-tb font-normal normal-case tracking-normal">
            <Button variant="primary" onClick={onFormat}>
              format
            </Button>
            <Button variant="secondary" onClick={onMinify}>
              minify
            </Button>
            <Popover.Root>
              <Popover.Trigger className="inline-flex items-center justify-center gap-1 px-2 py-1 text-xs border border-border bg-bg-surface text-text-muted rounded cursor-pointer hover:bg-bg-hover hover:text-text transition-colors">
                <Settings size={12} />
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner align="start">
                  <Popover.Popup className="w-48">
                    <Popover.Arrow />
                    <div className="p-3 flex flex-col gap-3">
                      <label className="flex items-center justify-between text-xs text-text">
                        Indent
                        <Select
                          value={String(indent)}
                          onValueChange={(v) => setIndent(Number(v))}
                          options={INDENT_OPTIONS}
                          align="end"
                          popupMinWidth="min-w-24"
                        />
                      </label>
                      <button
                        onClick={() => setJsonc(!jsonc)}
                        className="flex items-center gap-2 text-xs text-text cursor-pointer hover:text-accent transition-colors"
                      >
                        {jsonc ? (
                          <SquareCheck size={14} className="text-accent" />
                        ) : (
                          <Square size={14} />
                        )}
                        JSONC (comments, trailing commas)
                      </button>
                    </div>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
            {input && (
              <Button variant="outline" onClick={onCopyInput}>
                copy
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={onClear}
              disabled={!input && !output}
            >
              clear
            </Button>
          </span>
        </span>
      }
      rightLabel={
        <span className="flex items-center gap-tb w-full h-6">
          output
          {output && (
            <span className="ml-auto font-normal normal-case tracking-normal">
              <Button variant="outline" onClick={onCopyOutput}>
                copy
              </Button>
            </span>
          )}
        </span>
      }
      left={
        <CodeEditor
          value={input}
          onChange={setInput}
          language={jsonc ? "jsonc" : "json"}
          placeholder="paste json here..."
          editorOptions={{
            ...JSON_EDITOR_OPTIONS,
            tabSize: indent,
          }}
          onCreated={handleCreated}
        />
      }
      right={
        <CodeEditor
          value={output}
          language="json"
          readOnly
          placeholder="formatted output will appear here..."
          lineNumbers="on"
          editorOptions={{
            ...JSON_EDITOR_OPTIONS,
            tabSize: indent,
            domReadOnly: true,
          }}
        />
      }
    />
  );
}
