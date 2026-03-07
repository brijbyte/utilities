import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";
import { Banknote, CalendarClock } from "lucide-react";
import { Select } from "../../../components/Select";
import type { Fmt } from "../utils/format";
import { PRESETS } from "../utils/format";
import { SliderField, MonthYearField } from "./ui";

interface Props {
  solveMode: "emi" | "tenure";
  setSolveMode: (v: "emi" | "tenure") => void;
  principal: number;
  setPrincipal: (v: number) => void;
  rate: number;
  setRate: (v: number) => void;
  tenure: number;
  setTenure: (v: number) => void;
  fixedEmi: number;
  setFixedEmi: (v: number) => void;
  startMonth: number;
  setStartMonth: (v: number) => void;
  startYear: number;
  setStartYear: (v: number) => void;
  homeMode: boolean;
  resultEmi: number;
  fmt: Fmt;
  setLocale: (id: string) => void;
}

export function InputsSection({
  solveMode,
  setSolveMode,
  principal,
  setPrincipal,
  rate,
  setRate,
  tenure,
  setTenure,
  fixedEmi,
  setFixedEmi,
  startMonth,
  setStartMonth,
  startYear,
  setStartYear,
  homeMode,
  resultEmi,
  fmt,
  setLocale,
}: Props) {
  return (
    <>
      {/* Solve mode toggle + currency picker */}
      <div className="flex items-center gap-2 flex-wrap">
        <ToggleGroup
          value={[solveMode]}
          onValueChange={(value) => {
            const next = value[0] as "emi" | "tenure" | undefined;
            if (!next || next === solveMode) return;
            if (next === "tenure" && fixedEmi === 0)
              setFixedEmi(Math.round(resultEmi));
            setSolveMode(next);
          }}
          className="flex gap-0.5 rounded-lg border border-border bg-bg-surface p-0.5"
        >
          <Toggle
            value="emi"
            className="flex items-center gap-1 px-2 py-1 text-xs rounded cursor-pointer transition-colors text-text-muted hover:bg-bg-hover data-pressed:bg-primary data-pressed:text-primary-text"
          >
            <Banknote size={11} /> Compute EMI
          </Toggle>
          <Toggle
            value="tenure"
            className="flex items-center gap-1 px-2 py-1 text-xs rounded cursor-pointer transition-colors text-text-muted hover:bg-bg-hover data-pressed:bg-primary data-pressed:text-primary-text"
          >
            <CalendarClock size={11} /> Compute Tenure
          </Toggle>
        </ToggleGroup>

        <span className="ml-auto flex items-center gap-1.5">
          <label className="text-[0.625rem] text-text-muted uppercase tracking-wider">
            Currency
          </label>
          <Select
            value={fmt.preset.id}
            onValueChange={setLocale}
            options={PRESETS.map((p) => ({ value: p.id, label: p.label }))}
          />
        </span>
      </div>

      {/* Core loan inputs */}
      <div className="flex flex-col gap-4">
        {!homeMode && (
          <SliderField
            label="Loan Amount"
            value={principal}
            min={100000}
            max={100000000}
            step={100000}
            onChange={setPrincipal}
            fmt={fmt}
          />
        )}
        <SliderField
          label="Interest Rate"
          value={rate}
          min={1}
          max={20}
          step={0.1}
          unit="%"
          onChange={setRate}
          fmt={fmt}
        />
        {solveMode === "emi" ? (
          <SliderField
            label="Tenure"
            value={tenure}
            min={12}
            max={360}
            step={12}
            unit="months"
            onChange={setTenure}
            fmt={fmt}
          />
        ) : (
          <SliderField
            label="Desired EMI"
            value={fixedEmi}
            min={1000}
            max={10000000}
            step={1000}
            onChange={setFixedEmi}
            fmt={fmt}
          />
        )}
        <MonthYearField
          label="EMI Start Date"
          month={startMonth}
          year={startYear}
          onMonthChange={setStartMonth}
          onYearChange={setStartYear}
        />
      </div>
    </>
  );
}
