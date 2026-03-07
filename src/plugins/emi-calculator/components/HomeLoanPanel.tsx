import type { EmiResult, HomePurchaseResult } from "../utils/emi";
import type { Fmt } from "../utils/format";
import { SliderField, SummaryCard } from "./ui";

interface Props {
  homeMode: boolean;
  setHomeMode: (v: boolean) => void;
  propertyPrice: number;
  setPropertyPrice: (v: number) => void;
  downPaymentPct: number;
  setDownPaymentPct: (v: number) => void;
  homeResult: HomePurchaseResult | null;
  result: EmiResult;
  totalFees: number;
  fmt: Fmt;
}

export function HomeLoanPanel({
  homeMode,
  setHomeMode,
  propertyPrice,
  setPropertyPrice,
  downPaymentPct,
  setDownPaymentPct,
  homeResult,
  result,
  totalFees,
  fmt,
}: Props) {
  return (
    <>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={homeMode}
            onChange={(e) => setHomeMode(e.target.checked)}
            className="accent-primary"
          />
          Derive loan amount from property price & down payment
        </label>
      </div>

      {homeMode && (
        <div className="flex flex-col gap-4">
          <SliderField
            label="Property Price"
            value={propertyPrice}
            min={500000}
            max={200000000}
            step={100000}
            onChange={setPropertyPrice}
            fmt={fmt}
          />
          <SliderField
            label="Down Payment"
            value={downPaymentPct}
            min={0}
            max={90}
            step={1}
            unit="%"
            onChange={setDownPaymentPct}
            fmt={fmt}
          />

          {homeResult && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <SummaryCard
                label="Down Payment"
                value={fmt.number(homeResult.downPayment)}
                sub={`${downPaymentPct}% of price`}
              />
              <SummaryCard
                label="Loan Amount"
                value={fmt.number(homeResult.loanAmount)}
                color="text-primary"
              />
              <SummaryCard
                label="LTV Ratio"
                value={fmt.percent(homeResult.ltvRatio)}
                color={
                  homeResult.ltvRatio > 80 ? "text-danger" : "text-success"
                }
                sub={homeResult.ltvRatio > 80 ? "High LTV" : "Good LTV"}
              />
              <SummaryCard
                label="Stamp Duty (est.)"
                value={fmt.number(homeResult.stampDutyEstimate)}
                sub="~5% estimate"
              />
            </div>
          )}

          {result.emi > 0 && homeResult && (
            <SummaryCard
              label="Total Ownership Cost"
              value={fmt.number(
                result.totalPayment +
                  homeResult.downPayment +
                  homeResult.stampDutyEstimate +
                  totalFees,
              )}
              sub="Incl. EMIs, down payment, stamp duty, fees"
            />
          )}
        </div>
      )}
    </>
  );
}
