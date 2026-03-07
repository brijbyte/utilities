import { useMemo, useState } from "react";
import {
  Home,
  TrendingDown,
  LineChart as LineChartIcon,
  Receipt,
  Wallet,
  GitCompare,
  Share2,
} from "lucide-react";
import {
  calculateFull,
  calculateWithoutPrepayments,
  calculateHomePurchase,
  calculateTotalFees,
  calculateEffectiveApr,
  calculateAffordability,
  evaluateScenario,
  computeTenureFromEmi,
  aggregateByYear,
  decodeShareURL,
  type FullCalcInput,
  type PrepaymentConfig,
  type LumpSumPrepayment,
  type RecurringPrepayment,
  type RateSegment,
  type FeeConfig,
  type AffordabilityInput,
  type Scenario,
} from "./utils/emi";
import { useFormat, FormatProvider } from "./components/FormatContext";
import { CollapsibleGroup, Collapsible, TabBtn } from "./components/ui";
import {
  loadSavedScenarios,
  type SecondaryView,
  type SavedScenario,
} from "./utils/types";
import { InputsSection } from "./components/InputsSection";
import { ResultsSection } from "./components/ResultsSection";
import { ChartsSection } from "./components/ChartsSection";
import { ScheduleSection } from "./components/ScheduleSection";
import { HomeLoanPanel } from "./components/HomeLoanPanel";
import { PrepaymentPanel } from "./components/PrepaymentPanel";
import { RateChangePanel } from "./components/RateChangePanel";
import { FeesPanel } from "./components/FeesPanel";
import { AffordabilityTab } from "./components/AffordabilityTab";
import { CompareTab } from "./components/CompareTab";
import { ShareTab } from "./components/ShareTab";

// ═══════════════════════════════════════════════════════════════════

export default function EmiCalculator() {
  return (
    <FormatProvider>
      <EmiCalculatorInner />
    </FormatProvider>
  );
}

