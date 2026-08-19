// Build 126 — Scenario Test Runner.
//
// A hidden QA tool that builds a COMPLETE, real ledger from a JSON scenario
// file — using the app's own calculate()/generateDirectives()/
// computeDefensiveRecommendation()/computeInflationTracking() functions,
// exactly as the live UI does. Nothing here re-implements the engine's
// decision logic; it drives the real functions the same way a person
// committing 100+ real quarterly entries would, just without the manual
// clicking. This is deliberately the tool this project used by hand to
// build the 1996-2021 lifetime ledger, formalised so it can be re-run
// against any future build to confirm nothing has silently changed.
//
// Design notes:
// - The scenario file supplies ANNUAL return/inflation figures (how
//   historical data is actually published) — this module does the
//   annual-to-quarterly conversion internally via geometric compounding,
//   so no external pre-processing step is needed.
// - The withdrawal split (equities vs cash, and any rebalance move) for
//   each row is extracted from the real generateDirectives() HTML output,
//   not re-derived independently — this guarantees the built ledger
//   matches whatever the live directive would actually have told a real
//   user to do that quarter, including the Build 126 bucket-insufficiency
//   fallback.
// - `expected` assertions are checked against the ACTUAL built ledger
//   after the full run completes — every mismatch is collected and
//   returned, not just the first one.

import {
  calculate,
  generateDirectives,
  computeInflationTracking,
  phaseFor,
  lockingBucketFor,
  type LedgerEntry,
  type CalcInputs,
} from "./engine";
import { computeDefensiveRecommendation } from "./defensiveRec";

export interface ScenarioMeta {
  startAge: number;
  cappingAge: number;
  startEquities: number;
  startCash: number;
  targetYearly: number;
  desiredRunwayMonths: number;
  legacyTarget?: number;
  assumedGrowthRatePct: number;
  assumedCashRealPct: number;
  assumedInflationPct: number;
  defensiveMode?: "strict" | "standard" | "aggressive";
  pensionAmount?: number;
  pensionStartAge?: number;
  pensionIncreasePct?: number;
  currency?: string;
}

export interface ScenarioYear {
  year: number;
  equityReturnPct: number;
  cpiPct: number;
  /** Optional per-year override of the cash real return, if a specific year's actual cash rate is known. */
  cashRealPctOverride?: number;
}

export interface ScenarioExpectation {
  /** 0-indexed position in the built ledger, oldest-first (row 0 = first quarter). */
  rowIndex: number;
  totalCapital?: number;
  equities?: number;
  mmFund?: number;
  state?: string;
  exhausted?: boolean;
  /** Absolute £ tolerance for numeric comparisons. Defaults to 1.00. */
  tolerance?: number;
}

export interface ScenarioFile {
  meta: ScenarioMeta;
  years: ScenarioYear[];
  expected?: ScenarioExpectation[];
}

export interface ScenarioMismatch {
  rowIndex: number;
  field: string;
  expected: string | number | boolean;
  actual: string | number | boolean | undefined;
}

export interface ScenarioRunResult {
  ledger: LedgerEntry[];
  mismatches: ScenarioMismatch[];
  rowCount: number;
  finalTotalCapital: number;
  anyExhausted: boolean;
}

const QUARTER_END = ["-03-31", "-06-30", "-09-30", "-12-31"];

function quarterlyRate(annualPct: number): number {
  return Math.pow(1 + annualPct / 100, 0.25) - 1;
}

function extractAmounts(html: string): number[] {
  // Strip the Guyton-Klinger overlay banner first — it carries its own bold
  // £ figure positioned before the action text, which would otherwise
  // shift every subsequent index (see Build 125c commit notes).
  const stripped = html.replace(
    /<div style="padding:0\.75rem; background:rgba\((?:245,158,11|168,85,247),0\.1\)[\s\S]*?<\/div>/g,
    "",
  );
  const matches = [...stripped.matchAll(/<strong[^>]*>£([\d,]+\.\d{2})<\/strong>/g)];
  return matches.map((m) => parseFloat(m[1].replace(/,/g, "")));
}

function fmt(n: number): string {
  return n.toFixed(2);
}

/**
 * Runs a full scenario file through the real engine and returns the
 * complete built ledger, plus a list of every mismatch found against the
 * file's `expected` assertions (if any). Never throws on a data mismatch —
 * only on a structurally invalid scenario file.
 */
