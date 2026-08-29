// Sovereign Glidepath — pure calculation engine.
// All math from v1.8 HTML, refactored as deterministic functions.

import type { CpiReferenceRow } from "./cpiReference";

export type Phase = "Go-Go" | "Go-Slow" | "No-Go";
export type Trajectory = "ascending" | "descending" | "stable";

export interface LedgerEntry {
  label: string;
  age: number;
  cappingAge: number;
  equities: number;
  mmFund: number;
  ath: number;
  targetYearly: number;
  desiredMonths: number;
  growthRate: number;
  totalCapital: number;
  drawdownPct: number;
  rule: string;
  phase: string;
  // Real-terms legacy / inheritance target held aside from the "Fun Bucket".
  legacyTarget?: number;
  // Special-event marker: a one-off withdrawal (e.g. car purchase) committed
  // from Pane 5. Carries a plain-text note and an ISO date.
  isSpecialEvent?: boolean;
  eventNote?: string;
  eventDate?: string;
  eventFromEq?: number;
  eventFromCash?: number;
  // For inflow events, eventAmount is the positive absolute amount added.
  isInflowEvent?: boolean;
  eventAmount?: number;
  // Actual amount withdrawn on this quarterly ledger row (Build 062+). Pre-filled
  // from the guardrail-adjusted "Request" on the input pane but freely editable
  // so the user can record what really left the pot that quarter.
  withdrawnAmount?: number;
  // Build 070 — explicit split of the quarterly withdrawal by source bucket,
  // plus an optional rebalance move between buckets. Only set on Normal
  // quarterly drawdown rows; Special Withdrawal and Windfall rows leave these
  // undefined. Undefined on legacy rows committed before Build 070 (do NOT
  // default to 0 — that would misrepresent "source not recorded" as "£0").
  withdrawnFromEquities?: number;
  withdrawnFromCash?: number;
  rebalanceDirection?: "none" | "eq_to_cash" | "cash_to_eq";
  rebalanceAmount?: number;
  // Discriminator for downstream logic — set on every Build 070+ commit so
  // future passes can tell row types apart without parsing the label text.
  entryKind?: "normal" | "special_withdrawal" | "windfall";
  // Build 073 — real ISO date (YYYY-MM-DD) representing the end of the period
  // this Normal row covers. Single source of truth for chronological ordering
  // — the free-text `label` is cosmetic only and must NOT be relied on for
  // sort keys or "previous row" lookups. Undefined for legacy rows whose
  // label did not cleanly parse, and for event rows (which use `eventDate`).
  periodEndDate?: string;
  // Build 079 — snapshot of Pane 2's "Withdrawal Status" (calc.guardrailStatus)
  // at commit time: "Normal" | "Reduction Applied (-10%)" |
  // "Prosperity Bonus (+10%)" | "Comfortable Amortization". The existing
  // `rule` field already stores Pane 2's "Guardrail State"
  // (directive.guardrailText). Together they let the ledger and CSV export
  // record the full state Pane 2/3 were displaying when the row was committed.
  guardrailStatus?: string;
  // Build 095 — per-row snapshot of the three planning assumptions that were
  // in force in Pane 1 when this row was committed. Undefined on legacy rows
  // committed before Build 095 (do NOT backfill from today's globals — that
  // would fabricate history; Edit shows 0 / "not recorded" instead).
  assumedGrowthRate?: number;
  assumedCashRealPct?: number;
  assumedInflationPct?: number;
  // Build 125 — actual observed CPI/RPI since the PRIOR row, entered at
  // commit time as a plain percentage (e.g. 2.8, not 0.028). Optional: when
  // omitted, computeInflationTracking() falls back to the row's own
  // assumedInflationPct (or the current Pane 1 slider, for legacy rows with
  // neither) annualised over the actual elapsed time to the prior row. This
  // is what lets the realised-inflation index be as accurate as the user is
  // willing to make it, without ever forcing a lookup.
  actualCpiSincePriorRow?: number;
  // Build 126 — snapshot of Pane 2's Fun Bucket Balance (calc.surplus,
  // floored at 0 to match the display convention) at commit time. Undefined
  // on legacy rows committed before Build 126 — do NOT backfill by
  // recomputing from today's assumptions, since surplus depends on the
  // Assumed Real Growth Rate and Cash Buffer Target in force at the time,
  // which may since have changed.
  funBucket?: number;
  // Build 128 — per-row snapshot of the pension inputs (Pane 1's Annual
  // Pension / Pension Start Age / Pension Real Increase %) in force when
  // this row was committed. Same rationale as the Build 095 assumedGrowthRate
  // /assumedCashRealPct/assumedInflationPct snapshot above: pension is a
  // live, global Pane 1 setting, so without this, editing an old row
  // recomputed "Less pension in payment" using whatever pension figures are
  // live RIGHT NOW, not what was true when the row was actually built —
  // silently wrong for any row built under different pension assumptions,
  // whether from a genuine real-world pension change over time or (where
  // this was actually caught) a Scenario Test Runner file whose own pension
  // figures differ entirely from the live plan's. Undefined on legacy rows:
  // do NOT backfill from today's globals, same discipline as every other
  // per-row snapshot field.
  pensionAmount?: number;
  pensionStartAge?: number;
  pensionIncreasePct?: number;
}

export interface CalcInputs {
  currentAge: number;
  cappingAge: number;
  rawEquities: number;
  mmFund: number;
  ath: number;
  targetYearly: number;
  stressPct: number;
  growthRatePct: number;
  desiredRunwayMonths: number;
  legacyTarget?: number;
  /** Real return on the Cash Pot, in %. Used to blend the amortization rate. */
  cashRealPct?: number;
  /**
   * Build 091 — total portfolio value at plan inception (oldest ledger row).
   * Independent reference for the Guyton-Klinger Prosperity (+10%) branch.
   * Omit and the ATH-anchored rate is used as before.
   */
  baselineTotal?: number;

  /**
   * Build 092 — State / DB pension, in today's money. Same convention the
   * simulators (drawdown.ts call-sites) have used since Build 021: once
   * `currentAge >= pensionStartAge`, the pension is netted off the gross
   * Target Annual Base Withdrawal and only the REMAINDER is funded from the
   * pot. Omit (or leave at 0) and behaviour is identical to Build 091.
   */
  pensionAmount?: number;
  /** Age at which the pension starts being received. */
  pensionStartAge?: number;
  /** Real annual increase of the pension, in % (compounds from start age). */
  pensionIncreasePct?: number;

  /**
   * Build 125 — cumulative realised-inflation index (multiplier, plan
   * inception = 1.0), as returned by computeInflationTracking().currentIndex.
   * Optional; omitted or 1.0 means "no nominal conversion shown" — the
   * directive falls back to its historical real-terms-only behaviour.
   */
  inflationIndex?: number;
  /** Calendar year of the ledger's oldest (plan-inception) row, for the Pane 3 caption. */
  inflationBaseYear?: number;
}

/**
 * Build 092 — pension actually in payment this year, in today's money.
 * Mirrors drawdown.ts's call-sites: 0 before the start age, otherwise the
 * amount escalated in real terms for each year since the start age.
 */
