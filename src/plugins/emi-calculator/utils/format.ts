/**
 * Locale-aware number formatting with user-selectable currency/locale preset.
 *
 * Pure module — no React. Defines presets, the Fmt interface, and createFmt().
 * React integration lives in FormatContext.tsx.
 */

// ── Locale presets ──────────────────────────────────────────────────

export interface LocalePreset {
  id: string;
  label: string;
  locale: string;
  symbol: string;
  /** Use manual lakh/crore compact formatting */
  indianCompact: boolean;
}

const deviceLocale =
  typeof navigator !== "undefined" ? navigator.language : "en";
const deviceIsIndian = /^(en-IN|hi|bn|ta|te|mr|gu|kn|ml|pa|or|as)/i.test(
  deviceLocale,
);

export const PRESETS: LocalePreset[] = [
  {
    id: "auto",
    label: `Device (${deviceLocale})`,
    locale: deviceLocale,
    symbol: deviceIsIndian ? "₹" : "$",
    indianCompact: deviceIsIndian,
  },
  {
    id: "in",
    label: "₹ Indian Rupee",
    locale: "en-IN",
    symbol: "₹",
    indianCompact: true,
  },
  {
    id: "us",
    label: "$ US Dollar",
    locale: "en-US",
    symbol: "$",
    indianCompact: false,
  },
  {
    id: "eu",
    label: "€ Euro",
    locale: "de-DE",
    symbol: "€",
    indianCompact: false,
  },
  {
    id: "gb",
    label: "£ British Pound",
    locale: "en-GB",
    symbol: "£",
    indianCompact: false,
  },
  {
    id: "jp",
    label: "¥ Japanese Yen",
    locale: "ja-JP",
    symbol: "¥",
    indianCompact: false,
  },
];

/** Map of preset id → label for Base UI Select `items` prop */
export const PRESET_ITEMS: Record<string, string> = Object.fromEntries(
  PRESETS.map((p) => [p.id, p.label]),
);

// ── Formatter object ────────────────────────────────────────────────

export interface Fmt {
  preset: LocalePreset;
  /** Format with locale-aware grouping. India: 1,00,00,000. US: 10,000,000 */
  number: (n: number) => string;
  /** Format with currency symbol prepended. */
  currency: (n: number) => string;
  /** Compact: 1.5Cr / 50L (India) or 15M / 500K (Western) */
  compact: (n: number) => string;
  /** Percentage: "8.5%" */
  percent: (n: number, decimals?: number) => string;
  /** Tenure: "5 yrs 3 mo" */
  tenure: (months: number) => string;
  /** Currency symbol */
  symbol: string;
}

export function createFmt(preset: LocalePreset): Fmt {
  const integerFmt = new Intl.NumberFormat(preset.locale, {
    maximumFractionDigits: 0,
  });
  const compactFmt = new Intl.NumberFormat(preset.locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  });

  function number(n: number): string {
    if (!Number.isFinite(n)) return "—";
    return integerFmt.format(Math.round(n));
  }

  function currency(n: number): string {
    if (!Number.isFinite(n)) return "—";
    return `${preset.symbol}${integerFmt.format(Math.round(n))}`;
  }

  function compact(n: number): string {
    if (!Number.isFinite(n)) return "—";
    if (preset.indianCompact) {
      const abs = Math.abs(n);
      const sign = n < 0 ? "-" : "";
      if (abs >= 10000000) return `${sign}${(abs / 10000000).toFixed(1)}Cr`;
      if (abs >= 100000) return `${sign}${(abs / 100000).toFixed(1)}L`;
      if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}K`;
      return integerFmt.format(Math.round(n));
    }
    return compactFmt.format(n);
  }

  function percent(n: number, decimals = 1): string {
    if (!Number.isFinite(n)) return "—";
    return `${n.toFixed(decimals)}%`;
  }

  function tenure(months: number): string {
    if (months <= 0) return "0 months";
    const y = Math.floor(months / 12);
    const m = months % 12;
    if (y === 0) return `${m} month${m !== 1 ? "s" : ""}`;
    if (m === 0) return `${y} yr${y !== 1 ? "s" : ""}`;
    return `${y} yr${y !== 1 ? "s" : ""} ${m} mo`;
  }

  return {
    preset,
    number,
    currency,
    compact,
    percent,
    tenure,
    symbol: preset.symbol,
  };
}

// ── LocalStorage key ────────────────────────────────────────────────

export const FORMAT_STORAGE_KEY = "emi-calc-locale";
