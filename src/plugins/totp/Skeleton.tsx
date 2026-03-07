export function Bar({ className = "" }: { className?: string }) {
  return <div className={`bg-bg-hover animate-pulse ${className}`} />;
}

export function TotpGridSkeleton() {
  return (
    <div className="flex-1 p-pn-y px-pn-x overflow-auto flex flex-col gap-3 w-full">
      <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-bg-surface border border-border p-3 rounded-xl flex items-center gap-3 relative overflow-hidden h-[74px]"
          >
            <Bar className="w-10 h-10 rounded-lg shrink-0" />
            <div className="flex-1 flex flex-col gap-1 pt-1">
              <Bar className="w-24 h-3" />
              <Bar className="w-16 h-2" />
              <Bar className="w-32 h-6 mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TotpAppSkeleton() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-tb px-tb-x py-tb-y border-b border-border bg-bg-surface">
        <Bar className="w-24 h-4" />
        <div className="ml-auto flex gap-tb">
          <Bar className="w-16 h-6" />
          <Bar className="w-20 h-6" />
        </div>
      </div>
      <TotpGridSkeleton />
    </div>
  );
}
