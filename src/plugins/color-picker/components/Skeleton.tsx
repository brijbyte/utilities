export function ColorPickerSkeleton() {
  return (
    <div className="h-full overflow-auto animate-pulse">
      <div className="max-w-4xl mx-auto p-4 flex flex-col gap-4">
        {/* ── Top section: picker + controls ── */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left: saturation panel + hue + alpha */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            <div className="w-full aspect-[4/3] rounded-lg bg-bg-hover" />
            <div className="h-5 rounded-full bg-bg-hover" />
            <div className="h-5 rounded-full bg-bg-hover" />
          </div>

          {/* Right: preview + channels + parse input */}
          <div className="w-full lg:w-64 flex flex-col gap-3 shrink-0">
            {/* Color preview */}
            <div className="flex gap-3 items-start">
              <div className="w-16 h-16 rounded-lg bg-bg-hover shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="h-4 w-24 rounded bg-bg-hover" />
                <div className="h-3 w-32 rounded bg-bg-hover" />
              </div>
            </div>

            {/* Channels label + model select */}
            <div className="flex items-center gap-2">
              <div className="h-3 w-16 rounded bg-bg-hover" />
              <div className="ml-auto h-6 w-16 rounded bg-bg-hover" />
            </div>

            {/* 3 channel sliders */}
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-bg-hover shrink-0" />
                <div className="flex-1 h-4 rounded-full bg-bg-hover" />
                <div className="w-10 h-6 rounded bg-bg-hover shrink-0" />
              </div>
            ))}

            {/* Parse CSS color input */}
            <div className="flex flex-col gap-1">
              <div className="h-3 w-28 rounded bg-bg-hover" />
              <div className="h-8 rounded bg-bg-hover" />
            </div>
          </div>
        </div>

        {/* ── Gamut info ── */}
        <div className="flex flex-col gap-1.5">
          <div className="h-3 w-28 rounded bg-bg-hover" />
          <div className="flex gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-6 w-20 rounded bg-bg-hover" />
            ))}
          </div>
        </div>

        {/* ── Collapsible panels ── */}
        <div className="flex flex-col gap-2">
          {[
            "CSS Values",
            "Color Harmony",
            "Color Scale",
            "Contrast Checker",
            "Color Blindness",
            "Color Details",
          ].map((_, i) => (
            <div
              key={i}
              className="h-10 rounded-lg border border-border-muted bg-bg-surface"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
