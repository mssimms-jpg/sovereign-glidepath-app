import React, { useEffect, useMemo, useRef, useState } from "react";
import { cleanNum, formatGBP } from "@/lib/sovereign/engine";
import { applyPeriod } from "@/lib/sovereign/drawdown";
import { exportLedgerCSV } from "@/lib/sovereign/csvExport";
import {
  mulberry32,
  gaussian,
  quantile,
  PARAMETRIC_DEFAULT_MEAN_PCT,
  PARAMETRIC_DEFAULT_STDEV_PCT,
} from "@/lib/sovereign/monteCarloShared";
import { DashedLineIcon } from "./DashedLineIcon";

// MSCI World Net Total Return, GBP-denominated, annual returns 1970–2024
// (decimal). Proxy for a UK investor holding a global tracker.
// Build 124 — exported (was module-local) so the Accumulation Simulator can
// reuse this exact series rather than embedding a second copy of it.
// Build 128 — replaced with the REAL series (computed from monthly index
// levels, base 10,000 = Dec 1969, year-end values). The previous array was
// only ever labelled "approximate" in this comment, but the in-app "How to
// Read This" panel told users it was drawing from real 1970-2024 data —
// it wasn't, for roughly the first 30 of those 55 years. 2000-2024 was a
// close match (evidently rounded from a real series already), but several
// pre-2000 years were off by double digits: 1971 was modelled as +31% vs
// the real +12.43%; 1975 (the post-oil-shock snapback) was modelled as
// +36% vs the real +52.99%; 1990 was modelled as -21% vs the real -31.07%,
// understating that crash by over 10 points. Since the historical bootstrap
// mode picks years at random, roughly half of every Historical-mode run was
// drawing from a materially wrong figure. See also accumulationEngine.ts,
// which imports this same array.
export const GLOBAL_ANNUAL: number[] = [
  -0.0308, 0.1243, 0.3197, -0.1424, -0.2585, 0.5299, 0.3662, -0.0889, 0.088, 0.0013, 0.1789, 0.1736, 0.2921, 0.3742,
  0.2659, 0.154, 0.4242, -0.0858, 0.2349, 0.3336, -0.3107, 0.2441, 0.1165, 0.2741, 0.0053, 0.2215, 0.0506, 0.1606,
  0.2351, 0.2782, -0.059, -0.1438, -0.2803, 0.1975, 0.0641, 0.2287, 0.0538, 0.0653, -0.1855, 0.1709, 0.1678, -0.0534,
  0.1098, 0.2381, 0.1136, 0.0417, 0.2953, 0.1148, -0.036, 0.2376, 0.1212, 0.2336, -0.0825, 0.1708, 0.2043,
];

type Mode = "historical" | "parametric";
const RUNS = 10000;
const MC_KEY = "shd_mc_v1";

/**
 * Build 097 — returns `value` trailing-debounced by `delay` ms. The first value
 * is passed through immediately (no blank first paint); subsequent changes only
 * settle once the user has stopped moving a control for `delay` ms.
 */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState<T>(value);
  useEffect(() => {
    if (Object.is(settled, value)) return;
    const t = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(t);
  }, [value, delay, settled]);
  return settled;
}

// mulberry32/gaussian/quantile moved to monteCarloShared.ts (Build 128) —
// were byte-for-byte duplicated in accumulationEngine.ts. mulberry32 is
// deterministic so that small Parametric-slider tweaks produce smooth
// deltas in the fan chart instead of re-rolling every path.

type ThresholdMode = "strict" | "standard" | "aggressive";
type TickMode = "yearly" | "quarterly";

type PersistedMC = {
  meanStr?: string;
  stdevStr?: string;
  inflationPct?: number;
  growthPct?: number;
  pensionStr?: string;
  pensionAgeStr?: string;
  pensionIncreasePct?: number;
  cashRealPct?: number;
  threshold?: ThresholdMode;
  tickMode?: TickMode;
  useRealPension?: boolean;
};

