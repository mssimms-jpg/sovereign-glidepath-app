// Sovereign Glidepath — Scenario Test Runner panel (Build 126).
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!visible) return null;

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
      const proceed = () => {
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

      if (ledger.length > 0) {
        const backupFilename = `sovereign-ledger-backup-before-scenario_${localTimestamp()}.json`;
        downloadAsFile(JSON.stringify(ledger, null, 2), backupFilename);
        const ok = window.confirm(
          `This will REPLACE your current ledger (${ledger.length} row${ledger.length === 1 ? "" : "s"}) with the ` +
            `scenario file's built ledger. A backup of your current ledger was just downloaded as ` +
            `"${backupFilename}" — restore it via the Restore button if you need to undo this.\n\nContinue?`,
        );
        if (!ok) return;
      }
      proceed();
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold">Scenario Test Runner (QA aid)</h3>
        <p className="text-sm text-muted-foreground">
          Builds a complete ledger from a JSON scenario file, driven through the real engine — the same
          calculate()/generateDirectives() logic the live app uses. This replaces your current ledger.{" "}
          If a ledger already exists, a plain JSON backup downloads automatically first, restorable via the Restore
          button above.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) runScenarioFile(file);
          e.target.value = "";
        }}
      />
      <button className="btn-primary" onClick={() => fileInputRef.current?.click()} disabled={scenarioRunning}>
        {scenarioRunning ? "Running…" : "Choose scenario file & run"}
      </button>
      {scenarioFileName && (
        <p className="text-sm text-muted-foreground">
          {scenarioFileName}
        </p>
      )}

      {scenarioError && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-950/30 dark:text-red-200">
          {scenarioError}
        </div>
      )}

      {scenarioResult && (
        <div className="space-y-3 rounded-lg border border-border bg-background p-3">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              Rows built: {scenarioResult.rowCount}
            </div>
            <div>
              Final total capital: {formatGBP(scenarioResult.finalTotalCapital)}
            </div>
            <div>
              Exhausted: {scenarioResult.anyExhausted ? "Yes" : "No"}
            </div>
          </div>

          {scenarioResult.mismatches.length === 0 ? (
            <p className="text-sm text-green-700 dark:text-green-300">
              ✓ All expectations matched.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                ✗ {scenarioResult.mismatches.length} mismatch{scenarioResult.mismatches.length === 1 ? "" : "es"}{" "}
                found:
              </p>

              <ul className="space-y-1 text-sm">
                {scenarioResult.mismatches.map((m, i) => (
                  <li key={i}>
                    Row {m.rowIndex}, {m.field}: expected {String(m.expected)}, got {String(m.actual)}
                  </li>
                ))}
              </ul>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-1 text-left font-medium">Row</th>
                    <th className="py-1 text-left font-medium">Field</th>
                    <th className="py-1 text-left font-medium">Expected</th>
                    <th className="py-1 text-left font-medium">Actual</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarioResult.mismatches.map((m, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="py-1">{m.rowIndex}</td>
                      <td className="py-1">{m.field}</td>
                      <td className="py-1">{String(m.expected)}</td>
                      <td className="py-1">{String(m.actual)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
