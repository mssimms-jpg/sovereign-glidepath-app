// Sovereign Glidepath — generic ledger CSV exporter.
// Reusable by Audit Mode today and by "snapshot my simulation" later.

export interface CsvColumn<Row> {
  header: string;
  value: (row: Row) => string | number;
}

export interface CsvFilenameParts {
  returnSource: "historical" | "parametric";
  tickMode: "yearly" | "quarterly";
  drawMode: "strict" | "standard" | "aggressive";
  ageRange: string; // e.g. "age55-85"
  prefix?: string; // default "sovereign-audit"
}

function pad2(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

export function localTimestamp(d = new Date()): string {
  return (
    d.getFullYear().toString() +
    pad2(d.getMonth() + 1) +
    pad2(d.getDate()) +
    "-" +
    pad2(d.getHours()) +
    pad2(d.getMinutes())
  );
}

export function buildCsvFilename(parts: CsvFilenameParts): string {
  const prefix = parts.prefix ?? "sovereign-audit";
  return `${prefix}_${parts.returnSource}_${parts.tickMode}_${parts.drawMode}_${parts.ageRange}_${localTimestamp()}.csv`;
}

function csvEscape(v: string | number): string {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportLedgerCSV<Row>(
  rows: Row[],
  columns: CsvColumn<Row>[],
  metadata: Record<string, string | number>,
  filenameOrParts: CsvFilenameParts | { filename: string },
): void {
  const lines: string[] = [];
  lines.push(`# Sovereign Glidepath — Ledger Export`);
  lines.push(`# Generated: ${new Date().toISOString()}`);
  for (const [k, v] of Object.entries(metadata)) {
    lines.push(`# ${k}: ${v}`);
  }
  lines.push(columns.map((c) => csvEscape(c.header)).join(","));
  for (const row of rows) {
    lines.push(columns.map((c) => csvEscape(c.value(row))).join(","));
  }
  const csv = lines.join("\r\n") + "\r\n";

  const filename = "filename" in filenameOrParts ? filenameOrParts.filename : buildCsvFilename(filenameOrParts);

  // Prepend UTF-8 BOM so Excel on Windows detects encoding correctly (£, — etc.)
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// Build 126 — Sovereign Glidepath's own ledger export, extracted from
// SovereignGlidepath.tsx as part of the post-Build-126 file-size cleanup.
// Pure data transformation (sort, column definitions, formatting) with no
// component state beyond the values passed in — a safe extraction, unlike
// a stateful JSX panel, since there's no state-ownership decision to make.
import { computeInflationTracking, type LedgerEntry } from "./engine";

export interface SovereignLedgerExportMeta {
  cappingAge: number;
  growthRate: number;
  desiredRunwayMonths: number;
  targetYearly: number;
  currency: string;
}

export function exportSovereignLedgerCSV(ledger: LedgerEntry[], meta: SovereignLedgerExportMeta): void {
  if (ledger.length === 0) {
    alert("Ledger is empty — nothing to export.");
    return;
  }
  // Build 073 — sort by Period End Date ascending (real chronological order).
  // Event rows use `eventDate`; Normal rows use `periodEndDate`. Rows with
  // no date at all (unmigrated legacy) sink to the end but keep insertion
  // order. Age is deliberately NOT used as a sort proxy any more.
  const dateOf = (e: LedgerEntry): string => (e.isSpecialEvent ? e.eventDate : e.periodEndDate) || "";
  const chronological = ledger
    .map((e, idx) => ({ e, idx }))
    .sort((a, b) => {
      const da = dateOf(a.e);
      const db = dateOf(b.e);
      if (!da && !db) return a.idx - b.idx;
      if (!da) return 1;
      if (!db) return -1;
      if (da < db) return -1;
      if (da > db) return 1;
      return a.idx - b.idx;
    })
    .map((x) => x.e);

  const blank = "";
  const num = (n: number | undefined | null) => (typeof n === "number" && isFinite(n) ? n.toFixed(2) : blank);
  const pct = (n: number | undefined | null) => (typeof n === "number" && isFinite(n) ? n.toFixed(4) : blank);

  const kindOf = (d: LedgerEntry): "normal" | "special_withdrawal" | "windfall" => {
    if (d.entryKind) return d.entryKind;
    if (d.isInflowEvent) return "windfall";
    if (d.isSpecialEvent) return "special_withdrawal";
    return "normal";
  };

  // A row has "recorded" bucket-split data only when the Phase 1 fields are
  // actually present (Build 070+ Normal rows). Legacy Normal rows and event
  // rows must show blanks, not zeros.
  const hasSplit = (d: LedgerEntry) =>
    kindOf(d) === "normal" &&
    (typeof d.withdrawnFromEquities === "number" ||
      typeof d.withdrawnFromCash === "number" ||
      typeof d.rebalanceAmount === "number" ||
      d.rebalanceDirection !== undefined);

  const rebalLabel = (dir: LedgerEntry["rebalanceDirection"]) =>
    dir === "eq_to_cash"
      ? "Equities → Cash"
      : dir === "cash_to_eq"
        ? "Cash → Equities"
        : dir === "none"
          ? "None"
          : blank;

  const eventAmount = (d: LedgerEntry): string => {
    const kind = kindOf(d);
    if (kind === "windfall") return num(d.eventAmount);
    if (kind === "special_withdrawal") {
      const amt = typeof d.eventAmount === "number" ? d.eventAmount : (d.eventFromEq || 0) + (d.eventFromCash || 0);
      return amt ? num(amt) : blank;
    }
    return blank;
  };

  const targetWrPct = (d: LedgerEntry): string => {
    const tot = Number(d.totalCapital) || 0;
    const ty = Number(d.targetYearly) || 0;
    if (tot <= 0) return blank;
    return ((ty / tot) * 100).toFixed(4);
  };

  exportLedgerCSV<LedgerEntry>(
    chronological,
    [
      { header: "Reporting Period", value: (d) => d.label ?? "" },
      {
        header: "Period End Date",
        // Build 073 — real ISO date. Normal rows use periodEndDate; event
        // rows use eventDate. Blank for unmigrated legacy rows.
        value: (d) => (d.isSpecialEvent ? d.eventDate : d.periodEndDate) ?? "",
      },
      { header: "Age", value: (d) => (typeof d.age === "number" ? d.age : "") },
      {
        // Build 078 — per-row Horizon (capping) Age. The metadata header
        // shows the current live setting; this column preserves each row's
        // own stored cappingAge at commit time (may differ across rows).
        header: "Horizon Age",
        value: (d) => (typeof d.cappingAge === "number" && d.cappingAge > 0 ? d.cappingAge : ""),
      },

      { header: "Phase", value: (d) => d.phase ?? "" },
      { header: "Equities", value: (d) => num(d.equities) },
      { header: "Cash", value: (d) => num(d.mmFund) },
      { header: "Portfolio Total", value: (d) => num(d.totalCapital) },
      { header: "ATH", value: (d) => num(d.ath) },
      { header: "Drawdown from ATH (%)", value: (d) => pct(d.drawdownPct) },
      {
        header: "Fun Bucket Balance",
        // Build 126 — undefined on legacy rows (committed before this
        // field existed), NOT recomputed from today's assumptions — that
        // would fabricate a figure using assumptions that weren't actually
        // in force at the time.
        value: (d) => (typeof d.funBucket === "number" ? num(d.funBucket) : blank),
      },
      { header: "entryKind", value: (d) => kindOf(d) },
      {
        header: "Withdrawn from Equities",
        value: (d) => (hasSplit(d) ? num(d.withdrawnFromEquities) : blank),
      },
      {
        header: "Withdrawn from Cash",
        value: (d) => (hasSplit(d) ? num(d.withdrawnFromCash) : blank),
      },
      {
        header: "Withdrawal Total",
        value: (d) => (kindOf(d) === "normal" ? num(d.withdrawnAmount) : blank),
      },
      {
        header: "Rebalance Direction",
        value: (d) => (hasSplit(d) ? rebalLabel(d.rebalanceDirection) : blank),
      },
      {
        header: "Rebalance Amount",
        value: (d) => (hasSplit(d) ? num(d.rebalanceAmount) : blank),
      },
      { header: "Event Amount", value: (d) => eventAmount(d) },
      { header: "Target Withdrawal Rate (%)", value: (d) => targetWrPct(d) },
      // Build 079 — snapshot of Pane 2's Withdrawal Status + Guardrail State
      // (stored per-row at commit time). Positioned near Horizon Age so the
      // full Pane 2 context travels with the row into external tools.
      { header: "Withdrawal Status", value: (d) => d.guardrailStatus ?? "" },
      { header: "Guardrail State", value: (d) => d.rule ?? "" },
      { header: "Status/Directive", value: (d) => d.rule ?? "" },
    ],
    {
      "Row count": chronological.length,
      "Target Horizon Age": meta.cappingAge,
      "Assumed Growth Rate (%)": Number(meta.growthRate).toString(),
      "Cash Buffer Target (months)": meta.desiredRunwayMonths,
      "Annual Target Withdrawal": meta.targetYearly.toFixed(2),
      Currency: meta.currency,
    },
    { filename: `sovereign-ledger_${localTimestamp()}.csv` },
  );
}
// ============================================================================
// Build 130 — styled XLSX ledger export, merged into this file (not a
// separate xlsxExport.ts) so the whole Pane 7 export feature lands as one
// existing-file edit rather than needing a new-file creation step.
//
// Companion to exportSovereignLedgerCSV() above, offered alongside it in
// Pane 7 ("Export as XLSX" next to "Download Ledger (CSV)"). Produces a
// two-sheet workbook — "Summary & Assumptions" then "Full Ledger" — styled
// to match the sample workbook Mark supplied from an earlier session.
//
// Deliberately does NOT clone that sample's exact column set. Two of its
// columns (Annual Eq Return / Annual UK CPI) came from that specific
// scenario file's own year-by-year inputs, which only exist for a ledger
// built via the Scenario Test Runner — a hand-committed real ledger has no
// equivalent field, since Pane 1's assumptions are live settings, not a
// per-row record of "what actually happened in the market that quarter."
// This export instead uses the same proven column set exportSovereignLedgerCSV
// above already relies on, which is populated correctly for both real and
// scenario-built ledgers, styled in the sample's visual language instead of
// literally recreating its columns. The sample's dead last column ("Actual
// CPI to enter (%)", "(first row)" on every single row) is not reproduced
// here at all, per Mark's call.
//
// ExcelJS (not the community "xlsx"/SheetJS package) because it supports
// real cell styling — fills, fonts, wrapped headers, number formats, frozen
// panes — which a plain CSV or an unstyled xlsx-writer cannot.
//
// Imported dynamically inside exportSovereignLedgerXLSX() rather than at
// module scope: ExcelJS is a large dependency (~500KB) needed only when the
// person actually clicks "Export as XLSX" — a static import pulled it into
// the app's main bundle on every load, nearly tripling the desktop build's
// JS payload for a feature most sessions never touch. Dynamic import puts
// it in its own chunk, fetched once, on demand.

import type { ThresholdMode } from "./drawdown";
import type ExcelJSType from "exceljs";

export interface SovereignLedgerExportMetaXlsx {
  cappingAge: number;
  growthRate: number;
  desiredRunwayMonths: number;
  targetYearly: number;
  currency: string;
  legacyTarget: number;
  cashRealPct: number;
  inflationPct: number;
  pensionAmount: number;
  pensionStartAge: number;
  pensionIncreasePct: number;
  defensiveMode: ThresholdMode;
}

const HEADER_FILL = "FF2C3E50"; // matches the sample workbook's header navy
const HEADER_FONT_COLOR = "FFFFFFFF";
const CURRENCY_FMT = "#,##0.00";
const PCT_FMT = '0.00"%"'; // values are already *100 (e.g. 12.34), not 0.1234

function dateOf(e: LedgerEntry): string {
  return (e.isSpecialEvent ? e.eventDate : e.periodEndDate) ?? "";
}

function chronological(ledger: LedgerEntry[]): LedgerEntry[] {
  return ledger
    .map((e, idx) => ({ e, idx }))
    .sort((a, b) => {
      const da = dateOf(a.e);
      const db = dateOf(b.e);
      if (!da && !db) return a.idx - b.idx;
      if (!da) return 1;
      if (!db) return -1;
      if (da < db) return -1;
      if (da > db) return 1;
      return a.idx - b.idx;
    })
    .map((x) => x.e);
}

function kindOf(d: LedgerEntry): "normal" | "special_withdrawal" | "windfall" {
  if (d.entryKind) return d.entryKind;
  if (d.isInflowEvent) return "windfall";
  if (d.isSpecialEvent) return "special_withdrawal";
  return "normal";
}

function hasSplit(d: LedgerEntry): boolean {
  return (
    kindOf(d) === "normal" &&
    (typeof d.withdrawnFromEquities === "number" ||
      typeof d.withdrawnFromCash === "number" ||
      typeof d.rebalanceAmount === "number" ||
      d.rebalanceDirection !== undefined)
  );
}

function rebalLabel(dir: LedgerEntry["rebalanceDirection"]): string {
  if (dir === "eq_to_cash") return "Equities → Cash";
  if (dir === "cash_to_eq") return "Cash → Equities";
  if (dir === "none") return "None";
  return "";
}

function eventAmountOf(d: LedgerEntry): number | undefined {
  const kind = kindOf(d);
  if (kind === "windfall") return d.eventAmount;
  if (kind === "special_withdrawal") {
    const amt = typeof d.eventAmount === "number" ? d.eventAmount : (d.eventFromEq || 0) + (d.eventFromCash || 0);
    return amt || undefined;
  }
  return undefined;
}

function targetWrPctOf(d: LedgerEntry): number | undefined {
  const tot = Number(d.totalCapital) || 0;
  const ty = Number(d.targetYearly) || 0;
  if (tot <= 0) return undefined;
  return (ty / tot) * 100;
}

/** Applies the sample workbook's header styling: navy fill, white bold text, wrapped, frozen row. */
function styleHeaderRow(row: ExcelJSType.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEADER_FONT_COLOR }, size: 9 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { wrapText: true, vertical: "middle" };
  });
  row.height = 28;
}

