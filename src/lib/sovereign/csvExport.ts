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
  inflationPct: number;
}

// Build 132 — shared row-building logic for both the CSV and XLSX ledger
// exports. Previously each exporter carried its own copy of the same
// chronological-sort, row-classification, and derived-field logic
// (dateOf/chronological/kindOf/hasSplit/rebalLabel/eventAmountOf/
// targetWrPctOf) — genuinely duplicated, and it had already quietly
// drifted once: the CSV had a "Status/Directive" column the XLSX didn't
// (both were just d.rule, a leftover duplicate — removed here). Both
// exporters now consume the exact same buildLedgerExportRows() output, so
// their column sets literally cannot drift apart again — a column added
// to one is either added to both formatters below or it doesn't exist in
// either export.
//
// Also adds the one column neither format had at all: quarterly growth
// (%) on Equities. Not stored anywhere on LedgerEntry — no field tracks
// the actual per-quarter market return the way a scenario file's
// equityReturnPct does, since a real hand-committed row just records the
// balance you actually saw on your statement, not a rate. Derived here by
// comparing consecutive rows' Equities balances and backing out that
// quarter's own withdrawal-from-equities and any equities<->cash
// rebalance, so it isolates market return from cash flow rather than
// conflating them. Only computable for Normal rows with a recorded bucket
// split (Build 070+) that have a real previous row to compare against —
// left blank everywhere else rather than guessed, matching how this file
// already treats every other "not recorded" case (see hasSplit below).

export interface LedgerExportRow {
  label: string;
  date: string;
  age: number | undefined;
  cappingAge: number | undefined;
  phase: string;
  equities: number | undefined;
  quarterlyGrowthPct: number | undefined;
  cash: number | undefined;
  total: number | undefined;
  ath: number | undefined;
  drawdownPct: number | undefined;
  funBucket: number | undefined;
  entryKind: string;
  withdrawnFromEquities: number | undefined;
  withdrawnFromCash: number | undefined;
  withdrawnAmount: number | undefined;
  rebalanceDirection: string;
  rebalanceAmount: number | undefined;
  eventAmount: number | undefined;
  targetWrPct: number | undefined;
  guardrailStatus: string;
  rule: string;
  inflationRateAppliedPct: number | undefined;
  inflationSource: string;
}

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

// A row has "recorded" bucket-split data only when the Build 070+ fields
// are actually present. Legacy Normal rows and event rows show blanks,
// not zeros or guesses.
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

