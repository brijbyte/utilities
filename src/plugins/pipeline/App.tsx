"use no memo";
import { useState, useCallback, useRef } from "react";
import { Toolbar } from "@base-ui/react/toolbar";
import { SplitPanel } from "../../components/SplitPanel";
import { Button } from "../../components/Button";
import { useOperations, usePlugins } from "../../registry";
import { runPipeline } from "../../pipeline/runner";
import { ConfigEditor } from "../../pipeline/config-editor";
import { TextData, BinaryData } from "../../types";
import type { PipelineData, PluginOperation } from "../../types";
import type { PipelineStep, StepResult } from "../../pipeline/types";

let stepIdCounter = 0;

function defaultConfig(
  op: PluginOperation,
): Record<string, string | number | boolean> {
  try {
    return op.config.parse({}) as Record<string, string | number | boolean>;
  } catch {
    return {};
  }
}

function schemaLabel(
  ds: PluginOperation["output"] | PluginOperation["input"],
): string {
  let typeLabel: string;
  if (ds.schema === TextData) typeLabel = "text";
  else if (ds.schema === BinaryData) typeLabel = "binary";
  else typeLabel = "text | binary";
  return ds.content ? `${typeLabel} (${ds.content})` : typeLabel;
}

function isCompatible(
  prev: PluginOperation["output"],
  next: PluginOperation["input"],
): boolean {
  // If input accepts PipelineData (union), it accepts anything
  const inputDef = (next.schema as unknown as { _def: { type: string } })._def;
  if (inputDef.type === "discriminatedUnion") return true;

  // Both are object schemas — compare the literal type
  if (prev.schema === TextData && next.schema === TextData) return true;
  if (prev.schema === BinaryData && next.schema === BinaryData) return true;

  // Output is union — permissive (might or might not match at runtime)
  const outputDef = (prev.schema as unknown as { _def: { type: string } })._def;
  if (outputDef.type === "discriminatedUnion") return true;

  return false;
}

function hasConfigFields(op: PluginOperation): boolean {
  const shape = (op.config as unknown as { shape?: Record<string, unknown> })
    .shape;
  return !!shape && Object.keys(shape).length > 0;
}