function EmiCalculatorInner() {
  const { fmt, setLocale } = useFormat();

  // ── URL state restore ───────────────────────────────────────────
  const urlState = useMemo(() => decodeShareURL(window.location.search), []);

  // ── Core inputs ─────────────────────────────────────────────────
  const [principal, setPrincipal] = useState(urlState?.p ?? 5000000);
  const [rate, setRate] = useState(urlState?.r ?? 8.5);
  const [tenure, setTenure] = useState(urlState?.t ?? 240);
  const today = new Date();
  const [startMonth, setStartMonth] = useState(
    urlState?.sm ?? today.getMonth() + 1,
  );
  const [startYear, setStartYear] = useState(
    urlState?.sy ?? today.getFullYear(),
  );
  const [solveMode, setSolveMode] = useState<"emi" | "tenure">("emi");
  const [fixedEmi, setFixedEmi] = useState(0);

  // ── Home purchase ───────────────────────────────────────────────
  const [homeMode, setHomeMode] = useState(!!urlState?.hp);
  const [propertyPrice, setPropertyPrice] = useState(
    urlState?.hp?.pp ?? 8000000,
  );
  const [downPaymentPct, setDownPaymentPct] = useState(urlState?.hp?.dp ?? 20);

  // ── Prepayments ─────────────────────────────────────────────────
  const [lumpSums, setLumpSums] = useState<LumpSumPrepayment[]>([]);
  const [recurringPrepayments, setRecurringPrepayments] = useState<
    RecurringPrepayment[]
  >([]);
  const [prepayStrategy, setPrepayStrategy] = useState<
    "reduce-tenure" | "reduce-emi"
  >("reduce-tenure");

  // ── Rate / fees / affordability / compare / saved ───────────────
  const [rateSegments, setRateSegments] = useState<RateSegment[]>([]);
  const [fees, setFees] = useState<FeeConfig>({
    processingFeePercent: 0,
    processingFeeFlat: 0,
    insurance: 0,
    legalCharges: 0,
    otherCharges: 0,
    gst: 18,
  });
  const [affordInput, setAffordInput] = useState<AffordabilityInput>({
    monthlyIncome: 150000,
    existingEmis: 0,
    otherObligations: 0,
    foirPercent: 50,
    annualRate: 8.5,
    tenureMonths: 240,
  });
  const [scenarios, setScenarios] = useState<Scenario[]>([
    {
      id: "1",
      name: "Current",
      principal: 5000000,
      annualRate: 8.5,
      tenureMonths: 240,
    },
    {
      id: "2",
      name: "Lower Rate",
      principal: 5000000,
      annualRate: 7.5,
      tenureMonths: 240,
    },
    {
      id: "3",
      name: "Shorter Tenure",
      principal: 5000000,
      annualRate: 8.5,
      tenureMonths: 180,
    },
  ]);
  const [savedScenarios, setSavedScenarios] =
    useState<SavedScenario[]>(loadSavedScenarios);
  const [secondaryView, setSecondaryView] = useState<SecondaryView | null>(
    null,
  );

  // ── Derived calculations ────────────────────────────────────────
  const effectivePrincipal = useMemo(() => {
    if (homeMode)
      return calculateHomePurchase({
        propertyPrice,
        downPaymentPercent: downPaymentPct,
      }).loanAmount;
    return principal;
  }, [homeMode, propertyPrice, downPaymentPct, principal]);

  const computedTenure = useMemo(() => {
    if (solveMode !== "tenure" || fixedEmi <= 0) return tenure;
    const t = computeTenureFromEmi(effectivePrincipal, rate, fixedEmi);
    return Number.isFinite(t) ? Math.min(t, 600) : tenure;
  }, [solveMode, fixedEmi, effectivePrincipal, rate, tenure]);

  const activeTenure = solveMode === "tenure" ? computedTenure : tenure;

  const prepaymentConfig = useMemo<PrepaymentConfig | undefined>(() => {
    if (lumpSums.length === 0 && recurringPrepayments.length === 0)
      return undefined;
    return {
      lumpSums,
      recurring: recurringPrepayments,
      strategy: prepayStrategy,
    };
  }, [lumpSums, recurringPrepayments, prepayStrategy]);

  const rateTimeline = useMemo<RateSegment[] | undefined>(
    () => (rateSegments.length > 0 ? rateSegments : undefined),
    [rateSegments],
  );

  const fullInput: FullCalcInput = useMemo(
    () => ({
      principal: effectivePrincipal,
      annualRate: rate,
      tenureMonths: activeTenure,
      prepayments: prepaymentConfig,
      rateTimeline,
    }),
    [effectivePrincipal, rate, activeTenure, prepaymentConfig, rateTimeline],
  );

  const result = useMemo(() => calculateFull(fullInput), [fullInput]);
  const baselineResult = useMemo(
    () => (prepaymentConfig ? calculateWithoutPrepayments(fullInput) : null),
    [fullInput, prepaymentConfig],
  );
  const homeResult = useMemo(
    () =>
      homeMode
        ? calculateHomePurchase({
            propertyPrice,
            downPaymentPercent: downPaymentPct,
          })
        : null,
    [homeMode, propertyPrice, downPaymentPct],
  );
  const totalFees = useMemo(
    () => calculateTotalFees(effectivePrincipal, fees),
    [effectivePrincipal, fees],
  );
  const effectiveApr = useMemo(
    () =>
      totalFees > 0
        ? calculateEffectiveApr(
            effectivePrincipal,
            result.emi,
            result.effectiveTenure,
            totalFees,
          )
        : rate,
    [effectivePrincipal, result.emi, result.effectiveTenure, totalFees, rate],
  );
  const effectiveAffordInput = useMemo(
    () => ({ ...affordInput, annualRate: rate, tenureMonths: activeTenure }),
    [affordInput, rate, activeTenure],
  );
  const affordResult = useMemo(
    () => calculateAffordability(effectiveAffordInput),
    [effectiveAffordInput],
  );
  const yearData = useMemo(
    () => aggregateByYear(result.schedule, startMonth, startYear),
    [result.schedule, startMonth, startYear],
  );
  const scenarioResults = useMemo(
    () => scenarios.map(evaluateScenario),
    [scenarios],
  );
  const prepaymentSavings = useMemo(() => {
    if (!baselineResult || !prepaymentConfig) return null;
    return {
      interestSaved: baselineResult.totalInterest - result.totalInterest,
      tenureReduced: baselineResult.effectiveTenure - result.effectiveTenure,
    };
  }, [baselineResult, result, prepaymentConfig]);

  const prepayCount = lumpSums.length + recurringPrepayments.length;
  const hasFees = totalFees > 0;

  // ═══════════════════════════════════════════════════════════════
  // Secondary views
  // ═══════════════════════════════════════════════════════════════

  if (secondaryView) {
    return (
      <div className="h-full overflow-auto">
        <div className="max-w-4xl mx-auto px-pn-x py-6 flex flex-col gap-6">
          <button
            onClick={() => setSecondaryView(null)}
            className="self-start inline-flex items-center gap-1 text-xs text-text-muted hover:text-primary transition-colors cursor-pointer"
          >
            ← Back to calculator
          </button>

          {secondaryView === "affordability" && (
            <AffordabilityTab
              affordInput={effectiveAffordInput}
              setAffordInput={setAffordInput}
              affordResult={affordResult}
              rate={rate}
              activeTenure={activeTenure}
              fmt={fmt}
            />
          )}
          {secondaryView === "compare" && (
            <CompareTab
              scenarios={scenarios}
              setScenarios={setScenarios}
              scenarioResults={scenarioResults}
              fmt={fmt}
            />
          )}
          {secondaryView === "share" && (
            <ShareTab
              effectivePrincipal={effectivePrincipal}
              rate={rate}
              activeTenure={activeTenure}
              startMonth={startMonth}
              startYear={startYear}
              solveMode={solveMode}
              fixedEmi={fixedEmi}
              homeMode={homeMode}
              propertyPrice={propertyPrice}
              downPaymentPct={downPaymentPct}
              result={result}
              savedScenarios={savedScenarios}
              setSavedScenarios={setSavedScenarios}
              setPrincipal={setPrincipal}
              setRate={setRate}
              setTenure={setTenure}
              setStartMonth={setStartMonth}
              setStartYear={setStartYear}
              setSolveMode={setSolveMode}
              setFixedEmi={setFixedEmi}
              setHomeMode={setHomeMode}
              setPropertyPrice={setPropertyPrice}
              setDownPaymentPct={setDownPaymentPct}
              setSecondaryView={setSecondaryView}
              fmt={fmt}
            />
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // Main calculator
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto px-pn-x py-6 flex flex-col gap-6">
        <InputsSection
          solveMode={solveMode}
          setSolveMode={setSolveMode}
          principal={principal}
          setPrincipal={setPrincipal}
          rate={rate}
          setRate={setRate}
          tenure={tenure}
          setTenure={setTenure}
          fixedEmi={fixedEmi}
          setFixedEmi={setFixedEmi}
          startMonth={startMonth}
          setStartMonth={setStartMonth}
          startYear={startYear}
          setStartYear={setStartYear}
          homeMode={homeMode}
          resultEmi={result.emi}
          fmt={fmt}
          setLocale={setLocale}
        />

        <CollapsibleGroup
          defaultValue={homeMode ? ["home-purchase"] : undefined}
        >
          <Collapsible
            value="home-purchase"
            title="Home Purchase"
            icon={<Home size={13} className="text-text-muted" />}
            badge={homeMode ? "Active" : undefined}
          >
            <HomeLoanPanel
              homeMode={homeMode}
              setHomeMode={setHomeMode}
              propertyPrice={propertyPrice}
              setPropertyPrice={setPropertyPrice}
              downPaymentPct={downPaymentPct}
              setDownPaymentPct={setDownPaymentPct}
              homeResult={homeResult}
              result={result}
              totalFees={totalFees}
              fmt={fmt}
            />
          </Collapsible>

          <Collapsible
            value="prepayments"
            title="Prepayments"
            icon={<TrendingDown size={13} className="text-text-muted" />}
            badge={prepayCount > 0 ? String(prepayCount) : undefined}
          >
            <PrepaymentPanel
              lumpSums={lumpSums}
              setLumpSums={setLumpSums}
              recurringPrepayments={recurringPrepayments}
              setRecurringPrepayments={setRecurringPrepayments}
              prepayStrategy={prepayStrategy}
              setPrepayStrategy={setPrepayStrategy}
              result={result}
              baselineResult={baselineResult}
              activeTenure={activeTenure}
              prepaymentSavings={prepaymentSavings}
              fmt={fmt}
            />
          </Collapsible>

          <Collapsible
            value="rate-changes"
            title="Rate Changes"
            icon={<LineChartIcon size={13} className="text-text-muted" />}
            badge={
              rateSegments.length > 0 ? String(rateSegments.length) : undefined
            }
          >
            <RateChangePanel
              rate={rate}
              rateSegments={rateSegments}
              setRateSegments={setRateSegments}
            />
          </Collapsible>

          <Collapsible
            value="fees"
            title="Fees & Charges"
            icon={<Receipt size={13} className="text-text-muted" />}
            badge={hasFees ? fmt.percent(effectiveApr, 1) + " APR" : undefined}
          >
            <FeesPanel
              fees={fees}
              setFees={setFees}
              effectivePrincipal={effectivePrincipal}
              totalFees={totalFees}
              effectiveApr={effectiveApr}
              rate={rate}
              result={result}
              fmt={fmt}
            />
          </Collapsible>
        </CollapsibleGroup>

        <ResultsSection
          result={result}
          solveMode={solveMode}
          computedTenure={computedTenure}
          activeTenure={activeTenure}
          hasFees={hasFees}
          totalFees={totalFees}
          effectiveApr={effectiveApr}
          rate={rate}
          prepaymentSavings={prepaymentSavings}
          fmt={fmt}
        />

        <ChartsSection
          effectivePrincipal={effectivePrincipal}
          result={result}
          baselineSchedule={baselineResult?.schedule}
          startMonth={startMonth}
          startYear={startYear}
          yearData={yearData}
          hasFees={hasFees}
          totalFees={totalFees}
          fmt={fmt}
        />

        <ScheduleSection
          result={result}
          startMonth={startMonth}
          startYear={startYear}
          fmt={fmt}
        />

        <div className="border-t border-border-muted pt-4 flex flex-col gap-3">
          <h2 className="text-xs text-text-muted uppercase tracking-wider">
            More Tools
          </h2>
          <div className="flex gap-1.5 flex-wrap">
            <TabBtn
              active={false}
              onClick={() => setSecondaryView("affordability")}
              icon={<Wallet size={13} />}
              label="Affordability"
            />
            <TabBtn
              active={false}
              onClick={() => setSecondaryView("compare")}
              icon={<GitCompare size={13} />}
              label="Compare Scenarios"
            />
            <TabBtn
              active={false}
              onClick={() => setSecondaryView("share")}
              icon={<Share2 size={13} />}
              label="Save & Share"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
