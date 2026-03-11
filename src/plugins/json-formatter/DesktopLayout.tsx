"use no memo";

import { useCallback } from "react";
import { Square, SquareCheck } from "lucide-react";
import { SplitPanel } from "../../components/SplitPanel";
import { CodeEditor } from "../../components/CodeEditor";
import { Button } from "../../components/Button";
import { Select } from "../../components/Select";

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
            <Select
              value={String(indent)}
              onValueChange={(v) => setIndent(Number(v))}
              options={INDENT_OPTIONS}
              align="start"
              popupMinWidth="min-w-24"
            />
            <Button
              variant="outline"
              active={jsonc}
              onClick={() => setJsonc(!jsonc)}
            >
              {jsonc ? <SquareCheck size={12} /> : <Square size={12} />}
              JSONC
            </Button>
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
