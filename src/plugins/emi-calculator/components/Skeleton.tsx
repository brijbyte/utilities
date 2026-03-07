function Bar({ className = "" }: { className?: string }) {
  return <div className={`bg-bg-hover animate-pulse rounded ${className}`} />;
}

export function EmiSkeleton() {
  return (
    <div className="h-full overflow-auto">
      <div className="max-w-6xl mx-auto px-pn-x py-6 flex flex-col gap-6">
        {/* Solve mode toggle + currency picker */}
        <div className="flex items-center gap-2">
          <Bar className="w-28 h-7 rounded" />
          <Bar className="w-32 h-7 rounded" />
          <Bar className="ml-auto w-32 h-7 rounded" />
        </div>

        {/* 3 Slider fields */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Bar className="w-20 h-3" />
              <Bar className="w-24 h-4" />
            </div>
            <Bar className="w-full h-1.5 rounded-full" />
            <div className="flex justify-between">
              <Bar className="w-14 h-2" />
              <Bar className="w-14 h-2" />
            </div>
          </div>
        ))}

        {/* Month/Year selector */}
        <div className="flex flex-col gap-2">
          <Bar className="w-24 h-3" />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Bar className="w-10 h-2" />
              <Bar className="w-full h-7 rounded" />
            </div>
            <div className="flex flex-col gap-1">
              <Bar className="w-10 h-2" />
              <Bar className="w-full h-7 rounded" />
            </div>
          </div>
        </div>

        {/* 4 Collapsible accordion headers */}
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg"
            >
              <Bar className="w-3 h-3 rounded-sm shrink-0" />
              <Bar className="w-3 h-3 rounded-sm shrink-0" />
              <Bar className="w-24 h-3" />
            </div>
          ))}
        </div>

        {/* Donut chart */}
        <div className="flex justify-center">
          <div className="w-40 h-40 rounded-full bg-bg-hover animate-pulse" />
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 justify-center">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-bg-hover animate-pulse" />
              <Bar className="w-12 h-2" />
            </div>
          ))}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-1 px-3 py-2 rounded-lg bg-bg-inset"
            >
              <Bar className="w-14 h-2" />
              <Bar className="w-20 h-4" />
              <Bar className="w-10 h-2" />
            </div>
          ))}
        </div>

        {/* Charts section */}
        <div className="flex flex-col gap-4">
          <Bar className="w-12 h-3" />
          <div className="flex flex-col gap-2">
            <Bar className="w-28 h-3" />
            <Bar className="w-full h-50 rounded-lg" />
          </div>
          <div className="flex flex-col gap-2">
            <Bar className="w-40 h-3" />
            <Bar className="w-full h-50 rounded-lg" />
          </div>
        </div>

        {/* Schedule section */}
        <div className="flex flex-col gap-2">
          <Bar className="w-36 h-3" />
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg"
            >
              <Bar className="w-16 h-3" />
              <Bar className="ml-auto w-12 h-2" />
              <Bar className="w-12 h-2" />
              <Bar className="w-12 h-2" />
              <Bar className="w-3 h-3 rounded-sm" />
            </div>
          ))}
        </div>

        {/* More Tools divider */}
        <div className="border-t border-border-muted pt-4 flex flex-col gap-3">
          <Bar className="w-20 h-3" />
          <div className="flex gap-1.5">
            <Bar className="w-24 h-7 rounded-full" />
            <Bar className="w-32 h-7 rounded-full" />
            <Bar className="w-24 h-7 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
