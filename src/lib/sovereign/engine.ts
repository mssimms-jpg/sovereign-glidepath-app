// Sovereign Glidepath — pure calculation engine.
// All math from v1.8 HTML, refactored as deterministic functions.

export type Phase = "Go-Go" | "Go-Slow" | "No-Go";
export type Trajectory = "ascending" | "descending" | "stable";

export interface LedgerEntry {
  label: string;
  age: number;
  cappingAge: number;
  equities: number;
  mmFund: number;
  ath: number;
  targetYearly: number;
  desiredMonths: number;
  growthRate: number;
  totalCapital: number;
  drawdownPct: number;
  rule: string;
  phase: string;
}

export interface CalcInputs {
  currentAge: number;
  cappingAge: number;
  rawEquities: number;
  mmFund: number;
  ath: number;
  targetYearly: number;
  stressPct: number;
  growthRatePct: number;
  desiredRunwayMonths: number;
}

export interface CalcOutputs {
  phase: Phase;
  stressedEquities: number;
  total: number;
  drawdownPct: number;
  targetWR: number;
  currentWR: number;
  guardrailFactor: number;
  guardrailStatus: string;
  guardrailColor: string;
  modifiedTargetMonths: number;
  targetCashAmount: number;
  quarterlyRequest: number;
  guardrailAdjustedQuarterly: number;
  runwayMonths: number;
  runwayColor: string;
  surplus: number;
  trajectory: Trajectory;
  trajectoryLabel: string;
  trajectoryColor: string;
  remainingYears: number;
  baselineNeed: number;
}

export const COLORS = {
  green: "var(--accent-green)",
  blue: "var(--accent-blue)",
  amber: "var(--accent-amber)",
  red: "var(--accent-red)",
  purple: "var(--accent-purple)",
  muted: "var(--text-muted)",
  text: "var(--text-main)",
};

export function phaseFor(age: number): Phase {
  if (age <= 75) return "Go-Go";
  if (age <= 85) return "Go-Slow";
  return "No-Go";
}

// Module-level currency symbol. Updated by SovereignGlidepath via setCurrencySymbol().
// Cosmetic only — no FX conversion is ever performed.
let CURRENCY_SYMBOL = "£";
export function setCurrencySymbol(s: string): void {
  if (s === "£" || s === "€" || s === "$") CURRENCY_SYMBOL = s;
}
export function getCurrencySymbol(): string {
  return CURRENCY_SYMBOL;
}

