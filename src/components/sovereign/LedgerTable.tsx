// Sovereign Glidepath — Historical Timeline Ledger table (Build 126 file-size
// cleanup, Stage 3b).
//
// Extracted from SovereignGlidepath.tsx as a pure presentational component —
// same safe pattern as the modals and Scenario Test Runner: all state stays
// in the parent (ledger, showScenarioRunner, etc.), only the JSX moved. Row
// rendering only ever reads from the ledger entry it's given plus the two
// pure colour-helper functions imported below — nothing here reaches back
// into parent state that isn't passed explicitly as a prop.

import { formatGBP, type LedgerEntry } from "@/lib/sovereign/engine";
import { ScenarioTestRunnerPanel } from "./ScenarioTestRunnerPanel";

// Build 126 — moved here (not duplicated, not imported back from the
// parent) since these two colour helpers were only ever used by the ledger
// table. Importing them back from SovereignGlidepath.tsx would create a
// circular import, since the parent also imports LedgerTable.
function phaseBadgeClass(phase: string): string {
  if (phase.includes("Slow")) return "pb-goslow";
  if (phase.includes("No-Go")) return "pb-nogo";
  return "pb-gogo";
}

// Colour by drawdown magnitude (peak-to-trough %). Treats input as positive %.
function drawdownColor(pct: number): string {
  const d = Math.abs(Number(pct) || 0);
  if (d < 5) return "var(--accent-green)";
  if (d < 10) return "var(--text-muted)";
  if (d < 20) return "var(--accent-amber)";
  return "var(--accent-red)";
}

export interface LedgerTableProps {
  ledger: LedgerEntry[];
  setLedger: (ledger: LedgerEntry[]) => void;
  showToast: (message: string) => void;
  downloadAsFile: (data: string, filename: string) => void;
  showScenarioRunner: boolean;
  setShowScenarioRunner: (updater: (v: boolean) => boolean) => void;
  exportLedgerCsv: () => void;
  clearLedger: () => void;
  editEntry: (i: number) => void;
  deleteEntry: (i: number) => void;
}

