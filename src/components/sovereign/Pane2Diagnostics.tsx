// Sovereign Glidepath — Pane 2 (Intelligence Diagnostics) (Build 126
// file-size cleanup, Stage 3f).
//
// Extracted from SovereignGlidepath.tsx as a pure presentational component —
// same pattern as every other extraction in this cleanup. This is the
// biggest prop surface of the batch (Pane 2 reads more live state than
// anywhere else in the app: the full `calc` and `directive` result objects,
// the realised-inflation tracking state, the Scenario Stress Test slider
// and its hypothetical preview, and the State Test Presets panel's full
// read/write surface) — but the safety property is identical to every
// smaller extraction: nothing here owns state that wasn't already owned by
// the parent, so there is no behavioural change, only a relocation of JSX.

import type { CalcOutputs, Directive, InflationTrackingResult, UnderspendSignalResult } from "@/lib/sovereign/engine";
import { cleanNum, formatGBP } from "@/lib/sovereign/engine";
import type { DefensiveRecResult } from "@/lib/sovereign/defensiveRec";
import type { ThresholdMode } from "@/lib/sovereign/drawdown";
import type { CpiReferenceTable } from "@/lib/sovereign/cpiReference";
import { useState } from "react";
import { StateTestPresets, type PresetValues } from "./StateTestPresets";
import { MoneyInput, IntInput, type CurrencySymbol } from "./FormInputs";

// Build 134 — editable link to the source used for the "Actual CPI since
// last entry" field. Plain localStorage (not the encrypted vault) since a
// URL preference isn't sensitive data — same pattern as the disclaimer flag
// in SovereignGlidepath.tsx. Left click opens it; shift-click lets the user
// repoint it if ONS ever restructures their site.
const ONS_LINK_KEY = "shd_ons_inflation_link_v1";
const DEFAULT_ONS_LINK = "https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7bt/mm23";

function getOnsInflationLink(): string {
  try {
    return localStorage.getItem(ONS_LINK_KEY) || DEFAULT_ONS_LINK;
  } catch {
    return DEFAULT_ONS_LINK;
  }
}

function handleOnsLinkClick(e: React.MouseEvent) {
  const current = getOnsInflationLink();
  if (e.shiftKey) {
    const next = window.prompt("ONS inflation page link (shift-click this button any time to change it):", current);
    if (next && next.trim()) {
      try {
        localStorage.setItem(ONS_LINK_KEY, next.trim());
      } catch {
        /* localStorage unavailable — link just won't persist this session */
      }
    }
    return;
  }
  window.open(current, "_blank", "noopener,noreferrer");
}

export interface StressPreviewData {
  hypEq: number;
  hypCalc: CalcOutputs;
  hypRec: DefensiveRecResult;
  hypDirective: Directive;
  hypBucket: "equities" | "cash" | undefined;
}

export interface Pane2DiagnosticsProps {
  currency: CurrencySymbol;
  calc: CalcOutputs;
  directive: Directive;

  // State Test Presets (QA panel)
  showStatePresets: boolean;
  setShowStatePresets: (updater: (v: boolean) => boolean) => void;
  revertPane1: () => void;
  presetPinnedPeriodEndDate: string;
  age: number;
  cappingAge: number;
  equityVal: string;
  mmVal: string;
  athVal: string;
  targetYearly: string;
  stressPct: number;
  desiredRunwayMonths: number;
  legacyTarget: number;
  growthRate: number;
  periodEndDate: string;
  setAge: (v: number) => void;
  setCappingAge: (v: number) => void;
  setEquityVal: (v: string) => void;
  setMmVal: (v: string) => void;
  setAthVal: (v: string) => void;
  setTargetYearly: (v: string) => void;
  setStressPct: (v: number) => void;
  setDesiredRunwayMonths: (v: number) => void;
  setLegacyTarget: (v: number) => void;
  setGrowthRate: (v: number) => void;
  setPeriodEndDate: (v: string) => void;
  setPresetBaselineTotal: (v: number | null) => void;
  setWdSplitTouched: (v: boolean) => void;
  setWithdrawnTouched: (v: boolean) => void;

  // Inflation Tracking
  inflationTracking: InflationTrackingResult;
  inflationPct: number;
  actualCpiInput: string;
  setActualCpiInput: (v: string) => void;
  showInflationHistory: boolean;
  setShowInflationHistory: (updater: (v: boolean) => boolean) => void;
  showInflationFormulaHelp: boolean;
  setShowInflationFormulaHelp: (updater: (v: boolean) => boolean) => void;
  inflationBaseYear: number | undefined;

