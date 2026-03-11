"use no memo";

import {
  useState,
  useCallback,
  lazy,
  Suspense,
  useSyncExternalStore,
} from "react";
import { Tabs } from "@base-ui/react/tabs";
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
  const [mobileTab, setMobileTab] = useState<string | null>("input");

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

  const copyInput = useCallback(() => {
    navigator.clipboard.writeText(input);
  }, [input]);

  const copyOutput = useCallback(() => {
    navigator.clipboard.writeText(output);
  }, [output]);

  /* ── Desktop ────────────────────────────────────────────────── */

  if (isDesktop) {
    return (
      <div className="h-full flex flex-col">
        {error && (
          <div className="px-tb-x py-tb-y text-xs bg-danger/5 border-b border-danger/20 text-danger">
            ✕ {error}
          </div>
        )}

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
            setIndent={setIndent}
            onFormat={format}
            onMinify={minify}
            onCopyInput={copyInput}
            onCopyOutput={copyOutput}
            onClear={clear}
          />
        </Suspense>
      </div>
    );
  }

  /* ── Mobile ─────────────────────────────────────────────────── */

  return (
    <Tabs.Root
      value={mobileTab}
      onValueChange={setMobileTab}
      className="h-full flex flex-col"
    >
      {/* Tab bar */}
      <Tabs.List className="flex bg-bg border-b border-border">
        <Tabs.Tab
          value="input"
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs text-text-muted cursor-pointer transition-colors border-b border-border -mb-px data-active:bg-bg-surface data-active:text-accent data-active:border-b-transparent data-active:border-t data-active:border-x data-active:border-border data-active:first:border-l-transparent"
        >
          <Pencil size={12} />
          Input
        </Tabs.Tab>
        <Tabs.Tab
          value="output"
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs text-text-muted cursor-pointer transition-colors border-b border-border -mb-px data-active:bg-bg-surface data-active:text-accent data-active:border-b-transparent data-active:border-t data-active:border-x data-active:border-border data-active:last:border-r-transparent"
        >
          <Eye size={12} />
          Output
        </Tabs.Tab>
      </Tabs.List>

      {error && (
        <div className="px-tb-x py-tb-y text-xs bg-danger/5 border-b border-danger/20 text-danger">
          ✕ {error}
        </div>
      )}

      {/* Input panel */}
      <Tabs.Panel value="input" className="flex-1 min-h-0 flex flex-col">
        <div className="flex items-center gap-tb px-tb-x py-tb-y border-b border-border bg-bg-surface">
          <Button variant="primary" onClick={format}>
            format
          </Button>
          <Button variant="secondary" onClick={minify}>
            minify
          </Button>
          <select
            value={indent}
            onChange={(e) => setIndent(Number(e.target.value))}
            className="border border-border bg-bg-surface text-text px-2 py-1 text-xs cursor-pointer"
          >
            <option value={2}>2 sp</option>
            <option value={4}>4 sp</option>
            <option value={8}>8 sp</option>
          </select>
          <div className="ml-auto flex items-center gap-tb">
            {input && (
              <Button variant="outline" onClick={copyInput}>
                copy
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={clear}
              disabled={!input && !output}
            >
              clear
            </Button>
          </div>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="paste json here..."
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className="flex-1 min-h-0 resize-none bg-bg-surface text-text font-mono text-[0.8125rem] leading-[1.7] px-pn-x py-pn-y outline-none"
        />
      </Tabs.Panel>

      {/* Output panel */}
      <Tabs.Panel value="output" className="flex-1 min-h-0 flex flex-col">
        {output && (
          <div className="flex items-center gap-tb px-tb-x py-tb-y border-b border-border bg-bg-surface">
            <div className="ml-auto">
              <Button variant="outline" onClick={copyOutput}>
                copy
              </Button>
            </div>
          </div>
        )}
        <textarea
          value={output}
          readOnly
          placeholder="formatted output will appear here..."
          spellCheck={false}
          className="flex-1 min-h-0 resize-none bg-bg-inset text-text font-mono text-[0.8125rem] leading-[1.7] px-pn-x py-pn-y outline-none"
        />
      </Tabs.Panel>
    </Tabs.Root>
  );
}
