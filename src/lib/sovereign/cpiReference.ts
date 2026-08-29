// Sovereign Glidepath — CPI Index Reference Table (Build 135).
//
// Replaces manual (New÷Old−1)×100 CPI-percentage arithmetic with a small
// reference table of raw ONS CPI INDEX values (series D7BT), keyed by
// period-end date. computeInflationTracking() looks this table up FIRST for
// each row-pair in the ledger's chronological chain — so correcting or
// rebasing a single index value here propagates to every ledger row that
// references it, with no per-row editing required. The existing
// actualCpiSincePriorRow (a manually typed plain %) remains a fully
// supported fallback per-row, preserving the "never force a lookup"
// philosophy — a user who'd rather just type a percentage still can.
//
// This table is NOT used by the Scenario Stress Test or "Compare vs 4%
// Rule" — those already carry their own separate long-run historical
// datasets (Build 133) and must not be affected by edits here.

/** One ONS CPI INDEX reading for a given period-end date. */
export interface CpiReferenceRow {
  /** ISO date (YYYY-MM-DD), matching the convention used by LedgerEntry.periodEndDate. */
  date: string;
  /** Raw ONS CPI INDEX value (series D7BT), NOT a percentage. */
  index: number;
}

export type CpiReferenceTable = CpiReferenceRow[];

// Real ONS CPI INDEX data (series D7BT), gathered Q4 2024 – Q2 2026.
// Q4 2024 is a reference-only baseline quarter — Mark's real ledger starts
// Q1 2025, so no ledger row exists for it, but it's the "prior index" for
// anyone who ever needs the Q4 2024 → Q1 2025 transition. Q3 2026 is not
// yet published as of this build, so it's intentionally omitted rather
// than guessed.
export const SEED_CPI_REFERENCE: CpiReferenceTable = [
  { date: "2024-12-31", index: 135.2 }, // Q4 2024 (baseline, reference-only)
  { date: "2025-03-31", index: 136.0 }, // Q1 2025
  { date: "2025-06-30", index: 138.5 }, // Q2 2025
  { date: "2025-09-30", index: 139.2 }, // Q3 2025
  { date: "2025-12-31", index: 139.8 }, // Q4 2025
  { date: "2026-03-31", index: 140.2 }, // Q1 2026
  { date: "2026-06-30", index: 142.3 }, // Q2 2026
];

/** Returns a new array sorted oldest-first by date. Never mutates its input. */
export function sortReferenceTable(table: CpiReferenceTable): CpiReferenceTable {
  return [...table].sort((a, b) => a.date.localeCompare(b.date));
}

/** Raw ONS index for an exact period-end date, or undefined if not recorded. */
export function lookupCpiIndex(table: CpiReferenceTable, date: string | undefined | null): number | undefined {
  if (!date) return undefined;
  const row = table.find((r) => r.date === date);
  return row ? row.index : undefined;
}

/**
 * Insert or overwrite the row for `row.date`. This is the single "correction"
 * primitive — re-upserting an existing date is how rebasing/corrections are
 * applied, and every ledger row whose chain touches that date will pick up
 * the new value the next time computeInflationTracking() runs.
 */
export function upsertCpiRow(table: CpiReferenceTable, row: CpiReferenceRow): CpiReferenceTable {
  const filtered = table.filter((r) => r.date !== row.date);
  return sortReferenceTable([...filtered, row]);
}

/** Upsert several rows at once (e.g. from parseBulkPaste). */
export function upsertManyRows(table: CpiReferenceTable, rows: CpiReferenceRow[]): CpiReferenceTable {
  let next = table;
  for (const row of rows) next = upsertCpiRow(next, row);
  return next;
}

export function deleteCpiRow(table: CpiReferenceTable, date: string): CpiReferenceTable {
  return table.filter((r) => r.date !== date);
}

export interface BulkPasteResult {
  rows: CpiReferenceRow[];
  errors: string[];
}

/**
 * Parses pasted lines into CpiReferenceRow entries. Tolerant of extra
 * columns (e.g. a leading "Q1 2025" quarter label, tab/comma/space
 * separators) — each line just needs one YYYY-MM-DD date and one numeric
 * index value somewhere on it. This lets Mark paste the ONS table
 * (quarter, date, index columns) directly without reformatting it first.
 */
export function parseBulkPaste(text: string): BulkPasteResult {
  const rows: CpiReferenceRow[] = [];
  const errors: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  for (const line of lines) {
    const dateMatch = line.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (!dateMatch) {
      errors.push(`No date (YYYY-MM-DD) found: "${line}"`);
      continue;
    }
    const dateStr = dateMatch[0];
    const rest = line.slice(0, dateMatch.index) + line.slice(dateMatch.index! + dateStr.length);
    const numMatches = rest.match(/-?\d+(\.\d+)?/g);
    if (!numMatches || numMatches.length === 0) {
      errors.push(`No index value found: "${line}"`);
      continue;
    }
    const index = parseFloat(numMatches[numMatches.length - 1]);
    if (isNaN(index) || index <= 0) {
      errors.push(`Invalid index value: "${line}"`);
      continue;
    }
    rows.push({ date: dateStr, index });
  }

  return { rows, errors };
}