  // Build 135 — CPI Index Reference Table
  cpiIndexInput: string;
  setCpiIndexInput: (v: string) => void;
  priorRecordedCpiIndex: number | undefined;
  priorPeriodEndDate: string | undefined;
  cpiIndexLiveComputedPct: number | undefined;
  cpiReference: CpiReferenceTable;
  showCpiTableManager: boolean;
  setShowCpiTableManager: (updater: (v: boolean) => boolean) => void;
  cpiBulkPasteText: string;
  setCpiBulkPasteText: (v: string) => void;
  applyCpiBulkPaste: () => string[];
  deleteCpiReferenceRow: (date: string) => void;

  // Scenario Stress Test
  stressPreview: StressPreviewData | null;
  directiveBucket: "equities" | "cash" | undefined;
  defensiveMode: ThresholdMode;

  // Companion Apps
  pensionAmountStr: string;
  pensionStartAge: number;
  cashRealPct: number;

  // Build 131 — "potential underspend" signal
  underspendSignal: UnderspendSignalResult;
  underspendShouldShow: boolean;
  underspendWrThresholdPct: number;
  underspendDipFloorPct: number;
  setUnderspendWrThresholdPct: (v: number) => void;
  setUnderspendDipFloorPct: (v: number) => void;
  onReviewUnderspend: () => void;
}

