// Sovereign Glidepath — Risk Simulator single-path detailed export (Build 137).
//
// The fan chart's percentile bands (p10/p25/p50/p75/p90) are computed
// INDEPENDENTLY at every year across the 10,000 stochastic paths — the
// standard Monte Carlo approach, but it means there is no single coherent
// path that IS "the median" at every year simultaneously (the path sitting
// at the median in year 5 may not be the same path sitting at the median in
// year 20). To give a real, internally-consistent year-by-year (or
// quarter-by-quarter) story — actual market moves, actual withdrawals,
// actual guardrail state, actual extraordinary flows — this module instead
// picks ONE ACTUAL simulated path, ranked by its own final (horizon-age)
// portfolio value, and replays it at full period detail. "The median path"
// therefore means "the path whose own ending value came out at the 50th
// percentile of all 10,000 endings" — a real simulated sequence, not a
// statistical composite.
//
// Replay works because MonteCarloPanel.tsx's stochastic loop generates one
// annual nominal-return draw per path per year (quarterly ticks prorate
// that SAME annual draw evenly across the year's 4 quarters — there is no
// independent per-quarter randomness in the model). Storing that one
// float/year/path (~3MB for 10,000 paths × 40 years) is cheap, and replaying
// applyPeriod()/applyExtraordinaryFlow() — the exact same shared functions
// the main simulation loop calls — over that stored sequence reconstructs
// the path exactly, this time capturing every field the loop normally
// discards after summing to a single year-end total.

import { applyPeriod, applyExtraordinaryFlow, type ActiveFlow, type ThresholdMode } from "./drawdown";
import { drawdownPctOffAth } from "./engine";
import { localTimestamp, CURRENCY_FMT, PCT_FMT, styleHeaderRow } from "./csvExport";

export interface ReplayConfig {
  E0: number;
  C0: number;
  start: number;
  currentAge: number;
  pension: number;
  pensionAge: number;
  pensionRealFactor: number;
  cashRealReturn: number;
  withdraw: number;
  threshold: ThresholdMode;
  detRReal: number;
  targetCashBuffer: number;
  targetWR_gk?: number;
  tickMode: "yearly" | "quarterly";
  infl: number;
  activeFlows: ActiveFlow[];
  yrs: number;
}

export interface PathRow {
  year: number;
  quarter?: number; // 1-4; present only in quarterly tick mode
  periodLabel: string;
  age: number;
  nominalEquityReturnPct: number; // the raw drawn return for the YEAR (repeated each quarter it covers)
  realEquityReturnPct: number; // real (after-inflation) return actually applied THIS period
  equitiesStart: number;
  cashStart: number;
  pensionReceived: number;
  withdrawalTarget: number; // portfolio draw requested this period, before Guyton-Klinger
  withdrawalActual: number; // portfolio draw actually taken, after Guyton-Klinger
  gkMultiplier: number; // 0.90 | 1.00 | 1.10
  guardrailState: string;
  defensiveDraw: boolean;
  historicalYearLabel: string; // real calendar year (Historical mode) or "Parametric"
  flowLabel: string;
  flowType: string; // "Inflow" | "Outflow" | ""
  flowAmount: number | undefined;
  flowBucket: string;
  equitiesEnd: number;
  cashEnd: number;
  total: number;
  ath: number;
  drawdownFromAthPct: number;
}

/**
 * Replays ONE path's stored per-year nominal-return sequence at full period
 * detail, using the exact same applyPeriod()/applyExtraordinaryFlow() the
 * live simulation calls. Mirrors the stochastic loop in MonteCarloPanel.tsx
 * branch-for-branch (yearly vs quarterly tick, pension netting, extraordinary
 * flows landing at year-end) so the totals agree exactly with the fan chart.
 */
