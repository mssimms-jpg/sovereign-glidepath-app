// Sovereign Glidepath — shared drawdown step.
//
// Single source of truth for the withdrawal-source decision, the
// defensive-draw threshold check, and the Guyton-Klinger ±10%
// preservation/prosperity state used across:
//   • Risk Simulator — Yearly-tick engine (called 1× per year)
//   • Risk Simulator — Quarterly-tick engine (called 4× per year)
//   • Audit Mode — deterministic / historical sample path
//
// All three call this function; nothing else may re-implement these rules.

// Build 089 — phase gating for Guyton-Klinger. `phaseFor` is imported from
// engine.ts (the same helper calculate() uses) so "what counts as No-Go"
// exists in exactly one place.
//
// Build 090 — LOOK-AHEAD FIX. The defensive-draw decision inside applyPeriod()
// no longer looks at this period's own realized equity return. It now uses the
// SAME trailing drawdown-off-ATH signal the live dashboard uses, computed from
// balances as they stood BEFORE the period's return is applied, via
// `isDefensiveByTrailingDrawdown()` in engine.ts.
import { phaseFor, isDefensiveByTrailingDrawdown, gkGuardrail } from "./engine";

export type ThresholdMode = "strict" | "standard" | "aggressive";
export type GkLabel = "Normal" | "Preservation (-10%)" | "Prosperity (+10%)";

export interface PeriodState {
  E: number; // equities balance (real terms)
  C: number; // cash balance     (real terms)
  ATH: number; // per-path all-time high of E+C
}

export interface PeriodInputs {
  /** Real equity return applied this period (yearly OR quarterly). */
  rEqReal: number;
  /** Real cash return applied this period (yearly OR quarterly). */
  rCashReal: number;
  /** Gross spend for this period, BEFORE Guyton-Klinger. */
  spendGross: number;
  /**
   * Nominal annual withdrawal target used to compute the WR ratios for
   * Guyton-Klinger (currentWR vs athWR). Same value on every call within
   * a run; the ATH tracks the per-path peak.
   */
  withdrawAnchor: number;
  /** Active defensive-draw threshold mode. */
  threshold: ThresholdMode;
  /**
   * Deterministic real return hurdle used by Standard (½·detRReal) and
   * Aggressive (detRReal) mode predicates.
   */
  detRReal: number;
  /**
   * Refill ceiling for the cash bucket on good (non-defensive) periods.
   * Typically the starting Cash Pot size.
   */
  targetCashBuffer: number;
  /**
   * Fallback WR to use when ATH is zero (start of run only). Usually
   * withdrawAnchor / startingTotal.
   */
  targetWR_gk?: number;
  /**
   * Periods-per-year for this call. 1 = yearly tick, 4 = quarterly tick.
   * Used to prorate the ANNUAL defensive-draw thresholds down to a
   * per-period hurdle that is directly comparable to `rEqReal`.
   * Defaults to 1 for backward compatibility.
   */
  periodsPerYear?: number;
  /**
   * Age at the START of this period. When supplied and phaseFor(age) is
   * "No-Go", the Guyton-Klinger ±10% guardrail is switched off — mirroring
   * the `phase !== "No-Go"` gate in engine.ts's calculate(). Omitting age
   * preserves the previous always-on behaviour.
   */
  age?: number;
}

export interface PeriodResult extends PeriodState {
  defensive: boolean;
  gk: number; // 0.9 | 1.0 | 1.1
  gkLabel: GkLabel;
  spend: number; // spendGross * gk (what was actually drawn)
}

/** Round to 4 decimal places to prevent floating-point flips at threshold. */
function r4(x: number): number {
  return Math.round(x * 1e4) / 1e4;
}

/** Convert an annual hurdle into a per-period hurdle (compound). */
function perPeriod(annual: number, periodsPerYear: number): number {
  if (periodsPerYear <= 1) return annual;
  // (1 + annual)^(1/N) - 1, guarding against negatives near -1.
  const base = Math.max(1e-9, 1 + annual);
  return Math.pow(base, 1 / periodsPerYear) - 1;
}

/**
 * LEGACY same-period-return predicate (Build 076 semantics).
 *
 * Build 090: applyPeriod() NO LONGER uses this — comparing against the very
 * period's own realized return is look-ahead bias. It is retained solely for
 * `defensiveRec.ts`, where the return being tested is a genuinely TRAILING,
 * already-observed return between two committed ledger rows.
 *
 *   Strict     — cash when real equity return < −5%  (annual)
 *   Standard   — cash when real equity return < ½ × detRReal
 *   Aggressive — cash when real equity return <  detRReal
 *
 * Both sides of the comparison are rounded to 4 dp so a flat parametric
 * return sitting exactly on a hurdle can't flip due to fp noise.
 */
