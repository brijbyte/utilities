/**
 * Preview panel — renders parsed markdown HTML with prose styling.
 * Shows a centered spinner while the initial parse is in-flight.
 * Exposes a ref to the scrollable container for scroll sync.
 * Shows a "scroll to top" button when scrolled down significantly.
 */

import { forwardRef, useState, useCallback, useRef } from "react";
import { LoaderCircle, ArrowUp } from "lucide-react";

interface PreviewProps {
  html: string;
  tocHtml: string;
  showToc: boolean;
  ready: boolean;
  onScroll?: () => void;
}

/** Minimum scroll distance (px) before the button appears. */
const SCROLL_THRESHOLD = 300;

const Preview = forwardRef<HTMLDivElement, PreviewProps>(
  ({ html, tocHtml, showToc, ready, onScroll }, ref) => {
    const [showTop, setShowTop] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    /** Merge forwarded ref + internal ref via callback. */
    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        containerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

    const handleScroll = useCallback(() => {
      onScroll?.();
      const el = containerRef.current;
      if (el) setShowTop(el.scrollTop > SCROLL_THRESHOLD);
    }, [onScroll]);

    const scrollToTop = useCallback(() => {
      containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    if (!ready) {
      return (
        <div className="flex-1 flex items-center justify-center gap-2 text-text-muted text-xs">
          <LoaderCircle size={16} className="animate-spin" />
          rendering…
        </div>
      );
    }

    return (
      <div className="flex-1 min-h-0 relative">
        <div
          ref={setRefs}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-auto px-pn-x py-pn-y md-preview"
        >
          {showToc && tocHtml && (
            <div dangerouslySetInnerHTML={{ __html: tocHtml }} />
          )}
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>

        <button
          onClick={scrollToTop}
          aria-label="Scroll to top"
          className={`absolute bottom-4 right-4 z-10 flex items-center justify-center size-8 rounded-full border border-border bg-bg-surface text-text-muted shadow-sm cursor-pointer transition-all duration-200 hover:bg-bg-hover hover:text-text ${
            showTop
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-3 pointer-events-none"
          }`}
        >
          <ArrowUp size={14} />
        </button>
      </div>
    );
  },
);

Preview.displayName = "Preview";

export default Preview;
