import { z } from "zod";
import { TextData } from "../../types";
import type { PluginOperation } from "../../types";

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