export function pensionIncomeFor(inp: {
  currentAge: number;
  pensionAmount?: number;
  pensionStartAge?: number;
  pensionIncreasePct?: number;
}): number {
  const amt = Math.max(0, inp.pensionAmount || 0);
  const startAge = inp.pensionStartAge;
  if (amt <= 0 || typeof startAge !== "number" || startAge <= 0) return 0;
  if (inp.currentAge < startAge) return 0;
  const g = Math.max(0, inp.pensionIncreasePct || 0) / 100;
  const yearsInPayment = Math.max(0, Math.floor(inp.currentAge - startAge));
  return amt * Math.pow(1 + g, yearsInPayment);
}

/** Net-of-pension annual draw funded from the pot. */
export function netTargetYearlyFor(inp: CalcInputs): number {
  return Math.max(0, inp.targetYearly - pensionIncomeFor(inp));
}

// ---------------------------------------------------------------------------
// Build 125 — Realised Inflation Tracking.
//
// The live directive has always spoken in REAL terms (today's money): the
// Target Annual Base Withdrawal stays flat, and the model deflates portfolio
// returns rather than inflating the withdrawal. That is internally
// consistent, but it means the pound figure printed on screen is never the
// actual nominal amount to withdraw in cash — the user was expected to do
// that translation themselves, silently, with no help from the app.
//
// This tracks a cumulative realised-inflation index across the ledger's
// history (oldest row = 1.0) so the directive can show a genuine nominal
// draw figure alongside the real one. Only Normal (non-event) rows with a
// periodEndDate participate in the chain — special-event and windfall rows
// don't represent a new planning period and must not distort the index.
// ---------------------------------------------------------------------------

export interface InflationTrackingRow {
  /** Index into the ORIGINAL ledger array (newest-first) this row came from. */
  ledgerIndex: number;
  periodEndDate: string;
  /** Cumulative index AS OF this row, oldest row = 1.0. */
  cumulativeIndex: number;
  /** True if the rate came from the CPI reference table or actualCpiSincePriorRow (vs assumed fallback). */
  isActual: boolean;
  /** The per-period rate actually applied (table/actual if present, else assumed), as %. */
  rateAppliedPct: number;
  /**
   * Build 135 — which source supplied rateAppliedPct: "table" (CPI Index
   * Reference Table lookup for both this row's and the prior row's
   * periodEndDate), "entry" (actualCpiSincePriorRow, a manually typed
   * plain %), or "assumed" (no actual data, fell back to the assumed rate).
   */
  source: "table" | "entry" | "assumed";
}

export interface InflationTrackingResult {
  rows: InflationTrackingRow[];
  /** Cumulative index at the most recent participating row. 1.0 if fewer than 2 rows. */
  currentIndex: number;
  /** Implied average annual realised rate across the whole tracked span, as %. */
  impliedAverageAnnualPct: number;
}

const MS_PER_YEAR = 365.25 * 86_400_000;

/**
 * Build the cumulative realised-inflation index across a ledger's Normal-row
 * history. `ledger` is newest-first (the app's standard convention — index 0
 * is the most recent commit). `fallbackAssumedPct` is used for legacy rows
 * that recorded neither an actual figure nor their own assumedInflationPct
 * snapshot (typically the current Pane 1 slider value).
 *
 * Build 135 — `referenceTable`, if supplied, is checked FIRST for each
 * row-pair: if both this row's and the prior row's periodEndDate have a raw
 * CPI INDEX recorded, the rate is derived directly from the two indices
 * (New÷Old−1)×100, and any actualCpiSincePriorRow on the row is ignored for
 * that pair. This means correcting or rebasing a single reference-table
 * entry propagates to every row that touches it, with no per-row edits.
 * Falls back to the existing actualCpiSincePriorRow / assumed-rate
 * behaviour, unchanged, when the table doesn't cover both dates.
 */
export function computeInflationTracking(
  ledger: LedgerEntry[],
  fallbackAssumedPct: number,
  referenceTable?: CpiReferenceRow[],
): InflationTrackingResult {
  // Oldest-first, Normal rows only, with a usable date.
  const chain = ledger
    .filter(
      (e) =>
        !e.isSpecialEvent &&
        e.entryKind !== "special_withdrawal" &&
        e.entryKind !== "windfall" &&
        !e.isInflowEvent &&
        typeof e.periodEndDate === "string" &&
        e.periodEndDate.length > 0,
    )
    .map((e) => ({ entry: e, ledgerIndex: ledger.indexOf(e) }))
    .sort((a, b) => a.entry.periodEndDate!.localeCompare(b.entry.periodEndDate!));

  if (chain.length === 0) {
    return { rows: [], currentIndex: 1.0, impliedAverageAnnualPct: 0 };
  }

  const refMap: Map<string, number> | undefined =
    referenceTable && referenceTable.length > 0 ? new Map(referenceTable.map((r) => [r.date, r.index])) : undefined;

  const rows: InflationTrackingRow[] = [];
  let cumulativeIndex = 1.0;
  let prevDateMs = Date.parse(chain[0].entry.periodEndDate + "T00:00:00Z");

  // First (oldest) row is the plan-inception baseline — index 1.0 by
  // definition, nothing has compounded yet.
  rows.push({
    ledgerIndex: chain[0].ledgerIndex,
    periodEndDate: chain[0].entry.periodEndDate!,
    cumulativeIndex: 1.0,
    isActual: false,
    rateAppliedPct: 0,
    source: "assumed",
  });

  for (let i = 1; i < chain.length; i++) {
    const { entry, ledgerIndex } = chain[i];
    const dateMs = Date.parse(entry.periodEndDate + "T00:00:00Z");
    const yearsElapsed = Math.max(0, (dateMs - prevDateMs) / MS_PER_YEAR);

    const prevPeriodEndDate = chain[i - 1].entry.periodEndDate!;
    const tablePrevIdx = refMap?.get(prevPeriodEndDate);
    const tableCurIdx = refMap?.get(entry.periodEndDate!);
    const hasTableLookup = typeof tablePrevIdx === "number" && tablePrevIdx > 0 && typeof tableCurIdx === "number";

    const hasActual = typeof entry.actualCpiSincePriorRow === "number" && !isNaN(entry.actualCpiSincePriorRow);
    let periodFactor: number;
    let rateAppliedPct: number;
    let source: "table" | "entry" | "assumed";

    if (hasTableLookup) {
      // CPI Index Reference Table — checked first. Raw index ratio between
      // the two period-end dates, applied directly (not annualised — same
      // as the "entry" path below, since it's whatever real span separates
      // the two rows).
      periodFactor = tableCurIdx! / tablePrevIdx!;
      rateAppliedPct = (periodFactor - 1) * 100;
      source = "table";
    } else if (hasActual) {
      // Actual is recorded as the total change SINCE THE PRIOR ROW (not
      // necessarily annualised — it's whatever the user looked up for that
      // real span), so it's applied directly as a single compounding step.
      rateAppliedPct = entry.actualCpiSincePriorRow!;
      periodFactor = 1 + rateAppliedPct / 100;
      source = "entry";
    } else {
      // Assumed fallback IS an annual rate, so it must be raised to the
      // actual elapsed span before compounding — a 6-month gap should only
      // apply half a year's inflation, not a full year's.
      const assumedPct = typeof entry.assumedInflationPct === "number" ? entry.assumedInflationPct : fallbackAssumedPct;
      rateAppliedPct = assumedPct;
      periodFactor = Math.pow(1 + assumedPct / 100, yearsElapsed);
      source = "assumed";
    }

    cumulativeIndex *= periodFactor;
    rows.push({
      ledgerIndex,
      periodEndDate: entry.periodEndDate!,
      cumulativeIndex,
      isActual: source !== "assumed",
      rateAppliedPct,
      source,
    });
    prevDateMs = dateMs;
  }

  const spanMs =
    Date.parse(chain[chain.length - 1].entry.periodEndDate + "T00:00:00Z") -
    Date.parse(chain[0].entry.periodEndDate + "T00:00:00Z");
  const totalYears = Math.max(0, spanMs / MS_PER_YEAR);
  const impliedAverageAnnualPct = totalYears > 0 ? (Math.pow(cumulativeIndex, 1 / totalYears) - 1) * 100 : 0;

  return { rows, currentIndex: cumulativeIndex, impliedAverageAnnualPct };
}

