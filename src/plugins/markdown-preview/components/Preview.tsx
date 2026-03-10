/**
 * Preview panel — renders parsed markdown HTML with prose styling.
 * Shows a centered spinner while the initial parse is in-flight.
 * Exposes a ref to the scrollable container for scroll sync.
 */

import { forwardRef } from "react";
import { LoaderCircle } from "lucide-react";

interface PreviewProps {
  html: string;
  tocHtml: string;
  showToc: boolean;
  ready: boolean;
  onScroll: () => void;
}

const Preview = forwardRef<HTMLDivElement, PreviewProps>(
  ({ html, tocHtml, showToc, ready, onScroll }, ref) => {
    if (!ready) {
      return (
        <div className="flex-1 flex items-center justify-center gap-2 text-text-muted text-xs">
          <LoaderCircle size={16} className="animate-spin" />
          rendering…
        </div>
      );
    }

    return (
      <div
        ref={ref}
        onScroll={onScroll}
        className="flex-1 overflow-auto px-pn-x py-pn-y md-preview"
      >
        {showToc && tocHtml && (
          <div dangerouslySetInnerHTML={{ __html: tocHtml }} />
        )}
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    );
  },
);

Preview.displayName = "Preview";

export default Preview;
