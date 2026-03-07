import { useMemo, useState, useId } from "react";
import { Accordion } from "@base-ui/react/accordion";
import { Slider } from "@base-ui/react/slider";
import { ChevronDown } from "lucide-react";
import { calculateEmi, type EmiInput } from "./emi";
import { formatNumber } from "./format";

// ── Slider input ────────────────────────────────────────────────────

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: SliderFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);

  function commit() {
    if (draft === null) return;
    const n = parseFloat(draft);
    if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
    setDraft(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-xs text-text-muted cursor-pointer">
          {label}
        </label>
        <div className="flex items-baseline gap-1">
          <input
            id={id}
            type="text"
            inputMode="decimal"
            value={draft ?? value}
            onChange={(e) => setDraft(e.target.value.replace(/[^0-9.]/g, ""))}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
            }}
            className="w-20 text-right bg-transparent text-sm text-text outline-none border-b border-border-muted focus:border-primary transition-colors font-mono tabular-nums"
          />
          {unit && <span className="text-xs text-text-muted">{unit}</span>}
        </div>
      </div>
      <Slider.Root
        value={value}
        onValueChange={onChange}
        min={min}
        max={max}
        step={step}
      >
        <Slider.Control className="flex items-center h-4 w-full cursor-pointer touch-none">
          <Slider.Track className="relative h-1.5 w-full rounded-full bg-border-muted">
            <Slider.Indicator className="absolute h-full rounded-full bg-primary" />
            <Slider.Thumb className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-sm border-2 border-bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-shadow hover:shadow-md" />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
      <div className="flex justify-between text-[10px] text-text-muted">
        <span>
          {min.toLocaleString()}
          {unit ? ` ${unit}` : ""}
        </span>
        <span>
          {max.toLocaleString()}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
    </div>
  );
}

interface MonthYearFieldProps {
  label: string;
  month: number;
  year: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}

function MonthYearField({
  label,
  month,
  year,
  onMonthChange,
  onYearChange,
}: MonthYearFieldProps) {
  const monthId = useId();
  const yearId = useId();

  return (
    <div className="flex flex-col gap-2">
      <span className="text-base text-text-muted">{label}</span>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={monthId} className="text-base text-text-muted">
            Month
          </label>
          <select
            id={monthId}
            value={month}
            onChange={(e) => onMonthChange(Number(e.target.value))}
            className="border border-border bg-bg-surface text-text px-2 py-1 text-base cursor-pointer"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2000, m - 1, 1).toLocaleString(undefined, {
                  month: "long",
                })}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={yearId} className="text-base text-text-muted">
            Year
          </label>
          <input
            id={yearId}
            type="number"
            min={1900}
            max={3000}
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value) || year)}
            className="border border-border bg-bg-surface text-text px-2 py-1 text-base"
          />
        </div>
      </div>
    </div>
  );
}

// ── Donut chart ─────────────────────────────────────────────────────

function DonutChart({
  principal,
  interest,
}: {
  principal: number;
  interest: number;
}) {
  const total = principal + interest;
  if (total === 0) return null;

  const pPct = principal / total;
  const r = 50;
  const c = 2 * Math.PI * r;
  const principalArc = pPct * c;
  const interestArc = c - principalArc;

  return (
    <div className="relative w-44 h-44 mx-auto">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        {/* Principal arc */}
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="16"
          strokeDasharray={`${principalArc} ${c}`}
          strokeDashoffset="0"
        />
        {/* Interest arc */}
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--color-accent-subtle)"
          strokeWidth="16"
          strokeDasharray={`${interestArc} ${c}`}
          strokeDashoffset={`${-principalArc}`}
          className="dark:stroke-accent/30"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] text-text-muted">Total</span>
        <span className="text-sm font-medium text-text">
          {formatNumber(total)}
        </span>
      </div>
    </div>
  );
}

// ── Summary card ────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-bg-inset">
      <span className="text-[10px] text-text-muted uppercase tracking-wider">
        {label}
      </span>
      <span className={`text-sm font-medium ${color ?? "text-text"}`}>
        {value}
      </span>
    </div>
  );
}

// ── Year group for schedule ─────────────────────────────────────────

interface YearGroupProps {
  yearLabel: string;
  rows: {
    month: number;
    emi: number;
    principalPart: number;
    interestPart: number;
    balance: number;
    dateLabel: string;
  }[];
}

