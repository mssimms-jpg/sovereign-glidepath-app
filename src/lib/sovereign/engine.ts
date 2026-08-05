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
  // Real-terms legacy / inheritance target held aside from the "Fun Bucket".
  legacyTarget?: number;
  // Special-event marker: a one-off withdrawal (e.g. car purchase) committed
  // from Pane 5. Carries a plain-text note and an ISO date.
  isSpecialEvent?: boolean;
  eventNote?: string;
  eventDate?: string;
  eventFromEq?: number;
  eventFromCash?: number;
  // For inflow events, eventAmount is the positive absolute amount added.
  isInflowEvent?: boolean;
  eventAmount?: number;
  // Actual amount withdrawn on this quarterly ledger row (Build 062+). Pre-filled
  // from the guardrail-adjusted "Request" on the input pane but freely editable
  // so the user can record what really left the pot that quarter.
  withdrawnAmount?: number;
  // Build 070 — explicit split of the quarterly withdrawal by source bucket,
  // plus an optional rebalance move between buckets. Only set on Normal
  // quarterly drawdown rows; Special Withdrawal and Windfall rows leave these
  // undefined. Undefined on legacy rows committed before Build 070 (do NOT
  // default to 0 — that would misrepresent "source not recorded" as "£0").
  withdrawnFromEquities?: number;
  withdrawnFromCash?: number;
  rebalanceDirection?: "none" | "eq_to_cash" | "cash_to_eq";
  rebalanceAmount?: number;
  // Discriminator for downstream logic — set on every Build 070+ commit so
  // future passes can tell row types apart without parsing the label text.
  entryKind?: "normal" | "special_withdrawal" | "windfall";
  // Build 073 — real ISO date (YYYY-MM-DD) representing the end of the period
  // this Normal row covers. Single source of truth for chronological ordering
  // — the free-text `label` is cosmetic only and must NOT be relied on for
  // sort keys or "previous row" lookups. Undefined for legacy rows whose
  // label did not cleanly parse, and for event rows (which use `eventDate`).
  periodEndDate?: string;
  // Build 079 — snapshot of Pane 2's "Withdrawal Status" (calc.guardrailStatus)
  // at commit time: "Normal" | "Reduction Applied (-10%)" |
  // "Prosperity Bonus (+10%)" | "Comfortable Amortization". The existing
  // `rule` field already stores Pane 2's "Guardrail State"
  // (directive.guardrailText). Together they let the ledger and CSV export
  // record the full state Pane 2/3 were displaying when the row was committed.
  guardrailStatus?: string;
  // Build 095 — per-row snapshot of the three planning assumptions that were
  // in force in Pane 1 when this row was committed. Undefined on legacy rows
  // committed before Build 095 (do NOT backfill from today's globals — that
  // would fabricate history; Edit shows 0 / "not recorded" instead).
  assumedGrowthRate?: number;
  assumedCashRealPct?: number;
  assumedInflationPct?: number;
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
  legacyTarget?: number;
  /** Real return on the Cash Pot, in %. Used to blend the amortization rate. */
  cashRealPct?: number;
  /**
   * Build 091 — total portfolio value at plan inception (oldest ledger row).
   * Independent reference for the Guyton-Klinger Prosperity (+10%) branch.
   * Omit and the ATH-anchored rate is used as before.
   */
  baselineTotal?: number;

  /**
   * Build 092 — State / DB pension, in today's money. Same convention the
   * simulators (drawdown.ts call-sites) have used since Build 021: once
   * `currentAge >= pensionStartAge`, the pension is netted off the gross
   * Target Annual Base Withdrawal and only the REMAINDER is funded from the
   * pot. Omit (or leave at 0) and behaviour is identical to Build 091.
   */
  pensionAmount?: number;
  /** Age at which the pension starts being received. */
  pensionStartAge?: number;
  /** Real annual increase of the pension, in % (compounds from start age). */
  pensionIncreasePct?: number;
}

