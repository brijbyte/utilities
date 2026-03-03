import type { PipelineData, ProcessFn, PluginOperation } from "../types";
import type { PipelineStep, StepResult, PipelineResult } from "./types";

const processCache = new Map<string, ProcessFn>();

async function loadProcess(op: PluginOperation): Promise<ProcessFn> {
  let fn = processCache.get(op.id);
  if (!fn) {
    fn = (await op.load()) as ProcessFn;
    processCache.set(op.id, fn);
  }
  return fn;
}

export async function runPipeline(
  steps: PipelineStep[],
  input: PipelineData,
  operations: Map<string, PluginOperation>,
  signal?: AbortSignal,
  onStep?: (result: StepResult) => void,
): Promise<PipelineResult> {
  const stepResults: StepResult[] = [];
  let current = input;
  const t0 = performance.now();

  for (let i = 0; i < steps.length; i++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const step = steps[i];
    const op = operations.get(step.operationId);
    if (!op) throw new Error(`Unknown operation: ${step.operationId}`);

    // Validate input data against operation's input schema
    const parsed = op.input.schema.safeParse(current);
    if (!parsed.success) {
      throw new Error(
        `Type mismatch at step ${i + 1} ("${op.name}"): expected ${op.input.description}, got ${current.type}`,
      );
    }

    // Validate config against operation's config schema
    const validConfig = op.config.parse(step.config);

    const processFn = await loadProcess(op);
    const stepStart = performance.now();
    current = await processFn(current, validConfig);

    const result: StepResult = {
      index: i,
      operationId: step.operationId,
      data: current,
      durationMs: performance.now() - stepStart,
    };
    stepResults.push(result);
    onStep?.(result);
  }

  return {
    output: current,
    steps: stepResults,
    totalMs: performance.now() - t0,
  };
}
