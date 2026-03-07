import type { AffordabilityInput, AffordabilityResult } from "../utils/emi";
import type { Fmt } from "../utils/format";
import { NumberField, SummaryCard, Section } from "./ui";

interface AffordabilityTabProps {
  affordInput: AffordabilityInput;
  setAffordInput: (
    fn: (prev: AffordabilityInput) => AffordabilityInput,
  ) => void;
  affordResult: AffordabilityResult;
  rate: number;
  activeTenure: number;
  fmt: Fmt;
}

export function AffordabilityTab({
  affordInput,
  setAffordInput,
  affordResult,
  rate,
  activeTenure,
  fmt,
}: AffordabilityTabProps) {
  return (
    <Section title="Affordability Calculator">
      <p className="text-xs text-text-muted">
        Based on your income and obligations, see the maximum EMI and loan
        amount you can safely afford.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Monthly Income"
          value={affordInput.monthlyIncome}
          onChange={(v) => setAffordInput((a) => ({ ...a, monthlyIncome: v }))}
          min={0}
        />
        <NumberField
          label="Existing EMIs"
          value={affordInput.existingEmis}
          onChange={(v) => setAffordInput((a) => ({ ...a, existingEmis: v }))}
          min={0}
        />
        <NumberField
          label="Other Obligations"
          value={affordInput.otherObligations}
          onChange={(v) =>
            setAffordInput((a) => ({ ...a, otherObligations: v }))
          }
          min={0}
        />
        <NumberField
          label="FOIR (max obligation %)"
          value={affordInput.foirPercent}
          onChange={(v) => setAffordInput((a) => ({ ...a, foirPercent: v }))}
          min={10}
          max={80}
          unit="%"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <SummaryCard
          label="Max EMI"
          value={fmt.number(affordResult.maxEmi)}
          color="text-primary"
          sub={`${fmt.percent(affordInput.foirPercent)} of income`}
        />
        <SummaryCard
          label="Max Loan Amount"
          value={fmt.compact(affordResult.maxLoanAmount)}
          sub={`at ${rate}% for ${fmt.tenure(activeTenure)}`}
        />
        <SummaryCard
          label="Current DTI"
          value={fmt.percent(affordResult.dtiPercent)}
          color={
            affordResult.dtiPercent > 50
              ? "text-danger"
              : affordResult.dtiPercent > 35
                ? "text-text"
                : "text-success"
          }
        />
        <SummaryCard
          label="Assessment"
          value={
            affordResult.recommendation === "safe"
              ? "✓ Safe"
              : affordResult.recommendation === "moderate"
                ? "⚠ Moderate"
                : "✗ Risky"
          }
          color={
            affordResult.recommendation === "safe"
              ? "text-success"
              : affordResult.recommendation === "moderate"
                ? "text-text"
                : "text-danger"
          }
        />
      </div>

      {/* Visual bar */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[10px] text-text-muted">
          <span>Income utilisation</span>
          <span>
            {fmt.percent(
              affordResult.dtiPercent +
                (affordResult.maxEmi / affordInput.monthlyIncome) * 100,
            )}
          </span>
        </div>
        <div className="h-3 bg-bg-inset rounded-full overflow-hidden flex">
          <div
            className="h-full bg-text-muted/30"
            style={{
              width: `${Math.min(100, affordResult.dtiPercent)}%`,
            }}
          />
          <div
            className="h-full bg-primary/50"
            style={{
              width: `${Math.min(100 - affordResult.dtiPercent, (affordResult.maxEmi / affordInput.monthlyIncome) * 100)}%`,
            }}
          />
        </div>
        <div className="flex gap-3 text-[10px] text-text-muted">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm bg-text-muted/30" />
            Existing obligations
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm bg-primary/50" />
            Available for EMI
          </span>
        </div>
      </div>
    </Section>
  );
}
