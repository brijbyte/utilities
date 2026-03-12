/**
 * EMI calculation engine.
 *
 * EMI = P × r × (1+r)^n / ((1+r)^n − 1)
 *   P = principal
 *   r = monthly interest rate (annual / 12 / 100)
 *   n = tenure in months
 */

// ── Basic types ─────────────────────────────────────────────────────

export interface EmiInput {
  principal: number;
  annualRate: number;
  tenureMonths: number;
}

export interface MonthRow {
  month: number;
  emi: number;
  principalPart: number;
  interestPart: number;
  prepayment: number;
  balance: number;
  rateUsed: number; // annual rate in effect for this month
}

export interface EmiResult {
  emi: number;
  totalPayment: number;
  totalInterest: number;
  totalPrepayment: number;
  effectiveTenure: number; // actual months (may differ from input if prepayments)
  schedule: MonthRow[];
}

// ── Prepayment config ───────────────────────────────────────────────

export interface LumpSumPrepayment {
  month: number; // 1-indexed month at which lump sum is applied
  amount: number;
}

export type RecurringFrequency = "monthly" | "quarterly" | "annually";

export interface RecurringPrepayment {
  amount: number;
  frequency: RecurringFrequency;
  startMonth: number; // 1-indexed
}

export interface PrepaymentConfig {
  lumpSums: LumpSumPrepayment[];
  recurring: RecurringPrepayment[];
  strategy: "reduce-tenure" | "reduce-emi";
}

// ── Rate change timeline (floating rate) ────────────────────────────

export interface RateSegment {
  fromMonth: number; // 1-indexed (first segment should start at 1)
  annualRate: number;
}

// ── Fees & true cost ────────────────────────────────────────────────

export interface FeeConfig {
  processingFeePercent: number; // % of loan
  processingFeeFlat: number; // flat amount
  insurance: number; // total insurance cost
  legalCharges: number;
  otherCharges: number;
  gst: number; // GST on processing fee %
}

// ── Home purchase mode ──────────────────────────────────────────────

export interface HomePurchaseInput {
  propertyPrice: number;
  downPaymentPercent: number; // 0-100
}

export interface HomePurchaseResult {
  downPayment: number;
  loanAmount: number;
  ltvRatio: number; // loan-to-value %
  stampDutyEstimate: number;
}

// ── Affordability ───────────────────────────────────────────────────

export interface AffordabilityInput {
  monthlyIncome: number;
  existingEmis: number;
  otherObligations: number;
  foirPercent: number; // Fixed Obligation to Income Ratio (default 50%)
  annualRate: number;
  tenureMonths: number;
}

export interface AffordabilityResult {
  maxEmi: number;
  availableForEmi: number;
  maxLoanAmount: number;
  dtiPercent: number; // current DTI
  recommendation: "safe" | "moderate" | "risky";
}

// ── Scenario compare ────────────────────────────────────────────────

export interface Scenario {
  id: string;
  name: string;
  principal: number;
  annualRate: number;
  tenureMonths: number;
  prepayments?: PrepaymentConfig;
  rateTimeline?: RateSegment[];
  fees?: FeeConfig;
}

export interface ScenarioResult extends EmiResult {
  scenario: Scenario;
  effectiveApr: number;
  totalCost: number; // total payment + fees
  totalFees: number;
}

// ── Pure EMI formula ────────────────────────────────────────────────

export function computeEmi(
  principal: number,
  annualRate: number,
  tenureMonths: number,
): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  if (annualRate === 0) return principal / tenureMonths;
  const r = annualRate / 12 / 100;
  const p = Math.pow(1 + r, tenureMonths);
  return (principal * r * p) / (p - 1);
}

// ── Compute tenure from fixed EMI ───────────────────────────────────

export function computeTenureFromEmi(
  principal: number,
  annualRate: number,
  emi: number,
): number {
  if (principal <= 0 || emi <= 0) return 0;
  if (annualRate === 0) return Math.ceil(principal / emi);
  const r = annualRate / 12 / 100;
  const monthlyInterest = principal * r;
  if (emi <= monthlyInterest) return Infinity; // EMI too low, can never pay off
  const n = Math.log(emi / (emi - principal * r)) / Math.log(1 + r);
  return Math.ceil(n);
}

// ── Full amortisation with prepayments + rate changes ───────────────

export interface FullCalcInput {
  principal: number;
  annualRate: number;
  tenureMonths: number;
  prepayments?: PrepaymentConfig;
  rateTimeline?: RateSegment[];
}