/** Convert a real-terms (today's money) amount to its nominal equivalent given a cumulative index. */
export function nominalFromReal(realAmount: number, cumulativeIndex: number): number {
  return realAmount * Math.max(0, cumulativeIndex || 1.0);
}

// Build 131 — "potential underspend" signal, Pane 2.
//
// Two signals validated against real historical data (29 rolling real
// UK/global cohorts, not synthetic): a scenario ending with a large surplus
// (>=4x the starting pot) almost always had its realised withdrawal rate
// fall well below where it started by year 5, AND never drew the pot down
// more than ~10% below its starting value at any point. Both conditions
// held together far more reliably than either alone. This function checks
// both against the REAL live ledger, using the plan's own day-1 figures as
// the fixed reference point — not the constantly-moving ATH the guardrails
// already use, since that's a different question ("is this a good quarter"
// vs. "has the whole plan been running comfortably ahead since inception").
//
// Deliberately excludes special-withdrawal and windfall rows from the
// chronological chain (same filter computeInflationTracking uses) — those
// are one-off events, not part of the steady realised-WR trend this is
// trying to read.
export interface UnderspendSignalResult {
  /** False if there isn't enough real history yet (fewer than 2 usable rows). */
  eligible: boolean;
  yearsSinceStart: number;
  /** Years 3-5: a soft, deliberately hedged heads-up — the signal isn't validated this early. */
  isPreNotice: boolean;
  /** Year 5+: the actual validated evaluation window. */
  isEvaluated: boolean;
  /** Both conditions currently hold (only meaningful once isEvaluated). */
  triggered: boolean;
  /** How many consecutive years (walking back from now) the condition has held, re-evaluated at each point using only the ledger as it stood then. */
  consecutiveYearsTriggered: number;
  currentRealisedWrPct: number;
  originalRealisedWrPct: number;
  /** currentRealisedWrPct as a % of originalRealisedWrPct — the trigger fires at <= wrThresholdPct. */
  wrRatioPct: number;
  everDippedBelowFloor: boolean;
}

const UNDERSPEND_INELIGIBLE: UnderspendSignalResult = {
  eligible: false,
  yearsSinceStart: 0,
  isPreNotice: false,
  isEvaluated: false,
  triggered: false,
  consecutiveYearsTriggered: 0,
  currentRealisedWrPct: 0,
  originalRealisedWrPct: 0,
  wrRatioPct: 0,
  everDippedBelowFloor: false,
};

export function computeUnderspendSignal(
  ledger: LedgerEntry[],
  wrThresholdPct: number,
  dipFloorPct: number,
): UnderspendSignalResult {
  const chain = ledger
    .filter(
      (e) =>
        !e.isSpecialEvent &&
        e.entryKind !== "special_withdrawal" &&
        e.entryKind !== "windfall" &&
        !e.isInflowEvent &&
        typeof e.periodEndDate === "string" &&
        e.periodEndDate.length > 0,
    )
    .sort((a, b) => a.periodEndDate!.localeCompare(b.periodEndDate!));

  if (chain.length < 2) return { ...UNDERSPEND_INELIGIBLE };

  const oldest = chain[0];
  const newest = chain[chain.length - 1];
  const oldestMs = Date.parse(oldest.periodEndDate + "T00:00:00Z");
  const newestMs = Date.parse(newest.periodEndDate + "T00:00:00Z");
  const yearsSinceStart = Math.max(0, (newestMs - oldestMs) / MS_PER_YEAR);

  if (yearsSinceStart < 3) return { ...UNDERSPEND_INELIGIBLE, eligible: true, yearsSinceStart };

  const originalPot = oldest.totalCapital;
  const originalTarget = oldest.targetYearly;
  const originalRealisedWrPct = originalPot > 0 ? (originalTarget / originalPot) * 100 : 0;
  const dipFloorValue = originalPot * (1 - dipFloorPct / 100);

  function evalAt(idx: number): boolean {
    const row = chain[idx];
    if (row.totalCapital <= 0 || originalRealisedWrPct <= 0) return false;
    const wrPct = (row.targetYearly / row.totalCapital) * 100;
    const ratio = (wrPct / originalRealisedWrPct) * 100;
    const dippedSoFar = chain.slice(0, idx + 1).some((e) => e.totalCapital < dipFloorValue);
    return ratio <= wrThresholdPct && !dippedSoFar;
  }

  const currentIdx = chain.length - 1;
  const currentRow = chain[currentIdx];
  const currentRealisedWrPct =
    currentRow.totalCapital > 0 ? (currentRow.targetYearly / currentRow.totalCapital) * 100 : 0;
  const wrRatioPct = originalRealisedWrPct > 0 ? (currentRealisedWrPct / originalRealisedWrPct) * 100 : 0;
  const everDippedBelowFloor = chain.some((e) => e.totalCapital < dipFloorValue);

  const isPreNotice = yearsSinceStart >= 3 && yearsSinceStart < 5;
  const isEvaluated = yearsSinceStart >= 5;
  const triggered = isEvaluated && evalAt(currentIdx);

  let consecutiveYearsTriggered = 0;
  if (triggered) {
    const wholeYears = Math.floor(yearsSinceStart);
    for (let yearsBack = 0; yearsBack < wholeYears; yearsBack++) {
      const targetMs = newestMs - yearsBack * MS_PER_YEAR;
      if ((targetMs - oldestMs) / MS_PER_YEAR < 5) break; // can't evaluate before year 5
      let idx = -1;
      for (let i = 0; i < chain.length; i++) {
        const ms = Date.parse(chain[i].periodEndDate + "T00:00:00Z");
        if (ms <= targetMs) idx = i;
        else break;
      }
      if (idx === -1) break;
      if (evalAt(idx)) consecutiveYearsTriggered++;
      else break;
    }
  }

  return {
    eligible: true,
    yearsSinceStart,
    isPreNotice,
    isEvaluated,
    triggered,
    consecutiveYearsTriggered,
    currentRealisedWrPct,
    originalRealisedWrPct,
    wrRatioPct,
    everDippedBelowFloor,
  };
}

