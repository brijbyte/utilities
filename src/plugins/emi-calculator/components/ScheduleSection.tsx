import { useMemo, useState, useCallback } from "react";
import { Accordion } from "@base-ui/react/accordion";
import { ChevronDown, Download, Search } from "lucide-react";
import { Select } from "../../../components/Select";
import { scheduleToCSV, type EmiResult, type MonthRow } from "../utils/emi";
import type { Fmt } from "../utils/format";
import { Section } from "./ui";

// ── Year group accordion ────────────────────────────────────────────

function YearGroup({
  yearLabel,
  rows,
  hasPrepayments,
  fmt,
}: {
  yearLabel: string;
  rows: (MonthRow & { dateLabel: string })[];
  hasPrepayments: boolean;
  fmt: Fmt;
}) {
  const totalPrincipal = rows.reduce((s, r) => s + r.principalPart, 0);
  const totalInterest = rows.reduce((s, r) => s + r.interestPart, 0);
  const totalPrepay = rows.reduce((s, r) => s + r.prepayment, 0);
  const closingBalance = rows[rows.length - 1].balance;

  return (
    <Accordion.Item
      value={yearLabel}
      className="border border-border rounded-lg overflow-hidden"
    >
      <Accordion.Header>
        <Accordion.Trigger className="w-full flex items-center justify-between px-3 py-2 bg-bg-surface hover:bg-bg-hover cursor-pointer transition-colors text-xs [&>div>svg]:data-panel-open:rotate-180">
          <span className="font-medium text-text">{yearLabel}</span>
          <div className="flex items-center gap-3 text-text-muted">
            <span>
              P:{" "}
              <span className="text-primary">
                {fmt.compact(totalPrincipal)}
              </span>
            </span>
            <span>
              I: <span className="text-text">{fmt.compact(totalInterest)}</span>
            </span>
            {hasPrepayments && totalPrepay > 0 && (
              <span>
                PP:{" "}
                <span className="text-success">{fmt.compact(totalPrepay)}</span>
              </span>
            )}
            <span>
              Bal:{" "}
              <span className="text-text">{fmt.compact(closingBalance)}</span>
            </span>
            <ChevronDown
              size={14}
              className="transition-transform duration-200"
            />
          </div>
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Panel className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-t border-border text-text-muted">
              <th className="text-left px-3 py-1 font-normal">Month</th>
              <th className="text-right px-3 py-1 font-normal">EMI</th>
              <th className="text-right px-3 py-1 font-normal">Principal</th>
              <th className="text-right px-3 py-1 font-normal">Interest</th>
              {hasPrepayments && (
                <th className="text-right px-3 py-1 font-normal">Prepay</th>
              )}
              <th className="text-right px-3 py-1 font-normal">Balance</th>
              <th className="text-right px-3 py-1 font-normal">Rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.month}
                className={`border-t border-border-muted hover:bg-bg-hover transition-colors ${r.prepayment > 0 ? "bg-success/5" : ""}`}
              >
                <td className="px-3 py-1 text-text-muted">{r.dateLabel}</td>
                <td className="px-3 py-1 text-right text-text tabular-nums">
                  {fmt.number(r.emi)}
                </td>
                <td className="px-3 py-1 text-right text-primary tabular-nums">
                  {fmt.number(r.principalPart)}
                </td>
                <td className="px-3 py-1 text-right text-text-muted tabular-nums">
                  {fmt.number(r.interestPart)}
                </td>
                {hasPrepayments && (
                  <td className="px-3 py-1 text-right text-success tabular-nums">
                    {r.prepayment > 0 ? fmt.number(r.prepayment) : "—"}
                  </td>
                )}
                <td className="px-3 py-1 text-right text-text tabular-nums">
                  {fmt.number(r.balance)}
                </td>
                <td className="px-3 py-1 text-right text-text-muted tabular-nums">
                  {r.rateUsed.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Accordion.Panel>
    </Accordion.Item>
  );
}

// ── Schedule section ────────────────────────────────────────────────

interface ScheduleProps {
  result: EmiResult;
  startMonth: number;
  startYear: number;
  fmt: Fmt;
}