export async function exportSovereignLedgerXLSX(
  ledger: LedgerEntry[],
  meta: SovereignLedgerExportMetaXlsx,
): Promise<void> {
  if (ledger.length === 0) {
    alert("Ledger is empty — nothing to export.");
    return;
  }

  const { default: ExcelJS } = await import("exceljs");

  const rows = chronological(ledger);
  const rowCount = rows.length;
  const oldest = rows[0];
  const newest = rows[rowCount - 1];
  const anyExhausted = ledger.some((e) => e.rule === "Exhaustion");
  const inflationTracking = computeInflationTracking(ledger, meta.inflationPct);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Sovereign Glidepath";
  wb.created = new Date();

  // ---------- Sheet 1: Summary & Assumptions ----------
  const ws1 = wb.addWorksheet("Summary & Assumptions");
  ws1.getColumn(1).width = 40;
  ws1.getColumn(2).width = 22;

  ws1.addRow(["Sovereign Glidepath — Ledger Export"]).font = { bold: true, size: 14 };
  ws1.addRow([
    `Exported ${new Date().toISOString().slice(0, 10)} — ${rowCount} rows, ${dateOf(oldest)} to ${dateOf(newest)}.`,
  ]).font = {
    size: 10,
  };
  ws1.addRow([]);

  const assumptionsHeader = ws1.addRow(["Assumption", "Value"]);
  assumptionsHeader.font = { bold: true, size: 11 };

  const assumptionRows: [string, string | number, string?][] = [
    ["Target Horizon Age", meta.cappingAge],
    ["Assumed Growth Rate (%)", meta.growthRate],
    ["Assumed Cash Real Return (%)", meta.cashRealPct],
    ["Assumed Inflation, Pane 1 slider (%)", meta.inflationPct],
    ["Cash Buffer Target (months)", meta.desiredRunwayMonths],
    ["Legacy Target", meta.legacyTarget, CURRENCY_FMT],
    ["Annual Target Withdrawal (Frozen Baseline)", meta.targetYearly, CURRENCY_FMT],
    ["State Pension (today's money)", meta.pensionAmount, CURRENCY_FMT],
    ["Pension Start Age", meta.pensionStartAge],
    ["Pension Real Increase (%)", meta.pensionIncreasePct],
    ["Defensive-Draw Mode", meta.defensiveMode],
    ["Currency", meta.currency],
  ];
  for (const [label, value, fmt] of assumptionRows) {
    const r = ws1.addRow([label, value]);
    r.getCell(1).font = { bold: true, size: 10 };
    r.getCell(2).font = { size: 10 };
    if (fmt) r.getCell(2).numFmt = fmt;
  }

  ws1.addRow([]);
  const resultHeader = ws1.addRow(["Result", "Value"]);
  resultHeader.font = { bold: true, size: 11 };
  const resultRows: [string, string | number, string?][] = [
    ["Row count", rowCount],
    ["Date range", `${dateOf(oldest)} to ${dateOf(newest)}`],
    ["Any exhaustion", anyExhausted ? "Yes" : "No"],
    ["Final total capital", newest.totalCapital ?? "", CURRENCY_FMT],
    ["Final cumulative inflation index", Number(inflationTracking.currentIndex.toFixed(4))],
  ];
  for (const [label, value, fmt] of resultRows) {
    const r = ws1.addRow([label, value]);
    r.getCell(1).font = { bold: true, size: 10 };
    r.getCell(2).font = { size: 10 };
    if (fmt) r.getCell(2).numFmt = fmt;
  }

  // ---------- Sheet 2: Full Ledger ----------
  const ws2 = wb.addWorksheet(`Full Ledger (${rowCount} rows)`);
  const columns: { header: string; width: number; key: string; fmt?: string }[] = [
    { header: "Reporting\nPeriod", width: 12, key: "label" },
    { header: "Period End\nDate", width: 12, key: "date" },
    { header: "Age", width: 6, key: "age" },
    { header: "Horizon\nAge", width: 8, key: "cappingAge" },
    { header: "Phase", width: 10, key: "phase" },
    { header: "Equities (£)", width: 14, key: "equities", fmt: CURRENCY_FMT },
    { header: "Cash (£)", width: 14, key: "cash", fmt: CURRENCY_FMT },
    { header: "Portfolio\nTotal (£)", width: 14, key: "total", fmt: CURRENCY_FMT },
    { header: "ATH (£)", width: 14, key: "ath", fmt: CURRENCY_FMT },
    { header: "Drawdown\nfrom ATH (%)", width: 12, key: "drawdownPct", fmt: PCT_FMT },
    { header: "Fun Bucket\nBalance (£)", width: 14, key: "funBucket", fmt: CURRENCY_FMT },
    { header: "Entry Kind", width: 14, key: "entryKind" },
    { header: "Withdrawn\nEquities (£)", width: 14, key: "withdrawnFromEquities", fmt: CURRENCY_FMT },
    { header: "Withdrawn\nCash (£)", width: 14, key: "withdrawnFromCash", fmt: CURRENCY_FMT },
    { header: "Withdrawal\nTotal (£)", width: 14, key: "withdrawnAmount", fmt: CURRENCY_FMT },
    { header: "Rebalance\nDirection", width: 14, key: "rebalanceDirection" },
    { header: "Rebalance\nAmount (£)", width: 14, key: "rebalanceAmount", fmt: CURRENCY_FMT },
    { header: "Event\nAmount (£)", width: 14, key: "eventAmount", fmt: CURRENCY_FMT },
    { header: "Target\nWithdrawal\nRate (%)", width: 12, key: "targetWrPct", fmt: PCT_FMT },
    { header: "Withdrawal\nStatus", width: 18, key: "guardrailStatus" },
    { header: "Guardrail\nState", width: 18, key: "rule" },
  ];
  ws2.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  styleHeaderRow(ws2.getRow(1));
  ws2.views = [{ state: "frozen", ySplit: 1 }];

  for (const d of rows) {
    const kind = kindOf(d);
    ws2.addRow({
      label: d.label ?? "",
      date: dateOf(d),
      age: typeof d.age === "number" ? d.age : "",
      cappingAge: typeof d.cappingAge === "number" && d.cappingAge > 0 ? d.cappingAge : "",
      phase: d.phase ?? "",
      equities: d.equities ?? "",
      cash: d.mmFund ?? "",
      total: d.totalCapital ?? "",
      ath: d.ath ?? "",
      drawdownPct: typeof d.drawdownPct === "number" ? d.drawdownPct : "",
      funBucket: typeof d.funBucket === "number" ? d.funBucket : "",
      entryKind: kind,
      withdrawnFromEquities: hasSplit(d) ? (d.withdrawnFromEquities ?? "") : "",
      withdrawnFromCash: hasSplit(d) ? (d.withdrawnFromCash ?? "") : "",
      withdrawnAmount: kind === "normal" ? (d.withdrawnAmount ?? "") : "",
      rebalanceDirection: hasSplit(d) ? rebalLabel(d.rebalanceDirection) : "",
      rebalanceAmount: hasSplit(d) ? (d.rebalanceAmount ?? "") : "",
      eventAmount: eventAmountOf(d) ?? "",
      targetWrPct: targetWrPctOf(d) ?? "",
      guardrailStatus: d.guardrailStatus ?? "",
      rule: d.rule ?? "",
    });
  }

  // Apply per-column number formats and font size to every data row.
  columns.forEach((c, i) => {
    if (!c.fmt) return;
    ws2.getColumn(i + 1).numFmt = c.fmt;
  });
  for (let r = 2; r <= rowCount + 1; r++) {
    ws2.getRow(r).eachCell((cell) => {
      if (!cell.font) cell.font = { size: 9 };
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sovereign-ledger_${localTimestamp()}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
