import { useMemo, useState, useCallback, useRef, type MouseEvent } from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import type { YearAggregate, MonthRow } from "../utils/emi";
import type { Fmt } from "../utils/format";

// ── Balance over time line chart ────────────────────────────────────

interface BalanceChartProps {
  schedule: MonthRow[];
  compareSchedule?: MonthRow[]; // for prepayment comparison
  startMonth: number;
  startYear: number;
  height?: number;
  fmt: Fmt;
}

export function BalanceLineChart({
  schedule,
  compareSchedule,
  startMonth,
  startYear,
  height = 200,
  fmt,
}: BalanceChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverMonth, setHoverMonth] = useState<number | null>(null);

  const data = useMemo(() => {
    if (schedule.length === 0) return null;
    const maxMonths = Math.max(schedule.length, compareSchedule?.length ?? 0);
    const maxBalance = Math.max(
      schedule[0]?.balance ?? 0,
      compareSchedule?.[0]?.balance ?? 0,
      schedule.reduce((m, r) => Math.max(m, r.balance), 0),
    );

    const principal =
      schedule.length > 0 ? schedule[0].balance + schedule[0].principalPart : 0;
    const maxVal = Math.max(principal, maxBalance);

    return { maxMonths, maxVal, principal };
  }, [schedule, compareSchedule]);

  const W = 600;
  const H = height;
  const pad = { top: 20, right: 20, bottom: 30, left: 60 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const toX = useCallback(
    (month: number) => (data ? pad.left + (month / data.maxMonths) * plotW : 0),
    [data, pad.left, plotW],
  );
  const toY = useCallback(
    (balance: number) =>
      data ? pad.top + plotH - (balance / data.maxVal) * plotH : 0,
    [data, pad.top, plotH],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent<SVGSVGElement>) => {
      if (!data || !svgRef.current) return;
      const svg = svgRef.current;
      const rect = svg.getBoundingClientRect();
      const svgX = ((e.clientX - rect.left) / rect.width) * W;
      const month = Math.round(((svgX - pad.left) / plotW) * data.maxMonths);
      const clamped = Math.max(0, Math.min(data.maxMonths, month));
      setHoverMonth(clamped);
    },
    [data, pad.left, plotW],
  );

  const handleMouseLeave = useCallback(() => setHoverMonth(null), []);

  const monthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }),
    [],
  );

  if (!data || schedule.length === 0) return null;

  // Build main path including starting point
  const mainPoints = [
    { month: 0, balance: data.principal },
    ...schedule.map((r) => ({ month: r.month, balance: r.balance })),
  ];
  const mainPath = mainPoints
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${toX(p.month).toFixed(1)},${toY(p.balance).toFixed(1)}`,
    )
    .join(" ");

  // Build compare path
  let comparePath = "";
  if (compareSchedule && compareSchedule.length > 0) {
    const comparePoints = [
      { month: 0, balance: data.principal },
      ...compareSchedule.map((r) => ({ month: r.month, balance: r.balance })),
    ];
    comparePath = comparePoints
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"}${toX(p.month).toFixed(1)},${toY(p.balance).toFixed(1)}`,
      )
      .join(" ");
  }

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    value: data.maxVal * f,
    y: toY(data.maxVal * f),
  }));

  // X-axis: show year boundaries
  const xLabels: { month: number; label: string }[] = [];
  for (let m = 0; m <= data.maxMonths; m += 12) {
    const date = new Date(startYear, startMonth - 1 + m, 1);
    xLabels.push({ month: m, label: String(date.getFullYear()) });
  }

  // Hover data
  let hoverInfo: {
    dateLabel: string;
    mainBalance: number;
    compareBalance?: number;
    cx: number;
    cy: number;
  } | null = null;

  if (hoverMonth !== null) {
    const mainBalance =
      hoverMonth === 0
        ? data.principal
        : (schedule[hoverMonth - 1]?.balance ?? 0);
    const compareBalance =
      compareSchedule && hoverMonth > 0
        ? (compareSchedule[hoverMonth - 1]?.balance ?? undefined)
        : compareSchedule
          ? data.principal
          : undefined;

    const date = new Date(startYear, startMonth - 1 + hoverMonth, 1);
    const dateLabel = hoverMonth === 0 ? "Start" : monthFormatter.format(date);

    hoverInfo = {
      dateLabel,
      mainBalance,
      compareBalance,
      cx: toX(hoverMonth),
      cy: toY(mainBalance),
    };
  }

  return (
    <div className="w-full overflow-x-auto">
      <Tooltip.Provider delay={0} closeDelay={0}>
        <Tooltip.Root open={hoverInfo !== null} trackCursorAxis="x">
          <Tooltip.Trigger
            render={
              <svg
                ref={svgRef}
                viewBox={`0 0 ${W} ${H}`}
                className="w-full cursor-crosshair"
                style={{ minWidth: 400 }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              />
            }
          >
            {/* Grid lines */}
            {yTicks.map((tick) => (
              <g key={tick.value}>
                <line
                  x1={pad.left}
                  y1={tick.y}
                  x2={W - pad.right}
                  y2={tick.y}
                  stroke="var(--color-border-muted)"
                  strokeWidth="0.5"
                />
                <text
                  x={pad.left - 6}
                  y={tick.y + 3}
                  textAnchor="end"
                  className="fill-text-muted"
                  fontSize="9"
                >
                  {fmt.compact(tick.value)}
                </text>
              </g>
            ))}

            {/* X-axis labels */}
            {xLabels.map((xl) => (
              <text
                key={xl.month}
                x={toX(xl.month)}
                y={H - 6}
                textAnchor="middle"
                className="fill-text-muted"
                fontSize="9"
              >
                {xl.label}
              </text>
            ))}

            {/* Compare line (dashed, behind main) */}
            {comparePath && (
              <path
                d={comparePath}
                fill="none"
                stroke="var(--color-text-muted)"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                opacity="0.5"
              />
            )}

            {/* Main balance line */}
            <path
              d={mainPath}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2"
            />

            {/* Fill under main line */}
            <path
              d={`${mainPath} L${toX(mainPoints[mainPoints.length - 1].month).toFixed(1)},${toY(0).toFixed(1)} L${toX(0).toFixed(1)},${toY(0).toFixed(1)} Z`}
              fill="var(--color-primary)"
              opacity="0.08"
            />

            {/* Hover crosshair + dot */}
            {hoverInfo && (
              <g>
                <line
                  x1={hoverInfo.cx}
                  y1={pad.top}
                  x2={hoverInfo.cx}
                  y2={pad.top + plotH}
                  stroke="var(--color-text-muted)"
                  strokeWidth="0.75"
                  strokeDasharray="3 2"
                  opacity="0.6"
                />
                <circle
                  cx={hoverInfo.cx}
                  cy={hoverInfo.cy}
                  r="3.5"
                  fill="var(--color-primary)"
                  stroke="var(--color-bg-surface)"
                  strokeWidth="1.5"
                />
                {hoverInfo.compareBalance !== undefined && compareSchedule && (
                  <circle
                    cx={hoverInfo.cx}
                    cy={toY(hoverInfo.compareBalance)}
                    r="2.5"
                    fill="var(--color-text-muted)"
                    stroke="var(--color-bg-surface)"
                    strokeWidth="1"
                    opacity="0.7"
                  />
                )}
              </g>
            )}
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner sideOffset={10} className="z-50">
              <Tooltip.Popup className="bg-bg-surface border border-border rounded-lg px-3 py-2 shadow-lg text-[10px] flex flex-col gap-1">
                {hoverInfo && (
                  <>
                    <span className="font-medium text-text text-xs">
                      {hoverInfo.dateLabel}
                    </span>
                    <span className="text-primary">
                      Balance: {fmt.number(hoverInfo.mainBalance)}
                    </span>
                    {hoverInfo.compareBalance !== undefined && (
                      <span className="text-text-muted">
                        Without prepay: {fmt.number(hoverInfo.compareBalance)}
                      </span>
                    )}
                  </>
                )}
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>

      {/* Legend */}
      {compareSchedule && (
        <div className="flex items-center gap-4 justify-center mt-1 text-[10px] text-text-muted">
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-0.5 bg-primary" />
            With prepayments
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-4 h-0.5 bg-text-muted opacity-50 border-dashed"
              style={{ borderTop: "1.5px dashed var(--color-text-muted)" }}
            />
            Without prepayments
          </span>
        </div>
      )}
    </div>
  );
}

