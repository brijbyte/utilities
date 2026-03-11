export function MarkdownPreviewSkeleton() {
  return (
    <div className="h-full flex flex-col animate-pulse">
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-tb px-tb-x py-tb-y border-b border-border bg-bg-surface flex-wrap">
        {/* Left buttons: copy md, clear, open */}
        <div className="h-7 w-20 rounded border border-border bg-bg-surface" />
        <div className="h-7 w-16 rounded border border-border bg-bg-surface" />
        <div className="h-7 w-16 rounded border border-border bg-bg-surface" />

        {/* Right buttons */}
        <div className="ml-auto flex items-center gap-tb">
          <div className="hidden md:block h-7 w-28 rounded border border-border bg-bg-surface" />
          <div className="h-7 w-14 rounded border border-border bg-bg-surface" />
          <div className="w-px h-5 bg-border-muted mx-1 hidden sm:block" />
          <div className="hidden sm:block h-7 w-18 rounded border border-border bg-bg-surface" />
          <div className="hidden sm:block h-7 w-16 rounded border border-border bg-bg-surface" />
          <div className="h-7 w-24 rounded border border-border bg-bg-surface" />
        </div>
      </div>

      {/* Two-panel skeleton */}
      <div className="flex-1 flex min-h-0">
        {/* Left panel — editor */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Panel header: MARKDOWN + stats */}
          <div className="px-pn-x py-pn-lbl border-b border-border-muted flex items-center gap-3">
            <div className="h-2.5 w-20 rounded bg-bg-hover" />
            <div className="h-2 w-48 rounded bg-bg-hover opacity-50" />
          </div>
          {/* Fake editor with gutter + lines */}
          <div className="flex-1 min-h-0 p-3 space-y-1.5">
            {[
              "w-3/5",
              "w-0",
              "w-2/5",
              "w-0",
              "w-1/6",
              "w-0",
              "w-4/5",
              "w-0",
              "w-1/5",
              "w-0",
              "w-3/4",
              "w-3/5",
              "w-5/6",
              "w-0",
              "w-1/4",
              "w-0",
              "w-2/3",
              "w-1/2",
              "w-3/5",
              "w-4/5",
            ].map((w, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-5 text-right shrink-0">
                  <div className="h-2.5 w-full rounded bg-bg-hover opacity-40" />
                </span>
                {w === "w-0" ? (
                  <div className="h-2.5" />
                ) : (
                  <div className={`h-2.5 ${w} rounded bg-bg-hover`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Resize handle */}
        <div className="w-px bg-border-muted" />

        {/* Right panel — preview */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Panel header: PREVIEW */}
          <div className="px-pn-x py-pn-lbl border-b border-border-muted">
            <div className="h-2.5 w-16 rounded bg-bg-hover" />
          </div>
          {/* Fake rendered content */}
          <div className="flex-1 min-h-0 px-pn-x py-pn-y space-y-4">
            {/* H2 */}
            <div className="h-5 w-1/4 rounded bg-bg-hover" />
            {/* Date */}
            <div className="h-3 w-1/6 rounded bg-bg-hover opacity-60" />
            {/* Paragraph */}
            <div className="space-y-1.5">
              <div className="h-3 w-full rounded bg-bg-hover" />
              <div className="h-3 w-4/5 rounded bg-bg-hover" />
            </div>
            {/* H3 */}
            <div className="h-4 w-2/5 rounded bg-bg-hover" />
            {/* List items */}
            <div className="space-y-1.5 pl-4">
              <div className="h-3 w-5/6 rounded bg-bg-hover" />
              <div className="h-3 w-3/4 rounded bg-bg-hover" />
              <div className="h-3 w-4/5 rounded bg-bg-hover" />
            </div>
            {/* H3 */}
            <div className="h-4 w-1/5 rounded bg-bg-hover" />
            {/* Paragraph */}
            <div className="space-y-1.5">
              <div className="h-3 w-full rounded bg-bg-hover" />
              <div className="h-3 w-3/5 rounded bg-bg-hover" />
            </div>
            {/* H3 */}
            <div className="h-4 w-1/4 rounded bg-bg-hover" />
            {/* List items */}
            <div className="space-y-1.5 pl-4">
              <div className="h-3 w-2/3 rounded bg-bg-hover" />
              <div className="h-3 w-3/4 rounded bg-bg-hover" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