export interface CalcOutputs {
  phase: Phase;
  stressedEquities: number;
  total: number;
  drawdownPct: number;
  targetWR: number;
  currentWR: number;
  guardrailFactor: number;
  guardrailStatus: string;
  guardrailColor: string;
  modifiedTargetMonths: number;
  targetCashAmount: number;
  quarterlyRequest: number;
  guardrailAdjustedQuarterly: number;
  runwayMonths: number;
  runwayColor: string;
  surplus: number;
  legacyTarget: number;
  comfortYears: number;
  trajectory: Trajectory;
  trajectoryLabel: string;
  trajectoryColor: string;
  remainingYears: number;
  baselineNeed: number;
  /** Build 092 — pension transparency. */
  grossTargetYearly: number;
  pensionIncome: number;
  netTargetYearly: number;
  pensionActive: boolean;
  /** Build 113 — true when Total Capital is <= 0 with a live spending target. */
  portfolioExhausted: boolean;
}

export const COLORS = {
  green: "var(--accent-green)",
  blue: "var(--accent-blue)",
  amber: "var(--accent-amber)",
  red: "var(--accent-red)",
  purple: "var(--accent-purple)",
  muted: "var(--text-muted)",
  text: "var(--text-main)",
};

export function phaseFor(age: number): Phase {
  if (age <= 75) return "Go-Go";
  if (age <= 85) return "Go-Slow";
  return "No-Go";
}

// ---------------------------------------------------------------------------
// Build 090 — TRAILING DRAWDOWN-OFF-ATH: the single source of truth for the
// "is this a defensive period?" signal, shared by the live dashboard
// (calculate()/generateDirectives()) and the simulators (drawdown.ts).
//
// The signal must only use information available BEFORE the period's own
// return is known: balances as they stood going into the period, measured
// against the all-time high established by prior history. Using the period's
// own realized return is look-ahead bias.
// ---------------------------------------------------------------------------

/** Percentage the portfolio currently sits below its own past all-time high. */
export function drawdownPctOffAth(total: number, ath: number): number {
  return ath > 0 ? ((ath - total) / ath) * 100 : 0;
}

/** Preservation ("meaningful drawdown") threshold, in % off ATH. */
export function preservationThresholdPct(phase: Phase): number {
  return phase === "Go-Slow" ? 15.0 : 10.0;
}

/** Severe ("deep drawdown") threshold, in % off ATH. */
export function severeThresholdPct(phase: Phase): number {
  return phase === "Go-Slow" ? 25.0 : 20.0;
}

/**
 * Trailing-drawdown defensive predicate. Mode sets the sensitivity around the
 * SAME phase-aware thresholds the dashboard uses:
 *   Strict     — only in a severe drawdown (>= severeThresholdPct)
 *   Standard   — the dashboard's own Preservation trigger (>= preservationThresholdPct)
 *   Aggressive — half the Preservation trigger (earliest de-risking)
 */
export function defensiveDrawdownHurdlePct(phase: Phase, mode: "strict" | "standard" | "aggressive"): number {
  if (mode === "strict") return severeThresholdPct(phase);
  if (mode === "aggressive") return preservationThresholdPct(phase) / 2;
  return preservationThresholdPct(phase);
}

/**
 * Is the period defensive, judged purely on trailing state?
 * @param totalBefore  E + C as they stood BEFORE this period's return.
 * @param athBefore    All-time high of E + C from prior history only.
 */
export function isDefensiveByTrailingDrawdown(
  totalBefore: number,
  athBefore: number,
  phase: Phase,
  mode: "strict" | "standard" | "aggressive",
): boolean {
  const draw = drawdownPctOffAth(totalBefore, athBefore);
  // Round to 4 dp so a value sitting exactly on the hurdle can't flip on noise.
  return Math.round(draw * 1e4) / 1e4 >= defensiveDrawdownHurdlePct(phase, mode);
}

// ---------------------------------------------------------------------------
// Build 091 — GUYTON-KLINGER GUARDRAIL: single source of truth, shared by the
// live dashboard (calculate()) and the simulators (drawdown.ts applyPeriod()).
//
// Prior builds compared the current withdrawal rate against an ATH-anchored
// rate for BOTH branches. Because the ATH is a running maximum of the total,
// the total can never exceed it, so currentWR >= athWR always held and the
// Prosperity (+10%) branch was mathematically unreachable in the simulators.
//
// The corrected design uses TWO independent references:
//   • Preservation (−10%) still compares against the PEAK (ATH) rate — the
//     capital-preservation guardrail is about how far you have fallen from
//     your best, so the peak is the right reference. Behaviour unchanged.
//   • Prosperity (+10%) compares against the plan's BASELINE rate — the
//     withdrawal rate implied by the portfolio at plan inception. This
//     reference does not move with the peak, so a portfolio that grows well
//     beyond its starting value genuinely drives currentWR below it.
// ---------------------------------------------------------------------------

export type GkOutcome = { factor: number; label: "Normal" | "Preservation" | "Prosperity" };

/**
 * Guyton-Klinger ±10% decision. All three WR arguments must share the same
 * unit (all fractions, or all percentages) — only ratios are compared.
 * Gated off entirely in the No-Go phase (Build 089).
 */
export function gkGuardrail(currentWR: number, athWR: number, baselineWR: number, phase: Phase): GkOutcome {
  if (phase === "No-Go") return { factor: 1.0, label: "Normal" };
  if (athWR > 0 && currentWR >= athWR * 1.2) return { factor: 0.9, label: "Preservation" };
  if (baselineWR > 0 && currentWR <= baselineWR * 0.8) return { factor: 1.1, label: "Prosperity" };
  return { factor: 1.0, label: "Normal" };
}

// Build 088 — CANONICAL DIRECTIVE STATE REGISTRY.
// Single source of truth for every value `Directive.guardrailText` can take,
// the banner title the engine renders for it, and whether the narrative locks
// the withdrawal source (and to which bucket). Non-locking states have
// lockedBucket === null and defer to the caller's Defensive-Draw Mode.
// Banner (Pane 3), footnote, Pane 2 "Guardrail State" and the State Test
// Presets all read from this table so they can never drift apart.
export const DIRECTIVE_STATES = {
  "Peak Refill": { title: "Peak Refill Directive", lockedBucket: "equities" },
  "Recovery Wave Refill": {
    title: "Recovery Wave Refill",
    lockedBucket: "equities",
  },
  "Refilling Shield": {
    title: "Normal Draw — Shield Below Target",
    lockedBucket: "equities",
  },
  "Reverse-Shielding": { title: "Reverse-Shielding", lockedBucket: "cash" },
  // Cash is empty; the remainder is sold from equities. Seed the split as
  // equities so the Commit form records the dominant source.
  "Shield Deficit": { title: "Shield Deficit", lockedBucket: "equities" },
  Exhaustion: {
    title: "Shield Deficit / Exhaustion",
    lockedBucket: "equities",
  },
  Preservation: {
    title: "Freeze Equities — Draw from Cash",
    lockedBucket: "cash",
  },
  "Normal Draw": { title: "Normal Draw", lockedBucket: null },
  "Comfortable Amortization": {
    title: "Comfortable Amortization",
    lockedBucket: null,
  },
  "No-Go Amortization": { title: "No-Go Amortization", lockedBucket: null },
} as const satisfies Record<string, { title: string; lockedBucket: "equities" | "cash" | null }>;

export type DirectiveState = keyof typeof DIRECTIVE_STATES;

export const ALL_DIRECTIVE_STATES = Object.keys(DIRECTIVE_STATES) as DirectiveState[];

