# Pipeline Architecture

## Overview

Each plugin has two faces:

1. **Interactive UI** — the existing mini-app (unchanged)
2. **Operations** — one or more pure functions (`input → output`) that chain into pipelines

A plugin doesn't have to expose operations, and operations don't need a corresponding interactive UI.

## Dependency

```
pnpm add zod
```

---

## Data Model

```
┌─────────────────────────────────────────────────────────┐
│ Pipeline                                                │
│                                                         │
│  ┌───────────┐    ┌────────────┐    ┌──────────────┐   │
│  │  Step 1    │──▶│  Step 2     │──▶│  Step 3       │  │
│  │ json.fmt   │   │ hash.sha256 │   │ base64.encode │  │
│  │ indent: 2  │   │             │   │               │  │
│  └───────────┘    └────────────┘    └──────────────┘   │
│                                                         │
│  input: text ─────────────────────────▶ output: text    │
└─────────────────────────────────────────────────────────┘
```

---

## Type System

### Pipeline Data — what flows between steps

```ts
import { z } from "zod";

const TextData = z.object({
  type: z.literal("text"),
  data: z.string(),
});

const BinaryData = z.object({
  type: z.literal("binary"),
  data: z.instanceof(Uint8Array),
});

const PipelineData = z.discriminatedUnion("type", [TextData, BinaryData]);
type PipelineData = z.infer<typeof PipelineData>;
```

### Content Hints

Content hints are soft metadata that help the pipeline builder suggest compatible connections. They are NOT enforced at runtime — any `text` can flow to any `text`-accepting step. The builder uses them for warnings and documentation.

```ts
type ContentHint = "json" | "hex" | "base64" | "plain" | "bytes";
```

### Data Schema — describes an operation's input or output

```ts
interface DataSchema {
  schema: typeof TextData | typeof BinaryData | typeof PipelineData;
  content?: ContentHint;
  description: string;
}
```

`schema` determines hard type compatibility. `content` and `description` are for the builder UI.

- `typeof TextData` — only accepts/produces text
- `typeof BinaryData` — only accepts/produces binary
- `typeof PipelineData` — accepts/produces either (e.g. hash can take both)

### Config Schema — operation-specific configuration

Config uses Zod directly. The pipeline builder introspects the Zod schema to render config editors generically:

| Zod type                 | UI control            |
| ------------------------ | --------------------- |
| `z.enum(["a", "b"])`     | select dropdown       |
| `z.number().min().max()` | number input          |
| `z.boolean()`            | checkbox              |
| `z.string()`             | text input            |
| `z.literal(x)`           | hidden / non-editable |

Every field uses `.describe("label text")` for the form label. Defaults come from `.default()`.

```ts
// Example: JSON format config
const JsonFormatConfig = z.object({
  indent: z.enum(["2", "4", "8"]).default("2").describe("indent size"),
});

// Example: no config needed
const NoConfig = z.object({});
```

---

## Operation Interface

```ts
type ProcessFn<TConfig = Record<string, unknown>> = (
  input: PipelineData,
  config: TConfig,
) => Promise<PipelineData>;

interface PluginOperation<TConfig extends z.ZodTypeAny = z.ZodTypeAny> {
  // Identity
  id: string; // "json.format", "hash.sha256"
  name: string; // "Format JSON", "SHA-256"
  pluginId: string; // "json-formatter" — groups in builder UI

  // Schemas (static, always available)
  input: DataSchema;
  output: DataSchema;
  config: TConfig; // Zod schema — validation, defaults, UI rendering

  // Implementation (lazy-loaded, only when pipeline runs)
  load: () => Promise<ProcessFn<z.infer<TConfig>>>;
}
```

Operations are defined eagerly (descriptors + schemas), but the `process` function is lazy-loaded via `load()`. This mirrors how plugins lazy-load their UI component.

---

## Plugin Interface (Extended)

```ts
interface Plugin {
  id: string;
  name: string;
  icon: ReactNode;
  meta: PluginMeta;
  load: () => Promise<{ default: ComponentType }>;
  skeleton?: () => ReactNode;
  operations?: PluginOperation[]; // NEW — descriptors eager, process lazy
}
```