function getRateForMonth(
  month: number,
  baseRate: number,
  timeline?: RateSegment[],
): number {
  if (!timeline || timeline.length === 0) return baseRate;
  let rate = baseRate;
  for (const seg of timeline) {
    if (month >= seg.fromMonth) rate = seg.annualRate;
  }
  return rate;
}

function getPrepaymentForMonth(
  month: number,
  config?: PrepaymentConfig,
): number {
  if (!config) return 0;
  let total = 0;

  // Lump sums
  for (const ls of config.lumpSums) {
    if (ls.month === month && ls.amount > 0) total += ls.amount;
  }

  // Recurring
  for (const rec of config.recurring) {
    if (month < rec.startMonth || rec.amount <= 0) continue;
    const elapsed = month - rec.startMonth;
    switch (rec.frequency) {
      case "monthly":
        total += rec.amount;
        break;
      case "quarterly":
        if (elapsed % 3 === 0) total += rec.amount;
        break;
      case "annually":
        if (elapsed % 12 === 0) total += rec.amount;
        break;
    }
  }

  return total;
}

export function calculateEmi(input: EmiInput): EmiResult {
  return calculateFull(input);
}

export function calculateFull(input: FullCalcInput): EmiResult {
  const { principal, annualRate, tenureMonths, prepayments, rateTimeline } =
    input;

  if (principal <= 0 || annualRate < 0 || tenureMonths <= 0) {
    return {
      emi: 0,
      totalPayment: 0,
      totalInterest: 0,
      totalPrepayment: 0,
      effectiveTenure: 0,
      schedule: [],
    };
  }

  const schedule: MonthRow[] = [];
  let balance = principal;
  let currentRate = annualRate;
  let currentEmi = computeEmi(principal, currentRate, tenureMonths);
  let totalPrepayment = 0;
  let totalPayment = 0;
  let totalInterest = 0;
  // Track remaining tenure for reduce-tenure strategy
  // eslint-disable-next-line no-useless-assignment
  let remainingTenure = tenureMonths;

  // For reduce-emi strategy, track recomputed EMI
  const strategy = prepayments?.strategy ?? "reduce-tenure";

  for (let m = 1; m <= tenureMonths * 2 && balance > 0.5; m++) {
    const newRate = getRateForMonth(m, annualRate, rateTimeline);
    if (newRate !== currentRate) {
      currentRate = newRate;
      // Recompute EMI with new rate on remaining balance/tenure
      const remainingTenure = Math.max(1, tenureMonths - m + 1);
      currentEmi = computeEmi(balance, currentRate, remainingTenure);
    }

    const r = currentRate / 12 / 100;
    const interestPart = balance * r;
    let principalPart = currentEmi - interestPart;

    // If EMI > balance + interest, this is the last month
    if (principalPart >= balance) {
      principalPart = balance;
      const lastEmi = principalPart + interestPart;
      balance = 0;
      const prepay = 0; // no prepayment on last month
      totalPayment += lastEmi;
      totalInterest += interestPart;
      schedule.push({
        month: m,
        emi: lastEmi,
        principalPart,
        interestPart,
        prepayment: prepay,
        balance,
        rateUsed: currentRate,
      });
      break;
    }

    balance -= principalPart;

    // Apply prepayment
    let prepay = getPrepaymentForMonth(m, prepayments);
    if (prepay > balance) prepay = balance;
    balance -= prepay;
    totalPrepayment += prepay;

    totalPayment += currentEmi;
    totalInterest += interestPart;

    schedule.push({
      month: m,
      emi: currentEmi,
      principalPart,
      interestPart,
      prepayment: prepay,
      balance: Math.max(0, balance),
      rateUsed: currentRate,
    });

    // After prepayment, recompute EMI if reduce-emi strategy
    if (prepay > 0 && strategy === "reduce-emi" && balance > 0) {
      remainingTenure = tenureMonths - m;
      if (remainingTenure > 0) {
        currentEmi = computeEmi(balance, currentRate, remainingTenure);
      }
    }
  }

  return {
    emi: schedule.length > 0 ? schedule[0].emi : 0,
    totalPayment: totalPayment + totalPrepayment,
    totalInterest,
    totalPrepayment,
    effectiveTenure: schedule.length,
    schedule,
  };
}

// ── Calculate without prepayments (for comparison) ──────────────────

export function calculateWithoutPrepayments(input: FullCalcInput): EmiResult {
  return calculateFull({
    ...input,
    prepayments: undefined,
  });
}

// ── Home purchase calculations ──────────────────────────────────────

