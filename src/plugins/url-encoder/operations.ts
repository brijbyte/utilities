import { z } from "zod";
import { TextData } from "../../types";
import type { PluginOperation } from "../../types";

export const operations: PluginOperation[] = [
  {
    id: "url.encode",
    name: "URL Encode",
    pluginId: "url-encoder",
    input: {
      schema: TextData,
      content: "plain",
      description: "text to encode",
    },
    output: {
      schema: TextData,
      content: "plain",
      description: "percent-encoded string",
    },
    config: z.object({}),
    load: () => import("./process").then((m) => m.encode),
  },
  {
    id: "url.decode",
    name: "URL Decode",
    pluginId: "url-encoder",
    input: {
      schema: TextData,
      content: "plain",
      description: "percent-encoded string",
    },
    output: { schema: TextData, content: "plain", description: "decoded text" },
    config: z.object({}),
    load: () => import("./process").then((m) => m.decode),
  },
  {
    id: "url.encodeAll",
    name: "URL Encode All Characters",
    pluginId: "url-encoder",
    input: {
      schema: TextData,
      content: "plain",
      description: "text to encode",
    },
    output: {
      schema: TextData,
      content: "plain",
      description: "fully percent-encoded string",
    },
    config: z.object({}),
    load: () => import("./process").then((m) => m.encodeAll),
  },
];