function YearGroup({ yearLabel, rows }: YearGroupProps) {
  const totalPrincipal = rows.reduce((s, r) => s + r.principalPart, 0);
  const totalInterest = rows.reduce((s, r) => s + r.interestPart, 0);
  const closingBalance = rows[rows.length - 1].balance;

  return (
    <Accordion.Item
      value={yearLabel}
      className="border border-border rounded-lg overflow-hidden"
    >
      <Accordion.Header>
        <Accordion.Trigger className="w-full flex items-center justify-between px-3 py-2 bg-bg-surface hover:bg-bg-hover cursor-pointer transition-colors text-xs [&>div>svg]:data-panel-open:rotate-180">
          <span className="font-medium text-text">{yearLabel}</span>
          <div className="flex items-center gap-4 text-text-muted">
            <span>
              P:{" "}
              <span className="text-primary">
                {formatNumber(totalPrincipal)}
              </span>
            </span>
            <span>
              I:{" "}
              <span className="text-text">{formatNumber(totalInterest)}</span>
            </span>
            <span>
              Bal:{" "}
              <span className="text-text">{formatNumber(closingBalance)}</span>
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
              <th className="text-right px-3 py-1 font-normal">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.month}
                className="border-t border-border-muted hover:bg-bg-hover transition-colors"
              >
                <td className="px-3 py-1 text-text-muted">{r.dateLabel}</td>
                <td className="px-3 py-1 text-right text-text tabular-nums">
                  {formatNumber(r.emi)}
                </td>
                <td className="px-3 py-1 text-right text-primary tabular-nums">
                  {formatNumber(r.principalPart)}
                </td>
                <td className="px-3 py-1 text-right text-text-muted tabular-nums">
                  {formatNumber(r.interestPart)}
                </td>
                <td className="px-3 py-1 text-right text-text tabular-nums">
                  {formatNumber(r.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Accordion.Panel>
    </Accordion.Item>
  );
}

// ── Main ────────────────────────────────────────────────────────────

const DEFAULTS: EmiInput = {
  principal: 5000000,
  annualRate: 8.5,
  tenureMonths: 240,
};

export default function EmiCalculator() {
  const [principal, setPrincipal] = useState(DEFAULTS.principal);
  const [rate, setRate] = useState(DEFAULTS.annualRate);
  const [tenure, setTenure] = useState(DEFAULTS.tenureMonths);
  const today = new Date();
  const [startMonth, setStartMonth] = useState(today.getMonth() + 1);
  const [startYear, setStartYear] = useState(today.getFullYear());

  const result = useMemo(
    () =>
      calculateEmi({
        principal,
        annualRate: rate,
        tenureMonths: tenure,
      }),
    [principal, rate, tenure],
  );

  const monthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: "short",
        year: "numeric",
      }),
    [],
  );

  // Group schedule by calendar year based on selected loan start month/year
  const yearGroups = useMemo(() => {
    type ScheduleRowWithDate = (typeof result.schedule)[number] & {
      dateLabel: string;
    };

    const groups = new Map<
      number,
      {
        yearLabel: string;
        rows: ScheduleRowWithDate[];
      }
    >();

    for (const row of result.schedule) {
      const offset = row.month - 1;
      const date = new Date(startYear, startMonth - 1 + offset, 1);
      const calendarYear = date.getFullYear();
      const dateLabel = monthFormatter.format(date);

      if (!groups.has(calendarYear)) {
        groups.set(calendarYear, {
          yearLabel: String(calendarYear),
          rows: [],
        });
      }

      groups.get(calendarYear)!.rows.push({ ...row, dateLabel });
    }

    return Array.from(groups.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, value]) => value);
  }, [result, startYear, startMonth, monthFormatter]);

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto px-pn-x py-6 flex flex-col gap-6">
        {/* ── Inputs ──────────────────────────────── */}
        <p className="text-xs text-text-muted">
          Enter values in your local currency.
        </p>
        <div className="flex flex-col gap-4">
          <SliderField
            label="Loan Amount"
            value={principal}
            min={100000}
            max={100000000}
            step={100000}
            onChange={setPrincipal}
          />
          <SliderField
            label="Interest Rate"
            value={rate}
            min={1}
            max={20}
            step={0.1}
            unit="%"
            onChange={setRate}
          />
          <SliderField
            label="Tenure"
            value={tenure}
            min={12}
            max={360}
            step={12}
            unit="months"
            onChange={setTenure}
          />
          <MonthYearField
            label="EMI Start Date"
            month={startMonth}
            year={startYear}
            onMonthChange={setStartMonth}
            onYearChange={setStartYear}
          />
        </div>

        {/* ── Summary ──────────────────────────────── */}
        {result.emi > 0 && (
          <div className="flex flex-col gap-4">
            <DonutChart principal={principal} interest={result.totalInterest} />

            <div className="flex items-center gap-3 justify-center text-xs text-text-muted">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary" />
                Principal
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-accent-subtle dark:bg-accent/30" />
                Interest
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <SummaryCard
                label="Monthly EMI"
                value={formatNumber(result.emi)}
                color="text-primary"
              />
              <SummaryCard
                label="Total Interest"
                value={formatNumber(result.totalInterest)}
              />
              <SummaryCard
                label="Total Payment"
                value={formatNumber(result.totalPayment)}
              />
            </div>
          </div>
        )}

        {/* ── Amortisation schedule ────────────────── */}
        {yearGroups.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="text-xs text-text-muted uppercase tracking-wider">
              Amortisation Schedule
            </h2>
            <Accordion.Root multiple className="flex flex-col gap-2">
              {yearGroups.map((g) => (
                <YearGroup
                  key={g.yearLabel}
                  yearLabel={g.yearLabel}
                  rows={g.rows}
                />
              ))}
            </Accordion.Root>
          </div>
        )}
      </div>
    </div>
  );
}
