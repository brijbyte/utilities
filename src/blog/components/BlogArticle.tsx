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

export function BlogArticle({
  meta,
  contentHtml,
}: {
  meta: ArticleMeta;
  contentHtml: string;
}) {
  return (
    <div className="h-full flex flex-col">
      <BlogHeader articleTitle={meta.title} />
      <div className="flex-1 overflow-y-auto">
        <article className="blog-prose max-w-[42rem] mx-auto px-6 pt-10 pb-16">
          <h1 className="text-3xl font-bold mb-1 leading-tight">
            {meta.title}
          </h1>
          <div className="flex items-center gap-3 flex-wrap text-xs text-text-muted mb-8">
            <time dateTime={meta.date}>{formatDate(meta.date)}</time>
            {meta.tags.map((t) => (
              <span
                key={t}
                className="bg-accent-subtle text-accent px-2 py-0.5 rounded text-[0.6875rem]"
              >
                {t}
              </span>
            ))}
          </div>
          <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
        </article>
      </div>
    </div>
  );
}
