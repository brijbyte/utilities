import type { Operations, VideoMeta } from "./types";
import { RESOLUTION_PRESETS, formatTimeFfmpeg } from "./types";

/**
 * Build FFmpeg command arguments from operation configs.
 * Returns [args, outputFileName].
 */
export function buildCommand(
  inputName: string,
  ops: Operations,
  meta: VideoMeta,
): [string[], string] {
  const args: string[] = ["-i", inputName];
  const filters: string[] = [];

  // ── Trim ────────────────────────────────────────────────────────
  if (ops.trim.enabled) {
    args.push("-ss", formatTimeFfmpeg(ops.trim.start));
    args.push("-to", formatTimeFfmpeg(ops.trim.end));
  }

  // ── Rotate / Flip ──────────────────────────────────────────────
  if (ops.rotate.enabled) {
    if (ops.rotate.rotation === 90) filters.push("transpose=1");
    else if (ops.rotate.rotation === 180)
      filters.push("transpose=1,transpose=1");
    else if (ops.rotate.rotation === 270) filters.push("transpose=2");

    if (ops.rotate.flipH) filters.push("hflip");
    if (ops.rotate.flipV) filters.push("vflip");
  }

  // ── Resize ─────────────────────────────────────────────────────
  if (ops.resize.enabled) {
    let w: number, h: number;
    if (ops.resize.preset !== "original" && ops.resize.preset !== "custom") {
      const preset = RESOLUTION_PRESETS[ops.resize.preset];
      w = preset.width;
      h = preset.height;
    } else if (ops.resize.preset === "custom") {
      w = ops.resize.width;
      h = ops.resize.height;
    } else {
      w = meta.width;
      h = meta.height;
    }

    // Ensure target dimensions are even (required by most codecs)
    const ew = Math.ceil(w / 2) * 2;
    const eh = Math.ceil(h / 2) * 2;

    if (!ops.resize.maintainAspect) {
      // Stretch to exact dimensions (ignores aspect ratio)
      filters.push(`scale=${ew}:${eh}`);
    } else if (ops.resize.fit === "crop") {
      // Scale to cover target (may be larger), then center-crop to exact dimensions
      filters.push(`scale=${ew}:${eh}:force_original_aspect_ratio=increase`);
      filters.push(`crop=${ew}:${eh}`);
    } else {
      // "pad" (default): scale to fit within target, pad with black bars
      filters.push(`scale=${ew}:${eh}:force_original_aspect_ratio=decrease`);
      filters.push(`pad=${ew}:${eh}:(ow-iw)/2:(oh-ih)/2:color=black`);
    }
  }

  // ── Determine output format ────────────────────────────────────
  const isAudioExtract = ops.audio.enabled && ops.audio.action === "extract";
  const isConvert = ops.convert.enabled;

  let outputFormat: string;
  if (isAudioExtract) {
    outputFormat = ops.audio.extractFormat;
  } else if (isConvert) {
    outputFormat = ops.convert.format;
  } else if (ops.compress.enabled) {
    outputFormat = ops.compress.format;
  } else {
    outputFormat = "mp4";
  }

  const isAudioOnlyOutput = ["mp3", "aac", "wav", "ogg"].includes(outputFormat);

  // ── Audio handling ─────────────────────────────────────────────
  if (isAudioExtract) {
    // Extract audio only — no video filters
    args.push("-vn"); // no video
    if (outputFormat === "mp3") {
      args.push("-acodec", "libmp3lame", "-q:a", "2");
    } else if (outputFormat === "aac") {
      args.push("-acodec", "aac", "-b:a", "192k");
    } else if (outputFormat === "wav") {
      args.push("-acodec", "pcm_s16le");
    } else if (outputFormat === "ogg") {
      args.push("-acodec", "libvorbis", "-q:a", "5");
    }
  } else {
    // Apply video filters if any
    if (filters.length > 0) {
      args.push("-vf", filters.join(","));
    }

    // Remove audio if requested
    if (ops.audio.enabled && ops.audio.action === "remove") {
      args.push("-an");
    }

    // ── Compression / Codec ────────────────────────────────────
    if (outputFormat === "gif") {
      // GIF: use palettegen/paletteuse for better quality
      // Simple approach — just scale + output as gif
      args.push("-f", "gif");
    } else if (!isAudioOnlyOutput) {
      if (ops.compress.enabled) {
        if (outputFormat === "mp4") {
          args.push("-c:v", "libx264", "-preset", "medium");
          if (ops.compress.mode === "crf") {
            args.push("-crf", String(ops.compress.crf));
          } else {
            // Target size mode: calculate bitrate
            const duration = ops.trim.enabled
              ? ops.trim.end - ops.trim.start
              : meta.duration;
            const targetBits = ops.compress.targetSizeMB * 8 * 1024 * 1024;
            const bitrate = Math.floor(targetBits / Math.max(duration, 1));
            args.push(
              "-b:v",
              `${bitrate}`,
              "-maxrate",
              `${bitrate}`,
              "-bufsize",
              `${bitrate * 2}`,
            );
          }
          // AAC audio for MP4 — universally compatible
          if (!(ops.audio.enabled && ops.audio.action === "remove")) {
            args.push("-c:a", "aac", "-b:a", "128k");
          }
        } else if (outputFormat === "webm") {
          args.push("-c:v", "libvpx-vp9");
          if (ops.compress.mode === "crf") {
            args.push("-crf", String(ops.compress.crf), "-b:v", "0");
          } else {
            const duration = ops.trim.enabled
              ? ops.trim.end - ops.trim.start
              : meta.duration;
            const targetBits = ops.compress.targetSizeMB * 8 * 1024 * 1024;
            const bitrate = Math.floor(targetBits / Math.max(duration, 1));
            args.push("-b:v", `${bitrate}`);
          }
          // Opus audio for WebM
          if (!(ops.audio.enabled && ops.audio.action === "remove")) {
            args.push("-c:a", "libopus", "-b:a", "128k");
          }
        }
      } else {
        // No compression — use copy if no filters applied, otherwise re-encode
        const hasVideoFilters = filters.length > 0;
        if (!hasVideoFilters && !isConvert) {
          args.push("-c", "copy");
        } else if (outputFormat === "mp4") {
          args.push("-c:v", "libx264", "-crf", "18");
          if (!(ops.audio.enabled && ops.audio.action === "remove")) {
            args.push("-c:a", "aac", "-b:a", "128k");
          }
        } else if (outputFormat === "webm") {
          args.push("-c:v", "libvpx-vp9", "-crf", "30", "-b:v", "0");
          if (!(ops.audio.enabled && ops.audio.action === "remove")) {
            args.push("-c:a", "libopus", "-b:a", "128k");
          }
        }
      }
    }
  }

  // ── Output name ────────────────────────────────────────────────
  const baseName = meta.name.replace(/\.[^.]+$/, "");
  const outputName = `output_${baseName}.${outputFormat}`;

  // Overwrite output
  args.push("-y", outputName);

  return [args, outputName];
}

/**
 * Get the MIME type for an output format.
 */
export function getMimeType(format: string): string {
  const mimeMap: Record<string, string> = {
    mp4: "video/mp4",
    webm: "video/webm",
    gif: "image/gif",
    avi: "video/x-msvideo",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    aac: "audio/aac",
    wav: "audio/wav",
    ogg: "audio/ogg",
  };
  return mimeMap[format] ?? "application/octet-stream";
}
