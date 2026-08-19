// Sovereign Glidepath — Pane 1 (Parameters) (Build 126 file-size cleanup,
// Stage 3g — final piece).
//
// Extracted from SovereignGlidepath.tsx as a pure presentational component,
// same pattern as every other extraction in this cleanup: all state stays
// in the parent, this component only renders it and calls back through
// setters/handlers passed in as props. This is the largest prop surface of
// the whole exercise (Pane 1 owns more raw input state than anywhere else
// in the app), but the safety property is identical to every smaller piece
// — nothing here owns state the parent didn't already own, so there is no
// behavioural change, only a relocation of JSX.
//
// autoQuarterLabel()/todayIso() are tiny, pure, stateless helpers also used
// by the parent's own hooks (outside this component's JSX) — duplicated
// here rather than imported back from SovereignGlidepath.tsx, the same way
// phaseBadgeClass/drawdownColor were duplicated into LedgerTable.tsx, to
// avoid a circular import (the parent also imports Pane1Parameters).

import type { CalcOutputs, InflationTrackingResult } from "@/lib/sovereign/engine";
import { cleanNum, formatGBP, phaseFor } from "@/lib/sovereign/engine";
import { MoneyInput, IntInput, type CurrencySymbol } from "./FormInputs";

function autoQuarterLabel(): string {
  const n = new Date();
  return `Q${Math.floor(n.getMonth() / 3) + 1} ${n.getFullYear()}`;
}

// ISO YYYY-MM-DD in the user's local timezone (matches the semantics of
// <input type="date">, which is calendar-local and has no timezone).
function todayIso(): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type RebalDir = "none" | "eq_to_cash" | "cash_to_eq";

export interface Pane1ParametersProps {
  currency: CurrencySymbol;
  calc: CalcOutputs;
  inflationTracking: InflationTrackingResult;
  nominaliseRequest: (realAmount: number) => number;

  cappingAge: number;
  setCappingAge: (v: number) => void;
  age: number;
  setAge: (v: number) => void;

  label: string;
  setLabel: (v: string) => void;
  periodEndDate: string;
  setPeriodEndDate: (v: string) => void;

  equityVal: string;
  setEquityVal: (v: string) => void;
  growthRate: number;
  setGrowthRate: (v: number) => void;
  mmVal: string;
  setMmVal: (v: string) => void;
  cashRealPct: number;
  setCashRealPct: (v: number) => void;

  editIndex: number;
  assumptionsNotRecorded: boolean;

  inflationPct: number;
  setInflationPct: (v: number) => void;

  targetYearly: string;
  setTargetYearly: (v: string) => void;
  committedBaselineYearly: number;

  pensionAmountStr: string;
  setPensionAmountStr: (v: string) => void;
  pensionStartAge: number;
  setPensionStartAge: (v: number) => void;
  pensionIncreasePct: number;
  setPensionIncreasePct: (v: number) => void;

  desiredRunwayMonths: number;
  setDesiredRunwayMonths: (v: number) => void;
  legacyTarget: number;
  setLegacyTarget: (v: number) => void;
  setCurrency: (v: CurrencySymbol) => void;

  wdEqStr: string;
  setWdEqStr: (v: string) => void;
  wdCashStr: string;
  setWdCashStr: (v: string) => void;
  setWdSplitTouched: (v: boolean) => void;

  rebalDir: RebalDir;
  setRebalDir: (v: RebalDir) => void;
  rebalAmtStr: string;
  setRebalAmtStr: (v: string) => void;

  withdrawnStr: string;

  trialBlocked: boolean;
  openCommitConfirm: () => void;
  revertPane1: () => void;
  exitEditToNewEntry: () => void;
}

