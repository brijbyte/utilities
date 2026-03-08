# Video Processor Plugin — FFmpeg WASM

## Core Concept

Upload a video → pick operations → preview settings → process via FFmpeg WASM → download result. All client-side, no server upload needed.

## Tier 1 — MVP Features (High Impact, Straightforward)

1. **Compress / Transcode**
   - Output format: MP4 (H.264), WebM (VP8/VP9)
   - Quality preset slider: Low / Medium / High / Custom CRF
   - Target file size mode (e.g., "make it under 10MB")

2. **Trim / Cut**
   - Start/end time inputs with `h:mm:ss` parsing
   - Format description showing supported input formats

3. **Resize / Scale**
   - Preset resolutions: 1080p, 720p, 480p, 360p, Custom
   - Maintain aspect ratio toggle
   - Fit mode (pad/crop/stretch) when aspect ratio mismatches

4. **Convert Format**
   - MP4 ↔ WebM ↔ GIF ↔ AVI ↔ MOV
   - Audio format extraction: MP3, AAC, WAV, OGG

5. **Remove Audio**
   - Strip audio track (common need for sharing silent clips)

6. **Extract Audio**
   - Pull audio track out as MP3/AAC/WAV

7. **Rotate / Flip**
   - 90°, 180°, 270° rotation
   - Horizontal/vertical flip

8. **Quick Presets**
   - Social media: YouTube, Instagram Reel/Post, TikTok, X/Twitter, WhatsApp
   - Devices: iPhone, iPhone Save Space, TV/Desktop
   - Click to apply settings, then freely modify

## Tier 2 — Nice to Have (Moderate Complexity)

9. **Change Speed**
   - 0.25x, 0.5x, 1.5x, 2x, 4x
   - With/without pitch correction for audio

10. **Adjust FPS**
    - Change frame rate (60→30, 30→24, etc.)
    - Useful for reducing file size or matching platform requirements

11. **Crop**
    - Visual crop area selector on a video frame
    - Preset aspect ratios: 16:9, 9:16 (vertical), 1:1 (square), 4:3

12. **Video to GIF**
    - Configurable FPS, width, quality
    - Start/end time selection
    - Palette generation for better GIF quality

13. **Add Watermark / Overlay**
    - Image overlay with position picker (corners, center)
    - Opacity control

## Tier 3 — Advanced (More Complex)

14. **Concatenate / Merge**
    - Join multiple video files together
    - Drag-to-reorder

15. **Filters**
    - Brightness, contrast, saturation, hue adjustments
    - Grayscale, sepia, blur, sharpen
    - Fade in/out

16. **Subtitles**
    - Burn SRT/VTT subtitles into video
    - Font size/color customization

17. **Thumbnail / Frame Extraction**
    - Extract frame at timestamp as PNG/JPG
    - Generate thumbnail grid (contact sheet)

18. **Metadata Viewer/Editor**
    - Show codec, bitrate, duration, resolution, FPS
    - Strip metadata for privacy

## Architecture

### Web Worker Pipeline

All FFmpeg processing runs in a dedicated Web Worker (`utils/worker.js`) to keep the UI responsive:

```
Main Thread                          Worker Thread
──────────                           ─────────────
File + args  ──postMessage──→        fetchFile(file)
                                     ffmpeg.load() (nested worker)
             ←──progress────         ffmpeg.exec(args)
             ←──progress────         ffmpeg.readFile(output)
             ←──done + Blob──        new Blob(outputData)
```

- **File reading** (`fetchFile`), **WASM execution**, and **blob creation** all happen off the main thread
- FFmpeg's own internal Web Worker is nested inside ours (worker-in-worker)
- Progress updates are throttled to 250ms on the main thread to avoid render thrashing
- Abort terminates the entire worker (kills FFmpeg mid-execution)

### FFmpeg Core

- **Single-threaded core** (`@ffmpeg/core@0.12.10`) — avoids needing `Cross-Origin-Isolation` headers (COOP/COEP)
- Loaded from CDN (`cdn.jsdelivr.net`) to avoid bundling ~30MB
- WASM + JS core are converted to blob URLs via `toBlobURL()` for cross-origin loading

### Progress Reporting

Progress is derived from two sources (log-based is preferred):

1. **Log parsing** — FFmpeg prints `time=HH:MM:SS.ms` in stderr; parsed against known input duration
2. **Progress event** — FFmpeg's built-in progress callback (less reliable, used as fallback)

The last 5 FFmpeg log lines are shown below the progress bar so users can see real-time encoding status.

### Resize Fit Modes

When the target aspect ratio differs from the source (e.g., landscape → square for Instagram):