// ── Principal vs Interest stacked bar chart (by year) ───────────────

interface StackedBarChartProps {
  yearData: YearAggregate[];
  height?: number;
  fmt: Fmt;
}

export function PrincipalInterestChart({
  yearData,
  height = 200,
  fmt,
}: StackedBarChartProps) {
  if (yearData.length === 0) return null;

  const W = 600;
  const H = height;
  const pad = { top: 20, right: 20, bottom: 30, left: 60 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const maxTotal = Math.max(
    ...yearData.map((y) => y.principalPaid + y.interestPaid + y.prepaymentPaid),
  );

  const barWidth = Math.min(40, (plotW / yearData.length) * 0.7);
  const gap = (plotW - barWidth * yearData.length) / (yearData.length + 1);

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    value: maxTotal * f,
    y: pad.top + plotH - f * plotH,
  }));

  const hasPrepayments = yearData.some((y) => y.prepaymentPaid > 0);

  return (
    <div className="w-full overflow-x-auto">
      <Tooltip.Provider delay={100} closeDelay={0}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ minWidth: 400 }}
        >
          {/* Grid lines */}
          {yTicks.map((tick) => (
            <g key={tick.value}>
              <line
                x1={pad.left}
                y1={tick.y}
                x2={W - pad.right}
                y2={tick.y}
                stroke="var(--color-border-muted)"
                strokeWidth="0.5"
              />
              <text
                x={pad.left - 6}
                y={tick.y + 3}
                textAnchor="end"
                className="fill-text-muted"
                fontSize="9"
              >
                {fmt.compact(tick.value)}
              </text>
            </g>
          ))}

          {/* Bars */}
          {yearData.map((yr, i) => {
            const x = pad.left + gap + i * (barWidth + gap);
            const interestH = (yr.interestPaid / maxTotal) * plotH;
            const principalH = (yr.principalPaid / maxTotal) * plotH;
            const prepayH = (yr.prepaymentPaid / maxTotal) * plotH;
            const totalH = interestH + principalH + prepayH;
            const baseY = pad.top + plotH;

            return (
              <Tooltip.Root key={yr.year}>
                <Tooltip.Trigger
                  render={
                    <g className="cursor-pointer [&:hover_rect]:opacity-85" />
                  }
                >
                  {/* Interest (bottom) */}
                  <rect
                    x={x}
                    y={baseY - interestH}
                    width={barWidth}
                    height={Math.max(0, interestH)}
                    fill="var(--color-accent-subtle)"
                    className="dark:fill-accent/30 transition-opacity"
                    rx="1"
                  />
                  {/* Principal (middle) */}
                  <rect
                    x={x}
                    y={baseY - interestH - principalH}
                    width={barWidth}
                    height={Math.max(0, principalH)}
                    fill="var(--color-primary)"
                    className="transition-opacity"
                    rx="1"
                  />
                  {/* Prepayment (top) */}
                  {prepayH > 0 && (
                    <rect
                      x={x}
                      y={baseY - interestH - principalH - prepayH}
                      width={barWidth}
                      height={Math.max(0, prepayH)}
                      fill="var(--color-success)"
                      className="transition-opacity"
                      rx="1"
                    />
                  )}
                  {/* Transparent hit area for the full column height */}
                  <rect
                    x={x}
                    y={baseY - totalH}
                    width={barWidth}
                    height={Math.max(0, totalH)}
                    fill="transparent"
                  />
                  {/* Year label */}
                  <text
                    x={x + barWidth / 2}
                    y={H - 6}
                    textAnchor="middle"
                    className="fill-text-muted"
                    fontSize="9"
                  >
                    {yr.label.slice(-2)}
                  </text>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Positioner sideOffset={6} className="z-50">
                    <Tooltip.Popup className="bg-bg-surface border border-border rounded-lg px-3 py-2 shadow-lg text-[10px] flex flex-col gap-1 origin-(--transform-origin) transition-[transform,scale,opacity] data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0">
                      <span className="font-medium text-text text-xs">
                        {yr.label}
                      </span>
                      <span className="text-primary">
                        Principal: {fmt.number(yr.principalPaid)}
                      </span>
                      <span className="text-accent dark:text-accent/60">
                        Interest: {fmt.number(yr.interestPaid)}
                      </span>
                      {yr.prepaymentPaid > 0 && (
                        <span className="text-success">
                          Prepayment: {fmt.number(yr.prepaymentPaid)}
                        </span>
                      )}
                      <span className="text-text-muted border-t border-border-muted pt-1 mt-0.5">
                        Balance: {fmt.number(yr.closingBalance)}
                      </span>
                    </Tooltip.Popup>
                  </Tooltip.Positioner>
                </Tooltip.Portal>
              </Tooltip.Root>
            );
          })}
        </svg>
      </Tooltip.Provider>

      {/* Legend */}
      <div className="flex items-center gap-3 justify-center mt-1 text-[10px] text-text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-primary" />
          Principal
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-accent-subtle dark:bg-accent/30" />
          Interest
        </span>
        {hasPrepayments && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-success" />
            Prepayment
          </span>
        )}
      </div>
    </div>
  );
}