export function buildLedgerExportRows(ledger: LedgerEntry[], fallbackAssumedInflationPct: number): LedgerExportRow[] {
  const chron = chronological(ledger);
  const rows: LedgerExportRow[] = [];

  // Build 134 — surface the same actual-vs-assumed inflation tracking
  // Pane 2 already computes (see engine.ts's computeInflationTracking) in
  // the ledger exports too. It was being calculated for the XLSX Summary
  // sheet's headline stats already but never carried down into either
  // export's per-row data — Mark's own ledger review noticed the gap.
  // Keyed by ledgerIndex, since computeInflationTracking's own row list
  // only covers dated Normal entries (events are correctly excluded, same
  // as Pane 2's history table), so event rows below simply get no match
  // and export blank, consistent with how every other derived-only-for-
  // Normal-rows field in this file already behaves.
  const inflationByLedgerIndex = new Map<number, { rateAppliedPct: number; isActual: boolean }>();
  const inflationTracking = computeInflationTracking(ledger, fallbackAssumedInflationPct);
  for (const r of inflationTracking.rows) {
    inflationByLedgerIndex.set(r.ledgerIndex, { rateAppliedPct: r.rateAppliedPct, isActual: r.isActual });
  }

  for (let i = 0; i < chron.length; i++) {
    const d = chron[i];
    const kind = kindOf(d);
    const split = hasSplit(d);
    const ledgerIndex = ledger.indexOf(d);
    const inflation = inflationByLedgerIndex.get(ledgerIndex);

    // Quarterly growth %: each row's stored Equities balance is what that
    // quarter's directive was calculated FROM — i.e. after that quarter's
    // own market growth, but BEFORE that quarter's own withdrawal/rebalance
    // (which only gets subtracted going into the NEXT row's starting
    // balance — confirmed by tracing both the scenario engine's commit
    // order and the real hand-commit flow, which follow the same
    // convention: you enter today's balance, the app tells you what to
    // withdraw, you withdraw it, and that reduced balance is what next
    // quarter's growth actually compounds on). So deriving THIS row's
    // growth rate needs the PREVIOUS row's withdrawal/rebalance backed out
    // of the previous row's balance — not this row's own. Verified against
    // real 1996 data (13% annual, real MSCI World): every quarter
    // independently reproduces exactly the expected 3.1026% compounded
    // rate using this formula.
    let quarterlyGrowthPct: number | undefined;
    if (kind === "normal" && split && i > 0 && typeof d.equities === "number") {
      const prev = chron[i - 1];
      if (typeof prev.equities === "number" && hasSplit(prev)) {
        const prevRebalAdj =
          prev.rebalanceDirection === "eq_to_cash"
            ? prev.rebalanceAmount || 0
            : prev.rebalanceDirection === "cash_to_eq"
              ? -(prev.rebalanceAmount || 0)
              : 0;
        const startingBalance = prev.equities - (prev.withdrawnFromEquities || 0) - prevRebalAdj;
        if (startingBalance > 0) {
          quarterlyGrowthPct = (d.equities / startingBalance - 1) * 100;
        }
      }
    }

    rows.push({
      label: d.label ?? "",
      date: dateOf(d),
      age: typeof d.age === "number" ? d.age : undefined,
      cappingAge: typeof d.cappingAge === "number" && d.cappingAge > 0 ? d.cappingAge : undefined,
      phase: d.phase ?? "",
      equities: typeof d.equities === "number" ? d.equities : undefined,
      quarterlyGrowthPct,
      cash: typeof d.mmFund === "number" ? d.mmFund : undefined,
      total: typeof d.totalCapital === "number" ? d.totalCapital : undefined,
      ath: typeof d.ath === "number" ? d.ath : undefined,
      drawdownPct: typeof d.drawdownPct === "number" ? d.drawdownPct : undefined,
      funBucket: typeof d.funBucket === "number" ? d.funBucket : undefined,
      entryKind: kind,
      withdrawnFromEquities: split ? d.withdrawnFromEquities : undefined,
      withdrawnFromCash: split ? d.withdrawnFromCash : undefined,
      withdrawnAmount: kind === "normal" ? d.withdrawnAmount : undefined,
      rebalanceDirection: split ? rebalLabel(d.rebalanceDirection) : "",
      rebalanceAmount: split ? d.rebalanceAmount : undefined,
      eventAmount: eventAmountOf(d),
      targetWrPct: targetWrPctOf(d),
      guardrailStatus: d.guardrailStatus ?? "",
      rule: d.rule ?? "",
      inflationRateAppliedPct: inflation?.rateAppliedPct,
      inflationSource: inflation ? (inflation.isActual ? "Actual" : "Assumed") : "",
    });
  }

  return rows;
}

