import { useState, useCallback } from "react";
import { ArrowRight } from "lucide-react";
import type { RgbColor } from "../utils/types";
import { parseCssColor } from "../utils/color";

interface Props {
  onColorChange: (rgb: RgbColor) => void;
}

/**
 * Free-text CSS color input field. Parses any valid CSS color string.
 */
export function CssInput({ onColorChange }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = useCallback(() => {
    if (!value.trim()) {
      setError(false);
      return;
    }
    const parsed = parseCssColor(value);
    if (parsed) {
      onColorChange(parsed);
      setError(false);
    } else {
      setError(true);
    }
  }, [value, onColorChange]);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
        Parse CSS Color
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          placeholder="e.g. oklch(70% 0.15 210), #ff6600, coral..."
          spellCheck={false}
          className={`w-full pr-8 px-2 py-1.5 text-xs bg-bg-inset border rounded font-mono text-text outline-none transition-colors ${
            error
              ? "border-danger focus:border-danger"
              : "border-border-muted focus:border-primary"
          }`}
        />
        <button
          onClick={handleSubmit}
          disabled={!value.trim()}
          title="Apply color"
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded text-text-muted hover:text-primary hover:bg-bg-hover transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ArrowRight size={14} />
        </button>
      </div>
      {error && (
        <span className="text-xs text-danger">
          Could not parse color. Try hex, rgb(), hsl(), oklch(), lab(), color(),
          or a named color.
        </span>
      )}
    </div>
  );
}