export function buildPathRows(nominalReturns: number[], cfg: ReplayConfig, yearLabels: string[]): PathRow[] {
  const rows: PathRow[] = [];
  let E = cfg.E0;
  let C = cfg.C0;
  let ATH = cfg.start;
  const yrs = Math.min(cfg.yrs, nominalReturns.length);

  for (let y = 1; y <= yrs; y++) {
    const nominal = nominalReturns[y - 1];
    const realEq = cfg.infl > 0 ? (1 + nominal) / (1 + cfg.infl) - 1 : nominal;
    const ageThisYear = cfg.currentAge + y - 1;
    const pensionThisYear =
      cfg.pension > 0 && ageThisYear >= cfg.pensionAge ? cfg.pension * Math.pow(cfg.pensionRealFactor, y) : 0;
    const netDraw = Math.max(0, cfg.withdraw - pensionThisYear);
    const flowThisYear = cfg.activeFlows.find((f) => f.year === y);

    const applyFlowIfDue = (onFinalPeriodOfYear: boolean) => {
      if (!onFinalPeriodOfYear || !flowThisYear) return;
      const out = applyExtraordinaryFlow(E, C, ATH, flowThisYear);
      E = out.E;
      C = out.C;
      ATH = out.ATH;
    };

    const pushRow = (
      quarter: number | undefined,
      equitiesStart: number,
      cashStart: number,
      realReturnPct: number,
      pensionThisPeriod: number,
      withdrawalTargetThisPeriod: number,
      out: ReturnType<typeof applyPeriod>,
      flowApplied: boolean,
    ) => {
      const total = E + C;
      rows.push({
        year: y,
        quarter,
        periodLabel: quarter ? `Year ${y} · Q${quarter}` : `Year ${y}`,
        age: ageThisYear,
        nominalEquityReturnPct: nominal * 100,
        realEquityReturnPct: realReturnPct * 100,
        equitiesStart,
        cashStart,
        pensionReceived: pensionThisPeriod,
        withdrawalTarget: withdrawalTargetThisPeriod,
        withdrawalActual: out.spend,
        gkMultiplier: out.gk,
        guardrailState: out.gkLabel,
        defensiveDraw: out.defensive,
        historicalYearLabel: yearLabels[y - 1] ?? "",
        flowLabel: flowApplied && flowThisYear?.label ? flowThisYear.label : "",
        flowType: flowApplied && flowThisYear ? (flowThisYear.kind === "inflow" ? "Inflow" : "Outflow") : "",
        flowAmount: flowApplied && flowThisYear ? flowThisYear.amount : undefined,
        flowBucket: flowApplied && flowThisYear ? (flowThisYear.bucket === "cash" ? "Cash" : "Equities") : "",
        equitiesEnd: E,
        cashEnd: C,
        total,
        ath: ATH,
        drawdownFromAthPct: drawdownPctOffAth(total, ATH),
      });
    };

    if (cfg.tickMode === "quarterly") {
      const qEqReal = Math.pow(1 + realEq, 0.25) - 1;
      const qCashReal = Math.pow(1 + cfg.cashRealReturn, 0.25) - 1;
      const qDraw = netDraw / 4;
      const qPension = pensionThisYear / 4;
      for (let q = 1; q <= 4; q++) {
        const equitiesStart = E;
        const cashStart = C;
        const out = applyPeriod(
          { E, C, ATH },
          {
            rEqReal: qEqReal,
            rCashReal: qCashReal,
            spendGross: qDraw,
            withdrawAnchor: cfg.withdraw,
            threshold: cfg.threshold,
            detRReal: cfg.detRReal,
            targetCashBuffer: cfg.targetCashBuffer,
            targetWR_gk: cfg.targetWR_gk,
            periodsPerYear: 4,
            age: ageThisYear,
          },
        );
        E = out.E;
        C = out.C;
        ATH = out.ATH;
        const flowDue = q === 4;
        applyFlowIfDue(flowDue);
        pushRow(q, equitiesStart, cashStart, qEqReal, qPension, qDraw, out, flowDue);
      }
    } else {
      const equitiesStart = E;
      const cashStart = C;
      const out = applyPeriod(
        { E, C, ATH },
        {
          rEqReal: realEq,
          rCashReal: cfg.cashRealReturn,
          spendGross: netDraw,
          withdrawAnchor: cfg.withdraw,
          threshold: cfg.threshold,
          detRReal: cfg.detRReal,
          targetCashBuffer: cfg.targetCashBuffer,
          targetWR_gk: cfg.targetWR_gk,
          periodsPerYear: 1,
          age: ageThisYear,
        },
      );
      E = out.E;
      C = out.C;
      ATH = out.ATH;
      applyFlowIfDue(true);
      pushRow(undefined, equitiesStart, cashStart, realEq, pensionThisYear, netDraw, out, true);
    }
  }

  return rows;
}