---

## Plugin Operation Mapping

### JSON Formatter → 2 operations

```ts
// src/plugins/json-formatter/operations.ts

const FormatConfig = z.object({
  indent: z.enum(["2", "4", "8"]).default("2").describe("indent"),
});

export const operations: PluginOperation[] = [
  {
    id: "json.format",
    name: "Format JSON",
    pluginId: "json-formatter",
    input: { schema: TextData, content: "json", description: "JSON string" },
    output: {
      schema: TextData,
      content: "json",
      description: "formatted JSON string",
    },
    config: FormatConfig,
    load: () => import("./process").then((m) => m.format),
  },
  {
    id: "json.minify",
    name: "Minify JSON",
    pluginId: "json-formatter",
    input: { schema: TextData, content: "json", description: "JSON string" },
    output: {
      schema: TextData,
      content: "json",
      description: "minified JSON string",
    },
    config: z.object({}),
    load: () => import("./process").then((m) => m.minify),
  },
];
```

```ts
// src/plugins/json-formatter/process.ts

export const format: ProcessFn = async (input, config) => {
  const parsed = JSON.parse(input.data as string);
  return {
    type: "text",
    data: JSON.stringify(parsed, null, Number(config.indent)),
  };
};

export const minify: ProcessFn = async (input) => {
  const parsed = JSON.parse(input.data as string);
  return { type: "text", data: JSON.stringify(parsed) };
};
```

### Base64 → 2 operations

```ts
// src/plugins/base64/operations.ts

export const operations: PluginOperation[] = [
  {
    id: "base64.encode",
    name: "Base64 Encode",
    pluginId: "base64",
    input: {
      schema: TextData,
      content: "plain",
      description: "text to encode",
    },
    output: {
      schema: TextData,
      content: "base64",
      description: "base64-encoded string",
    },
    config: z.object({}),
    load: () => import("./process").then((m) => m.encode),
  },
  {
    id: "base64.decode",
    name: "Base64 Decode",
    pluginId: "base64",
    input: {
      schema: TextData,
      content: "base64",
      description: "base64 string",
    },
    output: { schema: TextData, content: "plain", description: "decoded text" },
    config: z.object({}),
    load: () => import("./process").then((m) => m.decode),
  },
];
```

### Hash Generator → 4 operations (generated from ALGORITHMS)

```ts
// src/plugins/hash-generator/operations.ts

export const operations: PluginOperation[] = ALGORITHMS.map((algo) => ({
  id: `hash.${algo.toLowerCase().replace("-", "")}`,
  name: algo,
  pluginId: "hash-generator",
  input: {
    schema: PipelineData,
    content: "plain",
    description: "text or binary data to hash",
  },
  output: {
    schema: TextData,
    content: "hex",
    description: `${algo} hex digest`,
  },
  config: z.object({}),
  load: () => import("./process").then((m) => m.hashFn(algo)),
}));
```

```ts
// src/plugins/hash-generator/process.ts

function hexFromBuffer(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hashFn(algo: string): ProcessFn {
  return async (input) => {
    const data =
      input.type === "text"
        ? new TextEncoder().encode(input.data as string)
        : (input.data as Uint8Array);
    const hash = await crypto.subtle.digest(algo, data);
    return { type: "text", data: hexFromBuffer(hash) };
  };
}
```

---

## Registry (Extended)

```ts
interface RegistryContextValue {
  plugins: Plugin[];
  operations: Map<string, PluginOperation>;
}

// Built once from plugins array in RegistryProvider:
const operations = useMemo(() => {
  const map = new Map<string, PluginOperation>();
  for (const plugin of plugins) {
    for (const op of plugin.operations ?? []) {
      map.set(op.id, op);
    }
  }
  return map;
}, [plugins]);
```

New hooks:

- `useOperations()` — returns the full `Map<string, PluginOperation>`
- `useOperation(id)` — returns a single operation by ID

