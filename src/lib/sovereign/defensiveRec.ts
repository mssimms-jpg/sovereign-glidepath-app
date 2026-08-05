// Sovereign Glidepath — Directive Bucket Recommendation (Build 076).
//
// Computes, for each defensive-draw mode (Strict / Standard / Aggressive),
// which bucket should fund THIS quarter's already-decided withdrawal amount.
// Reuses the SAME `isDefensive()` predicate the Risk Simulator's yearly-tick
// and Audit Mode use — no parallel threshold logic lives here.
//
// This function only recommends a SOURCE. It never touches the Guyton-Klinger
// withdrawal amount (that stays in engine.ts / calculate()).

import { isDefensive, type ThresholdMode } from "./drawdown";
import type { LedgerEntry } from "./engine";

export type Recommendation = "equities" | "cash" | "normal_default";

export interface ModeRec {
  bucket: Recommendation;
  defensive: boolean; // true = cash-first, false = equities-first (or normal_default)
}

export interface DefensiveRecResult {
  /** True when we could NOT compute a return comparison and defaulted all three modes to Equities. */
  isDefault: boolean;
  reason?:
    | "no_prior_normal"
    | "prior_no_date"
    | "non_positive_elapsed"
    | "zero_prior_eq"
    /** Build 093 — gap too short to annualise without the exponent exploding. */
    | "insufficient_elapsed";
  elapsedDays?: number;
  /** Long-gap flag — elapsedDays > 730 (about 2 years). */
  longGap?: boolean;
  /** Nominal period return (Eq_now / Eq_prev − 1). */
  periodReturnNominal?: number;
  /** Deflated, then annualised — the value compared against isDefensive(). */
  annualisedReal?: number;
  /** Inflation actually used (as a decimal, e.g. 0.025 for 2.5%). */
  inflationUsed?: number;
  strict: ModeRec;
  standard: ModeRec;
  aggressive: ModeRec;
  /** The Normal ledger row used as the "previous" comparison anchor. */
  priorRow?: LedgerEntry;
}

/** Discriminator: is this row a Normal (market-observation) row? */
function isNormalRow(e: LedgerEntry): boolean {
  if (e.isSpecialEvent) return false;
  if (e.entryKind === "special_withdrawal") return false;
  if (e.entryKind === "windfall") return false;
  if (e.isInflowEvent) return false;
  return true;
}

const DAY_MS = 86_400_000;

/**
 * Build 093 — defensive floor. Annualising via (1 + r)^(365.25/days) explodes
 * as `days` → 0 (a 1-day gap raises the period return to the power of 365).
 * Anything shorter than this is treated as "insufficient elapsed time".
 */
export const MIN_ELAPSED_DAYS_FOR_ANNUALISATION = 14;

/** Build 093 — hard clamp on the annualised figure (±1000% real). */
const ANNUALISED_CAP = 10;

/**
 * @param currentEquities  Live equities balance the user has just entered.
 * @param currentPeriodEndDate  ISO YYYY-MM-DD for the row about to be committed.
 *                              If empty/undefined we cannot anchor — default modes.
 * @param ledger  Existing ledger (any order); we scan for the most recent
 *                Normal row strictly BEFORE `currentPeriodEndDate` by date.
 * @param inflationPct  Inflation assumption (percent, e.g. 2.5), sourced from
 *                      Pane 1's own Inflation / CPI Assumption slider (NOT the
 *                      Risk Simulator's setting).
 * @param detRRealPct   The user's assumed REAL growth rate (percent, from the
 *                      Pane 1 slider). Feeds Standard (½·detRReal) and
 *                      Aggressive (detRReal) hurdles inside isDefensive().
 */
export function computeDefensiveRecommendation(
  currentEquities: number,
  currentPeriodEndDate: string | undefined,
  ledger: LedgerEntry[],
  inflationPct: number,
  detRRealPct: number,
): DefensiveRecResult {
  const detRReal = (detRRealPct || 0) / 100;
  const infl = Math.max(0, inflationPct || 0) / 100;

  const asDefault = (
    reason: DefensiveRecResult["reason"],
    extras: Partial<DefensiveRecResult> = {},
  ): DefensiveRecResult => ({
    isDefault: true,
    reason,
    inflationUsed: infl,
    strict: { bucket: "normal_default", defensive: false },
    standard: { bucket: "normal_default", defensive: false },
    aggressive: { bucket: "normal_default", defensive: false },
    ...extras,
  });

  if (!currentPeriodEndDate) return asDefault("prior_no_date");

  // Find most recent Normal row strictly BEFORE currentPeriodEndDate by date.
  const currentMs = Date.parse(currentPeriodEndDate + "T00:00:00Z");
  if (isNaN(currentMs)) return asDefault("prior_no_date");

  const candidates = ledger
    .filter(isNormalRow)
    .filter(
      (e) => typeof e.periodEndDate === "string" && e.periodEndDate.length > 0,
    )
    .map((e) => ({
      row: e,
      ms: Date.parse(e.periodEndDate + "T00:00:00Z"),
    }))
    .filter((r) => !isNaN(r.ms) && r.ms < currentMs)
    .sort((a, b) => b.ms - a.ms);

  const prior = candidates[0];
  if (!prior) return asDefault("no_prior_normal");

  const elapsedDays = (currentMs - prior.ms) / DAY_MS;
  if (elapsedDays <= 0)
    return asDefault("non_positive_elapsed", { elapsedDays, priorRow: prior.row });

  // Build 093 — defensive guard: too short a gap makes annualisation absurd.
  if (elapsedDays < MIN_ELAPSED_DAYS_FOR_ANNUALISATION)
    return asDefault("insufficient_elapsed", { elapsedDays, priorRow: prior.row });

  const priorEq = Number(prior.row.equities) || 0;
  if (priorEq <= 0)
    return asDefault("zero_prior_eq", {
      elapsedDays,
      priorRow: prior.row,
      longGap: elapsedDays > 730,
    });

  const periodReturnNominal = currentEquities / priorEq - 1;
  // Deflate to real over the actual elapsed span, then annualise via 365.25/days.
  const inflFactor = Math.pow(1 + infl, elapsedDays / 365.25);
  const realPeriodReturn = (1 + periodReturnNominal) / inflFactor - 1;
  const annualisedRaw =
    realPeriodReturn <= -1
      ? -1
      : Math.pow(1 + realPeriodReturn, 365.25 / elapsedDays) - 1;
  // Build 093 — clamp so no downstream display or comparison can see a
  // runaway value even if the inputs are extreme.
  const annualisedReal = !isFinite(annualisedRaw)
    ? ANNUALISED_CAP
    : Math.max(-1, Math.min(ANNUALISED_CAP, annualisedRaw));

  const mk = (m: ThresholdMode): ModeRec => {
    const defensive = isDefensive(annualisedReal, m, detRReal, 1);
    return { bucket: defensive ? "cash" : "equities", defensive };
  };

  return {
    isDefault: false,
    elapsedDays,
    longGap: elapsedDays > 730,
    periodReturnNominal,
    annualisedReal,
    inflationUsed: infl,
    strict: mk("strict"),
    standard: mk("standard"),
    aggressive: mk("aggressive"),
    priorRow: prior.row,
  };
}
