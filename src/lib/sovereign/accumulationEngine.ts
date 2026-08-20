// Sovereign Glidepath — Accumulation Simulator engine.
//
// Mirror image of the Risk Simulator's drawdown engine: each simulated year
// applies a market return to the pot and then ADDS that year's contribution,
// where the Risk Simulator SUBTRACTS a withdrawal.
//
// The historical return sequence is NOT re-embedded here — it is imported from
// MonteCarloPanel.tsx, which owns the single copy of the MSCI World / global
// tracker annual series already used by the Risk Simulator's Historical mode.
import { GLOBAL_ANNUAL } from "@/components/sovereign/MonteCarloPanel";
import { mulberry32, gaussian, quantile } from "@/lib/sovereign/monteCarloShared";

export type AccMode = "historical" | "parametric";

export const ACC_RUNS = 10000;

export interface AccumulationInputs {
  startAge: number;
  retirementAge: number;
  /** Single pot — no equities/cash split in the accumulation phase. */
  startingPot: number;
  /** Monthly contribution at startAge (annualised x12 inside the engine). */
  monthlyContribution: number;
  /** Annual % increase applied to the monthly contribution, compounding. */
  contributionEscalationPct: number;
  mode: AccMode;
  /** Parametric mean nominal annual return, %. */
  meanPct: number;
  /** Parametric annual standard deviation, %. */
  stdevPct: number;
  /** Inflation assumption, % — results are shown in today's money. */
  inflationPct: number;
  /** Drives the deterministic dashed line only, independent of mode. */
  assumedRatePct: number;
}

export interface AccBand {
  p10: number;
  p50: number;
  p90: number;
}

export interface AccumulationResult {
  years: number;
  /** One band per year, index 0 = startAge. */
  bands: AccBand[];
  /** Deterministic (flat real return) projection, same indexing as bands. */
  deterministic: number[];
  /** Total contributions paid in, in today's money. */
  totalContributions: number;
  finalP10: number;
  finalP50: number;
  finalP90: number;
}

// mulberry32/gaussian/quantile now imported from monteCarloShared.ts
// (Build 128) — were byte-for-byte duplicated with MonteCarloPanel.tsx.

export function runAccumulation(inp: AccumulationInputs): AccumulationResult | null {
  const years = Math.max(1, Math.min(70, Math.floor(inp.retirementAge - inp.startAge)));
  if (!Number.isFinite(years) || years < 1) return null;

  const P0 = Math.max(0, inp.startingPot);
  const annualContrib0 = Math.max(0, inp.monthlyContribution) * 12;

  const infl = Math.max(0, inp.inflationPct) / 100;
  const mean = inp.meanPct / 100;
  const sd = Math.max(0, inp.stdevPct) / 100;
  const esc = inp.contributionEscalationPct / 100;
  const detRNominal = inp.assumedRatePct / 100;
  const detRReal = infl > 0 ? (1 + detRNominal) / (1 + infl) - 1 : detRNominal;

  // Build 128 — same reproducibility fix as the Risk Simulator: Historical
  // mode's seed previously always folded in `mean`/`sd`, even though those
  // Parametric-only fields are never used to generate a return in Historical
  // mode. That meant touching the Parametric sliders silently reshuffled
  // Historical mode's draw sequence with no visible cause. Historical mode's
  // seed now depends only on {P0, years, contribution, mode} — genuinely
  // reproducible from the inputs actually visible while on that tab.
  // Parametric mode is unchanged: mean/sd still feed its seed.
  const seed =
    inp.mode === "historical"
      ? 0x9e3779b1 ^
        (Math.floor(P0) >>> 0) ^
        ((years << 16) >>> 0) ^
        (1 << 24) ^
        (Math.floor(annualContrib0) >>> 0)
      : 0x9e3779b1 ^
        (Math.floor(P0) >>> 0) ^
        ((years << 16) >>> 0) ^
        (2 << 24) ^
        (Math.floor(annualContrib0) >>> 0) ^
        (Math.floor(mean * 1e6) >>> 0) ^
        (Math.floor(sd * 1e6) >>> 0);
  const rng = mulberry32(seed);

  const byYear: number[][] = Array.from({ length: years + 1 }, () => []);

  for (let r = 0; r < ACC_RUNS; r++) {
    let P = P0;
    byYear[0]!.push(P);
    for (let y = 1; y <= years; y++) {
      const nominal =
        inp.mode === "historical"
          ? (GLOBAL_ANNUAL[Math.floor(rng() * GLOBAL_ANNUAL.length)] ?? 0)
          : mean + sd * gaussian(rng);
      const real = infl > 0 ? (1 + nominal) / (1 + infl) - 1 : nominal;

      // Grow first, then add this year's contribution (mirror of the Risk
      // Simulator, which withdraws instead of contributing).
      P = Math.max(0, P * (1 + real));
      P += annualContrib0 * Math.pow(1 + esc, y - 1);

      byYear[y]!.push(P);
    }
  }

  const bands: AccBand[] = byYear.map((arr) => {
    const s = [...arr].sort((a, b) => a - b);
    return { p10: quantile(s, 0.1), p50: quantile(s, 0.5), p90: quantile(s, 0.9) };
  });

  // Deterministic projection — flat real return, same contribution schedule.
  const deterministic: number[] = [P0];
  let dP = P0;
  let totalContributions = 0;
  for (let y = 1; y <= years; y++) {
    dP = dP * (1 + detRReal);
    const contribThisYear = annualContrib0 * Math.pow(1 + esc, y - 1);
    dP += contribThisYear;
    totalContributions += contribThisYear;
    deterministic.push(dP);
  }


  const final = bands[years]!;
  return {
    years,
    bands,
    deterministic,
    totalContributions,
    finalP10: final.p10,
    finalP50: final.p50,
    finalP90: final.p90,
  };
}
