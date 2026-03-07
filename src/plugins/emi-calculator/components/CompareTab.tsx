import type { Dispatch, SetStateAction } from "react";
import type { Scenario, ScenarioResult } from "../utils/emi";
import type { Fmt } from "../utils/format";
import { NumberField, Section } from "./ui";

interface CompareTabProps {
  scenarios: Scenario[];
  setScenarios: Dispatch<SetStateAction<Scenario[]>>;
  scenarioResults: ScenarioResult[];
  fmt: Fmt;
}

export function CompareTab({
  scenarios,
  setScenarios,
  scenarioResults,
  fmt,
}: CompareTabProps) {
  return (
    <Section title="Scenario Comparison">
      <p className="text-xs text-text-muted">
        Compare up to 3 scenarios side-by-side with different rates, amounts, or
        tenures.
      </p>

      {/* Scenario inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {scenarios.map((sc, i) => (
          <div
            key={sc.id}
            className="flex flex-col gap-2 p-3 border border-border rounded-lg bg-bg-surface"
          >
            <input
              type="text"
              value={sc.name}
              onChange={(e) =>
                setScenarios((prev) =>
                  prev.map((s, j) =>
                    j === i ? { ...s, name: e.target.value } : s,
                  ),
                )
              }
              className="text-xs font-medium bg-transparent border-b border-border-muted focus:border-primary outline-none pb-0.5 text-text transition-colors"
            />
            <NumberField
              label="Loan Amount"
              value={sc.principal}
              onChange={(v) =>
                setScenarios((prev) =>
                  prev.map((s, j) => (j === i ? { ...s, principal: v } : s)),
                )
              }
              min={0}
            />
            <NumberField
              label="Rate (%)"
              value={sc.annualRate}
              onChange={(v) =>
                setScenarios((prev) =>
                  prev.map((s, j) => (j === i ? { ...s, annualRate: v } : s)),
                )
              }
              min={0}
              step={0.1}
              unit="%"
            />
            <NumberField
              label="Tenure (months)"
              value={sc.tenureMonths}
              onChange={(v) =>
                setScenarios((prev) =>
                  prev.map((s, j) => (j === i ? { ...s, tenureMonths: v } : s)),
                )
              }
              min={1}
            />
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-text-muted">
              <th className="text-left px-2 py-1.5 font-normal">Metric</th>
              {scenarioResults.map((sr) => (
                <th
                  key={sr.scenario.id}
                  className="text-right px-2 py-1.5 font-medium text-text"
                >
                  {sr.scenario.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(
              [
                {
                  label: "Loan Amount",
                  fn: (r: ScenarioResult) => fmt.number(r.scenario.principal),
                },
                {
                  label: "Rate",
                  fn: (r: ScenarioResult) => fmt.percent(r.scenario.annualRate),
                },
                {
                  label: "Tenure",
                  fn: (r: ScenarioResult) =>
                    fmt.tenure(r.scenario.tenureMonths),
                },
                {
                  label: "Monthly EMI",
                  fn: (r: ScenarioResult) => fmt.number(r.emi),
                  highlight: true as boolean,
                },
                {
                  label: "Total Interest",
                  fn: (r: ScenarioResult) => fmt.number(r.totalInterest),
                },
                {
                  label: "Total Payment",
                  fn: (r: ScenarioResult) => fmt.number(r.totalPayment),
                },
              ] as {
                label: string;
                fn: (r: ScenarioResult) => string;
                highlight?: boolean;
              }[]
            ).map(({ label, fn, highlight }) => (
              <tr
                key={label}
                className="border-b border-border-muted hover:bg-bg-hover transition-colors"
              >
                <td className="px-2 py-1.5 text-text-muted">{label}</td>
                {scenarioResults.map((sr) => (
                  <td
                    key={sr.scenario.id}
                    className={`px-2 py-1.5 text-right tabular-nums ${highlight ? "text-primary font-medium" : "text-text"}`}
                  >
                    {fn(sr)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Difference from scenario 1 */}
      {scenarioResults.length > 1 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-[10px] text-text-muted uppercase tracking-wider">
            Difference vs &ldquo;{scenarioResults[0].scenario.name}&rdquo;
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {scenarioResults.slice(1).map((sr) => {
              const base = scenarioResults[0];
              const emiDiff = sr.emi - base.emi;
              const interestDiff = sr.totalInterest - base.totalInterest;
              return (
                <div
                  key={sr.scenario.id}
                  className="p-2 bg-bg-inset rounded-lg text-xs flex flex-col gap-1"
                >
                  <span className="font-medium text-text">
                    {sr.scenario.name}
                  </span>
                  <span
                    className={
                      emiDiff < 0
                        ? "text-success"
                        : emiDiff > 0
                          ? "text-danger"
                          : "text-text-muted"
                    }
                  >
                    EMI: {emiDiff >= 0 ? "+" : ""}
                    {fmt.number(emiDiff)}/mo
                  </span>
                  <span
                    className={
                      interestDiff < 0
                        ? "text-success"
                        : interestDiff > 0
                          ? "text-danger"
                          : "text-text-muted"
                    }
                  >
                    Interest: {interestDiff >= 0 ? "+" : ""}
                    {fmt.number(interestDiff)} total
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Section>
  );
}