export function calculateHomePurchase(
  input: HomePurchaseInput,
): HomePurchaseResult {
  const downPayment = (input.propertyPrice * input.downPaymentPercent) / 100;
  const loanAmount = input.propertyPrice - downPayment;
  const ltvRatio = (loanAmount / input.propertyPrice) * 100;
  // Rough stamp duty estimate (varies by state, using 5% as common average)
  const stampDutyEstimate = input.propertyPrice * 0.05;

  return {
    downPayment,
    loanAmount,
    ltvRatio,
    stampDutyEstimate,
  };
}

// ── Fees & effective APR ────────────────────────────────────────────

export function calculateTotalFees(principal: number, fees: FeeConfig): number {
  const processingFee =
    (principal * fees.processingFeePercent) / 100 + fees.processingFeeFlat;
  const gstOnProcessing = (processingFee * fees.gst) / 100;
  return (
    processingFee +
    gstOnProcessing +
    fees.insurance +
    fees.legalCharges +
    fees.otherCharges
  );
}

export function calculateEffectiveApr(
  principal: number,
  emi: number,
  tenureMonths: number,
  totalFees: number,
): number {
  // Effective APR: the rate that makes NPV of EMI payments equal to (principal - fees)
  const netDisbursement = principal - totalFees;
  if (netDisbursement <= 0 || emi <= 0 || tenureMonths <= 0) return 0;

  // Newton-Raphson to find monthly rate
  let r = 0.01; // initial guess
  for (let i = 0; i < 100; i++) {
    const p = Math.pow(1 + r, tenureMonths);
    const f = (emi * (p - 1)) / (r * p) - netDisbursement;
    // Numerical derivative
    const numericalDeriv =
      (() => {
        const dr = 0.00001;
        const p2 = Math.pow(1 + r + dr, tenureMonths);
        return (emi * (p2 - 1)) / ((r + dr) * p2) - netDisbursement;
      })() - f;
    const adjustedDeriv = numericalDeriv / 0.00001;

    if (Math.abs(adjustedDeriv) < 1e-10) break;
    const newR = r - f / adjustedDeriv;
    if (newR <= 0) {
      r = r / 2;
      continue;
    }
    r = newR;
    if (Math.abs(f) < 0.01) break;
  }

  return r * 12 * 100;
}

// ── Affordability calculator ────────────────────────────────────────

export function calculateAffordability(
  input: AffordabilityInput,
): AffordabilityResult {
  const { monthlyIncome, existingEmis, otherObligations, foirPercent } = input;

  const maxTotalObligations = (monthlyIncome * foirPercent) / 100;
  const currentObligations = existingEmis + otherObligations;
  const availableForEmi = Math.max(0, maxTotalObligations - currentObligations);
  const dtiPercent =
    monthlyIncome > 0 ? (currentObligations / monthlyIncome) * 100 : 0;

  // Max loan amount from available EMI
  let maxLoanAmount = 0;
  if (availableForEmi > 0 && input.annualRate > 0 && input.tenureMonths > 0) {
    const r = input.annualRate / 12 / 100;
    const p = Math.pow(1 + r, input.tenureMonths);
    maxLoanAmount = (availableForEmi * (p - 1)) / (r * p);
  } else if (input.annualRate === 0 && input.tenureMonths > 0) {
    maxLoanAmount = availableForEmi * input.tenureMonths;
  }

  const totalDti =
    monthlyIncome > 0
      ? ((currentObligations + availableForEmi) / monthlyIncome) * 100
      : 0;
  let recommendation: AffordabilityResult["recommendation"] = "safe";
  if (totalDti > 60) recommendation = "risky";
  else if (totalDti > 45) recommendation = "moderate";

  return {
    maxEmi: availableForEmi,
    availableForEmi,
    maxLoanAmount,
    dtiPercent,
    recommendation,
  };
}

// ── Scenario comparison ─────────────────────────────────────────────

export function evaluateScenario(scenario: Scenario): ScenarioResult {
  const result = calculateFull({
    principal: scenario.principal,
    annualRate: scenario.annualRate,
    tenureMonths: scenario.tenureMonths,
    prepayments: scenario.prepayments,
    rateTimeline: scenario.rateTimeline,
  });

  const totalFees = scenario.fees
    ? calculateTotalFees(scenario.principal, scenario.fees)
    : 0;
  const effectiveApr =
    totalFees > 0
      ? calculateEffectiveApr(
          scenario.principal,
          result.emi,
          result.effectiveTenure,
          totalFees,
        )
      : result.schedule.length > 0
        ? scenario.annualRate
        : 0;

  return {
    ...result,
    scenario,
    effectiveApr,
    totalCost: result.totalPayment + totalFees,
    totalFees,
  };
}

