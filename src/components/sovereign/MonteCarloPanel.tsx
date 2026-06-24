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
  const contrib = 0;

  const sim = useMemo(() => {
    const yrs = Math.max(1, Math.min(60, Math.floor(years)));
    const start = Math.max(0, startingCapital);
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
        const ageThisYear = currentAge + y;
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
      const ageThisYear = currentAge + y;
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
    startingCapital,
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
  const allMax = Math.max(...bands.map((b) => b.p90), ...det);
  const maxV = allMax > 0 ? allMax * 1.05 : 1;
  const getX = (i: number) => pL + (yrs === 0 ? 0 : (i / yrs) * (w - pL - pR));
  const getY = (v: number) => h - pB - (Math.max(0, v) / maxV) * (h - pB - pT);

  const pathFromTo = (
    lo: (b: (typeof bands)[number]) => number,
    hi: (b: (typeof bands)[number]) => number,
  ) => {
    const top = bands.map((b, i) => `${i === 0 ? "M" : "L"}${getX(i)},${getY(hi(b))}`).join(" ");
    const bot = [...bands]
      .map((b, i) => ({ b, i }))
      .reverse()
      .map(({ b, i }) => `L${getX(i)},${getY(lo(b))}`)
      .join(" ");
    return `${top} ${bot} Z`;
  };

  const median = bands.map((b, i) => `${i === 0 ? "M" : "L"}${getX(i)},${getY(b.p50)}`).join(" ");
  const detPath = det.map((v, i) => `${i === 0 ? "M" : "L"}${getX(i)},${getY(v)}`).join(" ");

  const gridLines: React.ReactElement[] = [];
  for (let i = 0; i <= 5; i++) {
    const val = (maxV / 5) * i;
    const y = getY(val);
    const lab =
      val >= 1_000_000
        ? `${currency}${(val / 1_000_000).toFixed(1)}M`
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
  const tickStep = Math.max(1, Math.ceil(yrs / 8));
  for (let i = 0; i <= yrs; i += tickStep) {
    const x = getX(i);
    xTicks.push(
      <g key={`x${i}`}>
        <line x1={x} y1={h - pB} x2={x} y2={h - pB + 4} stroke="var(--text-muted)" opacity={0.6} />
        <text x={x} y={h - pB + 18} fill="var(--text-muted)" fontSize={11} textAnchor="middle">
          +{i}y
        </text>
      </g>,
    );
  }

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
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "0.6rem 0.75rem",
          marginBottom: "1rem",
        }}
      >
        {/* Row 1: inputs */}
        <div>
          <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Annual Withdrawal {currency}
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
            type="number"
            inputMode="numeric"
            min={50}
            max={90}
            step={1}
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

      <div style={{ width: "100%", height: 360 }}>
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
        </svg>
      </div>

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
