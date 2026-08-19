// Sovereign Glidepath — Commit-confirmation modal (Build 126 file-size
// cleanup, Stage 3d).
//
// Extracted from SovereignGlidepath.tsx as a pure presentational component —
// same safe pattern as the other modals: this is the final review screen
// before a row is written to the ledger, and it only ever reads live Pane 1
// state to build its review table. Nothing here owns any state; every value
// is a prop, and the two actions (Cancel / Commit) are callbacks the parent
// still implements (setShowCommitConfirm, performCommit).

import { cleanNum, formatGBP, phaseFor } from "@/lib/sovereign/engine";

export interface CommitConfirmModalProps {
  visible: boolean;
  editIndex: number;
  label: string;
  periodEndDate: string;
  age: number;
  equityVal: string;
  mmVal: string;
  athVal: string;
  targetYearly: string;
  legacyTarget: number;
  desiredRunwayMonths: number;
  growthRate: number;
  actualCpiInput: string;
  wdEqStr: string;
  wdCashStr: string;
  rebalDir: "none" | "eq_to_cash" | "cash_to_eq";
  rebalAmtStr: string;
  guardrailAdjustedQuarterly: number;
  nominaliseRequest: (realAmount: number) => number;
  directiveGuardrailText: string;
  directiveGuardrailColor: string;
  onCancel: () => void;
  onCommit: () => void;
}

