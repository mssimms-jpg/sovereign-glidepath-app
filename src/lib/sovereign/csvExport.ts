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
import type { LedgerEntry } from "./engine";

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
