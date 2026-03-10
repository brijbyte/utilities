import {
  Braces,
  Binary,
  Hash,
  Workflow,
  Link,
  KeyRound,
  ShieldCheck,
  Calculator,
  Film,
  ImageIcon,
  Pipette,
} from "lucide-react";
import type { Plugin } from "../types";
import { TwoPanelSkeleton } from "./skeletons";
import { TotpAppSkeleton } from "./totp/components/Skeleton";
import { EmiSkeleton } from "./emi-calculator/components/Skeleton";
import { VideoEditorSkeleton } from "./video-editor/components/Skeleton";
import { ImageToolsSkeleton } from "./image-tools/components/Skeleton";
import { ColorPickerSkeleton } from "./color-picker/components/Skeleton";
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
    id: "emi-calculator",
    name: "EMI Calculator",
    icon: <Calculator size={24} />,
    meta: {
      description:
        "Calculate home loan EMI, total interest, and view month-by-month amortisation schedule",
      keywords: [
        "emi",
        "calculator",
        "loan",
        "mortgage",
        "interest",
        "amortisation",
        "home loan",
      ],
    },
    load: () => import("./emi-calculator/App"),
    skeleton: () => <EmiSkeleton />,
  },
  {
    id: "image-tools",
    name: "Image Tools",
    icon: <ImageIcon size={24} />,
    meta: {
      description:
        "Smart crop, background removal, face detection, quality filtering — all in the browser",
      keywords: [
        "image",
        "photo",
        "crop",
        "background removal",
        "face detection",
        "resize",
        "compress",
        "quality",
        "batch",
      ],
    },
    load: () => import("./image-tools/App"),
    skeleton: () => <ImageToolsSkeleton />,
  },
  {
    id: "color-picker",
    name: "Color Picker",
    icon: <Pipette size={24} />,
    meta: {
      description:
        "Advanced color picker supporting all CSS color formats and screen gamuts — HEX, RGB, HSL, HWB, LAB, LCH, OKLAB, OKLCH, Display P3, Rec. 2020",
      keywords: [
        "color picker",
        "css colors",
        "oklch",
        "display-p3",
        "gamut",
        "contrast checker",
        "color converter",
        "hex",
        "hsl",
        "lab",
        "wide gamut",
      ],
    },
    load: () => import("./color-picker/App"),
    skeleton: () => <ColorPickerSkeleton />,
  },
  {
    id: "video-editor",
    name: "Video Editor",
    icon: <Film size={24} />,
    meta: {
      description:
        "Compress, trim, resize, convert, and transform videos with FFmpeg — entirely in the browser",
      keywords: [
        "video",
        "compress",
        "trim",
        "resize",
        "convert",
        "ffmpeg",
        "editor",
        "rotate",
        "audio",
      ],
    },
    load: () => import("./video-editor/App"),
    skeleton: () => <VideoEditorSkeleton />,
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
