import type { ComponentType, ReactNode } from "react";
import { z } from "zod";

// ---- Plugin metadata ----

export interface PluginMeta {
  description: string;
  keywords?: string[];
  author?: string;
  version?: string;
}

// ---- Pipeline data ----

export const TextData = z.object({
  type: z.literal("text"),
  data: z.string(),
});

export const BinaryData = z.object({
  type: z.literal("binary"),
  data: z.instanceof(Uint8Array),
});

export const PipelineData = z.discriminatedUnion("type", [
  TextData,
  BinaryData,
]);
export type PipelineData = z.infer<typeof PipelineData>;

// ---- Content hints (soft metadata for builder UI) ----

export type ContentHint = "json" | "hex" | "base64" | "plain" | "bytes";

// ---- Data schema ----

export interface DataSchema {
  schema: typeof TextData | typeof BinaryData | typeof PipelineData;
  content?: ContentHint;
  description: string;
}

// ---- Process function ----

export type ProcessFn<TConfig = unknown> = (
  input: PipelineData,
  config: TConfig,
) => Promise<PipelineData>;

// ---- Plugin operation ----

export interface PluginOperation<TConfig extends z.ZodTypeAny = z.ZodTypeAny> {
  id: string;
  name: string;
  pluginId: string;
  input: DataSchema;
  output: DataSchema;
  config: TConfig;
  load: () => Promise<ProcessFn<z.infer<TConfig>>>;
}

// ---- Plugin ----

export interface Plugin {
  id: string;
  name: string;
  icon: ReactNode;
  meta: PluginMeta;
  load: () => Promise<{ default: ComponentType }>;
  skeleton?: () => ReactNode;
  operations?: PluginOperation[];
}