export function runScenario(scenario: ScenarioFile): ScenarioRunResult {
  const { meta, years } = scenario;
  if (!meta || !Array.isArray(years) || years.length === 0) {
    throw new Error("Scenario file must include `meta` and a non-empty `years` array.");
  }

  const defensiveMode = meta.defensiveMode ?? "standard";
  const legacyTarget = meta.legacyTarget ?? 0;
  const pensionAmount = meta.pensionAmount ?? 0;
  const pensionStartAge = meta.pensionStartAge ?? 0;
  const pensionIncreasePct = meta.pensionIncreasePct ?? 0;

  const ledger: LedgerEntry[] = []; // newest-first, matches app convention throughout
  let curEquities = meta.startEquities;
  let curCash = meta.startCash;
  let storedATH = meta.startEquities + meta.startCash;

  for (let y = 0; y < years.length; y++) {
    const yearRow = years[y];
    const age = meta.startAge + y;
    const qEq = quarterlyRate(yearRow.equityReturnPct);
    const qCPI = quarterlyRate(yearRow.cpiPct);
    const cashRealPct = yearRow.cashRealPctOverride ?? meta.assumedCashRealPct;
    const nominalCashAnnual = (1 + cashRealPct / 100) * (1 + yearRow.cpiPct / 100) - 1;
    const qCash = quarterlyRate(nominalCashAnnual * 100);

    for (let q = 0; q < 4; q++) {
      const isFirstRow = ledger.length === 0;
      if (!isFirstRow) {
        curEquities = curEquities * (1 + qEq);
        curCash = curCash * (1 + qCash);
      }

      const periodEndDate = `${yearRow.year}${QUARTER_END[q]}`;
      const total = curEquities + curCash;
      if (total > storedATH) storedATH = total;

      const defensiveRec = computeDefensiveRecommendation(
        curEquities,
        periodEndDate,
        ledger,
        meta.assumedInflationPct,
        meta.assumedGrowthRatePct,
      );
      const directiveBucket = defensiveRec.isDefault
        ? undefined
        : defensiveRec[defensiveMode].bucket === "cash"
          ? "cash"
          : "equities";

      const inflationTracking = computeInflationTracking(ledger, meta.assumedInflationPct);
      const inflationBaseYear = inflationTracking.rows.length
        ? parseInt(inflationTracking.rows[0].periodEndDate.slice(0, 4), 10)
        : undefined;

      const inputs: CalcInputs = {
        currentAge: age,
        cappingAge: meta.cappingAge,
        rawEquities: curEquities,
        mmFund: curCash,
        ath: storedATH,
        targetYearly: meta.targetYearly,
        stressPct: 0,
        growthRatePct: meta.assumedGrowthRatePct,
        desiredRunwayMonths: meta.desiredRunwayMonths,
        legacyTarget,
        cashRealPct: meta.assumedCashRealPct,
        pensionAmount,
        pensionStartAge,
        pensionIncreasePct,
        inflationIndex: inflationTracking.currentIndex,
        inflationBaseYear,
      };

      const prevEq = ledger.length > 0 ? Number(ledger[0].equities) || 0 : null;
      const calcResult = calculate(inputs, prevEq);
      const directive = generateDirectives(calcResult, inputs, directiveBucket);
      const narrativeLockedBucket = lockingBucketFor(directive.guardrailText);
      const effectiveBucket =
        narrativeLockedBucket ??
        (defensiveRec.isDefault ? "equities" : defensiveRec[defensiveMode].bucket === "cash" ? "cash" : "equities");

      const amounts = extractAmounts(directive.html);
      const nominalDraw = amounts.length > 0 ? amounts[0] : 0;
      const secondaryAmount = amounts.length > 1 ? amounts[1] : 0;

      let withdrawnFromEquities = 0;
      let withdrawnFromCash = 0;
      let rebalanceDirection: "none" | "eq_to_cash" | "cash_to_eq" = "none";
      let rebalanceAmount = 0;
      let exhausted = false;

      switch (directive.guardrailText) {
        case "Exhaustion":
          exhausted = true;
          break;
        case "No-Go Amortization":
          if (effectiveBucket === "cash") withdrawnFromCash = nominalDraw;
          else withdrawnFromEquities = nominalDraw;
          break;
        case "Peak Refill":
        case "Recovery Wave Refill":
          withdrawnFromEquities = nominalDraw;
          rebalanceDirection = "eq_to_cash";
          rebalanceAmount = secondaryAmount;
          break;
        case "Refilling Shield":
          withdrawnFromEquities = nominalDraw;
          break;
        case "Reverse-Shielding":
          withdrawnFromCash = nominalDraw;
          rebalanceDirection = "cash_to_eq";
          rebalanceAmount = secondaryAmount;
          break;
        case "Comfortable Amortization":
        case "Normal Draw":
          if (effectiveBucket === "cash") withdrawnFromCash = nominalDraw;
          else withdrawnFromEquities = nominalDraw;
          break;
        case "Preservation":
          withdrawnFromCash = nominalDraw;
          break;
        case "Shield Deficit":
          withdrawnFromCash = curCash;
          withdrawnFromEquities = secondaryAmount;
          break;
        default:
          break;
      }

      // Build 126's own resolveSource() fallback inside generateDirectives()
      // now prevents the app from ever RECOMMENDING an insufficient bucket
      // in the first place — but this belt-and-braces check stays here too,
      // since it's cheap insurance against floating-point edge cases at the
      // exact boundary, and against future branches that might not route
      // through resolveSource().
      if (withdrawnFromCash > curCash + 0.005) {
        const shortfall = withdrawnFromCash - curCash;
        withdrawnFromCash = curCash;
        withdrawnFromEquities += shortfall;
      }
      if (withdrawnFromEquities > curEquities + 0.005) {
        const shortfall = withdrawnFromEquities - curEquities;
        withdrawnFromEquities = curEquities;
        withdrawnFromCash = Math.min(curCash, withdrawnFromCash + shortfall);
      }
      const eqAfterWithdrawal = curEquities - withdrawnFromEquities;
      const cashAfterWithdrawal = curCash - withdrawnFromCash;
      if (rebalanceDirection === "eq_to_cash" && rebalanceAmount > eqAfterWithdrawal + 0.005) {
        rebalanceAmount = Math.max(0, eqAfterWithdrawal);
      } else if (rebalanceDirection === "cash_to_eq" && rebalanceAmount > cashAfterWithdrawal + 0.005) {
        rebalanceAmount = Math.max(0, cashAfterWithdrawal);
      }

      const totalWithdrawn = withdrawnFromEquities + withdrawnFromCash;
      const actualCpiSincePriorRow = isFirstRow ? undefined : qCPI * 100;

      const entry: LedgerEntry = {
        label: `Q${q + 1} ${yearRow.year}`,
        age,
        cappingAge: meta.cappingAge,
        equities: curEquities,
        mmFund: curCash,
        ath: storedATH,
        targetYearly: meta.targetYearly,
        desiredMonths: meta.desiredRunwayMonths,
        growthRate: meta.assumedGrowthRatePct,
        totalCapital: total,
        drawdownPct: calcResult.drawdownPct,
        rule: directive.guardrailText,
        guardrailStatus: calcResult.guardrailStatus,
        phase: phaseFor(age),
        legacyTarget,
        withdrawnAmount: totalWithdrawn,
        withdrawnFromEquities,
        withdrawnFromCash,
        rebalanceDirection,
        rebalanceAmount,
        entryKind: "normal",
        periodEndDate,
        assumedGrowthRate: meta.assumedGrowthRatePct,
        assumedCashRealPct: meta.assumedCashRealPct,
        assumedInflationPct: meta.assumedInflationPct,
        actualCpiSincePriorRow,
        funBucket: Math.max(0, calcResult.surplus),
      };

      ledger.unshift(entry);

      if (exhausted) {
        curEquities = Math.max(0, curEquities);
        curCash = Math.max(0, curCash);
      } else {
        curEquities = Math.max(0, curEquities - withdrawnFromEquities);
        curCash = Math.max(0, curCash - withdrawnFromCash);
        if (rebalanceDirection === "eq_to_cash") {
          curEquities = Math.max(0, curEquities - rebalanceAmount);
          curCash += rebalanceAmount;
        } else if (rebalanceDirection === "cash_to_eq") {
          curCash = Math.max(0, curCash - rebalanceAmount);
          curEquities += rebalanceAmount;
        }
      }
    }
  }

  // ledger is newest-first; build an oldest-first view for expected-row indexing.
  const chronological = [...ledger].reverse();

  const mismatches: ScenarioMismatch[] = [];
  for (const exp of scenario.expected ?? []) {
    const row = chronological[exp.rowIndex];
    if (!row) {
      mismatches.push({ rowIndex: exp.rowIndex, field: "(row)", expected: "exists", actual: "row not found" });
      continue;
    }
    const tol = exp.tolerance ?? 1.0;
    const checkNum = (field: string, expectedVal: number | undefined, actualVal: number | undefined) => {
      if (expectedVal === undefined) return;
      if (actualVal === undefined || Math.abs(actualVal - expectedVal) > tol) {
        mismatches.push({ rowIndex: exp.rowIndex, field, expected: fmt(expectedVal), actual: actualVal !== undefined ? fmt(actualVal) : "undefined" });
      }
    };
    checkNum("totalCapital", exp.totalCapital, row.totalCapital);
    checkNum("equities", exp.equities, row.equities);
    checkNum("mmFund", exp.mmFund, row.mmFund);
    if (exp.state !== undefined && row.rule !== exp.state) {
      mismatches.push({ rowIndex: exp.rowIndex, field: "state", expected: exp.state, actual: row.rule });
    }
    if (exp.exhausted !== undefined) {
      const wasExhausted = row.rule === "Exhaustion";
      if (wasExhausted !== exp.exhausted) {
        mismatches.push({ rowIndex: exp.rowIndex, field: "exhausted", expected: exp.exhausted, actual: wasExhausted });
      }
    }
  }

  return {
    ledger,
    mismatches,
    rowCount: ledger.length,
    finalTotalCapital: chronological[chronological.length - 1]?.totalCapital ?? 0,
    anyExhausted: ledger.some((e) => e.rule === "Exhaustion"),
  };
}