export function Pane2Diagnostics({
  currency,
  calc,
  directive,
  showStatePresets,
  setShowStatePresets,
  revertPane1,
  presetPinnedPeriodEndDate,
  age,
  cappingAge,
  equityVal,
  mmVal,
  athVal,
  targetYearly,
  stressPct,
  desiredRunwayMonths,
  legacyTarget,
  growthRate,
  periodEndDate,
  setAge,
  setCappingAge,
  setEquityVal,
  setMmVal,
  setAthVal,
  setTargetYearly,
  setStressPct,
  setDesiredRunwayMonths,
  setLegacyTarget,
  setGrowthRate,
  setPeriodEndDate,
  setPresetBaselineTotal,
  setWdSplitTouched,
  setWithdrawnTouched,
  inflationTracking,
  inflationPct,
  actualCpiInput,
  setActualCpiInput,
  showInflationHistory,
  setShowInflationHistory,
  showInflationFormulaHelp,
  setShowInflationFormulaHelp,
  inflationBaseYear,
  cpiIndexInput,
  setCpiIndexInput,
  priorRecordedCpiIndex,
  priorPeriodEndDate,
  cpiIndexLiveComputedPct,
  cpiReference,
  showCpiTableManager,
  setShowCpiTableManager,
  cpiBulkPasteText,
  setCpiBulkPasteText,
  applyCpiBulkPaste,
  deleteCpiReferenceRow,
  stressPreview,
  directiveBucket,
  defensiveMode,
  pensionAmountStr,
  pensionStartAge,
  cashRealPct,
  underspendSignal,
  underspendShouldShow,
  underspendWrThresholdPct,
  underspendDipFloorPct,
  setUnderspendWrThresholdPct,
  setUnderspendDipFloorPct,
  onReviewUnderspend,
}: Pane2DiagnosticsProps) {
  // Build 135 — bulk-paste validation errors, shown in the manage panel.
  // Local/ephemeral (not a planning input), so it doesn't need to be lifted.
  const [cpiBulkPasteErrors, setCpiBulkPasteErrors] = useState<string[]>([]);
  return (
    <div className="shd-card">
      <h2
        className="shd-h2"
        style={{ cursor: "pointer", userSelect: "none" }}
        onDoubleClick={() => {
          setShowStatePresets((v) => {
            // Build 083 — hiding the panel auto-reverts Pane 1 to the
            // real committed state so leftover preset values can't
            // silently contaminate a subsequent commit.
            if (v) revertPane1();
            return !v;
          });
        }}
        title="Double-click to toggle State Test Presets (QA aid)"
      >
        2. Intelligence Diagnostics
      </h2>
      {showStatePresets && (
        <StateTestPresets
          pinnedPeriodEndDate={presetPinnedPeriodEndDate}
          currentValues={{
            age,
            cappingAge,
            equityVal,
            mmVal,
            athVal,
            targetYearly,
            stressPct,
            desiredRunwayMonths,
            legacyTarget,
            growthRate,
            periodEndDate,
          }}
          apply={(v: PresetValues) => {
            if (v.age != null) setAge(v.age);
            if (v.cappingAge != null) setCappingAge(v.cappingAge);
            if (v.equityVal != null) setEquityVal(v.equityVal);
            if (v.mmVal != null) setMmVal(v.mmVal);
            if (v.athVal != null) setAthVal(v.athVal);
            if (v.targetYearly != null) setTargetYearly(v.targetYearly);
            if (v.stressPct != null) setStressPct(v.stressPct);
            if (v.desiredRunwayMonths != null) setDesiredRunwayMonths(v.desiredRunwayMonths);
            if (v.legacyTarget != null) setLegacyTarget(v.legacyTarget);
            if (v.growthRate != null) setGrowthRate(v.growthRate);
            if (v.periodEndDate != null) setPeriodEndDate(v.periodEndDate);
            setPresetBaselineTotal(typeof v.baselineTotal === "number" && v.baselineTotal > 0 ? v.baselineTotal : null);
            // Re-arm auto-seed so split fields reflect the new state.
            setWdSplitTouched(false);
            setWithdrawnTouched(false);
          }}
        />
      )}
      <div>
        <label>Stored All-Time High Baseline ({currency})</label>
        <MoneyInput id="athVal" value={athVal} onChange={setAthVal} currency={currency} nonNegative />
      </div>
      <hr
        style={{
          border: 0,
          borderTop: "1px solid var(--border-color)",
          margin: "1.5rem 0",
        }}
      />
      <div className="diagnostics-subgrid">
        <div>
          <label>Total Capital</label>
          <div className="shd-readout">{formatGBP(calc.total)}</div>
        </div>
        <div>
          <label>Peak Drawdown</label>
          <div className="shd-readout">{calc.drawdownPct.toFixed(2)}%</div>
        </div>
        <div>
          <label>Fun Bucket Balance</label>
          <div
            className="shd-readout"
            style={{
              color: calc.surplus > 0 ? "var(--accent-purple)" : "var(--text-muted)",
              fontWeight: 800,
            }}
          >
            {formatGBP(Math.max(0, calc.surplus))}
            {calc.runwayMonths < 3 && (
              <div style={{ fontSize: "0.7rem", color: "var(--accent-red)", marginTop: 5 }}>⚠ Consuming Capital</div>
            )}
          </div>
        </div>

        {/* Build 127 — Shield Target, moved here from Pane 1's removed
            Request:/Shield Target: line. Two tiles rather than one
            £-and-months-combined tile: the existing three tiles in this
            row are each a single readout, so splitting keeps the type
            scale consistent instead of cramming two numbers into one
            box at a smaller size to make them fit. Sized to match the
            three tiles above (Build 127 cosmetic follow-up). Build 128 —
            colour restored to calc.runwayColor (the same green/amber/red
            status the Actual Cash Shield Runway tile already uses,
            thresholded on runwayMonths vs modifiedTargetMonths) rather
            than a flat blue — these two numbers ARE the shield's status,
            not just a value related to it. */}
        <div>
          <label>Shield Target (£)</label>
          <div className="shd-readout" style={{ color: calc.runwayColor }}>
            {formatGBP(calc.targetCashAmount)}
          </div>
        </div>
        <div>
          <label>Shield Target (Months)</label>
          <div className="shd-readout" style={{ color: calc.runwayColor }}>
            {calc.modifiedTargetMonths}
          </div>
        </div>

        <div
          style={{
            gridColumn: "span 3",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            paddingTop: "1.25rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.85rem",
              marginBottom: "1rem",
            }}
          >
            <span>
              Target Draw Rate: <strong style={{ color: "var(--text-main)" }}>{calc.targetWR.toFixed(2)}%</strong>
            </span>
            <span>
              Realized Draw Rate: <strong style={{ color: "var(--text-main)" }}>{calc.currentWR.toFixed(2)}%</strong>
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div
              style={{
                padding: "0.75rem",
                background: "rgba(0,0,0,0.15)",
                borderRadius: "0.4rem",
                border: "1px solid var(--border-color)",
              }}
            >
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "var(--text-muted)",
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                Withdrawal Status
              </div>
              <div style={{ fontWeight: 800, fontSize: "0.9rem", color: calc.guardrailColor }}>
                {calc.guardrailStatus}
              </div>
            </div>
            <div
              style={{
                padding: "0.75rem",
                background: "rgba(0,0,0,0.15)",
                borderRadius: "0.4rem",
                border: "1px solid var(--border-color)",
              }}
            >
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "var(--text-muted)",
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                Guardrail State
              </div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "0.9rem",
                  color: directive.guardrailColor,
                }}
              >
                {directive.guardrailText}
              </div>
            </div>
          </div>
        </div>

        {underspendShouldShow && (
          <div className="shd-directive-box" style={{ gridColumn: "span 3", marginTop: "0.75rem" }}>
            <span className="directive-title">
              {underspendSignal.isPreNotice ? "Early signal — potential underspend" : "Potential underspend"}
            </span>
            {underspendSignal.isPreNotice ? (
              <p style={{ margin: 0 }}>
                Early days — {underspendSignal.yearsSinceStart.toFixed(1)} years in, your realised withdrawal rate has
                fallen to <strong>{underspendSignal.wrRatioPct.toFixed(0)}%</strong> of where you started, and the pot
                hasn't fallen more than {underspendDipFloorPct}% below its starting value. This isn't validated this
                early — if the pattern holds, there'll be a clearer read at year 5.
              </p>
            ) : (
              <p style={{ margin: 0 }}>
                {underspendSignal.consecutiveYearsTriggered > 1
                  ? `${underspendSignal.consecutiveYearsTriggered}${underspendSignal.consecutiveYearsTriggered === 2 ? "nd" : underspendSignal.consecutiveYearsTriggered === 3 ? "rd" : "th"} year running: `
                  : ""}
                Your withdrawal rate has stayed well below where you started (
                <strong>{underspendSignal.wrRatioPct.toFixed(0)}%</strong> of your original rate), and your pot has
                never fallen more than {underspendDipFloorPct}% below its starting value. In similar past situations,
                this has often meant significantly more left over than planned by the end. Worth a look at whether your
                Target Yearly Withdrawal is still right for you.
              </p>
            )}
            <div
              style={{ marginTop: "0.85rem", display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}
            >
              <button type="button" className="secondary" onClick={onReviewUnderspend}>
                Reviewed — check again next year
              </button>
              <details style={{ fontSize: "0.8rem" }}>
                <summary style={{ cursor: "pointer", color: "var(--text-muted)" }}>Adjust thresholds</summary>
                <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.7rem", textTransform: "none" }}>
                      Trigger at withdrawal rate below (% of your original rate)
                    </span>
                    <IntInput
                      value={underspendWrThresholdPct}
                      onChange={setUnderspendWrThresholdPct}
                      min={1}
                      max={100}
                      fallback={90}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.7rem", textTransform: "none" }}>
                      Disqualify if the pot ever fell below (% under starting value)
                    </span>
                    <IntInput
                      value={underspendDipFloorPct}
                      onChange={setUnderspendDipFloorPct}
                      min={0}
                      max={100}
                      fallback={10}
                    />
                  </label>
                </div>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.5rem", marginBottom: 0 }}>
                  These defaults came from a rolling study of 29 overlapping real historical UK/global windows — a
                  useful pattern, not a precisely calibrated cutoff. Adjust if you'd rather this fire earlier, later, or
                  not at all.
                </p>
              </details>
            </div>
          </div>
        )}

        <div
          style={{
            gridColumn: "span 3",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            paddingTop: "0.75rem",
          }}
        >
          <label>Actual Cash Shield Runway</label>
          <div className="shd-readout" style={{ color: calc.runwayColor }}>
            {calc.runwayMonths.toFixed(1)} Months
          </div>
        </div>
        <div
          style={{
            gridColumn: "span 3",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            paddingTop: "0.75rem",
          }}
        >
          <label>Actuarial Amortization Matrix</label>
          <div
            style={{ fontSize: "0.95rem", fontWeight: 600 }}
            dangerouslySetInnerHTML={{ __html: directive.actuarialHtml }}
          />
        </div>
        <div
          style={{
            gridColumn: "span 3",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            paddingTop: "0.75rem",
          }}
        >
          <label>Market Momentum Vector</label>
          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: calc.trajectoryColor }}>
            {calc.trajectoryLabel}
          </div>
        </div>
      </div>

      {/* Build 125 — Inflation Tracking. Realised-inflation index built from
          the ledger's actual/assumed CPI history, plus the optional per-quarter
          actual-CPI entry. Kept out of Pane 1 (already busy) per Mark's steer —
          this is a diagnostic, not a planning input. */}
      <div
        style={{
          marginTop: "2rem",
          padding: "1.25rem",
          background: "rgba(55,138,221,0.05)",
          border: "1px solid rgba(55,138,221,0.2)",
          borderRadius: "0.5rem",
        }}
      >
        <label style={{ color: "var(--accent-blue)", fontWeight: 800, fontSize: "0.8rem" }}>Inflation Tracking</label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: "0.75rem",
            marginTop: "0.85rem",
          }}
        >
          <div
            style={{
              padding: "0.75rem",
              background: "rgba(0,0,0,0.15)",
              borderRadius: "0.4rem",
              border: "1px solid var(--border-color)",
            }}
          >
            <div
              style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase" }}
            >
              Cumulative Index
            </div>
            <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>{inflationTracking.currentIndex.toFixed(3)}×</div>
          </div>
          <div
            style={{
              padding: "0.75rem",
              background: "rgba(0,0,0,0.15)",
              borderRadius: "0.4rem",
              border: "1px solid var(--border-color)",
            }}
          >
            <div
              style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase" }}
            >
              Implied Average
            </div>
            <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>
              {inflationTracking.impliedAverageAnnualPct.toFixed(1)}% p.a.
            </div>
          </div>
          <div
            style={{
              padding: "0.75rem",
              background: "rgba(0,0,0,0.15)",
              borderRadius: "0.4rem",
              border: "1px solid var(--border-color)",
            }}
          >
            <div
              style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase" }}
            >
              Since
            </div>
            <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>{inflationBaseYear ?? "—"}</div>
          </div>
        </div>

        <div style={{ marginTop: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.78rem" }}>CPI Index at this entry (ONS D7BT, optional)</label>
            <button
              type="button"
              onClick={() => setShowCpiTableManager((v) => !v)}
              style={{ fontSize: "0.72rem" }}
              title="View, correct, or bulk-paste the CPI Index Reference Table"
            >
              Manage table
            </button>
          </div>
          <input
            id="cpiIndexInput"
            type="text"
            inputMode="decimal"
            placeholder="e.g. 142.3"
            value={cpiIndexInput}
            onChange={(e) => setCpiIndexInput(e.target.value)}
            style={{ width: "100%" }}
            aria-label="Raw ONS CPI INDEX value for this entry's period end date"
          />
          <div
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              fontSize: "0.72rem",
              color: "var(--text-muted)",
              marginTop: "0.35rem",
            }}
          >
            <span>
              Last recorded index:{" "}
              <strong style={{ color: "var(--text-main)" }}>
                {typeof priorRecordedCpiIndex === "number" ? priorRecordedCpiIndex.toFixed(1) : "—"}
              </strong>
              {priorPeriodEndDate ? ` (${priorPeriodEndDate})` : ""}
            </span>
            <span>
              Computed:{" "}
              <strong style={{ color: "var(--accent-blue)" }}>
                {typeof cpiIndexLiveComputedPct === "number" ? `${cpiIndexLiveComputedPct.toFixed(2)}%` : "—"}
              </strong>
            </span>
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            Type the raw ONS CPI INDEX number directly — no maths required. Saved to a shared reference table keyed by
            date, so a later correction (or a rebasing) here applies automatically to every entry that uses it, without
            editing rows one by one.
          </div>
        </div>

        <div style={{ marginTop: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <label style={{ fontSize: "0.78rem" }}>Or type a plain % directly (optional)</label>
            <button
              type="button"
              onClick={() => setShowInflationFormulaHelp(() => true)}
              aria-label="How to calculate this figure"
              title="How to calculate this figure"
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                fontSize: "0.7rem",
                lineHeight: "16px",
                padding: 0,
                fontWeight: 700,
              }}
            >
              ?
            </button>
          </div>
          <input
            id="actualCpiInput"
            type="text"
            inputMode="decimal"
            placeholder={`Leave both blank to use assumed ${inflationPct.toFixed(1)}%`}
            value={actualCpiInput}
            onChange={(e) => setActualCpiInput(e.target.value)}
            style={{ width: "100%" }}
            aria-label="Actual CPI observed since the previous ledger entry"
          />
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            Used only if no CPI Index is entered above (or the reference table doesn't cover both dates). The actual
            price change over this specific gap since your last entry — not ONS's headline 12-month (year-on-year) rate.
            Leaving both blank falls back to the assumed CPI slider in Pane 1, pro-rated for the actual gap.
          </div>
        </div>

        {showInflationFormulaHelp && (
          <div className="shd-overlay" role="dialog" aria-modal="true">
            <div className="shd-modal" style={{ width: 460 }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 0.85rem" }}>
                Calculating "Actual CPI since last entry"
              </h2>
              <div style={{ fontSize: "0.85rem", lineHeight: 1.6, color: "var(--text-muted)" }}>
                <p style={{ marginTop: 0 }}>
                  Use the <strong style={{ color: "var(--text-main)" }}>CPI INDEX</strong> (series D7BT on ONS —{" "}
                  <em>not</em> the CPI annual rate), for the date of this entry and the date of your last entry.
                </p>
                <div
                  style={{
                    background: "rgba(0,0,0,0.15)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "0.4rem",
                    padding: "0.75rem 0.9rem",
                    fontFamily: "monospace",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                  }}
                >
                  (New Index ÷ Last Index − 1) × 100
                </div>
                <p>
                  Example: index was 140.0 at your last entry, now it's 142.1 →{" "}
                  <span style={{ color: "var(--text-main)" }}>(142.1 ÷ 140.0 − 1) × 100 = 1.50%</span>.
                </p>
                <p style={{ marginBottom: 0 }}>
                  Don't average several quarters together — use the two figures either side of this specific gap only,
                  or older inflation already accounted for in earlier entries gets double-counted.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInflationFormulaHelp(() => false)}
                style={{ marginTop: "1.25rem" }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {showCpiTableManager && (
          <div className="shd-overlay" role="dialog" aria-modal="true">
            <div className="shd-modal" style={{ width: 560 }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 0.85rem" }}>CPI Index Reference Table</h2>
              <div
                style={{ fontSize: "0.85rem", lineHeight: 1.6, color: "var(--text-muted)", marginBottom: "0.85rem" }}
              >
                Raw ONS CPI INDEX values (series D7BT), one per period-end date. Correcting a value here — or
                bulk-pasting an updated/rebased table — applies to every ledger entry that references that date, with
                nothing to change on the entries themselves.
              </div>

              {cpiReference.length > 0 ? (
                <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: "1rem" }}>
                  <table style={{ width: "100%", fontSize: "0.78rem", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border-color)" }}>
                        <th style={{ padding: "0.35rem 0.5rem" }}>Date</th>
                        <th style={{ padding: "0.35rem 0.5rem" }}>Index</th>
                        <th style={{ padding: "0.35rem 0.5rem" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cpiReference.map((r) => (
                        <tr key={r.date} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <td style={{ padding: "0.35rem 0.5rem" }}>{r.date}</td>
                          <td style={{ padding: "0.35rem 0.5rem" }}>{r.index.toFixed(1)}</td>
                          <td style={{ padding: "0.35rem 0.5rem", textAlign: "right" }}>
                            <button
                              type="button"
                              onClick={() => deleteCpiReferenceRow(r.date)}
                              style={{ fontSize: "0.7rem" }}
                              title={`Remove the ${r.date} row`}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                  No index values recorded yet.
                </div>
              )}

              <label style={{ fontSize: "0.78rem" }}>
                Bulk paste — one row per line, format: <code>QX YYYY&nbsp;&nbsp;YYYY-MM-DD&nbsp;&nbsp;XXX.X</code>
              </label>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
                The "QX YYYY" label is just for your own reference and is ignored — only the date and the index number
                are read, and the date must match a ledger entry's own Period End Date exactly to link up.
              </div>
              <textarea
                value={cpiBulkPasteText}
                onChange={(e) => setCpiBulkPasteText(e.target.value)}
                placeholder={"Q1 2025\t2025-03-31\t136.0\nQ2 2025\t2025-06-30\t138.5"}
                rows={4}
                style={{ width: "100%", fontFamily: "monospace", fontSize: "0.78rem" }}
              />
              {cpiBulkPasteErrors.length > 0 && (
                <div style={{ fontSize: "0.72rem", color: "var(--accent-red)", marginTop: "0.35rem" }}>
                  {cpiBulkPasteErrors.map((err, i) => (
                    <div key={i}>{err}</div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.25rem" }}>
                <button
                  type="button"
                  onClick={() => {
                    const errors = applyCpiBulkPaste();
                    setCpiBulkPasteErrors(errors);
                  }}
                  disabled={cpiBulkPasteText.trim() === ""}
                >
                  Add / update rows
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCpiBulkPasteErrors([]);
                    setShowCpiTableManager(() => false);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {inflationTracking.rows.length >= 2 && (
          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button type="button" onClick={() => setShowInflationHistory((v) => !v)} style={{ fontSize: "0.78rem" }}>
              {showInflationHistory ? "Hide" : "View"} realised-inflation history
            </button>
            <button
              type="button"
              onClick={handleOnsLinkClick}
              style={{ fontSize: "0.78rem" }}
              title="Opens the ONS inflation page. Shift-click to change the link."
            >
              ONS ↗
            </button>
          </div>
        )}

        {showInflationHistory && inflationTracking.rows.length >= 2 && (
          <div style={{ marginTop: "0.85rem", overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: "0.78rem", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border-color)" }}>
                  <th style={{ padding: "0.35rem 0.5rem" }}>Period end</th>
                  <th style={{ padding: "0.35rem 0.5rem" }}>Rate applied</th>
                  <th style={{ padding: "0.35rem 0.5rem" }}>Source</th>
                  <th style={{ padding: "0.35rem 0.5rem" }}>Cumulative index</th>
                </tr>
              </thead>
              <tbody>
                {inflationTracking.rows.map((r) => (
                  <tr key={r.ledgerIndex} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "0.35rem 0.5rem" }}>{r.periodEndDate}</td>
                    <td style={{ padding: "0.35rem 0.5rem" }}>{r.rateAppliedPct.toFixed(2)}%</td>
                    <td
                      style={{
                        padding: "0.35rem 0.5rem",
                        color: r.isActual ? "var(--accent-blue)" : "var(--text-muted)",
                      }}
                    >
                      {r.source === "table" ? "Table" : r.source === "entry" ? "Entry" : "Assumed"}
                    </td>
                    <td style={{ padding: "0.35rem 0.5rem" }}>{r.cumulativeIndex.toFixed(3)}×</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: "2rem",
          padding: "1.25rem",
          background: "rgba(239,68,68,0.05)",
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: "0.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <label style={{ color: "var(--accent-red)", fontWeight: 800, fontSize: "0.8rem" }}>
            🚨 Scenario Stress Test
          </label>
          {stressPct > 0 && (
            <button
              type="button"
              onClick={() => setStressPct(0)}
              style={{
                fontSize: "0.72rem",
                background: "transparent",
                border: "1px solid var(--border-color)",
                color: "var(--accent-blue)",
                padding: "0.2rem 0.5rem",
                borderRadius: "0.3rem",
                cursor: "pointer",
              }}
              title="Snap the slider back to 0% and hide the hypothetical preview."
            >
              Return to baseline (0%)
            </button>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
          Simulated Drop: <strong style={{ color: "var(--accent-red)" }}>{stressPct}%</strong>
        </div>
        <input
          type="range"
          min={0}
          max={50}
          step={5}
          value={stressPct}
          onChange={(e) => setStressPct(parseFloat(e.target.value) || 0)}
        />
        {/* Build 084 — hypothetical preview now runs the SAME
            pipeline (defensiveRec → bucketOverride → generateDirectives)
            as the real Pane 3, so the narrative-state classification and
            Fun Bucket figure are genuine re-evaluations under the
            hypothetical inputs. All strictly local to this box — no
            writeback to real state. */}

        {stressPreview &&
          (() => {
            const { hypEq, hypCalc, hypDirective, hypBucket } = stressPreview;
            const realState = directive.guardrailText;
            const hypState = hypDirective.guardrailText;
            const stateChanged = realState !== hypState;
            const realBucketLabel = directiveBucket === "cash" ? "Cash Pot" : "Global Equities";
            const hypBucketLabel = hypBucket === "cash" ? "Cash Pot" : "Global Equities";
            const money = (n: number) => formatGBP(Math.max(0, n));

            return (
              <div
                style={{
                  marginTop: "0.75rem",
                  padding: "0.6rem 0.75rem",
                  background: "rgba(239,68,68,0.08)",
                  border: "1px dashed var(--accent-red)",
                  borderRadius: "0.4rem",
                  fontSize: "0.78rem",
                  lineHeight: 1.5,
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    color: "var(--accent-red)",
                    marginBottom: "0.35rem",
                  }}
                >
                  HYPOTHETICAL — {stressPct}% equities drop
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Stressed Equities:</span>
                  <strong>{money(hypEq)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Stressed Total Capital:</span>
                  <strong>{money(hypCalc.total)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Stressed Drawdown vs ATH:</span>
                  <strong>{hypCalc.drawdownPct.toFixed(1)}%</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Fun Bucket Balance:</span>
                  <strong
                    style={{
                      color: hypCalc.surplus > 0 ? "var(--accent-purple)" : "var(--text-muted)",
                    }}
                  >
                    <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>{money(calc.surplus)}</span> →{" "}
                    {money(hypCalc.surplus)}
                  </strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "0.35rem",
                  }}
                >
                  <span>Directive State:</span>
                  <strong style={{ color: hypDirective.guardrailColor }}>{hypState}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Recommended Source ({defensiveMode}):</span>
                  <strong>{hypBucketLabel}</strong>
                </div>
                {stateChanged && (
                  <div
                    style={{
                      marginTop: "0.5rem",
                      padding: "0.5rem 0.65rem",
                      background: "rgba(0,0,0,0.15)",
                      border: "1px solid var(--border-color)",
                      borderRadius: 4,
                      fontSize: "0.72rem",
                      lineHeight: 1.5,
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>
                      Directive would change:{" "}
                      <span style={{ color: "var(--accent-purple)" }}>
                        {realState} → {hypState}
                      </span>
                    </div>
                    <ul style={{ margin: "0.3rem 0 0", paddingLeft: "1.1rem" }}>
                      <li style={{ color: "var(--text-muted)" }}>
                        Source bucket: {realBucketLabel} → {hypBucketLabel}
                      </li>
                      <li style={{ color: "var(--text-muted)" }}>
                        Fun Bucket: {money(calc.surplus)} → {money(hypCalc.surplus)}
                      </li>
                    </ul>
                  </div>
                )}
                <div
                  style={{
                    marginTop: "0.6rem",
                    color: "var(--text-muted)",
                    fontStyle: "italic",
                    fontSize: "0.72rem",
                  }}
                >
                  Preview only — Pane 1's real values, Pane 3's directive, and every committed calculation still use the
                  unstressed baseline.
                </div>
              </div>
            );
          })()}
      </div>

      {/* Build 118 — Companion Apps. A simple grid of launcher cards so
          further spin-off tools can be dropped in without restructuring. */}
      <div
        style={{
          marginTop: "2rem",
          padding: "1.25rem",
          background: "rgba(59,130,246,0.05)",
          border: "1px solid var(--border-color)",
          borderRadius: "0.5rem",
        }}
      >
        <label>Companion Apps</label>
        <div
          style={{
            marginTop: "0.85rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "0.85rem",
          }}
        >
          <div
            style={{
              padding: "0.9rem",
              background: "var(--bg-main)",
              border: "1px solid var(--border-color)",
              borderRadius: "0.5rem",
            }}
          >
            <button
              onClick={() => {
                const isDesktop = typeof window !== "undefined" && window.location.protocol === "file:";
                const params = new URLSearchParams({ currency });
                const url = isDesktop
                  ? `#/accumulation-simulator?${params.toString()}`
                  : `/accumulation-simulator?${params.toString()}`;
                window.open(url, "_blank", "noopener");
              }}
            >
              📈 Accumulation Simulator
            </button>
            <div
              style={{
                marginTop: "0.55rem",
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                lineHeight: 1.45,
              }}
            >
              Shows how a pot could grow from an early starting age to a chosen retirement age, across 10,000 possible
              market paths — a good one to share with younger family members starting out. Opens in its own tab with its
              own sensible starting defaults, not your live Pane 1 figures.
            </div>
          </div>

          <div
            style={{
              padding: "0.9rem",
              background: "var(--bg-main)",
              border: "1px solid var(--border-color)",
              borderRadius: "0.5rem",
            }}
          >
            <button
              onClick={() => {
                const params = new URLSearchParams({
                  eq: String(Math.round(cleanNum(equityVal))),
                  cash: String(Math.round(cleanNum(mmVal))),
                  age: String(age),
                  horizon: String(cappingAge - age),
                  withdrawal: String(Math.round(calc.grossTargetYearly)),
                  growth: String(growthRate),
                  cashReal: String(cashRealPct),
                  currency,
                });
                const pen = cleanNum(pensionAmountStr);
                if (pen > 0) {
                  params.set("pensionAge", String(pensionStartAge));
                  params.set("pensionAmount", String(Math.round(pen)));
                }
                const isDesktop = typeof window !== "undefined" && window.location.protocol === "file:";
                const url = isDesktop
                  ? `#/risk-simulator?${params.toString()}`
                  : `/risk-simulator?${params.toString()}`;
                window.open(url, "_blank", "noopener");
              }}
            >
              🎲 Risk Simulator (Monte Carlo)
            </button>
            <div
              style={{
                marginTop: "0.55rem",
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                lineHeight: 1.45,
              }}
            >
              Stress-tests your plan across 10,000 possible market paths and plots the fan chart of outcomes. Opens in
              its own tab as a sandbox, seeded from your live Pane 1 figures — nothing you change there writes back.
            </div>
          </div>

          <div
            style={{
              padding: "0.9rem",
              background: "var(--bg-main)",
              border: "1px solid var(--border-color)",
              borderRadius: "0.5rem",
            }}
          >
            <button
              onClick={() => {
                const isFile = typeof window !== "undefined" && window.location.protocol === "file:";
                const params = new URLSearchParams({
                  eq: String(Math.round(cleanNum(equityVal))),
                  cash: String(Math.round(cleanNum(mmVal))),
                  age: String(age),
                  horizon: String(cappingAge - age),
                  withdrawal: String(Math.round(calc.grossTargetYearly)),
                  currency,
                });
                const pen = cleanNum(pensionAmountStr);
                if (pen > 0) {
                  params.set("pensionAge", String(pensionStartAge));
                  params.set("pensionAmount", String(Math.round(pen)));
                }
                const base = isFile ? "./comparison-builder.html" : "/comparison-builder.html";
                window.open(`${base}?${params.toString()}`, "_blank", "noopener");
              }}
            >
              📊 Compare vs 4% Rule (Historical)
            </button>
            <div
              style={{
                marginTop: "0.55rem",
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                lineHeight: 1.45,
              }}
            >
              Backtests your plan against every real rolling retirement since 1928, using the same engine as this app.
              Opens with your live Pane 1 figures already filled in.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
