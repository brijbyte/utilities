import { Copy, Link2, Trash2, BookmarkPlus, Bookmark } from "lucide-react";
import {
  encodeShareURL,
  generateSummaryText,
  type EmiResult,
} from "../utils/emi";
import type { Fmt } from "../utils/format";
import { CopyBtn, Section } from "./ui";
import {
  saveScenariosToStorage,
  type SavedScenario,
  type SecondaryView,
} from "../utils/types";

interface ShareTabProps {
  effectivePrincipal: number;
  rate: number;
  activeTenure: number;
  startMonth: number;
  startYear: number;
  solveMode: "emi" | "tenure";
  fixedEmi: number;
  homeMode: boolean;
  propertyPrice: number;
  downPaymentPct: number;
  result: EmiResult;
  savedScenarios: SavedScenario[];
  setSavedScenarios: (v: SavedScenario[]) => void;
  // Callbacks for loading a saved scenario
  setPrincipal: (v: number) => void;
  setRate: (v: number) => void;
  setTenure: (v: number) => void;
  setStartMonth: (v: number) => void;
  setStartYear: (v: number) => void;
  setSolveMode: (v: "emi" | "tenure") => void;
  setFixedEmi: (v: number) => void;
  setHomeMode: (v: boolean) => void;
  setPropertyPrice: (v: number) => void;
  setDownPaymentPct: (v: number) => void;
  setSecondaryView: (v: SecondaryView | null) => void;
  fmt: Fmt;
}

export function ShareTab({
  effectivePrincipal,
  rate,
  activeTenure,
  startMonth,
  startYear,
  solveMode,
  fixedEmi,
  homeMode,
  propertyPrice,
  downPaymentPct,
  result,
  savedScenarios,
  setSavedScenarios,
  setPrincipal,
  setRate,
  setTenure,
  setStartMonth,
  setStartYear,
  setSolveMode,
  setFixedEmi,
  setHomeMode,
  setPropertyPrice,
  setDownPaymentPct,
  setSecondaryView,
  fmt,
}: ShareTabProps) {
  const shareUrl = encodeShareURL({
    p: effectivePrincipal,
    r: rate,
    t: activeTenure,
    sm: startMonth,
    sy: startYear,
    hp: homeMode ? { pp: propertyPrice, dp: downPaymentPct } : undefined,
  });

  const summaryText = generateSummaryText(
    result,
    effectivePrincipal,
    rate,
    activeTenure,
    fmt.number,
  );

  function handleSave() {
    const newSaved: SavedScenario = {
      id: Date.now().toString(36),
      name: `Scenario ${savedScenarios.length + 1}`,
      savedAt: Date.now(),
      principal: effectivePrincipal,
      rate,
      tenure: activeTenure,
      startMonth,
      startYear,
      mode: solveMode,
      fixedEmi: solveMode === "tenure" ? fixedEmi : undefined,
      homePurchase: homeMode
        ? { propertyPrice, downPaymentPercent: downPaymentPct, enabled: true }
        : undefined,
    };
    const updated = [...savedScenarios, newSaved];
    setSavedScenarios(updated);
    saveScenariosToStorage(updated);
  }

  function handleLoad(sc: SavedScenario) {
    setPrincipal(sc.principal);
    setRate(sc.rate);
    setTenure(sc.tenure);
    setStartMonth(sc.startMonth);
    setStartYear(sc.startYear);
    setSolveMode(sc.mode);
    if (sc.fixedEmi) setFixedEmi(sc.fixedEmi);
    if (sc.homePurchase?.enabled) {
      setHomeMode(true);
      setPropertyPrice(sc.homePurchase.propertyPrice);
      setDownPaymentPct(sc.homePurchase.downPaymentPercent);
    } else {
      setHomeMode(false);
    }
    setSecondaryView(null);
  }

  function handleDelete(id: string) {
    const updated = savedScenarios.filter((s) => s.id !== id);
    setSavedScenarios(updated);
    saveScenariosToStorage(updated);
  }

  return (
    <Section title="Save & Share">
      <p className="text-xs text-text-muted">
        Save scenarios locally, share via URL, or copy a summary.
      </p>

      <div className="flex flex-col gap-3">
        {/* Save current */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-text rounded border border-primary hover:bg-primary-hover transition-colors cursor-pointer"
          >
            <BookmarkPlus size={13} /> Save Current Scenario
          </button>
        </div>

        {/* Saved list */}
        {savedScenarios.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-text flex items-center gap-1">
              <Bookmark size={12} /> Saved Scenarios
            </h3>
            {savedScenarios.map((sc) => (
              <div
                key={sc.id}
                className="flex items-center justify-between p-2 bg-bg-inset rounded-lg"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-text">
                    {sc.name}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {fmt.compact(sc.principal)} @ {sc.rate}% for{" "}
                    {fmt.tenure(sc.tenure)}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {new Date(sc.savedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleLoad(sc)}
                    className="text-[10px] text-primary hover:text-primary-hover cursor-pointer px-1.5 py-0.5 rounded hover:bg-bg-hover transition-colors"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => handleDelete(sc.id)}
                    className="p-1 text-danger hover:bg-bg-hover rounded transition-colors cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Share via URL */}
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-text flex items-center gap-1">
            <Link2 size={12} /> Share via URL
          </h3>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[10px] text-text-muted bg-bg-inset px-2 py-1.5 rounded font-mono overflow-hidden text-ellipsis whitespace-nowrap">
              {shareUrl}
            </code>
            <CopyBtn text={shareUrl} label="Copy URL" />
          </div>
        </div>

        {/* Copy summary */}
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-text flex items-center gap-1">
            <Copy size={12} /> Copy Summary
          </h3>
          <div className="p-2 bg-bg-inset rounded-lg text-[10px] text-text-muted font-mono whitespace-pre-line">
            {summaryText}
          </div>
          <CopyBtn text={summaryText} label="Copy to Clipboard" />
        </div>
      </div>
    </Section>
  );
}
