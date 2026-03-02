import { useState } from "react";
import { Button } from "../../components/Button";

export default function JsonFormatter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [indent, setIndent] = useState(2);

  function format() {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, indent));
      setError("");
    } catch (e) {
      setError((e as Error).message);
      setOutput("");
    }
  }

  function minify() {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
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
      {/* toolbar */}
      <div className="flex items-center gap-tb px-tb-x py-tb-y border-b border-border bg-bg-surface">
        <Button variant="primary" onClick={format}>
          format
        </Button>
        <Button variant="secondary" onClick={minify}>
          minify
        </Button>
        <label className="flex items-center gap-sm text-xs text-text-muted ml-xs">
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

        <div className="ml-auto flex items-center gap-tb">
          {output && (
            <Button variant="outline" onClick={copyOutput}>
              copy
            </Button>
          )}
          <Button variant="ghost" onClick={clear} disabled={!input && !output}>
            clear
          </Button>
        </div>
      </div>

      {/* error bar */}
      {error && (
        <div className="px-tb-x py-tb-y text-xs bg-danger/5 border-b border-danger/20 text-danger">
          ✕ {error}
        </div>
      )}

      {/* editor panels */}
      <div className="flex-1 grid grid-cols-2 gap-px bg-border-muted min-h-0">
        <div className="flex flex-col bg-bg-surface min-h-0">
          <div className="px-pn-x py-pn-lbl border-b border-border-muted">
            <span className="text-[10px] uppercase tracking-widest text-text-muted">input</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="paste json here..."
            spellCheck={false}
            className="flex-1 resize-none px-pn-x py-pn-y text-xs bg-transparent text-text border-none outline-none font-mono leading-relaxed"
          />
        </div>
        <div className="flex flex-col bg-bg-surface min-h-0">
          <div className="px-pn-x py-pn-lbl border-b border-border-muted">
            <span className="text-[10px] uppercase tracking-widest text-text-muted">output</span>
          </div>
          <textarea
            value={output}
            readOnly
            placeholder="formatted output will appear here..."
            spellCheck={false}
            className="flex-1 resize-none px-pn-x py-pn-y text-xs bg-bg-inset text-text border-none outline-none font-mono leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}
