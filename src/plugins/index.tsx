import { Braces, Binary, Hash, Workflow, Link, KeyRound, ShieldCheck } from "lucide-react";
import type { Plugin } from "../types";
import { TwoPanelSkeleton } from "./skeletons";
import { TotpAppSkeleton } from "./totp/Skeleton";
import { operations as jsonOps } from "./json-formatter/operations";
import { operations as base64Ops } from "./base64/operations";
import { operations as hashOps } from "./hash-generator/operations";
import { operations as urlOps } from "./url-encoder/operations";
import { operations as jwtOps } from "./jwt-decoder/operations";

export const plugins: Plugin[] = [
  {
    id: "pipeline",
    name: "Pipeline",
    icon: <Workflow size={24} />,
    meta: {
      description: "Chain operations together into reusable data pipelines",
      keywords: ["pipeline", "chain", "workflow", "compose", "transform"],
    },
    load: () => import("./pipeline/App"),
    skeleton: () => <TwoPanelSkeleton />,
  },
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
    operations: jsonOps,
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
    operations: base64Ops,
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
    operations: hashOps,
  },
  {
    id: "url-encoder",
    name: "URL Encoder/Decoder",
    icon: <Link size={24} />,
    meta: {
      description: "Encode and decode URL components with full UTF-8 support",
      keywords: [
        "url",
        "encode",
        "decode",
        "percent",
        "uri",
        "encodeURIComponent",
      ],
    },
    load: () => import("./url-encoder/App"),
    skeleton: () => <TwoPanelSkeleton />,
    operations: urlOps,
  },
  {
    id: "jwt-decoder",
    name: "JWT Decoder",
    icon: <KeyRound size={24} />,
    meta: {
      description:
        "Decode JWT tokens, inspect header, payload, claims, and expiration status",
      keywords: ["jwt", "token", "decode", "claims", "bearer", "auth"],
    },
    load: () => import("./jwt-decoder/App"),
    skeleton: () => <TwoPanelSkeleton />,
    operations: jwtOps,
  },
  {
    id: "totp-authenticator",
    name: "Authenticator",
    icon: <ShieldCheck size={24} />,
    meta: {
      description:
        "Generate Time-Based One-Time Passwords (TOTP) securely offline",
      keywords: ["totp", "otp", "authenticator", "2fa", "mfa", "security"],
    },
    load: () => import("./totp/App"),
    skeleton: () => <TotpAppSkeleton />,
  },
];
