import React, { useEffect, useMemo, useRef, useState } from "react";
import { cleanNum, formatGBP } from "@/lib/sovereign/engine";

// MSCI World Net Total Return, GBP-denominated, approximate annual returns
// 1970–2024 (decimal). Proxy for a UK investor holding a global tracker.
const GLOBAL_ANNUAL: number[] = [
  -0.03, 0.31, 0.16, -0.18, -0.25, 0.36, 0.36, -0.07, 0.06, 0.1, 0.26, 0.1, 0.21, 0.27, 0.31, 0.21,
  0.31, -0.04, 0.16, 0.34, -0.21, 0.16, 0.16, 0.27, -0.04, 0.18, 0.13, 0.15, 0.18, 0.34, -0.07,
  -0.13, -0.27, 0.2, 0.07, 0.24, 0.07, 0.09, -0.18, 0.16, 0.16, -0.04, 0.11, 0.25, 0.12, 0.05, 0.29,
  0.12, -0.03, 0.23, 0.13, 0.23, -0.08, 0.17, 0.21,
];

type Mode = "historical" | "parametric";
const RUNS = 2750;
const MC_KEY = "shd_mc_v1";

// Seeded PRNG (mulberry32) — deterministic so that small slider tweaks
// produce smooth deltas in the fan chart instead of re-rolling every path.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rng: () => number): number {
  let u = 0,
    v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined)
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  return sorted[base];
}

type PersistedMC = {
  meanStr?: string;
  stdevStr?: string;
  inflationPct?: number;
  pensionStr?: string;
  pensionAgeStr?: string;
  pensionIncreasePct?: number;
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
  startingCapital: number;
  years: number;
  deterministicRatePct: number;
  annualWithdrawal?: number;
  currentAge?: number;
  currency?: "£" | "€" | "$";
}

