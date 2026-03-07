import type { Dispatch, SetStateAction } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Select } from "../../../components/Select";
import type {
  EmiResult,
  LumpSumPrepayment,
  RecurringPrepayment,
} from "../utils/emi";
import type { Fmt } from "../utils/format";
import { NumberField, SummaryCard } from "./ui";

const FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
];

interface Props {
  lumpSums: LumpSumPrepayment[];
  setLumpSums: Dispatch<SetStateAction<LumpSumPrepayment[]>>;
  recurringPrepayments: RecurringPrepayment[];
  setRecurringPrepayments: Dispatch<SetStateAction<RecurringPrepayment[]>>;
  prepayStrategy: "reduce-tenure" | "reduce-emi";
  setPrepayStrategy: (v: "reduce-tenure" | "reduce-emi") => void;
  result: EmiResult;
  baselineResult: EmiResult | null;
  activeTenure: number;
  prepaymentSavings: {
    interestSaved: number;
    tenureReduced: number;
  } | null;
  fmt: Fmt;
}

export function PrepaymentPanel({
  lumpSums,
  setLumpSums,
  recurringPrepayments,
  setRecurringPrepayments,
  prepayStrategy,
  setPrepayStrategy,
  result,
  baselineResult,
  activeTenure,
  prepaymentSavings,
  fmt,
}: Props) {
  return (
    <>
      {/* Strategy */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted">Strategy:</span>
        <button
          onClick={() => setPrepayStrategy("reduce-tenure")}
          className={`px-2 py-1 text-xs rounded border cursor-pointer transition-colors ${
            prepayStrategy === "reduce-tenure"
              ? "bg-primary text-primary-text border-primary"
              : "bg-bg-surface text-text-muted border-border hover:bg-bg-hover"
          }`}
        >
          Reduce Tenure
        </button>
        <button
          onClick={() => setPrepayStrategy("reduce-emi")}
          className={`px-2 py-1 text-xs rounded border cursor-pointer transition-colors ${
            prepayStrategy === "reduce-emi"
              ? "bg-primary text-primary-text border-primary"
              : "bg-bg-surface text-text-muted border-border hover:bg-bg-hover"
          }`}
        >
          Reduce EMI
        </button>
      </div>

      {/* Lump sum */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-text">Lump Sum</h3>
          <button
            onClick={() =>
              setLumpSums((prev) => [...prev, { month: 12, amount: 100000 }])
            }
            className="inline-flex items-center gap-1 text-[10px] text-primary hover:text-primary-hover cursor-pointer transition-colors"
          >
            <Plus size={10} /> Add
          </button>
        </div>
        {lumpSums.map((ls, i) => (
          <div key={i} className="flex items-end gap-2">
            <NumberField
              label="At Month"
              value={ls.month}
              onChange={(v) =>
                setLumpSums((prev) =>
                  prev.map((item, j) =>
                    j === i ? { ...item, month: Math.max(1, v) } : item,
                  ),
                )
              }
              min={1}
              className="flex-1"
            />
            <NumberField
              label="Amount"
              value={ls.amount}
              onChange={(v) =>
                setLumpSums((prev) =>
                  prev.map((item, j) =>
                    j === i ? { ...item, amount: Math.max(0, v) } : item,
                  ),
                )
              }
              min={0}
              className="flex-1"
            />
            <button
              onClick={() =>
                setLumpSums((prev) => prev.filter((_, j) => j !== i))
              }
              className="p-1.5 text-danger hover:bg-bg-hover rounded transition-colors cursor-pointer mb-0.5"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Recurring */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-text">Recurring</h3>
          <button
            onClick={() =>
              setRecurringPrepayments((prev) => [
                ...prev,
                { amount: 10000, frequency: "annually", startMonth: 12 },
              ])
            }
            className="inline-flex items-center gap-1 text-[10px] text-primary hover:text-primary-hover cursor-pointer transition-colors"
          >
            <Plus size={10} /> Add
          </button>
        </div>
        {recurringPrepayments.map((rec, i) => (
          <div key={i} className="flex items-end gap-2 flex-wrap">
            <NumberField
              label="Amount"
              value={rec.amount}
              onChange={(v) =>
                setRecurringPrepayments((prev) =>
                  prev.map((item, j) =>
                    j === i ? { ...item, amount: Math.max(0, v) } : item,
                  ),
                )
              }
              min={0}
              className="flex-1 min-w-[100px]"
            />
            <div className="flex flex-col gap-1 flex-1 min-w-[100px]">
              <span className="text-xs text-text-muted">Frequency</span>
              <Select
                value={rec.frequency}
                onValueChange={(v) =>
                  setRecurringPrepayments((prev) =>
                    prev.map((item, j) =>
                      j === i
                        ? {
                            ...item,
                            frequency: v as RecurringPrepayment["frequency"],
                          }
                        : item,
                    ),
                  )
                }
                options={FREQUENCY_OPTIONS}
                align="start"
                popupMinWidth="min-w-32"
              />
            </div>
            <NumberField
              label="Start Month"
              value={rec.startMonth}
              onChange={(v) =>
                setRecurringPrepayments((prev) =>
                  prev.map((item, j) =>
                    j === i ? { ...item, startMonth: Math.max(1, v) } : item,
                  ),
                )
              }
              min={1}
              className="flex-1 min-w-[80px]"
            />
            <button
              onClick={() =>
                setRecurringPrepayments((prev) =>
                  prev.filter((_, j) => j !== i),
                )
              }
              className="p-1.5 text-danger hover:bg-bg-hover rounded transition-colors cursor-pointer mb-0.5"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Savings summary */}
      {prepaymentSavings && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2 bg-success/5 rounded-lg">
          <SummaryCard
            label="Interest Saved"
            value={fmt.number(prepaymentSavings.interestSaved)}
            color="text-success"
          />
          <SummaryCard
            label="Tenure Reduced"
            value={`${prepaymentSavings.tenureReduced} mo`}
            color="text-success"
            sub={fmt.tenure(prepaymentSavings.tenureReduced)}
          />
          <SummaryCard
            label="Total Prepaid"
            value={fmt.number(result.totalPrepayment)}
          />
          <SummaryCard
            label="New Tenure"
            value={fmt.tenure(result.effectiveTenure)}
            sub={`was ${fmt.tenure(baselineResult?.effectiveTenure ?? activeTenure)}`}
          />
        </div>
      )}
    </>
  );
}