export default function PipelineBuilder() {
  const operations = useOperations();
  const plugins = usePlugins();
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [stepResults, setStepResults] = useState<StepResult[]>([]);
  const [inspectIndex, setInspectIndex] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const addStep = useCallback(
    (operationId: string) => {
      const op = operations.get(operationId);
      if (!op) return;
      setSteps((prev) => [
        ...prev,
        {
          id: `step-${++stepIdCounter}`,
          operationId,
          config: defaultConfig(op),
        },
      ]);
    },
    [operations],
  );

  const removeStep = useCallback((stepId: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== stepId));
  }, []);

  const updateStepConfig = useCallback(
    (stepId: string, config: Record<string, string | number | boolean>) => {
      setSteps((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, config } : s)),
      );
    },
    [],
  );

  const moveStep = useCallback((stepId: string, direction: -1 | 1) => {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === stepId);
      if (idx < 0) return prev;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }, []);

  const run = useCallback(async () => {
    if (!input.trim() || steps.length === 0) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setRunning(true);
    setError("");
    setOutput("");
    setStepResults([]);
    setInspectIndex(null);

    const pipelineInput: PipelineData = { type: "text", data: input };

    try {
      const result = await runPipeline(
        steps,
        pipelineInput,
        operations,
        controller.signal,
        (stepResult) => {
          setStepResults((prev) => [...prev, stepResult]);
        },
      );

      if (!controller.signal.aborted) {
        setOutput(
          result.output.type === "text"
            ? (result.output.data as string)
            : `[binary: ${(result.output.data as Uint8Array).byteLength} bytes]`,
        );
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message);
      }
    } finally {
      if (!controller.signal.aborted) {
        setRunning(false);
      }
    }
  }, [input, steps, operations]);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setSteps([]);
    setInput("");
    setOutput("");
    setError("");
    setRunning(false);
    setStepResults([]);
    setInspectIndex(null);
  }, []);

  // Group operations by plugin for the "add step" menu
  const groupedOps = Array.from(
    plugins.reduce((acc, plugin) => {
      const ops = plugin.operations ?? [];
      if (ops.length > 0) acc.set(plugin.id, { name: plugin.name, ops });
      return acc;
    }, new Map<string, { name: string; ops: PluginOperation[] }>()),
  );

  // Inspect data
  const inspectedData =
    inspectIndex !== null && stepResults[inspectIndex]
      ? stepResults[inspectIndex].data
      : null;

  let outputDisplay = "";
  if (inspectedData) {
    outputDisplay =
      inspectedData.type === "text"
        ? (inspectedData.data as string)
        : `[binary: ${(inspectedData.data as Uint8Array).byteLength} bytes]`;
  } else if (output) {
    outputDisplay = output;
  }

  return (
    <div className="h-full flex flex-col">
      <Toolbar.Root className="flex items-center gap-tb px-tb-x py-tb-y border-b border-border bg-bg-surface">
        <Toolbar.Button
          render={(props) => (
            <Button
              {...props}
              variant="primary"
              onClick={run}
              disabled={running || !input.trim() || steps.length === 0}
            >
              {running ? "running..." : "▶ run"}
            </Button>
          )}
        />

        <Toolbar.Separator className="w-px h-5 bg-border-muted mx-1" />

        {output && (
          <Toolbar.Button
            render={(props) => (
              <Button
                {...props}
                variant="outline"
                onClick={() => navigator.clipboard.writeText(outputDisplay)}
              >
                copy output
              </Button>
            )}
          />
        )}

        <Toolbar.Group className="ml-auto flex items-center gap-tb">
          <Toolbar.Button
            render={(props) => (
              <Button
                {...props}
                variant="ghost"
                onClick={clear}
                disabled={!input && steps.length === 0}
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
        rightLabel={
          inspectIndex !== null ? `step ${inspectIndex + 1} output` : "pipeline"
        }
        left={
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="enter input data..."
            spellCheck={false}
            className="flex-1 resize-none px-pn-x py-pn-y text-xs bg-transparent text-text border-none outline-none font-mono leading-relaxed"
          />
        }
        right={
          <div className="flex-1 flex flex-col min-h-0 overflow-auto">
            {/* Step list */}
            <div className="flex-1 overflow-auto">
              {steps.length === 0 ? (
                <p className="text-xs text-text-muted px-pn-x py-pn-y">
                  add steps to build a pipeline...
                </p>
              ) : (
                steps.map((step, i) => {
                  const op = operations.get(step.operationId);
                  if (!op) return null;

                  const prevOp =
                    i > 0 ? operations.get(steps[i - 1].operationId) : null;
                  const compatible =
                    i === 0 || !prevOp || isCompatible(prevOp.output, op.input);

                  const stepResult = stepResults[i];

                  return (
                    <div key={step.id}>
                      {/* Data flow arrow */}
                      {i > 0 && prevOp && (
                        <button
                          type="button"
                          onClick={() =>
                            setInspectIndex(
                              inspectIndex === i - 1 ? null : i - 1,
                            )
                          }
                          className={`w-full flex items-center justify-center gap-1 px-pn-x py-1 text-[0.625rem] cursor-pointer bg-transparent border-none ${
                            !compatible
                              ? "text-danger"
                              : inspectIndex === i - 1
                                ? "text-accent"
                                : "text-text-muted"
                          } hover:text-accent`}
                        >
                          ↓ {schemaLabel(prevOp.output)}
                          {!compatible && " ⚠ type mismatch"}
                          {stepResult && (
                            <span className="text-text-muted ml-1">
                              {stepResults[i - 1]?.durationMs.toFixed(1)}ms
                            </span>
                          )}
                        </button>
                      )}

                      {/* Step card */}
                      <div className="border-b border-border">
                        <div className="flex items-center gap-2 px-pn-x py-pn-lbl bg-bg-surface">
                          <span className="text-[0.625rem] text-text-muted">
                            {i + 1}.
                          </span>
                          <span className="text-xs text-text flex-1 truncate">
                            {op.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => moveStep(step.id, -1)}
                            disabled={i === 0}
                            className="text-[0.625rem] text-text-muted hover:text-text disabled:opacity-30 cursor-pointer bg-transparent border-none p-0"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStep(step.id, 1)}
                            disabled={i === steps.length - 1}
                            className="text-[0.625rem] text-text-muted hover:text-text disabled:opacity-30 cursor-pointer bg-transparent border-none p-0"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => removeStep(step.id)}
                            className="text-[0.625rem] text-danger hover:text-danger cursor-pointer bg-transparent border-none p-0"
                          >
                            ✕
                          </button>
                        </div>
                        {hasConfigFields(op) && (
                          <div className="px-pn-x py-1 border-t border-border-muted">
                            <ConfigEditor
                              schema={op.config}
                              value={step.config}
                              onChange={(config) =>
                                updateStepConfig(step.id, config)
                              }
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Add step selector */}
              <div className="px-pn-x py-pn-lbl border-b border-border">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) addStep(e.target.value);
                  }}
                  className="border border-border bg-bg-surface text-text px-2 py-1 text-xs cursor-pointer w-full"
                >
                  <option value="">+ add step...</option>
                  {groupedOps.map(([pluginId, group]) => (
                    <optgroup key={pluginId} label={group.name}>
                      {group.ops.map((op) => (
                        <option key={op.id} value={op.id}>
                          {op.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            {/* Output display */}
            {(output || inspectedData) && (
              <div className="border-t border-border">
                <div className="px-pn-x py-pn-lbl bg-bg-surface border-b border-border-muted">
                  <span className="text-[0.625rem] uppercase tracking-widest text-text-muted">
                    {inspectIndex !== null
                      ? `step ${inspectIndex + 1} output`
                      : `output — ${stepResults.length > 0 ? `${stepResults[stepResults.length - 1].durationMs.toFixed(1)}ms` : ""}`}
                  </span>
                </div>
                <pre className="px-pn-x py-pn-y text-xs text-text font-mono whitespace-pre-wrap break-all overflow-auto max-h-48">
                  {outputDisplay}
                </pre>
              </div>
            )}
          </div>
        }
      />
    </div>
  );
}
