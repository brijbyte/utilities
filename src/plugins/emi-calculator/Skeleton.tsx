function Bar({ className = "" }: { className?: string }) {
  return <div className={`bg-bg-hover animate-pulse rounded ${className}`} />;
}

export function EmiSkeleton() {
  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto px-pn-x py-6 flex flex-col gap-6">
        {/* Slider fields */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Bar className="w-20 h-3" />
              <Bar className="w-16 h-4" />
            </div>
            <Bar className="w-full h-1.5" />
          </div>
        ))}

        {/* Donut */}
        <div className="flex justify-center">
          <div className="w-44 h-44 rounded-full bg-bg-hover animate-pulse" />
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-1 px-3 py-2 rounded-lg bg-bg-inset"
            >
              <Bar className="w-14 h-2" />
              <Bar className="w-20 h-4" />
            </div>
          ))}
        </div>

        {/* Schedule rows */}
        <div className="flex flex-col gap-2">
          <Bar className="w-36 h-3" />
          {[1, 2, 3, 4, 5].map((i) => (
            <Bar key={i} className="w-full h-10 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