export function CommitConfirmModal({
  visible,
  editIndex,
  label,
  periodEndDate,
  age,
  equityVal,
  mmVal,
  athVal,
  targetYearly,
  legacyTarget,
  desiredRunwayMonths,
  growthRate,
  actualCpiInput,
  wdEqStr,
  wdCashStr,
  rebalDir,
  rebalAmtStr,
  guardrailAdjustedQuarterly,
  nominaliseRequest,
  directiveGuardrailText,
  directiveGuardrailColor,
  onCancel,
  onCommit,
}: CommitConfirmModalProps) {
  if (!visible) return null;

  const eqR = cleanNum(equityVal);
  const mmR = cleanNum(mmVal);
  const tot = eqR + mmR;
  const athCur = cleanNum(athVal);
  const athNew = Math.max(athCur, tot);
  const athRose = athNew > athCur + 0.005;
  const wr = tot > 0 ? (cleanNum(targetYearly) / tot) * 100 : 0;
  const dd = athNew > 0 ? ((athNew - tot) / athNew) * 100 : 0;
  const cell: React.CSSProperties = {
    padding: "0.3rem 0.5rem",
    borderBottom: "1px solid var(--border-color)",
    fontSize: "0.85rem",
  };
  const kcell: React.CSSProperties = { ...cell, color: "var(--text-muted)", width: "45%" };
  const vcell: React.CSSProperties = {
    ...cell,
    color: "var(--text-main)",
    fontWeight: 600,
    textAlign: "right",
  };

  const wdEq = cleanNum(wdEqStr);
  const wdCash = cleanNum(wdCashStr);
  const wdTotal = wdEq + wdCash;
  // Build 125d — compare against the NOMINAL request (what the directive
  // actually told the user to withdraw), or this would wrongly flag a
  // mismatch for someone who correctly followed the directive's
  // inflation-adjusted figure.
  const req = nominaliseRequest(guardrailAdjustedQuarterly);
  const mismatch = wdTotal > 0 && Math.abs(wdTotal - req) > 0.005;
  const rebAmt = rebalDir === "none" ? 0 : Math.max(0, cleanNum(rebalAmtStr));
  const rebLabel = rebalDir === "eq_to_cash" ? "Equities → Cash" : rebalDir === "cash_to_eq" ? "Cash → Equities" : "None";

  return (
    <div className="shd-overlay" role="dialog" aria-modal="true">
      <div className="shd-modal" style={{ width: 520, maxHeight: "90vh", overflowY: "auto" }}>
        <h2
          style={{
            fontSize: "1.15rem",
            fontWeight: 800,
            margin: "0 0 0.35rem 0",
            textTransform: "none",
            letterSpacing: 0,
          }}
        >
          {editIndex > -1 ? "Confirm Ledger Update" : "Confirm Ledger Entry"}
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.85rem" }}>
          Review the values below carefully. Once committed, this row will be written to your Historical Timeline
          Ledger. Use <em>Cancel</em> to go back and fix any typos.
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "0.75rem" }}>
          <tbody>
            <tr>
              <td style={kcell}>Label</td>
              <td style={vcell}>{(label || "Unlabeled").trim().slice(0, 40) || "Unlabeled"}</td>
            </tr>
            <tr>
              <td style={kcell}>Period End Date</td>
              <td style={vcell}>
                {periodEndDate ? periodEndDate : <span style={{ color: "var(--accent-amber)" }}>date not set</span>}
              </td>
            </tr>
            <tr>
              <td style={kcell}>Age / Phase</td>
              <td style={vcell}>
                {age} · {phaseFor(age)}
              </td>
            </tr>
            <tr>
              <td style={kcell}>Global Equities</td>
              <td style={vcell}>{formatGBP(eqR)}</td>
            </tr>
            <tr>
              <td style={kcell}>Cash Pot</td>
              <td style={vcell}>{formatGBP(mmR)}</td>
            </tr>
            <tr>
              <td style={kcell}>Total Capital</td>
              <td style={vcell}>{formatGBP(tot)}</td>
            </tr>
            <tr>
              <td style={kcell}>Stored ATH{athRose ? " (will be raised)" : ""}</td>
              <td style={{ ...vcell, color: athRose ? "var(--accent-green)" : undefined }}>
                {formatGBP(athNew)}
                {athRose ? ` (was ${formatGBP(athCur)})` : ""}
              </td>
            </tr>
            <tr>
              <td style={kcell}>Drawdown vs ATH</td>
              <td style={vcell}>{dd.toFixed(2)}%</td>
            </tr>
            <tr>
              <td style={kcell}>Initial Annual Withdrawal (Frozen)</td>
              <td style={vcell}>
                {formatGBP(cleanNum(targetYearly))} ({wr.toFixed(2)}% WR)
              </td>
            </tr>
            <tr>
              <td style={kcell}>Legacy Target</td>
              <td style={vcell}>{legacyTarget > 0 ? formatGBP(legacyTarget) : "—"}</td>
            </tr>
            <tr>
              <td style={kcell}>Cash Buffer Target</td>
              <td style={vcell}>{desiredRunwayMonths} months</td>
            </tr>
            <tr>
              <td style={kcell}>Assumed Growth</td>
              <td style={vcell}>{growthRate.toFixed(1)}%</td>
            </tr>
            <tr>
              <td style={kcell}>Actual CPI Since Last Entry</td>
              <td style={vcell}>
                {actualCpiInput.trim() !== "" ? `${cleanNum(actualCpiInput).toFixed(2)}%` : "— (using assumed)"}
              </td>
            </tr>
            <tr>
              <td style={kcell}>Withdrawn from Equities</td>
              <td style={vcell}>{wdEq > 0 ? formatGBP(wdEq) : "—"}</td>
            </tr>
            <tr>
              <td style={kcell}>Withdrawn from Cash</td>
              <td style={vcell}>{wdCash > 0 ? formatGBP(wdCash) : "—"}</td>
            </tr>
            <tr>
              <td style={kcell}>Withdrawal Total</td>
              <td style={vcell}>
                {wdTotal > 0 ? formatGBP(wdTotal) : "—"}
                {mismatch ? (
                  <span
                    style={{
                      color: "var(--accent-amber)",
                      fontSize: "0.75rem",
                      marginLeft: 6,
                      fontWeight: 500,
                    }}
                  >
                    (Eq+Cash ≠ Request {formatGBP(req)})
                  </span>
                ) : null}
              </td>
            </tr>
            <tr>
              <td style={kcell}>Rebalance Move</td>
              <td style={vcell}>{rebalDir === "none" || rebAmt <= 0 ? "None" : `${formatGBP(rebAmt)} ${rebLabel}`}</td>
            </tr>
            <tr>
              <td style={{ ...kcell, borderBottom: 0 }}>Directive</td>
              <td style={{ ...vcell, borderBottom: 0, color: directiveGuardrailColor }}>{directiveGuardrailText}</td>
            </tr>
          </tbody>
        </table>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <button className="secondary" onClick={onCancel}>
            Cancel
          </button>
          <button onClick={onCommit} style={{ fontWeight: 700 }}>
            {editIndex > -1 ? "Update Entry" : "Commit to Ledger"}
          </button>
        </div>
      </div>
    </div>
  );
}