export function formatGBP(n: number): string {
  return (
    CURRENCY_SYMBOL +
    Number(n || 0).toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
// Alias for forward-compat / readability at call-sites that want the intent
// to read as "format the active currency".
export const formatCurrency = formatGBP;

export function cleanNum(v: string | number | null | undefined): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  return parseFloat(String(v).replace(/[£€$,\s]/g, "")) || 0;
}

export function calculate(inp: CalcInputs, prevEquities: number | null): CalcOutputs {
  const {
    currentAge,
    cappingAge,
    rawEquities,
    mmFund,
    ath,
    targetYearly,
    stressPct,
    growthRatePct,
    desiredRunwayMonths,
  } = inp;

  const realG = (isNaN(growthRatePct) ? 2.5 : growthRatePct) / 100;
  const stressedEquities = rawEquities * (1 - stressPct / 100);
  const total = stressedEquities + mmFund;

  const drawdownPct = ath > 0 ? ((ath - total) / ath) * 100 : 0;
  const targetWR = ath > 0 ? (targetYearly / ath) * 100 : 0;
  const currentWR = total > 0 ? (targetYearly / total) * 100 : 0;

  const phase = phaseFor(currentAge);

  let guardrailFactor = 1.0;
  let guardrailStatus = "Normal";
  let guardrailColor = COLORS.green;
  if (phase !== "No-Go" && targetWR > 0) {
    if (currentWR >= targetWR * 1.2) {
      guardrailFactor = 0.9;
      guardrailStatus = "Reduction Applied (-10%)";
      guardrailColor = COLORS.amber;
    } else if (currentWR <= targetWR * 0.8) {
      guardrailFactor = 1.1;
      guardrailStatus = "Prosperity Bonus (+10%)";
      guardrailColor = COLORS.purple;
    }
  }

  const modifiedTargetMonths =
    phase === "Go-Slow"
      ? Math.min(24, desiredRunwayMonths)
      : phase === "No-Go"
        ? Math.min(12, desiredRunwayMonths)
        : desiredRunwayMonths;

  const targetCashAmount = (targetYearly / 12) * modifiedTargetMonths;
  const quarterlyRequest = targetYearly / 4;
  const guardrailAdjustedQuarterly = quarterlyRequest * guardrailFactor;
  const runwayMonths = targetYearly > 0 ? (mmFund / targetYearly) * 12 : 0;
  const runwayColor =
    runwayMonths >= modifiedTargetMonths
      ? COLORS.green
      : runwayMonths >= modifiedTargetMonths / 2
        ? COLORS.amber
        : COLORS.red;

  const remainingYears = Math.max(0, cappingAge - currentAge);
  let baselineNeed = 0;
  if (remainingYears > 0) {
    baselineNeed =
      realG > 0
        ? targetYearly * ((1 - Math.pow(1 + realG, -remainingYears)) / realG)
        : targetYearly * remainingYears;
  }
  const surplus = total - baselineNeed;

  let trajectory: Trajectory = "stable";
  let trajectoryLabel = "No records";
  let trajectoryColor = COLORS.muted;
  if (prevEquities != null && prevEquities > 0) {
    if (stressedEquities > prevEquities * 1.001) {
      trajectory = "ascending";
      trajectoryLabel = "Ascending Market Vector ▲";
      trajectoryColor = COLORS.green;
    } else if (stressedEquities < prevEquities * 0.999) {
      trajectory = "descending";
      trajectoryLabel = "Descending Market Vector ▼";
      trajectoryColor = COLORS.red;
    } else {
      trajectoryLabel = "Stable Baseline";
      trajectoryColor = COLORS.muted;
    }
  }

  return {
    phase,
    stressedEquities,
    total,
    drawdownPct,
    targetWR,
    currentWR,
    guardrailFactor,
    guardrailStatus,
    guardrailColor,
    modifiedTargetMonths,
    targetCashAmount,
    quarterlyRequest,
    guardrailAdjustedQuarterly,
    runwayMonths,
    runwayColor,
    surplus,
    trajectory,
    trajectoryLabel,
    trajectoryColor,
    remainingYears,
    baselineNeed,
  };
}

export interface Directive {
  html: string;
  guardrailText: string;
  guardrailColor: string;
  actuarialHtml: string;
}

export function generateDirectives(o: CalcOutputs, inp: CalcInputs): Directive {
  const {
    phase,
    drawdownPct: draw,
    runwayMonths,
    modifiedTargetMonths,
    targetCashAmount,
    quarterlyRequest: tQ,
    guardrailAdjustedQuarterly: gAdjQ,
    guardrailFactor: gF,
    trajectory: traj,
    surplus,
    stressedEquities: eq,
  } = o;
  const mm = inp.mmFund;
  const capA = inp.cappingAge;

  const sC = mm - targetCashAmount;
  const pT = phase === "Go-Slow" ? 15.0 : 10.0;
  const sT = phase === "Go-Slow" ? 25.0 : 20.0;

  // Amount wording: only say "adjusted" when Guyton-Klinger actually changed it.
  const isAdj = gF !== 1.0;
  const amtLabel = isAdj ? "adjusted quarterly draw" : "quarterly draw";
  const amt = isAdj ? gAdjQ : tQ;
  const amtNote = isAdj
    ? ` (Guyton-Klinger ${gF < 1 ? "reduction −10%" : "prosperity bonus +10%"} applied to the ${formatGBP(tQ)} baseline).`
    : "";

  let gAB = "";
  if (gF < 1.0)
    gAB = `<div style="padding:0.75rem; background:rgba(245,158,11,0.1); border:1px solid var(--accent-amber); border-radius:0.4rem; margin:0.5rem 0 1rem; font-size:0.9rem;"><strong style="color:var(--accent-amber);">Guyton-Klinger Preservation:</strong> Realised withdrawal rate is more than 20% above target. Cut this quarter's payout by 10% to <strong>${formatGBP(gAdjQ)}</strong>.</div>`;
  else if (gF > 1.0)
    gAB = `<div style="padding:0.75rem; background:rgba(168,85,247,0.1); border:1px solid var(--accent-purple); border-radius:0.4rem; margin:0.5rem 0 1rem; font-size:0.9rem;"><strong style="color:var(--accent-purple);">Guyton-Klinger Prosperity:</strong> Realised withdrawal rate is more than 20% below target. You may raise this quarter's payout by 10% to <strong>${formatGBP(gAdjQ)}</strong>.</div>`;

  let cGT = "Prosperity";
  let cGC = COLORS.green;
  let h = "";

  const wrap = (
    variant: "green" | "warning" | "danger" | "purple" | "blue",
    title: string,
    desc: string,
    action: string,
  ) => {
    const cls =
      variant === "blue" ? "directive-box" : `directive-box ${variant}`;
    const style =
      variant === "blue" ? ` style="border-left-color:var(--accent-blue);"` : "";
    return `<div class="${cls}"${style}><div class="directive-title">${title}</div><span class="directive-desc">${desc}</span>${gAB}<span class="directive-action">${action}</span></div>`;
  };

  if (eq <= 0 && mm <= 0) {
    cGT = "Exhaustion";
    cGC = COLORS.red;
    h = wrap(
      "danger",
      "Shield Deficit / Exhaustion",
      "Both buckets are empty. The plan cannot fund this quarter's withdrawal.",
      `Required <strong>${formatGBP(amt)}</strong> — <strong>unavailable</strong>. Stop discretionary spending and revisit the plan parameters.`,
    );
  } else if (phase === "No-Go" && surplus >= 0) {
    cGT = "No-Go Amortization";
    cGC = COLORS.purple;
    h = wrap(
      "purple",
      "No-Go Amortization",
      "You are past ~85 and the plan is in run-down mode. Guardrails are switched off; simply draw the target amount from Equities and let the plan amortize.",
      `Draw <strong>${formatGBP(tQ)}</strong> from Global Equities this quarter.`,
    );
  } else if (draw < pT && runwayMonths < modifiedTargetMonths) {
    const def = Math.max(0, targetCashAmount - mm);
    if (draw < 2.0) {
      cGT = "Peak Refill";
      cGC = COLORS.blue;
      h = wrap(
        "blue",
        "Peak Refill Directive",
        `Portfolio is at or near an all-time high (drawdown ${draw.toFixed(1)}%) and the Cash Shield is below its ${modifiedTargetMonths}-month target. This is the ideal moment to sell equities and top the shield right up.`,
        `Sell <strong>${formatGBP(amt)}</strong> from Global Equities for this quarter's ${amtLabel}${amtNote}${amtNote ? "" : "."}<br/>Then sweep an additional <strong>${formatGBP(def)}</strong> from Equities into the Cash Pot to fully refill the shield.`,
      );
    } else if (traj === "ascending") {
      cGT = "Recovery Wave Refill";
      cGC = COLORS.blue;
      h = wrap(
        "blue",
        "Recovery Wave Refill",
        `Equities are rising after a drawdown (${draw.toFixed(1)}% off ATH, momentum ascending). Use the recovery to rebuild the Cash Shield while prices are climbing.`,
        `Sell <strong>${formatGBP(amt)}</strong> from Global Equities for this quarter's ${amtLabel}${amtNote}${amtNote ? "" : "."}<br/>Sell an additional <strong>${formatGBP(Math.min(def, tQ))}</strong> from Equities to refill the shield.`,
      );
    } else {
      cGT = "Refilling Shield";
      cGC = COLORS.blue;
      h = wrap(
        "blue",
        "Normal Draw — Shield Below Target",
        `Markets are broadly calm (drawdown ${draw.toFixed(1)}%) but the Cash Shield is below its ${modifiedTargetMonths}-month target. Take this quarter's spending from equities and plan to top up the shield on the next up-move.`,
        `Sell <strong>${formatGBP(amt)}</strong> from Global Equities for this quarter's ${amtLabel}${amtNote}${amtNote ? "" : "."}`,
      );
    }
  } else if (draw >= sT && runwayMonths > modifiedTargetMonths + 12) {
    cGT = "Reverse-Shielding";
    cGC = COLORS.blue;
    const excess = Math.max(0, mm - targetCashAmount);
    h = wrap(
      "blue",
      "Reverse-Shielding",
      `Markets are down (${draw.toFixed(1)}% off ATH) but your Cash Shield is well above target. Use surplus cash to buy equities at depressed prices while funding spending from cash.`,
      `Fund this quarter's <strong>${formatGBP(amt)}</strong> ${amtLabel} from the Cash Pot${amtNote}${amtNote ? "" : "."}<br/>Deploy up to <strong>${formatGBP(excess)}</strong> of surplus cash into Global Equities.`,
    );
  } else if (draw < pT) {
    cGT = "Normal Draw";
    cGC = COLORS.green;
    h = wrap(
      "green",
      "Normal Draw from Equities",
      `Markets are calm (drawdown ${draw.toFixed(1)}% off ATH) and the Cash Shield is at or above its ${modifiedTargetMonths}-month target. Sell equities as normal for this quarter's spending.`,
      `Sell <strong>${formatGBP(amt)}</strong> from Global Equities for this quarter's ${amtLabel}${amtNote}${amtNote ? "" : "."}`,
    );
  } else if (mm >= gAdjQ) {
    cGT = "Preservation";
    cGC = COLORS.amber;
    h = wrap(
      "warning",
      "Freeze Equities — Draw from Cash",
      `Portfolio is in meaningful drawdown (${draw.toFixed(1)}% off ATH). Stop selling equities and let them recover — fund spending entirely from the Cash Shield this quarter.`,
      `Withdraw <strong>${formatGBP(amt)}</strong> from the Cash Pot for this quarter's ${amtLabel}${amtNote}${amtNote ? "" : "."}<br/>Do not sell any Global Equities.`,
    );
  } else {
    cGT = "Shield Deficit";
    cGC = COLORS.red;
    const shortfall = Math.max(0, amt - mm);
    h = wrap(
      "danger",
      "Shield Deficit",
      `Portfolio is down (${draw.toFixed(1)}% off ATH) and the Cash Shield is exhausted. You are forced to sell equities at a loss to complete this quarter's spending.`,
      `Empty the Cash Pot (<strong>${formatGBP(mm)}</strong>) and sell the remaining <strong>${formatGBP(shortfall)}</strong> from Global Equities${amtNote}${amtNote ? "" : "."}<br/>Prioritise refilling the shield on the next up-move.`,
    );
  }

  const actuarialHtml = `<span style="color:${cGC}; font-weight:bold;">${cGT}:</span> ${surplus >= 0 ? "Surplus " + formatGBP(surplus) : "Deficit " + formatGBP(Math.abs(surplus))} beyond age ${capA} needs.`;

  if (sC > 0.01 && runwayMonths > modifiedTargetMonths)
    h += `<div style="margin-top:1rem; font-size:0.85rem; color:var(--accent-blue);"><strong>Cash Drag Note:</strong> Cash Pot holds <strong>${formatGBP(sC)}</strong> above the ${modifiedTargetMonths}-month target — consider reallocating that surplus into Global Equities.</div>`;

  return { html: h, guardrailText: cGT, guardrailColor: cGC, actuarialHtml };
}


// XOR obfuscation for backup files (matches v1.8 format exactly)
export function xorEncode(txt: string, p: string): string {
  if (!p) throw new Error("Password required");
  const tB = new TextEncoder().encode(txt);
  const pB = new TextEncoder().encode(p);
  const out = new Uint8Array(tB.length);
  for (let i = 0; i < tB.length; i++) out[i] = tB[i] ^ pB[i % pB.length];
  let binary = "";
  for (let i = 0; i < out.length; i++) binary += String.fromCharCode(out[i]);
  return btoa(binary);
}

export function xorDecode(b64: string, p: string): string {
  if (!p) throw new Error("Password required");
  const s = atob(b64);
  const eb = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) eb[i] = s.charCodeAt(i);
  const pB = new TextEncoder().encode(p);
  const out = new Uint8Array(eb.length);
  for (let i = 0; i < eb.length; i++) out[i] = eb[i] ^ pB[i % pB.length];
  return new TextDecoder().decode(out);
}
