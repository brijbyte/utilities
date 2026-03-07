import { useState, useId, type ReactNode } from "react";
import { Accordion } from "@base-ui/react/accordion";
import { Slider } from "@base-ui/react/slider";
import { Check, Copy, ChevronDown } from "lucide-react";
import { Select } from "../../../components/Select";
import type { Fmt } from "../utils/format";

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2000, i, 1).toLocaleString(undefined, { month: "long" }),
}));

// ── Slider input ────────────────────────────────────────────────────

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
  fmt: Fmt;
}

export function SliderField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  fmt,
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
            className="w-24 text-right bg-transparent text-sm text-text outline-none border-b border-border-muted focus:border-primary transition-colors font-mono tabular-nums"
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
          {fmt.number(min)}
          {unit ? ` ${unit}` : ""}
        </span>
        <span>
          {fmt.number(max)}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
    </div>
  );
}

// ── Number input (no slider) ────────────────────────────────────────

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export function NumberField({
  label,
  value,
  onChange,
  unit,
  min,
  max,
  step,
  className = "",
}: NumberFieldProps) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-xs text-text-muted">
        {label}
      </label>
      <div className="flex items-center gap-1">
        <input
          id={id}
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full bg-bg-surface border border-border text-sm text-text px-2 py-1 rounded font-mono tabular-nums focus:border-primary outline-none transition-colors"
        />
        {unit && (
          <span className="text-xs text-text-muted whitespace-nowrap">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Month/Year selector ─────────────────────────────────────────────

interface MonthYearFieldProps {
  label: string;
  month: number;
  year: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}

export function MonthYearField({
  label,
  month,
  year,
  onMonthChange,
  onYearChange,
}: MonthYearFieldProps) {
  const yearId = useId();

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-text-muted">{label}</span>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-text-muted">Month</span>
          <Select
            value={String(month)}
            onValueChange={(v) => onMonthChange(Number(v))}
            options={MONTH_OPTIONS}
            align="start"
            popupMinWidth="min-w-44"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={yearId} className="text-[10px] text-text-muted">
            Year
          </label>
          <input
            id={yearId}
            type="number"
            min={1900}
            max={3000}
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value) || year)}
            className="border border-border bg-bg-surface text-text px-2 py-1 text-xs rounded font-mono focus:border-primary outline-none transition-colors"
          />
        </div>
      </div>
    </div>
  );
}

// ── Donut chart ─────────────────────────────────────────────────────

export function DonutChart({
  principal,
  interest,
  fees,
  fmt,
}: {
  principal: number;
  interest: number;
  fees?: number;
  fmt: Fmt;
}) {
  const total = principal + interest + (fees ?? 0);
  if (total === 0) return null;

  const r = 50;
  const c = 2 * Math.PI * r;
  const pPct = principal / total;
  const iPct = interest / total;
  const fPct = (fees ?? 0) / total;

  const principalArc = pPct * c;
  const interestArc = iPct * c;
  const feesArc = fPct * c;

  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="14"
          strokeDasharray={`${principalArc} ${c}`}
          strokeDashoffset="0"
        />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--color-accent-subtle)"
          strokeWidth="14"
          strokeDasharray={`${interestArc} ${c}`}
          strokeDashoffset={`${-principalArc}`}
          className="dark:stroke-accent/30"
        />
        {feesArc > 0.5 && (
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="var(--color-danger)"
            strokeWidth="14"
            strokeDasharray={`${feesArc} ${c}`}
            strokeDashoffset={`${-(principalArc + interestArc)}`}
            opacity="0.6"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] text-text-muted">Total</span>
        <span className="text-xs font-medium text-text">
          {fmt.compact(total)}
        </span>
      </div>
    </div>
  );
}

// ── Summary card ────────────────────────────────────────────────────

export function SummaryCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string;
  color?: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-bg-inset min-w-0">
      <span className="text-[10px] text-text-muted uppercase tracking-wider truncate">
        {label}
      </span>
      <span className={`text-sm font-medium truncate ${color ?? "text-text"}`}>
        {value}
      </span>
      {sub && (
        <span className="text-[10px] text-text-muted truncate">{sub}</span>
      )}
    </div>
  );
}

// ── Collapsible accordion ────────────────────────────────────────────

export function CollapsibleGroup({
  children,
  defaultValue,
}: {
  children: ReactNode;
  defaultValue?: string[];
}) {
  return (
    <Accordion.Root
      multiple
      defaultValue={defaultValue}
      className="flex flex-col gap-2"
    >
      {children}
    </Accordion.Root>
  );
}

export function Collapsible({
  value,
  title,
  icon,
  badge,
  children,
}: {
  value: string;
  title: string;
  icon: ReactNode;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <Accordion.Item
      value={value}
      className="border border-border rounded-lg overflow-hidden"
    >
      <Accordion.Header>
        <Accordion.Trigger className="w-full flex items-center gap-2 px-3 py-2 bg-bg-surface hover:bg-bg-hover cursor-pointer transition-colors text-xs select-none [&>svg]:transition-transform [&>svg]:duration-200 [&>svg]:data-panel-open:rotate-180">
          <ChevronDown size={13} className="text-text-muted shrink-0" />
          {icon}
          <span className="font-medium text-text">{title}</span>
          {badge && (
            <span className="ml-auto px-1.5 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary font-medium">
              {badge}
            </span>
          )}
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Panel className="px-3 py-3 border-t border-border-muted flex flex-col gap-3">
        {children}
      </Accordion.Panel>
    </Accordion.Item>
  );
}

// ── Section wrapper ─────────────────────────────────────────────────

export function Section({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs text-text-muted uppercase tracking-wider">
          {title}
        </h2>
        {actions}
      </div>
      {children}
    </div>
  );
}

// ── Tab button (used by secondary tools) ────────────────────────────

export function TabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs whitespace-nowrap rounded-full border transition-colors cursor-pointer ${
        active
          ? "bg-primary text-primary-text border-primary"
          : "bg-bg-surface text-text-muted border-border hover:bg-bg-hover hover:text-text"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// ── Inline copy button ──────────────────────────────────────────────

export function CopyBtn({
  text,
  label = "Copy",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 text-[10px] text-text-muted hover:text-primary transition-colors cursor-pointer"
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
      {copied ? "Copied" : label}
    </button>
  );
}
