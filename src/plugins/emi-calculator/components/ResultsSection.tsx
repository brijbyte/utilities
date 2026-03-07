import type { ReactNode } from "react";
import type { EmiResult } from "../utils/emi";
import type { Fmt } from "../utils/format";
import { SummaryCard } from "./ui";

interface Props {
  result: EmiResult;
  solveMode: "emi" | "tenure";
  computedTenure: number;
  activeTenure: number;
  hasFees: boolean;
  totalFees: number;
  effectiveApr: number;
  rate: number;
  prepaymentSavings: {
    interestSaved: number;
    tenureReduced: number;
  } | null;
  fmt: Fmt;
  actions?: ReactNode;
}

export function ResultsSection({
  result,
  solveMode,
  computedTenure,
  activeTenure,
  hasFees,
  totalFees,
  effectiveApr,
  rate,
  prepaymentSavings,
  fmt,
  actions,
}: Props) {
  if (result.emi <= 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs text-text-muted uppercase tracking-wider">
          Results
        </h2>
        {actions}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <SummaryCard
          label="Monthly EMI"
          value={fmt.number(result.emi)}
          color="text-primary"
        />
        <SummaryCard
          label="Total Interest"
          value={fmt.number(result.totalInterest)}
        />
        <SummaryCard
          label="Total Payment"
          value={fmt.number(result.totalPayment)}
        />
        <SummaryCard
          label="Effective Tenure"
          value={fmt.tenure(result.effectiveTenure)}
          sub={
            solveMode === "tenure"
              ? `${computedTenure} months`
              : `${activeTenure} months`
          }
        />
      </div>

      {/* Prepayment savings */}
      {prepaymentSavings && (
        <div className="grid grid-cols-2 gap-2">
          <SummaryCard
            label="Interest Saved"
            value={fmt.number(prepaymentSavings.interestSaved)}
            color="text-success"
          />
          <SummaryCard
            label="Tenure Reduced"
            value={`${prepaymentSavings.tenureReduced} months`}
            color="text-success"
            sub={fmt.tenure(prepaymentSavings.tenureReduced)}
          />
        </div>
      )}

      {/* Fees summary */}
      {hasFees && (
        <div className="grid grid-cols-2 gap-2">
          <SummaryCard
            label="Total Fees"
            value={fmt.number(totalFees)}
            color="text-danger"
          />
          <SummaryCard
            label="Effective APR"
            value={fmt.percent(effectiveApr)}
            sub={`vs ${fmt.percent(rate)} nominal`}
          />
        </div>
      )}
    </div>
  );
}
