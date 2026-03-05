import { z } from "zod";
import { TextData } from "../../types";
import type { PluginOperation } from "../../types";

export const operations: PluginOperation[] = [
  {
    id: "jwt.decodePayload",
    name: "JWT Decode Payload",
    pluginId: "jwt-decoder",
    input: { schema: TextData, content: "plain", description: "JWT string" },
    output: {
      schema: TextData,
      content: "json",
      description: "decoded payload as JSON",
    },
    config: z.object({}),
    load: () => import("./process").then((m) => m.decode),
  },
  {
    id: "jwt.decodeHeader",
    name: "JWT Decode Header",
    pluginId: "jwt-decoder",
    input: { schema: TextData, content: "plain", description: "JWT string" },
    output: {
      schema: TextData,
      content: "json",
      description: "decoded header as JSON",
    },
    config: z.object({}),
    load: () => import("./process").then((m) => m.decodeHeader),
  },
];
