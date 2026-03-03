import { z } from "zod";
import { TextData, PipelineData } from "../../types";
import type { PluginOperation } from "../../types";
import { ALGORITHMS } from "./types";

export const operations: PluginOperation[] = ALGORITHMS.map((algo) => ({
  id: `hash.${algo.toLowerCase().replace("-", "")}`,
  name: algo,
  pluginId: "hash-generator",
  input: {
    schema: PipelineData,
    content: "plain" as const,
    description: "text or binary data to hash",
  },
  output: {
    schema: TextData,
    content: "hex" as const,
    description: `${algo} hex digest`,
  },
  config: z.object({}),
  load: () => import("./process").then((m) => m.createHashFn(algo)),
}));
