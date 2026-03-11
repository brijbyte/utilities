"use no memo";

import { useCallback } from "react";
import { SplitPanel } from "../../components/SplitPanel";
import { CodeEditor } from "../../components/CodeEditor";

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

const noopFn = () => {};

interface DesktopLayoutProps {
  input: string;
  setInput: (value: string) => void;
  output: string;
  indent: number;
}

export default function DesktopLayout({
  input,
  setInput,
  output,
  indent,
}: DesktopLayoutProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCreated = useCallback((editor: any, monaco: any) => {
    const { KeyMod, KeyCode } = monaco;
    editor.addCommand(KeyCode.F1, noopFn);
    editor.addCommand(KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyP, noopFn);
  }, []);

  return (
    <SplitPanel
      leftLabel="input"
      rightLabel="output"
      left={
        <CodeEditor
          value={input}
          onChange={setInput}
          language="json"
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
