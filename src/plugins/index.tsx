import { Braces, Binary, Hash } from "lucide-react";
import type { Plugin } from "../types";
import { TwoPanelSkeleton } from "./skeletons";

export const plugins: Plugin[] = [
  {
    id: "json-formatter",
    name: "JSON Formatter",
    icon: <Braces size={24} />,
    meta: {
      description:
        "Format, validate and minify JSON with configurable indentation",
      keywords: ["json", "formatter", "validator", "minify", "prettify"],
    },
    load: () => import("./json-formatter/App"),
    skeleton: () => <TwoPanelSkeleton />,
  },
  {
    id: "base64",
    name: "Base64 Encoder/Decoder",
    icon: <Binary size={24} />,
    meta: {
      description: "Encode and decode Base64 strings with full UTF-8 support",
      keywords: ["base64", "encode", "decode", "binary", "text"],
    },
    load: () => import("./base64/App"),
    skeleton: () => <TwoPanelSkeleton />,
  },
  {
    id: "hash-generator",
    name: "Hash Generator",
    icon: <Hash size={24} />,
    meta: {
      description:
        "Generate SHA-1, SHA-256, SHA-384, SHA-512 hashes from text or files",
      keywords: ["hash", "sha", "sha256", "sha512", "checksum", "digest"],
    },
    load: () => import("./hash-generator/App"),
    skeleton: () => <TwoPanelSkeleton />,
  },
];