function loadMC(): PersistedMC {
  try {
    const raw = localStorage.getItem(MC_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveMC(s: PersistedMC) {
  try {
    localStorage.setItem(MC_KEY, JSON.stringify(s));
  } catch {
    /* storage disabled */
  }
}

export interface MonteCarloPanelProps {
  /** @deprecated kept for backward compat — prefer equitiesCapital + cashCapital */
  startingCapital?: number;
  equitiesCapital?: number;
  cashCapital?: number;
  years: number;
  /**
   * Build 101 — seed only. The simulator's Assumed Real Growth Rate slider is fully
   * independent of Pane 1; this prop is used only as the initial value the
   * first time the pane is used (no stored value yet).
   */
  deterministicRatePct: number;
  /** Build 101 — seed only, same rules as deterministicRatePct. */
  cashRealPct?: number;
  /**
   * Build 120 — seed only, exactly like deterministicRatePct and cashRealPct.
   * The panel is a sandbox: it never writes back to the dashboard.
   */
  pensionAmount?: number;
  pensionStartAge?: number;
  pensionIncreasePct?: number;

  annualWithdrawal?: number;
  currentAge?: number;
  /**
   * Build 123 — seed only, exactly like currentAge: the real Target Horizon
   * Age from Pane 1, editable locally, never written back. Combined with the
   * (also editable) currentAge override, this determines the simulation
   * length instead of the fixed `years` prop once both are set.
   */
  horizonAge?: number;
  currency?: "£" | "€" | "$";
}

export const MonteCarloPanel: React.FC<MonteCarloPanelProps> = ({
  startingCapital,
  equitiesCapital,
  cashCapital,
  years,
  deterministicRatePct: deterministicRatePctSeed,
  cashRealPct: cashRealPctSeed,
  pensionAmount: pensionAmountProp,
  pensionStartAge: pensionStartAgeProp,
  pensionIncreasePct: pensionIncreasePctProp,

  annualWithdrawal = 0,
  currentAge = 0,
  horizonAge = 0,
  currency = "£",
}) => {
  // Resolve equities & cash. New callers pass equitiesCapital + cashCapital;
  // legacy callers passing only startingCapital are treated as 100% equities.
  const livEquities =
    typeof equitiesCapital === "number" ? equitiesCapital : typeof startingCapital === "number" ? startingCapital : 0;
  const livCash = typeof cashCapital === "number" ? cashCapital : 0;

  const persisted = useRef<PersistedMC>(loadMC());
  const p = persisted.current;

  const [mode, setMode] = useState<Mode>("historical");
  const [showHelp, setShowHelp] = useState(false);
  // Build 128 — defaults now sourced from monteCarloShared.ts, the single
  // place these two numbers are defined (see that file for derivation).
  const [meanStr, setMeanStr] = useState<string>(p.meanStr ?? String(PARAMETRIC_DEFAULT_MEAN_PCT));
  const [stdevStr, setStdevStr] = useState<string>(p.stdevStr ?? String(PARAMETRIC_DEFAULT_STDEV_PCT));
  const meanPct = cleanNum(meanStr);
  const stdevPct = cleanNum(stdevStr);
  const [inflationPct, setInflationPct] = useState<number>(typeof p.inflationPct === "number" ? p.inflationPct : 2.5);
  // Build 099 — pension inputs now live in Pane 1 (real, app-wide state). This
  // pane either READS those real values live (default) or, when the user opts
  // out, runs its own fully independent hypothetical pension seeded once from
  // the real values. Nothing here ever writes back to Pane 1.
  const realPension = Math.max(
    0,
    typeof pensionAmountProp === "number" ? pensionAmountProp : cleanNum(p.pensionStr ?? ""),
  );
  const realPensionAge = Math.max(
    0,
    Math.floor(
      typeof pensionStartAgeProp === "number" && pensionStartAgeProp > 0
        ? pensionStartAgeProp
        : cleanNum(p.pensionAgeStr ?? "67"),
    ),
  );
  const realPensionIncreasePct =
    typeof pensionIncreasePctProp === "number"
      ? pensionIncreasePctProp
      : typeof p.pensionIncreasePct === "number"
        ? p.pensionIncreasePct
        : 0;

  const [useRealPension, setUseRealPension] = useState<boolean>(
    typeof p.useRealPension === "boolean" ? p.useRealPension : true,
  );
  // Hypothetical buffers — seeded from the real values the moment the toggle is
  // switched off, then fully independent.
  const [hypPensionStr, setHypPensionStr] = useState<string>(realPension > 0 ? realPension.toFixed(2) : "");
  const [hypPensionAgeStr, setHypPensionAgeStr] = useState<string>(String(realPensionAge || 67));
  const [hypPensionIncreasePct, setHypPensionIncreasePct] = useState<number>(realPensionIncreasePct);
  const [pensionFocused, setPensionFocused] = useState(false);

  const enterHypotheticalPension = () => {
    setHypPensionStr(realPension > 0 ? realPension.toFixed(2) : "");
    setHypPensionAgeStr(String(realPensionAge || 67));
    setHypPensionIncreasePct(realPensionIncreasePct);
    setUseRealPension(false);
  };

  const pensionStr = useRealPension ? (realPension > 0 ? realPension.toFixed(2) : "") : hypPensionStr;
  const pensionAgeStr = useRealPension ? String(realPensionAge || 67) : hypPensionAgeStr;
  const pensionIncreasePct = useRealPension ? realPensionIncreasePct : hypPensionIncreasePct;

  // Future extraordinary inflow — a projected windfall injected mid-simulation
  // (property sale, inheritance). Value is in today's real £; year is
  // years-from-now (1 = at end of year 1).
  const [inflowAmtStr, setInflowAmtStr] = useState<string>("");
  const [inflowFocused, setInflowFocused] = useState(false);
  const [inflowYearStr, setInflowYearStr] = useState<string>("5");
  const [inflowDest, setInflowDest] = useState<"equities" | "cash">("equities");
  // Build 099 — methodology caption is now behind this toggle.
  const [showAbout, setShowAbout] = useState(false);

  const inflowAmt = Math.max(0, cleanNum(inflowAmtStr));
  const inflowYear = Math.max(0, Math.floor(cleanNum(inflowYearStr)));

  // Build 101 — Assumed Real Growth Rate and Cash Real Return are now FULLY
  // independent of Pane 1, exactly like Inflation / Escalation: plain local
  // state, persisted in this pane's own settings, seeded from the props only
  // when nothing has been stored yet. Nothing is written back to Pane 1.
  const [deterministicRatePct, setDeterministicRatePct] = useState<number>(
    typeof p.growthPct === "number" ? p.growthPct : (deterministicRatePctSeed ?? 5),
  );
  const [cashRealPct, setCashRealPct] = useState<number>(
    typeof p.cashRealPct === "number" ? p.cashRealPct : typeof cashRealPctSeed === "number" ? cashRealPctSeed : 1,
  );
  const [threshold, setThreshold] = useState<ThresholdMode>(p.threshold ?? "standard");
  const [tickMode, setTickMode] = useState<TickMode>(p.tickMode ?? "yearly");
  // Audit Mode — hidden toggle triggered by double-clicking the pane header.
  // Forces a single deterministic path with canonical inputs so the engine
  // math can be reproduced with a pocket calculator.
  const [auditMode, setAuditMode] = useState<boolean>(false);

  const pension = cleanNum(pensionStr);
  const pensionAge = Math.max(0, Math.floor(cleanNum(pensionAgeStr)));

  // Persist sticky MC settings. NOTE: only the REAL pension values are stored
  // (Pane 1 owns them); the hypothetical buffers are deliberately session-only,
  // exactly like the other what-if overrides in this pane.
  useEffect(() => {
    saveMC({
      meanStr,
      stdevStr,
      inflationPct,
      growthPct: deterministicRatePct,
      pensionStr: realPension > 0 ? realPension.toFixed(2) : "",
      pensionAgeStr: String(realPensionAge || 67),
      pensionIncreasePct: realPensionIncreasePct,
      cashRealPct,
      threshold,
      tickMode,
      useRealPension,
    });
  }, [
    meanStr,
    stdevStr,
    inflationPct,
    deterministicRatePct,
    realPension,
    realPensionAge,
    realPensionIncreasePct,
    cashRealPct,
    threshold,
    tickMode,
    useRealPension,
  ]);

  const [withdrawStr, setWithdrawStr] = useState<string>(annualWithdrawal > 0 ? annualWithdrawal.toFixed(2) : "");
  const [withdrawFocused, setWithdrawFocused] = useState(false);
  const seededRef = React.useRef<number>(annualWithdrawal);
  useEffect(() => {
    if (cleanNum(withdrawStr) === seededRef.current) {
      seededRef.current = annualWithdrawal;
      setWithdrawStr(annualWithdrawal > 0 ? annualWithdrawal.toFixed(2) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annualWithdrawal]);
  const withdraw = cleanNum(withdrawStr);
  const withdrawOverridden = Math.abs(withdraw - annualWithdrawal) > 0.005;
  const contrib = 0;

  // Equities (override) — seeded from live ledger but freely editable for what-if.
  const [equitiesStr, setEquitiesStr] = useState<string>(livEquities > 0 ? livEquities.toFixed(2) : "");
  const [equitiesFocused, setEquitiesFocused] = useState(false);
  const equitiesSeedRef = React.useRef<number>(livEquities);
  useEffect(() => {
    if (cleanNum(equitiesStr) === equitiesSeedRef.current) {
      equitiesSeedRef.current = livEquities;
      setEquitiesStr(livEquities > 0 ? livEquities.toFixed(2) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livEquities]);
  const simEquities = cleanNum(equitiesStr);
  const equitiesOverridden = Math.abs(simEquities - livEquities) > 0.005;

  // Cash Pot (override).
  const [cashStr, setCashStr] = useState<string>(livCash > 0 ? livCash.toFixed(2) : "");
  const [cashFocused, setCashFocused] = useState(false);
  const cashSeedRef = React.useRef<number>(livCash);
  useEffect(() => {
    if (cleanNum(cashStr) === cashSeedRef.current) {
      cashSeedRef.current = livCash;
      setCashStr(livCash > 0 ? livCash.toFixed(2) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livCash]);
  const simCash = cleanNum(cashStr);
  const cashOverridden = Math.abs(simCash - livCash) > 0.005;

  // Current Age (override) — seeded from the live plan but freely editable,
  // e.g. to model this simulation for someone else's age. Never written back.
  const [ageStr, setAgeStr] = useState<string>(currentAge > 0 ? String(currentAge) : "");
  const ageSeedRef = React.useRef<number>(currentAge);
  useEffect(() => {
    if (cleanNum(ageStr) === ageSeedRef.current) {
      ageSeedRef.current = currentAge;
      setAgeStr(currentAge > 0 ? String(currentAge) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAge]);
  const simAge = Math.max(0, Math.floor(cleanNum(ageStr)));
  const ageOverridden = simAge !== currentAge;

  // Horizon Age (override) — same pattern as Current Age: seeded from the
  // live plan's Target Horizon Age (Pane 1), freely editable, never written
  // back. Combined with simAge below, this drives the simulation length.
  const [horizonAgeStr, setHorizonAgeStr] = useState<string>(horizonAge > 0 ? String(horizonAge) : "");
  const horizonAgeSeedRef = React.useRef<number>(horizonAge);
  useEffect(() => {
    if (cleanNum(horizonAgeStr) === horizonAgeSeedRef.current) {
      horizonAgeSeedRef.current = horizonAge;
      setHorizonAgeStr(horizonAge > 0 ? String(horizonAge) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horizonAge]);
  const simHorizonAge = Math.max(0, Math.floor(cleanNum(horizonAgeStr)));
  const horizonAgeOverridden = simHorizonAge !== horizonAge;
  // Falls back to the original `years` prop (the horizon computed once at
  // launch time) until both ages are validly set, or if Horizon Age is set
  // at or below Current Age (which would otherwise produce a zero/negative
  // simulation length).
  const effectiveYears = simHorizonAge > simAge ? simHorizonAge - simAge : years;

  // Build 103 — pot-weighted blended real rate, using the SAME formula as
  // Pane 2's Actuarial Amortization Matrix (engine.ts blendedRealG):
  //   (equities x equityReturn + cash x cashReturn) / (equities + cash)
  const blendedAssumedPct = (() => {
    const e = Math.max(0, simEquities);
    const c = Math.max(0, simCash);
    const tot = e + c;
    return tot > 0 ? (e * deterministicRatePct + c * cashRealPct) / tot : deterministicRatePct;
  })();

  const simCapital = simEquities + simCash;

  // Zoom brush + crosshair tooltip state.
  // zoom = [startYear, endYear] in absolute year-indices into bands[].
  const [zoom, setZoom] = useState<[number, number]>([0, 9999]);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const chartWrapRef = useRef<HTMLDivElement | null>(null);
  const brushDragRef = useRef<null | "left" | "right" | "window">(null);
  const brushAnchorRef = useRef<{ startX: number; z0: number; z1: number } | null>(null);

  // Build 097 — PERFORMANCE. Every slider/field feeding the Monte Carlo used to
  // re-run all 10,000 paths on each intermediate drag event. The raw values
  // still drive the labels immediately (so the slider itself stays fluid); only
  // the expensive re-simulation reads this debounced snapshot.
  const simInputsRaw = useMemo(
    () => ({
      mode,
      meanPct,
      stdevPct,
      inflationPct,
      contrib,
      withdraw,
      pension,
      pensionAge,
      pensionIncreasePct,
      currentAge: simAge,
      simEquities,
      simCash,
      cashRealPct,
      threshold,
      tickMode,
      years: effectiveYears,
      deterministicRatePct,
      inflowAmt,
      inflowYear,
      inflowDest,
    }),
    [
      mode,
      meanPct,
      stdevPct,
      inflationPct,
      contrib,
      withdraw,
      pension,
      pensionAge,
      pensionIncreasePct,
      simAge,
      simEquities,
      simCash,
      cashRealPct,
      threshold,
      tickMode,
      effectiveYears,
      deterministicRatePct,
      inflowAmt,
      inflowYear,
      inflowDest,
    ],
  );
  const simInputs = useDebouncedValue(simInputsRaw, 180);

  // Build 124 — the 10,000-path simulation used to run synchronously inside
  // useMemo, which blocks the whole page (measured 200-580ms) every time it
  // fires. computeSim itself is completely unchanged from before -- only the
  // wrapper around it changed, from useMemo (blocks render) to useState +
  // useEffect with a deferred setTimeout(...,0) (lets the browser paint a
  // "computing" state first, and lets a fresh input change cancel a
  // still-running one via the effect's cleanup).
  function computeSim(simInputs: typeof simInputsRaw) {
    const {
      mode,
      meanPct,
      stdevPct,
      inflationPct,
      contrib,
      withdraw,
      pension,
      pensionAge,
      pensionIncreasePct,
      currentAge,
      simEquities,
      simCash,
      cashRealPct,
      threshold,
      tickMode,
      years,
      deterministicRatePct,
      inflowAmt,
      inflowYear,
      inflowDest,
    } = simInputs;

    const yrs = Math.max(1, Math.min(60, Math.floor(years)));
    const E0 = Math.max(0, simEquities);
    const C0 = Math.max(0, simCash);
    const start = E0 + C0;
    if (start <= 0) return null;

    const mean = meanPct / 100;
    const sd = stdevPct / 100;
    const infl = Math.max(0, inflationPct) / 100;
    const pensG = Math.max(0, pensionIncreasePct) / 100;
    const pensionRealFactor = 1 + pensG;
    const cashRealReturn = cashRealPct / 100;
    const detRNominal = deterministicRatePct / 100;
    const detRReal = infl > 0 ? (1 + detRNominal) / (1 + infl) - 1 : detRNominal;
    // Defensive-draw thresholds live in applyPeriod (single source of truth).
    //   Strict     — cash when real equity return < −5%
    //   Standard   — cash when real equity return < ½ · detRReal
    //   Aggressive — cash unless real equity return > detRReal
    void detRNominal;

    // Target cash buffer = the user's starting Cash Pot (refill ceiling).
    const targetCashBuffer = C0;

    // Build 128 — the seed previously always folded in `mean`/`sd`, even in
    // Historical mode where those Parametric-tab fields are never used to
    // generate a single return. That meant touching the Parametric sliders
    // silently reshuffled which 10,000-path draw sequence Historical mode
    // showed, with no visible cause — a reproducibility bug caught by
    // comparing a live run against an independent reproduction that didn't
    // match until the Parametric fields were accounted for. Historical
    // mode's seed now depends only on {start, yrs, mode} — genuinely
    // reproducible from the inputs actually visible while on that tab.
    // Parametric mode is unchanged: mean/sd still feed its seed, which is
    // what gives its slider a smooth delta instead of a full reshuffle on
    // every tweak (see mulberry32's seeding comment above).
    const seed =
      mode === "historical"
        ? 0x9e3779b1 ^ (Math.floor(start) >>> 0) ^ ((yrs << 16) >>> 0) ^ (1 << 24)
        : 0x9e3779b1 ^
          (Math.floor(start) >>> 0) ^
          ((yrs << 16) >>> 0) ^
          (2 << 24) ^
          (Math.floor(mean * 1e6) >>> 0) ^
          (Math.floor(sd * 1e6) >>> 0);
    const rng = mulberry32(seed);

    const byYear: number[][] = Array.from({ length: yrs + 1 }, () => []);
    const finals: number[] = [];
    let defensiveSum = 0;

    // Target Withdrawal Rate for G-K (fallback when ATH is 0).
    const targetWR_gk = start > 0 ? withdraw / start : 0;

    for (let r = 0; r < RUNS; r++) {
      let E = E0;
      let C = C0;
      let ATH = start; // per-path all-time high
      byYear[0].push(E + C);
      for (let y = 1; y <= yrs; y++) {
        let nominal: number;
        if (mode === "historical") {
          nominal = GLOBAL_ANNUAL[Math.floor(rng() * GLOBAL_ANNUAL.length)];
        } else {
          nominal = mean + sd * gaussian(rng);
        }
        const realEq = infl > 0 ? (1 + nominal) / (1 + infl) - 1 : nominal;

        const ageThisYear = currentAge + y - 1;
        const pensionThisYear = pension > 0 && ageThisYear >= pensionAge ? pension * Math.pow(pensionRealFactor, y) : 0;
        const netDraw = Math.max(0, withdraw - pensionThisYear);

        // Delegate to shared applyPeriod. Yearly = one call; Quarterly =
        // four calls with prorated returns and spend.
        if (tickMode === "quarterly") {
          const qEqReal = Math.pow(1 + realEq, 0.25) - 1;
          const qCashReal = Math.pow(1 + cashRealReturn, 0.25) - 1;
          const qDraw = netDraw / 4;
          let yearHadDefensive = false;
          for (let q = 0; q < 4; q++) {
            const out = applyPeriod(
              { E, C, ATH },
              {
                rEqReal: qEqReal,
                rCashReal: qCashReal,
                spendGross: qDraw,
                withdrawAnchor: withdraw,
                threshold,
                detRReal,
                targetCashBuffer,
                targetWR_gk,
                periodsPerYear: 4,
                age: ageThisYear,
              },
            );
            E = out.E;
            C = out.C;
            ATH = out.ATH;
            if (out.defensive) yearHadDefensive = true;
          }
          if (yearHadDefensive) defensiveSum++;
        } else {
          const out = applyPeriod(
            { E, C, ATH },
            {
              rEqReal: realEq,
              rCashReal: cashRealReturn,
              spendGross: netDraw,
              withdrawAnchor: withdraw,
              threshold,
              detRReal,
              targetCashBuffer,
              targetWR_gk,
              periodsPerYear: 1,
              age: ageThisYear,
            },
          );
          E = out.E;
          C = out.C;
          ATH = out.ATH;
          if (out.defensive) defensiveSum++;
        }

        // Extraordinary inflow — injected at end of the specified year into the
        // chosen destination bucket. Bumps ATH so guardrails re-anchor.
        if (inflowAmt > 0 && y === inflowYear) {
          if (inflowDest === "cash") C += inflowAmt;
          else E += inflowAmt;
          if (E + C > ATH) ATH = E + C;
        }

        byYear[y].push(E + C);
      }
      finals.push(E + C);
    }

    const bands = byYear.map((arr) => {
      const s = [...arr].sort((a, b) => a - b);
      return {
        p10: quantile(s, 0.1),
        p25: quantile(s, 0.25),
        p50: quantile(s, 0.5),
        p75: quantile(s, 0.75),
        p90: quantile(s, 0.9),
      };
    });

    // Deterministic projection — Build 111. Previously a hand-rolled loop that
    // (a) always drew from equities and clamped a negative equity balance to 0,
    // silently deleting the shortfall instead of spilling into cash, (b) never
    // applied the Guyton-Klinger guardrails, and (c) ignored tick mode entirely.
    // It now runs through the SAME shared applyPeriod() the stochastic paths and
    // Audit Mode use, with a flat (deterministic) return sequence — so bucket
    // sourcing, G-K, ATH tracking and depletion all behave identically.
    const det: number[] = [E0 + C0];
    let dE = E0;
    let dC = C0;
    let dATH = start;
    for (let y = 1; y <= yrs; y++) {
      const ageThisYear = currentAge + y - 1;
      const pensionThisYear = pension > 0 && ageThisYear >= pensionAge ? pension * Math.pow(pensionRealFactor, y) : 0;
      const netDraw = Math.max(0, withdraw - pensionThisYear);

      if (tickMode === "quarterly") {
        const qEqReal = Math.pow(1 + detRReal, 0.25) - 1;
        const qCashReal = Math.pow(1 + cashRealReturn, 0.25) - 1;
        const qDraw = netDraw / 4;
        for (let q = 0; q < 4; q++) {
          const out = applyPeriod(
            { E: dE, C: dC, ATH: dATH },
            {
              rEqReal: qEqReal,
              rCashReal: qCashReal,
              spendGross: qDraw,
              withdrawAnchor: withdraw,
              threshold,
              detRReal,
              targetCashBuffer,
              targetWR_gk,
              periodsPerYear: 4,
              age: ageThisYear,
            },
          );
          dE = out.E;
          dC = out.C;
          dATH = out.ATH;
        }
      } else {
        const out = applyPeriod(
          { E: dE, C: dC, ATH: dATH },
          {
            rEqReal: detRReal,
            rCashReal: cashRealReturn,
            spendGross: netDraw,
            withdrawAnchor: withdraw,
            threshold,
            detRReal,
            targetCashBuffer,
            targetWR_gk,
            periodsPerYear: 1,
            age: ageThisYear,
          },
        );
        dE = out.E;
        dC = out.C;
        dATH = out.ATH;
      }

      // Extraordinary inflow — injected at the specified year into the chosen
      // destination bucket. Re-anchors the deterministic ATH, mirroring the
      // stochastic paths.
      if (inflowAmt > 0 && y === inflowYear) {
        if (inflowDest === "cash") dC += inflowAmt;
        else dE += inflowAmt;
        if (dE + dC > dATH) dATH = dE + dC;
      }
      det.push(dE + dC);
    }

    const sortedFinals = [...finals].sort((a, b) => a - b);
    const detFinal = det[yrs];
    let below = 0;
    for (const f of sortedFinals) {
      if (f <= detFinal) below++;
      else break;
    }
    const pctRank = Math.round((below / sortedFinals.length) * 100);

    const successRate = Math.round((sortedFinals.filter((f) => f >= start).length / sortedFinals.length) * 100);

    const ruinRate = Math.round((sortedFinals.filter((f) => f <= 0).length / sortedFinals.length) * 100);
    const detRuined = detFinal <= 0;

    const avgDefensiveYears = defensiveSum / RUNS;
    const defensivePct = Math.round((avgDefensiveYears / yrs) * 100);

    return {
      yrs,
      bands,
      det,
      pctRank,
      finals: sortedFinals,
      successRate,
      ruinRate,
      detRuined,
      avgDefensiveYears,
      defensivePct,
    };
  }

  const [sim, setSim] = useState<ReturnType<typeof computeSim> | null>(null);
  // simComputing now only drives the initial-load message below ("Running
  // 10,000 simulations…" vs "Add a ledger entry…") -- a visible indicator
  // during recompute was tried and removed, since even a layout-neutral
  // version caused visible judder on the Windows desktop build.
  const [simComputing, setSimComputing] = useState(false);

  useEffect(() => {
    // Deferred via double requestAnimationFrame so the input itself stays
    // responsive during the ~200-580ms calculation, rather than blocking
    // synchronously inside a render-triggering useMemo.
    let cancelled = false;
    let raf2 = 0;
    setSimComputing(true);
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (cancelled) return;
        setSim(computeSim(simInputs));
        setSimComputing(false);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [simInputs]);

  // -------- AUDIT MODE ---------------------------------------------------
  type AuditStep = {
    interval: string;
    age: number;
    startE: number;
    startC: number;
    netOutflow: number;
    equityPct: number;
    cashPct: number;
    gk: "Normal" | "Preservation (-10%)" | "Prosperity (+10%)";
    endE: number;
    endC: number;
  };

  const AUDIT = {
    age: 55,
    horizon: 85, // yearly rows shown = 30
    E0: 610000,
    C0: 90000,
    withdraw: 36000,
    meanNom: 0.07, // parametric flat equity return
    cashReal: 0.02, // cash real return (matches slider convention)
    infl: 0.025,
    pensionIncrease: 0.025,
    pension: 12700,
    pensionAge: 67,
  };

  const auditSim = useMemo(() => {
    const yrs = AUDIT.horizon - AUDIT.age;
    const start = AUDIT.E0 + AUDIT.C0;
    const infl = AUDIT.infl;
    const targetCashBuffer = AUDIT.C0;
    const targetWR_gk = AUDIT.withdraw / start;
    void AUDIT.pensionIncrease;

    // Defensive-draw thresholds live in applyPeriod. Aggressive hurdle
    // uses the parametric assumed real return derived here.
    const detRReal = infl > 0 ? (1 + AUDIT.meanNom) / (1 + infl) - 1 : AUDIT.meanNom;

    // Historical starts at 1973 = index 3 in GLOBAL_ANNUAL (1970,71,72,73...)
    const HIST_START = 3;

    const totalByYear: number[] = [start];
    const steps: AuditStep[] = [];
    let E = AUDIT.E0;
    let C = AUDIT.C0;
    let ATH = start;
    let defensiveTicks = 0;
    let totalTicks = 0;

    const YEARLY_ROWS = 30;
    const QUARTERLY_ROWS_YEARS = 30; // 30y × 4 = 120 rows (audit tabulates all)

    for (let y = 1; y <= yrs; y++) {
      const nominal =
        mode === "historical" ? GLOBAL_ANNUAL[(HIST_START + (y - 1)) % GLOBAL_ANNUAL.length] : AUDIT.meanNom;
      const realEq = (1 + nominal) / (1 + infl) - 1;

      const ageThisYear = AUDIT.age + y - 1;
      const pensionThisYear = AUDIT.pension > 0 && ageThisYear >= AUDIT.pensionAge ? AUDIT.pension : 0;
      const netDraw = Math.max(0, AUDIT.withdraw - pensionThisYear);

      if (tickMode === "quarterly") {
        const qEqReal = Math.pow(1 + realEq, 0.25) - 1;
        const qCashReal = Math.pow(1 + AUDIT.cashReal, 0.25) - 1;
        const qDraw = netDraw / 4;
        for (let q = 0; q < 4; q++) {
          const startE = E;
          const startC = C;
          totalTicks++;
          const out = applyPeriod(
            { E, C, ATH },
            {
              rEqReal: qEqReal,
              rCashReal: qCashReal,
              spendGross: qDraw,
              withdrawAnchor: AUDIT.withdraw,
              threshold,
              detRReal,
              targetCashBuffer,
              targetWR_gk,
              periodsPerYear: 4,
              age: ageThisYear,
            },
          );
          E = out.E;
          C = out.C;
          ATH = out.ATH;
          if (out.defensive) defensiveTicks++;
          if (y <= QUARTERLY_ROWS_YEARS) {
            steps.push({
              interval: `Y${y} Q${q + 1}`,
              age: AUDIT.age + y - 1,
              startE,
              startC,
              netOutflow: out.spend,
              equityPct: qEqReal * 100,
              cashPct: qCashReal * 100,
              gk: out.gkLabel,
              endE: E,
              endC: C,
            });
          }
        }
      } else {
        const startE = E;
        const startC = C;
        totalTicks++;
        const out = applyPeriod(
          { E, C, ATH },
          {
            rEqReal: realEq,
            rCashReal: AUDIT.cashReal,
            spendGross: netDraw,
            withdrawAnchor: AUDIT.withdraw,
            threshold,
            detRReal,
            targetCashBuffer,
            targetWR_gk,
            periodsPerYear: 1,
            age: ageThisYear,
          },
        );
        E = out.E;
        C = out.C;
        ATH = out.ATH;
        if (out.defensive) defensiveTicks++;
        if (y <= YEARLY_ROWS) {
          steps.push({
            interval: `Y${y}`,
            age: AUDIT.age + y - 1,
            startE,
            startC,
            netOutflow: out.spend,
            equityPct: realEq * 100,
            cashPct: AUDIT.cashReal * 100,
            gk: out.gkLabel,
            endE: E,
            endC: C,
          });
        }
      }
      totalByYear.push(E + C);
    }

    const bands = totalByYear.map((v) => ({
      p10: v,
      p25: v,
      p50: v,
      p75: v,
      p90: v,
    }));
    const det = [...totalByYear];
    const defPct = totalTicks > 0 ? Math.round((defensiveTicks / totalTicks) * 100) : 0;
    const defYears = tickMode === "quarterly" ? defensiveTicks / 4 : defensiveTicks;
    return {
      yrs,
      bands,
      det,
      steps,
      pctRank: 50,
      finals: totalByYear,
      successRate: 100,
      ruinRate: 0,
      detRuined: false,
      avgDefensiveYears: defYears,
      defensivePct: defPct,
    };
  }, [mode, tickMode, auditMode, threshold]);
  void auditSim.finals;

  if (!sim && !auditMode) {
    return (
      <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
        <h2 className="shd-h2" onDoubleClick={() => setAuditMode((v) => !v)} title="Double-click to toggle Audit Mode">
          Risk Simulator — Monte Carlo Fan Chart
        </h2>
        <div style={{ color: "var(--text-muted)", padding: "1rem 0" }}>
          {simComputing ? "Running 10,000 simulations…" : "Add a ledger entry with capital to run the simulation."}
        </div>
      </div>
    );
  }

  const activeSim = auditMode ? auditSim : sim!;
  const {
    yrs,
    bands,
    det,
    pctRank,
    finals: _finals,
    successRate,
    ruinRate,
    detRuined,
    avgDefensiveYears,
    defensivePct,
  } = activeSim;
  void _finals;

  const w = 1000,
    h = 360,
    pL = 90,
    pR = 30,
    pT = 20,
    pB = 40;

  // Active zoom window (absolute year indices, inclusive of both ends).
  const z0 = Math.max(0, Math.min(zoom[0], yrs - 1));
  const z1 = Math.max(z0 + 1, Math.min(zoom[1], yrs));
  const span = z1 - z0;

  const visibleBands = bands.slice(z0, z1 + 1);
  const visibleDet = det.slice(z0, z1 + 1);

  const allMax = Math.max(...visibleBands.map((b) => b.p90), ...visibleDet);
  const allMin = Math.max(0, Math.min(...visibleBands.map((b) => b.p10), ...visibleDet));
  const maxV = allMax > 0 ? allMax * 1.05 : 1;
  const minV = allMin > 0 ? allMin * 0.95 : 0;
  const rangeV = Math.max(1, maxV - minV);

  // i is an ABSOLUTE year index into bands[]; map it through the visible window.
  const getX = (i: number) => pL + ((i - z0) / span) * (w - pL - pR);
  const getY = (v: number) => h - pB - ((Math.max(minV, v) - minV) / rangeV) * (h - pB - pT);

  const pathFromTo = (lo: (b: (typeof bands)[number]) => number, hi: (b: (typeof bands)[number]) => number) => {
    const top = visibleBands.map((b, k) => `${k === 0 ? "M" : "L"}${getX(z0 + k)},${getY(hi(b))}`).join(" ");
    const bot = [...visibleBands]
      .map((b, k) => ({ b, k }))
      .reverse()
      .map(({ b, k }) => `L${getX(z0 + k)},${getY(lo(b))}`)
      .join(" ");
    return `${top} ${bot} Z`;
  };

  const median = visibleBands.map((b, k) => `${k === 0 ? "M" : "L"}${getX(z0 + k)},${getY(b.p50)}`).join(" ");
  const detPath = visibleDet.map((v, k) => `${k === 0 ? "M" : "L"}${getX(z0 + k)},${getY(v)}`).join(" ");

  const gridLines: React.ReactElement[] = [];
  for (let i = 0; i <= 5; i++) {
    const val = minV + (rangeV / 5) * i;
    const y = getY(val);
    const lab =
      val >= 1_000_000 ? `${currency}${(val / 1_000_000).toFixed(2)}M` : `${currency}${(val / 1000).toFixed(0)}k`;
    gridLines.push(
      <g key={`g${i}`}>
        <line x1={pL} y1={y} x2={w - pR} y2={y} stroke="var(--border-color)" strokeWidth={1} opacity={0.3} />
        <text x={pL - 10} y={y + 4} fill="var(--text-muted)" fontSize={12} textAnchor="end">
          {lab}
        </text>
      </g>,
    );
  }
  const xTicks: React.ReactElement[] = [];
  const tickStep = Math.max(1, Math.ceil(span / 8));
  for (let i = z0; i <= z1; i += tickStep) {
    const x = getX(i);
    const displayAge = auditMode ? AUDIT.age : simAge;
    const ageLabel = displayAge > 0 ? `${displayAge + i}` : `+${i}y`;
    xTicks.push(
      <g key={`x${i}`}>
        <line x1={x} y1={h - pB} x2={x} y2={h - pB + 4} stroke="var(--text-muted)" opacity={0.6} />
        <text x={x} y={h - pB + 18} fill="var(--text-muted)" fontSize={11} textAnchor="middle">
          {ageLabel}
        </text>
      </g>,
    );
  }

  // Crosshair / tooltip — absolute index into bands.
  const hoverAbs = hoverIdx == null ? null : Math.max(z0, Math.min(z1, hoverIdx));
  const hoverX = hoverAbs == null ? null : getX(hoverAbs);
  const hoverBand = hoverAbs == null ? null : bands[hoverAbs];
  const hoverDet = hoverAbs == null ? null : det[hoverAbs];

  const handleChartPointerMove = (e: React.PointerEvent<SVGRectElement>) => {
    const target = e.currentTarget as SVGRectElement;
    const rect = target.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const pxPerYear = rect.width / span;
    const k = Math.round(relX / pxPerYear);
    setHoverIdx(z0 + Math.max(0, Math.min(span, k)));
  };
  const handleChartPointerLeave = () => setHoverIdx(null);

  // Brush interactions.
  const brushW = w - pL - pR;
  const brushH = 38;
  const brushPT = 6;
  const brushPB = 6;
  const brushTrackH = brushH - brushPT - brushPB;
  const brushXFor = (i: number) => pL + (i / yrs) * brushW;

  const startBrushDrag = (e: React.PointerEvent<SVGElement>, which: "left" | "right" | "window") => {
    e.preventDefault();
    e.stopPropagation();
    const host = (e.currentTarget.ownerSVGElement ?? e.currentTarget) as SVGSVGElement;
    host.setPointerCapture?.(e.pointerId);
    brushDragRef.current = which;
    brushAnchorRef.current = { startX: e.clientX, z0, z1 };
  };
  const moveBrushDrag = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!brushDragRef.current || !brushAnchorRef.current) return;
    const which = brushDragRef.current;
    const anchor = brushAnchorRef.current;
    const host = e.currentTarget;
    const rect = host.getBoundingClientRect();
    const scale = w / rect.width;
    const deltaYears = Math.round(((e.clientX - anchor.startX) * scale) / (brushW / yrs));
    const MIN = 2;
    if (which === "left") {
      const next = Math.max(0, Math.min(anchor.z1 - MIN, anchor.z0 + deltaYears));
      setZoom([next, anchor.z1]);
    } else if (which === "right") {
      const next = Math.max(anchor.z0 + MIN, Math.min(yrs, anchor.z1 + deltaYears));
      setZoom([anchor.z0, next]);
    } else {
      const width = anchor.z1 - anchor.z0;
      let na = anchor.z0 + deltaYears;
      if (na < 0) na = 0;
      if (na + width > yrs) na = yrs - width;
      setZoom([na, na + width]);
    }
  };
  const endBrushDrag = (e: React.PointerEvent<SVGSVGElement>) => {
    if (brushDragRef.current) {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    }
    brushDragRef.current = null;
    brushAnchorRef.current = null;
  };
  const handleBrushDoubleClick = () => setZoom([0, yrs]);
  const nudgeHandle = (which: "left" | "right", delta: number) => {
    if (which === "left") {
      setZoom([Math.max(0, Math.min(z1 - 2, z0 + delta)), z1]);
    } else {
      setZoom([z0, Math.max(z0 + 2, Math.min(yrs, z1 + delta))]);
    }
  };

  // Brush mini-band preview (full-range p10/p90).
  const brushMaxV = Math.max(...bands.map((b) => b.p90), 1);
  const brushTopY = (v: number) => brushPT + brushTrackH - (Math.max(0, v) / brushMaxV) * brushTrackH;
  const brushBandPath = (() => {
    const top = bands.map((b, i) => `${i === 0 ? "M" : "L"}${brushXFor(i)},${brushTopY(b.p90)}`).join(" ");
    const bot = [...bands]
      .map((b, i) => ({ b, i }))
      .reverse()
      .map(({ b, i }) => `L${brushXFor(i)},${brushTopY(b.p10)}`)
      .join(" ");
    return `${top} ${bot} Z`;
  })();
  const brushMedianPath = bands.map((b, i) => `${i === 0 ? "M" : "L"}${brushXFor(i)},${brushTopY(b.p50)}`).join(" ");

  const beatRate = 100 - pctRank;
  const planFailing = detRuined || ruinRate >= 50;
  const rankColor = planFailing
    ? "var(--accent-red)"
    : beatRate >= 60
      ? "var(--accent-green, #16a34a)"
      : beatRate >= 40
        ? "var(--accent-amber)"
        : "var(--accent-red)";
  const rankLabel = planFailing
    ? ruinRate >= 75
      ? `Plan fails — ${ruinRate}% of futures run out of money`
      : `Plan unsustainable — ${ruinRate}% of futures run out of money`
    : beatRate >= 75
      ? "Conservative — most futures beat your assumption"
      : beatRate >= 50
        ? "Reasonable — majority of futures meet your assumption"
        : beatRate >= 25
          ? `Optimistic — minority of futures meet your assumption${ruinRate > 0 ? ` (${ruinRate}% deplete)` : ""}`
          : `Aggressive — few futures match your assumption${ruinRate > 0 ? ` (${ruinRate}% deplete)` : ""}`;

  return (
    <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
      {auditMode && (
        <div
          role="status"
          style={{
            background: "rgba(168,85,247,0.12)",
            border: "1px solid var(--accent-purple)",
            color: "var(--accent-purple)",
            padding: "0.6rem 0.85rem",
            borderRadius: "0.4rem",
            marginBottom: "0.75rem",
            fontSize: "0.85rem",
            fontWeight: 700,
            letterSpacing: 0.2,
          }}
        >
          AUDIT MODE ACTIVE — Randomness Paused (Deterministic Sample Path). Double-click the pane header to exit.
          <div
            style={{
              fontWeight: 400,
              fontSize: "0.75rem",
              marginTop: "0.25rem",
              color: "var(--text-muted)",
            }}
          >
            Fixed inputs: Age {AUDIT.age} → {AUDIT.age + 30} · Eq {currency}610,000 · Cash {currency}90,000 · Draw{" "}
            {currency}36,000 · Pension {currency}12,700 @ 67 (flat real) · Equity{" "}
            {mode === "parametric" ? "flat +7.0% nominal" : "historical from 1973 chronological"} · Cash real +2.0% ·
            Inflation 2.5%.
          </div>
        </div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "0.75rem",
        }}
      >
        <h2
          className="shd-h2"
          style={{ margin: 0, cursor: "pointer", userSelect: "none" }}
          onDoubleClick={() => setAuditMode((v) => !v)}
          title="Double-click to toggle Audit Mode (deterministic sample path)"
        >
          Risk Simulator — Monte Carlo Fan Chart
        </h2>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            className="secondary"
            style={{ fontSize: "0.75rem", padding: "0.4rem 0.7rem" }}
            onClick={() => setShowHelp((s) => !s)}
            aria-expanded={showHelp}
          >
            {showHelp ? "Hide" : "How to read this"}
          </button>
          <button
            className={mode === "historical" ? "" : "secondary"}
            style={{ fontSize: "0.75rem", padding: "0.4rem 0.7rem" }}
            onClick={() => setMode("historical")}
          >
            Historical (MSCI World, GBP)
          </button>
          <button
            className={mode === "parametric" ? "" : "secondary"}
            style={{ fontSize: "0.75rem", padding: "0.4rem 0.7rem" }}
            onClick={() => setMode("parametric")}
          >
            Parametric Fan Chart
          </button>
          <span
            style={{
              display: "inline-flex",
              gap: 4,
              padding: 2,
              border: "1px solid var(--border-color)",
              borderRadius: 6,
              marginLeft: "0.25rem",
            }}
            title="Yearly = one G-K check per year (original engine). Quarterly = per-quarter G-K ±10%, matching how the live app actually operates."
          >
            <button
              className={tickMode === "yearly" ? "" : "secondary"}
              style={{ fontSize: "0.72rem", padding: "0.3rem 0.55rem" }}
              onClick={() => setTickMode("yearly")}
              aria-pressed={tickMode === "yearly"}
            >
              Yearly tick
            </button>
            <button
              className={tickMode === "quarterly" ? "" : "secondary"}
              style={{ fontSize: "0.72rem", padding: "0.3rem 0.55rem" }}
              onClick={() => setTickMode("quarterly")}
              aria-pressed={tickMode === "quarterly"}
            >
              Quarterly tick
            </button>
          </span>
        </div>
      </div>

      {showHelp && (
        <div
          style={{
            background: "rgba(59,130,246,0.06)",
            border: "1px solid var(--border-color)",
            borderRadius: 8,
            padding: "0.85rem 1rem",
            marginBottom: "1rem",
            fontSize: "0.82rem",
            lineHeight: 1.55,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: "0.4rem" }}>How to read this panel</div>
          <p style={{ margin: "0 0 0.5rem" }}>
            We re-run your retirement <strong>10,000 times</strong> with fresh annual returns each run, then plot the
            spread. The point isn't to predict the future — it's to make the <em>shape</em> of uncertainty visible.
          </p>
          <p style={{ margin: "0 0 0.5rem" }}>
            <strong>True two-bucket sim.</strong> Equities and Cash run as separate buckets. In a <em>good</em> year
            (equities clear the defensive threshold) we spend from Equities and refill the Cash Pot up to its starting
            size. In a <em>bad</em> year we spend from Cash to avoid forced selling. The <strong>threshold</strong>{" "}
            buttons pick how cautious that switch is — Standard = "spend from cash in flat or weak equity markets".
          </p>
          <p style={{ margin: "0 0 0.5rem" }}>
            <strong>Yearly vs Quarterly tick (new in Build 061).</strong> The toggle in the header switches the engine
            between an annual step (one G-K check per year — the original 10,000-run engine) and a <em>quarterly</em>{" "}
            step that re-checks the Guyton-Klinger ±10% guardrail every quarter, exactly like the live app does when you
            commit a ledger row. The quarterly mode splits each year's nominal return into four equal geometric quarters
            and evaluates Preservation / Prosperity / Normal against a per-path all-time high, then draws accordingly.
            Expect the p10 floor to lift slightly under quarterly — that lift is the visible value of the live app's
            quarterly discipline.
          </p>

          <p style={{ margin: "0 0 0.5rem" }}>
            <strong>Modes:</strong> <em>Historical</em> draws each year at random from real MSCI World (Net Total
            Return, GBP) annual returns 1970–2024 — a global-tracker proxy for a typical UK investor.{" "}
            <em>Parametric</em> manufactures returns from a normal curve with a mean and volatility you set.
          </p>
          <p style={{ margin: "0 0 0.5rem" }}>
            <strong>Yearly Withdrawal Increase Rate (0–5%):</strong> escalates your withdrawal smoothly each year.
            Returns are deflated by the same rate so the whole chart is in <strong>today's pounds</strong>.
          </p>
          <p style={{ margin: "0 0 0.5rem" }}>
            <strong>Annual Pension &amp; Pension Start Age:</strong> the pension amount (in today's money) is netted off
            your withdrawal once you reach the start age. Before that age, the full withdrawal comes from capital.
          </p>
          <p style={{ margin: "0 0 0.5rem" }}>
            <strong>Pension Real Annual Increase (0–6%):</strong> compounds the pension in <em>today's pounds</em> each
            year from the start date. 0% means a flat-real pension (purchasing power held constant). 2% means the
            pension's real value grows by 2% per year — roughly the gap between the UK triple-lock and CPI over the long
            run.
          </p>
          <p style={{ margin: "0 0 0.5rem" }}>
            <strong>The fan:</strong> light blue = 10–90th percentile, darker = 25–75th, solid = median, dashed = your
            deterministic reference path — the <em>return</em> is held flat at your Assumed Growth Rate, but the{" "}
            <em>withdrawal</em> is fully live (same guardrails, bucket-sourcing and pension logic as the fan itself), so
            in an unsustainable scenario the dashed line can genuinely decline to zero, not just flatten out.
          </p>
          <p style={{ margin: "0 0 0.5rem" }}>
            <strong>Zoom &amp; hover.</strong> Drag the handles on the strip below the chart to zoom into a time window
            — the Y-axis auto-rescales so short horizons no longer look flat. Drag the highlighted region to pan,
            double-click to reset. Hover (or touch) anywhere on the chart for a dashed crosshair and a tooltip card with
            Age, Assumed Growth, Median Path and the 10th/90th percentile values at that year.
          </p>

          <p style={{ margin: "0 0 0.5rem" }}>
            <strong>FAQ — why does the median sit below the dashed line at the same %?</strong> Volatility drag. The
            Expected Return is an <em>arithmetic</em> mean; what compounds over time is the <em>geometric</em> mean, ≈ μ
            − σ²/2. With σ=15%, that's ~1.13%/yr lower (so the median compounds at ~5.9%, not 7%). A +20% / −20%
            portfolio ends at 0.96, not 1.00 — the bigger the swings, the bigger the gap.
          </p>
          <p style={{ margin: "0 0 0.5rem" }}>
            <strong>And the upper band looks wider than the lower band?</strong> Correct. Compounded returns are{" "}
            <em>log-normal</em>: the downside is bounded at zero (a 100% loss), the upside is unbounded. The fan is
            right-skewed by design — that's the honest shape of compounded risk, not a chart bug.
          </p>

          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.76rem" }}>
            <strong>Does NOT model:</strong> taxes, fees, your actual asset mix, behavioural cuts, or regime change.
            Stress test, not forecast.
          </p>
        </div>
      )}

      {/* Build 102 — Parametric inputs (left) share one compact row with the
          Pension group (right). In Historical mode the Parametric half is not
          rendered and the Pension group takes the full width. */}
      <div
        className="mc-compact"
        style={{
          display: "grid",
          gridTemplateColumns: mode === "parametric" ? "1fr 1fr" : "1fr",
          gap: "0.6rem 0.75rem",
          marginBottom: "1rem",
        }}
      >
        {mode === "parametric" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "0.6rem 0.75rem",
              alignContent: "start",
            }}
          >
            <div>
              <label
                style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}
                title="Shifts the whole Fan Chart up or down. Higher = wealthier outcomes across all 10,000 futures."
              >
                Parametric Expected Annual Equity Return % (Fan Chart)
              </label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={30}
                step={0.1}
                value={meanStr}
                onChange={(e) => setMeanStr(e.target.value)}
              />
            </div>
            <div>
              <label
                style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}
                title="Widens / narrows the Fan Chart. Higher = bigger gap between lucky and unlucky outcomes."
              >
                Parametric Return Volatility (Standard Deviation) % (Fan Chart)
              </label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={60}
                step={0.1}
                value={stdevStr}
                onChange={(e) => setStdevStr(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Pension group — Amount, Start Age, Real Increase and the real /
            hypothetical switch all read as one unit. Build 123 added
            Horizon Age as a fourth column here alongside Current Age — not
            strictly a pension field, but it shares the same what-if/reset
            pattern and the two ages together define the simulation length. */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: "0.6rem 0.75rem",
            alignContent: "start",
          }}
        >
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Annual Pension {currency} (today's {currency}){" "}
              {!useRealPension && (
                <span
                  style={{ color: "var(--accent-amber)", fontWeight: 700, fontSize: "0.65rem" }}
                  title="Hypothetical — never written back to Pane 1"
                >
                  ✎ what-if
                </span>
              )}
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder={`${currency}0.00`}
              readOnly={useRealPension}
              value={pensionFocused ? pensionStr : pensionStr ? formatGBP(cleanNum(pensionStr)) : ""}
              onFocus={(e) => {
                if (useRealPension) return;
                const n = cleanNum(e.currentTarget.value);
                setHypPensionStr(n !== 0 ? n.toFixed(2) : "");
                setPensionFocused(true);
              }}
              onBlur={() => setPensionFocused(false)}
              onChange={(e) => setHypPensionStr(e.target.value)}
              style={useRealPension ? { opacity: 0.75, cursor: "default" } : undefined}
              aria-label="Annual pension used by the simulation"
            />
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
              {useRealPension ? "Real value — set in Pane 1" : "Hypothetical — Pane 1 unchanged"}
            </div>
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Pension Start Age</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="67"
              readOnly={useRealPension}
              value={pensionAgeStr}
              onChange={(e) => setHypPensionAgeStr(e.target.value)}
              style={useRealPension ? { opacity: 0.75, cursor: "default" } : undefined}
              aria-label="Pension start age used by the simulation"
            />
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
              {simAge > 0
                ? pension > 0
                  ? pensionAge > simAge
                    ? `Starts in ${pensionAge - simAge} year${pensionAge - simAge === 1 ? "" : "s"}`
                    : "Already in payment"
                  : "Enter pension amount to activate"
                : "Enter your current age above"}
            </div>
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Current Age{" "}
              {ageOverridden && (
                <span
                  style={{ color: "var(--accent-amber)", fontWeight: 700, fontSize: "0.65rem" }}
                  title="Overridden — not saved, will reset on refresh"
                >
                  ✎ what-if
                </span>
              )}
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="64"
              value={ageStr}
              onChange={(e) => setAgeStr(e.target.value)}
              aria-label="Current age used by the simulation"
            />
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
              {ageOverridden ? (
                <button
                  type="button"
                  onClick={() => {
                    setAgeStr(currentAge > 0 ? String(currentAge) : "");
                    ageSeedRef.current = currentAge;
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent-blue)",
                    padding: 0,
                    cursor: "pointer",
                    fontSize: "0.7rem",
                    textDecoration: "underline",
                  }}
                >
                  Reset to actual ({currentAge})
                </button>
              ) : (
                <>What-if only — does not change your real plan</>
              )}
            </div>
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Horizon Age{" "}
              {horizonAgeOverridden && (
                <span
                  style={{ color: "var(--accent-amber)", fontWeight: 700, fontSize: "0.65rem" }}
                  title="Overridden — not saved, will reset on refresh"
                >
                  ✎ what-if
                </span>
              )}
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="95"
              value={horizonAgeStr}
              onChange={(e) => setHorizonAgeStr(e.target.value)}
              aria-label="Horizon age used by the simulation"
            />
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
              {simHorizonAge > 0 && simAge > 0 && simHorizonAge <= simAge ? (
                <span style={{ color: "var(--accent-amber)" }}>
                  Must be after Current Age — using original horizon for now
                </span>
              ) : horizonAgeOverridden ? (
                <button
                  type="button"
                  onClick={() => {
                    setHorizonAgeStr(horizonAge > 0 ? String(horizonAge) : "");
                    horizonAgeSeedRef.current = horizonAge;
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent-blue)",
                    padding: 0,
                    cursor: "pointer",
                    fontSize: "0.7rem",
                    textDecoration: "underline",
                  }}
                >
                  Reset to actual ({horizonAge})
                </button>
              ) : (
                <>What-if only — does not change your real plan</>
              )}
            </div>
          </div>
          {/* Build 103 — Real Increase slider and the actual / hypothetical
              switch share one compact row. */}
          <div
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: "1 1 55%", minWidth: 180 }}>
              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Pension Real Increase %{" "}
                <span style={{ color: "var(--text-main)", fontWeight: 700 }}>{pensionIncreasePct.toFixed(1)}%</span>
                {!useRealPension && (
                  <span style={{ color: "var(--accent-amber)", fontWeight: 700, fontSize: "0.65rem" }}> ✎ what-if</span>
                )}
              </label>
              <input
                type="range"
                min={0}
                max={6}
                step={0.1}
                value={pensionIncreasePct}
                disabled={useRealPension}
                onChange={(e) => setHypPensionIncreasePct(parseFloat(e.target.value) || 0)}
                style={{ width: "100%" }}
                aria-label="Assumed pension annual real increase used by the simulation"
              />
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                {useRealPension
                  ? `Real value — set in Pane 1 (0% = flat-real)`
                  : `Hypothetical real growth in today's ${currency}`}
              </div>
            </div>
            <div style={{ flex: "0 0 auto" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Pension data</label>
              <span
                style={{
                  display: "inline-flex",
                  gap: 4,
                  padding: 2,
                  border: "1px solid var(--border-color)",
                  borderRadius: 6,
                }}
                title="Actual Pension = read Pane 1's actual pension live. Hypothetical = edit freely here; Pane 1 is never changed."
              >
                <button
                  type="button"
                  className={useRealPension ? "" : "secondary"}
                  style={{ fontSize: "0.7rem", padding: "0.25rem 0.5rem" }}
                  aria-pressed={useRealPension}
                  onClick={() => setUseRealPension(true)}
                >
                  Actual Pension
                </button>
                <button
                  type="button"
                  className={!useRealPension ? "" : "secondary"}
                  style={{ fontSize: "0.7rem", padding: "0.25rem 0.5rem" }}
                  aria-pressed={!useRealPension}
                  onClick={enterHypotheticalPension}
                >
                  Hypothetical
                </button>
              </span>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                {useRealPension ? "Live from Pane 1" : "Independent — Pane 1 unchanged"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="mc-compact"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "0.6rem 0.75rem",
          marginBottom: "1rem",
        }}
      >
        {/* Row 1: inputs */}
        <div>
          <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Annual Withdrawal {currency}{" "}
            {withdrawOverridden && (
              <span
                style={{ color: "var(--accent-amber)", fontWeight: 700, fontSize: "0.65rem" }}
                title="Overridden — not saved, will reset on refresh"
              >
                ✎ what-if
              </span>
            )}
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder={`${currency}0.00`}
            value={withdrawFocused ? withdrawStr : withdrawStr ? formatGBP(cleanNum(withdrawStr)) : ""}
            onFocus={(e) => {
              const n = cleanNum(e.currentTarget.value);
              setWithdrawStr(n !== 0 ? n.toFixed(2) : "");
              setWithdrawFocused(true);
            }}
            onBlur={() => setWithdrawFocused(false)}
            onChange={(e) => setWithdrawStr(e.target.value)}
          />
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
            {withdrawOverridden ? (
              <button
                type="button"
                onClick={() => {
                  setWithdrawStr(annualWithdrawal > 0 ? annualWithdrawal.toFixed(2) : "");
                  seededRef.current = annualWithdrawal;
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent-blue)",
                  padding: 0,
                  cursor: "pointer",
                  fontSize: "0.7rem",
                  textDecoration: "underline",
                }}
              >
                Reset to actual ({formatGBP(annualWithdrawal)})
              </button>
            ) : (
              <>What-if only — does not change ledger</>
            )}
          </div>
        </div>
        <div>
          <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Global Equities Pot {currency}{" "}
            {equitiesOverridden && (
              <span
                style={{ color: "var(--accent-amber)", fontWeight: 700, fontSize: "0.65rem" }}
                title="Overridden — not saved, will reset on refresh"
              >
                ✎ what-if
              </span>
            )}
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder={`${currency}0.00`}
            value={equitiesFocused ? equitiesStr : equitiesStr ? formatGBP(cleanNum(equitiesStr)) : ""}
            onFocus={(e) => {
              const n = cleanNum(e.currentTarget.value);
              setEquitiesStr(n !== 0 ? n.toFixed(2) : "");
              setEquitiesFocused(true);
            }}
            onBlur={() => setEquitiesFocused(false)}
            onChange={(e) => setEquitiesStr(e.target.value)}
          />
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
            {equitiesOverridden ? (
              <button
                type="button"
                onClick={() => {
                  setEquitiesStr(livEquities > 0 ? livEquities.toFixed(2) : "");
                  equitiesSeedRef.current = livEquities;
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent-blue)",
                  padding: 0,
                  cursor: "pointer",
                  fontSize: "0.7rem",
                  textDecoration: "underline",
                }}
              >
                Reset to actual ({formatGBP(livEquities)})
              </button>
            ) : (
              <>Volatile bucket — random walk</>
            )}
          </div>
        </div>
        <div>
          <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Cash Pot {currency}{" "}
            {cashOverridden && (
              <span
                style={{ color: "var(--accent-amber)", fontWeight: 700, fontSize: "0.65rem" }}
                title="Overridden — not saved, will reset on refresh"
              >
                ✎ what-if
              </span>
            )}
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder={`${currency}0.00`}
            value={cashFocused ? cashStr : cashStr ? formatGBP(cleanNum(cashStr)) : ""}
            onFocus={(e) => {
              const n = cleanNum(e.currentTarget.value);
              setCashStr(n !== 0 ? n.toFixed(2) : "");
              setCashFocused(true);
            }}
            onBlur={() => setCashFocused(false)}
            onChange={(e) => setCashStr(e.target.value)}
          />
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
            {cashOverridden ? (
              <button
                type="button"
                onClick={() => {
                  setCashStr(livCash > 0 ? livCash.toFixed(2) : "");
                  cashSeedRef.current = livCash;
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent-blue)",
                  padding: 0,
                  cursor: "pointer",
                  fontSize: "0.7rem",
                  textDecoration: "underline",
                }}
              >
                Reset to actual ({formatGBP(livCash)})
              </button>
            ) : (
              <>Defensive buffer — refill target</>
            )}
          </div>
        </div>

        {/* Row 2: sliders, aligned beneath their related input */}
        <div>
          <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Inflation / Escalation %{" "}
            <span style={{ color: "var(--text-main)", fontWeight: 700 }}>{inflationPct.toFixed(1)}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={5}
            step={0.1}
            value={inflationPct}
            onChange={(e) => setInflationPct(parseFloat(e.target.value) || 0)}
            style={{ width: "100%" }}
            aria-label="Yearly withdrawal increase rate"
          />
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
            Chart shown in today's {currency === "£" ? "pounds" : currency === "€" ? "euros" : "dollars"}
          </div>
        </div>
        {/* Assumed Growth Rate — independent of Pane 1, sits below Equities */}
        <div>
          <label
            style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}
            title="Moves only the dashed 'Assumed Rate' line. Does not change how fast Equities grow in the Fan Chart — only nudges when the simulation switches to spending from Cash."
          >
            Shown on chart as <DashedLineIcon /> Assumed Real Growth Rate %{" "}
            <span style={{ color: "var(--text-main)", fontWeight: 700 }}>{deterministicRatePct.toFixed(1)}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={20}
            step={0.1}
            value={deterministicRatePct}
            onChange={(e) => setDeterministicRatePct(parseFloat(e.target.value) || 0)}
            style={{ width: "100%" }}
            aria-label="Simulator assumed real growth rate"
          />
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
            Real (after-inflation) growth assumed for the Global Equities Pot
          </div>
        </div>
        {/* Cash Real Return — independent of Pane 1, sits below Cash Pot */}
        <div>
          <label
            style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}
            title="Directly changes how fast the Cash Pot grows every year, in every one of the 10,000 simulated futures. Moves the Fan Chart and Median directly."
          >
            Cash Real Return %{" "}
            <span style={{ color: "var(--text-main)", fontWeight: 700 }}>{cashRealPct.toFixed(1)}%</span>
          </label>

          <input
            type="range"
            min={0}
            max={3}
            step={0.1}
            value={cashRealPct}
            onChange={(e) => setCashRealPct(parseFloat(e.target.value) || 0)}
            style={{ width: "100%" }}
            aria-label="Simulator cash pot real return"
          />
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
            Real (after-inflation) return assumed on the Cash Pot
          </div>
        </div>
      </div>

      {/* Defensive-draw threshold — cash real return is now inline above with the other sliders */}
      <div
        style={{
          marginBottom: "1rem",
          padding: "0.6rem 0.75rem",
          background: "rgba(59,130,246,0.05)",
          border: "1px solid var(--border-color)",
          borderRadius: 8,
        }}
      >
        <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          Defensive draw threshold{" "}
          <span style={{ color: "var(--accent-blue)", fontWeight: 700, fontSize: "0.7rem" }}>
            · avg {avgDefensiveYears.toFixed(1)} of {yrs} yrs ({defensivePct}%) draw from cash
          </span>
        </label>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.2rem" }}>
          {(
            [
              ["strict", "Strict", "draw cash only in real drawdowns below −5%"],
              [
                "standard",
                "Standard",
                "draw cash in flat or weak-positive real years (below half the expected hurdle)",
              ],
              ["aggressive", "Aggressive", "draw cash unless real returns clearly clear the expected hurdle"],
            ] as [ThresholdMode, string, string][]
          ).map(([id, label, tip]) => (
            <button
              key={id}
              type="button"
              className={threshold === id ? "" : "secondary"}
              style={{ fontSize: "0.72rem", padding: "0.35rem 0.6rem" }}
              onClick={() => setThreshold(id)}
              title={tip}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
          {threshold === "strict"
            ? "Strict — spend from cash only when real equity return is below −5% (serious drawdown years)."
            : threshold === "standard"
              ? "Standard — spend from cash whenever real equity return is below HALF the expected hurdle (flat / weak-positive years). Refill only in clearly strong years."
              : "Aggressive — spend from cash unless real equity return cleanly exceeds the expected-return hurdle."}
        </div>
      </div>

      <div
        style={{
          fontSize: "0.72rem",
          color: "var(--text-muted)",
          fontStyle: "italic",
          marginBottom: "0.35rem",
        }}
      >
        Tip: drag the handles below the chart to zoom into a time window. Hover the chart for exact values.
      </div>

      <div ref={chartWrapRef} style={{ position: "relative", width: "100%", height: 360 }}>
        <svg
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
          style={{ width: "100%", height: "100%", overflow: "visible" }}
          role="img"
          aria-label="Monte Carlo fan chart"
        >
          {gridLines}
          <path
            d={pathFromTo(
              (b) => b.p10,
              (b) => b.p90,
            )}
            fill="var(--accent-blue)"
            opacity={0.12}
          />
          <path
            d={pathFromTo(
              (b) => b.p25,
              (b) => b.p75,
            )}
            fill="var(--accent-blue)"
            opacity={0.22}
          />
          <path d={median} fill="none" stroke="var(--accent-blue)" strokeWidth={2} />
          <path d={detPath} fill="none" stroke="var(--text-main)" strokeWidth={2.5} strokeDasharray="6,4" />
          <line x1={pL} y1={h - pB} x2={w - pR} y2={h - pB} stroke="var(--border-color)" opacity={0.6} />
          {xTicks}
          {hoverX != null && hoverBand && hoverDet != null && (
            <g pointerEvents="none">
              <line
                x1={hoverX}
                y1={pT}
                x2={hoverX}
                y2={h - pB}
                stroke="#94a3b8"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <circle cx={hoverX} cy={getY(hoverBand.p90)} r={3.5} fill="var(--accent-blue)" opacity={0.7} />
              <circle cx={hoverX} cy={getY(hoverBand.p10)} r={3.5} fill="var(--accent-blue)" opacity={0.7} />
              <circle cx={hoverX} cy={getY(hoverBand.p50)} r={4} fill="var(--accent-blue)" />
              <circle cx={hoverX} cy={getY(hoverDet)} r={4} fill="var(--text-main)" />
            </g>
          )}
          <rect
            x={pL}
            y={pT}
            width={w - pL - pR}
            height={h - pT - pB}
            fill="transparent"
            style={{ cursor: "crosshair" }}
            onPointerMove={handleChartPointerMove}
            onPointerLeave={handleChartPointerLeave}
          />
        </svg>

        {hoverAbs != null &&
          hoverBand &&
          hoverDet != null &&
          (() => {
            const leftPct = ((hoverAbs - z0) / span) * (100 - ((pL + pR) / w) * 100) + (pL / w) * 100;
            // Edge-aware flip: the tooltip keeps a FIXED width and swaps to the
            // left of the cursor once there isn't room on the right, instead of
            // being squeezed by the container edge.
            const TT_WIDTH = 280;
            const containerPx = chartWrapRef.current?.clientWidth ?? w;
            const cursorPx = (leftPct / 100) * containerPx;
            const flip = cursorPx + 12 + TT_WIDTH > containerPx - 4;
            return (
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  left: `${leftPct}%`,
                  transform: flip ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
                  pointerEvents: "none",
                  background: "rgba(15,23,42,0.92)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 8,
                  padding: "0.5rem 0.7rem",
                  fontSize: "0.78rem",
                  width: TT_WIDTH,
                  maxWidth: "none",
                  whiteSpace: "nowrap",
                  color: "var(--text-main)",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
                  zIndex: 5,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  {(auditMode ? AUDIT.age : simAge) > 0
                    ? `Age ${(auditMode ? AUDIT.age : simAge) + hoverAbs}`
                    : `Year +${hoverAbs}`}
                </div>
                {(() => {
                  // Build 124 — drawdown context at the hovered age, using the
                  // exact same net-draw formula the simulation itself uses
                  // (see netDraw a few hundred lines up): withdraw minus
                  // whatever pension has started paying by this age, floored
                  // at zero. Purely informational -- doesn't change the sim.
                  const ageAtHover = (auditMode ? AUDIT.age : simAge) + hoverAbs;
                  const pensG = Math.max(0, pensionIncreasePct) / 100;
                  const pensionAtHover =
                    pension > 0 && ageAtHover >= pensionAge ? pension * Math.pow(1 + pensG, hoverAbs) : 0;
                  const netDrawAtHover = Math.max(0, withdraw - pensionAtHover);
                  const rows = [{ label: "Annual Drawdown", value: withdraw }];
                  if (pensionAtHover > 0) {
                    rows.push(
                      { label: "− State Pension", value: pensionAtHover },
                      { label: "= Net Draw from Pot", value: netDrawAtHover },
                    );
                  }
                  return (
                    <div
                      style={{
                        paddingBottom: 4,
                        marginBottom: 4,
                        borderBottom: "1px solid var(--border-color)",
                      }}
                    >
                      {rows.map((row) => (
                        <div
                          key={row.label}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 10,
                            padding: "1px 0",
                          }}
                        >
                          <span style={{ color: "var(--text-muted)" }}>{row.label}</span>
                          <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                            {formatGBP(row.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                {[
                  {
                    label: `Assumed Rate`,
                    sub: `(blended, real): ${blendedAssumedPct.toFixed(2)}%`,
                    value: hoverDet,
                    color: "var(--text-main)",
                    dashed: true,
                  },
                  {
                    label: "90th percentile",
                    value: hoverBand.p90,
                    color: "var(--accent-blue)",
                    opacity: 0.55,
                  },
                  { label: "Median Path", value: hoverBand.p50, color: "var(--accent-blue)" },
                  {
                    label: "10th percentile",
                    value: hoverBand.p10,
                    color: "var(--accent-blue)",
                    opacity: 0.55,
                  },
                ].map((row) => (
                  <div key={row.label}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                        padding: "1px 0",
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span
                          style={{
                            display: "inline-block",
                            width: 10,
                            height: row.dashed ? 0 : 3,
                            borderTop: row.dashed ? "2px dashed var(--text-main)" : "none",
                            background: row.dashed ? "transparent" : (row.color as string),
                            opacity: row.opacity ?? 1,
                            borderRadius: 1,
                          }}
                        />
                        <span style={{ color: "var(--text-muted)" }}>{row.label}</span>
                      </span>
                      <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        {formatGBP(row.value)}
                      </span>
                    </div>
                    {row.sub && (
                      <div
                        style={{
                          paddingLeft: 16,
                          marginTop: -1,
                          marginBottom: 2,
                          color: "var(--text-muted)",
                          fontSize: "0.7rem",
                        }}
                      >
                        {row.sub}
                      </div>
                    )}
                  </div>
                ))}

                {(() => {
                  // Build 124 — Fun Bucket equivalent, mirroring engine.ts's
                  // surplus formula from Pane 2 (Fun Bucket Balance): total
                  // capital minus the present-value cost of funding the
                  // remaining withdrawal years, annuity-due. Uses the Median
                  // path as "current position" and this tool's own Assumed
                  // Rate as the discount rate -- the Risk Simulator has no
                  // per-year equities/cash split or Legacy Target input to
                  // draw a byte-identical blended rate from, so this is the
                  // closest faithful equivalent available here, not a
                  // literal copy of Pane 2's exact calc.
                  const inflLocal = Math.max(0, inflationPct) / 100;
                  const detRNominalLocal = deterministicRatePct / 100;
                  const detRRealLocal = inflLocal > 0 ? (1 + detRNominalLocal) / (1 + inflLocal) - 1 : detRNominalLocal;
                  const ageAtHoverFb = (auditMode ? AUDIT.age : simAge) + hoverAbs;
                  const remainingYears = Math.max(0, simHorizonAge - ageAtHoverFb);
                  const baselineNeed =
                    detRRealLocal > 0
                      ? withdraw *
                        ((1 - Math.pow(1 + detRRealLocal, -remainingYears)) / detRRealLocal) *
                        (1 + detRRealLocal)
                      : withdraw * remainingYears;
                  const funBucket = hoverBand.p50 - baselineNeed;
                  return (
                    <div
                      style={{
                        marginTop: 4,
                        paddingTop: 4,
                        borderTop: "1px solid var(--border-color)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <span style={{ color: "var(--text-muted)" }}>Fun Bucket (Median, approx.)</span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          color: funBucket > 0 ? "var(--accent-purple)" : "var(--text-muted)",
                        }}
                      >
                        {formatGBP(Math.max(0, funBucket))}
                      </span>
                    </div>
                  );
                })()}

                {/* Build 102 — show which engine generated these figures. */}
                <div
                  style={{
                    marginTop: 4,
                    paddingTop: 4,
                    borderTop: "1px solid var(--border-color)",
                    color: "var(--text-muted)",
                    fontSize: "0.7rem",
                  }}
                >
                  Mode: {mode === "parametric" ? "Parametric" : "Historical"}
                </div>
              </div>
            );
          })()}
      </div>

      {yrs >= 3 && (
        <div style={{ width: "100%", marginTop: "0.4rem" }}>
          <svg
            viewBox={`0 0 ${w} ${brushH}`}
            style={{ width: "100%", height: brushH, display: "block", touchAction: "none" }}
            onPointerMove={moveBrushDrag}
            onPointerUp={endBrushDrag}
            onPointerCancel={endBrushDrag}
            onDoubleClick={handleBrushDoubleClick}
            role="group"
            aria-label="Chart zoom brush"
          >
            <rect
              x={pL}
              y={brushPT}
              width={brushW}
              height={brushTrackH}
              fill="var(--bg-panel, rgba(15,23,42,0.6))"
              stroke="var(--border-color)"
              strokeWidth={1}
              rx={4}
            />
            <path d={brushBandPath} fill="var(--accent-blue)" opacity={0.18} />
            <path d={brushMedianPath} fill="none" stroke="var(--accent-blue)" strokeWidth={1} opacity={0.6} />
            {/* dim outside-window regions */}
            <rect x={pL} y={brushPT} width={brushXFor(z0) - pL} height={brushTrackH} fill="rgba(15,23,42,0.55)" />
            <rect
              x={brushXFor(z1)}
              y={brushPT}
              width={pL + brushW - brushXFor(z1)}
              height={brushTrackH}
              fill="rgba(15,23,42,0.55)"
            />
            {/* selected window outline */}
            <rect
              x={brushXFor(z0)}
              y={brushPT}
              width={brushXFor(z1) - brushXFor(z0)}
              height={brushTrackH}
              fill="transparent"
              stroke="var(--accent-blue)"
              strokeWidth={1}
              opacity={0.7}
              onPointerDown={(e) => startBrushDrag(e, "window")}
              style={{ cursor: "grab" }}
            />
            {/* left handle */}
            <g
              transform={`translate(${brushXFor(z0) - 5}, ${brushPT})`}
              onPointerDown={(e) => startBrushDrag(e, "left")}
              tabIndex={0}
              role="slider"
              aria-label="Zoom window start"
              aria-valuemin={0}
              aria-valuemax={z1 - 2}
              aria-valuenow={z0}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") nudgeHandle("left", -1);
                else if (e.key === "ArrowRight") nudgeHandle("left", 1);
              }}
              style={{ cursor: "ew-resize" }}
            >
              <rect
                width={10}
                height={brushTrackH}
                rx={3}
                fill="var(--accent-blue)"
                stroke="var(--border-color)"
                strokeWidth={1}
              />
              <line
                x1={5}
                y1={brushTrackH * 0.3}
                x2={5}
                y2={brushTrackH * 0.7}
                stroke="rgba(255,255,255,0.55)"
                strokeWidth={1}
              />
            </g>
            {/* right handle */}
            <g
              transform={`translate(${brushXFor(z1) - 5}, ${brushPT})`}
              onPointerDown={(e) => startBrushDrag(e, "right")}
              tabIndex={0}
              role="slider"
              aria-label="Zoom window end"
              aria-valuemin={z0 + 2}
              aria-valuemax={yrs}
              aria-valuenow={z1}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") nudgeHandle("right", -1);
                else if (e.key === "ArrowRight") nudgeHandle("right", 1);
              }}
              style={{ cursor: "ew-resize" }}
            >
              <rect
                width={10}
                height={brushTrackH}
                rx={3}
                fill="var(--accent-blue)"
                stroke="var(--border-color)"
                strokeWidth={1}
              />
              <line
                x1={5}
                y1={brushTrackH * 0.3}
                x2={5}
                y2={brushTrackH * 0.7}
                stroke="rgba(255,255,255,0.55)"
                strokeWidth={1}
              />
            </g>
          </svg>
          <div
            style={{
              fontSize: "0.68rem",
              color: "var(--text-muted)",
              display: "flex",
              justifyContent: "space-between",
              marginTop: 2,
            }}
          >
            <span>
              Window:{" "}
              {(auditMode ? AUDIT.age : simAge) > 0
                ? `age ${(auditMode ? AUDIT.age : simAge) + z0}–${(auditMode ? AUDIT.age : simAge) + z1}`
                : `+${z0}y–+${z1}y`}{" "}
              ({span} yrs)
            </span>
            <span>Double-click brush to reset</span>
          </div>
        </div>
      )}

      <div className="chart-legend" style={{ marginTop: "0.5rem" }}>
        <div className="legend-item">
          <div
            className="legend-line"
            style={{
              backgroundColor: "var(--accent-blue)",
              opacity: 0.22,
              height: 10,
              width: 18,
              borderRadius: 2,
            }}
          />
          10–90th percentile
        </div>
        <div className="legend-item">
          <div className="legend-line" style={{ backgroundColor: "var(--accent-blue)" }} />
          Median path
        </div>
        <div className="legend-item">
          <div className="legend-line" style={{ borderTop: "3px dashed var(--text-main)", height: 0 }} />
          Assumed Rate (blended, real): {blendedAssumedPct.toFixed(2)}%
        </div>
      </div>

      <div
        style={{
          marginTop: "1rem",
          padding: "0.85rem 1rem",
          background: "rgba(59,130,246,0.08)",
          border: "1px solid var(--border-color)",
          borderRadius: 8,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "0.75rem",
          fontSize: "0.85rem",
        }}
      >
        <div>
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "0.72rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Sims beating your assumption
          </div>
          <div style={{ color: rankColor, fontWeight: 800, fontSize: "1.1rem" }}>{beatRate}%</div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{rankLabel}</div>
        </div>
        <div>
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "0.72rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Median ending value
          </div>
          <div style={{ fontWeight: 700 }}>{formatGBP(bands[yrs].p50)}</div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
            after {yrs} years (today's {currency})
          </div>
        </div>
        <div>
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "0.72rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            10th – 90th range
          </div>
          <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>
            {formatGBP(bands[yrs].p10)} – {formatGBP(bands[yrs].p90)}
          </div>
        </div>
        <div>
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "0.72rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Capital preserved
          </div>
          <div style={{ fontWeight: 700 }}>{successRate}% of runs</div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>ended ≥ starting capital</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
          <div>
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: "0.72rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Ruin rate
            </div>
            <div
              style={{
                fontWeight: 700,
                color:
                  ruinRate >= 50 ? "var(--accent-red)" : ruinRate >= 25 ? "var(--accent-amber)" : "var(--text-main)",
              }}
            >
              {ruinRate}% of runs
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>ran out of money</div>
          </div>
          {/* Build 101 — About button sits beside Ruin rate, inside the stats row. */}
          <button
            type="button"
            className="secondary"
            style={{
              fontSize: "0.7rem",
              padding: "0.2rem 0.6rem",
              alignSelf: "center",
              whiteSpace: "nowrap",
            }}
            aria-expanded={showAbout}
            onClick={() => setShowAbout((v) => !v)}
          >
            {showAbout ? "Hide About" : "About these figures"}
          </button>
        </div>
      </div>
      <div style={{ marginTop: "0.6rem" }} />
      {showAbout && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.6rem 0.75rem",
            background: "rgba(59,130,246,0.05)",
            border: "1px solid var(--border-color)",
            borderRadius: 8,
            color: "var(--text-muted)",
            fontSize: "0.72rem",
            lineHeight: 1.6,
          }}
        >
          {RUNS.toLocaleString()} simulated paths •{" "}
          {mode === "historical"
            ? "Bootstrap from MSCI World NTR (GBP) annual returns 1970–2024"
            : `Normal returns: μ ${meanPct}%, σ ${stdevPct}%`}{" "}
          • Withdrawal escalates {inflationPct.toFixed(1)}%/yr (nominal), pension grows {pensionIncreasePct.toFixed(1)}
          %/yr (real, today's {currency}) •{" "}
          {tickMode === "quarterly"
            ? "Quarterly tick — Guyton-Klinger ±10% re-checked every quarter"
            : "Yearly tick — one G-K check per year"}{" "}
          • Seeded RNG — slider drags are smooth • Hypothetical — not advice.
        </div>
      )}

      {/* Allocation bias slider — rebalance Equities↔Cash while preserving total */}
      {simCapital > 0 &&
        (() => {
          const eqPct = Math.round((simEquities / simCapital) * 1000) / 10;
          const liveTotal = livEquities + livCash;
          const liveEqPct = liveTotal > 0 ? Math.round((livEquities / liveTotal) * 1000) / 10 : 50;
          const splitOverridden = Math.abs(eqPct - liveEqPct) > 0.05;
          return (
            <div
              style={{
                marginBottom: "0.75rem",
                padding: "0.45rem 0.7rem",
                background: "rgba(245,158,11,0.04)",
                border: "1px solid var(--border-color)",
                borderRadius: 8,
              }}
            >
              {/* Build 099 — compact: title, live split and reset all share one line. */}
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-main)" }}>
                  Allocation Bias{" "}
                  <span style={{ color: "var(--accent-blue)", fontWeight: 700, fontSize: "0.72rem" }}>
                    {eqPct.toFixed(1)}% Equities / {(100 - eqPct).toFixed(1)}% Cash
                  </span>
                </span>
                {splitOverridden && (
                  <button
                    type="button"
                    onClick={() => {
                      setEquitiesStr(livEquities > 0 ? livEquities.toFixed(2) : "");
                      setCashStr(livCash > 0 ? livCash.toFixed(2) : "");
                      equitiesSeedRef.current = livEquities;
                      cashSeedRef.current = livCash;
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--accent-blue)",
                      padding: 0,
                      cursor: "pointer",
                      fontSize: "0.7rem",
                      textDecoration: "underline",
                      // Build 116 — keep the longer wording on a single line; the
                      // parent row already wraps, so it drops below if space is tight.
                      whiteSpace: "nowrap",
                    }}
                  >
                    Reset to starting split &amp; actual values ({liveEqPct.toFixed(1)}% /{" "}
                    {(100 - liveEqPct).toFixed(1)}%)
                  </button>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>← Cash</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={eqPct}
                  onChange={(e) => {
                    const pct = parseFloat(e.target.value) || 0;
                    const total = simCapital;
                    const newEq = total * (pct / 100);
                    const newCash = total - newEq;
                    setEquitiesStr(newEq.toFixed(2));
                    setCashStr(newCash.toFixed(2));
                  }}
                  style={{ flex: 1 }}
                  aria-label="Allocation bias"
                />
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Equities →</span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                  Total pot fixed at {formatGBP(simCapital)}
                </span>
              </div>
            </div>
          );
        })()}

      {/* Future extraordinary inflow (windfall injected mid-simulation). */}
      <div
        style={{
          marginBottom: "1rem",
          padding: "0.7rem 0.85rem",
          background: "rgba(16,185,129,0.05)",
          border: "1px solid var(--border-color)",
          borderRadius: 8,
        }}
      >
        {/* Build 099 — title and helper text share one line to save vertical space. */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginBottom: "0.4rem",
          }}
        >
          <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-main)" }}>
            Future Extraordinary Inflow
          </span>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontStyle: "italic" }}>
            Property sale, inheritance, etc. — a flat amount in today's purchasing power, injected at the end of year N
            and re-anchoring the ATH.
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.85rem" }}>
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Amount ({currency})</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder={`${currency}0.00`}
              value={inflowFocused ? inflowAmtStr : inflowAmtStr ? formatGBP(cleanNum(inflowAmtStr)) : ""}
              onFocus={(e) => {
                const n = cleanNum(e.currentTarget.value);
                setInflowAmtStr(n !== 0 ? n.toFixed(2) : "");
                setInflowFocused(true);
              }}
              onBlur={() => setInflowFocused(false)}
              onChange={(e) => setInflowAmtStr(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Inflow Timeline (Years from Now)</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="5"
              value={inflowYearStr}
              onChange={(e) => setInflowYearStr(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Destination</label>
            <div style={{ display: "flex", gap: 4, marginTop: "0.35rem" }}>
              {(["equities", "cash"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={inflowDest === d ? "" : "secondary"}
                  style={{
                    fontSize: "0.7rem",
                    padding: "0.25rem 0.5rem",
                    textTransform: "capitalize",
                  }}
                  aria-pressed={inflowDest === d}
                  onClick={() => setInflowDest(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {auditMode && (
        <div
          style={{
            marginTop: "1rem",
            border: "1px solid var(--accent-purple)",
            borderRadius: "0.4rem",
            padding: "0.75rem",
            background: "rgba(168,85,247,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
              marginBottom: "0.5rem",
            }}
          >
            <div style={{ fontWeight: 700, color: "var(--accent-purple)" }}>
              Audit Ledger — Step-by-step, Age {AUDIT.age} → {AUDIT.age + 30} (
              {tickMode === "quarterly" ? "120 quarterly rows" : "30 yearly rows"}, 2 dp for pocket-calculator
              reproduction)
            </div>
            <button
              type="button"
              style={{
                fontSize: "0.8rem",
                padding: "0.5rem 0.9rem",
                fontWeight: 700,
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
              onClick={() => {
                const returnSource = mode; // "historical" | "parametric"
                const ageRange = `age${AUDIT.age}-${AUDIT.age + 30}`;
                const metadata: Record<string, string | number> = {
                  "Return source": returnSource,
                  "Tick mode": tickMode,
                  "Draw mode": threshold,
                  "Starting Equity": AUDIT.E0.toFixed(2),
                  "Starting Cash": AUDIT.C0.toFixed(2),
                  "Annual Withdrawal": AUDIT.withdraw.toFixed(2),
                  "Pension Amount": AUDIT.pension.toFixed(2),
                  "Pension Start Age": AUDIT.pensionAge,
                  "Inflation Rate": (AUDIT.infl * 100).toFixed(4) + "%",
                  "Cash Real Return": (AUDIT.cashReal * 100).toFixed(4) + "%",
                  "Start Age": AUDIT.age,
                  "End Age": AUDIT.age + 30,
                };
                if (returnSource === "parametric") {
                  metadata["Parametric Mean (nominal)"] = (AUDIT.meanNom * 100).toFixed(4) + "%";
                  metadata["Parametric Sigma"] = "0 (deterministic flat return in audit)";
                } else {
                  metadata["Historical Bootstrap Start Year"] = 1973;
                }
                exportLedgerCSV(
                  auditSim.steps,
                  [
                    { header: "Interval/Age", value: (s) => `${s.interval} · Age ${s.age}` },
                    { header: "Start Eq", value: (s) => s.startE.toFixed(2) },
                    { header: "Start Cash", value: (s) => s.startC.toFixed(2) },
                    { header: "Net Outflow", value: (s) => s.netOutflow.toFixed(2) },
                    { header: "Eq Ret %", value: (s) => s.equityPct.toFixed(4) },
                    { header: "Cash Ret %", value: (s) => s.cashPct.toFixed(4) },
                    { header: "G-K Rule", value: (s) => s.gk },
                    { header: "End Eq", value: (s) => s.endE.toFixed(2) },
                    { header: "End Cash", value: (s) => s.endC.toFixed(2) },
                  ],
                  metadata,
                  {
                    returnSource,
                    tickMode,
                    drawMode: threshold,
                    ageRange,
                    prefix: "sovereign-audit",
                  },
                );
              }}
            >
              <span aria-hidden="true" style={{ fontSize: "0.9rem", lineHeight: 1 }}>
                ⬇
              </span>
              Download Ledger (CSV)
            </button>
          </div>
          <div style={{ maxHeight: 380, overflowY: "auto", overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.75rem",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <thead>
                <tr style={{ background: "var(--bg-2, rgba(255,255,255,0.04))" }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "0.35rem 0.5rem",
                      borderBottom: "1px solid var(--border-color)",
                    }}
                  >
                    Interval / Age
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "0.35rem 0.5rem",
                      borderBottom: "1px solid var(--border-color)",
                    }}
                  >
                    Start Eq
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "0.35rem 0.5rem",
                      borderBottom: "1px solid var(--border-color)",
                    }}
                  >
                    Start Cash
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "0.35rem 0.5rem",
                      borderBottom: "1px solid var(--border-color)",
                    }}
                  >
                    Net Outflow
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "0.35rem 0.5rem",
                      borderBottom: "1px solid var(--border-color)",
                    }}
                  >
                    Eq Ret %
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "0.35rem 0.5rem",
                      borderBottom: "1px solid var(--border-color)",
                    }}
                  >
                    Cash Ret %
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "0.35rem 0.5rem",
                      borderBottom: "1px solid var(--border-color)",
                    }}
                  >
                    G-K Rule
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "0.35rem 0.5rem",
                      borderBottom: "1px solid var(--border-color)",
                    }}
                  >
                    End Eq
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "0.35rem 0.5rem",
                      borderBottom: "1px solid var(--border-color)",
                    }}
                  >
                    End Cash
                  </th>
                </tr>
              </thead>
              <tbody>
                {auditSim.steps.map((s, i) => {
                  const cell: React.CSSProperties = {
                    padding: "0.3rem 0.5rem",
                    borderBottom: "1px solid var(--border-color)",
                  };
                  return (
                    <tr key={i}>
                      <td style={cell}>
                        {s.interval} · Age {s.age}
                      </td>
                      <td style={{ ...cell, textAlign: "right" }}>{s.startE.toFixed(2)}</td>
                      <td style={{ ...cell, textAlign: "right" }}>{s.startC.toFixed(2)}</td>
                      <td style={{ ...cell, textAlign: "right" }}>{s.netOutflow.toFixed(2)}</td>
                      <td style={{ ...cell, textAlign: "right" }}>{s.equityPct.toFixed(4)}</td>
                      <td style={{ ...cell, textAlign: "right" }}>{s.cashPct.toFixed(4)}</td>
                      <td style={cell}>{s.gk}</td>
                      <td style={{ ...cell, textAlign: "right" }}>{s.endE.toFixed(2)}</td>
                      <td style={{ ...cell, textAlign: "right" }}>{s.endC.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: "0.5rem", fontSize: "0.7rem", color: "var(--text-muted)" }}>
            {tickMode === "quarterly"
              ? `${auditSim.steps.length} quarterly steps shown (30 full years, Age ${AUDIT.age} → ${AUDIT.age + 30}). Eq Ret % = real per-quarter return applied to End Eq — ((1 + nominal)/(1 + 2.5% infl))^0.25 − 1 in parametric mode. Cash Ret % = (1 + 2.0%)^0.25 − 1.`
              : `${auditSim.steps.length} yearly steps shown (Age ${AUDIT.age} → ${AUDIT.age + auditSim.steps.length}). Eq Ret % = real return applied ((1 + nominal)/(1 + 2.5% infl) − 1). Cash Ret % = 2.0000 real.`}{" "}
            Pension of {currency}12,700 is held FLAT in real terms and offsets the withdrawal from Age 67 onward (Net
            Outflow = 36,000 − 12,700 = 23,300 yearly / 5,825 quarterly). Defensive draws:{" "}
            {auditSim.avgDefensiveYears.toFixed(1)} of {auditSim.yrs} yrs ({auditSim.defensivePct}%) sourced from Cash
            under <strong>{threshold}</strong> mode.
          </div>
        </div>
      )}
    </div>
  );
};
