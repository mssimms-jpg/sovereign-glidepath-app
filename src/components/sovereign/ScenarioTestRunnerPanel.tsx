// Sovereign Glidepath — Scenario Test Runner panel (Build 126; restyled
// and confirm() replaced with an in-app modal in Build 127).
//
// QA aid: builds a COMPLETE, real ledger from a JSON scenario file, driven
// through the real engine (calculate()/generateDirectives() via
// runScenario() in scenarioRunner.ts) — not a re-implementation. Extracted
// from SovereignGlidepath.tsx as its own file per the file-size cleanup
// agreed after Build 126: this panel owns all of its own state (nothing
// here is read by the parent or any sibling), so it was a safe, low-risk
// first extraction — a copy-paste-and-import exercise, not a structural
// state-ownership decision.
//
// Because running a scenario REPLACES the current ledger, any existing
// ledger is auto-backed-up as a plain (unencrypted, restorable via the
// normal Restore button) JSON download before the replacement is confirmed.
//
// Build 127 — two changes:
//  1. Restyled off Tailwind/shadcn utility classes (bg-card,
//     text-muted-foreground, btn-primary, etc.), which never actually
//     resolved correctly here: the app never applies the `.dark` class
//     shadcn's theme needs, and `.btn-primary` was never defined at all —
//     so the panel rendered as an unstyled light-mode card with a
//     browser-default button, floating inside the app's dark theme. Now
//     uses the same shd-cluster / shd-sub / native table conventions the
//     rest of the app already uses.
//  2. The native window.confirm() before a replace was replaced with the
//     app's own shd-overlay/shd-modal dialog (same pattern as
//     CommitConfirmModal), because a native confirm() can only show plain
//     text — no bold, no colour — and the backup-filename callout and the
//     unencrypted-backup warning both need that.

import { useRef, useState } from "react";
import { runScenario, type ScenarioFile, type ScenarioRunResult } from "@/lib/sovereign/scenarioRunner";
import { formatGBP, type LedgerEntry } from "@/lib/sovereign/engine";
import { localTimestamp } from "@/lib/sovereign/csvExport";

export interface ScenarioTestRunnerPanelProps {
  visible: boolean;
  ledger: LedgerEntry[];
  setLedger: (ledger: LedgerEntry[]) => void;
  showToast: (message: string) => void;
  /** Generic file-download helper already used elsewhere in the app for backups. */
  downloadAsFile: (data: string, filename: string) => void;
}

interface PendingReplace {
  scenario: ScenarioFile;
  backupFilename: string;
  rowCount: number;
}

