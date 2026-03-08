import { useState, useCallback } from "react";
import { Info, Film } from "lucide-react";

// Formats browsers can generally play via <video>
const PLAYABLE_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime", // MOV — Safari only, but worth trying
]);

const PLAYABLE_EXTENSIONS = new Set([
  "mp4",
  "m4v",
  "webm",
  "ogg",
  "ogv",
  "mov",
]);

function canBrowserPlay(type: string, name: string): boolean {
  if (PLAYABLE_TYPES.has(type)) return true;
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return PLAYABLE_EXTENSIONS.has(ext);
}

interface VideoPreviewProps {
  url: string;
  type: string;
  name: string;
}

export function VideoPreview({ url, type, name }: VideoPreviewProps) {
  const [playbackError, setPlaybackError] = useState(false);
  const likelyPlayable = canBrowserPlay(type, name);

  const handleError = useCallback(() => {
    setPlaybackError(true);
  }, []);

  const ext = name.split(".").pop()?.toUpperCase() ?? "Video";

  // If we already know the browser can't play it, don't even render the
  // <video> element — it shows an ugly broken player on mobile Safari.
  if (!likelyPlayable) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border-muted bg-bg-inset text-xs text-text-muted">
        <Film size={13} className="shrink-0 text-text-muted" />
        <span>
          {ext} can't be previewed in your browser. Processing will still work —
          FFmpeg handles all formats.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <video
        src={url}
        controls
        onError={handleError}
        className="w-full max-h-72 rounded-lg bg-black"
      />
      {playbackError && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border-muted bg-bg-inset text-xs text-text-muted">
          <Info size={13} className="shrink-0" />
          <span>
            {ext} preview failed. Processing will still work — FFmpeg handles
            all formats.
          </span>
        </div>
      )}
    </div>
  );
}