export function ScheduleSection({
  result,
  startMonth,
  startYear,
  fmt,
}: ScheduleProps) {
  const [filterYear, setFilterYear] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const monthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }),
    [],
  );

  const yearGroups = useMemo(() => {
    type Row = MonthRow & { dateLabel: string; calendarYear: number };
    const groups = new Map<number, { yearLabel: string; rows: Row[] }>();

    for (const row of result.schedule) {
      const offset = row.month - 1;
      const date = new Date(startYear, startMonth - 1 + offset, 1);
      const calendarYear = date.getFullYear();
      const dateLabel = monthFormatter.format(date);

      if (!groups.has(calendarYear)) {
        groups.set(calendarYear, { yearLabel: String(calendarYear), rows: [] });
      }
      groups.get(calendarYear)!.rows.push({ ...row, dateLabel, calendarYear });
    }

    return Array.from(groups.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, v]) => v);
  }, [result, startYear, startMonth, monthFormatter]);

  const availableYears = useMemo(
    () => yearGroups.map((g) => g.yearLabel),
    [yearGroups],
  );

  const filteredGroups = useMemo(() => {
    let groups = yearGroups;
    if (filterYear !== "all") {
      groups = groups.filter((g) => g.yearLabel === filterYear);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      groups = groups
        .map((g) => ({
          ...g,
          rows: g.rows.filter((r) => r.dateLabel.toLowerCase().includes(term)),
        }))
        .filter((g) => g.rows.length > 0);
    }
    return groups;
  }, [yearGroups, filterYear, searchTerm]);

  const handleExportCSV = useCallback(() => {
    const csv = scheduleToCSV(result.schedule, startMonth, startYear);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "emi-schedule.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [result, startMonth, startYear]);

  const totals = useMemo(() => {
    const rows = filteredGroups.flatMap((g) => g.rows);
    return {
      emi: rows.reduce((s, r) => s + r.emi, 0),
      principal: rows.reduce((s, r) => s + r.principalPart, 0),
      interest: rows.reduce((s, r) => s + r.interestPart, 0),
      prepayment: rows.reduce((s, r) => s + r.prepayment, 0),
    };
  }, [filteredGroups]);

  const hasPrepayments = result.totalPrepayment > 0;

  if (yearGroups.length === 0) return null;

  return (
    <Section
      title="Amortisation Schedule"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1 text-[10px] text-text-muted hover:text-primary transition-colors cursor-pointer"
          >
            <Download size={10} /> CSV
          </button>
        </div>
      }
    >
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[140px] max-w-[220px]">
          <Search
            size={12}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            placeholder="Search month..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-6 pr-2 py-1 text-xs bg-bg-surface border border-border rounded focus:border-primary outline-none transition-colors"
          />
        </div>
        <Select
          value={filterYear}
          onValueChange={setFilterYear}
          options={[
            { value: "all", label: "All years" },
            ...availableYears.map((y) => ({ value: y, label: y })),
          ]}
          align="end"
          popupMinWidth="min-w-32"
        />
      </div>

      {/* Sticky totals */}
      <div className="grid grid-cols-4 gap-2 p-2 bg-bg-inset rounded-lg text-[10px] sticky top-0 z-10">
        <div>
          <span className="text-text-muted">Principal</span>
          <div className="text-primary font-medium tabular-nums">
            {fmt.number(totals.principal)}
          </div>
        </div>
        <div>
          <span className="text-text-muted">Interest</span>
          <div className="text-text font-medium tabular-nums">
            {fmt.number(totals.interest)}
          </div>
        </div>
        {hasPrepayments && (
          <div>
            <span className="text-text-muted">Prepayment</span>
            <div className="text-success font-medium tabular-nums">
              {fmt.number(totals.prepayment)}
            </div>
          </div>
        )}
        <div>
          <span className="text-text-muted">Total Paid</span>
          <div className="text-text font-medium tabular-nums">
            {fmt.number(totals.emi + totals.prepayment)}
          </div>
        </div>
      </div>

      {/* Year accordion groups */}
      <Accordion.Root multiple className="flex flex-col gap-2">
        {filteredGroups.map((g) => (
          <YearGroup
            key={g.yearLabel}
            yearLabel={g.yearLabel}
            rows={g.rows}
            hasPrepayments={hasPrepayments}
            fmt={fmt}
          />
        ))}
      </Accordion.Root>
    </Section>
  );
}