| Mode        | FFmpeg Filter                                                                | Result                            |
| ----------- | ---------------------------------------------------------------------------- | --------------------------------- |
| **Pad**     | `scale=...:force_original_aspect_ratio=decrease` + `pad=w:h:...:color=black` | Black bars, all content preserved |
| **Crop**    | `scale=...:force_original_aspect_ratio=increase` + `crop=w:h`                | Fill frame, edges cut off         |
| **Stretch** | `scale=w:h` (no aspect flag)                                                 | Distorted to fill                 |

Social media presets (Instagram, TikTok) default to **Crop**; others default to **Pad**.

### Cancellation

- `AbortController` created per processing run
- On abort: posts `terminate` message to worker → worker calls `ffmpeg.terminate()` → worker is terminated → promise rejects with `AbortError`
- Cancel, Reset, and component unmount all trigger abort
- `beforeunload` listener blocks page reload during processing

## UX Design

- **Single-page scrollable layout** — not two-panel since video is visual
- **Upload zone** at top with drag-and-drop + file picker
- **Video preview** with native `<video>` element (shows warning for unsupported formats)
- **Quick presets** as plain buttons (not toggles) — click sets values, then modify freely
- **Operations as collapsible panels** (shared `Collapsible` component) — each with description and activity badge
- **Toolbar** with Process / Reset / Clear buttons
- **Progress bar** (Base UI `Progress`) with cancel button and recent log lines
- **Output section** with preview, download, and size comparison

## Technical Considerations

| Concern               | Approach                                                                          |
| --------------------- | --------------------------------------------------------------------------------- |
| **WASM size**         | `@ffmpeg/core` is ~30MB — loaded from CDN, not bundled                            |
| **Memory**            | Large videos can OOM in browser — suggest <500MB                                  |
| **SharedArrayBuffer** | Not required (single-threaded core avoids COOP/COEP header requirement)           |
| **Main thread**       | All FFmpeg work in Web Worker; progress throttled to 250ms                        |
| **Progress**          | Parse FFmpeg log output for `time=` against input duration                        |
| **Codec support**     | H.264, VP8/VP9 supported; H.265 not available (patent issues)                     |
| **Audio codecs**      | MP4 uses AAC (`-c:a aac -b:a 128k`); WebM uses Opus (`-c:a libopus -b:a 128k`)    |
| **Output download**   | Blob created in worker → posted to main thread → `URL.createObjectURL` → download |
| **Abort**             | `AbortController` + worker termination for immediate cancellation                 |

## MVP Scope

1. ✅ Upload + file info display
2. ✅ Compress (quality/CRF slider, format selection)
3. ✅ Trim (start/end time inputs with h:mm:ss parsing)
4. ✅ Resize (preset + custom resolution, pad/crop/stretch fit modes)
5. ✅ Convert format (MP4, WebM, GIF, audio extraction)
6. ✅ Remove/extract audio
7. ✅ Rotate/flip
8. ✅ Quick presets (social media + devices)
9. ✅ Progress bar with log lines + cancel
10. ✅ Output download with size comparison
11. ✅ Web Worker processing (UI stays responsive)

## File Structure

```
plugins/video-editor/
  App.tsx                       Root component. Upload, preview, presets, operation panels, progress, output.
  utils/
    worker.js                   Web Worker — runs FFmpeg load/exec/blob creation off main thread.
    process.ts                  Worker manager — spawns worker, translates messages to ProcessingState, handles abort.
    commands.ts                 Build FFmpeg CLI arg arrays from operation configs. Resize fit logic (pad/crop/stretch).
    types.ts                    Operation config interfaces, VideoMeta, ProcessingState, ResizeFit, helpers.
  components/
    UploadZone.tsx              Drag-and-drop + file picker for video upload.
    VideoPreview.tsx            Native <video> element with unsupported format warning.
    FileInfo.tsx                Input file details (size, resolution, duration, codec).
    QuickPresets.tsx             Grouped preset buttons (Platforms/Devices) with inline SVG icons.
    CompressPanel.tsx           Compression settings: format, CRF quality, target file size mode.
    TrimPanel.tsx               Start/end time inputs with h:mm:ss parsing.
    ResizePanel.tsx             Resolution presets, custom size, maintain aspect toggle, pad/crop fit picker.
    ConvertPanel.tsx            Output format selector (video + audio formats).
    AudioPanel.tsx              Remove audio / extract audio toggle.
    RotatePanel.tsx             Rotation (90°/180°/270°) + horizontal/vertical flip.
    ProgressBar.tsx             Base UI Progress bar with cancel button and last 5 FFmpeg log lines.
    OutputSection.tsx           Output preview + download + file size comparison.
    Skeleton.tsx                Loading skeleton.
```
