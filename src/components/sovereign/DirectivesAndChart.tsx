// Sovereign Glidepath — Directives (Pane 3) + Historical Trend chart
// (Build 126 file-size cleanup, Stage 3c).
//
// Extracted from SovereignGlidepath.tsx. The Directives section is mostly
// read-only (renders computed `directive`/`defensiveRec` values) with two
// setters passed through as props — same safe "state stays in the parent"
// pattern as every other extraction in this cleanup. TrendChart itself was
// already fully self-contained (only ever took `ledger` and `currency` as
// props, owned its own hover state) — it simply hadn't been pulled out of
// the same giant file before.

import { useMemo, useRef, useState } from "react";
import { isLockingState, LOCKING_STATES, lockingBucketFor, type LedgerEntry } from "@/lib/sovereign/engine";
import type { DefensiveRecResult } from "@/lib/sovereign/defensiveRec";
import type { ThresholdMode } from "@/lib/sovereign/drawdown";

type CurrencySymbol = "£" | "€" | "$";

// ---------------------------------------------------------------------------
// TrendChart
// ---------------------------------------------------------------------------

interface TrendChartProps {
  ledger: LedgerEntry[];
  currency: CurrencySymbol;
}

function TrendChart({ ledger, currency }: TrendChartProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const t = useMemo(() => [...ledger].reverse(), [ledger]);

  if (ledger.length < 2) return null;

  const w = 1000,
    h = 360,
    pL = 90,
    pR = 30,
    pT = 20,
    pB = 110;
  const allV = t.flatMap((d) => [
    Number(d.totalCapital) || 0,
    Number(d.ath) || 0,
    Number(d.mmFund) || 0,
    Number(d.equities) || 0,
  ]);
  const rawMax = Math.max(...allV);
  const maxV = rawMax > 0 ? rawMax * 1.1 : 1;
  const getX = (i: number) => pL + (t.length === 1 ? 0 : (i / (t.length - 1)) * (w - pL - pR));
  const getY = (v: number) => h - pB - ((Number(v) || 0) / maxV) * (h - pB - pT);

  const fmt = (val: number) =>
    val >= 1_000_000 ? `${currency}${(val / 1_000_000).toFixed(2)}M` : `${currency}${(val / 1000).toFixed(1)}k`;

  const gridLines: React.ReactElement[] = [];
  for (let i = 0; i <= 5; i++) {
    const val = (maxV / 5) * i;
    const y = getY(val);
    const lab =
      val >= 1_000_000 ? `${currency}${(val / 1_000_000).toFixed(1)}M` : `${currency}${(val / 1000).toFixed(0)}k`;
    gridLines.push(
      <g key={`g${i}`}>
        <line x1={pL} y1={y} x2={w - pR} y2={y} stroke="var(--border-color)" strokeWidth={1} opacity={0.3} />
        <text x={pL - 10} y={y + 5} fill="var(--text-muted)" fontSize={12} textAnchor="end">
          {lab}
        </text>
      </g>,
    );
  }

  const axisY = h - pB;
  // Build 132 — beyond a certain number of quarters, a rotated label on
  // every single tick overlaps its neighbours and becomes unreadable (see
  // the 26-year/104-quarter real ledger scenario). The tick mark itself
  // still renders for every quarter regardless — this only thins the TEXT,
  // so the axis stays a genuine quarterly scale, just not quarterly-labelled
  // once it's this dense. The hover tooltip below is unaffected either way:
  // it resolves from mouse X position to the nearest data point directly,
  // never from which labels happen to be visible.
  const CROWDED_QUARTER_THRESHOLD = 32; // ~8 years — below this, label every quarter as before
  const showLabelEveryOther = t.length > CROWDED_QUARTER_THRESHOLD;
  const xLabels = t.map((d, i) => {
    const x = getX(i);
    const labelText = String(d.label || "").slice(0, 22);
    const showLabel = !showLabelEveryOther || i % 2 === 0;
    return (
      <g key={`x${i}`}>
        <line x1={x} y1={axisY} x2={x} y2={axisY + 5} stroke="var(--text-muted)" strokeWidth={1} opacity={0.6} />
        {showLabel && (
          <text
            x={x}
            y={axisY + 10}
            fill="var(--text-muted)"
            fontSize={11}
            textAnchor="end"
            transform={`rotate(-90 ${x} ${axisY + 10})`}
          >
            {labelText}
          </text>
        )}
      </g>
    );
  });

  const pts = (sel: (d: LedgerEntry) => number) => t.map((d, i) => `${getX(i)},${getY(sel(d))}`).join(" ");

  const series = [
    { key: "ath", label: "ATH Baseline", color: "var(--accent-amber)" },
    { key: "totalCapital", label: "Total Capital", color: "var(--text-main)" },
    { key: "equities", label: "Equities", color: "var(--accent-green)" },
    { key: "mmFund", label: "Money Market", color: "var(--accent-blue)" },
  ] as const;

  const updateHoverFromClientX = (clientX: number) => {
    const el = wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    const svgX = ((clientX - rect.left) / rect.width) * w;
    if (svgX < pL - 5 || svgX > w - pR + 5) {
      setHoverIdx(null);
      return;
    }
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < t.length; i++) {
      const dx = Math.abs(getX(i) - svgX);
      if (dx < best) {
        best = dx;
        nearest = i;
      }
    }
    setHoverIdx(nearest);
  };

  const hovered = hoverIdx != null ? t[hoverIdx] : null;
  const hoverX = hoverIdx != null ? getX(hoverIdx) : 0;

  // Tooltip placement in pixel coords of wrapper
  const rectEl = wrapperRef.current?.getBoundingClientRect();
  const tooltipLeftPct = rectEl ? (hoverX / w) * 100 : 0;
  // Flip tooltip to left side when near right edge
  const flip = tooltipLeftPct > 70;

  return (
    <div
      ref={wrapperRef}
      style={{ position: "relative", width: "100%", height: "100%" }}
      onMouseMove={(e) => updateHoverFromClientX(e.clientX)}
      onMouseLeave={() => setHoverIdx(null)}
      onTouchMove={(e) => {
        if (e.touches[0]) updateHoverFromClientX(e.touches[0].clientX);
      }}
      onTouchEnd={() => setHoverIdx(null)}
    >
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: "100%", overflow: "visible", display: "block" }}
        role="img"
        aria-label="Trend chart of Total Capital, Equities, ATH Baseline and Money Market over time"
      >
        {gridLines}
        <line x1={pL} y1={axisY} x2={w - pR} y2={axisY} stroke="var(--border-color)" strokeWidth={1} opacity={0.6} />
        <polyline points={pts((d) => d.mmFund)} fill="none" stroke="var(--accent-blue)" strokeWidth={2.5} />
        <polyline points={pts((d) => d.equities)} fill="none" stroke="var(--accent-green)" strokeWidth={2.5} />
        <polyline
          points={pts((d) => d.ath)}
          fill="none"
          stroke="var(--accent-amber)"
          strokeWidth={1.5}
          strokeDasharray="5,5"
          opacity={0.8}
        />
        <polyline points={pts((d) => d.totalCapital)} fill="none" stroke="var(--text-main)" strokeWidth={3.5} />
        {xLabels}
        {hovered && (
          <g pointerEvents="none">
            <line
              x1={hoverX}
              y1={pT}
              x2={hoverX}
              y2={axisY}
              stroke="#94a3b8"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.85}
            />
            {series.map((s) => {
              const val = Number(hovered[s.key as keyof LedgerEntry]) || 0;
              return (
                <circle
                  key={s.key}
                  cx={hoverX}
                  cy={getY(val)}
                  r={4.5}
                  fill="#0f172a"
                  stroke={s.color}
                  strokeWidth={2}
                />
              );
            })}
          </g>
        )}
      </svg>
      {hovered && (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: flip ? "auto" : `calc(${tooltipLeftPct}% + 12px)`,
            right: flip ? `calc(${100 - tooltipLeftPct}% + 12px)` : "auto",
            minWidth: 200,
            padding: "10px 12px",
            background: "rgba(15, 23, 42, 0.92)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            border: "1px solid rgba(148, 163, 184, 0.35)",
            borderRadius: 8,
            boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
            color: "var(--text-main)",
            fontSize: "0.78rem",
            lineHeight: 1.4,
            pointerEvents: "none",
            zIndex: 5,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: "0.82rem",
              marginBottom: 6,
              paddingBottom: 6,
              borderBottom: "1px solid rgba(148,163,184,0.25)",
              color: "var(--text-main)",
              letterSpacing: 0.3,
            }}
          >
            {String(hovered.label || "")}
          </div>
          {series.map((s) => {
            const val = Number(hovered[s.key as keyof LedgerEntry]) || 0;
            return (
              <div
                key={s.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 14,
                  padding: "2px 0",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: s.color,
                    }}
                  />
                  <span style={{ color: "var(--text-muted)" }}>{s.label}</span>
                </span>
                <span style={{ fontVariantNumeric: "tabular-nums", color: s.color, fontWeight: 600 }}>{fmt(val)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Directives (Pane 3) + Chart section
// ---------------------------------------------------------------------------

export interface DirectivesAndChartProps {
  ledger: LedgerEntry[];
  currency: CurrencySymbol;
  directive: { html: string; guardrailText: string };
  defensiveRec: DefensiveRecResult;
  defensiveMode: ThresholdMode;
  setDefensiveMode: (m: ThresholdMode) => void;
  setWdSplitTouched: (v: boolean) => void;
  guardrailFactor: number;
}

export function DirectivesAndChart({
  ledger,
  currency,
  directive,
  defensiveRec,
  defensiveMode,
  setDefensiveMode,
  setWdSplitTouched,
  guardrailFactor,
}: DirectivesAndChartProps) {
  const narrativeLockedBucket = lockingBucketFor(directive.guardrailText);

  return (
    <>
      {/* Directives */}
      <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
        <h2 className="shd-h2">3. Actionable Brokerage Desk Directives</h2>

        {/* Build 076 — Defensive-Draw Mode chooser + all-modes summary.
            Only affects the RECOMMENDED SOURCE for this quarter's
            withdrawal, not the Guyton-Klinger amount itself. */}
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.7rem 0.85rem",
            background: "rgba(59,130,246,0.05)",
            border: "1px solid var(--border-color)",
            borderRadius: 8,
          }}
        >
          <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Defensive Draw Mode{" "}
            <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
              — bucket recommendation for this quarter's withdrawal
            </span>
          </label>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.3rem" }}>
            {(
              [
                ["strict", "Strict", "Draw from cash only in real drawdowns below −5%"],
                [
                  "standard",
                  "Standard",
                  "Draw from cash in flat or weak-positive real years (below ½ the expected hurdle)",
                ],
                [
                  "aggressive",
                  "Aggressive",
                  "Draw from cash unless real returns clearly clear the expected hurdle",
                ],
              ] as [ThresholdMode, string, string][]
            ).map(([id, lab, tip]) => (
              <button
                key={id}
                type="button"
                className={defensiveMode === id ? "" : "secondary"}
                style={{ fontSize: "0.72rem", padding: "0.35rem 0.6rem" }}
                onClick={() => {
                  setDefensiveMode(id);
                  // Re-enable auto-seed so the split fields re-populate
                  // from the newly-selected mode's recommendation.
                  setWdSplitTouched(false);
                }}
                title={tip}
              >
                {lab}
              </button>
            ))}
          </div>

          <div style={{ fontSize: "0.78rem", marginTop: "0.55rem", lineHeight: 1.5 }}>
            {defensiveRec.isDefault ? (
              defensiveRec.reason === "insufficient_elapsed" ? (
                <span style={{ color: "var(--text-muted)" }}>
                  <strong style={{ color: "var(--text-main)" }}>All three modes:</strong> Draw from Equities —{" "}
                  <strong style={{ color: "var(--accent-amber)" }}>insufficient elapsed time to annualise</strong>{" "}
                  (only {Math.round(defensiveRec.elapsedDays ?? 0)} day
                  {Math.round(defensiveRec.elapsedDays ?? 0) === 1 ? "" : "s"} since the previous Normal row; at
                  least 14 days are needed before a return can be annualised meaningfully).
                </span>
              ) : (
                <span style={{ color: "var(--text-muted)" }}>
                  <strong style={{ color: "var(--text-main)" }}>All three modes:</strong> Draw from Equities — no
                  prior quarter to compare against
                  {defensiveRec.reason === "prior_no_date"
                    ? " (set a Period End Date on this row to enable the comparison)."
                    : defensiveRec.reason === "non_positive_elapsed"
                      ? " (this row's date is on or before the previous Normal row)."
                      : defensiveRec.reason === "zero_prior_eq"
                        ? " (previous row's equities balance was zero)."
                        : "."}
                </span>
              )
            ) : (
              <>
                {(["strict", "standard", "aggressive"] as ThresholdMode[]).map((m, i) => {
                  const r = defensiveRec[m];
                  const selected = defensiveMode === m;
                  const label = m === "strict" ? "Strict" : m === "standard" ? "Standard" : "Aggressive";
                  const rec = r.bucket === "cash" ? "Draw from Cash" : "Draw from Equities";
                  const color = r.bucket === "cash" ? "var(--accent-amber)" : "var(--accent-green)";
                  // Build 087 — when a locking narrative overrides this
                  // mode's default bucket, strike the mode-line rec and
                  // flag it inline so a top-to-bottom reader can't miss
                  // that the actual instruction below differs.
                  const overridden = narrativeLockedBucket !== null && narrativeLockedBucket !== r.bucket;
                  return (
                    <span key={m}>
                      {i > 0 && <span style={{ color: "var(--text-muted)" }}> · </span>}
                      <span
                        style={{
                          fontWeight: selected ? 800 : 500,
                          textDecoration: selected ? "underline" : "none",
                        }}
                      >
                        {label}:{" "}
                        <span
                          style={{
                            color,
                            textDecoration: overridden ? "line-through" : undefined,
                            opacity: overridden ? 0.6 : 1,
                          }}
                        >
                          {rec}
                        </span>
                        {overridden && (
                          <span
                            style={{
                              color: "var(--accent-amber)",
                              fontWeight: 700,
                              marginLeft: "0.35rem",
                            }}
                          >
                            (overridden — see narrative)
                          </span>
                        )}
                      </span>
                    </span>
                  );
                })}
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--text-muted)",
                    marginTop: "0.35rem",
                  }}
                >
                  Nominal equity return{" "}
                  <strong style={{ color: "var(--text-main)" }}>
                    {((defensiveRec.periodReturnNominal ?? 0) * 100).toFixed(2)}%
                  </strong>{" "}
                  this period · Annualised real{" "}
                  <strong style={{ color: "var(--text-main)" }}>
                    {((defensiveRec.annualisedReal ?? 0) * 100).toFixed(2)}%
                  </strong>{" "}
                  over{" "}
                  <strong style={{ color: "var(--text-main)" }}>
                    {Math.round(defensiveRec.elapsedDays ?? 0)} days
                  </strong>{" "}
                  since {defensiveRec.priorRow?.label || "prior row"} (inflation{" "}
                  {((defensiveRec.inflationUsed ?? 0) * 100).toFixed(1)}% from Pane 1's independent CPI assumption).
                  {defensiveRec.longGap && (
                    <span style={{ color: "var(--accent-amber)", fontWeight: 700 }}>
                      {" "}
                      ⚠ Gap &gt; 2 years — annualisation spans an unusually long period.
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Build 079 — Restored: always render the rich narrative banner
            (directive.html) so all 8 documented states surface here —
            Peak Refill, Recovery Wave, Reverse-Shielding, Comfortable
            Amortization, Normal Draw, G-K Preservation/Prosperity, No-Go
            Amortization, Shield Deficit/Exhaustion. This keeps Pane 3's
            banner in lock-step with Pane 2's "Guardrail State" readout
            (both derive from directive.guardrailText). The Defensive-Draw
            Mode selector still composes on top via the advisory below and
            the split-field auto-seed at commit time — it no longer
            replaces the narrative with a two-state banner. */}
        <div dangerouslySetInnerHTML={{ __html: directive.html }} />
        {!defensiveRec.isDefault &&
          (() => {
            const rec = defensiveRec[defensiveMode];
            const modeLabel =
              defensiveMode === "strict" ? "Strict" : defensiveMode === "standard" ? "Standard" : "Aggressive";
            const bucket = rec.bucket === "cash" ? "Cash Pot" : "Global Equities";
            const color = rec.bucket === "cash" ? "var(--accent-amber)" : "var(--accent-green)";
            // Build 082 — locking-state list is derived from the same
            // NON_LOCKING_STATES table used to decide whether to override
            // the bucket. Only the states actually present in the engine
            // ever appear here.
            const currentIsLocking = isLockingState(directive.guardrailText);
            const lockingList = LOCKING_STATES.join(", ");
            // Build 088 — the Guyton-Klinger ±10% adjustment is an overlay
            // on top of the base state, not a state of its own. Name both
            // so the footnote and the banner describe the same thing.
            const gkOverlay =
              guardrailFactor < 1
                ? "G-K Preservation overlay (−10%)"
                : guardrailFactor > 1
                  ? "G-K Prosperity overlay (+10%)"
                  : "";
            return (
              <div
                style={{
                  marginTop: "0.75rem",
                  padding: "0.6rem 0.85rem",
                  background: "rgba(59,130,246,0.05)",
                  border: "1px solid var(--border-color)",
                  borderLeft: `3px solid ${color}`,
                  borderRadius: 6,
                  fontSize: "0.78rem",
                  lineHeight: 1.5,
                }}
              >
                <strong style={{ color: "var(--text-main)" }}>Selected Defensive-Draw Mode ({modeLabel}):</strong>{" "}
                Recommends funding this period's withdrawal from <strong style={{ color }}>{bucket}</strong>.{" "}
                <span style={{ color: "var(--text-muted)" }}>
                  Where the narrative above locks the source ({lockingList}) the narrative wins; otherwise use this
                  mode's bucket. The Commit form's split fields auto-seed from this recommendation.{" "}
                  <em>
                    Current state: <strong>{directive.guardrailText}</strong>
                    {gkOverlay ? (
                      <>
                        {" "}
                        + <strong>{gkOverlay}</strong>
                      </>
                    ) : null}{" "}
                    — {currentIsLocking ? "locked by narrative." : "mode recommendation applies."}
                  </em>
                </span>
              </div>
            );
          })()}
      </div>

      {/* Chart */}
      <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.75rem",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <h2 className="shd-h2" style={{ margin: 0 }}>
            4. Historical Trend Visualizer Matrix
          </h2>
          <div className="chart-legend">
            <div className="legend-item">
              <div className="legend-line" style={{ backgroundColor: "var(--text-main)" }} />
              Total Capital
            </div>
            <div className="legend-item">
              <div className="legend-line" style={{ borderTop: "3px dashed var(--accent-amber)", height: 0 }} />
              ATH Baseline
            </div>
            <div className="legend-item">
              <div className="legend-line" style={{ backgroundColor: "var(--accent-green)" }} />
              Equities
            </div>
            <div className="legend-item">
              <div className="legend-line" style={{ backgroundColor: "var(--accent-blue)" }} />
              Money Market
            </div>
          </div>
        </div>
        <div
          style={{
            fontSize: "0.7rem",
            color: "var(--text-muted)",
            marginBottom: 6,
            fontStyle: "italic",
          }}
        >
          Tip: hover (or touch) anywhere over the chart to reveal a crosshair and a tooltip with values for that
          year.
        </div>
        <div style={{ width: "100%", height: 320 }}>
          {ledger.length >= 2 ? (
            <TrendChart ledger={ledger} currency={currency} />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "var(--text-muted)",
              }}
            >
              Add 2 or more entries to render the trend chart.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

