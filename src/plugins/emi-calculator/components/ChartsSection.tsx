import { BarChart3 } from "lucide-react";
import type { EmiResult, MonthRow, YearAggregate } from "../utils/emi";
import type { Fmt } from "../utils/format";
import { BalanceLineChart, PrincipalInterestChart } from "./charts";
import { CollapsibleGroup, Collapsible, DonutChart } from "./ui";

interface Props {
  effectivePrincipal: number;
  result: EmiResult;
  baselineSchedule?: MonthRow[];
  startMonth: number;
  startYear: number;
  yearData: YearAggregate[];
  hasFees: boolean;
  totalFees: number;
  fmt: Fmt;
}

export function ChartsSection({
  effectivePrincipal,
  result,
  baselineSchedule,
  startMonth,
  startYear,
  yearData,
  hasFees,
  totalFees,
  fmt,
}: Props) {
  if (result.schedule.length === 0) return null;

  return (
    <CollapsibleGroup defaultValue={["charts"]}>
      <Collapsible
        value="charts"
        title="See charts"
        icon={<BarChart3 size={13} className="text-primary" />}
      >
        <div className="flex flex-col gap-4">
          {/* Donut breakdown */}
          <DonutChart
            principal={effectivePrincipal}
            interest={result.totalInterest}
            fees={hasFees ? totalFees : undefined}
            fmt={fmt}
          />
          <div className="flex items-center gap-3 justify-center text-xs text-text-muted flex-wrap">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary" />
              Principal
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-accent-subtle dark:bg-accent/30" />
              Interest
            </span>
            {hasFees && (
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-danger opacity-60" />
                Fees
              </span>
            )}
          </div>

          {/* Balance over time */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-text">Balance Over Time</h3>
            <BalanceLineChart
              schedule={result.schedule}
              compareSchedule={baselineSchedule}
              startMonth={startMonth}
              startYear={startYear}
              fmt={fmt}
            />
          </div>

          {/* Principal vs interest by year */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-text">
              Principal vs Interest by Year
            </h3>
            <PrincipalInterestChart yearData={yearData} fmt={fmt} />
          </div>
        </div>
      </Collapsible>
    </CollapsibleGroup>
  );
}
