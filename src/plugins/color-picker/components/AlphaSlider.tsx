import { useId } from "react";
import { Slider } from "@base-ui/react/slider";

interface Props {
  alpha: number;
  rgbString: string; // e.g. "255, 0, 128"
  onChange: (alpha: number) => void;
}

/**
 * Horizontal alpha slider (0–1) using Base UI Slider.
 * Track shows a checkerboard overlaid with the color's transparency gradient.
 *
 * The gradient is on an inner div with overflow-hidden (for rounded clipping)
 * so the Thumb — which is taller than the track — doesn't get clipped.
 */
export function AlphaSlider({ alpha, rgbString, onChange }: Props) {
  const labelId = useId();

  return (
    <div className="flex flex-col gap-1">
      <label
        id={labelId}
        className="text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer"
      >
        Opacity
      </label>
      <Slider.Root
        value={alpha}
        onValueChange={onChange}
        min={0}
        max={1}
        step={0.01}
        aria-labelledby={labelId}
      >
        <Slider.Control className="flex items-center h-4 w-full cursor-pointer touch-none">
          <Slider.Track className="relative h-3 w-full rounded-full">
            {/* Inner div carries the gradient + checkerboard and clips to rounded shape */}
            <div
              className="absolute inset-0 rounded-full overflow-hidden"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(${rgbString}, 0), rgba(${rgbString}, 1)),
                  repeating-conic-gradient(#e0e0e0 0% 25%, #ffffff 0% 50%)
                `,
                backgroundSize: "100% 100%, 8px 8px",
              }}
            />
            <Slider.Thumb className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)] bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
    </div>
  );
}
