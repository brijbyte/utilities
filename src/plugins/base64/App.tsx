import { useState } from "react";
import { Toolbar } from "@base-ui/react/toolbar";
import { SplitPanel } from "../../components/SplitPanel";
import { Button } from "../../components/Button";
import { encode, decode } from "./process";

type Mode = "encode" | "decode";

const processFn = { encode, decode };

export default function Base64Tool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<Mode>("encode");
  const [error, setError] = useState("");

  async function convert(text: string, m: Mode) {
    setInput(text);
    setError("");
    if (!text) {
      setOutput("");
      return;
    }
    try {
      const result = await processFn[m]({ type: "text", data: text }, {});
      setOutput(result.data as string);
    } catch (e) {
      setError((e as Error).message);
      setOutput("");
    }
  }

  function switchMode(m: Mode) {
    setMode(m);
    convert(input, m);
  }

  function copyOutput() {
    navigator.clipboard.writeText(output);
  }

  function swap() {
    const newMode = mode === "encode" ? "decode" : "encode";
    setMode(newMode);
    setInput(output);
    convert(output, newMode);
  }

  function clear() {
    setInput("");
    setOutput("");
    setError("");
  }

  return (
    <div className="h-full flex flex-col">
      <Toolbar.Root className="flex items-center gap-tb px-tb-x py-tb-y border-b border-border bg-bg-surface">
        <Toolbar.Button
          render={(props) => (
            <Button
              {...props}
              variant="primary"
              active={mode === "encode"}
              onClick={() => switchMode("encode")}
            >
              encode
            </Button>
          )}
        />
        <Toolbar.Button
          render={(props) => (
            <Button
              {...props}
              variant="primary"
              active={mode === "decode"}
              onClick={() => switchMode("decode")}
            >
              decode
            </Button>
          )}
        />

        <Toolbar.Separator className="w-px h-5 bg-border-muted mx-xs" />

        <Toolbar.Button
          render={(props) => (
            <Button
              {...props}
              variant="secondary"
              onClick={swap}
              disabled={!output}
            >
              ⇄ swap
            </Button>
          )}
        />

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
        leftLabel={mode === "encode" ? "text" : "base64"}
        rightLabel={mode === "encode" ? "base64" : "text"}
        left={
          <textarea
            value={input}
            onChange={(e) => convert(e.target.value, mode)}
            placeholder={
              mode === "encode" ? "text to encode..." : "base64 to decode..."
            }
            spellCheck={false}
            className="flex-1 resize-none px-pn-x py-pn-y text-xs bg-transparent text-text border-none outline-none font-mono leading-relaxed"
          />
        }
        right={
          <textarea
            value={output}
            readOnly
            placeholder="output..."
            spellCheck={false}
            className="flex-1 resize-none px-pn-x py-pn-y text-xs bg-bg-inset text-text border-none outline-none font-mono leading-relaxed"
          />
        }
      />
    </div>
  );
}
