import type { ReactNode } from "react";
import {
  Shrink,
  Music,
  Image,
  VolumeX,
  Apple,
  MonitorPlay,
} from "lucide-react";
import type { Operations, VideoMeta } from "../utils/types";
import { defaultOperations } from "../utils/types";

// ── SVG icons for platforms without lucide icons ────────────────────

function YoutubeIcon() {
  return (
    <svg viewBox="0 0 24 24" width={13} height={13} fill="currentColor">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.9 31.9 0 0 0 0 12a31.9 31.9 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.9 31.9 0 0 0 24 12a31.9 31.9 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width={13} height={13} fill="currentColor">
      <path d="M12 2.2c2.7 0 3 0 4.1.06 1 .05 1.6.2 2 .34a3.4 3.4 0 0 1 1.2.8c.37.36.66.77.8 1.24.14.37.3.96.34 1.97.05 1.08.06 1.4.06 4.12s0 3.04-.06 4.12c-.05 1-.2 1.6-.34 1.97a3.6 3.6 0 0 1-2.04 2.04c-.37.14-.96.3-1.97.34-1.08.05-1.4.06-4.12.06s-3.04 0-4.12-.06c-1-.05-1.6-.2-1.97-.34a3.4 3.4 0 0 1-1.24-.8 3.4 3.4 0 0 1-.8-1.24c-.14-.37-.3-.96-.34-1.97C2.22 15.04 2.2 14.7 2.2 12s0-3.04.06-4.12c.05-1 .2-1.6.34-1.97.14-.47.43-.88.8-1.24a3.4 3.4 0 0 1 1.24-.8c.37-.14.96-.3 1.97-.34C7.7 2.22 8 2.2 12 2.2Zm0-2.16c-2.72 0-3.06 0-4.13.06s-1.8.2-2.43.44a5.6 5.6 0 0 0-2.04 1.32A5.6 5.6 0 0 0 2.08 3.9c-.23.64-.39 1.37-.44 2.43C1.58 7.4 1.56 7.74 1.56 12s0 4.6.06 5.67.2 1.8.44 2.43a5.6 5.6 0 0 0 1.32 2.04 5.6 5.6 0 0 0 2.04 1.32c.64.23 1.37.39 2.43.44S8.91 24 12 24s3.73 0 4.8-.06 1.8-.2 2.43-.44a5.84 5.84 0 0 0 3.36-3.36c.23-.64.39-1.37.44-2.43s.06-1.4.06-4.13 0-3.73-.06-4.8-.2-1.8-.44-2.43a5.6 5.6 0 0 0-1.32-2.04A5.6 5.6 0 0 0 19.23.99c-.64-.23-1.37-.39-2.43-.44C15.73.5 15.39.48 12 .48V.04ZM12 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.4-10.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88Z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" width={13} height={13} fill="currentColor">
      <path d="M19.3 6.4a4.8 4.8 0 0 1-2.9-1 4.8 4.8 0 0 1-1.9-2.8h.01V2h-3.8v13.6a2.9 2.9 0 0 1-2.9 2.7 2.9 2.9 0 0 1-2.1-.9 2.9 2.9 0 0 1 1.5-4.8 2.9 2.9 0 0 1 1.5.1V8.7a6.7 6.7 0 0 0-1.5-.2 6.7 6.7 0 0 0-4.8 2 6.7 6.7 0 0 0-1.9 5.3 6.7 6.7 0 0 0 2.7 4.6 6.7 6.7 0 0 0 4 1.3 6.7 6.7 0 0 0 4.8-2 6.7 6.7 0 0 0 2-4.8V9.4A8.6 8.6 0 0 0 19.3 11V7.1a4.8 4.8 0 0 1-1.3-.2v3.2a8.6 8.6 0 0 1-4.4-1.5v7.5a6.7 6.7 0 0 1-2 4.8 6.7 6.7 0 0 1-4.8 2 6.7 6.7 0 0 1-4-1.3 6.7 6.7 0 0 0 5.4 2.1 6.7 6.7 0 0 0 4.8-2 6.7 6.7 0 0 0 2-4.8V7.6a8.6 8.6 0 0 0 5 1.6V5.7h-.7Z" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" width={13} height={13} fill="currentColor">
      <path d="M18.2 2.25h3.5l-7.7 8.8 9 11.9h-7.1l-5.5-7.2-6.3 7.2H.7l8.2-9.4L0 2.25h7.3l5 6.6 5.8-6.6Zm-1.2 18.6h2L7 4.35H4.8l12.2 16.5Z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width={13} height={13} fill="currentColor">
      <path d="M17.5 14.4c-.3-.15-1.8-.9-2.1-1s-.5-.15-.7.15-.8 1-1 1.2-.35.22-.65.07a8.2 8.2 0 0 1-2.4-1.5 9 9 0 0 1-1.7-2.1c-.17-.3 0-.46.13-.6s.3-.35.45-.52c.15-.17.2-.3.3-.5s.05-.37-.02-.52c-.08-.15-.7-1.7-.96-2.33-.25-.6-.5-.52-.7-.53h-.6a1.15 1.15 0 0 0-.83.39A3.5 3.5 0 0 0 5.6 9.1a6.1 6.1 0 0 0 1.27 3.23 13.9 13.9 0 0 0 5.35 4.73 6.1 6.1 0 0 0 3.78.63 3.2 3.2 0 0 0 2.1-1.48 2.6 2.6 0 0 0 .18-1.48c-.08-.13-.3-.21-.6-.36ZM12.05 21.8a9.9 9.9 0 0 1-5-1.38l-.36-.21-3.73.98 1-3.65-.24-.37a9.87 9.87 0 0 1 15.34-12.3 9.87 9.87 0 0 1-7 16.93ZM12.05 0A12 12 0 0 0 1.7 17.97L0 24l6.2-1.63A12 12 0 1 0 12.05 0Z" />
    </svg>
  );
}

