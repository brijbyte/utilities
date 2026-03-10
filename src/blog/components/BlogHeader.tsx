import { Link } from "react-router";

export function BlogHeader({ articleTitle }: { articleTitle?: string }) {
  return (
    <header className="h-hdr border-b border-border flex items-center justify-between px-4 bg-bg-surface text-xs">
      <div className="flex items-center gap-2 min-w-0">
        <Link
          to="/"
          className="text-text-muted hover:text-text transition-colors no-underline shrink-0"
        >
          home
        </Link>
        <span className="shrink-0">&nbsp;/</span>
        {articleTitle ? (
          <>
            <Link
              to="/blog"
              className="text-text-muted hover:text-text transition-colors no-underline shrink-0"
            >
              &nbsp;blog
            </Link>
            <span className="shrink-0">&nbsp;/</span>
            <span className="text-text truncate">&nbsp;{articleTitle}</span>
          </>
        ) : (
          <span className="text-text">&nbsp;blog</span>
        )}
      </div>
    </header>
  );
}
