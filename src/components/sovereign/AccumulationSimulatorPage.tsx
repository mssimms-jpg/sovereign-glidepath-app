import { useEffect, useMemo, useRef, useState } from "react";
import { cleanNum, formatGBP, setCurrencySymbol } from "@/lib/sovereign/engine";
import { runAccumulation, type AccMode } from "@/lib/sovereign/accumulationEngine";
import {
  PARAMETRIC_DEFAULT_MEAN_PCT,
  PARAMETRIC_DEFAULT_STDEV_PCT,
} from "@/lib/sovereign/monteCarloShared";
import { DashedLineIcon } from "@/components/sovereign/DashedLineIcon";
import "@/components/sovereign/desk.css";

function numParam(sp: URLSearchParams, key: string, fallback: number): number {
  const raw = sp.get(key);
  if (raw === null) return fallback;
  const n = Number(raw.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

const CURRENCY_SYMBOLS = ["£", "€", "$"] as const;
type CurrencySymbol = (typeof CURRENCY_SYMBOLS)[number];

function currencyParam(sp: URLSearchParams, key: string, fallback: CurrencySymbol): CurrencySymbol {
  const raw = sp.get(key);
  if (raw && (CURRENCY_SYMBOLS as readonly string[]).includes(raw)) return raw as CurrencySymbol;
  return fallback;
}

function getQueryParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  // Desktop app is hash-routed (file:// + no server) -- query params travel
  // inside the hash. Web app is real-path routed -- params are in search.
  const hash = window.location.hash;
  const qIndex = hash.indexOf("?");
  if (qIndex !== -1) return new URLSearchParams(hash.slice(qIndex + 1));
  return new URLSearchParams(window.location.search);
}

const LABEL: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "var(--text-muted)",
  display: "block",
};
const CAPTION: React.CSSProperties = {
  fontSize: "0.7rem",
  color: "var(--text-muted)",
  marginTop: "0.15rem",
};

// Build 124 — sticky settings. Same shape as MonteCarloPanel.tsx's loadMC/saveMC
// pair: a single JSON blob in localStorage, never throwing on failure.
const ACC_KEY = "shd_acc_v1";

type PersistedAcc = {
  startAge?: number;
  retirementAge?: number;
  startingPot?: number;
  monthlyContribution?: number;
  contributionEscalationPct?: number;
  mode?: AccMode;
  assumedRatePct?: number;
  meanPct?: number;
  stdevPct?: number;
  inflationPct?: number;
  currency?: string;
  desiredDrawdown?: number;
  spa?: number;
  spAmount?: number;
  potSource?: "median" | "assumed";
};