// ── Preset definitions ─────────────────────────────────────────────

interface Preset {
  id: string;
  label: string;
  icon: ReactNode;
  apply: (meta: VideoMeta) => Operations;
}

interface PresetGroup {
  label: string;
  presets: Preset[];
}

const PRESET_GROUPS: PresetGroup[] = [
  {
    label: "Platforms",
    presets: [
      {
        id: "youtube",
        label: "YouTube",
        icon: <YoutubeIcon />,
        apply: (meta) => {
          // YouTube recommended: MP4, H.264 video + AAC audio,
          // 1080p (1920×1080) or keep 4K, 16:9 aspect ratio,
          // CRF 16-18 for high quality upload (YouTube re-encodes anyway)
          const ops = defaultOperations(meta);
          const isOver1080 = meta.width > 1920 || meta.height > 1080;
          ops.compress = {
            enabled: true,
            format: "mp4",
            mode: "crf",
            crf: 16,
            targetSizeMB: Math.max(
              1,
              Math.round(meta.size / (1024 * 1024) / 2),
            ),
          };
          ops.resize = {
            enabled: isOver1080,
            preset: isOver1080 ? "1080p" : "original",
            width: isOver1080 ? 1920 : meta.width,
            height: isOver1080 ? 1080 : meta.height,
            maintainAspect: true,
            fit: "pad",
          };
          return ops;
        },
      },
      {
        id: "instagram-reel",
        label: "Instagram Reel",
        icon: <InstagramIcon />,
        apply: (meta) => {
          // Instagram Reels: MP4, H.264 + AAC, 1080×1920 (9:16), max 90s
          const ops = defaultOperations(meta);
          ops.compress = {
            enabled: true,
            format: "mp4",
            mode: "crf",
            crf: 18,
            targetSizeMB: Math.max(
              1,
              Math.round(meta.size / (1024 * 1024) / 2),
            ),
          };
          ops.resize = {
            enabled: true,
            preset: "custom",
            width: 1080,
            height: 1920,
            maintainAspect: true,
            fit: "crop",
          };
          ops.trim = {
            enabled: true,
            start: 0,
            end: Math.min(meta.duration, 90),
          };
          return ops;
        },
      },
      {
        id: "instagram-post",
        label: "Instagram Post",
        icon: <InstagramIcon />,
        apply: (meta) => {
          // Instagram feed: MP4, H.264 + AAC, 1080×1080 (1:1), max 60s
          const ops = defaultOperations(meta);
          ops.compress = {
            enabled: true,
            format: "mp4",
            mode: "crf",
            crf: 18,
            targetSizeMB: Math.max(
              1,
              Math.round(meta.size / (1024 * 1024) / 2),
            ),
          };
          ops.resize = {
            enabled: true,
            preset: "custom",
            width: 1080,
            height: 1080,
            maintainAspect: true,
            fit: "crop",
          };
          ops.trim = {
            enabled: true,
            start: 0,
            end: Math.min(meta.duration, 60),
          };
          return ops;
        },
      },
      {
        id: "tiktok",
        label: "TikTok",
        icon: <TikTokIcon />,
        apply: (meta) => {
          // TikTok: MP4, H.264 + AAC, 1080×1920 (9:16), max 10 min, ≤287MB
          const ops = defaultOperations(meta);
          ops.compress = {
            enabled: true,
            format: "mp4",
            mode: "crf",
            crf: 18,
            targetSizeMB: Math.max(
              1,
              Math.round(meta.size / (1024 * 1024) / 2),
            ),
          };
          ops.resize = {
            enabled: true,
            preset: "custom",
            width: 1080,
            height: 1920,
            maintainAspect: true,
            fit: "crop",
          };
          ops.trim = {
            enabled: true,
            start: 0,
            end: Math.min(meta.duration, 600),
          };
          return ops;
        },
      },
      {
        id: "twitter",
        label: "X / Twitter",
        icon: <TwitterIcon />,
        apply: (meta) => {
          // X/Twitter: MP4, H.264 + AAC, 1280×720 (16:9), max 140s, ≤512MB
          const ops = defaultOperations(meta);
          const isOver720 = meta.width > 1280 || meta.height > 720;
          ops.compress = {
            enabled: true,
            format: "mp4",
            mode: "crf",
            crf: 20,
            targetSizeMB: Math.max(
              1,
              Math.round(meta.size / (1024 * 1024) / 2),
            ),
          };
          ops.resize = {
            enabled: isOver720,
            preset: isOver720 ? "720p" : "original",
            width: isOver720 ? 1280 : meta.width,
            height: isOver720 ? 720 : meta.height,
            maintainAspect: true,
            fit: "pad",
          };
          ops.trim = {
            enabled: true,
            start: 0,
            end: Math.min(meta.duration, 140),
          };
          return ops;
        },
      },
      {
        id: "whatsapp",
        label: "WhatsApp",
        icon: <WhatsAppIcon />,
        apply: (meta) => {
          // WhatsApp: MP4, H.264 + AAC, 16MB limit, 3 min status / longer in chat
          const ops = defaultOperations(meta);
          const isOver720 = meta.width > 1280 || meta.height > 720;
          ops.compress = {
            enabled: true,
            format: "mp4",
            mode: "target-size",
            crf: 28,
            targetSizeMB: 16,
          };
          ops.resize = {
            enabled: isOver720,
            preset: isOver720 ? "720p" : "original",
            width: isOver720 ? 1280 : meta.width,
            height: isOver720 ? 720 : meta.height,
            maintainAspect: true,
            fit: "pad",
          };
          ops.trim = {
            enabled: true,
            start: 0,
            end: Math.min(meta.duration, 180),
          };
          return ops;
        },
      },
    ],
  },
  {
    label: "Devices",
    presets: [
      {
        id: "iphone",
        label: "iPhone",
        icon: <Apple size={13} />,
        apply: (meta) => {
          // iPhone sweet spot: 1080p H.264 MP4, CRF 22 looks great on Retina
          // Aggressively compressed vs original but visually lossless on phone screens
          const ops = defaultOperations(meta);
          ops.compress = {
            enabled: true,
            format: "mp4",
            mode: "crf",
            crf: 22,
            targetSizeMB: Math.max(
              1,
              Math.round(meta.size / (1024 * 1024) / 2),
            ),
          };
          ops.resize = {
            enabled: meta.width > 1920 || meta.height > 1080,
            preset: "1080p",
            width: 1920,
            height: 1080,
            maintainAspect: true,
            fit: "pad",
          };
          return ops;
        },
      },
      {
        id: "iphone-save-space",
        label: "iPhone (Save Space)",
        icon: <Apple size={13} />,
        apply: (meta) => {
          // Max compression while still looking good on phone
          // 720p is indistinguishable from 1080p on a 6.1" screen for most content
          const ops = defaultOperations(meta);
          ops.compress = {
            enabled: true,
            format: "mp4",
            mode: "crf",
            crf: 26,
            targetSizeMB: Math.max(
              1,
              Math.round(meta.size / (1024 * 1024) / 4),
            ),
          };
          ops.resize = {
            enabled: meta.width > 1280 || meta.height > 720,
            preset: "720p",
            width: 1280,
            height: 720,
            maintainAspect: true,
            fit: "pad",
          };
          return ops;
        },
      },
      {
        id: "tv-4k",
        label: "TV / Desktop",
        icon: <MonitorPlay size={13} />,
        apply: (meta) => {
          // Keep resolution, light compression for TV/desktop viewing
          const ops = defaultOperations(meta);
          ops.compress = {
            enabled: true,
            format: "mp4",
            mode: "crf",
            crf: 18,
            targetSizeMB: Math.max(
              1,
              Math.round(meta.size / (1024 * 1024) / 2),
            ),
          };
          return ops;
        },
      },
    ],
  },
  {
    label: "Tools",
    presets: [
      {
        id: "compress-small",
        label: "Reduce File Size",
        icon: <Shrink size={13} />,
        apply: (meta) => {
          const ops = defaultOperations(meta);
          ops.compress = {
            enabled: true,
            format: "mp4",
            mode: "crf",
            crf: 28,
            targetSizeMB: Math.max(
              1,
              Math.round(meta.size / (1024 * 1024) / 2),
            ),
          };
          return ops;
        },
      },
      {
        id: "extract-audio",
        label: "Extract Audio",
        icon: <Music size={13} />,
        apply: (meta) => {
          const ops = defaultOperations(meta);
          ops.audio = {
            enabled: true,
            action: "extract",
            extractFormat: "mp3",
          };
          return ops;
        },
      },
      {
        id: "make-gif",
        label: "Make GIF",
        icon: <Image size={13} />,
        apply: (meta) => {
          const ops = defaultOperations(meta);
          ops.convert = { enabled: true, format: "gif" };
          ops.resize = {
            enabled: meta.width > 480,
            preset: "480p",
            width: 854,
            height: 480,
            maintainAspect: true,
            fit: "pad",
          };
          ops.trim = {
            enabled: meta.duration > 10,
            start: 0,
            end: Math.min(meta.duration, 10),
          };
          return ops;
        },
      },
      {
        id: "mute",
        label: "Remove Audio",
        icon: <VolumeX size={13} />,
        apply: (meta) => {
          const ops = defaultOperations(meta);
          ops.audio = {
            enabled: true,
            action: "remove",
            extractFormat: "mp3",
          };
          return ops;
        },
      },
    ],
  },
];

// ── Component ──────────────────────────────────────────────────────

interface QuickPresetsProps {
  meta: VideoMeta;
  onApply: (ops: Operations) => void;
}

export function QuickPresets({ meta, onApply }: QuickPresetsProps) {
  return (
    <div className="flex flex-col gap-3">
      {PRESET_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-1.5">
          <span className="text-[0.625rem] text-text-muted uppercase tracking-wider">
            {group.label}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {group.presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onApply(preset.apply(meta))}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs border rounded-full cursor-pointer transition-colors select-none bg-bg-surface text-text-muted border-border hover:bg-bg-hover hover:text-text"
              >
                {preset.icon}
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
