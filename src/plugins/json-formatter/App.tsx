import { useState } from "react";
import { Toolbar } from "@base-ui/react/toolbar";
import { SplitPanel } from "../../components/SplitPanel";
import { Button } from "../../components/Button";
import { format as formatJson, minify as minifyJson } from "./process";

export default function JsonFormatter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [indent, setIndent] = useState(2);

  async function format() {
    try {
      const result = await formatJson(
        { type: "text", data: input },
        { indent: String(indent) },
      );
      setOutput(result.data as string);
      setError("");
    } catch (e) {
      setError((e as Error).message);
      setOutput("");
    }
  }

  async function minify() {
    try {
      const result = await minifyJson({ type: "text", data: input }, {});
      setOutput(result.data as string);
      setError("");
    } catch (e) {
      setError((e as Error).message);
      setOutput("");
    }
  }

  function clear() {
    setInput("");
    setOutput("");
    setError("");
  }

  function copyOutput() {
    navigator.clipboard.writeText(output);
  }

  return (
    <div className="h-full flex flex-col">
      <Toolbar.Root className="flex items-center gap-tb px-tb-x py-tb-y border-b border-border bg-bg-surface">
        <Toolbar.Button
          render={(props) => (
            <Button {...props} variant="primary" onClick={format}>
              format
            </Button>
          )}
        />
        <Toolbar.Button
          render={(props) => (
            <Button {...props} variant="secondary" onClick={minify}>
              minify
            </Button>
          )}
        />
        <Toolbar.Separator className="w-px h-5 bg-border-muted mx-xs" />
        <label className="flex items-center gap-sm text-xs text-text-muted">
          indent
          <select
            value={indent}
            onChange={(e) => setIndent(Number(e.target.value))}
            className="border border-border bg-bg-surface text-text px-sm py-xs text-xs cursor-pointer"
          >
            <option value={2}>2</option>
            <option value={4}>4</option>
            <option value={8}>8</option>
          </select>
        </label>

        <Toolbar.Group className="ml-auto flex items-center gap-tb">
          {output && (
            <Toolbar.Button
              render={(props) => (
                <Button {...props} variant="outline" onClick={copyOutput}>
                  copy
                </Button>
              )}
            />
          )}
          <Toolbar.Button
            render={(props) => (
              <Button
                {...props}
                variant="ghost"
                onClick={clear}
                disabled={!input && !output}
              >
                clear
              </Button>
            )}
          />
        </Toolbar.Group>
      </Toolbar.Root>

      {error && (
        <div className="px-tb-x py-tb-y text-xs bg-danger/5 border-b border-danger/20 text-danger">
          ✕ {error}
        </div>
      )}

      <SplitPanel
        leftLabel="input"
        rightLabel="output"
        left={
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="paste json here..."
            spellCheck={false}
            className="flex-1 resize-none px-pn-x py-pn-y text-xs bg-transparent text-text border-none outline-none font-mono leading-relaxed"
          />
        }
        right={
          <textarea
            value={output}
            readOnly
            placeholder="formatted output will appear here..."
            spellCheck={false}
            className="flex-1 resize-none px-pn-x py-pn-y text-xs bg-bg-inset text-text border-none outline-none font-mono leading-relaxed"
          />
        }
      />
    </div>
  );
}