---

## Pipeline Types

```ts
// src/pipeline/types.ts

interface PipelineStep {
  id: string; // unique within pipeline (for reorder/delete)
  operationId: string; // "hash.sha256"
  config: Record<string, string | number | boolean>; // resolved config values
}

interface Pipeline {
  id: string;
  name: string;
  steps: PipelineStep[];
}
```

---

## Pipeline Runner

```ts
// src/pipeline/runner.ts

// Cache loaded process functions for the session
const processCache = new Map<string, ProcessFn>();

async function loadProcess(op: PluginOperation): Promise<ProcessFn> {
  let fn = processCache.get(op.id);
  if (!fn) {
    fn = await op.load();
    processCache.set(op.id, fn);
  }
  return fn;
}

interface StepResult {
  index: number;
  operationId: string;
  data: PipelineData;
  durationMs: number;
}

interface PipelineResult {
  output: PipelineData;
  steps: StepResult[];
  totalMs: number;
}

async function runPipeline(
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

    // Validate input type against operation's input schema
    const parsed = op.input.schema.safeParse(current);
    if (!parsed.success) {
      throw new Error(
        `Type mismatch at step ${i + 1} ("${op.name}"): ${parsed.error.message}`,
      );
    }

    const processFn = await loadProcess(op);
    const stepStart = performance.now();

    // Validate config against operation's config schema
    const validConfig = op.config.parse(step.config);
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
```

Key points:

- **Zod validates both data and config at each step** — catches type mismatches and invalid config at runtime
- **`processCache`** — avoids re-importing the same operation module on repeated runs
- **`onStep` callback** — lets the builder UI show intermediate results as they complete
- **`signal`** — abort support for long-running pipelines
- **`StepResult.durationMs`** — useful for profiling which step is slow

---

## Pipeline Builder — Config Editor from Zod

The builder introspects a Zod schema's `.shape` to render form controls without any custom UI per operation:

```ts
// src/pipeline/config-editor.tsx
// Generic config form renderer

function renderField(key: string, fieldSchema: z.ZodTypeAny): ReactNode {
  // Unwrap ZodDefault / ZodOptional to get the inner type
  const inner = unwrap(fieldSchema);
  const label = fieldSchema.description ?? key;

  if (inner instanceof z.ZodEnum) {
    return <select>...</select>;          // options from inner.options
  }
  if (inner instanceof z.ZodNumber) {
    return <input type="number" />;       // min/max from inner.minValue/maxValue
  }
  if (inner instanceof z.ZodBoolean) {
    return <input type="checkbox" />;
  }
  if (inner instanceof z.ZodString) {
    return <input type="text" />;
  }
  return null; // unsupported type — skip
}

function ConfigEditor({ schema, value, onChange }) {
  return Object.entries(schema.shape).map(([key, fieldSchema]) =>
    renderField(key, fieldSchema)
  );
}
```

---

## Pipeline Builder UI

New plugin at `/a/pipeline`:

```
┌─ toolbar ──────────────────────────────────────────────────┐
│ [+ add step ▾]  [▶ run]  [save ▾]  [load ▾]     [clear]  │
├────────────────────────────────────────────────────────────-┤
│ ┌─ input ───────────────┐  ┌─ pipeline ──────────────────┐│
│ │                        │  │                             ││
│ │ [text ▾] [file drop]   │  │ ┌─ 1. Format JSON ──[⚙][✕]││
│ │                        │  │ │  indent: [2 ▾]           ││
│ │ (textarea / drop zone) │  │ ├──── ↓ text (json) ──────-││
│ │                        │  │ │                           ││
│ │                        │  │ ├─ 2. SHA-256 ───────[⚙][✕]││
│ │                        │  │ ├──── ↓ text (hex) ────────-││
│ │                        │  │ │                           ││
│ │                        │  │ ├─ 3. Base64 Encode ─[⚙][✕]││
│ │                        │  │ ├──── ↓ text (base64) ─────-││
│ │                        │  │ │                           ││
│ │                        │  │ ├─ output ─────────────────-││
│ │                        │  │ │  (result display)         ││
│ │                        │  │ └───────────────────────────││
│ └────────────────────────┘  └─────────────────────────────┘│
└────────────────────────────────────────────────────────────-┘
```