export const LOCKING_STATES = ALL_DIRECTIVE_STATES.filter((s) => DIRECTIVE_STATES[s].lockedBucket !== null);

export const NON_LOCKING_STATES = ALL_DIRECTIVE_STATES.filter((s) => DIRECTIVE_STATES[s].lockedBucket === null);

export function isLockingState(guardrailText: string): boolean {
  const s = DIRECTIVE_STATES[guardrailText as DirectiveState];
  return !!s && s.lockedBucket !== null;
}

// Which bucket a locking narrative state funds withdrawals from. Non-locking
// states return null and defer to the caller's Defensive-Draw Mode.
export function lockingBucketFor(guardrailText: string): "equities" | "cash" | null {
  return DIRECTIVE_STATES[guardrailText as DirectiveState]?.lockedBucket ?? null;
}

// Module-level currency symbol. Updated by SovereignGlidepath via setCurrencySymbol().
// Cosmetic only — no FX conversion is ever performed.
let CURRENCY_SYMBOL = "£";
export function setCurrencySymbol(s: string): void {
  if (s === "£" || s === "€" || s === "$") CURRENCY_SYMBOL = s;
}
export function getCurrencySymbol(): string {
  return CURRENCY_SYMBOL;
}

export function formatGBP(n: number): string {
  return (
    CURRENCY_SYMBOL +
    Number(n || 0).toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
// Build 131 — whole-pounds variant for chart tooltips and axis labels in the
// Risk Simulator and Accumulation Simulator. Those show large numbers in a
// small fixed-width space (a hover card, an axis gridline label) where two
// decimal places just adds visual noise and, in the tooltip's case, was
// overflowing its box. Ledger rows, forms, and everywhere else keep using
// formatGBP's full pence precision — this is deliberately narrow in scope.
export function formatGBPWhole(n: number): string {
  return CURRENCY_SYMBOL + Number(n || 0).toLocaleString("en-GB", { maximumFractionDigits: 0 });
}
// Alias for forward-compat / readability at call-sites that want the intent
// to read as "format the active currency".
export const formatCurrency = formatGBP;

export function cleanNum(v: string | number | null | undefined): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  return parseFloat(String(v).replace(/[£€$,\s]/g, "")) || 0;
}

export function calculate(inp: CalcInputs, prevEquities: number | null): CalcOutputs {
  const {
    currentAge,
    cappingAge,
    rawEquities,
    mmFund,
    ath,
    targetYearly: grossTargetYearly,
    stressPct,
    growthRatePct,
    desiredRunwayMonths,
  } = inp;

  // Build 092 — pension netting. Once the pension is in payment the pot only
  // has to fund the REMAINDER of the lifestyle target, so every downstream
  // figure (WR ratios, guardrail, shield target, runway, amortization) is
  // computed against the NET draw. Before the start age this is identical to
  // the gross target, so pre-pension behaviour is unchanged.
  const pensionIncome = pensionIncomeFor(inp);
  const pensionActive = pensionIncome > 0;
  const targetYearly = Math.max(0, grossTargetYearly - pensionIncome);
  const netTargetYearly = targetYearly;

  const realG = (isNaN(growthRatePct) ? 2.5 : growthRatePct) / 100;
  const stressedEquities = rawEquities * (1 - stressPct / 100);
  const total = stressedEquities + mmFund;

  // Blended real return across the two buckets — makes the Fun Bucket / Actuarial
  // Amortization Matrix respond to cash drag the same way the Risk Simulator does.
  const cashRealG = ((typeof inp.cashRealPct === "number" ? inp.cashRealPct : 1) || 0) / 100;
  const blendedRealG = total > 0 ? (stressedEquities * realG + mmFund * cashRealG) / total : realG;

  const drawdownPct = drawdownPctOffAth(total, ath);
  const targetWR = ath > 0 ? (targetYearly / ath) * 100 : 0;
  // Build 113 — EXHAUSTION GUARD. A total of zero or less means the plan can
  // fund nothing at all. Previously currentWR silently fell back to 0 here,
  // which trivially satisfied the Guyton-Klinger Prosperity trigger
  // (0 <= baselineWR * 0.8) and reported "Prosperity Bonus (+10%)" on an empty
  // or negative portfolio, contradicting the drawdown-based guardrail state
  // and the Pane 3 banner. An exhausted plan is now routed to an explicit
  // catastrophic state and the WR is reported as infinite (undefined-but-
  // catastrophic), never as a benign zero.
  const portfolioExhausted = total <= 0 && targetYearly > 0;
  const currentWR = total > 0 ? (targetYearly / total) * 100 : portfolioExhausted ? Infinity : 0;
  // Build 091 — independent Prosperity reference: the withdrawal rate implied
  // by the portfolio at plan inception. Falls back to the ATH-anchored rate
  // when no baseline is available (fresh plan, no ledger history).
  const baselineTotal = inp.baselineTotal && inp.baselineTotal > 0 ? inp.baselineTotal : 0;
  const baselineWR = baselineTotal > 0 ? (targetYearly / baselineTotal) * 100 : targetWR;

  const phase = phaseFor(currentAge);

  const gk = portfolioExhausted
    ? ({ factor: 1.0, label: "Normal" } as const)
    : gkGuardrail(currentWR, targetWR, baselineWR, phase);
  let guardrailFactor = gk.factor;
  let guardrailStatus = portfolioExhausted
    ? "Portfolio Exhausted"
    : gk.label === "Preservation"
      ? "Reduction Applied (-10%)"
      : gk.label === "Prosperity"
        ? "Prosperity Bonus (+10%)"
        : "Normal";
  let guardrailColor = portfolioExhausted
    ? COLORS.red
    : gk.label === "Preservation"
      ? COLORS.amber
      : gk.label === "Prosperity"
        ? COLORS.purple
        : COLORS.green;

  const modifiedTargetMonths =
    phase === "Go-Slow"
      ? Math.min(24, desiredRunwayMonths)
      : phase === "No-Go"
        ? Math.min(12, desiredRunwayMonths)
        : desiredRunwayMonths;

  const targetCashAmount = (targetYearly / 12) * modifiedTargetMonths;
  const quarterlyRequest = targetYearly / 4;
  const guardrailAdjustedQuarterly = quarterlyRequest * guardrailFactor;
  const runwayMonths = targetYearly > 0 ? (mmFund / targetYearly) * 12 : 0;
  const runwayColor =
    runwayMonths >= modifiedTargetMonths
      ? COLORS.green
      : runwayMonths >= modifiedTargetMonths / 2
        ? COLORS.amber
        : COLORS.red;

  const remainingYears = Math.max(0, cappingAge - currentAge);
  let baselineNeed = 0;
  if (remainingYears > 0) {
    // Build 098 — withdraw-then-grow: withdrawals are taken at the START of
    // each year, so this is an annuity-DUE present value, i.e. the ordinary
    // annuity factor scaled by (1 + g).
    baselineNeed =
      blendedRealG > 0
        ? targetYearly * ((1 - Math.pow(1 + blendedRealG, -remainingYears)) / blendedRealG) * (1 + blendedRealG)
        : targetYearly * remainingYears;
  }

  const legacyTarget = Math.max(0, inp.legacyTarget || 0);
  const surplus = total - baselineNeed - legacyTarget;
  const comfortYears = targetYearly > 0 ? surplus / targetYearly : 0;

  let trajectory: Trajectory = "stable";
  let trajectoryLabel = "No records";
  let trajectoryColor = COLORS.muted;
  if (prevEquities != null && prevEquities > 0) {
    if (stressedEquities > prevEquities * 1.001) {
      trajectory = "ascending";
      trajectoryLabel = "Ascending Market Vector ▲";
      trajectoryColor = COLORS.green;
    } else if (stressedEquities < prevEquities * 0.999) {
      trajectory = "descending";
      trajectoryLabel = "Descending Market Vector ▼";
      trajectoryColor = COLORS.red;
    } else {
      trajectoryLabel = "Stable Baseline";
      trajectoryColor = COLORS.muted;
    }
  }

  // Comfort bypass — if surplus beyond lifetime needs + legacy is >= 3 years,
  // the ATH is stale and the Guyton-Klinger guardrails would mis-fire.
  // Neutralise them so the guardrail status readout matches the directive.
  // Build 091 — the comfort bypass exists to stop a STALE ATH forcing a
  // counter-productive CUT on a plan that is demonstrably in surplus. It must
  // not swallow the Prosperity bonus, which is the correct signal in exactly
  // that situation. Only reductions are neutralised.
  const _comfortBypass = comfortYears >= 3 && phase !== "No-Go";
  if (_comfortBypass && guardrailFactor < 1.0) {
    guardrailFactor = 1.0;
    guardrailStatus = "Comfortable Amortization";
    guardrailColor = COLORS.green;
  }

  return {
    phase,
    stressedEquities,
    total,
    drawdownPct,
    targetWR,
    currentWR,
    guardrailFactor,
    guardrailStatus,
    guardrailColor,
    modifiedTargetMonths,
    targetCashAmount,
    quarterlyRequest,
    guardrailAdjustedQuarterly,
    runwayMonths,
    runwayColor,
    surplus,
    legacyTarget,
    comfortYears,
    trajectory,
    trajectoryLabel,
    trajectoryColor,
    remainingYears,
    baselineNeed,
    grossTargetYearly,
    pensionIncome,
    netTargetYearly,
    pensionActive,
    portfolioExhausted,
  };
}

export interface Directive {
  html: string;
  guardrailText: string;
  guardrailColor: string;
  actuarialHtml: string;
}

export function generateDirectives(o: CalcOutputs, inp: CalcInputs, bucketOverride?: "equities" | "cash"): Directive {
  // Build 081 — for non-locking states (Normal Draw, Comfortable
  // Amortization, No-Go Amortization) the Pane 3 banner text must match the
  // Defensive-Draw Mode's bucket recommendation. Locking states (Peak Refill,
  // Recovery Wave, Refilling Shield, Reverse-Shielding, Freeze Equities,
  // Shield Deficit) ignore the override — their bucket is dictated by the
  // narrative itself.
  const useCash = bucketOverride === "cash";
  const srcLabel = useCash ? "the Cash Pot" : "Global Equities";
  const srcVerb = useCash ? "Withdraw" : "Sell";
  const {
    phase,
    drawdownPct: draw,
    runwayMonths,
    modifiedTargetMonths,
    targetCashAmount,
    quarterlyRequest: tQ,
    guardrailAdjustedQuarterly: gAdjQ,
    guardrailFactor: gF,
    trajectory: traj,
    surplus,
    legacyTarget,
    comfortYears,
    stressedEquities: eq,
  } = o;
  const mm = inp.mmFund;
  const capA = inp.cappingAge;
  const inflationIndex = inp.inflationIndex;

  // Build 125c — REDESIGN per Mark's feedback: the directive was showing two
  // numbers for what is really one instruction ("Sell £5,000... / Withdraw
  // £5,750.66") which reads as two separate actions rather than one. Every
  // REAL-terms £ figure that appears as something the user is told to
  // actually move (sell/withdraw/sweep/deploy) now passes through this one
  // helper before reaching the sentence, so there is exactly ONE actionable
  // number per instruction — the real pounds to move today. The real-terms
  // plan figure becomes a small reference footnote (see wrap()), never a
  // second headline. `mm` (the live actual cash balance) never passes
  // through this — it's already an actual, current, nominal figure entered
  // directly by the user, not a real-terms one, so converting it again would
  // double-count. Scope note: this only changes DISPLAY figures within an
  // already-selected branch (def/excess/shortfall are computed AFTER the
  // branch fires). It deliberately does NOT touch which branch fires in the
  // first place (e.g. the `mm >= gAdjQ` Preservation threshold below still
  // compares actual cash against a real-terms figure, exactly as it always
  // has) — that's a pre-existing characteristic of the whole guardrail
  // engine (targetYearly-derived figures are real throughout; entered
  // balances are always actual/nominal), not something introduced here, and
  // changing it is a materially bigger, separate decision deserving its own
  // dedicated review — not something to bundle into a display fix.
  const hasNominalDrift = !!inflationIndex && Math.abs(inflationIndex - 1) > 0.0005;
  const nom = (v: number) => (hasNominalDrift ? nominalFromReal(v, inflationIndex!) : v);

  // Build 126 — resolve the ACTUAL source bucket for branches that pick one
  // purely from the Defensive-Draw Mode recommendation, without checking
  // whether that bucket actually holds enough (Comfortable Amortization,
  // Normal Draw, No-Go Amortization). By contrast Preservation/Shield
  // Deficit/Reverse-Shielding all have sufficiency baked into their own
  // trigger conditions, so they don't need this. Checked against the REAL
  // current balances (inp.rawEquities / mm) — not `eq` (stressedEquities),
  // which is a hypothetical Scenario Stress Test preview and would wrongly
  // treat a stress-tested balance as the real one for a fallback decision.
  // If the recommended bucket is short, falls back to the other bucket and
  // returns a note explaining why, rather than instructing a withdrawal
  // that cannot actually be carried out — this is exactly the "withdraw
  // from an empty pot" gap Mark caught building the 1996 lifetime ledger.
  function resolveSource(requiredNominal: number, preferCash: boolean) {
    const cashOk = mm + 0.005 >= requiredNominal;
    const eqOk = inp.rawEquities + 0.005 >= requiredNominal;
    let actualUseCash = preferCash;
    let fellBack = false;
    if (preferCash && !cashOk && eqOk) {
      actualUseCash = false;
      fellBack = true;
    } else if (!preferCash && !eqOk && cashOk) {
      actualUseCash = true;
      fellBack = true;
    }
    const label = actualUseCash ? "the Cash Pot" : "Global Equities";
    const verb = actualUseCash ? "Withdraw" : "Sell";
    const note = fellBack
      ? ` <strong>Note:</strong> ${preferCash ? "the Cash Pot" : "Global Equities"} does not currently hold enough to cover this — funding from ${label} instead.`
      : "";
    return { useCash: actualUseCash, srcLabel: label, srcVerb: verb, fallbackNote: note };
  }

  const sC = mm - targetCashAmount;
  const pT = preservationThresholdPct(phase);
  const sT = severeThresholdPct(phase);

  // Comfort bypass: if the plan has 3+ years of true surplus beyond the
  // baseline lifetime need AND the legacy target, drawdown-vs-ATH signals
  // are stale and the Preservation/Freeze/G-K reduction branches are
  // counter-productive — the ATH is old, the surplus is real. Skip them so
  // the user simply draws normally from Equities.
  const comfortBypass = comfortYears >= 3 && phase !== "No-Go";

  // Amount wording: only say "adjusted" when Guyton-Klinger actually changed it.
  // Under comfort bypass we also force the amount back to the un-reduced quarterly.
  // Build 091 — comfort bypass suppresses cuts only; the Prosperity bonus stands.
  const isAdj = gF > 1.0 || (gF < 1.0 && !comfortBypass);
  const amtLabel = isAdj ? "adjusted quarterly draw" : "quarterly draw";
  const amt = isAdj ? gAdjQ : tQ;
  const amtNote = isAdj
    ? ` (Guyton-Klinger ${gF < 1 ? "reduction −10%" : "prosperity bonus +10%"} applied to the ${formatGBP(nom(tQ))} baseline).`
    : "";

  let gAB = "";
  if (!comfortBypass && gF < 1.0)
    gAB = `<div style="padding:0.75rem; background:rgba(245,158,11,0.1); border:1px solid var(--accent-amber); border-radius:0.4rem; margin:0.5rem 0 1rem; font-size:0.9rem;"><strong style="color:var(--accent-amber);">Guyton-Klinger Preservation:</strong> Realised withdrawal rate is more than 20% above target. Cut this quarter's payout by 10% to <strong>${formatGBP(nom(gAdjQ))}</strong>.</div>`;
  else if (gF > 1.0)
    gAB = `<div style="padding:0.75rem; background:rgba(168,85,247,0.1); border:1px solid var(--accent-purple); border-radius:0.4rem; margin:0.5rem 0 1rem; font-size:0.9rem;"><strong style="color:var(--accent-purple);">Guyton-Klinger Prosperity:</strong> Realised withdrawal rate is more than 20% below target. You may raise this quarter's payout by 10% to <strong>${formatGBP(nom(gAdjQ))}</strong>.</div>`;

  let cGT: DirectiveState = "Normal Draw";
  let cGC = COLORS.green;
  let h = "";

  // Build 088 — the banner title is derived from DIRECTIVE_STATES so the
  // headline and the canonical state name can never disagree. Where the
  // headline text differs from the state name, the state name is shown
  // alongside it, plus any active Guyton-Klinger overlay.
  const overlayNote =
    !comfortBypass && gF < 1.0 ? "G-K Preservation overlay (−10%)" : gF > 1.0 ? "G-K Prosperity overlay (+10%)" : "";

  const wrap = (
    variant: "green" | "warning" | "danger" | "purple" | "blue",
    state: DirectiveState,
    desc: string,
    action: string,
    titleOverride?: string,
    /** Build 125c — the REAL-terms plan figure this branch's (now-nominal)
     * headline was derived from. Shown only as a small reference footnote —
     * never as a second instruction — and only when there's realised
     * inflation drift worth disclosing. */
    realBaseline?: number,
  ) => {
    const cls = variant === "blue" ? "directive-box" : `directive-box ${variant}`;
    const style = variant === "blue" ? ` style="border-left-color:var(--accent-blue);"` : "";
    const title = titleOverride ?? DIRECTIVE_STATES[state].title;
    const bits: string[] = [];
    if (title !== state) bits.push(`State: ${state}`);
    if (overlayNote) bits.push(overlayNote);
    const sub = bits.length
      ? `<span style="display:block; font-size:0.72rem; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; color:var(--text-muted); margin-top:0.2rem;">${bits.join(" · ")}</span>`
      : "";
    let footnote = "";
    if (typeof realBaseline === "number" && realBaseline > 0 && hasNominalDrift) {
      const yearLabel = inp.inflationBaseYear ? `Year-1 (${inp.inflationBaseYear})` : "plan-start";
      footnote = `<div style="font-size:0.72rem; color:var(--text-muted); margin-top:0.6rem;">Your ${yearLabel} plan figure is ${formatGBP(realBaseline)}/quarter — this stays fixed and never needs manual updating; the pounds above already account for realised inflation. See Pane 2's Inflation Tracking for the detail.</div>`;
    }
    return `<div class="${cls}"${style}><div class="directive-title">${title}${sub}</div><span class="directive-desc">${desc}</span>${gAB}<span class="directive-action">${action}</span>${footnote}</div>`;
  };

  // Build 113 — the exhaustion branch now also fires whenever NET total capital
  // is <= 0 (e.g. a bucket driven negative by an oversized special event), so
  // the banner, Pane 2's Withdrawal Status and the Guardrail State all describe
  // the same catastrophic reality instead of disagreeing.
  if ((eq <= 0 && mm <= 0) || o.portfolioExhausted) {
    cGT = "Exhaustion";
    cGC = COLORS.red;
    h = wrap(
      "danger",
      "Exhaustion",
      "Total capital is exhausted. The plan cannot fund this quarter's withdrawal.",
      `Required <strong>${formatGBP(nom(amt))}</strong> — <strong>unavailable</strong>. Stop discretionary spending and revisit the plan parameters.`,
      undefined,
      amt,
    );
  } else if (phase === "No-Go" && surplus >= 0) {
    cGT = "No-Go Amortization";
    cGC = COLORS.purple;
    const src = resolveSource(nom(tQ), useCash);
    h = wrap(
      "purple",
      "No-Go Amortization",
      `You are past ~85 and the plan is in run-down mode. Guardrails are switched off; simply draw the target amount from ${src.srcLabel} and let the plan amortize.`,
      `${src.srcVerb} <strong>${formatGBP(nom(tQ))}</strong> from ${src.srcLabel} this quarter.${src.fallbackNote}`,
      undefined,
      tQ,
    );
  } else if (draw < pT && runwayMonths < modifiedTargetMonths) {
    const defNominal = Math.max(0, nom(targetCashAmount) - mm);
    if (draw < 2.0) {
      cGT = "Peak Refill";
      cGC = COLORS.blue;
      h = wrap(
        "blue",
        "Peak Refill",
        `Portfolio is at or near an all-time high (drawdown ${draw.toFixed(1)}%) and the Cash Shield is below its ${modifiedTargetMonths}-month target. This is the ideal moment to sell equities and top the shield right up.`,
        `Sell <strong>${formatGBP(nom(amt))}</strong> from Global Equities for this quarter's ${amtLabel}${amtNote}${amtNote ? "" : "."}<br/>Then sweep an additional <strong>${formatGBP(defNominal)}</strong> from Equities into the Cash Pot to fully refill the shield.`,
        undefined,
        amt,
      );
    } else if (traj === "ascending") {
      cGT = "Recovery Wave Refill";
      cGC = COLORS.blue;
      h = wrap(
        "blue",
        "Recovery Wave Refill",
        `Equities are rising after a drawdown (${draw.toFixed(1)}% off ATH, momentum ascending). Use the recovery to rebuild the Cash Shield while prices are climbing.`,
        `Sell <strong>${formatGBP(nom(amt))}</strong> from Global Equities for this quarter's ${amtLabel}${amtNote}${amtNote ? "" : "."}<br/>Sell an additional <strong>${formatGBP(Math.min(defNominal, nom(tQ)))}</strong> from Equities to refill the shield.`,
        undefined,
        amt,
      );
    } else {
      cGT = "Refilling Shield";
      cGC = COLORS.blue;
      h = wrap(
        "blue",
        "Refilling Shield",
        `Markets are broadly calm (drawdown ${draw.toFixed(1)}%) but the Cash Shield is below its ${modifiedTargetMonths}-month target. Take this quarter's spending from equities and plan to top up the shield on the next up-move.`,
        `Sell <strong>${formatGBP(nom(amt))}</strong> from Global Equities for this quarter's ${amtLabel}${amtNote}${amtNote ? "" : "."}`,
        undefined,
        amt,
      );
    }
  } else if (draw >= sT && runwayMonths > modifiedTargetMonths + 12) {
    cGT = "Reverse-Shielding";
    cGC = COLORS.blue;
    const excessNominal = Math.max(0, mm - nom(targetCashAmount));
    h = wrap(
      "blue",
      "Reverse-Shielding",
      `Markets are down (${draw.toFixed(1)}% off ATH) but your Cash Shield is well above target. Use surplus cash to buy equities at depressed prices while funding spending from cash.`,
      `Fund this quarter's <strong>${formatGBP(nom(amt))}</strong> ${amtLabel} from the Cash Pot${amtNote}${amtNote ? "" : "."}<br/>Deploy up to <strong>${formatGBP(excessNominal)}</strong> of surplus cash into Global Equities.`,
      undefined,
      amt,
    );
  } else if (comfortBypass && draw >= pT) {
    cGT = "Comfortable Amortization";
    cGC = COLORS.green;
    const src = resolveSource(nom(amt), useCash);
    const legacyNote =
      legacyTarget > 0
        ? ` You are still on track to leave <strong>${formatGBP(legacyTarget)}</strong> (real terms) as a legacy.`
        : "";
    h = wrap(
      "green",
      "Comfortable Amortization",
      `Portfolio is ${draw.toFixed(1)}% off a past all-time high, but you still hold roughly <strong>${comfortYears.toFixed(1)} years</strong> of surplus beyond lifetime needs${legacyTarget > 0 ? " and legacy target" : ""}. The distant ATH is stale — freezing equities here would just hoard capital you cannot spend.${legacyNote}`,
      `${src.srcVerb} <strong>${formatGBP(nom(amt))}</strong> from ${src.srcLabel} for this quarter's ${amtLabel}${amtNote}${amtNote ? "" : "."}${src.fallbackNote}`,
      `Comfortable Amortization — Draw Normally${src.useCash ? " from Cash" : ""}`,
      amt,
    );
  } else if (draw < pT) {
    cGT = "Normal Draw";
    cGC = COLORS.green;
    const src = resolveSource(nom(amt), useCash);
    h = wrap(
      "green",
      "Normal Draw",
      `Markets are calm (drawdown ${draw.toFixed(1)}% off ATH) and the Cash Shield is at or above its ${modifiedTargetMonths}-month target. Fund this quarter's spending as normal from ${src.srcLabel}.`,
      `${src.srcVerb} <strong>${formatGBP(nom(amt))}</strong> from ${src.srcLabel} for this quarter's ${amtLabel}${amtNote}${amtNote ? "" : "."}${src.fallbackNote}`,
      `Normal Draw from ${src.useCash ? "Cash" : "Equities"}`,
      amt,
    );
  } else if (mm >= gAdjQ) {
    cGT = "Preservation";
    cGC = COLORS.amber;
    h = wrap(
      "warning",
      "Preservation",
      `Portfolio is in meaningful drawdown (${draw.toFixed(1)}% off ATH). Stop selling equities and let them recover — fund spending entirely from the Cash Shield this quarter.`,
      `Withdraw <strong>${formatGBP(nom(amt))}</strong> from the Cash Pot for this quarter's ${amtLabel}${amtNote}${amtNote ? "" : "."}<br/>Do not sell any Global Equities.`,
      undefined,
      amt,
    );
  } else {
    cGT = "Shield Deficit";
    cGC = COLORS.red;
    const shortfallNominal = Math.max(0, nom(amt) - mm);
    h = wrap(
      "danger",
      "Shield Deficit",
      `Portfolio is down (${draw.toFixed(1)}% off ATH) and the Cash Shield is exhausted. You are forced to sell equities at a loss to complete this quarter's spending.`,
      `Empty the Cash Pot (<strong>${formatGBP(mm)}</strong>) and sell the remaining <strong>${formatGBP(shortfallNominal)}</strong> from Global Equities${amtNote}${amtNote ? "" : "."}<br/>Prioritise refilling the shield on the next up-move.`,
      undefined,
      amt,
    );
  }

  const legacyBit =
    legacyTarget > 0 ? ` (after reserving <strong>${formatGBP(legacyTarget)}</strong> legacy target)` : "";
  const actuarialHtml = `<span style="color:${cGC}; font-weight:bold;">${cGT}:</span> ${surplus >= 0 ? "Surplus " + formatGBP(surplus) : "Deficit " + formatGBP(Math.abs(surplus))} beyond age ${capA} needs${legacyBit}. <span style="color:var(--text-muted); font-weight:400;">(≈ ${comfortYears.toFixed(1)} years of draw.)</span>`;

  if (sC > 0.01 && runwayMonths > modifiedTargetMonths)
    h += `<div style="margin-top:1rem; font-size:0.85rem; color:var(--accent-blue);"><strong>Cash Drag Note:</strong> Cash Pot holds <strong>${formatGBP(sC)}</strong> above the ${modifiedTargetMonths}-month target — consider reallocating that surplus into Global Equities.</div>`;

  // Build 092 — make pension netting explicit in the directive itself, so the
  // guardrail status can never look inexplicable against a gross-only figure.
  if (o.pensionActive)
    h += `<div style="margin-top:1rem; font-size:0.85rem; color:var(--accent-blue);"><strong>Pension Applied:</strong> Your pension of <strong>${formatGBP(o.pensionIncome)}</strong>/yr is already in payment, so only <strong>${formatGBP(o.netTargetYearly)}</strong>/yr of your <strong>${formatGBP(o.grossTargetYearly)}</strong>/yr lifestyle target has to come from the pot. Every figure and guardrail above is calculated on that net amount.</div>`;

  return { html: h, guardrailText: cGT, guardrailColor: cGC, actuarialHtml };
}

// Legacy XOR obfuscation for backup files (v1.8 format). READ-ONLY as of
// Build 117: kept so older .shd backups still restore. New backups are written
// with real AES-256-GCM encryption — see secureStore.encryptBackup().
export function xorEncode(txt: string, p: string): string {
  if (!p) throw new Error("Password required");
  const tB = new TextEncoder().encode(txt);
  const pB = new TextEncoder().encode(p);
  const out = new Uint8Array(tB.length);
  for (let i = 0; i < tB.length; i++) out[i] = tB[i] ^ pB[i % pB.length];
  let binary = "";
  for (let i = 0; i < out.length; i++) binary += String.fromCharCode(out[i]);
  return btoa(binary);
}

export function xorDecode(b64: string, p: string): string {
  if (!p) throw new Error("Password required");
  const s = atob(b64);
  const eb = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) eb[i] = s.charCodeAt(i);
  const pB = new TextEncoder().encode(p);
  const out = new Uint8Array(eb.length);
  for (let i = 0; i < eb.length; i++) out[i] = eb[i] ^ pB[i % pB.length];
  return new TextDecoder().decode(out);
}
