import { Link } from "react-router";
import type { ArticleMeta } from "../types.ts";
import { BlogHeader } from "./BlogHeader.tsx";

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function BlogIndex({ articles }: { articles: ArticleMeta[] }) {
  return (
    <div className="h-full flex flex-col">
      <BlogHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[42rem] mx-auto px-6 pt-10 pb-16">
          <h1 className="text-2xl font-bold mb-1">blog</h1>
          <p className="text-xs text-text-muted mb-10">
            updates, tips, and deep dives into browser-based developer tools
          </p>
          {articles.length === 0 ? (
            <p className="text-center text-text-muted text-sm py-16">
              No articles yet. Check back soon!
            </p>
          ) : (
            <div className="flex flex-col gap-6">
              {articles.map((a) => (
                <Link
                  key={a.slug}
                  to={`/blog/${a.slug}`}
                  className="block p-5 border border-border-muted rounded-md bg-bg-surface hover:border-border hover:bg-bg-hover transition-colors no-underline text-text"
                >
                  <h2 className="text-sm font-semibold mb-1 leading-snug">
                    {a.title}
                  </h2>
                  {a.description && (
                    <p className="text-xs text-text-muted mb-2 leading-relaxed">
                      {a.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap text-[0.6875rem] text-text-muted">
                    <time dateTime={a.date}>{formatDate(a.date)}</time>
                    {a.tags.map((t) => (
                      <span
                        key={t}
                        className="bg-accent-subtle text-accent px-2 py-0.5 rounded text-[0.6875rem]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
