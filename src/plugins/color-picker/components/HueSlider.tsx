import { useId } from "react";
import { Slider } from "@base-ui/react/slider";

interface Props {
  hue: number;
  onChange: (hue: number) => void;
}

/**
 * Horizontal hue slider (0–360) using Base UI Slider.
 * The track is a rainbow gradient; the indicator is hidden.
 */
export function HueSlider({ hue, onChange }: Props) {
  const labelId = useId();

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <label
          id={labelId}
          className="text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer"
        >
          Hue
        </label>
        <span className="text-xs text-text-muted">
          The base color on the color wheel (0–360°)
        </span>
      </div>
      <Slider.Root
        value={hue}
        onValueChange={onChange}
        min={0}
        max={360}
        step={1}
        aria-labelledby={labelId}
      >
        <Slider.Control className="flex items-center h-4 w-full cursor-pointer touch-none">
          <Slider.Track
            className="relative h-3 w-full rounded-full"
            style={{
              background:
                "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
            }}
          >
            <Slider.Thumb className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)] bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
    </div>
  );
}
