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
  prefix?: string;  // default "sovereign-audit"
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

  const filename =
    "filename" in filenameOrParts
      ? filenameOrParts.filename
      : buildCsvFilename(filenameOrParts);

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

