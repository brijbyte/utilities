import type { HomePurchaseInput } from "./emi";

// ── Secondary tool view (only for tools that are genuinely separate) ─

export type SecondaryView = "affordability" | "compare" | "share";

// ── Saved scenario ──────────────────────────────────────────────────

export interface SavedScenario {
  id: string;
  name: string;
  savedAt: number;
  principal: number;
  rate: number;
  tenure: number;
  startMonth: number;
  startYear: number;
  mode: "emi" | "tenure";
  fixedEmi?: number;
  homePurchase?: HomePurchaseInput & { enabled: boolean };
}

export function loadSavedScenarios(): SavedScenario[] {
  try {
    const raw = localStorage.getItem("emi-calc-saved");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveScenariosToStorage(scenarios: SavedScenario[]) {
  localStorage.setItem("emi-calc-saved", JSON.stringify(scenarios));
}
