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
        <article
          className="blog-prose max-w-2xl mx-auto px-6 pt-10 pb-16"
          itemScope
          itemType="https://schema.org/BlogPosting"
        >
          <h1
            className="text-3xl font-bold mb-1 leading-tight"
            itemProp="headline"
          >
            {meta.title}
          </h1>
          <div className="flex items-center gap-3 flex-wrap text-xs text-text-muted mb-8">
            <time dateTime={meta.date} itemProp="datePublished">
              {formatDate(meta.date)}
            </time>
            {meta.tags.map((t) => (
              <span
                key={t}
                className="bg-accent-subtle text-accent px-2 py-0.5 rounded text-[0.6875rem]"
                itemProp="keywords"
              >
                {t}
              </span>
            ))}
          </div>
          {meta.description && (
            <meta itemProp="description" content={meta.description} />
          )}
          <span
            itemProp="author"
            itemScope
            itemType="https://schema.org/Person"
          >
            <meta itemProp="name" content="brijbyte" />
          </span>
          <div
            itemProp="articleBody"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        </article>
      </div>
    </div>
  );
}