export const MonteCarloPanel: React.FC<MonteCarloPanelProps> = ({
  startingCapital,
  years,
  deterministicRatePct,
  annualWithdrawal = 0,
  currentAge = 0,
  currency = "£",
}) => {
  const persisted = useRef<PersistedMC>(loadMC());
  const p = persisted.current;

  const [mode, setMode] = useState<Mode>("historical");
  const [showHelp, setShowHelp] = useState(false);
  const [meanStr, setMeanStr] = useState<string>(p.meanStr ?? "7");
  const [stdevStr, setStdevStr] = useState<string>(p.stdevStr ?? "15");
  const meanPct = cleanNum(meanStr);
  const stdevPct = cleanNum(stdevStr);
  const [inflationPct, setInflationPct] = useState<number>(
    typeof p.inflationPct === "number" ? p.inflationPct : 2.5,
  );
  const [pensionStr, setPensionStr] = useState<string>(p.pensionStr ?? "");
  const [pensionFocused, setPensionFocused] = useState(false);
  const [pensionAgeStr, setPensionAgeStr] = useState<string>(p.pensionAgeStr ?? "67");
  const [pensionIncreasePct, setPensionIncreasePct] = useState<number>(
    typeof p.pensionIncreasePct === "number" ? p.pensionIncreasePct : 0,
  );
  const pension = cleanNum(pensionStr);
  const pensionAge = Math.max(0, Math.floor(cleanNum(pensionAgeStr)));

  // Persist sticky MC settings.
  useEffect(() => {
    saveMC({
      meanStr,
      stdevStr,
      inflationPct,
      pensionStr,
      pensionAgeStr,
      pensionIncreasePct,
    });
  }, [meanStr, stdevStr, inflationPct, pensionStr, pensionAgeStr, pensionIncreasePct]);

  const [withdrawStr, setWithdrawStr] = useState<string>(
    annualWithdrawal > 0 ? annualWithdrawal.toFixed(2) : "",
  );
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

  // Total Capital — seeded from live ledger value but freely editable for
  // "what if" experiments. Never persisted; resets to the real value on
  // refresh or when the ledger changes (provided the user hasn't overridden).
  const [capitalStr, setCapitalStr] = useState<string>(
    startingCapital > 0 ? startingCapital.toFixed(2) : "",
  );
  const [capitalFocused, setCapitalFocused] = useState(false);
  const capitalSeedRef = React.useRef<number>(startingCapital);
  useEffect(() => {
    if (cleanNum(capitalStr) === capitalSeedRef.current) {
      capitalSeedRef.current = startingCapital;
      setCapitalStr(startingCapital > 0 ? startingCapital.toFixed(2) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startingCapital]);
  const simCapital = cleanNum(capitalStr);
  const capitalOverridden = Math.abs(simCapital - startingCapital) > 0.005;


  // Pane 5 zoom brush + crosshair tooltip state.
  // zoom = [startYear, endYear] in absolute year-indices into bands[].
  const [zoom, setZoom] = useState<[number, number]>([0, 9999]);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const brushDragRef = useRef<null | "left" | "right" | "window">(null);
  const brushAnchorRef = useRef<{ startX: number; z0: number; z1: number } | null>(null);

  const sim = useMemo(() => {
    const yrs = Math.max(1, Math.min(60, Math.floor(years)));
    const start = Math.max(0, simCapital);
    if (start <= 0) return null;


    const mean = meanPct / 100;
    const sd = stdevPct / 100;
    const infl = Math.max(0, inflationPct) / 100;
    const pensG = Math.max(0, pensionIncreasePct) / 100;
    // Pension grows at pensG in REAL terms (today's £). Setting it to 0 gives
    // a flat-real pension. Setting it to e.g. 2% compounds visibly over the
    // horizon (~22% higher after 10 years from start age).
    const pensionRealFactor = 1 + pensG;

    // Stable seed: depends only on inputs that should change the underlying
    // random draws. The pension/withdrawal sliders deliberately do NOT seed
    // the RNG, so dragging them produces smooth deltas in the fan chart.
    const seed =
      0x9e3779b1 ^
      (Math.floor(start) >>> 0) ^
      ((yrs << 16) >>> 0) ^
      ((mode === "historical" ? 1 : 2) << 24) ^
      (Math.floor(mean * 1e6) >>> 0) ^
      (Math.floor(sd * 1e6) >>> 0);
    const rng = mulberry32(seed);

    const byYear: number[][] = Array.from({ length: yrs + 1 }, () => []);
    const finals: number[] = [];

    for (let r = 0; r < RUNS; r++) {
      let v = start;
      byYear[0].push(v);
      for (let y = 1; y <= yrs; y++) {
        let nominal: number;
        if (mode === "historical") {
          nominal = GLOBAL_ANNUAL[Math.floor(rng() * GLOBAL_ANNUAL.length)];
        } else {
          nominal = mean + sd * gaussian(rng);
        }
        const real = infl > 0 ? (1 + nominal) / (1 + infl) - 1 : nominal;
        const ageThisYear = currentAge + y - 1;
        // Pension escalates in real terms from the simulation start.
        const pensionThisYear =
          pension > 0 && ageThisYear >= pensionAge ? pension * Math.pow(pensionRealFactor, y) : 0;
        const netDraw = Math.max(0, withdraw - pensionThisYear);
        v = v * (1 + real) + contrib - netDraw;
        if (v < 0) v = 0;
        byYear[y].push(v);
      }
      finals.push(v);
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

    const det: number[] = [start];
    const rNominal = deterministicRatePct / 100;
    const rReal = infl > 0 ? (1 + rNominal) / (1 + infl) - 1 : rNominal;
    for (let y = 1; y <= yrs; y++) {
      const ageThisYear = currentAge + y - 1;
      const pensionThisYear =
        pension > 0 && ageThisYear >= pensionAge ? pension * Math.pow(pensionRealFactor, y) : 0;
      const netDraw = Math.max(0, withdraw - pensionThisYear);
      const next = det[y - 1] * (1 + rReal) + contrib - netDraw;
      det.push(next < 0 ? 0 : next);
    }

    const sortedFinals = [...finals].sort((a, b) => a - b);
    const detFinal = det[yrs];
    let below = 0;
    for (const f of sortedFinals) {
      if (f <= detFinal) below++;
      else break;
    }
    const pctRank = Math.round((below / sortedFinals.length) * 100);

    const successRate = Math.round(
      (sortedFinals.filter((f) => f >= start).length / sortedFinals.length) * 100,
    );

    const ruinRate = Math.round(
      (sortedFinals.filter((f) => f <= 0).length / sortedFinals.length) * 100,
    );
    const detRuined = detFinal <= 0;

    return { yrs, bands, det, pctRank, finals: sortedFinals, successRate, ruinRate, detRuined };
  }, [
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
    simCapital,
    years,
    deterministicRatePct,
  ]);


  if (!sim) {
    return (
      <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
        <h2 className="shd-h2">5. Risk Simulator — Monte Carlo Fan Chart</h2>
        <div style={{ color: "var(--text-muted)", padding: "1rem 0" }}>
          Add a ledger entry with capital to run the simulation.
        </div>
      </div>
    );
  }

  const { yrs, bands, det, pctRank, finals: _finals, successRate, ruinRate, detRuined } = sim;
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

  const pathFromTo = (
    lo: (b: (typeof bands)[number]) => number,
    hi: (b: (typeof bands)[number]) => number,
  ) => {
    const top = visibleBands
      .map((b, k) => `${k === 0 ? "M" : "L"}${getX(z0 + k)},${getY(hi(b))}`)
      .join(" ");
    const bot = [...visibleBands]
      .map((b, k) => ({ b, k }))
      .reverse()
      .map(({ b, k }) => `L${getX(z0 + k)},${getY(lo(b))}`)
      .join(" ");
    return `${top} ${bot} Z`;
  };

  const median = visibleBands
    .map((b, k) => `${k === 0 ? "M" : "L"}${getX(z0 + k)},${getY(b.p50)}`)
    .join(" ");
  const detPath = visibleDet
    .map((v, k) => `${k === 0 ? "M" : "L"}${getX(z0 + k)},${getY(v)}`)
    .join(" ");

  const gridLines: React.ReactElement[] = [];
  for (let i = 0; i <= 5; i++) {
    const val = minV + (rangeV / 5) * i;
    const y = getY(val);
    const lab =
      val >= 1_000_000
        ? `${currency}${(val / 1_000_000).toFixed(2)}M`
        : `${currency}${(val / 1000).toFixed(0)}k`;
    gridLines.push(
      <g key={`g${i}`}>
        <line
          x1={pL}
          y1={y}
          x2={w - pR}
          y2={y}
          stroke="var(--border-color)"
          strokeWidth={1}
          opacity={0.3}
        />
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
    const ageLabel = currentAge > 0 ? `${currentAge + i}` : `+${i}y`;
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

  const startBrushDrag = (
    e: React.PointerEvent<SVGElement>,
    which: "left" | "right" | "window",
  ) => {
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
  const brushTopY = (v: number) =>
    brushPT + brushTrackH - (Math.max(0, v) / brushMaxV) * brushTrackH;
  const brushBandPath = (() => {
    const top = bands
      .map((b, i) => `${i === 0 ? "M" : "L"}${brushXFor(i)},${brushTopY(b.p90)}`)
      .join(" ");
    const bot = [...bands]
      .map((b, i) => ({ b, i }))
      .reverse()
      .map(({ b, i }) => `L${brushXFor(i)},${brushTopY(b.p10)}`)
      .join(" ");
    return `${top} ${bot} Z`;
  })();
  const brushMedianPath = bands
    .map((b, i) => `${i === 0 ? "M" : "L"}${brushXFor(i)},${brushTopY(b.p50)}`)
    .join(" ");

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
        <h2 className="shd-h2" style={{ margin: 0 }}>
          5. Risk Simulator — Monte Carlo Fan Chart
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
            Parametric
          </button>
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
            We re-run your retirement <strong>2,750 times</strong> with fresh annual returns each
            run, then plot the spread. The point isn't to predict the future — it's to make the{" "}
            <em>shape</em> of uncertainty visible.
          </p>
          <p style={{ margin: "0 0 0.5rem" }}>
            <strong>Modes:</strong> <em>Historical</em> draws each year at random from real MSCI
            World (Net Total Return, GBP) annual returns 1970–2024 — a global-tracker proxy for a
            typical UK investor. <em>Parametric</em> manufactures returns from a normal curve with a
            mean and volatility you set.
          </p>
          <p style={{ margin: "0 0 0.5rem" }}>
            <strong>Yearly Withdrawal Increase Rate (0–5%):</strong> escalates your withdrawal
            smoothly each year. Returns are deflated by the same rate so the whole chart is in{" "}
            <strong>today's pounds</strong>.
          </p>
          <p style={{ margin: "0 0 0.5rem" }}>
            <strong>Annual Pension &amp; Pension Start Age:</strong> the pension amount (in today's
            money) is netted off your withdrawal once you reach the start age. Before that age, the
            full withdrawal comes from capital.
          </p>
          <p style={{ margin: "0 0 0.5rem" }}>
            <strong>Pension Real Annual Increase (0–6%):</strong> compounds the pension in{" "}
            <em>today's pounds</em> each year from the start date. 0% means a flat-real pension
            (purchasing power held constant). 2% means the pension's real value grows by 2% per year
            — roughly the gap between the UK triple-lock and CPI over the long run.
          </p>
          <p style={{ margin: "0 0 0.5rem" }}>
            <strong>The fan:</strong> light blue = 10–90th percentile, darker = 25–75th, solid =
            median, dashed = your deterministic projection at the Assumed Growth Rate.
          </p>
          <p style={{ margin: "0 0 0.5rem" }}>
            <strong>Zoom &amp; hover.</strong> Drag the handles on the strip below the chart to
            zoom into a time window — the Y-axis auto-rescales so short horizons no longer look
            flat. Drag the highlighted region to pan, double-click to reset. Hover (or touch)
            anywhere on the chart for a dashed crosshair and a tooltip card with Age, Assumed
            Growth, Median Path and the 10th/90th percentile values at that year.
          </p>

          <p style={{ margin: "0 0 0.5rem" }}>
            <strong>FAQ — why does the median sit below the dashed line at the same %?</strong>{" "}
            Volatility drag. The Expected Return is an <em>arithmetic</em> mean; what compounds
            over time is the <em>geometric</em> mean, ≈ μ − σ²/2. With σ=15%, that's ~1.13%/yr
            lower (so the median compounds at ~5.9%, not 7%). A +20% / −20% portfolio ends at
            0.96, not 1.00 — the bigger the swings, the bigger the gap.
          </p>
          <p style={{ margin: "0 0 0.5rem" }}>
            <strong>And the upper band looks wider than the lower band?</strong> Correct.
            Compounded returns are <em>log-normal</em>: the downside is bounded at zero (a 100%
            loss), the upside is unbounded. The fan is right-skewed by design — that's the honest
            shape of compounded risk, not a chart bug.
          </p>

          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.76rem" }}>
            <strong>Does NOT model:</strong> taxes, fees, your actual asset mix, behavioural cuts,
            or regime change. Stress test, not forecast.
          </p>
        </div>
      )}

      {mode === "parametric" && (
        <div
          className="mc-compact"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))",
            gap: "0.6rem",
            marginBottom: "0.6rem",
          }}
        >
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Expected Return %
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
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Volatility (StDev) %
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

      <div
        className="mc-compact"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
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
            value={
              withdrawFocused ? withdrawStr : withdrawStr ? formatGBP(cleanNum(withdrawStr)) : ""
            }
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
            Total Capital {currency}{" "}
            {capitalOverridden && (
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
            value={capitalFocused ? capitalStr : capitalStr ? formatGBP(cleanNum(capitalStr)) : ""}
            onFocus={(e) => {
              const n = cleanNum(e.currentTarget.value);
              setCapitalStr(n !== 0 ? n.toFixed(2) : "");
              setCapitalFocused(true);
            }}
            onBlur={() => setCapitalFocused(false)}
            onChange={(e) => setCapitalStr(e.target.value)}
          />
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
            {capitalOverridden ? (
              <button
                type="button"
                onClick={() => {
                  setCapitalStr(startingCapital > 0 ? startingCapital.toFixed(2) : "");
                  capitalSeedRef.current = startingCapital;
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
                Reset to actual ({formatGBP(startingCapital)})
              </button>
            ) : (
              <>What-if only — does not change ledger</>
            )}
          </div>
        </div>
        <div>

          <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Annual Pension {currency} (today's {currency})
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder={`${currency}0.00`}
            value={pensionFocused ? pensionStr : pensionStr ? formatGBP(cleanNum(pensionStr)) : ""}
            onFocus={(e) => {
              const n = cleanNum(e.currentTarget.value);
              setPensionStr(n !== 0 ? n.toFixed(2) : "");
              setPensionFocused(true);
            }}
            onBlur={() => setPensionFocused(false)}
            onChange={(e) => setPensionStr(e.target.value)}
          />
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
            Offsets withdrawal once received
          </div>
        </div>
        <div>
          <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Pension Start Age
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="67"
            value={pensionAgeStr}
            onChange={(e) => setPensionAgeStr(e.target.value)}
          />


          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
            {currentAge > 0
              ? pension > 0
                ? pensionAge > currentAge
                  ? `Starts in ${pensionAge - currentAge} year${pensionAge - currentAge === 1 ? "" : "s"}`
                  : "Already in payment"
                : "Enter pension amount to activate"
              : "Set your age in the ledger above"}
          </div>
        </div>

        {/* Row 2: sliders, aligned beneath their related input */}
        <div>
          <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Yearly Withdrawal Increase Rate %{" "}
            <span style={{ color: "var(--text-main)", fontWeight: 700 }}>
              {inflationPct.toFixed(1)}%
            </span>
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
            Chart shown in today's{" "}
            {currency === "£" ? "pounds" : currency === "€" ? "euros" : "dollars"}
          </div>
        </div>
        <div />
        <div>

          <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Pension Real Increase %{" "}
            <span style={{ color: "var(--text-main)", fontWeight: 700 }}>
              {pensionIncreasePct.toFixed(1)}%
            </span>
          </label>
          <input
            type="range"
            min={0}
            max={6}
            step={0.1}
            value={pensionIncreasePct}
            onChange={(e) => setPensionIncreasePct(parseFloat(e.target.value) || 0)}
            style={{ width: "100%" }}
            aria-label="Assumed state pension annual increase"
          />
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
            Real growth in today's {currency} (0% = flat-real)
          </div>
        </div>
        <div />
      </div>

      <div
        style={{
          fontSize: "0.72rem",
          color: "var(--text-muted)",
          fontStyle: "italic",
          marginBottom: "0.35rem",
        }}
      >
        Tip: drag the handles below the chart to zoom into a time window. Hover the chart for exact
        values.
      </div>

      <div style={{ position: "relative", width: "100%", height: 360 }}>
        <svg
          viewBox={`0 0 ${w} ${h}`}
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
          <path
            d={detPath}
            fill="none"
            stroke="var(--text-main)"
            strokeWidth={2.5}
            strokeDasharray="6,4"
          />
          <line
            x1={pL}
            y1={h - pB}
            x2={w - pR}
            y2={h - pB}
            stroke="var(--border-color)"
            opacity={0.6}
          />
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
              <circle
                cx={hoverX}
                cy={getY(hoverBand.p90)}
                r={3.5}
                fill="var(--accent-blue)"
                opacity={0.7}
              />
              <circle
                cx={hoverX}
                cy={getY(hoverBand.p10)}
                r={3.5}
                fill="var(--accent-blue)"
                opacity={0.7}
              />
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
            const leftPct =
              ((hoverAbs - z0) / span) * (100 - ((pL + pR) / w) * 100) + (pL / w) * 100;
            const flip = leftPct > 65;
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
                  minWidth: 180,
                  color: "var(--text-main)",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
                  zIndex: 5,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  {currentAge > 0 ? `Age ${currentAge + hoverAbs}` : `Year +${hoverAbs}`}
                </div>
                {[
                  {
                    label: "Assumed Growth",
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
                ))}
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
            <path
              d={brushMedianPath}
              fill="none"
              stroke="var(--accent-blue)"
              strokeWidth={1}
              opacity={0.6}
            />
            {/* dim outside-window regions */}
            <rect
              x={pL}
              y={brushPT}
              width={brushXFor(z0) - pL}
              height={brushTrackH}
              fill="rgba(15,23,42,0.55)"
            />
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
              {currentAge > 0 ? `age ${currentAge + z0}–${currentAge + z1}` : `+${z0}y–+${z1}y`} (
              {span} yrs)
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
          <div
            className="legend-line"
            style={{ borderTop: "3px dashed var(--text-main)", height: 0 }}
          />
          Your assumed rate ({deterministicRatePct}%)
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
          <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
            ended ≥ starting capital
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
            Ruin rate
          </div>
          <div
            style={{
              fontWeight: 700,
              color:
                ruinRate >= 50
                  ? "var(--accent-red)"
                  : ruinRate >= 25
                    ? "var(--accent-amber)"
                    : "var(--text-main)",
            }}
          >
            {ruinRate}% of runs
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>ran out of money</div>
        </div>
      </div>
      <div style={{ marginTop: "0.5rem", color: "var(--text-muted)", fontSize: "0.7rem" }}>
        {RUNS.toLocaleString()} simulated paths •{" "}
        {mode === "historical"
          ? "Bootstrap from MSCI World NTR (GBP) annual returns 1970–2024"
          : `Normal returns: μ ${meanPct}%, σ ${stdevPct}%`}{" "}
        • Withdrawal escalates {inflationPct.toFixed(1)}%/yr (nominal), pension grows{" "}
        {pensionIncreasePct.toFixed(1)}%/yr (real, today's {currency}) • Seeded RNG — slider drags
        are smooth • Hypothetical — not advice.
      </div>
    </div>
  );
};