export function Pane1Parameters({
  currency,
  calc,
  inflationTracking,
  nominaliseRequest,
  cappingAge,
  setCappingAge,
  age,
  setAge,
  label,
  setLabel,
  periodEndDate,
  setPeriodEndDate,
  equityVal,
  setEquityVal,
  growthRate,
  setGrowthRate,
  mmVal,
  setMmVal,
  cashRealPct,
  setCashRealPct,
  editIndex,
  assumptionsNotRecorded,
  inflationPct,
  setInflationPct,
  targetYearly,
  setTargetYearly,
  committedBaselineYearly,
  pensionAmountStr,
  setPensionAmountStr,
  pensionStartAge,
  setPensionStartAge,
  pensionIncreasePct,
  setPensionIncreasePct,
  desiredRunwayMonths,
  setDesiredRunwayMonths,
  legacyTarget,
  setLegacyTarget,
  setCurrency,
  wdEqStr,
  setWdEqStr,
  wdCashStr,
  setWdCashStr,
  setWdSplitTouched,
  rebalDir,
  setRebalDir,
  rebalAmtStr,
  setRebalAmtStr,
  withdrawnStr,
  trialBlocked,
  openCommitConfirm,
  revertPane1,
  exitEditToNewEntry,
}: Pane1ParametersProps) {
  const phase = phaseFor(age);
  const phaseBadge = phase === "Go-Go" ? "pb-gogo" : phase === "Go-Slow" ? "pb-goslow" : "pb-nogo";
  const pensionAmount = (() => {
    const n = cleanNum(pensionAmountStr);
    return Number.isFinite(n) && n > 0 ? n : 0;
  })();

  return (
    <div className="shd-card">
      <h2 className="shd-h2">1. Parameters</h2>

      <div className="shd-cluster">
        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            alignItems: "center",
            marginBottom: "0.5rem",
          }}
        >
          <div style={{ flex: 1 }}>
            <label htmlFor="cappingAge">Target Horizon Age</label>
            <IntInput id="cappingAge" min={55} max={120} value={cappingAge} fallback={95} onChange={setCappingAge} />
          </div>
          <div style={{ flex: 2 }}>
            <label>Horizon</label>
            <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-blue)" }}>
              {calc.remainingYears} Years Remaining
            </span>
          </div>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
            }}
          >
            <label style={{ margin: 0 }}>
              Age: <strong>{age}</strong>
            </label>
            <span className={`phase-badge ${phaseBadge}`}>{phase}</span>
          </div>
          <input
            type="range"
            min={55}
            max={cappingAge}
            value={age}
            onChange={(e) => setAge(parseInt(e.target.value) || 55)}
          />
        </div>
      </div>

      <div className="shd-cluster">
        <label htmlFor="ledgerLabel">Reporting Period</label>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
          <input
            id="ledgerLabel"
            type="text"
            maxLength={40}
            placeholder="Q1 2024"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <button
            className="secondary"
            onClick={() => {
              // Auto-Label also refreshes the real date to today so
              // the two fields stay coherent by default. The user
              // can still override the date manually for back-fills.
              setLabel(autoQuarterLabel());
              setPeriodEndDate(todayIso());
            }}
            style={{ whiteSpace: "nowrap" }}
          >
            Auto-Label
          </button>
        </div>
        {/* Build 073 — real date. Free-text label above is cosmetic;
            this field is the single source of truth for chronological
            ordering. Defaults to today; override for back-fills. */}
        <label htmlFor="periodEndDate" style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
          Period End Date{" "}
          <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(real date — used for sort order)</span>
        </label>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 15 }}>
          <input
            id="periodEndDate"
            type="date"
            value={periodEndDate}
            onChange={(e) => setPeriodEndDate(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            className="secondary"
            type="button"
            onClick={() => setPeriodEndDate(todayIso())}
            style={{ whiteSpace: "nowrap" }}
            title="Reset to today"
          >
            Today
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label>Global Equities Pot ({currency})</label>
            <MoneyInput id="equityVal" value={equityVal} onChange={setEquityVal} currency={currency} nonNegative />
            <div style={{ marginTop: "0.5rem" }}>
              <label
                style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}
                title="Moves only the dashed 'Assumed Rate' line. Does not change how fast Equities grow in the Fan Chart — only nudges when the simulation switches to spending from Cash."
              >
                Assumed Real Growth Rate{" "}
                <strong style={{ color: "var(--accent-blue)" }}>{growthRate.toFixed(1)}%</strong>
              </label>
              <input
                type="range"
                min={0}
                max={20}
                step={0.1}
                value={growthRate}
                onChange={(e) => setGrowthRate(parseFloat(e.target.value) || 0)}
                style={{ width: "100%" }}
                aria-label="Assumed real growth rate on Global Equities"
              />
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                Real (after-inflation) growth assumed for the Global Equities Pot
              </div>
            </div>
          </div>

          <div>
            <label>Cash Pot ({currency})</label>
            <MoneyInput id="mmVal" value={mmVal} onChange={setMmVal} currency={currency} nonNegative />
            <div style={{ marginTop: "0.5rem" }}>
              <label style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                Cash Real Return <strong style={{ color: "var(--accent-blue)" }}>{cashRealPct.toFixed(1)}%</strong>
              </label>
              <input
                type="range"
                min={0}
                max={3}
                step={0.1}
                value={cashRealPct}
                onChange={(e) => setCashRealPct(parseFloat(e.target.value) || 0)}
                style={{ width: "100%" }}
                aria-label="Cash Pot real return above inflation"
              />
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                Real (after-inflation) return assumed on the Cash Pot
              </div>
            </div>
          </div>
        </div>
        {/* Build 095 — legacy row indicator. Rows committed before
            Build 095 carry no stored assumption snapshot; Edit shows
            0% for all three rather than fabricating today's globals. */}
        {editIndex > -1 && assumptionsNotRecorded && (
          <div
            style={{
              marginTop: "0.6rem",
              fontSize: "0.7rem",
              color: "var(--accent-amber, #e0a33e)",
              fontStyle: "italic",
            }}
          >
            Assumptions not recorded on this row (committed before Build 095) — Growth, Cash Real Return and Inflation /
            CPI show 0%. Set them and re-save the row to record what was actually assumed.
          </div>
        )}
        {/* Build 082 — independent Pane 1 inflation assumption. The
            Pane 3 directive's annualised-real deflation reads from
            THIS slider, not the Risk Simulator's own Inflation slider.
            First-load seed: shd_mc_v1 if present, else 2.5%; once
            either slider moves, they diverge freely. */}
        <div style={{ marginTop: "0.85rem" }}>
          <label style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
            Inflation / CPI Assumption{" "}
            <strong style={{ color: "var(--accent-blue)" }}>{inflationPct.toFixed(1)}%</strong>
            <span style={{ marginLeft: 8, color: "var(--text-muted)", fontStyle: "italic" }}>
              — used by the Pane 3 directive to deflate the annualised return.
            </span>
          </label>
          <input
            type="range"
            min={0}
            max={8}
            step={0.1}
            value={inflationPct}
            onChange={(e) => setInflationPct(parseFloat(e.target.value) || 0)}
            style={{ width: "100%" }}
            aria-label="Inflation / CPI assumption used by the ledger directive"
          />
        </div>
      </div>

      <div className="shd-cluster">
        <div
          style={{
            marginTop: "1rem",
            borderTop: "1px solid var(--border-color)",
            paddingTop: "1rem",
          }}
        >
          <label style={{ color: "var(--accent-green)" }}>
            Initial Annual Withdrawal — Frozen Baseline ({currency})
          </label>
          <div
            style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "-0.3rem", marginBottom: "0.5rem" }}
          >
            Set your desired initial income at plan start — inflation adjusts automatically. Use the slider below to
            apply a % lifestyle change.
          </div>
          <MoneyInput id="targetYearly" value={targetYearly} onChange={setTargetYearly} currency={currency} />
          {(() => {
            // Build 127 — Lifestyle-change slider. 0% always means "the
            // real, last-committed standard of living" — i.e. relative to
            // committedBaselineYearly (parent state, captured at every
            // Pane 1 load/revert moment), NEVER relative to whatever
            // targetYearly currently holds. This is deliberate: dragging
            // to +15% always means 15% above what was actually last
            // committed, regardless of how many times the slider has
            // already been dragged this session.
            //
            // Typing directly into the field still works — it just
            // repositions the slider to match. The slider THUMB is
            // visually clamped at ±30%, but the field itself (and the
            // % readout here) accepts and shows values outside that
            // range without complaint.
            const baseline = committedBaselineYearly;
            const currentReal = cleanNum(targetYearly);
            const rawPct = baseline > 0 ? ((currentReal - baseline) / baseline) * 100 : 0;
            const thumbPct = Math.max(-30, Math.min(30, Math.round(rawPct)));
            const pctColor =
              Math.round(rawPct) === 0
                ? "var(--text-muted)"
                : rawPct > 0
                  ? "var(--accent-green)"
                  : "var(--accent-amber)";
            return (
              <div style={{ marginTop: "0.75rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.3rem",
                  }}
                >
                  <label htmlFor="lifestyleChangeSlider" style={{ margin: 0, fontSize: "0.78rem" }}>
                    Lifestyle Change
                  </label>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: pctColor }}>
                    {rawPct > 0 ? "+" : ""}
                    {rawPct.toFixed(0)}%
                  </span>
                </div>
                <input
                  id="lifestyleChangeSlider"
                  type="range"
                  min={-30}
                  max={30}
                  step={1}
                  value={thumbPct}
                  disabled={baseline <= 0}
                  onChange={(e) => {
                    const pct = parseInt(e.target.value, 10) || 0;
                    const next = baseline * (1 + pct / 100);
                    setTargetYearly(next > 0 ? next.toFixed(2) : "");
                  }}
                  aria-label="Apply a percentage lifestyle change relative to your last committed baseline"
                />
                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                  {baseline > 0
                    ? `0% is your last committed baseline of ${formatGBP(baseline)}/year. Drag to apply a lifestyle change relative to that.`
                    : "Commit an entry first to set the baseline this slider measures against."}
                </div>
              </div>
            );
          })()}
          {(() => {
            // Build 125e — live nominal preview, updates as you type,
            // before you commit anything. Answers "what does this
            // actually mean in real pounds today?" on the spot. Build 127
            // — worked-example walkthrough dropped from the footnote below:
            // the slider above now demonstrates the multiplier directly.
            const idx = inflationTracking.currentIndex;
            const hasDrift = !!idx && Math.abs(idx - 1) > 0.0005;
            if (!hasDrift) return null;
            const annualReal = cleanNum(targetYearly);
            if (annualReal <= 0) return null;
            const annualNominal = nominaliseRequest(annualReal);
            const quarterlyNominal = annualNominal / 4;
            return (
              <div
                style={{
                  marginTop: "0.5rem",
                  padding: "0.6rem 0.75rem",
                  background: "rgba(55,138,221,0.1)",
                  border: "1px solid rgba(55,138,221,0.3)",
                  borderRadius: "0.4rem",
                  fontSize: "0.78rem",
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>Live nominal preview — </span>
                <strong style={{ color: "var(--accent-blue)" }}>{formatGBP(annualNominal)}/year</strong>
                <span style={{ color: "var(--text-muted)" }}>
                  {" "}
                  ({formatGBP(quarterlyNominal)}/quarter) in actual pounds today
                </span>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                  Based on realised inflation since plan start (see Pane 2's Inflation Tracking). State Pension is
                  excluded from this — it's fixed, not a lifestyle choice, and is netted off separately.
                </div>
              </div>
            );
          })()}
          {calc.pensionActive && (
            <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", lineHeight: 1.5 }}>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Gross lifestyle target: </span>
                <strong>{formatGBP(calc.grossTargetYearly)}</strong>
                <span style={{ color: "var(--text-muted)" }}> / yr</span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Less pension in payment: </span>
                <strong>−{formatGBP(calc.pensionIncome)}</strong>
                <span style={{ color: "var(--text-muted)" }}>
                  {" "}
                  / yr (from age {pensionStartAge}
                  {pensionIncreasePct > 0 ? `, +${pensionIncreasePct.toFixed(1)}% real p.a.` : ""})
                </span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Net drawn from pot: </span>
                <strong style={{ color: "var(--accent-blue)" }}>{formatGBP(calc.netTargetYearly)}</strong>
                <span style={{ color: "var(--text-muted)" }}> / yr — used for the guardrail calculation</span>
              </div>
            </div>
          )}
          <div className="shd-sub" style={{ marginTop: "0.35rem" }}>
            {calc.pensionActive
              ? "Pension is netted off automatically — the values below drive this pane and the Risk Simulator."
              : pensionAmount > 0
                ? `Pension of ${formatGBP(pensionAmount)}/yr starts at age ${pensionStartAge} — until then the full gross target is funded from the pot.`
                : "No pension set. Add one below and it will be netted off this target automatically once it starts."}
          </div>

          {/* Build 099 — pension inputs live here (Pane 1) as the single
              real, app-wide source. The Risk Simulator reads these live, or can run
              its own hypothetical without ever writing back. */}
          <div
            style={{
              marginTop: "0.85rem",
              paddingTop: "0.75rem",
              borderTop: "1px dashed var(--border-color)",
            }}
          >
            <div
              style={{
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "var(--text-main)",
                marginBottom: "0.5rem",
              }}
            >
              State / Other Pension
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.75rem",
              }}
            >
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Annual Pension ({currency}, today's {currency})
                </label>
                <MoneyInput
                  id="pension-amount"
                  currency={currency}
                  value={pensionAmountStr}
                  onChange={setPensionAmountStr}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Pension Start Age</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="67"
                  value={String(pensionStartAge)}
                  onChange={(e) => {
                    const n = Math.floor(Number(e.target.value.replace(/[^0-9]/g, "")) || 0);
                    setPensionStartAge(n);
                  }}
                  aria-label="Pension start age"
                />
              </div>
            </div>
            <label
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                display: "block",
                marginTop: "0.6rem",
              }}
            >
              Pension Real Increase %{" "}
              <span style={{ color: "var(--text-main)", fontWeight: 700 }}>{pensionIncreasePct.toFixed(1)}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={3}
              step={0.1}
              value={pensionIncreasePct}
              onChange={(e) => setPensionIncreasePct(parseFloat(e.target.value) || 0)}
              style={{ width: "100%" }}
              aria-label="Pension real increase percent per year"
            />
            <div
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                marginTop: "0.15rem",
                fontStyle: "italic",
              }}
            >
              Growth above inflation (0% = tracks CPI exactly). These are your real figures — the Risk Simulator reads
              them live unless you switch it to Hypothetical.
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.75fr", gap: "0.85rem" }}>
          <div>
            <label style={{ fontSize: "0.78rem", whiteSpace: "nowrap" }}>Cash Buffer Target (months)</label>
            <IntInput min={1} max={120} value={desiredRunwayMonths} fallback={36} onChange={setDesiredRunwayMonths} />
          </div>
          <div>
            <label htmlFor="legacyTargetTop" style={{ fontSize: "0.78rem", whiteSpace: "nowrap" }}>
              Legacy Target ({currency})
            </label>
            <MoneyInput
              id="legacyTargetTop"
              value={legacyTarget ? String(legacyTarget) : ""}
              onChange={(v) => setLegacyTarget(cleanNum(v))}
              currency={currency}
            />
          </div>
          <div>
            <label htmlFor="currencySel" style={{ fontSize: "0.78rem", whiteSpace: "nowrap" }}>
              Currency
            </label>
            <select
              id="currencySel"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencySymbol)}
              style={{
                width: "100%",
                background: "var(--bg-input, #0f172a)",
                border: "1px solid var(--border-color)",
                color: "var(--text-main)",
                padding: "0.6rem",
                borderRadius: "0.375rem",
                fontSize: "0.95rem",
              }}
              aria-label="Display currency (cosmetic only — no FX conversion)"
            >
              <option value="£">£ GBP</option>
              <option value="€">€ EUR</option>
              <option value="$">$ USD</option>
            </select>
          </div>
        </div>
        <div
          style={{
            fontSize: "0.72rem",
            color: "var(--text-muted)",
            marginTop: 6,
            fontStyle: "italic",
          }}
        >
          Legacy Target: real-terms amount you want to leave behind (rises with inflation). Held aside from the Fun
          Bucket and factored into every directive. Set to {currency}0 to draw the pot to zero. Currency change is
          cosmetic only — no FX conversion.
        </div>

        <div
          style={{
            marginTop: "1rem",
            borderTop: "1px solid var(--border-color)",
            paddingTop: "1rem",
          }}
        >
          <div style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.35rem" }}>
            Withdrawal Recorded ({currency})
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
            <div>
              <label htmlFor="wdEq" style={{ fontSize: "0.75rem" }}>
                Withdrawn from Equities
              </label>
              <MoneyInput
                id="wdEq"
                value={wdEqStr}
                onChange={(v) => {
                  setWdEqStr(v);
                  setWdSplitTouched(true);
                }}
                currency={currency}
              />
            </div>
            <div>
              <label htmlFor="wdCash" style={{ fontSize: "0.75rem" }}>
                Withdrawn from Cash
              </label>
              <MoneyInput
                id="wdCash"
                value={wdCashStr}
                onChange={(v) => {
                  setWdCashStr(v);
                  setWdSplitTouched(true);
                }}
                currency={currency}
              />
            </div>
          </div>
          {(() => {
            const wdEq = cleanNum(wdEqStr);
            const wdCash = cleanNum(wdCashStr);
            const wdTotal = wdEq + wdCash;
            // Build 125d — nominal request, matching the directive.
            const req = nominaliseRequest(calc.guardrailAdjustedQuarterly);
            const mismatch = wdTotal > 0 && Math.abs(wdTotal - req) > 0.005;
            return (
              <div
                style={{
                  marginTop: "0.4rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <span className="shd-sub" style={{ fontSize: "0.75rem" }}>
                  Total: <strong>{formatGBP(wdTotal)}</strong>
                  {mismatch ? (
                    <span style={{ color: "var(--accent-amber)", marginLeft: 6 }}>
                      ⚠ Eq + Cash ≠ Request {formatGBP(req)} — commit will still succeed.
                    </span>
                  ) : null}
                </span>
                <button
                  className="secondary"
                  type="button"
                  style={{ fontSize: "0.7rem", padding: "0.3rem 0.55rem", whiteSpace: "nowrap" }}
                  onClick={() => {
                    setWdSplitTouched(false);
                    // Build 125d — reset to the nominal request too.
                    const rq = nominaliseRequest(calc.guardrailAdjustedQuarterly);
                    setWdEqStr("0.00");
                    setWdCashStr(rq > 0 ? rq.toFixed(2) : "0.00");
                  }}
                  title="Reset to £0 Equities / full Request from Cash."
                >
                  Reset split
                </button>
              </div>
            );
          })()}

          <div style={{ marginTop: "0.75rem" }}>
            <label htmlFor="rebalDir" style={{ fontSize: "0.75rem" }}>
              Rebalance Move (optional)
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "0.6rem", alignItems: "center" }}>
              <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                {(
                  [
                    ["none", "None"],
                    ["eq_to_cash", "Equities → Cash"],
                    ["cash_to_eq", "Cash → Equities"],
                  ] as [RebalDir, string][]
                ).map(([id, lbl]) => (
                  <button
                    key={id}
                    type="button"
                    className={rebalDir === id ? "" : "secondary"}
                    style={{ fontSize: "0.7rem", padding: "0.35rem 0.55rem", minHeight: "auto" }}
                    onClick={() => setRebalDir(id)}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
              <MoneyInput id="rebalAmt" value={rebalAmtStr} onChange={setRebalAmtStr} currency={currency} />
            </div>
            <span className="shd-sub" style={{ fontSize: "0.7rem" }}>
              Records an intra-bucket transfer that happened this quarter (separate from spending).
            </span>
          </div>
          {/* Legacy hidden value — kept in sync with the total so any
              remaining consumer of withdrawnStr still works. */}
          <input type="hidden" value={withdrawnStr} readOnly />
        </div>
      </div>

      {/* Build 081 — State Test Presets moved to Pane 2 (hidden by
          default, toggled via double-click on the Pane 2 header). */}

      {/* Build 083 — primary + contextual secondaries. In Edit mode we
          show THREE buttons: Update Entry / Discard Changes / Exit
          Edit → New Entry. Outside Edit mode: Commit / Cancel only.
          All secondary buttons use the app's standard blue button
          styling (no ghost/outline) so they read clearly as
          clickable actions. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: editIndex > -1 ? "3fr 1fr 1fr" : "3fr 1fr",
          gap: "0.5rem",
        }}
      >
        <button
          onClick={openCommitConfirm}
          disabled={trialBlocked}
          style={{ width: "100%", padding: "1rem", fontWeight: 800, borderRadius: "0.5rem" }}
          title={trialBlocked ? "Entry limit reached — enter a license key to continue." : ""}
        >
          {editIndex > -1
            ? "Update Entry"
            : trialBlocked
              ? "Entry limit reached — License required"
              : "Commit Entry to Ledger"}
        </button>
        <button
          onClick={revertPane1}
          style={{
            width: "100%",
            padding: "1rem",
            fontWeight: 700,
            borderRadius: "0.5rem",
          }}
          title={
            editIndex > -1
              ? "Reload this row's stored values, discarding any unsaved edits. Stays in Edit mode."
              : "Reload the most recently committed Normal ledger entry, discarding any unsaved changes."
          }
        >
          {editIndex > -1 ? "Discard Changes" : "Cancel"}
        </button>
        {editIndex > -1 && (
          <button
            onClick={exitEditToNewEntry}
            style={{
              width: "100%",
              padding: "1rem",
              fontWeight: 700,
              borderRadius: "0.5rem",
            }}
            title="Fully exit Edit mode and load Pane 1 with the fresh new-entry state (last committed Normal ledger entry)."
          >
            Exit Edit / New Entry
          </button>
        )}
      </div>

      {/* Build 065 — Extraordinary Inflow relocated below "Can I Afford This?" */}
    </div>
  );
}
