import { z } from "zod";
import { TextData } from "../../types";
import type { PluginOperation, ProcessFn } from "../../types";

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
    load: () => import("./process").then((m) => m.format as ProcessFn),
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
    load: () => import("./process").then((m) => m.minify as ProcessFn),
  },
];
