# Video Processor Plugin — FFmpeg WASM

## Core Concept

Upload a video → pick operations → preview settings → process via FFmpeg WASM → download result. All client-side, no server upload needed.

## Tier 1 — MVP Features (High Impact, Straightforward)

1. **Compress / Transcode**
   - Output format: MP4 (H.264), WebM (VP8/VP9)
   - Quality preset slider: Low / Medium / High / Custom CRF
   - Target file size mode (e.g., "make it under 10MB")

2. **Trim / Cut**
   - Visual timeline with start/end markers
   - Preview frames at cut points
   - Extract a clip from a longer video

3. **Resize / Scale**
   - Preset resolutions: 1080p, 720p, 480p, 360p, Custom
   - Maintain aspect ratio toggle
   - Scale by percentage

4. **Convert Format**
   - MP4 ↔ WebM ↔ GIF ↔ AVI ↔ MOV
   - Audio format extraction: MP3, AAC, WAV, OGG

5. **Remove Audio**
   - Strip audio track (common need for sharing silent clips)

6. **Extract Audio**
   - Pull audio track out as MP3/AAC/WAV

## Tier 2 — Nice to Have (Moderate Complexity)

7. **Change Speed**
   - 0.25x, 0.5x, 1.5x, 2x, 4x
   - With/without pitch correction for audio

8. **Adjust FPS**
   - Change frame rate (60→30, 30→24, etc.)
   - Useful for reducing file size or matching platform requirements

9. **Crop**
   - Visual crop area selector on a video frame
   - Preset aspect ratios: 16:9, 9:16 (vertical), 1:1 (square), 4:3

10. **Rotate / Flip**
    - 90°, 180°, 270° rotation
    - Horizontal/vertical flip

11. **Video to GIF**
    - Configurable FPS, width, quality
    - Start/end time selection
    - Palette generation for better GIF quality

12. **Add Watermark / Overlay**
    - Image overlay with position picker (corners, center)
    - Opacity control

## Tier 3 — Advanced (More Complex)

13. **Concatenate / Merge**
    - Join multiple video files together
    - Drag-to-reorder

14. **Filters**
    - Brightness, contrast, saturation, hue adjustments
    - Grayscale, sepia, blur, sharpen
    - Fade in/out

15. **Subtitles**
    - Burn SRT/VTT subtitles into video
    - Font size/color customization

16. **Thumbnail / Frame Extraction**
    - Extract frame at timestamp as PNG/JPG
    - Generate thumbnail grid (contact sheet)

17. **Metadata Viewer/Editor**
    - Show codec, bitrate, duration, resolution, FPS
    - Strip metadata for privacy

## UX Design

- **Single-page layout** — not two-panel since video is visual
- **Upload zone** at top with drag-and-drop + file picker
- **Video preview** with the native `<video>` element for the input
- **Operations as collapsible panels** — pick what you want, configure, process
- **Progress bar** — FFmpeg WASM reports progress via log parsing
- **File info card** — Show input file details (size, resolution, codec, duration, bitrate)
- **Before/After comparison** — Show input vs output file sizes and properties
- **Processing in Web Worker** — Keep UI responsive (ffmpeg.wasm supports this)
- **Multi-threaded core** (`@ffmpeg/core-mt`) for faster processing when `SharedArrayBuffer` is available, fallback to single-threaded

## Technical Considerations

| Concern               | Approach                                                                          |
| --------------------- | --------------------------------------------------------------------------------- |
| **WASM size**         | `@ffmpeg/core` is ~30MB — lazy-load only when user opens plugin                   |
| **Memory**            | Large videos can OOM in browser — show file size warnings (suggest <500MB)        |
| **SharedArrayBuffer** | Needed for multi-threading; requires `Cross-Origin-Isolation` headers (COOP/COEP) |
| **Progress**          | Parse FFmpeg log output for `time=` to compute %                                  |
| **Codec support**     | FFmpeg WASM supports H.264, VP8/VP9, but NOT H.265 (patent issues)                |
| **Output download**   | Read output from FFmpeg virtual FS → create blob URL → download                   |

## MVP Scope

1. ✅ Upload + file info display
2. ✅ Compress (quality/CRF slider, format selection)
3. ✅ Trim (start/end time inputs)
4. ✅ Resize (preset + custom resolution)
5. ✅ Convert format (MP4, WebM, GIF, audio extraction)
6. ✅ Remove/extract audio
7. ✅ Rotate/flip
8. ✅ Progress bar + output download

## File Structure

```
plugins/video-editor/
  App.tsx                       Root component. Upload zone, video preview, operations, output.
  utils/
    ffmpeg.ts                   FFmpeg WASM setup, load, exec, progress parsing.
    commands.ts                 Build FFmpeg command arrays from operation configs.
    probe.ts                    Extract video metadata (duration, resolution, codec, etc).
    types.ts                    Operation config interfaces, VideoMeta, OutputResult.
  components/
    UploadZone.tsx              Drag-and-drop + file picker for video upload.
    VideoPreview.tsx            Native <video> element with metadata display.
    FileInfo.tsx                Input/output file info cards (size, resolution, codec, etc).
    CompressPanel.tsx           Compression settings: format, quality/CRF, target size.
    TrimPanel.tsx               Start/end time inputs for trimming.
    ResizePanel.tsx             Resolution presets + custom size.
    ConvertPanel.tsx            Output format selector (video + audio formats).
    AudioPanel.tsx              Remove audio / extract audio toggle.
    RotatePanel.tsx             Rotation + flip controls.
    ProgressBar.tsx             Processing progress with cancel button.
    OutputSection.tsx           Output preview + download + file comparison.
    Skeleton.tsx                Loading skeleton.
```
