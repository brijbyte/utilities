import type { EmiResult, FeeConfig } from "../utils/emi";
import type { Fmt } from "../utils/format";
import { NumberField, SummaryCard } from "./ui";

interface Props {
  fees: FeeConfig;
  setFees: (fn: (prev: FeeConfig) => FeeConfig) => void;
  effectivePrincipal: number;
  totalFees: number;
  effectiveApr: number;
  rate: number;
  result: EmiResult;
  fmt: Fmt;
}

export function FeesPanel({
  fees,
  setFees,
  effectivePrincipal,
  totalFees,
  effectiveApr,
  rate,
  result,
  fmt,
}: Props) {
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <NumberField
          label="Processing Fee (%)"
          value={fees.processingFeePercent}
          onChange={(v) => setFees((f) => ({ ...f, processingFeePercent: v }))}
          step={0.1}
          min={0}
          unit="%"
        />
        <NumberField
          label="Processing Fee (flat)"
          value={fees.processingFeeFlat}
          onChange={(v) => setFees((f) => ({ ...f, processingFeeFlat: v }))}
          min={0}
        />
        <NumberField
          label="VAT/GST on Processing"
          value={fees.gst}
          onChange={(v) => setFees((f) => ({ ...f, gst: v }))}
          min={0}
          unit="%"
        />
        <NumberField
          label="Insurance"
          value={fees.insurance}
          onChange={(v) => setFees((f) => ({ ...f, insurance: v }))}
          min={0}
        />
        <NumberField
          label="Legal Charges"
          value={fees.legalCharges}
          onChange={(v) => setFees((f) => ({ ...f, legalCharges: v }))}
          min={0}
        />
        <NumberField
          label="Other Charges"
          value={fees.otherCharges}
          onChange={(v) => setFees((f) => ({ ...f, otherCharges: v }))}
          min={0}
        />
      </div>

      {totalFees > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <SummaryCard
            label="Total Fees"
            value={fmt.number(totalFees)}
            color="text-danger"
          />
          <SummaryCard
            label="Effective APR"
            value={fmt.percent(effectiveApr)}
            color="text-danger"
            sub={`vs ${fmt.percent(rate)} nominal`}
          />
          <SummaryCard
            label="Total Borrowing Cost"
            value={fmt.number(result.totalPayment + totalFees)}
          />
          <SummaryCard
            label="Cost per Lakh"
            value={fmt.number(
              ((result.totalPayment + totalFees) / effectivePrincipal) * 100000,
            )}
            sub="Total outflow per 1L borrowed"
          />
        </div>
      )}
    </>
  );
}
