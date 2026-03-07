function Bar({ className = "" }: { className?: string }) {
  return <div className={`bg-bg-hover animate-pulse ${className}`} />;
}

export function TwoPanelSkeleton() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-tb px-tb-x py-tb-y border-b border-border bg-bg-surface">
        <Bar className="w-16 h-6" />
        <Bar className="w-16 h-6" />
        <Bar className="w-12 h-6 ml-1" />
        <Bar className="w-14 h-6 ml-auto" />
      </div>
      <div className="flex-1 grid grid-cols-2 gap-px bg-border-muted min-h-0">
        <div className="flex flex-col bg-bg-surface">
          <div className="px-pn-x py-mi-x border-b border-border-muted">
            <Bar className="w-10 h-3" />
          </div>
          <div className="px-pn-x py-pn-y flex flex-col gap-2">
            <Bar className="w-3/4 h-3" />
            <Bar className="w-1/2 h-3" />
            <Bar className="w-2/3 h-3" />
          </div>
        </div>
        <div className="flex flex-col bg-bg-surface">
          <div className="px-pn-x py-mi-x border-b border-border-muted">
            <Bar className="w-12 h-3" />
          </div>
          <div className="px-pn-x py-pn-y flex flex-col gap-2">
            <Bar className="w-2/3 h-3" />
            <Bar className="w-1/2 h-3" />
            <Bar className="w-3/5 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
