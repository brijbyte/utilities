export function MarkdownPreviewSkeleton() {
  return (
    <div className="h-full flex flex-col animate-pulse">
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-2 px-tb-x py-tb-y border-b border-border bg-bg-surface">
        <div className="h-6 w-16 rounded bg-bg-hover" />
        <div className="h-6 w-16 rounded bg-bg-hover" />
        <div className="w-px h-5 bg-border-muted mx-1" />
        <div className="h-6 w-16 rounded bg-bg-hover" />
        <div className="h-6 w-16 rounded bg-bg-hover" />
        <div className="ml-auto flex gap-2">
          <div className="h-6 w-20 rounded bg-bg-hover" />
        </div>
      </div>
      {/* Two-panel skeleton */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 p-4 space-y-2">
          <div className="h-3 w-3/4 rounded bg-bg-hover" />
          <div className="h-3 w-1/2 rounded bg-bg-hover" />
          <div className="h-3 w-5/6 rounded bg-bg-hover" />
          <div className="h-3 w-2/3 rounded bg-bg-hover" />
          <div className="h-3 w-4/5 rounded bg-bg-hover" />
        </div>
        <div className="w-px bg-border-muted" />
        <div className="flex-1 p-4 space-y-3">
          <div className="h-6 w-2/3 rounded bg-bg-hover" />
          <div className="h-3 w-full rounded bg-bg-hover" />
          <div className="h-3 w-5/6 rounded bg-bg-hover" />
          <div className="h-3 w-3/4 rounded bg-bg-hover" />
          <div className="h-3 w-full rounded bg-bg-hover" />
        </div>
      </div>
    </div>
  );
}
