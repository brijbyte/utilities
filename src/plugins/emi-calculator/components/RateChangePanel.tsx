import type { Dispatch, SetStateAction } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { RateSegment } from "../utils/emi";
import { NumberField } from "./ui";

interface Props {
  rate: number;
  rateSegments: RateSegment[];
  setRateSegments: Dispatch<SetStateAction<RateSegment[]>>;
}

export function RateChangePanel({
  rate,
  rateSegments,
  setRateSegments,
}: Props) {
  return (
    <>
      <p className="text-[0.625rem] text-text-muted">
        Model floating-rate loans. EMI is recomputed at each rate change.
      </p>

      {/* Base rate */}
      <div className="flex items-center gap-3 p-2 bg-bg-inset rounded text-xs">
        <span className="text-text-muted">
          Month 1–
          {rateSegments.length > 0 ? rateSegments[0].fromMonth - 1 : "end"}:
        </span>
        <span className="text-primary font-medium">{rate}% p.a.</span>
        <span className="text-text-muted">(base rate)</span>
      </div>

      {rateSegments.map((seg, i) => (
        <div key={i} className="flex items-end gap-2">
          <NumberField
            label="From Month"
            value={seg.fromMonth}
            onChange={(v) =>
              setRateSegments((prev) =>
                prev.map((item, j) =>
                  j === i ? { ...item, fromMonth: Math.max(2, v) } : item,
                ),
              )
            }
            min={2}
            className="flex-1"
          />
          <NumberField
            label="Rate (%)"
            value={seg.annualRate}
            onChange={(v) =>
              setRateSegments((prev) =>
                prev.map((item, j) =>
                  j === i ? { ...item, annualRate: Math.max(0, v) } : item,
                ),
              )
            }
            min={0}
            step={0.1}
            unit="%"
            className="flex-1"
          />
          <button
            onClick={() =>
              setRateSegments((prev) => prev.filter((_, j) => j !== i))
            }
            className="p-1.5 text-danger hover:bg-bg-hover rounded transition-colors cursor-pointer mb-0.5"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      <button
        onClick={() =>
          setRateSegments((prev) => [
            ...prev,
            {
              fromMonth:
                prev.length > 0 ? prev[prev.length - 1].fromMonth + 24 : 25,
              annualRate: rate + 0.5,
            },
          ])
        }
        className="inline-flex items-center gap-1 text-[0.625rem] text-primary hover:text-primary-hover cursor-pointer transition-colors self-start"
      >
        <Plus size={10} /> Add Rate Change
      </button>
    </>
  );
}
