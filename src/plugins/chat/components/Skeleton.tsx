export function ChatSkeleton() {
  return (
    <div className="flex flex-col h-full bg-bg">
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
        <div className="h-4 w-20 rounded bg-bg-hover animate-pulse" />
        <div className="flex-1" />
        <div className="h-6 w-32 rounded bg-bg-hover animate-pulse" />
        <div className="h-6 w-20 rounded bg-bg-hover animate-pulse" />
      </div>
      {/* Messages skeleton */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="h-10 w-3/4 rounded bg-bg-hover animate-pulse" />
        <div className="h-16 w-2/3 rounded bg-bg-hover animate-pulse ml-auto" />
        <div className="h-24 w-3/4 rounded bg-bg-hover animate-pulse" />
      </div>
      {/* Input skeleton */}
      <div className="p-4 border-t border-border">
        <div className="h-10 rounded bg-bg-hover animate-pulse" />
      </div>
    </div>
  );
}