export interface PathExportMeta {
  percentile: number;
  pathRank: number; // 1-based rank among RUNS, e.g. "5,000th of 10,000"
  runs: number;
  finalValue: number;
  mode: "parametric" | "historical";
  meanPct?: number;
  stdevPct?: number;
  inflationPct: number;
  tickMode: "yearly" | "quarterly";
  threshold: ThresholdMode;
  currency: string;
  currentAge: number;
  years: number;
  startingTotal: number;
  withdraw: number;
  pension: number;
  pensionAge: number;
  flows: ActiveFlow[];
}

/**
 * Exports one replayed path as a styled .xlsx workbook — Summary &
 * Assumptions sheet plus a full period-by-period ledger sheet — mirroring
 * exportSovereignLedgerXLSX()'s look (navy header, frozen header row,
 * currency/% number formats) so it reads as the same family of document as
 * the main ledger export.
 */
export async function exportRiskPathXLSX(rows: PathRow[], meta: PathExportMeta): Promise<void> {
  if (rows.length === 0) {
    alert("Nothing to export — run the simulation first.");
    return;
  }

  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Sovereign Glidepath";
  wb.created = new Date();

  // ---------- Sheet 1: Summary & Assumptions ----------
  const ws1 = wb.addWorksheet("Summary & Assumptions");
  ws1.getColumn(1).width = 42;
  ws1.getColumn(2).width = 24;

  ws1.addRow(["Sovereign Glidepath — Risk Simulator Path Export"]).font = { bold: true, size: 14 };
  ws1.addRow([
    `Exported ${new Date().toISOString().slice(0, 10)} — ${meta.percentile}th percentile path, ${rows.length} rows.`,
  ]).font = { size: 10 };
  ws1.addRow([]);

  const pathHeader = ws1.addRow(["This Path", "Value"]);
  pathHeader.font = { bold: true, size: 11 };
  const pathRows: [string, string | number, string?][] = [
    ["Percentile selected", `${meta.percentile}th`],
    ["Path rank", `${meta.pathRank.toLocaleString()} of ${meta.runs.toLocaleString()} (by ending value)`],
    ["Ending portfolio value (this path)", meta.finalValue, CURRENCY_FMT],
  ];
  for (const [label, value, fmt] of pathRows) {
    const r = ws1.addRow([label, value]);
    r.getCell(1).font = { bold: true, size: 10 };
    r.getCell(2).font = { size: 10 };
    if (fmt) r.getCell(2).numFmt = fmt;
  }
  ws1.addRow([]);
  ws1.addRow([
    "Note: percentile bands on the fan chart are computed independently at every year across all " +
      meta.runs.toLocaleString() +
      " simulated paths (the standard Monte Carlo approach) — there is no single path that sits exactly at the " +
      "median in every year simultaneously. This sheet instead replays one REAL simulated path: the one whose " +
      "own ENDING value came out at the " +
      meta.percentile +
      "th percentile of all " +
      meta.runs.toLocaleString() +
      " endings. Every figure below is that one path's actual year-by-year story.",
  ]).font = { size: 9, italic: true, color: { argb: "FF666666" } };
  if (meta.tickMode === "quarterly") {
    ws1.addRow([
      "Note: this model draws ONE random return per YEAR; quarterly ticks apply that same year's return evenly " +
        "compounded across its 4 quarters, not four independently-random quarters.",
    ]).font = { size: 9, italic: true, color: { argb: "FF666666" } };
  }
  ws1.addRow([]);

  const assumptionsHeader = ws1.addRow(["Assumption", "Value"]);
  assumptionsHeader.font = { bold: true, size: 11 };
  const assumptionRows: [string, string | number, string?][] = [
    ["Return mode", meta.mode === "historical" ? "Historical bootstrap (MSCI World)" : "Parametric"],
    ...(meta.mode === "parametric"
      ? ([
          ["Assumed mean real return (%/yr)", meta.meanPct ?? 0],
          ["Assumed standard deviation (%/yr)", meta.stdevPct ?? 0],
        ] as [string, string | number, string?][])
      : []),
    ["Inflation (%/yr)", meta.inflationPct],
    ["Tick mode", meta.tickMode === "quarterly" ? "Quarterly" : "Yearly"],
    ["Defensive-draw mode", meta.threshold],
    ["Starting age", meta.currentAge],
    ["Simulation horizon (years)", meta.years],
    ["Starting portfolio (today's money)", meta.startingTotal, CURRENCY_FMT],
    ["Annual withdrawal target (today's money)", meta.withdraw, CURRENCY_FMT],
    ["State pension (today's money)", meta.pension, CURRENCY_FMT],
    ["Pension start age", meta.pensionAge],
    ["Currency", meta.currency],
  ];
  for (const [label, value, fmt] of assumptionRows) {
    const r = ws1.addRow([label, value]);
    r.getCell(1).font = { bold: true, size: 10 };
    r.getCell(2).font = { size: 10 };
    if (fmt) r.getCell(2).numFmt = fmt;
  }

  if (meta.flows.length > 0) {
    ws1.addRow([]);
    const flowsHeader = ws1.addRow(["Extraordinary Cash Flow", "Detail"]);
    flowsHeader.font = { bold: true, size: 11 };
    for (const f of meta.flows) {
      const label = f.label || (f.kind === "inflow" ? "Inflow" : "Outflow");
      const detail = `${f.kind === "inflow" ? "Inflow" : "Outflow"} · Year ${f.year} · ${meta.currency}${f.amount.toLocaleString()} · ${
        f.bucket === "cash" ? "Cash" : "Equities"
      }`;
      const r = ws1.addRow([label, detail]);
      r.getCell(1).font = { size: 10 };
      r.getCell(2).font = { size: 10 };
    }
  }

  // ---------- Sheet 2: Full Path Ledger ----------
  const ws2 = wb.addWorksheet(`${meta.percentile}th Percentile Path (${rows.length} rows)`);
  const columns: { header: string; width: number; key: keyof PathRow; fmt?: string }[] = [
    { header: "Period", width: 14, key: "periodLabel" },
    { header: "Age", width: 6, key: "age" },
    { header: "Historical\nYear Used", width: 11, key: "historicalYearLabel" },
    { header: "Nominal\nEquity Return,\nthis Year (%)", width: 12, key: "nominalEquityReturnPct", fmt: PCT_FMT },
    { header: "Real Equity\nReturn,\nthis Period (%)", width: 12, key: "realEquityReturnPct", fmt: PCT_FMT },
    { header: "Equities\nStart (£)", width: 14, key: "equitiesStart", fmt: CURRENCY_FMT },
    { header: "Cash\nStart (£)", width: 14, key: "cashStart", fmt: CURRENCY_FMT },
    { header: "Pension\nReceived (£)", width: 13, key: "pensionReceived", fmt: CURRENCY_FMT },
    { header: "Portfolio\nDraw Target (£)", width: 14, key: "withdrawalTarget", fmt: CURRENCY_FMT },
    { header: "Portfolio\nDraw Actual (£)", width: 14, key: "withdrawalActual", fmt: CURRENCY_FMT },
    { header: "GK\nMultiplier", width: 10, key: "gkMultiplier" },
    { header: "Guardrail\nState", width: 16, key: "guardrailState" },
    { header: "Defensive\nDraw?", width: 10, key: "defensiveDraw" },
    { header: "Flow\nLabel", width: 16, key: "flowLabel" },
    { header: "Flow\nType", width: 10, key: "flowType" },
    { header: "Flow\nAmount (£)", width: 13, key: "flowAmount", fmt: CURRENCY_FMT },
    { header: "Flow\nBucket", width: 10, key: "flowBucket" },
    { header: "Equities\nEnd (£)", width: 14, key: "equitiesEnd", fmt: CURRENCY_FMT },
    { header: "Cash\nEnd (£)", width: 14, key: "cashEnd", fmt: CURRENCY_FMT },
    { header: "Portfolio\nTotal (£)", width: 14, key: "total", fmt: CURRENCY_FMT },
    { header: "ATH (£)", width: 14, key: "ath", fmt: CURRENCY_FMT },
    { header: "Drawdown\nfrom ATH (%)", width: 12, key: "drawdownFromAthPct", fmt: PCT_FMT },
  ];
  ws2.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  styleHeaderRow(ws2.getRow(1));
  ws2.views = [{ state: "frozen", ySplit: 1 }];

  for (const r of rows) {
    const rowData: Record<string, string | number> = {};
    for (const c of columns) {
      const v = r[c.key];
      if (v === undefined) rowData[c.key] = "";
      else if (typeof v === "boolean") rowData[c.key] = v ? "Yes" : "No";
      else rowData[c.key] = v;
    }
    ws2.addRow(rowData);
  }

  columns.forEach((c, i) => {
    if (!c.fmt) return;
    ws2.getColumn(i + 1).numFmt = c.fmt;
  });
  for (let r = 2; r <= rows.length + 1; r++) {
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
  a.download = `sovereign-risksim-p${meta.percentile}_${localTimestamp()}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