function loadAcc(): PersistedAcc {
  try {
    const raw = localStorage.getItem(ACC_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAcc(s: PersistedAcc) {
  try {
    localStorage.setItem(ACC_KEY, JSON.stringify(s));
  } catch {
    /* storage disabled */
  }
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

/**
 * Build 124 — Accumulation Simulator. Mirror of the Risk Simulator, but for the
 * saving-up phase: contributions ADD to the pot each year instead of a
 * withdrawal subtracting from it. Standalone sandbox page, kept in its own
 * component file (not in the route file) so TanStack Router can code-split it.
 */
export function AccumulationSimulatorPage() {
  const sp = getQueryParams();
  const persisted = useRef<PersistedAcc>(loadAcc());

  const [currency] = useState<CurrencySymbol>(
    currencyParam(
      sp,
      "currency",
      (CURRENCY_SYMBOLS as readonly string[]).includes(persisted.current.currency ?? "")
        ? (persisted.current.currency as CurrencySymbol)
        : "£",
    ),
  );
  setCurrencySymbol(currency);

  // Plain editable fields — this tool has no "real plan" behind it, so there is
  // no seed/override/reset-to-actual distinction like the Risk Simulator has.
  // Precedence for each field: query param → persisted value → hard default.
  const [startAgeStr, setStartAgeStr] = useState(
    String(Math.max(0, Math.floor(numParam(sp, "startAge", num(persisted.current.startAge, 22))))),
  );
  const [retirementAgeStr, setRetirementAgeStr] = useState(
    String(
      Math.max(
        1,
        Math.floor(numParam(sp, "retirementAge", num(persisted.current.retirementAge, 65))),
      ),
    ),
  );
  const [startingPotStr, setStartingPotStr] = useState(
    String(Math.max(0, numParam(sp, "startingPot", num(persisted.current.startingPot, 0)))),
  );
  const [monthlyStr, setMonthlyStr] = useState(
    String(
      Math.max(
        0,
        numParam(sp, "monthlyContribution", num(persisted.current.monthlyContribution, 200)),
      ),
    ),
  );
  const [escStr, setEscStr] = useState(
    String(
      numParam(
        sp,
        "contributionEscalationPct",
        num(persisted.current.contributionEscalationPct, 2),
      ),
    ),
  );

  const [mode, setMode] = useState<AccMode>(
    persisted.current.mode === "parametric" || persisted.current.mode === "historical"
      ? persisted.current.mode
      : "historical",
  );
  const [assumedRatePct, setAssumedRatePct] = useState(
    numParam(sp, "growth", num(persisted.current.assumedRatePct, 5)),
  );
  // Build 128 — defaults now sourced from monteCarloShared.ts, the single
  // place these two numbers are defined (see that file for derivation).
  const [meanPct, setMeanPct] = useState(
    numParam(sp, "meanPct", num(persisted.current.meanPct, PARAMETRIC_DEFAULT_MEAN_PCT)),
  );
  const [stdevPct, setStdevPct] = useState(
    numParam(sp, "stdevPct", num(persisted.current.stdevPct, PARAMETRIC_DEFAULT_STDEV_PCT)),
  );
  const [inflationPct, setInflationPct] = useState(
    numParam(sp, "inflationPct", num(persisted.current.inflationPct, 2.5)),
  );

  // Build 124 — Risk Simulator hand-off fields. Same precedence as every other
  // field on this page: query param → persisted value → hard default.
  const [drawdownStr, setDrawdownStr] = useState(
    String(Math.max(0, numParam(sp, "drawdown", num(persisted.current.desiredDrawdown, 20000)))),
  );
  const [spaStr, setSpaStr] = useState(
    String(Math.max(0, Math.floor(numParam(sp, "spa", num(persisted.current.spa, 67))))),
  );
  const [spAmountStr, setSpAmountStr] = useState(
    String(Math.max(0, numParam(sp, "spAmount", num(persisted.current.spAmount, 11500)))),
  );
  const [potSource, setPotSource] = useState<"median" | "assumed">(
    persisted.current.potSource === "assumed" ? "assumed" : "median",
  );
  // Build 124 -- confirmation modal before handing off to the Risk
  // Simulator, matching SovereignGlidepath.tsx's "Confirm Ledger Entry"
  // modal pattern. The button no longer navigates directly.
  const [showHandoffConfirm, setShowHandoffConfirm] = useState(false);

  // Strip the query string once read, so figures don't linger in history.
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const startAge = Math.max(0, Math.floor(cleanNum(startAgeStr)));
  const retirementAge = Math.max(0, Math.floor(cleanNum(retirementAgeStr)));

  // Persist every field — unlike the Risk Simulator there is no Pane 1 plan
  // behind this tool, so all of it is sticky.
  useEffect(() => {
    saveAcc({
      startAge: cleanNum(startAgeStr),
      retirementAge: cleanNum(retirementAgeStr),
      startingPot: cleanNum(startingPotStr),
      monthlyContribution: cleanNum(monthlyStr),
      contributionEscalationPct: cleanNum(escStr),
      mode,
      assumedRatePct,
      meanPct,
      stdevPct,
      inflationPct,
      currency,
      desiredDrawdown: cleanNum(drawdownStr),
      spa: cleanNum(spaStr),
      spAmount: cleanNum(spAmountStr),
      potSource,
    });
  }, [
    startAgeStr,
    retirementAgeStr,
    startingPotStr,
    monthlyStr,
    escStr,
    mode,
    assumedRatePct,
    meanPct,
    stdevPct,
    inflationPct,
    currency,
    drawdownStr,
    spaStr,
    spAmountStr,
    potSource,
  ]);

  // Build 124 — the 10,000-path simulation used to run synchronously in
  // useMemo, blocking the whole page (measured 200-580ms). Deferred via
  // double requestAnimationFrame so at least the input itself stays
  // responsive during the calculation, even without any visible indicator
  // (an indicator was tried and removed -- even a layout-neutral one caused
  // visible judder on the Windows desktop build, and simplicity won out).
  const [sim, setSim] = useState<ReturnType<typeof runAccumulation> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (cancelled) return;
        setSim(
          runAccumulation({
            startAge,
            retirementAge,
            startingPot: Math.max(0, cleanNum(startingPotStr)),
            monthlyContribution: Math.max(0, cleanNum(monthlyStr)),
            contributionEscalationPct: cleanNum(escStr),
            mode,
            meanPct,
            stdevPct,
            inflationPct,
            assumedRatePct,
          }),
        );
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [
    startAge,
    retirementAge,
    startingPotStr,
    monthlyStr,
    escStr,
    mode,
    meanPct,
    stdevPct,
    inflationPct,

    assumedRatePct,
  ]);

  // ---- Fan chart geometry (same approach/style as the Risk Simulator) ----
  const w = 900;
  const h = 360;
  const pL = 70;
  const pR = 20;
  const pT = 20;
  const pB = 34;

  // Zoom brush state -- same pattern as MonteCarloPanel.tsx's Risk Simulator
  // chart. zoom = [startIdx, endIdx], absolute indices into sim.bands.
  const [zoom, setZoom] = useState<[number, number]>([0, 9999]);
  const brushDragRef = useRef<null | "left" | "right" | "window">(null);
  const brushAnchorRef = useRef<{ startX: number; z0: number; z1: number } | null>(null);
  const yrsTotal = sim ? sim.years : 0;
  const z0 = Math.max(0, Math.min(zoom[0], Math.max(0, yrsTotal - 1)));
  const z1 = Math.max(z0 + 1, Math.min(zoom[1], yrsTotal));
  const span = Math.max(1, z1 - z0);

  const chart = useMemo(() => {
    if (!sim) return null;
    const visibleBands = sim.bands.slice(z0, z1 + 1);
    const visibleDet = sim.deterministic.slice(z0, z1 + 1);
    const maxVal = Math.max(1, ...visibleBands.map((b) => b.p90));
    const getX = (i: number) => pL + ((i - z0) / span) * (w - pL - pR);
    const getY = (v: number) => h - pB - (v / maxVal) * (h - pT - pB);

    const band = (() => {
      const up = visibleBands
        .map((b, k) => `${k === 0 ? "M" : "L"}${getX(z0 + k)},${getY(b.p90)}`)
        .join(" ");
      const down = [...visibleBands]
        .map((b, k) => ({ b, k }))
        .reverse()
        .map(({ b, k }) => `L${getX(z0 + k)},${getY(b.p10)}`)
        .join(" ");
      return `${up} ${down} Z`;
    })();

    const median = visibleBands
      .map((b, k) => `${k === 0 ? "M" : "L"}${getX(z0 + k)},${getY(b.p50)}`)
      .join(" ");
    const detPath = visibleDet
      .map((v, k) => `${k === 0 ? "M" : "L"}${getX(z0 + k)},${getY(v)}`)
      .join(" ");

    const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => {
      const v = maxVal * f;
      const y = getY(v);
      return (
        <g key={f}>
          <line x1={pL} y1={y} x2={w - pR} y2={y} stroke="var(--border-color)" opacity={0.4} />
          <text x={pL - 8} y={y + 4} textAnchor="end" fontSize={11} fill="var(--text-muted)">
            {formatGBP(v)}
          </text>
        </g>
      );
    });

    const tickStep = Math.max(1, Math.ceil(span / 8));
    const xTicks: React.ReactNode[] = [];
    for (let i = z0; i <= z1; i += tickStep) {
      xTicks.push(
        <text
          key={i}
          x={getX(i)}
          y={h - pB + 18}
          textAnchor="middle"
          fontSize={11}
          fill="var(--text-muted)"
        >
          {startAge + i}
        </text>,
      );
    }

    return { band, median, detPath, gridLines, xTicks, getX, getY };
  }, [sim, startAge, z0, z1, span]);

  // Hover crosshair + tooltip -- same pattern as MonteCarloPanel.tsx's fan
  // chart (Risk Simulator), now including zoom-window clamping (hoverAbs)
  // since this chart got the same zoom brush.
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const chartWrapRef = useRef<HTMLDivElement | null>(null);

  const handleChartPointerMove = (e: React.PointerEvent<SVGRectElement>) => {
    if (!sim) return;
    const target = e.currentTarget as SVGRectElement;
    const rect = target.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const pxPerYear = rect.width / span;
    const k = Math.round(relX / pxPerYear);
    setHoverIdx(z0 + Math.max(0, Math.min(span, k)));
  };
  const handleChartPointerLeave = () => setHoverIdx(null);

  const hoverAbs = hoverIdx == null ? null : Math.max(z0, Math.min(z1, hoverIdx));
  const hoverX = hoverAbs == null || !chart ? null : chart.getX(hoverAbs);
  const hoverBand = hoverAbs == null || !sim ? null : sim.bands[hoverAbs];
  const hoverDet = hoverAbs == null || !sim ? null : sim.deterministic[hoverAbs];

  // Brush drag interactions -- ported directly from MonteCarloPanel.tsx.
  const brushW = w - pL - pR;
  const brushH = 38;
  const brushPT = 6;
  const brushPB = 6;
  const brushTrackH = brushH - brushPT - brushPB;
  const brushXFor = (i: number) => pL + (i / Math.max(1, yrsTotal)) * brushW;

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
    const deltaYears = Math.round(
      ((e.clientX - anchor.startX) * scale) / (brushW / Math.max(1, yrsTotal)),
    );
    const MIN = 2;
    if (which === "left") {
      const next = Math.max(0, Math.min(anchor.z1 - MIN, anchor.z0 + deltaYears));
      setZoom([next, anchor.z1]);
    } else if (which === "right") {
      const next = Math.max(anchor.z0 + MIN, Math.min(yrsTotal, anchor.z1 + deltaYears));
      setZoom([anchor.z0, next]);
    } else {
      const width = anchor.z1 - anchor.z0;
      let na = anchor.z0 + deltaYears;
      if (na < 0) na = 0;
      if (na + width > yrsTotal) na = yrsTotal - width;
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
  const handleBrushDoubleClick = () => setZoom([0, yrsTotal]);
  const nudgeHandle = (which: "left" | "right", delta: number) => {
    if (which === "left") {
      setZoom([Math.max(0, Math.min(z1 - 2, z0 + delta)), z1]);
    } else {
      setZoom([z0, Math.max(z0 + 2, Math.min(yrsTotal, z1 + delta))]);
    }
  };

  // Brush mini-preview (full-range p10/p90), same as MonteCarloPanel.tsx.
  const brushMaxV = sim ? Math.max(...sim.bands.map((b) => b.p90), 1) : 1;
  const brushTopY = (v: number) =>
    brushPT + brushTrackH - (Math.max(0, v) / brushMaxV) * brushTrackH;
  const brushBandPath = sim
    ? (() => {
        const top = sim.bands
          .map((b, i) => `${i === 0 ? "M" : "L"}${brushXFor(i)},${brushTopY(b.p90)}`)
          .join(" ");
        const bot = [...sim.bands]
          .map((b, i) => ({ b, i }))
          .reverse()
          .map(({ b, i }) => `L${brushXFor(i)},${brushTopY(b.p10)}`)
          .join(" ");
        return `${top} ${bot} Z`;
      })()
    : "";
  const brushMedianPath = sim
    ? sim.bands.map((b, i) => `${i === 0 ? "M" : "L"}${brushXFor(i)},${brushTopY(b.p50)}`).join(" ")
    : "";

  // Build 124 — hand the projected pot over to the Risk Simulator.
  // Sandbox to sandbox: nothing is written back to the live plan, and every
  // value is editable on arrival. Param names match SovereignGlidepath.tsx's
  // own Risk Simulator launcher exactly (horizon + horizonAge both passed).
  // The actual computation is split from the navigation action so the
  // confirmation modal can show the same numbers it's about to send.
  const handoffPreview = useMemo(() => {
    if (!sim) return null;
    const startingPot =
      potSource === "median"
        ? sim.finalP50
        : (sim.deterministic[sim.deterministic.length - 1] ?? 0);
    const cash = Math.round(startingPot * 0.15);
    const equities = Math.round(startingPot * 0.85);
    const spaVal = Math.max(0, Math.floor(cleanNum(spaStr)));
    const horizonAge = spaVal + 25;
    const withdrawal = Math.max(0, Math.round(cleanNum(drawdownStr)));
    const pensionAmount = Math.max(0, Math.round(cleanNum(spAmountStr)));
    return { startingPot, cash, equities, spaVal, horizonAge, withdrawal, pensionAmount };
  }, [sim, potSource, spaStr, drawdownStr, spAmountStr]);

  const performMoveToRiskSimulator = () => {
    if (!handoffPreview) return;
    const { cash, equities, spaVal, horizonAge, withdrawal, pensionAmount } = handoffPreview;

    const params = new URLSearchParams({
      eq: String(equities),
      cash: String(cash),
      age: String(retirementAge),
      horizon: String(horizonAge - retirementAge),
      horizonAge: String(horizonAge),
      withdrawal: String(withdrawal),
      growth: String(assumedRatePct),
      currency,
      pensionAge: String(spaVal),
      pensionAmount: String(pensionAmount),
      from: "accumulation-simulator",
    });

    const isDesktop = typeof window !== "undefined" && window.location.protocol === "file:";
    window.open(
      isDesktop ? `#/risk-simulator?${params.toString()}` : `/risk-simulator?${params.toString()}`,
      "_blank",
      "noopener",
    );
    setShowHandoffConfirm(false);
  };

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    caption: string,
    prefix?: string,
  ) => (
    <div>
      <label style={LABEL}>{label}</label>
      <div style={{ position: "relative" }}>
        {prefix && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "0.65rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              fontSize: "0.95rem",
              pointerEvents: "none",
            }}
          >
            {prefix}
          </span>
        )}
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: "100%", paddingLeft: prefix ? "1.5rem" : undefined }}
          aria-label={label}
        />
      </div>
      <div style={CAPTION}>{caption}</div>
    </div>
  );

  return (
    <div className="shd-root" style={{ padding: "1.5rem", maxWidth: 1400, margin: "0 auto" }}>
      <div
        style={{
          borderBottom: "1px solid var(--border-color)",
          paddingBottom: "1.25rem",
          marginBottom: "1.75rem",
        }}
      >
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.close();
          }}
          style={{ color: "var(--text-muted)", fontSize: "0.85rem", textDecoration: "none" }}
        >
          ← Back to Sovereign Glidepath
        </a>
        <h1
          style={{
            fontSize: "1.5rem",
            margin: "0.5rem 0 0.25rem",
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}
        >
          Accumulation Simulator — Building the Pot
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>
          Runs 10,000 possible saving-up paths from your current age to your chosen retirement age,
          showing the full spread of pot sizes your contributions could realistically reach.
        </p>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "1rem" }}>
          <button
            type="button"
            onClick={() => {
              const isFile = typeof window !== "undefined" && window.location.protocol === "file:";
              window.open(
                isFile
                  ? "./accumulation-simulator-guide.html"
                  : "/accumulation-simulator-guide.html",
                "_blank",
                "noopener",
              );
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}
          >
            📖 User Guide
          </button>
        </div>
      </div>

      <div className="shd-panel" style={{ padding: "1rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "0.9rem",
            marginBottom: "1rem",
          }}
        >
          {field(
            "Current Age",
            startAgeStr,
            setStartAgeStr,
            "22",
            "Age you start contributing from",
          )}
          {field(
            "Desired Retirement Age",
            retirementAgeStr,
            setRetirementAgeStr,
            "65",
            "When contributions stop — separate from your plan's Target Horizon Age",
          )}
          {field(
            `Starting Savings (${currency})`,
            startingPotStr,
            setStartingPotStr,
            "0",
            "Anything already saved or invested today",
            currency,
          )}
          {field(
            `Monthly Contribution (${currency})`,
            monthlyStr,
            setMonthlyStr,
            "200",
            "Paid in every month, added to the pot",
            currency,
          )}
          {field(
            "Contribution Real Increase %",
            escStr,
            setEscStr,
            "2",
            "Annual % uplift to the monthly contribution, compounding",
          )}
        </div>

        {/* Assumed Growth Rate — always visible, drives the dashed line only.
            Kept out of the fields grid above and given its own full-width
            row, matching MonteCarloPanel.tsx's Risk Simulator treatment —
            the label is too long to sit comfortably in a narrow grid column. */}
        <div style={{ marginBottom: "1rem" }}>
          <label
            style={LABEL}
            title="Moves only the dashed 'Assumed Rate' line. It does not change the 10,000 simulated paths behind the fan."
          >
            Shown on chart as <DashedLineIcon /> Assumed Real Growth Rate %{" "}
            <span style={{ color: "var(--text-main)", fontWeight: 700 }}>
              {assumedRatePct.toFixed(1)}%
            </span>
          </label>
          <input
            type="range"
            min={0}
            max={20}
            step={0.1}
            value={assumedRatePct}
            onChange={(e) => setAssumedRatePct(parseFloat(e.target.value) || 0)}
            style={{ width: "100%" }}
            aria-label="Assumed real growth rate"
          />
          <div style={CAPTION}>
            Real (after-inflation) growth assumed for the dashed projection line
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.9rem" }}>
          <button
            type="button"
            className={mode === "historical" ? "" : "secondary"}
            style={{ fontSize: "0.75rem", padding: "0.4rem 0.7rem" }}
            onClick={() => setMode("historical")}
          >
            Historical (MSCI World, GBP)
          </button>
          <button
            type="button"
            className={mode === "parametric" ? "" : "secondary"}
            style={{ fontSize: "0.75rem", padding: "0.4rem 0.7rem" }}
            onClick={() => setMode("parametric")}
          >
            Parametric Fan Chart
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "0.9rem",
            marginBottom: "1rem",
          }}
        >
          {mode === "parametric" && (
            <>
              <div>
                <label style={LABEL}>
                  Mean Nominal Return %{" "}
                  <span style={{ color: "var(--text-main)", fontWeight: 700 }}>
                    {meanPct.toFixed(1)}%
                  </span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={15}
                  step={0.1}
                  value={meanPct}
                  onChange={(e) => setMeanPct(parseFloat(e.target.value) || 0)}
                  style={{ width: "100%" }}
                  aria-label="Mean nominal return"
                />
                <div style={CAPTION}>Average nominal return used by Parametric mode</div>
              </div>
              <div>
                <label style={LABEL}>
                  Volatility (stdev) %{" "}
                  <span style={{ color: "var(--text-main)", fontWeight: 700 }}>
                    {stdevPct.toFixed(1)}%
                  </span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={30}
                  step={0.1}
                  value={stdevPct}
                  onChange={(e) => setStdevPct(parseFloat(e.target.value) || 0)}
                  style={{ width: "100%" }}
                  aria-label="Volatility"
                />
                <div style={CAPTION}>Year-to-year spread in Parametric mode</div>
              </div>
            </>
          )}
          <div>
            <label style={LABEL}>
              Inflation / CPI %{" "}
              <span style={{ color: "var(--text-main)", fontWeight: 700 }}>
                {inflationPct.toFixed(1)}%
              </span>
            </label>
            <input
              type="range"
              min={0}
              max={6}
              step={0.1}
              value={inflationPct}
              onChange={(e) => setInflationPct(parseFloat(e.target.value) || 0)}
              style={{ width: "100%" }}
              aria-label="Inflation"
            />
            <div style={CAPTION}>
              Chart shown in today's{" "}
              {currency === "£" ? "pounds" : currency === "€" ? "euros" : "dollars"}
            </div>
          </div>
        </div>

        {!sim || !chart ? (
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "0.85rem",
              padding: "2rem 0",
              textAlign: "center",
            }}
          >
            Enter a retirement age above your current age to run the simulation.
          </div>
        ) : (
          <>
            <div ref={chartWrapRef} style={{ position: "relative", width: "100%", height: 360 }}>
              <svg
                viewBox={`0 0 ${w} ${h}`}
                preserveAspectRatio="none"
                style={{ width: "100%", height: "100%", overflow: "visible" }}
                role="img"
                aria-label="Accumulation fan chart"
              >
                {chart.gridLines}
                <path d={chart.band} fill="var(--accent-blue)" opacity={0.14} />
                <path d={chart.median} fill="none" stroke="var(--accent-blue)" strokeWidth={2} />
                <path
                  d={chart.detPath}
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
                {chart.xTicks}
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
                      cy={chart.getY(hoverBand.p90)}
                      r={3.5}
                      fill="var(--accent-blue)"
                      opacity={0.7}
                    />
                    <circle
                      cx={hoverX}
                      cy={chart.getY(hoverBand.p10)}
                      r={3.5}
                      fill="var(--accent-blue)"
                      opacity={0.7}
                    />
                    <circle
                      cx={hoverX}
                      cy={chart.getY(hoverBand.p50)}
                      r={4}
                      fill="var(--accent-blue)"
                    />
                    <circle cx={hoverX} cy={chart.getY(hoverDet)} r={4} fill="var(--text-main)" />
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
                  const leftPct = ((((hoverAbs - z0) / span) * (w - pL - pR) + pL) / w) * 100;
                  // Edge-aware flip: fixed-width tooltip swaps to the left of
                  // the cursor once there isn't room on the right, matching
                  // MonteCarloPanel.tsx's Risk Simulator chart exactly.
                  const TT_WIDTH = 260;
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
                        Age {startAge + hoverAbs}
                      </div>
                      {[
                        {
                          label: "Assumed Rate",
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
                                background: row.dashed ? "transparent" : row.color,
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

            {sim && sim.years >= 3 && (
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
                  <g
                    transform={`translate(${brushXFor(z1) - 5}, ${brushPT})`}
                    onPointerDown={(e) => startBrushDrag(e, "right")}
                    tabIndex={0}
                    role="slider"
                    aria-label="Zoom window end"
                    aria-valuemin={z0 + 2}
                    aria-valuemax={yrsTotal}
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
                    Window: age {startAge + z0}–{startAge + z1} ({span} yrs)
                  </span>
                  <span>Double-click brush to reset</span>
                </div>
              </div>
            )}

            <div
              style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", marginTop: "0.75rem" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.72rem",
                }}
              >
                <div
                  className="legend-line"
                  style={{ backgroundColor: "var(--accent-blue)", opacity: 0.3 }}
                />
                <span style={{ color: "var(--text-muted)" }}>10th–90th percentile range</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.72rem",
                }}
              >
                <div className="legend-line" style={{ backgroundColor: "var(--accent-blue)" }} />
                <span style={{ color: "var(--text-muted)" }}>Median path (p50)</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.72rem",
                }}
              >
                <div
                  className="legend-line"
                  style={{ borderTop: "3px dashed var(--text-main)", height: 0 }}
                />
                <span style={{ color: "var(--text-muted)" }}>Assumed Rate (real)</span>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "0.75rem",
                marginTop: "1rem",
              }}
            >
              <div>
                <div style={LABEL}>Pot at age {retirementAge} — Poor (p10)</div>
                <div style={{ fontWeight: 800 }}>{formatGBP(sim.finalP10)}</div>
              </div>
              <div>
                <div style={LABEL}>Median (p50)</div>
                <div style={{ fontWeight: 800, color: "var(--accent-blue)" }}>
                  {formatGBP(sim.finalP50)}
                </div>
              </div>
              <div>
                <div style={LABEL}>Strong (p90)</div>
                <div style={{ fontWeight: 800 }}>{formatGBP(sim.finalP90)}</div>
              </div>
              <div>
                <div style={LABEL}>Total contributed ({sim.years} yrs)</div>
                <div style={{ fontWeight: 800 }}>{formatGBP(sim.totalContributions)}</div>
              </div>
            </div>

            {/* Build 124 — single prominent trigger, replacing the previous
                inline fields section (too easy to miss below a tall chart).
                Everything -- the four inputs, the live review, Confirm --
                now lives in one modal, opened from here. */}
            <div
              style={{
                marginTop: "1.5rem",
                paddingTop: "1.25rem",
                borderTop: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => setShowHandoffConfirm(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "1rem",
                  padding: "0.85rem 1.5rem",
                }}
              >
                🎲 Move this pot to the Risk Simulator
              </button>
              <div style={{ ...CAPTION, maxWidth: 420 }}>
                See if this projected pot survives retirement — set your desired income, State
                Pension, and how the split works, then open it in the Risk Simulator.
              </div>
            </div>
          </>
        )}
      </div>

      {showHandoffConfirm &&
        handoffPreview &&
        (() => {
          const cell: React.CSSProperties = {
            padding: "0.3rem 0.5rem",
            borderBottom: "1px solid var(--border-color)",
            fontSize: "0.85rem",
          };
          const kcell: React.CSSProperties = { ...cell, color: "var(--text-muted)", width: "50%" };
          const vcell: React.CSSProperties = {
            ...cell,
            color: "var(--text-main)",
            fontWeight: 600,
            textAlign: "right",
          };
          const { startingPot, cash, equities, spaVal, horizonAge, withdrawal, pensionAmount } =
            handoffPreview;
          return (
            <div className="shd-overlay" role="dialog" aria-modal="true">
              <div
                className="shd-modal"
                style={{ width: 560, maxHeight: "90vh", overflowY: "auto" }}
              >
                <h2
                  style={{
                    fontSize: "1.15rem",
                    fontWeight: 800,
                    margin: "0 0 0.35rem 0",
                    textTransform: "none",
                    letterSpacing: 0,
                  }}
                >
                  Move to Risk Simulator
                </h2>
                <p
                  style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}
                >
                  Set your desired income and State Pension details below — the review updates as
                  you go. Nothing here is written back to this page or your real plan, and every
                  value is still editable once you arrive at the Risk Simulator.
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.85rem",
                    marginBottom: "1.1rem",
                  }}
                >
                  {field(
                    `Desired Annual Drawdown (${currency})`,
                    drawdownStr,
                    setDrawdownStr,
                    "20000",
                    "Yearly income you want to take once retired",
                    currency,
                  )}
                  {field(
                    "State Pension Age",
                    spaStr,
                    setSpaStr,
                    "67",
                    "When your state pension is expected to start",
                  )}
                  {field(
                    `State Pension Amount (${currency})`,
                    spAmountStr,
                    setSpAmountStr,
                    "11500",
                    "Yearly state pension, netted off your drawdown",
                    currency,
                  )}
                  <div>
                    <label style={LABEL}>Starting pot taken from</label>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.4rem",
                        flexWrap: "wrap",
                        marginTop: "0.3rem",
                      }}
                    >
                      <button
                        type="button"
                        className={potSource === "median" ? "" : "secondary"}
                        style={{ fontSize: "0.75rem", padding: "0.4rem 0.6rem" }}
                        onClick={() => setPotSource("median")}
                      >
                        Median
                      </button>
                      <button
                        type="button"
                        className={potSource === "assumed" ? "" : "secondary"}
                        style={{ fontSize: "0.75rem", padding: "0.4rem 0.6rem" }}
                        onClick={() => setPotSource("assumed")}
                      >
                        Assumed Rate
                      </button>
                    </div>
                  </div>
                </div>
                <table
                  style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1.25rem" }}
                >
                  <tbody>
                    <tr>
                      <td style={kcell}>
                        Starting Pot ({potSource === "median" ? "Median" : "Assumed Growth Rate"})
                      </td>
                      <td style={vcell}>{formatGBP(startingPot)}</td>
                    </tr>
                    <tr>
                      <td style={kcell}>Equities (85%)</td>
                      <td style={vcell}>{formatGBP(equities)}</td>
                    </tr>
                    <tr>
                      <td style={kcell}>Cash (15%)</td>
                      <td style={vcell}>{formatGBP(cash)}</td>
                    </tr>
                    <tr>
                      <td style={kcell}>Age</td>
                      <td style={vcell}>{retirementAge}</td>
                    </tr>
                    <tr>
                      <td style={kcell}>Horizon Age</td>
                      <td style={vcell}>{horizonAge}</td>
                    </tr>
                    <tr>
                      <td style={kcell}>Annual Withdrawal</td>
                      <td style={vcell}>{formatGBP(withdrawal)}</td>
                    </tr>
                    <tr>
                      <td style={kcell}>State Pension Start Age</td>
                      <td style={vcell}>{spaVal}</td>
                    </tr>
                    <tr>
                      <td style={{ ...kcell, borderBottom: 0 }}>State Pension Amount</td>
                      <td style={{ ...vcell, borderBottom: 0 }}>{formatGBP(pensionAmount)}</td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                  <button className="secondary" onClick={() => setShowHandoffConfirm(false)}>
                    Cancel
                  </button>
                  <button onClick={performMoveToRiskSimulator} style={{ fontWeight: 700 }}>
                    Open Risk Simulator
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
