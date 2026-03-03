import type { z } from "zod";

interface ConfigEditorProps {
  schema: z.ZodTypeAny;
  value: Record<string, string | number | boolean>;
  onChange: (value: Record<string, string | number | boolean>) => void;
}

// Unwrap ZodDefault/ZodOptional to get the inner type
function unwrap(field: z.ZodTypeAny): z.ZodTypeAny {
  const def = (
    field as unknown as { _def: { type: string; innerType?: z.ZodTypeAny } }
  )._def;
  if (def.type === "default" || def.type === "optional") {
    return unwrap(def.innerType!);
  }
  return field;
}

function getDefault(
  field: z.ZodTypeAny,
): string | number | boolean | undefined {
  const def = (
    field as unknown as { _def: { type: string; defaultValue?: unknown } }
  )._def;
  if (def.type === "default") {
    return def.defaultValue as string | number | boolean;
  }
  return undefined;
}

function getFieldType(field: z.ZodTypeAny): string {
  return (field as unknown as { _def: { type: string } })._def.type;
}

function getEnumOptions(field: z.ZodTypeAny): string[] {
  return (field as unknown as { _def: { entries: Record<string, string> } })
    ._def.entries
    ? Object.values(
        (field as unknown as { _def: { entries: Record<string, string> } })._def
          .entries,
      )
    : [];
}

function getNumberChecks(field: z.ZodTypeAny): {
  min?: number;
  max?: number;
  step?: number;
} {
  const checks =
    (
      field as unknown as {
        _def: { checks?: Array<{ kind: string; value: number }> };
      }
    )._def.checks ?? [];
  const result: { min?: number; max?: number; step?: number } = {};
  for (const check of checks) {
    if (check.kind === "min" || check.kind === "gte") result.min = check.value;
    if (check.kind === "max" || check.kind === "lte") result.max = check.value;
  }
  return result;
}

export function ConfigEditor({ schema, value, onChange }: ConfigEditorProps) {
  const shape = (schema as unknown as { shape?: Record<string, z.ZodTypeAny> })
    .shape;
  if (!shape) return null;
  const keys = Object.keys(shape);

  if (keys.length === 0) return null;

  function update(key: string, val: string | number | boolean) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div className="flex flex-wrap items-center gap-sm">
      {keys.map((key) => {
        const fieldSchema = shape[key];
        const inner = unwrap(fieldSchema);
        const label = fieldSchema.description ?? key;
        const fieldType = getFieldType(inner);
        const currentVal = value[key] ?? getDefault(fieldSchema);

        if (fieldType === "enum") {
          const options = getEnumOptions(inner);
          return (
            <label
              key={key}
              className="flex items-center gap-xs text-xs text-text-muted"
            >
              {label}
              <select
                value={String(currentVal ?? "")}
                onChange={(e) => update(key, e.target.value)}
                className="border border-border bg-bg-surface text-text px-sm py-xs text-xs cursor-pointer"
              >
                {options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          );
        }

        if (fieldType === "number") {
          const { min, max } = getNumberChecks(inner);
          return (
            <label
              key={key}
              className="flex items-center gap-xs text-xs text-text-muted"
            >
              {label}
              <input
                type="number"
                value={Number(currentVal ?? 0)}
                min={min}
                max={max}
                onChange={(e) => update(key, Number(e.target.value))}
                className="border border-border bg-bg-surface text-text px-sm py-xs text-xs w-16"
              />
            </label>
          );
        }

        if (fieldType === "boolean") {
          return (
            <label
              key={key}
              className="flex items-center gap-xs text-xs text-text-muted cursor-pointer"
            >
              <input
                type="checkbox"
                checked={Boolean(currentVal ?? false)}
                onChange={(e) => update(key, e.target.checked)}
                className="accent-accent"
              />
              {label}
            </label>
          );
        }

        if (fieldType === "string") {
          return (
            <label
              key={key}
              className="flex items-center gap-xs text-xs text-text-muted"
            >
              {label}
              <input
                type="text"
                value={String(currentVal ?? "")}
                onChange={(e) => update(key, e.target.value)}
                className="border border-border bg-bg-surface text-text px-sm py-xs text-xs"
              />
            </label>
          );
        }

        return null;
      })}
    </div>
  );
}