// ── Year-aggregated data (for charts) ───────────────────────────────

export interface YearAggregate {
  year: number;
  label: string;
  principalPaid: number;
  interestPaid: number;
  prepaymentPaid: number;
  closingBalance: number;
}

export function aggregateByYear(
  schedule: MonthRow[],
  startMonth: number,
  startYear: number,
): YearAggregate[] {
  const map = new Map<number, YearAggregate>();

  for (const row of schedule) {
    const offset = row.month - 1;
    const date = new Date(startYear, startMonth - 1 + offset, 1);
    const calYear = date.getFullYear();

    if (!map.has(calYear)) {
      map.set(calYear, {
        year: calYear,
        label: String(calYear),
        principalPaid: 0,
        interestPaid: 0,
        prepaymentPaid: 0,
        closingBalance: 0,
      });
    }
    const agg = map.get(calYear)!;
    agg.principalPaid += row.principalPart;
    agg.interestPaid += row.interestPart;
    agg.prepaymentPaid += row.prepayment;
    agg.closingBalance = row.balance;
  }

  return Array.from(map.values()).sort((a, b) => a.year - b.year);
}

// ── CSV export ──────────────────────────────────────────────────────

export function scheduleToCSV(
  schedule: MonthRow[],
  startMonth: number,
  startYear: number,
): string {
  const header =
    "Month,Date,EMI,Principal,Interest,Prepayment,Balance,Rate (%)";
  const rows = schedule.map((r) => {
    const offset = r.month - 1;
    const date = new Date(startYear, startMonth - 1 + offset, 1);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return [
      r.month,
      dateStr,
      r.emi.toFixed(2),
      r.principalPart.toFixed(2),
      r.interestPart.toFixed(2),
      r.prepayment.toFixed(2),
      r.balance.toFixed(2),
      r.rateUsed.toFixed(2),
    ].join(",");
  });
  return [header, ...rows].join("\n");
}

// ── URL serialization for share ─────────────────────────────────────

export interface ShareableState {
  p: number; // principal
  r: number; // rate
  t: number; // tenure months
  sm: number; // start month
  sy: number; // start year
  hp?: { pp: number; dp: number }; // home purchase: property price, down payment %
}

export function encodeShareURL(state: ShareableState): string {
  const params = new URLSearchParams();
  params.set("p", String(state.p));
  params.set("r", String(state.r));
  params.set("t", String(state.t));
  params.set("sm", String(state.sm));
  params.set("sy", String(state.sy));
  if (state.hp) {
    params.set("hp_pp", String(state.hp.pp));
    params.set("hp_dp", String(state.hp.dp));
  }
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

export function decodeShareURL(search: string): ShareableState | null {
  const params = new URLSearchParams(search);
  const p = Number(params.get("p"));
  const r = Number(params.get("r"));
  const t = Number(params.get("t"));
  if (!p || !r || !t) return null;

  const state: ShareableState = {
    p,
    r,
    t,
    sm: Number(params.get("sm")) || new Date().getMonth() + 1,
    sy: Number(params.get("sy")) || new Date().getFullYear(),
  };

  const hpp = Number(params.get("hp_pp"));
  const hpd = Number(params.get("hp_dp"));
  if (hpp > 0) {
    state.hp = { pp: hpp, dp: hpd || 20 };
  }

  return state;
}

// ── Summary text for copy/share ─────────────────────────────────────

export function generateSummaryText(
  result: EmiResult,
  principal: number,
  rate: number,
  tenure: number,
  fmt: (n: number) => string,
): string {
  const lines = [
    `EMI Calculator Summary`,
    `─────────────────────`,
    `Loan Amount: ${fmt(principal)}`,
    `Interest Rate: ${rate}% p.a.`,
    `Tenure: ${tenure} months (${(tenure / 12).toFixed(1)} years)`,
    ``,
    `Monthly EMI: ${fmt(result.emi)}`,
    `Total Interest: ${fmt(result.totalInterest)}`,
    `Total Payment: ${fmt(result.totalPayment)}`,
  ];

  if (result.totalPrepayment > 0) {
    lines.push(`Total Prepayment: ${fmt(result.totalPrepayment)}`);
    lines.push(`Effective Tenure: ${result.effectiveTenure} months`);
  }

  return lines.join("\n");
}