/**
 * Build 092 — pension actually in payment this year, in today's money.
 * Mirrors drawdown.ts's call-sites: 0 before the start age, otherwise the
 * amount escalated in real terms for each year since the start age.
 */
export function pensionIncomeFor(inp: {
  currentAge: number;
  pensionAmount?: number;
  pensionStartAge?: number;
  pensionIncreasePct?: number;
}): number {
  const amt = Math.max(0, inp.pensionAmount || 0);
  const startAge = inp.pensionStartAge;
  if (amt <= 0 || typeof startAge !== "number" || startAge <= 0) return 0;
  if (inp.currentAge < startAge) return 0;
  const g = Math.max(0, inp.pensionIncreasePct || 0) / 100;
  const yearsInPayment = Math.max(0, Math.floor(inp.currentAge - startAge));
  return amt * Math.pow(1 + g, yearsInPayment);
}

/** Net-of-pension annual draw funded from the pot. */
export function netTargetYearlyFor(inp: CalcInputs): number {
  return Math.max(0, inp.targetYearly - pensionIncomeFor(inp));
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
  legacyTarget: number;
  comfortYears: number;
  trajectory: Trajectory;
  trajectoryLabel: string;
  trajectoryColor: string;
  remainingYears: number;
  baselineNeed: number;
  /** Build 092 — pension transparency. */
  grossTargetYearly: number;
  pensionIncome: number;
  netTargetYearly: number;
  pensionActive: boolean;
  /** Build 113 — true when Total Capital is <= 0 with a live spending target. */
  portfolioExhausted: boolean;
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

// ---------------------------------------------------------------------------
// Build 090 — TRAILING DRAWDOWN-OFF-ATH: the single source of truth for the
// "is this a defensive period?" signal, shared by the live dashboard
// (calculate()/generateDirectives()) and the simulators (drawdown.ts).
//
// The signal must only use information available BEFORE the period's own
// return is known: balances as they stood going into the period, measured
// against the all-time high established by prior history. Using the period's
// own realized return is look-ahead bias.
// ---------------------------------------------------------------------------

/** Percentage the portfolio currently sits below its own past all-time high. */
export function drawdownPctOffAth(total: number, ath: number): number {
  return ath > 0 ? ((ath - total) / ath) * 100 : 0;
}

/** Preservation ("meaningful drawdown") threshold, in % off ATH. */
export function preservationThresholdPct(phase: Phase): number {
  return phase === "Go-Slow" ? 15.0 : 10.0;
}

/** Severe ("deep drawdown") threshold, in % off ATH. */
export function severeThresholdPct(phase: Phase): number {
  return phase === "Go-Slow" ? 25.0 : 20.0;
}

/**
 * Trailing-drawdown defensive predicate. Mode sets the sensitivity around the
 * SAME phase-aware thresholds the dashboard uses:
 *   Strict     — only in a severe drawdown (>= severeThresholdPct)
 *   Standard   — the dashboard's own Preservation trigger (>= preservationThresholdPct)
 *   Aggressive — half the Preservation trigger (earliest de-risking)
 */
export function defensiveDrawdownHurdlePct(
  phase: Phase,
  mode: "strict" | "standard" | "aggressive",
): number {
  if (mode === "strict") return severeThresholdPct(phase);
  if (mode === "aggressive") return preservationThresholdPct(phase) / 2;
  return preservationThresholdPct(phase);
}

/**
 * Is the period defensive, judged purely on trailing state?
 * @param totalBefore  E + C as they stood BEFORE this period's return.
 * @param athBefore    All-time high of E + C from prior history only.
 */
export function isDefensiveByTrailingDrawdown(
  totalBefore: number,
  athBefore: number,
  phase: Phase,
  mode: "strict" | "standard" | "aggressive",
): boolean {
  const draw = drawdownPctOffAth(totalBefore, athBefore);
  // Round to 4 dp so a value sitting exactly on the hurdle can't flip on noise.
  return Math.round(draw * 1e4) / 1e4 >= defensiveDrawdownHurdlePct(phase, mode);
}

// ---------------------------------------------------------------------------
// Build 091 — GUYTON-KLINGER GUARDRAIL: single source of truth, shared by the
// live dashboard (calculate()) and the simulators (drawdown.ts applyPeriod()).
//
// Prior builds compared the current withdrawal rate against an ATH-anchored
// rate for BOTH branches. Because the ATH is a running maximum of the total,
// the total can never exceed it, so currentWR >= athWR always held and the
// Prosperity (+10%) branch was mathematically unreachable in the simulators.
//
// The corrected design uses TWO independent references:
//   • Preservation (−10%) still compares against the PEAK (ATH) rate — the
//     capital-preservation guardrail is about how far you have fallen from
//     your best, so the peak is the right reference. Behaviour unchanged.
//   • Prosperity (+10%) compares against the plan's BASELINE rate — the
//     withdrawal rate implied by the portfolio at plan inception. This
//     reference does not move with the peak, so a portfolio that grows well
//     beyond its starting value genuinely drives currentWR below it.
// ---------------------------------------------------------------------------

export type GkOutcome = { factor: number; label: "Normal" | "Preservation" | "Prosperity" };

/**
 * Guyton-Klinger ±10% decision. All three WR arguments must share the same
 * unit (all fractions, or all percentages) — only ratios are compared.
 * Gated off entirely in the No-Go phase (Build 089).
 */
export function gkGuardrail(
  currentWR: number,
  athWR: number,
  baselineWR: number,
  phase: Phase,
): GkOutcome {
  if (phase === "No-Go") return { factor: 1.0, label: "Normal" };
  if (athWR > 0 && currentWR >= athWR * 1.2)
    return { factor: 0.9, label: "Preservation" };
  if (baselineWR > 0 && currentWR <= baselineWR * 0.8)
    return { factor: 1.1, label: "Prosperity" };
  return { factor: 1.0, label: "Normal" };
}





// Build 088 — CANONICAL DIRECTIVE STATE REGISTRY.
// Single source of truth for every value `Directive.guardrailText` can take,
// the banner title the engine renders for it, and whether the narrative locks
// the withdrawal source (and to which bucket). Non-locking states have
// lockedBucket === null and defer to the caller's Defensive-Draw Mode.
// Banner (Pane 3), footnote, Pane 2 "Guardrail State" and the State Test
// Presets all read from this table so they can never drift apart.
export const DIRECTIVE_STATES = {
  "Peak Refill": { title: "Peak Refill Directive", lockedBucket: "equities" },
  "Recovery Wave Refill": {
    title: "Recovery Wave Refill",
    lockedBucket: "equities",
  },
  "Refilling Shield": {
    title: "Normal Draw — Shield Below Target",
    lockedBucket: "equities",
  },
  "Reverse-Shielding": { title: "Reverse-Shielding", lockedBucket: "cash" },
  // Cash is empty; the remainder is sold from equities. Seed the split as
  // equities so the Commit form records the dominant source.
  "Shield Deficit": { title: "Shield Deficit", lockedBucket: "equities" },
  Exhaustion: {
    title: "Shield Deficit / Exhaustion",
    lockedBucket: "equities",
  },
  Preservation: {
    title: "Freeze Equities — Draw from Cash",
    lockedBucket: "cash",
  },
  "Normal Draw": { title: "Normal Draw", lockedBucket: null },
  "Comfortable Amortization": {
    title: "Comfortable Amortization",
    lockedBucket: null,
  },
  "No-Go Amortization": { title: "No-Go Amortization", lockedBucket: null },
} as const satisfies Record<
  string,
  { title: string; lockedBucket: "equities" | "cash" | null }
>;

export type DirectiveState = keyof typeof DIRECTIVE_STATES;

export const ALL_DIRECTIVE_STATES = Object.keys(
  DIRECTIVE_STATES,
) as DirectiveState[];

export const LOCKING_STATES = ALL_DIRECTIVE_STATES.filter(
  (s) => DIRECTIVE_STATES[s].lockedBucket !== null,
);

export const NON_LOCKING_STATES = ALL_DIRECTIVE_STATES.filter(
  (s) => DIRECTIVE_STATES[s].lockedBucket === null,
);

export function isLockingState(guardrailText: string): boolean {
  const s = DIRECTIVE_STATES[guardrailText as DirectiveState];
  return !!s && s.lockedBucket !== null;
}

// Which bucket a locking narrative state funds withdrawals from. Non-locking
// states return null and defer to the caller's Defensive-Draw Mode.
export function lockingBucketFor(
  guardrailText: string,
): "equities" | "cash" | null {
  return DIRECTIVE_STATES[guardrailText as DirectiveState]?.lockedBucket ?? null;
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
    targetYearly: grossTargetYearly,
    stressPct,
    growthRatePct,
    desiredRunwayMonths,
  } = inp;

  // Build 092 — pension netting. Once the pension is in payment the pot only
  // has to fund the REMAINDER of the lifestyle target, so every downstream
  // figure (WR ratios, guardrail, shield target, runway, amortization) is
  // computed against the NET draw. Before the start age this is identical to
  // the gross target, so pre-pension behaviour is unchanged.
  const pensionIncome = pensionIncomeFor(inp);
  const pensionActive = pensionIncome > 0;
  const targetYearly = Math.max(0, grossTargetYearly - pensionIncome);
  const netTargetYearly = targetYearly;

  const realG = (isNaN(growthRatePct) ? 2.5 : growthRatePct) / 100;
  const stressedEquities = rawEquities * (1 - stressPct / 100);
  const total = stressedEquities + mmFund;


  // Blended real return across the two buckets — makes the Fun Bucket / Actuarial
  // Amortization Matrix respond to cash drag the same way the Risk Simulator does.
  const cashRealG = ((typeof inp.cashRealPct === "number" ? inp.cashRealPct : 1) || 0) / 100;
  const blendedRealG =
    total > 0 ? (stressedEquities * realG + mmFund * cashRealG) / total : realG;

  const drawdownPct = drawdownPctOffAth(total, ath);
  const targetWR = ath > 0 ? (targetYearly / ath) * 100 : 0;
  // Build 113 — EXHAUSTION GUARD. A total of zero or less means the plan can
  // fund nothing at all. Previously currentWR silently fell back to 0 here,
  // which trivially satisfied the Guyton-Klinger Prosperity trigger
  // (0 <= baselineWR * 0.8) and reported "Prosperity Bonus (+10%)" on an empty
  // or negative portfolio, contradicting the drawdown-based guardrail state
  // and the Pane 3 banner. An exhausted plan is now routed to an explicit
  // catastrophic state and the WR is reported as infinite (undefined-but-
  // catastrophic), never as a benign zero.
  const portfolioExhausted = total <= 0 && targetYearly > 0;
  const currentWR = total > 0 ? (targetYearly / total) * 100 : portfolioExhausted ? Infinity : 0;
  // Build 091 — independent Prosperity reference: the withdrawal rate implied
  // by the portfolio at plan inception. Falls back to the ATH-anchored rate
  // when no baseline is available (fresh plan, no ledger history).
  const baselineTotal = inp.baselineTotal && inp.baselineTotal > 0 ? inp.baselineTotal : 0;
  const baselineWR = baselineTotal > 0 ? (targetYearly / baselineTotal) * 100 : targetWR;

  const phase = phaseFor(currentAge);

  const gk = portfolioExhausted
    ? ({ factor: 1.0, label: "Normal" } as const)
    : gkGuardrail(currentWR, targetWR, baselineWR, phase);
  let guardrailFactor = gk.factor;
  let guardrailStatus = portfolioExhausted
    ? "Portfolio Exhausted"
    : gk.label === "Preservation"
      ? "Reduction Applied (-10%)"
      : gk.label === "Prosperity"
        ? "Prosperity Bonus (+10%)"
        : "Normal";
  let guardrailColor = portfolioExhausted
    ? COLORS.red
    : gk.label === "Preservation"
      ? COLORS.amber
      : gk.label === "Prosperity"
        ? COLORS.purple
        : COLORS.green;


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
    // Build 098 — withdraw-then-grow: withdrawals are taken at the START of
    // each year, so this is an annuity-DUE present value, i.e. the ordinary
    // annuity factor scaled by (1 + g).
    baselineNeed =
      blendedRealG > 0
        ? targetYearly *
          ((1 - Math.pow(1 + blendedRealG, -remainingYears)) / blendedRealG) *
          (1 + blendedRealG)
        : targetYearly * remainingYears;
  }

  const legacyTarget = Math.max(0, inp.legacyTarget || 0);
  const surplus = total - baselineNeed - legacyTarget;
  const comfortYears = targetYearly > 0 ? surplus / targetYearly : 0;

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

  // Comfort bypass — if surplus beyond lifetime needs + legacy is >= 3 years,
  // the ATH is stale and the Guyton-Klinger guardrails would mis-fire.
  // Neutralise them so the guardrail status readout matches the directive.
  // Build 091 — the comfort bypass exists to stop a STALE ATH forcing a
  // counter-productive CUT on a plan that is demonstrably in surplus. It must
  // not swallow the Prosperity bonus, which is the correct signal in exactly
  // that situation. Only reductions are neutralised.
  const _comfortBypass = comfortYears >= 3 && phase !== "No-Go";
  if (_comfortBypass && guardrailFactor < 1.0) {
    guardrailFactor = 1.0;
    guardrailStatus = "Comfortable Amortization";
    guardrailColor = COLORS.green;
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
    legacyTarget,
    comfortYears,
    trajectory,
    trajectoryLabel,
    trajectoryColor,
    remainingYears,
    baselineNeed,
    grossTargetYearly,
    pensionIncome,
    netTargetYearly,
    pensionActive,
    portfolioExhausted,
  };

}


