/**
 * EMI calculation logic.
 *
 * EMI = P × r × (1+r)^n / ((1+r)^n − 1)
 *   P = principal
 *   r = monthly interest rate (annual / 12 / 100)
 *   n = tenure in months
 */

export interface EmiInput {
  principal: number; // loan amount
  annualRate: number; // annual interest rate (%)
  tenureMonths: number; // total months
}

export interface MonthRow {
  month: number;
  emi: number;
  principalPart: number;
  interestPart: number;
  balance: number;
}

export interface EmiResult {
  emi: number;
  totalPayment: number;
  totalInterest: number;
  schedule: MonthRow[];
}

export function calculateEmi(input: EmiInput): EmiResult {
  const { principal, annualRate, tenureMonths } = input;

  if (principal <= 0 || annualRate < 0 || tenureMonths <= 0) {
    return { emi: 0, totalPayment: 0, totalInterest: 0, schedule: [] };
  }

  // Zero interest edge case
  if (annualRate === 0) {
    const emi = principal / tenureMonths;
    const schedule: MonthRow[] = [];
    let balance = principal;
    for (let m = 1; m <= tenureMonths; m++) {
      balance -= emi;
      schedule.push({
        month: m,
        emi,
        principalPart: emi,
        interestPart: 0,
        balance: Math.max(0, balance),
      });
    }
    return {
      emi,
      totalPayment: principal,
      totalInterest: 0,
      schedule,
    };
  }

  const r = annualRate / 12 / 100;
  const powFactor = Math.pow(1 + r, tenureMonths);
  const emi = (principal * r * powFactor) / (powFactor - 1);

  const schedule: MonthRow[] = [];
  let balance = principal;

  for (let m = 1; m <= tenureMonths; m++) {
    const interestPart = balance * r;
    const principalPart = emi - interestPart;
    balance -= principalPart;
    schedule.push({
      month: m,
      emi,
      principalPart,
      interestPart,
      balance: Math.max(0, balance),
    });
  }

  const totalPayment = emi * tenureMonths;
  const totalInterest = totalPayment - principal;

  return { emi, totalPayment, totalInterest, schedule };
}
