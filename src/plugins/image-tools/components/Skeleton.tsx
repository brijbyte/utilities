function Bar({ className = "" }: { className?: string }) {
  return <div className={`bg-bg-hover animate-pulse rounded ${className}`} />;
}

export function ImageToolsSkeleton() {
  return (
    <div className="h-full flex flex-col">
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-tb px-tb-x py-tb-y border-b border-border bg-bg-surface">
        <Bar className="w-20 h-6" />
        <Bar className="w-16 h-6 ml-auto" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto flex flex-col gap-4">
          {/* Upload zone skeleton */}
          <div className="flex flex-col items-center justify-center gap-4 p-10 border-2 border-dashed border-border-muted rounded-lg">
            <Bar className="w-16 h-16 rounded-full" />
            <Bar className="w-48 h-4" />
            <Bar className="w-56 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
