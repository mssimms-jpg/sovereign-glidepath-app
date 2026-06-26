import React, { useMemo, useState } from "react";
import { calculate, cleanNum, formatGBP } from "@/lib/sovereign/engine";

interface Props {
  equityVal: string;
  mmVal: string;
  athVal: string;
  targetYearly: string;
  growthRate: number;
  age: number;
  cappingAge: number;
  stressPct: number;
  desiredRunwayMonths: number;
  currency?: "£" | "€" | "$";
}

export function AffordCalculator(props: Props) {
  const {
    equityVal,
    mmVal,
    athVal,
    targetYearly,
    growthRate,
    age,
    cappingAge,
    stressPct,
    desiredRunwayMonths,
    currency = "£",
  } = props;

  const [expenseStr, setExpenseStr] = useState("");
  const [expenseFocused, setExpenseFocused] = useState(false);
  const [source, setSource] = useState<"auto" | "cash" | "equities">("equities");
  const [activePresets, setActivePresets] = useState<number[]>([]);

  const expense = cleanNum(expenseStr);

  const eq = cleanNum(equityVal);
  const mm = cleanNum(mmVal);
  const ath = cleanNum(athVal);

  const result = useMemo(() => {
    if (expense <= 0) return null;

    let cashAfter = mm;
    let eqAfter = eq;
    let fromCash = 0;
    let fromEq = 0;

    if (source === "cash") {
      fromCash = Math.min(expense, mm);
      const overflow = expense - fromCash;
      fromEq = overflow;
      cashAfter = mm - fromCash;
      eqAfter = eq - fromEq;
    } else if (source === "equities") {
      fromEq = Math.min(expense, eq);
      const overflow = expense - fromEq;
      fromCash = overflow;
      eqAfter = eq - fromEq;
      cashAfter = mm - fromCash;
    } else {
      fromCash = Math.min(expense, mm);
      const overflow = expense - fromCash;
      fromEq = overflow;
      cashAfter = mm - fromCash;
      eqAfter = eq - fromEq;
    }

    const baseInputs = {
      currentAge: age,
      cappingAge,
      ath,
      targetYearly: cleanNum(targetYearly),
      stressPct,
      growthRatePct: growthRate,
      desiredRunwayMonths,
    };

    const before = calculate({ ...baseInputs, rawEquities: eq, mmFund: mm }, null);
    const after = calculate({ ...baseInputs, rawEquities: eqAfter, mmFund: cashAfter }, null);

    const totalDrop = before.total - after.total;
    const quarterlyDelta = after.guardrailAdjustedQuarterly - before.guardrailAdjustedQuarterly;
    const runwayDelta = after.runwayMonths - before.runwayMonths;
    const drawdownDelta = after.drawdownPct - before.drawdownPct;
    const exhausted = eqAfter < 0 || cashAfter < 0;

    return {
      before,
      after,
      eqAfter,
      cashAfter,
      fromCash,
      fromEq,
      totalDrop,
      quarterlyDelta,
      runwayDelta,
      drawdownDelta,
      exhausted,
    };
  }, [
    expense,
    eq,
    mm,
    ath,
    targetYearly,
    growthRate,
    age,
    cappingAge,
    stressPct,
    desiredRunwayMonths,
    source,
  ]);

  const presets = [
    { label: `${currency}1,000`, v: 1000 },
    { label: `${currency}5,000`, v: 5000 },
    { label: `${currency}10,000`, v: 10000 },
    { label: `${currency}25,000`, v: 25000 },
    { label: `${currency}50,000`, v: 50000 },
    { label: `${currency}100,000`, v: 100000 },
  ];

  function togglePreset(v: number) {
    setActivePresets((prev) => {
      const next = prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v];
      const sum = next.reduce((a, b) => a + b, 0);
      setExpenseStr(sum > 0 ? String(sum) : "");
      return next;
    });
  }

  return (
    <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.75rem",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <h2 className="shd-h2" style={{ margin: 0 }}>
          6. Can I Afford This? — Instant Impact Calculator
        </h2>
        <span className="shd-sub" style={{ fontSize: "0.75rem" }}>
          Simulates a one-off expense. Nothing is committed to the ledger.
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        <div>
          <label>One-off Expense ({currency})</label>
          <input
            type="text"
            inputMode="decimal"
            placeholder={`${currency}0.00`}
            value={expenseFocused ? expenseStr : expenseStr ? formatGBP(cleanNum(expenseStr)) : ""}
            onFocus={(e) => {
              const n = cleanNum(e.currentTarget.value);
              setExpenseStr(n !== 0 ? n.toFixed(2) : "");
              setExpenseFocused(true);
            }}
            onBlur={() => setExpenseFocused(false)}
            onChange={(e) => {
              setExpenseStr(e.target.value);
              setActivePresets([]);
            }}
          />
          <div
            style={{
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              marginTop: 6,
              fontStyle: "italic",
            }}
          >
            Tip: quick-select buttons are toggles — click multiple to sum them, click again to
            remove.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
            {presets.map((p) => {
              const on = activePresets.includes(p.v);
              return (
                <button
                  key={p.v}
                  type="button"
                  className={on ? "" : "secondary"}
                  style={{
                    fontSize: "0.7rem",
                    padding: "0.25rem 0.5rem",
                    fontWeight: on ? 700 : 500,
                  }}
                  aria-pressed={on}
                  onClick={() => togglePreset(p.v)}
                >
                  {on ? "✓ " : ""}
                  {p.label}
                </button>
              );
            })}
            <button
              type="button"
              className="secondary"
              style={{ fontSize: "0.7rem", padding: "0.25rem 0.5rem" }}
              onClick={() => {
                setExpenseStr("");
                setActivePresets([]);
              }}
            >
              Clear
            </button>
          </div>
          {activePresets.length > 1 && (
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 4 }}>
              Sum of {activePresets.length} presets ={" "}
              {formatGBP(activePresets.reduce((a, b) => a + b, 0))}
            </div>
          )}
        </div>

        <div>
          <label style={{ fontSize: "0.7rem" }}>Source</label>
          <div style={{ display: "flex", gap: 4 }}>
            {(["equities", "cash", "auto"] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={source === s ? "" : "secondary"}
                style={{
                  fontSize: "0.7rem",
                  padding: "0.25rem 0.5rem",
                  textTransform: "capitalize",
                }}
                onClick={() => setSource(s)}
              >
                {s === "auto" ? "Cash first" : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!result && (
        <div
          style={{
            padding: "1rem",
            background: "rgba(0,0,0,0.15)",
            border: "1px dashed var(--border-color)",
            borderRadius: "0.4rem",
            color: "var(--text-muted)",
            fontSize: "0.85rem",
            textAlign: "center",
          }}
        >
          Enter an amount to see the instant impact on your capital, drawdown, shield runway, and
          next quarterly wage.
        </div>
      )}

      {result && (
        <div>
          <div
            style={{
              padding: "0.85rem 1rem",
              background: result.exhausted ? "rgba(239,68,68,0.10)" : "rgba(59,130,246,0.08)",
              border: `1px solid ${result.exhausted ? "var(--accent-red)" : "var(--accent-blue)"}`,
              borderRadius: "0.4rem",
              marginBottom: "1rem",
              fontSize: "0.9rem",
            }}
          >
            {result.exhausted ? (
              <span style={{ color: "var(--accent-red)", fontWeight: 700 }}>
                ⚠ This expense exceeds your available capital. You cannot fund {formatGBP(expense)}{" "}
                from the selected sources.
              </span>
            ) : (
              <span>
                If you take this now ({formatGBP(expense)}), your <strong>Total Capital</strong>{" "}
                drops by <strong>{formatGBP(result.totalDrop)}</strong>, and your next quarterly
                wage becomes{" "}
                <strong style={{ color: "var(--accent-blue)" }}>
                  {formatGBP(result.after.guardrailAdjustedQuarterly)}
                </strong>
                {Math.abs(result.quarterlyDelta) > 0.01 && (
                  <>
                    {" "}
                    (
                    <span
                      style={{
                        color:
                          result.quarterlyDelta < 0 ? "var(--accent-amber)" : "var(--accent-green)",
                      }}
                    >
                      {result.quarterlyDelta > 0 ? "+" : ""}
                      {formatGBP(result.quarterlyDelta)}
                    </span>
                    )
                  </>
                )}
                .
              </span>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <Stat
              label="Funded From"
              value={
                <>
                  <div style={{ fontSize: "0.85rem" }}>
                    Cash: <strong>{formatGBP(result.fromCash)}</strong>
                  </div>
                  <div style={{ fontSize: "0.85rem" }}>
                    Equities: <strong>{formatGBP(result.fromEq)}</strong>
                  </div>
                </>
              }
            />
            <Stat
              label="Total Capital"
              value={formatGBP(result.after.total)}
              sub={`was ${formatGBP(result.before.total)}`}
            />
            <Stat
              label="Drawdown vs ATH"
              value={`${result.after.drawdownPct.toFixed(2)}%`}
              sub={`${result.drawdownDelta >= 0 ? "+" : ""}${result.drawdownDelta.toFixed(2)} pp`}
              color={result.drawdownDelta > 0 ? "var(--accent-amber)" : undefined}
            />
            <Stat
              label="Shield Runway"
              value={`${result.after.runwayMonths.toFixed(1)} mo`}
              sub={`${result.runwayDelta >= 0 ? "+" : ""}${result.runwayDelta.toFixed(1)} mo`}
              color={result.runwayDelta < 0 ? "var(--accent-amber)" : undefined}
            />
            <Stat
              label="Next Quarterly Wage"
              value={formatGBP(result.after.guardrailAdjustedQuarterly)}
              sub={result.after.guardrailStatus}
              color={result.after.guardrailColor}
            />
            <Stat
              label="Fun Bucket (Surplus)"
              value={formatGBP(Math.max(0, result.after.surplus))}
              sub={
                result.after.surplus < 0
                  ? `Deficit ${formatGBP(Math.abs(result.after.surplus))}`
                  : `was ${formatGBP(Math.max(0, result.before.surplus))}`
              }
              color={result.after.surplus < 0 ? "var(--accent-red)" : "var(--accent-purple)"}
            />
          </div>

          <div
            style={{
              marginTop: "0.85rem",
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              fontStyle: "italic",
            }}
          >
            Hypothetical only — uses your current Pane 1 inputs and the same guardrail logic as the
            live directives. Commit a ledger entry to make any change permanent.
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        padding: "0.75rem",
        background: "rgba(0,0,0,0.15)",
        borderRadius: "0.4rem",
        border: "1px solid var(--border-color)",
      }}
    >
      <div
        style={{
          fontSize: "0.65rem",
          color: "var(--text-muted)",
          fontWeight: 800,
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontWeight: 700, color: color || "var(--text-main)" }}>{value}</div>
      {sub && (
        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>
      )}
    </div>
  );
}
