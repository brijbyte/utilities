import { useCallback } from "react";
import { Printer } from "lucide-react";
import type { EmiResult, MonthRow, YearAggregate } from "../utils/emi";
import type { Fmt } from "../utils/format";

export interface PrintData {
  effectivePrincipal: number;
  rate: number;
  activeTenure: number;
  startMonth: number;
  startYear: number;
  result: EmiResult;
  baselineSchedule?: MonthRow[];
  yearData: YearAggregate[];
  hasFees: boolean;
  totalFees: number;
  effectiveApr: number;
  prepaymentSavings: {
    interestSaved: number;
    tenureReduced: number;
  } | null;
  homeMode: boolean;
  propertyPrice: number;
  downPaymentPct: number;
  fmt: Fmt;
}

export function PrintButton({ data }: { data: PrintData }) {
  const handlePrint = useCallback(() => {
    const html = buildPrintHTML(data);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
  }, [data]);

  return (
    <button
      onClick={handlePrint}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border bg-bg-surface text-text hover:bg-bg-hover cursor-pointer transition-colors"
    >
      <Printer size={13} />
      <span className="hidden sm:inline">Print Report</span>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// HTML builder — self-contained document with inline styles
// ═══════════════════════════════════════════════════════════════════

function buildPrintHTML(d: PrintData): string {
  const { fmt } = d;
  const monthFormatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
  });

  // ── Summary rows ──────────────────────────────────────────────
  const summaryRows = [
    ["Loan Amount", fmt.currency(d.effectivePrincipal)],
    ["Interest Rate", fmt.percent(d.rate)],
    ["Tenure", fmt.tenure(d.activeTenure)],
    [
      "EMI Start",
      monthFormatter.format(new Date(d.startYear, d.startMonth - 1, 1)),
    ],
    ["Monthly EMI", fmt.currency(d.result.emi)],
    ["Total Interest", fmt.currency(d.result.totalInterest)],
    ["Total Payment", fmt.currency(d.result.totalPayment)],
    ["Effective Tenure", fmt.tenure(d.result.effectiveTenure)],
  ];

  if (d.homeMode) {
    summaryRows.unshift(
      ["Property Price", fmt.currency(d.propertyPrice)],
      ["Down Payment", `${d.downPaymentPct}%`],
    );
  }

  if (d.hasFees) {
    summaryRows.push(
      ["Total Fees", fmt.currency(d.totalFees)],
      ["Effective APR", fmt.percent(d.effectiveApr)],
    );
  }

  if (d.prepaymentSavings) {
    summaryRows.push(
      ["Interest Saved", fmt.currency(d.prepaymentSavings.interestSaved)],
      ["Tenure Reduced", fmt.tenure(d.prepaymentSavings.tenureReduced)],
      ["Total Prepaid", fmt.currency(d.result.totalPrepayment)],
    );
  }

  // ── Donut chart SVG ───────────────────────────────────────────
  const donutSvg = buildDonutSVG(
    d.effectivePrincipal,
    d.result.totalInterest,
    d.hasFees ? d.totalFees : 0,
    fmt,
  );

  // ── Balance line chart SVG ────────────────────────────────────
  const balanceSvg = buildBalanceChartSVG(
    d.result.schedule,
    d.baselineSchedule,
    d.startMonth,
    d.startYear,
    fmt,
  );

  // ── Stacked bar chart SVG ─────────────────────────────────────
  const barSvg = buildBarChartSVG(d.yearData, fmt);

  // ── Schedule table ────────────────────────────────────────────
  const hasPrepay = d.result.totalPrepayment > 0;

  // Group schedule by calendar year
  type Row = MonthRow & { dateLabel: string; calendarYear: number };
  const yearGroups = new Map<number, Row[]>();
  for (const row of d.result.schedule) {
    const date = new Date(d.startYear, d.startMonth - 1 + (row.month - 1), 1);
    const cy = date.getFullYear();
    const dateLabel = monthFormatter.format(date);
    if (!yearGroups.has(cy)) yearGroups.set(cy, []);
    yearGroups.get(cy)!.push({ ...row, dateLabel, calendarYear: cy });
  }

  const scheduleHTML = Array.from(yearGroups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, rows]) => {
      const totP = rows.reduce((s, r) => s + r.principalPart, 0);
      const totI = rows.reduce((s, r) => s + r.interestPart, 0);
      const totPP = rows.reduce((s, r) => s + r.prepayment, 0);
      const closeBal = rows[rows.length - 1].balance;

      const yearHeader = `
        <tr class="year-header">
          <td colspan="${hasPrepay ? 7 : 6}">
            <strong>${year}</strong>
            <span class="year-totals">
              P: ${fmt.compact(totP)} &nbsp;|&nbsp;
              I: ${fmt.compact(totI)}
              ${hasPrepay && totPP > 0 ? ` &nbsp;|&nbsp; PP: ${fmt.compact(totPP)}` : ""}
              &nbsp;|&nbsp; Bal: ${fmt.compact(closeBal)}
            </span>
          </td>
        </tr>`;

      const monthRows = rows
        .map(
          (r) => `
        <tr${r.prepayment > 0 ? ' class="prepay-row"' : ""}>
          <td>${r.dateLabel}</td>
          <td class="num">${fmt.number(r.emi)}</td>
          <td class="num principal">${fmt.number(r.principalPart)}</td>
          <td class="num">${fmt.number(r.interestPart)}</td>
          ${hasPrepay ? `<td class="num prepay">${r.prepayment > 0 ? fmt.number(r.prepayment) : "—"}</td>` : ""}
          <td class="num">${fmt.number(r.balance)}</td>
          <td class="num muted">${r.rateUsed.toFixed(1)}%</td>
        </tr>`,
        )
        .join("");

      return yearHeader + monthRows;
    })
    .join("");

  // ── Full HTML ─────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>EMI Report — ${fmt.currency(d.effectivePrincipal)} @ ${fmt.percent(d.rate)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11px;
      color: #1c1917;
      padding: 16mm;
      line-height: 1.4;
    }
    h1 { font-size: 18px; margin-bottom: 2px; }
    .subtitle { font-size: 11px; color: #78716c; margin-bottom: 20px; }
    h2 {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #78716c;
      border-bottom: 1px solid #e7e5e4;
      padding-bottom: 4px;
      margin: 24px 0 10px;
    }
    h2:first-of-type { margin-top: 0; }

    /* Summary grid */
    .summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }
    .summary-item {
      border: 1px solid #e7e5e4;
      border-radius: 6px;
      padding: 8px 10px;
    }
    .summary-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #78716c; }
    .summary-value { font-size: 13px; font-weight: 600; margin-top: 2px; }
    .summary-value.primary { color: #2563eb; }
    .summary-value.success { color: #16a34a; }
    .summary-value.danger { color: #dc2626; }

    /* Charts */
    .charts { display: flex; gap: 20px; align-items: flex-start; margin: 10px 0; }
    .chart-block { flex: 1; min-width: 0; }
    .chart-block.donut { flex: 0 0 160px; text-align: center; }
    .chart-title { font-size: 10px; font-weight: 600; margin-bottom: 6px; }
    .chart-legend { display: flex; gap: 12px; justify-content: center; margin-top: 6px; font-size: 9px; color: #78716c; }
    .chart-legend span { display: flex; align-items: center; gap: 3px; }
    .dot { display: inline-block; width: 8px; height: 8px; border-radius: 2px; }
    .dot-primary { background: #2563eb; }
    .dot-interest { background: #dbeafe; }
    .dot-prepay { background: #16a34a; }
    .dot-fees { background: #dc2626; opacity: 0.6; }
    svg text { font-family: inherit; }

    /* Schedule table */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      page-break-inside: auto;
    }
    thead th {
      text-align: right;
      padding: 4px 8px;
      border-bottom: 2px solid #d6d3d1;
      font-weight: 600;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #78716c;
    }
    thead th:first-child { text-align: left; }
    tbody td {
      padding: 3px 8px;
      border-bottom: 1px solid #f5f5f4;
    }
    tbody td:first-child { text-align: left; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .principal { color: #2563eb; }
    .prepay { color: #16a34a; }
    .muted { color: #a8a29e; }
    .year-header td {
      background: #fafaf9;
      padding: 6px 8px;
      border-bottom: 1px solid #e7e5e4;
      font-size: 11px;
    }
    .year-header .year-totals {
      float: right;
      font-size: 9px;
      font-weight: normal;
      color: #78716c;
    }
    .prepay-row { background: #f0fdf4; }
    tr { page-break-inside: avoid; }

    /* Toggle visibility */
    body.hide-charts .charts-section { display: none; }

    /* Print toolbar */
    .print-toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 10px 16px;
      margin: -16mm -16mm 20px;
      background: #f5f5f4;
      border-bottom: 1px solid #e7e5e4;
      font-size: 12px;
    }
    .print-toolbar label {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      user-select: none;
      color: #44403c;
    }
    .print-toolbar input[type="checkbox"] {
      width: 14px;
      height: 14px;
      accent-color: #2563eb;
      cursor: pointer;
    }
    .print-toolbar button {
      margin-left: auto;
      padding: 6px 16px;
      font-size: 12px;
      font-weight: 600;
      color: #fff;
      background: #2563eb;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
    .print-toolbar button:hover { background: #1d4ed8; }

    @media print {
      body { padding: 10mm; }
      .no-print { display: none !important; }
      @page { size: A4; margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="print-toolbar no-print">
    <label>
      <input type="checkbox" checked onchange="document.body.classList.toggle('hide-charts', !this.checked)">
      Include Charts
    </label>
    <button onclick="window.print()">Print</button>
  </div>

  <h1>EMI Amortisation Report</h1>
  <p class="subtitle">${fmt.currency(d.effectivePrincipal)} @ ${fmt.percent(d.rate)} for ${fmt.tenure(d.activeTenure)} — Generated ${new Date().toLocaleDateString()}</p>

  <h2>Loan Summary</h2>
  <div class="summary">
    ${summaryRows
      .map(
        ([label, value]) => `
    <div class="summary-item">
      <div class="summary-label">${label}</div>
      <div class="summary-value${label === "Monthly EMI" || label === "Loan Amount" ? " primary" : ""}${label.startsWith("Interest Saved") || label.startsWith("Tenure Reduced") ? " success" : ""}${label === "Total Fees" ? " danger" : ""}">${value}</div>
    </div>`,
      )
      .join("")}
  </div>

  <div class="charts-section">
    <h2>Charts</h2>
    <div class="charts">
      <div class="chart-block donut">
        <div class="chart-title">Payment Breakdown</div>
        ${donutSvg}
        <div class="chart-legend">
          <span><span class="dot dot-primary"></span> Principal</span>
          <span><span class="dot dot-interest"></span> Interest</span>
          ${d.hasFees ? '<span><span class="dot dot-fees"></span> Fees</span>' : ""}
        </div>
      </div>
      <div class="chart-block">
        <div class="chart-title">Balance Over Time</div>
        ${balanceSvg}
      </div>
    </div>
    <div style="margin-top: 10px;">
      <div class="chart-title">Principal vs Interest by Year</div>
      ${barSvg}
      <div class="chart-legend">
        <span><span class="dot dot-primary"></span> Principal</span>
        <span><span class="dot dot-interest"></span> Interest</span>
        <span><span class="dot dot-prepay"></span> Prepayment</span>
      </div>
    </div>
  </div>

  <h2>Amortisation Schedule</h2>
  <table>
    <thead>
      <tr>
        <th style="text-align:left">Month</th>
        <th>EMI</th>
        <th>Principal</th>
        <th>Interest</th>
        ${hasPrepay ? "<th>Prepay</th>" : ""}
        <th>Balance</th>
        <th>Rate</th>
      </tr>
    </thead>
    <tbody>
      ${scheduleHTML}
    </tbody>
  </table>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════
// SVG chart builders (self-contained, no CSS vars)
// ═══════════════════════════════════════════════════════════════════

function buildDonutSVG(
  principal: number,
  interest: number,
  fees: number,
  fmt: Fmt,
): string {
  const total = principal + interest + fees;
  if (total === 0) return "";

  const r = 50;
  const c = 2 * Math.PI * r;
  const pArc = (principal / total) * c;
  const iArc = (interest / total) * c;
  const fArc = (fees / total) * c;

  return `<svg viewBox="0 0 120 120" width="140" height="140" style="transform:rotate(-90deg)">
  <circle cx="60" cy="60" r="${r}" fill="none" stroke="#2563eb" stroke-width="14"
    stroke-dasharray="${pArc.toFixed(2)} ${c.toFixed(2)}" stroke-dashoffset="0"/>
  <circle cx="60" cy="60" r="${r}" fill="none" stroke="#dbeafe" stroke-width="14"
    stroke-dasharray="${iArc.toFixed(2)} ${c.toFixed(2)}" stroke-dashoffset="${(-pArc).toFixed(2)}"/>
  ${
    fArc > 0.5
      ? `<circle cx="60" cy="60" r="${r}" fill="none" stroke="#dc2626" stroke-width="14" opacity="0.6"
    stroke-dasharray="${fArc.toFixed(2)} ${c.toFixed(2)}" stroke-dashoffset="${(-(pArc + iArc)).toFixed(2)}"/>`
      : ""
  }
</svg>
<div style="margin-top:4px; font-size:10px; color:#78716c;">Total: <strong style="color:#1c1917">${fmt.compact(total)}</strong></div>`;
}

function buildBalanceChartSVG(
  schedule: MonthRow[],
  compareSchedule: MonthRow[] | undefined,
  startMonth: number,
  startYear: number,
  fmt: Fmt,
): string {
  if (schedule.length === 0) return "";

  const W = 500;
  const H = 180;
  const pad = { top: 16, right: 16, bottom: 26, left: 54 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const maxMonths = Math.max(schedule.length, compareSchedule?.length ?? 0);
  const principal = schedule[0].balance + schedule[0].principalPart;
  const maxVal = Math.max(
    principal,
    schedule.reduce((m, r) => Math.max(m, r.balance), 0),
  );

  const toX = (m: number) => pad.left + (m / maxMonths) * plotW;
  const toY = (b: number) => pad.top + plotH - (b / maxVal) * plotH;

  // Main path
  const pts = [
    { m: 0, b: principal },
    ...schedule.map((r) => ({ m: r.month, b: r.balance })),
  ];
  const mainPath = pts
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${toX(p.m).toFixed(1)},${toY(p.b).toFixed(1)}`,
    )
    .join(" ");

  // Compare path
  let comparePath = "";
  if (compareSchedule && compareSchedule.length > 0) {
    const cPts = [
      { m: 0, b: principal },
      ...compareSchedule.map((r) => ({ m: r.month, b: r.balance })),
    ];
    comparePath = cPts
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"}${toX(p.m).toFixed(1)},${toY(p.b).toFixed(1)}`,
      )
      .join(" ");
  }

  // Y ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    label: fmt.compact(maxVal * f),
    y: toY(maxVal * f),
  }));

  // X labels
  const xLabels: { m: number; label: string }[] = [];
  for (let m = 0; m <= maxMonths; m += 12) {
    const date = new Date(startYear, startMonth - 1 + m, 1);
    xLabels.push({ m, label: String(date.getFullYear()) });
  }

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="min-width:350px">
  ${yTicks
    .map(
      (t) => `
  <line x1="${pad.left}" y1="${t.y.toFixed(1)}" x2="${W - pad.right}" y2="${t.y.toFixed(1)}" stroke="#e7e5e4" stroke-width="0.5"/>
  <text x="${pad.left - 4}" y="${(t.y + 3).toFixed(1)}" text-anchor="end" fill="#78716c" font-size="8">${t.label}</text>`,
    )
    .join("")}
  ${xLabels
    .map(
      (xl) =>
        `<text x="${toX(xl.m).toFixed(1)}" y="${H - 4}" text-anchor="middle" fill="#78716c" font-size="8">${xl.label}</text>`,
    )
    .join("")}
  ${comparePath ? `<path d="${comparePath}" fill="none" stroke="#a8a29e" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.5"/>` : ""}
  <path d="${mainPath}" fill="none" stroke="#2563eb" stroke-width="2"/>
  <path d="${mainPath} L${toX(pts[pts.length - 1].m).toFixed(1)},${toY(0).toFixed(1)} L${toX(0).toFixed(1)},${toY(0).toFixed(1)} Z" fill="#2563eb" opacity="0.08"/>
</svg>${
    compareSchedule
      ? `<div class="chart-legend" style="margin-top:4px">
    <span><span style="display:inline-block;width:14px;height:2px;background:#2563eb"></span> With prepayments</span>
    <span><span style="display:inline-block;width:14px;height:0;border-top:1.5px dashed #a8a29e"></span> Without</span>
  </div>`
      : ""
  }`;
}

function buildBarChartSVG(yearData: YearAggregate[], fmt: Fmt): string {
  if (yearData.length === 0) return "";

  const W = 600;
  const H = 180;
  const pad = { top: 16, right: 16, bottom: 26, left: 54 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const maxTotal = Math.max(
    ...yearData.map((y) => y.principalPaid + y.interestPaid + y.prepaymentPaid),
  );

  const barWidth = Math.min(36, (plotW / yearData.length) * 0.7);
  const gap = (plotW - barWidth * yearData.length) / (yearData.length + 1);

  // Y ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    label: fmt.compact(maxTotal * f),
    y: pad.top + plotH - f * plotH,
  }));

  const bars = yearData
    .map((yr, i) => {
      const x = pad.left + gap + i * (barWidth + gap);
      const iH = (yr.interestPaid / maxTotal) * plotH;
      const pH = (yr.principalPaid / maxTotal) * plotH;
      const ppH = (yr.prepaymentPaid / maxTotal) * plotH;
      const baseY = pad.top + plotH;

      return `<rect x="${x.toFixed(1)}" y="${(baseY - iH).toFixed(1)}" width="${barWidth}" height="${Math.max(0, iH).toFixed(1)}" fill="#dbeafe" rx="1"/>
<rect x="${x.toFixed(1)}" y="${(baseY - iH - pH).toFixed(1)}" width="${barWidth}" height="${Math.max(0, pH).toFixed(1)}" fill="#2563eb" rx="1"/>
${ppH > 0 ? `<rect x="${x.toFixed(1)}" y="${(baseY - iH - pH - ppH).toFixed(1)}" width="${barWidth}" height="${Math.max(0, ppH).toFixed(1)}" fill="#16a34a" rx="1"/>` : ""}
<text x="${(x + barWidth / 2).toFixed(1)}" y="${H - 4}" text-anchor="middle" fill="#78716c" font-size="8">${yr.label.slice(-2)}</text>`;
    })
    .join("\n");

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="min-width:350px">
  ${yTicks
    .map(
      (t) => `
  <line x1="${pad.left}" y1="${t.y.toFixed(1)}" x2="${W - pad.right}" y2="${t.y.toFixed(1)}" stroke="#e7e5e4" stroke-width="0.5"/>
  <text x="${pad.left - 4}" y="${(t.y + 3).toFixed(1)}" text-anchor="end" fill="#78716c" font-size="8">${t.label}</text>`,
    )
    .join("")}
  ${bars}
</svg>`;
}