export interface Directive {
  html: string;
  guardrailText: string;
  guardrailColor: string;
  actuarialHtml: string;
}

export function generateDirectives(
  o: CalcOutputs,
  inp: CalcInputs,
  bucketOverride?: "equities" | "cash",
): Directive {
  // Build 081 — for non-locking states (Normal Draw, Comfortable
  // Amortization, No-Go Amortization) the Pane 3 banner text must match the
  // Defensive-Draw Mode's bucket recommendation. Locking states (Peak Refill,
  // Recovery Wave, Refilling Shield, Reverse-Shielding, Freeze Equities,
  // Shield Deficit) ignore the override — their bucket is dictated by the
  // narrative itself.
  const useCash = bucketOverride === "cash";
  const srcLabel = useCash ? "the Cash Pot" : "Global Equities";
  const srcVerb = useCash ? "Withdraw" : "Sell";
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
    legacyTarget,
    comfortYears,
    stressedEquities: eq,
  } = o;
  const mm = inp.mmFund;
  const capA = inp.cappingAge;



  const sC = mm - targetCashAmount;
  const pT = preservationThresholdPct(phase);
  const sT = severeThresholdPct(phase);

  // Comfort bypass: if the plan has 3+ years of true surplus beyond the
  // baseline lifetime need AND the legacy target, drawdown-vs-ATH signals
  // are stale and the Preservation/Freeze/G-K reduction branches are
  // counter-productive — the ATH is old, the surplus is real. Skip them so
  // the user simply draws normally from Equities.
  const comfortBypass = comfortYears >= 3 && phase !== "No-Go";


  // Amount wording: only say "adjusted" when Guyton-Klinger actually changed it.
  // Under comfort bypass we also force the amount back to the un-reduced quarterly.
  // Build 091 — comfort bypass suppresses cuts only; the Prosperity bonus stands.
  const isAdj = gF > 1.0 || (gF < 1.0 && !comfortBypass);
  const amtLabel = isAdj ? "adjusted quarterly draw" : "quarterly draw";
  const amt = isAdj ? gAdjQ : tQ;
  const amtNote = isAdj
    ? ` (Guyton-Klinger ${gF < 1 ? "reduction −10%" : "prosperity bonus +10%"} applied to the ${formatGBP(tQ)} baseline).`
    : "";

  let gAB = "";
  if (!comfortBypass && gF < 1.0)
    gAB = `<div style="padding:0.75rem; background:rgba(245,158,11,0.1); border:1px solid var(--accent-amber); border-radius:0.4rem; margin:0.5rem 0 1rem; font-size:0.9rem;"><strong style="color:var(--accent-amber);">Guyton-Klinger Preservation:</strong> Realised withdrawal rate is more than 20% above target. Cut this quarter's payout by 10% to <strong>${formatGBP(gAdjQ)}</strong>.</div>`;
  else if (gF > 1.0)
    gAB = `<div style="padding:0.75rem; background:rgba(168,85,247,0.1); border:1px solid var(--accent-purple); border-radius:0.4rem; margin:0.5rem 0 1rem; font-size:0.9rem;"><strong style="color:var(--accent-purple);">Guyton-Klinger Prosperity:</strong> Realised withdrawal rate is more than 20% below target. You may raise this quarter's payout by 10% to <strong>${formatGBP(gAdjQ)}</strong>.</div>`;

  let cGT: DirectiveState = "Normal Draw";
  let cGC = COLORS.green;
  let h = "";

  // Build 088 — the banner title is derived from DIRECTIVE_STATES so the
  // headline and the canonical state name can never disagree. Where the
  // headline text differs from the state name, the state name is shown
  // alongside it, plus any active Guyton-Klinger overlay.
  const overlayNote =
    !comfortBypass && gF < 1.0
      ? "G-K Preservation overlay (−10%)"
      : gF > 1.0
        ? "G-K Prosperity overlay (+10%)"
        : "";

  const wrap = (
    variant: "green" | "warning" | "danger" | "purple" | "blue",
    state: DirectiveState,
    desc: string,
    action: string,
    titleOverride?: string,
  ) => {
    const cls =
      variant === "blue" ? "directive-box" : `directive-box ${variant}`;
    const style =
      variant === "blue" ? ` style="border-left-color:var(--accent-blue);"` : "";
    const title = titleOverride ?? DIRECTIVE_STATES[state].title;
    const bits: string[] = [];
    if (title !== state) bits.push(`State: ${state}`);
    if (overlayNote) bits.push(overlayNote);
    const sub = bits.length
      ? `<span style="display:block; font-size:0.72rem; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; color:var(--text-muted); margin-top:0.2rem;">${bits.join(" · ")}</span>`
      : "";
    return `<div class="${cls}"${style}><div class="directive-title">${title}${sub}</div><span class="directive-desc">${desc}</span>${gAB}<span class="directive-action">${action}</span></div>`;
  };


  // Build 113 — the exhaustion branch now also fires whenever NET total capital
  // is <= 0 (e.g. a bucket driven negative by an oversized special event), so
  // the banner, Pane 2's Withdrawal Status and the Guardrail State all describe
  // the same catastrophic reality instead of disagreeing.
  if ((eq <= 0 && mm <= 0) || o.portfolioExhausted) {
    cGT = "Exhaustion";
    cGC = COLORS.red;
    h = wrap(
      "danger",
      "Exhaustion",
      "Total capital is exhausted. The plan cannot fund this quarter's withdrawal.",
      `Required <strong>${formatGBP(amt)}</strong> — <strong>unavailable</strong>. Stop discretionary spending and revisit the plan parameters.`,
    );
  } else if (phase === "No-Go" && surplus >= 0) {
    cGT = "No-Go Amortization";
    cGC = COLORS.purple;
    h = wrap(
      "purple",
      "No-Go Amortization",
      `You are past ~85 and the plan is in run-down mode. Guardrails are switched off; simply draw the target amount from ${srcLabel} and let the plan amortize.`,
      `${srcVerb} <strong>${formatGBP(tQ)}</strong> from ${srcLabel} this quarter.`,
    );
  } else if (draw < pT && runwayMonths < modifiedTargetMonths) {
    const def = Math.max(0, targetCashAmount - mm);
    if (draw < 2.0) {
      cGT = "Peak Refill";
      cGC = COLORS.blue;
      h = wrap(
        "blue",
        "Peak Refill",
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
        "Refilling Shield",
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
  } else if (comfortBypass && draw >= pT) {
    cGT = "Comfortable Amortization";
    cGC = COLORS.green;
    const legacyNote =
      legacyTarget > 0
        ? ` You are still on track to leave <strong>${formatGBP(legacyTarget)}</strong> (real terms) as a legacy.`
        : "";
    h = wrap(
      "green",
      "Comfortable Amortization",
      `Portfolio is ${draw.toFixed(1)}% off a past all-time high, but you still hold roughly <strong>${comfortYears.toFixed(1)} years</strong> of surplus beyond lifetime needs${legacyTarget > 0 ? " and legacy target" : ""}. The distant ATH is stale — freezing equities here would just hoard capital you cannot spend.${legacyNote}`,
      `${srcVerb} <strong>${formatGBP(amt)}</strong> from ${srcLabel} for this quarter's ${amtLabel}${amtNote}${amtNote ? "" : "."}`,
      `Comfortable Amortization — Draw Normally${useCash ? " from Cash" : ""}`,
    );
  } else if (draw < pT) {
    cGT = "Normal Draw";
    cGC = COLORS.green;
    h = wrap(
      "green",
      "Normal Draw",
      `Markets are calm (drawdown ${draw.toFixed(1)}% off ATH) and the Cash Shield is at or above its ${modifiedTargetMonths}-month target. Fund this quarter's spending as normal from ${srcLabel}.`,
      `${srcVerb} <strong>${formatGBP(amt)}</strong> from ${srcLabel} for this quarter's ${amtLabel}${amtNote}${amtNote ? "" : "."}`,
      `Normal Draw from ${useCash ? "Cash" : "Equities"}`,
    );
  } else if (mm >= gAdjQ) {
    cGT = "Preservation";
    cGC = COLORS.amber;
    h = wrap(
      "warning",
      "Preservation",
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

  const legacyBit =
    legacyTarget > 0
      ? ` (after reserving <strong>${formatGBP(legacyTarget)}</strong> legacy target)`
      : "";
  const actuarialHtml = `<span style="color:${cGC}; font-weight:bold;">${cGT}:</span> ${surplus >= 0 ? "Surplus " + formatGBP(surplus) : "Deficit " + formatGBP(Math.abs(surplus))} beyond age ${capA} needs${legacyBit}. <span style="color:var(--text-muted); font-weight:400;">(≈ ${comfortYears.toFixed(1)} years of draw.)</span>`;


  if (sC > 0.01 && runwayMonths > modifiedTargetMonths)
    h += `<div style="margin-top:1rem; font-size:0.85rem; color:var(--accent-blue);"><strong>Cash Drag Note:</strong> Cash Pot holds <strong>${formatGBP(sC)}</strong> above the ${modifiedTargetMonths}-month target — consider reallocating that surplus into Global Equities.</div>`;

  // Build 092 — make pension netting explicit in the directive itself, so the
  // guardrail status can never look inexplicable against a gross-only figure.
  if (o.pensionActive)
    h += `<div style="margin-top:1rem; font-size:0.85rem; color:var(--accent-blue);"><strong>Pension Applied:</strong> Your pension of <strong>${formatGBP(o.pensionIncome)}</strong>/yr is already in payment, so only <strong>${formatGBP(o.netTargetYearly)}</strong>/yr of your <strong>${formatGBP(o.grossTargetYearly)}</strong>/yr lifestyle target has to come from the pot. Every figure and guardrail above is calculated on that net amount.</div>`;

  return { html: h, guardrailText: cGT, guardrailColor: cGC, actuarialHtml };

}


// Legacy XOR obfuscation for backup files (v1.8 format). READ-ONLY as of
// Build 117: kept so older .shd backups still restore. New backups are written
// with real AES-256-GCM encryption — see secureStore.encryptBackup().
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