export function ScenarioTestRunnerPanel({
  visible,
  ledger,
  setLedger,
  showToast,
  downloadAsFile,
}: ScenarioTestRunnerPanelProps) {
  const [scenarioResult, setScenarioResult] = useState<ScenarioRunResult | null>(null);
  const [scenarioError, setScenarioError] = useState<string | null>(null);
  const [scenarioFileName, setScenarioFileName] = useState("");
  const [scenarioRunning, setScenarioRunning] = useState(false);
  const [pendingReplace, setPendingReplace] = useState<PendingReplace | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!visible) return null;

  const runScenarioNow = (scenario: ScenarioFile) => {
    setScenarioRunning(true);
    try {
      const result = runScenario(scenario);
      setLedger(result.ledger);
      setScenarioResult(result);
      showToast(
        result.mismatches.length === 0
          ? `Scenario built: ${result.rowCount} rows, all expectations matched`
          : `Scenario built: ${result.rowCount} rows, ${result.mismatches.length} mismatch(es) — see below`,
      );
    } catch (ex) {
      setScenarioError(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setScenarioRunning(false);
    }
  };

  const runScenarioFile = (file: File) => {
    setScenarioError(null);
    setScenarioResult(null);
    setScenarioFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      let scenario: ScenarioFile;
      try {
        scenario = JSON.parse(String(e.target?.result || ""));
      } catch {
        setScenarioError("Could not parse this file as JSON.");
        return;
      }

      if (ledger.length > 0) {
        const backupFilename = `sovereign-ledger-backup-before-scenario_${localTimestamp()}.json`;
        downloadAsFile(JSON.stringify(ledger, null, 2), backupFilename);
        setPendingReplace({ scenario, backupFilename, rowCount: ledger.length });
        return;
      }
      runScenarioNow(scenario);
    };
    reader.readAsText(file);
  };

  return (
    <div className="shd-cluster" style={{ marginBottom: "1.25rem" }}>
      <div style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.4rem" }}>Scenario Test Runner (QA aid)</div>
      <p className="shd-sub" style={{ marginTop: 0, marginBottom: "1rem", lineHeight: 1.6 }}>
        Builds a complete ledger from a JSON scenario file, driven through the real engine — the same
        calculate()/generateDirectives() logic the live app uses. This replaces your current ledger. If a ledger
        already exists, a plain JSON backup downloads automatically first, restorable via the Restore button above.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) runScenarioFile(file);
          e.target.value = "";
        }}
      />
      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={scenarioRunning}>
        {scenarioRunning ? "Running…" : "Choose scenario file & run"}
      </button>
      {scenarioFileName && (
        <p className="shd-sub" style={{ marginTop: "0.6rem", marginBottom: 0 }}>
          {scenarioFileName}
        </p>
      )}

      {scenarioError && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: "0.4rem",
            border: "1px solid rgba(239,68,68,0.4)",
            background: "rgba(239,68,68,0.08)",
            color: "#fca5a5",
            fontSize: "0.85rem",
          }}
        >
          {scenarioError}
        </div>
      )}

      {scenarioResult && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
            borderRadius: "0.5rem",
            border: "1px solid var(--border-color)",
            background: "rgba(15,23,42,0.4)",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", fontSize: "0.85rem" }}>
            <div>
              <span className="shd-sub">Rows built: </span>
              <strong>{scenarioResult.rowCount}</strong>
            </div>
            <div>
              <span className="shd-sub">Final total capital: </span>
              <strong>{formatGBP(scenarioResult.finalTotalCapital)}</strong>
            </div>
            <div>
              <span className="shd-sub">Exhausted: </span>
              <strong>{scenarioResult.anyExhausted ? "Yes" : "No"}</strong>
            </div>
          </div>

          {scenarioResult.mismatches.length === 0 ? (
            <p style={{ marginTop: "0.85rem", marginBottom: 0, color: "var(--accent-green)", fontWeight: 700 }}>
              ✓ All expectations matched.
            </p>
          ) : (
            <div style={{ marginTop: "0.85rem" }}>
              <p style={{ color: "var(--accent-red)", fontWeight: 700, marginBottom: "0.6rem" }}>
                ✗ {scenarioResult.mismatches.length} mismatch{scenarioResult.mismatches.length === 1 ? "" : "es"}{" "}
                found:
              </p>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Field</th>
                      <th>Expected</th>
                      <th>Actual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenarioResult.mismatches.map((m, i) => (
                      <tr key={i}>
                        <td>{m.rowIndex}</td>
                        <td>{m.field}</td>
                        <td>{String(m.expected)}</td>
                        <td>{String(m.actual)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {pendingReplace && (
        <div className="shd-overlay" role="dialog" aria-modal="true">
          <div className="shd-modal" style={{ width: 520 }}>
            <h2
              style={{
                fontSize: "1.2rem",
                fontWeight: 800,
                margin: "0 0 1rem 0",
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              Replace current ledger?
            </h2>
            <p style={{ marginTop: 0, lineHeight: 1.6 }}>
              This will <strong>REPLACE</strong> your current ledger ({pendingReplace.rowCount} row
              {pendingReplace.rowCount === 1 ? "" : "s"}) with the scenario file's built ledger.
            </p>
            <p style={{ lineHeight: 1.6 }}>
              A backup of your current ledger was just downloaded as:
              <br />
              <strong style={{ wordBreak: "break-all" }}>{pendingReplace.backupFilename}</strong>
            </p>
            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "0.4rem",
                border: "1px solid rgba(239,68,68,0.4)",
                background: "rgba(239,68,68,0.08)",
                color: "var(--accent-red)",
                fontSize: "0.85rem",
                lineHeight: 1.6,
                marginBottom: "1rem",
              }}
            >
              ⚠ That backup file is <strong>unencrypted</strong>. If that isn't acceptable, click Cancel below, make
              your own encrypted backup, use <strong>Wipe Records</strong>, then come back to Scenario Test Runner
              and run again.
            </div>
            <p className="shd-sub" style={{ marginBottom: "1.5rem" }}>
              Restore this backup any time via the Restore button if you need to undo this.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                className="secondary"
                onClick={() => {
                  setPendingReplace(null);
                }}
              >
                Cancel
              </button>
              <button
                style={{ fontWeight: 700 }}
                onClick={() => {
                  const { scenario } = pendingReplace;
                  setPendingReplace(null);
                  runScenarioNow(scenario);
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