- **Left panel**: raw input — textarea for text, file drop for binary. Toggle between text/binary input mode.
- **Right panel**: step list + output. Steps are drag-to-reorder.
- **Data flow arrows** between steps show `type (content)` and turn red on type mismatch.
- **Intermediate results**: click an arrow to inspect the data at that point.
- **Config**: inline per step, collapsed by default. Rendered generically from Zod schema.
- **"Add step"**: popover listing all available operations, grouped by plugin.

---

## What the Builder Knows Without Loading Process Code

| Capability                         | Source                                       |
| ---------------------------------- | -------------------------------------------- |
| List operations + names            | `PluginOperation.name`                       |
| Group by plugin                    | `PluginOperation.pluginId`                   |
| Input/output types + content hints | `DataSchema`                                 |
| Chain type validation              | `DataSchema.schema` (Zod parse)              |
| Content mismatch warnings          | `DataSchema.content`                         |
| Config form rendering              | `PluginOperation.config` (Zod introspection) |
| Default config values              | `z.ZodDefault` on config fields              |
| Descriptions / labels              | `.describe()` on Zod fields                  |

**Only `load()` is called when the pipeline actually runs.**

---

## Persistence

Pipelines saved to `localStorage`:

```ts
interface SavedPipeline {
  id: string;
  name: string;
  steps: PipelineStep[]; // operationId + config — both JSON-serializable
  createdAt: number;
  updatedAt: number;
}
```

Config values are `Record<string, string | number | boolean>` — trivially serializable. Future: shareable via URL-encoded pipeline definition.

---

## File Structure

```
src/
  types.ts                              # Plugin, PluginOperation, DataSchema,
                                        # PipelineData, ProcessFn (Zod schemas)
  registry.ts                           # RegistryProvider (plugins + operations map)
  pipeline/
    types.ts                            # Pipeline, PipelineStep, StepResult, PipelineResult
    runner.ts                           # runPipeline(), loadProcess(), processCache
    config-editor.tsx                   # Generic Zod→form renderer
  plugins/
    json-formatter/
      App.tsx                           # interactive UI (unchanged)
      operations.ts                     # descriptors: schemas + lazy load() refs
      process.ts                        # ProcessFn implementations (lazy)
    base64/
      App.tsx                           # interactive UI (unchanged)
      operations.ts
      process.ts
    hash-generator/
      App.tsx + FileItem.tsx + ...      # interactive UI (unchanged)
      operations.ts
      process.ts                        # uses crypto.subtle directly (no worker)
    pipeline/
      App.tsx                           # pipeline builder UI
```

---

## Implementation Order

1. `pnpm add zod`
2. Add Zod-based types to `src/types.ts` — `PipelineData`, `DataSchema`, `PluginOperation`, `ProcessFn`
3. Create `operations.ts` + `process.ts` for each existing plugin (json-formatter, base64, hash-generator)
4. Extend `Plugin` interface with optional `operations` field
5. Wire operations into plugin definitions in `src/plugins/index.tsx`
6. Extend `RegistryProvider` with operations map + `useOperations()` / `useOperation()` hooks
7. Create `src/pipeline/types.ts` — `Pipeline`, `PipelineStep`, `StepResult`
8. Create `src/pipeline/runner.ts` — `runPipeline()` with Zod validation
9. Create `src/pipeline/config-editor.tsx` — generic Zod schema → form renderer
10. Create `src/plugins/pipeline/App.tsx` — builder UI
11. Register pipeline as a plugin in `src/plugins/index.tsx`

---

## What Doesn't Change

- Interactive plugin UIs stay exactly as they are
- Routing, shell, header, home grid — all unchanged
- Theme, components — unchanged
- Hash generator's worker-based file processing — unchanged (operations use simpler crypto.subtle directly for pipeline context, no file/worker complexity)