export function LedgerTable({
  ledger,
  setLedger,
  showToast,
  downloadAsFile,
  showScenarioRunner,
  setShowScenarioRunner,
  exportLedgerCsv,
  clearLedger,
  editEntry,
  deleteEntry,
}: LedgerTableProps) {
  // Build 073 — display order is chronological by real date (newest first).
  // Blank-date rows sink to the end but keep insertion order. edit/delete
  // still target the original ledger index, not the sorted position.
  const sorted = ledger
    .map((d, i) => ({ d, i }))
    .sort((a, b) => {
      const da = (a.d.isSpecialEvent ? a.d.eventDate : a.d.periodEndDate) || "";
      const db = (b.d.isSpecialEvent ? b.d.eventDate : b.d.periodEndDate) || "";
      if (!da && !db) return a.i - b.i;
      if (!da) return 1;
      if (!db) return -1;
      if (da > db) return -1;
      if (da < db) return 1;
      return a.i - b.i;
    });

  const normal = ledger.filter(
    (e) => !e.isSpecialEvent && e.entryKind !== "special_withdrawal" && e.entryKind !== "windfall",
  );
  const missingDates = normal.filter((e) => !(typeof e.periodEndDate === "string" && e.periodEndDate));
  const dateHealth = {
    total: normal.length,
    missing: missingDates.length,
    missingLabels: missingDates.map((e) => e.label || "(no label)"),
  };

  return (
    <div className="shd-card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <h2
          className="shd-h2"
          style={{ margin: 0, cursor: "pointer", userSelect: "none" }}
          onDoubleClick={() => setShowScenarioRunner((v) => !v)}
          title="Double-click to toggle the Scenario Test Runner (QA aid)"
        >
          7. Historical Timeline Ledger
        </h2>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
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
            onClick={exportLedgerCsv}
            title="Download the full ledger as CSV (all rows, sorted chronologically)"
          >
            <span aria-hidden="true" style={{ fontSize: "0.9rem", lineHeight: 1 }}>
              ⬇
            </span>
            Download Ledger (CSV)
          </button>
          <button
            className="secondary"
            style={{
              color: "var(--accent-red)",
              fontSize: "0.8rem",
              borderColor: "rgba(239,68,68,0.4)",
            }}
            onClick={clearLedger}
          >
            Wipe Records
          </button>
        </div>
      </div>
      <ScenarioTestRunnerPanel
        visible={showScenarioRunner}
        ledger={ledger}
        setLedger={setLedger}
        showToast={showToast}
        downloadAsFile={downloadAsFile}
      />
      {dateHealth.missing > 0 && (
        <div
          style={{
            fontSize: "0.78rem",
            padding: "0.5rem 0.75rem",
            marginBottom: "0.75rem",
            borderRadius: "0.4rem",
            border: "1px solid rgba(245,158,11,0.35)",
            background: "rgba(245,158,11,0.08)",
            color: "var(--text-main)",
          }}
          title={"Rows currently missing a Period End Date:\n" + dateHealth.missingLabels.join("\n")}
        >
          <strong>Period End Date:</strong>{" "}
          <span style={{ color: "var(--accent-amber)", fontWeight: 700 }}>
            {dateHealth.missing} of {dateHealth.total} ledger row
            {dateHealth.total === 1 ? "" : "s"} currently lack a Period End Date
          </span>{" "}
          (marked ⚠ in the Timeline column — click Edit to set the real date).
        </div>
      )}
      <div className="table-container">
        <table className="ledger-table-stacked">
          <thead>
            <tr>
              <th>Timeline</th>
              <th className="text-right">Asset Pools</th>
              <th className="text-right">Portfolio Total</th>
              <th className="text-center">Drawdown from ATH</th>
              <th className="text-right">Withdrawal Recorded</th>
              <th>Status &amp; Controls</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ d, i }) => {
              const wPct =
                Number(d.totalCapital) > 0 ? (Number(d.targetYearly || 0) / Number(d.totalCapital)) * 100 : 0;
              return (
                <tr
                  key={`${d.label}-${i}`}
                  className="ledger-row-stacked"
                  style={d.isSpecialEvent ? { background: "rgba(168,85,247,0.06)" } : undefined}
                >
                  {/* Timeline */}
                  <td>
                    <div className="cell-primary">
                      {d.isSpecialEvent && (
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: "0.6rem",
                            fontWeight: 800,
                            color: "var(--accent-purple)",
                            border: "1px solid var(--accent-purple)",
                            padding: "1px 5px",
                            borderRadius: 3,
                            marginRight: 6,
                            verticalAlign: "middle",
                          }}
                          title={
                            d.isInflowEvent
                              ? "Extraordinary inflow — one-off addition and ATH re-anchor"
                              : "One-off special-event withdrawal recorded from Pane 5"
                          }
                        >
                          {d.isInflowEvent ? "★ Event: Inflow" : "★ Event: Outflow"}
                        </span>
                      )}
                      {d.isSpecialEvent
                        ? String(d.label || "")
                            .replace(/^EVENT:\s*Windfall Inflow\s*[—-]\s*/i, "")
                            .replace(/^EVENT:\s*/i, "")
                            .replace(/^SPECIAL:\s*/i, "")
                        : d.label}
                    </div>
                    {!d.isSpecialEvent && (
                      <div className="cell-muted" style={{ whiteSpace: "nowrap" }}>
                        Age {d.age}
                        {typeof d.cappingAge === "number" && d.cappingAge > 0 && (
                          <span title="Horizon / Capping Age in effect when this row was committed">
                            {" · Horizon Age "}
                            {d.cappingAge}
                          </span>
                        )}
                      </div>
                    )}
                    <div
                      className="cell-muted"
                      style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}
                    >
                      <span className={`phase-badge ${phaseBadgeClass(d.phase || "")}`}>{d.phase}</span>
                      {!d.isSpecialEvent && d.guardrailStatus && (
                        <span
                          style={{
                            fontSize: "0.65rem",
                            padding: "1px 5px",
                            borderRadius: 3,
                            border: "1px solid var(--border-color)",
                            color: "var(--text-muted)",
                          }}
                          title="Withdrawal Status (Pane 2) in effect at commit time"
                        >
                          {d.guardrailStatus}
                        </span>
                      )}
                    </div>
                    <div className="cell-muted" style={{ whiteSpace: "nowrap" }}>
                      {d.isSpecialEvent ? (
                        d.eventDate ? (
                          <>Date committed: {d.eventDate}</>
                        ) : null
                      ) : d.periodEndDate ? (
                        <>Date committed: {d.periodEndDate}</>
                      ) : (
                        <span
                          style={{ color: "var(--accent-amber)", fontWeight: 600 }}
                          title="Period End Date not set — this legacy row could not be auto-migrated from its label. Click Edit to set a real date."
                        >
                          ⚠ date not set
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Asset Pools */}
                  <td className="text-right">
                    <div className="cell-primary">
                      <span className="cell-label">Equities</span> {formatGBP(d.equities)}
                    </div>
                    <div className="cell-primary">
                      <span className="cell-label">Cash</span> {formatGBP(d.mmFund)}
                    </div>
                  </td>
                  {/* Portfolio Total */}
                  <td className="text-right">
                    <div className="cell-primary" style={{ fontWeight: 700 }}>
                      {formatGBP(d.totalCapital)}
                    </div>
                    <div className="cell-muted">ATH {formatGBP(d.ath)}</div>
                    {!d.isSpecialEvent && typeof d.funBucket === "number" && (
                      <div className="cell-muted" style={{ color: "var(--accent-purple)" }}>
                        Fun Bucket {formatGBP(d.funBucket)}
                      </div>
                    )}
                  </td>
                  {/* Drawdown from ATH */}
                  <td className="text-center">
                    <div
                      className="cell-primary"
                      style={{
                        color: drawdownColor(Number(d.drawdownPct) || 0),
                        fontWeight: 700,
                        fontSize: "1rem",
                      }}
                      title="Peak-to-trough decline from all-time high. 0% = at ATH."
                    >
                      {(Number(d.drawdownPct) || 0).toFixed(2)}%
                    </div>
                  </td>
                  {/* Drawdown Income (or Special-Event withdrawal) */}
                  <td className="text-right">
                    {d.isSpecialEvent ? (
                      <>
                        <div
                          className="cell-primary"
                          style={{ color: "var(--accent-purple)", fontWeight: 700 }}
                          title={
                            d.isInflowEvent
                              ? "Extraordinary inflow — funds added, ATH re-anchored"
                              : "Special-event withdrawal — one-off deduction from the pot"
                          }
                        >
                          {d.isInflowEvent ? "+" : "−"}
                          {formatGBP(Number(d.eventAmount) || 0)}
                        </div>
                        <div className="cell-muted">
                          {(() => {
                            const eq = Number(d.eventFromEq) || 0;
                            const ca = Number(d.eventFromCash) || 0;
                            const sign = d.isInflowEvent ? "+" : "";
                            const parts: string[] = [];
                            if (eq > 0) parts.push(`Eq ${sign}${formatGBP(eq)}`);
                            if (ca > 0) parts.push(`Cash ${sign}${formatGBP(ca)}`);
                            return parts.join(" · ") || (d.isInflowEvent ? "Windfall inflow" : "Special event");
                          })()}
                          {d.isInflowEvent ? ` · ATH → ${formatGBP(Number(d.ath) || 0)}` : ""}
                          {d.eventNote ? ` — ${d.eventNote}` : ""}
                        </div>
                      </>
                    ) : (
                      (() => {
                        const hasAmt = typeof d.withdrawnAmount === "number" && d.withdrawnAmount > 0;
                        const hasSplit =
                          typeof d.withdrawnFromEquities === "number" || typeof d.withdrawnFromCash === "number";
                        const eq = d.withdrawnFromEquities ?? 0;
                        const ca = d.withdrawnFromCash ?? 0;
                        const rebDir = d.rebalanceDirection ?? "none";
                        const rebAmt = d.rebalanceAmount ?? 0;
                        return (
                          <>
                            <div className="cell-primary">
                              {hasAmt ? formatGBP(d.withdrawnAmount!) : formatGBP(Number(d.targetYearly) || 0)}
                            </div>
                            {hasAmt && hasSplit ? (
                              <div className="cell-muted">
                                Eq {formatGBP(eq)} / Cash {formatGBP(ca)}
                              </div>
                            ) : null}
                            <div className="cell-muted">
                              {hasAmt && !hasSplit
                                ? `Withdrawn this quarter · source not recorded · WR ${wPct.toFixed(2)}%`
                                : hasAmt
                                  ? `Withdrawn this quarter · WR ${wPct.toFixed(2)}%`
                                  : `WR ${wPct.toFixed(2)}%`}
                            </div>
                            {rebDir !== "none" && rebAmt > 0 ? (
                              <div className="cell-muted" style={{ fontStyle: "italic" }}>
                                Rebalance: {formatGBP(rebAmt)} {rebDir === "eq_to_cash" ? "Eq → Cash" : "Cash → Eq"}
                              </div>
                            ) : null}
                          </>
                        );
                      })()
                    )}
                  </td>
                  {/* Status & Controls */}
                  <td>
                    <div className="cell-primary" style={{ fontSize: "0.8rem" }}>
                      {d.rule}
                    </div>
                    <div className="cell-muted" style={{ display: "flex", gap: 4, marginTop: 4 }}>
                      {/* Build 106 — event rows (Special Event withdrawal /
                        Windfall inflow) are Delete-only: Pane 1's generic
                        Normal-entry editor is the wrong shape for them and
                        corrupts the row on save. Re-commit to correct. */}
                      {!d.isSpecialEvent &&
                      !d.isInflowEvent &&
                      d.entryKind !== "special_withdrawal" &&
                      d.entryKind !== "windfall" ? (
                        <button className="edit-action" onClick={() => editEntry(i)}>
                          Edit
                        </button>
                      ) : (
                        <button
                          className="edit-action"
                          aria-hidden="true"
                          tabIndex={-1}
                          style={{ visibility: "hidden" }}
                        >
                          Edit
                        </button>
                      )}

                      <button className="danger-action" onClick={() => deleteEntry(i)}>
                        Del
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