export function exportSovereignLedgerCSV(ledger: LedgerEntry[], meta: SovereignLedgerExportMeta): void {
  if (ledger.length === 0) {
    alert("Ledger is empty — nothing to export.");
    return;
  }

  const rows = buildLedgerExportRows(ledger, meta.inflationPct);
  const blank = "";
  const num = (n: number | undefined) => (typeof n === "number" && isFinite(n) ? n.toFixed(2) : blank);
  const pct = (n: number | undefined) => (typeof n === "number" && isFinite(n) ? n.toFixed(4) : blank);

  exportLedgerCSV<LedgerExportRow>(
    rows,
    [
      { header: "Reporting Period", value: (r) => r.label },
      { header: "Period End Date", value: (r) => r.date },
      { header: "Age", value: (r) => (typeof r.age === "number" ? r.age : blank) },
      { header: "Horizon Age", value: (r) => (typeof r.cappingAge === "number" ? r.cappingAge : blank) },
      { header: "Phase", value: (r) => r.phase },
      { header: "Equities", value: (r) => num(r.equities) },
      { header: "Quarterly Growth (%)", value: (r) => pct(r.quarterlyGrowthPct) },
      { header: "Cash", value: (r) => num(r.cash) },
      { header: "Portfolio Total", value: (r) => num(r.total) },
      { header: "ATH", value: (r) => num(r.ath) },
      { header: "Drawdown from ATH (%)", value: (r) => pct(r.drawdownPct) },
      { header: "Fun Bucket Balance", value: (r) => num(r.funBucket) },
      { header: "entryKind", value: (r) => r.entryKind },
      { header: "Withdrawn from Equities", value: (r) => num(r.withdrawnFromEquities) },
      { header: "Withdrawn from Cash", value: (r) => num(r.withdrawnFromCash) },
      { header: "Withdrawal Total", value: (r) => num(r.withdrawnAmount) },
      { header: "Rebalance Direction", value: (r) => r.rebalanceDirection },
      { header: "Rebalance Amount", value: (r) => num(r.rebalanceAmount) },
      { header: "Event Amount", value: (r) => num(r.eventAmount) },
      { header: "Target Withdrawal Rate (%)", value: (r) => pct(r.targetWrPct) },
      { header: "Withdrawal Status", value: (r) => r.guardrailStatus },
      { header: "Guardrail State", value: (r) => r.rule },
      { header: "Inflation Rate Applied (%)", value: (r) => pct(r.inflationRateAppliedPct) },
      { header: "Inflation Source", value: (r) => r.inflationSource },
    ],
    {
      "Row count": rows.length,
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
// Build 132 — the Full Ledger sheet's columns now come from the same
// buildLedgerExportRows() the CSV export uses (see above), so the two
// formats are guaranteed to carry the same columns in the same order —
// including the new Quarterly Growth (%) column neither format had
// before. Still does not clone the one-off sample workbook's exact
// column set: two of its columns (Annual Eq Return / Annual UK CPI) came
// from that specific scenario file's own year-by-year inputs, which only
// exist for a ledger built via the Scenario Test Runner — a
// hand-committed real ledger has no equivalent, since Pane 1's
// assumptions are live settings, not a per-row record of what actually
// happened in the market that quarter (the new Quarterly Growth column
// covers that gap properly, derived rather than assumed). The sample's
// dead last column ("Actual CPI to enter (%)", a placeholder on every
// row) is still not reproduced.
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

  const rows = buildLedgerExportRows(ledger, meta.inflationPct);
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
    `Exported ${new Date().toISOString().slice(0, 10)} — ${rowCount} rows, ${oldest.date} to ${newest.date}.`,
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
    ["Date range", `${oldest.date} to ${newest.date}`],
    ["Any exhaustion", anyExhausted ? "Yes" : "No"],
    ["Final total capital", newest.total ?? "", CURRENCY_FMT],
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
  const columns: { header: string; width: number; key: keyof LedgerExportRow; fmt?: string }[] = [
    { header: "Reporting\nPeriod", width: 12, key: "label" },
    { header: "Period End\nDate", width: 12, key: "date" },
    { header: "Age", width: 6, key: "age" },
    { header: "Horizon\nAge", width: 8, key: "cappingAge" },
    { header: "Phase", width: 10, key: "phase" },
    { header: "Equities (£)", width: 14, key: "equities", fmt: CURRENCY_FMT },
    { header: "Quarterly\nGrowth (%)", width: 12, key: "quarterlyGrowthPct", fmt: PCT_FMT },
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
    { header: "Inflation\nRate Applied (%)", width: 12, key: "inflationRateAppliedPct", fmt: PCT_FMT },
    { header: "Inflation\nSource", width: 12, key: "inflationSource" },
  ];
  ws2.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  styleHeaderRow(ws2.getRow(1));
  ws2.views = [{ state: "frozen", ySplit: 1 }];

  for (const r of rows) {
    const rowData: Record<string, string | number> = {};
    for (const c of columns) {
      const v = r[c.key];
      rowData[c.key] = v === undefined ? "" : v;
    }
    ws2.addRow(rowData);
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
