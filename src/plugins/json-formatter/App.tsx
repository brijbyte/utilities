"use no memo";

import {
  useState,
  useCallback,
  lazy,
  Suspense,
  useSyncExternalStore,
} from "react";
import { Toolbar } from "@base-ui/react/toolbar";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Button } from "../../components/Button";
import { Pencil, Eye, LoaderCircle } from "lucide-react";
import { format as formatJson, minify as minifyJson } from "./process";

const DesktopLayout = lazy(() => import("./DesktopLayout"));

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

export default function JsonFormatter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [indent, setIndent] = useState(2);
  const [mobileTab, setMobileTab] = useState<"editor" | "output">("editor");

  const isDesktop = useIsDesktop();

  const format = useCallback(async () => {
    try {
      const result = await formatJson(
        { type: "text", data: input },
        { indent: String(indent) },
      );
      setOutput(result.data as string);
      setError("");
      if (!isDesktop) setMobileTab("output");
    } catch (e) {
      setError((e as Error).message);
      setOutput("");
    }
  }, [input, indent, isDesktop]);

  const minify = useCallback(async () => {
    try {
      const result = await minifyJson({ type: "text", data: input }, {});
      setOutput(result.data as string);
      setError("");
      if (!isDesktop) setMobileTab("output");
    } catch (e) {
      setError((e as Error).message);
      setOutput("");
    }
  }, [input, isDesktop]);

  const clear = useCallback(() => {
    setInput("");
    setOutput("");
    setError("");
  }, []);

  const copyOutput = useCallback(() => {
    navigator.clipboard.writeText(output);
  }, [output]);

  const handleMobileTabChange = useCallback((value: string[]) => {
    if (value.length > 0) setMobileTab(value[0] as "editor" | "output");
  }, []);

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
        <Toolbar.Separator className="w-px h-5 bg-border-muted mx-1" />
        <label className="flex items-center gap-2 text-xs text-text-muted">
          indent
          <select
            value={indent}
            onChange={(e) => setIndent(Number(e.target.value))}
            className="border border-border bg-bg-surface text-text px-2 py-1 text-xs cursor-pointer"
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
            input={input}
            setInput={setInput}
            output={output}
            indent={indent}
          />
        </Suspense>
      ) : (
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
                input
              </Toggle>
              <Toggle
                value="output"
                className="flex items-center gap-1.5 px-3 py-1 text-[0.625rem] uppercase tracking-widest text-text-muted cursor-pointer transition-colors data-pressed:bg-accent-subtle data-pressed:text-accent"
              >
                <Eye size={10} />
                output
              </Toggle>
            </ToggleGroup>
          </div>

          {/* Tab content */}
          {mobileTab === "editor" ? (
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="paste json here..."
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className="flex-1 min-h-0 resize-none bg-bg-surface text-text font-mono text-[0.8125rem] leading-[1.7] px-pn-x py-pn-y outline-none"
            />
          ) : (
            <textarea
              value={output}
              readOnly
              placeholder="formatted output will appear here..."
              spellCheck={false}
              className="flex-1 min-h-0 resize-none bg-bg-inset text-text font-mono text-[0.8125rem] leading-[1.7] px-pn-x py-pn-y outline-none"
            />
          )}
        </div>
      )}
    </div>
  );
}