export function isDefensive(
  rEqReal: number,
  threshold: ThresholdMode,
  detRReal: number,
  periodsPerYear: number = 1,
): boolean {
  let hurdleAnnual: number;
  if (threshold === "strict") hurdleAnnual = -0.05;
  else if (threshold === "standard") hurdleAnnual = detRReal * 0.5;
  else hurdleAnnual = detRReal;
  const hurdle = perPeriod(hurdleAnnual, periodsPerYear);
  return r4(rEqReal) < r4(hurdle);
}

/**
 * Advance one period. Yearly-tick calls once with annual returns and the
 * annual withdrawal; Quarterly-tick calls 4× with quarterly returns and
 * spendGross = annual/4; Audit Mode calls the same function again with a
 * fixed known return sequence.
 */
export function applyPeriod(s: PeriodState, inp: PeriodInputs): PeriodResult {
  const {
    rEqReal,
    rCashReal,
    spendGross,
    withdrawAnchor,
    threshold,
    detRReal,
    targetCashBuffer,
    targetWR_gk = 0,
    periodsPerYear = 1,
    age,
  } = inp;

  // Guyton-Klinger — Build 091. Preservation compares the current WR to the
  // per-path ATH WR (unchanged). Prosperity compares it to the plan's BASELINE
  // WR (withdrawAnchor / starting total, supplied as targetWR_gk), which is
  // independent of the running peak and therefore genuinely reachable when the
  // portfolio grows beyond its starting value. Gated OFF in No-Go phase.
  const phase = phaseFor(age ?? 65);
  const tot = s.E + s.C;
  const currentWR = tot > 0 ? withdrawAnchor / tot : 0;
  const athWR = s.ATH > 0 ? withdrawAnchor / s.ATH : targetWR_gk;
  const baselineWR = targetWR_gk > 0 ? targetWR_gk : athWR;
  const g = gkGuardrail(currentWR, athWR, baselineWR, phase);
  const gk = g.factor;
  const gkLabel: GkLabel =
    g.label === "Preservation" ? "Preservation (-10%)" : g.label === "Prosperity" ? "Prosperity (+10%)" : "Normal";

  const spend = spendGross * gk;

  // Build 098 — WITHDRAW-THEN-GROW. The withdrawal is taken from the balance
  // as it is actually known at the moment of the decision; only the REMAINING
  // balance is exposed to this period's return.
  //   End = (Start - Withdrawal) x (1 + r)
  let Eq = s.E;
  let Cq = s.C;

  // Build 090 — sourcing decision uses TRAILING state only: the portfolio's
  // drawdown off its prior all-time high, measured BEFORE this period's return
  // is applied. Same signal and same phase-aware thresholds as the live
  // dashboard (engine.ts). With no prior history (ATH == starting total) the
  // drawdown is 0% and the period can never be defensive.
  const defensive = isDefensiveByTrailingDrawdown(tot, s.ATH, phase, threshold);

  if (defensive) {
    // Cash first, spill to equities if cash can't cover.
    if (Cq >= spend) {
      Cq -= spend;
    } else {
      const shortfall = spend - Math.max(0, Cq);
      Cq = 0;
      Eq -= shortfall;
    }
  } else {
    // Equities first, then opportunistic refill toward targetCashBuffer.
    if (Eq >= spend) {
      Eq -= spend;
      if (Eq > 0 && Cq < targetCashBuffer) {
        const refill = Math.min(Eq, targetCashBuffer - Cq);
        Eq -= refill;
        Cq += refill;
      }
    } else {
      // Equity shortfall — spill to cash.
      const shortfall = spend - Math.max(0, Eq);
      Eq = 0;
      Cq -= shortfall;
    }
  }

  // Now grow what remains.
  Eq = Eq * (1 + rEqReal);
  Cq = Cq * (1 + rCashReal);

  const E = Math.max(0, Eq);
  const C = Math.max(0, Cq);

  const ATH = Math.max(s.ATH, E + C);
  return { E, C, ATH, defensive, gk, gkLabel, spend };
}

// Build 136 — Extraordinary cash flow (planned lump-sum inflow OR outflow,
// e.g. a boat bought in year 2 and sold in year 7). Hoisted out of
// MonteCarloPanel.tsx to module scope so the Risk Simulator's stochastic
// paths, its deterministic reference path, AND the single-path detailed
// export (Build 137) all apply the exact same rule — same reasoning as
// applyPeriod() above: one function, three callers, never re-implemented.
export type ActiveFlowKind = "inflow" | "outflow";
export type ActiveFlowBucket = "equities" | "cash";
export interface ActiveFlow {
  kind: ActiveFlowKind;
  bucket: ActiveFlowBucket;
  amount: number;
  /** Years-from-now this flow lands, matched against the period's year index. */
  year: number;
  /** Optional user-entered note (e.g. "Boat purchase") — carried through to exports, not used in the maths. */
  label?: string;
}

/**
 * Inflow: adds to the chosen bucket and re-anchors the ATH — a windfall
 * genuinely raises the plan's high-water mark.
 * Outflow: draws from the chosen bucket first, spilling to the other bucket
 * if it can't cover the full amount (same cash-first/equities-first spill
 * pattern as an ordinary withdrawal above), floored at 0 — never left
 * negative. ATH is deliberately left untouched on an outflow, exactly like
 * an ordinary withdrawal: it's a planned spend, not a market loss.
 */
export function applyExtraordinaryFlow(E: number, C: number, ATH: number, f: ActiveFlow): PeriodState {
  let e = E;
  let c = C;
  if (f.kind === "inflow") {
    if (f.bucket === "cash") c += f.amount;
    else e += f.amount;
    return { E: e, C: c, ATH: Math.max(ATH, e + c) };
  }
  if (f.bucket === "cash") {
    if (c >= f.amount) c -= f.amount;
    else {
      const shortfall = f.amount - c;
      c = 0;
      e = Math.max(0, e - shortfall);
    }
  } else {
    if (e >= f.amount) e -= f.amount;
    else {
      const shortfall = f.amount - e;
      e = 0;
      c = Math.max(0, c - shortfall);
    }
  }
  return { E: e, C: c, ATH };
}

// Build 141 — Planned Withdrawal Reductions (e.g. a mortgage being paid off,
// or a general age-related spending slowdown). Generalises the same
// "independent list of dated events" shape as the Extraordinary Cash Flow
// list (Build 136) above, rather than a single step-down field — multiple
// unlinked reductions are supported (e.g. mortgage ends year 8, general
// slowdown at year 15).
//
// Unlike an Extraordinary Cash Flow (a one-off lump sum landing in a bucket),
// a reduction PERMANENTLY lowers the annual withdrawal target itself from its
// year onward, and reductions STACK: a later event reduces whatever the
// running target has already been reduced to, not the original figure. A
// "percentage" reduction is taken against that running (already-reduced)
// target at the moment it lands — the withdrawal rate the person is actually
// drawing at that point — not the plan's original starting figure.
//
// This changes the withdrawAnchor / spendGross figures fed into applyPeriod()
// itself, so Guyton-Klinger's WR ratios are computed on the ALREADY-REDUCED
// target — the guardrail never sees the pre-reduction number. Called ONCE per
// simulation configuration (not once per path) since the schedule is the same
// deterministic step function regardless of which market-return path is
// drawn; callers look up schedule[y] inside their per-path loops.
export type ReductionKind = "fixed" | "percentage";
export interface WithdrawalReduction {
  kind: ReductionKind;
  /** £ (fixed) or 0-100 (percentage of the running target at the time this event lands). */
  amount: number;
  /** Years-from-now this reduction takes permanent effect — matched the same way ActiveFlow.year is. */
  year: number;
  /** Optional user-entered note (e.g. "Mortgage paid off"), carried through to exports, not used in the maths. */
  label?: string;
}

/**
 * Returns the effective annual withdrawal target (today's real £) for every
 * year 0..yrs, given the base target and a list of reduction events. Events
 * are applied in year order (ties broken by input order, i.e. the order the
 * user listed them), each reducing the RUNNING total — fixed amounts
 * subtract directly, percentages take a % of the running total — floored at
 * zero. schedule[0] is always the unreduced base (no event can land at
 * "year 0" meaningfully before the plan starts); schedule[y] for y >= 1
 * reflects every event with event.year <= y.
 */
export function computeWithdrawalSchedule(
  baseWithdraw: number,
  reductions: WithdrawalReduction[],
  yrs: number,
): number[] {
  const sorted = reductions
    .map((r, i) => ({ ...r, _i: i }))
    .filter((r) => r.amount > 0 && r.year >= 1)
    .sort((a, b) => a.year - b.year || a._i - b._i);

  const schedule: number[] = new Array(Math.max(0, yrs) + 1).fill(baseWithdraw);
  let running = baseWithdraw;
  let idx = 0;
  for (let y = 0; y <= yrs; y++) {
    while (idx < sorted.length && sorted[idx].year <= y) {
      const ev = sorted[idx];
      running = Math.max(0, ev.kind === "fixed" ? running - ev.amount : running * (1 - ev.amount / 100));
      idx++;
    }
    schedule[y] = running;
  }
  return schedule;
}
