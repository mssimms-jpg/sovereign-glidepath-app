// Sovereign Glidepath — State Test Presets panel (Build 085).
//
// QA aid: populates Pane 1 with cheat-sheet recipes for each of the 8
// documented directive states so Pane 2 + Pane 3 can be verified without
// hand-typing values.
//
// Build 085 —
//  • Recoloured to the Audit-Mode purple used across the app.
//  • Removed the internal "▾/▸" toggle; once QA/Audit mode has been entered
//    via the double-click on Pane 2's title (unchanged), the title and all
//    8 preset buttons render together immediately.
//  • The currently-applied preset renders at full brightness; the other
//    seven render dimmed so the active one is identifiable at a glance.
//
// Build 081 — presets pin every field their trigger condition depends on
// (age, cappingAge, equities, cash, ATH, target, stress, cash-shield months,
// legacy target, assumed real growth) so state does NOT depend on whatever
// a prior test happened to leave behind.

import { useState } from "react";

export interface PresetValues {
  age?: number;
  cappingAge?: number;
  equityVal?: string;
  mmVal?: string;
  athVal?: string;
  targetYearly?: string;
  stressPct?: number;
  desiredRunwayMonths?: number;
  legacyTarget?: number;
  growthRate?: number;
  /** Build 093 — pinned so elapsed-days against the last Normal row is realistic. */
  periodEndDate?: string;
  /**
   * Build 112 — self-contained Guyton-Klinger Prosperity reference. Without
   * this, the Prosperity branch anchors to the REAL ledger's oldest row, so a
   * preset could never reproduce its documented result on a plan with history
   * (and could even trigger Prosperity spuriously on the calm presets).
   */
  baselineTotal?: number;
}

export interface StateTestPresetsProps {
  currentValues: PresetValues;
  apply: (v: PresetValues) => void;
  /**
   * Build 093 — ISO date every preset pins into Pane 1's Period End Date.
   * Supplied by the host as (most recent Normal ledger row's Period End Date
   * + 90 days), falling back to today when there is no such row.
   */
  pinnedPeriodEndDate?: string;
}

interface Preset {
  id: string;
  label: string;
  hint: string;
  expected: string;
  values: PresetValues;
}

const BASELINE: Pick<PresetValues, "legacyTarget" | "growthRate" | "stressPct"> = {
  legacyTarget: 0,
  growthRate: 4,
  stressPct: 0,
};

const PRESETS: Preset[] = [
  {
    id: "normal",
    label: "1. Normal Draw",
    hint: "Calm markets, shield at target.",
    expected: "Normal Draw",
    values: {
      ...BASELINE,
      age: 65,
      cappingAge: 90,
      equityVal: "600000",
      mmVal: "140000",
      athVal: "760000",
      targetYearly: "42000",
      desiredRunwayMonths: 36,
      baselineTotal: 740000,
    },
  },
  {
    id: "peak_refill",
    label: "2. Peak Refill / Recovery Wave",
    hint: "Portfolio near ATH but cash shield low.",
    expected: "Peak Refill (or Recovery Wave)",
    values: {
      ...BASELINE,
      age: 65,
      cappingAge: 90,
      equityVal: "737000",
      mmVal: "20000",
      athVal: "737000",
      targetYearly: "42000",
      desiredRunwayMonths: 36,
      baselineTotal: 757000,
    },
  },
  {
    id: "reverse_shield",
    label: "3. Reverse-Shielding",
    hint: "Big drawdown but cash pot well above target.",
    expected: "Reverse-Shielding",
    values: {
      ...BASELINE,
      age: 65,
      cappingAge: 90,
      equityVal: "400000",
      mmVal: "250000",
      athVal: "900000",
      targetYearly: "42000",
      desiredRunwayMonths: 24,
      baselineTotal: 650000,
    },
  },
  {
    id: "freeze",
    label: "4. Freeze Equities / Cash Draw",
    hint: "Equities ~15% below baseline, cash covers the draw.",
    expected: "Preservation (banner: Freeze Equities — Draw from Cash)",
    values: {
      ...BASELINE,
      age: 65,
      cappingAge: 90,
      equityVal: "600000",
      mmVal: "100000",
      athVal: "800000",
      targetYearly: "42000",
      desiredRunwayMonths: 36,
      baselineTotal: 700000,
    },
  },
  {
    id: "preservation",
    label: "5. G-K Preservation (−10%)",
    hint: "Realised WR > 20% above target.",
    expected: "Reduction Applied (−10%)",
    values: {
      ...BASELINE,
      age: 65,
      cappingAge: 90,
      equityVal: "300000",
      mmVal: "60000",
      athVal: "800000",
      targetYearly: "36000",
      desiredRunwayMonths: 36,
      baselineTotal: 360000,
    },
  },
  {
    id: "prosperity",
    label: "6. G-K Prosperity (+10%)",
    hint: "Realised WR > 20% below target, no comfort bypass.",
    expected: "Prosperity Bonus (+10%)",
    values: {
      ...BASELINE,
      age: 65,
      cappingAge: 90,
      equityVal: "170000",
      mmVal: "30000",
      athVal: "160000",
      targetYearly: "15000",
      desiredRunwayMonths: 24,
      baselineTotal: 150000,
    },
  },
  {
    id: "no_go",
    label: "7. No-Go Amortization",
    hint: "Age ≥ 85, guardrails off.",
    expected: "No-Go Amortization",
    values: {
      ...BASELINE,
      age: 86,
      cappingAge: 95,
      equityVal: "400000",
      mmVal: "50000",
      athVal: "700000",
      targetYearly: "36000",
      desiredRunwayMonths: 12,
      baselineTotal: 450000,
    },
  },
  {
    id: "shield_deficit",
    label: "8. Shield Deficit / Exhaustion",
    hint: "Cash pot empty, forced equity sale.",
    expected: "Shield Deficit",
    values: {
      ...BASELINE,
      age: 65,
      cappingAge: 90,
      equityVal: "400000",
      mmVal: "0",
      athVal: "800000",
      targetYearly: "42000",
      desiredRunwayMonths: 36,
      baselineTotal: 400000,
    },
  },
];

function fmt(v: string | number | undefined): string {
  if (v === undefined || v === "") return "—";
  return String(v);
}

function diff(before: PresetValues, after: PresetValues): string[] {
  const keys: (keyof PresetValues)[] = [
    "age",
    "cappingAge",
    "equityVal",
    "mmVal",
    "athVal",
    "targetYearly",
    "stressPct",
    "desiredRunwayMonths",
    "legacyTarget",
    "growthRate",
    "periodEndDate",
  ];
  const rows: string[] = [];
  for (const k of keys) {
    const a = after[k];
    const b = before[k];
    if (a === undefined) continue;
    if (String(a) !== String(b ?? "")) {
      rows.push(`${k}: ${fmt(b)} → ${fmt(a)}`);
    }
  }
  return rows;
}

export function StateTestPresets({
  currentValues,
  apply,
  pinnedPeriodEndDate,
}: StateTestPresetsProps) {
  const [lastApplied, setLastApplied] = useState<{
    id: string;
    changes: string[];
    expected: string;
  } | null>(null);

  return (
    <div
      style={{
        margin: "1rem 0",
        padding: "0.6rem 0.85rem",
        background: "rgba(168,85,247,0.06)",
        border: "1px dashed var(--accent-purple)",
        borderRadius: 6,
      }}
    >
      <div
        style={{
          fontSize: "0.78rem",
          fontWeight: 700,
          padding: "0.35rem 0",
          color: "var(--accent-purple)",
        }}
      >
        🧪 State Test Presets{" "}
        <span style={{ opacity: 0.85, fontWeight: 500, color: "var(--text-muted)" }}>
          — QA aid, populates Pane 1 without committing
        </span>
      </div>
      <div style={{ marginTop: "0.3rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "0.4rem",
          }}
        >
          {PRESETS.map((p) => {
            const isActive = lastApplied?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                style={{
                  fontSize: "0.7rem",
                  padding: "0.5rem 0.6rem",
                  textAlign: "left",
                  lineHeight: 1.3,
                  borderRadius: "0.375rem",
                  background: "var(--accent-purple)",
                  color: "#fff",
                  border: isActive
                    ? "1px solid #fff"
                    : "1px solid transparent",
                  opacity: isActive ? 1 : 0.45,
                  fontWeight: isActive ? 800 : 600,
                  cursor: "pointer",
                }}
                title={`${p.hint}\nExpected: ${p.expected}`}
                onClick={() => {
                  // Build 093 — pin Period End Date alongside every other
                  // trigger field so the elapsed-days gap is deterministic.
                  const values: PresetValues = pinnedPeriodEndDate
                    ? { ...p.values, periodEndDate: pinnedPeriodEndDate }
                    : p.values;
                  const changes = diff(currentValues, values);
                  apply(values);
                  setLastApplied({ id: p.id, changes, expected: p.expected });
                }}
              >
                <div style={{ fontWeight: isActive ? 800 : 700 }}>{p.label}</div>
                <div style={{ opacity: 0.9, fontSize: "0.65rem" }}>
                  Expected: {p.expected}
                </div>
              </button>
            );
          })}
        </div>
        {lastApplied && (
          <div
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem 0.65rem",
              background: "rgba(0,0,0,0.15)",
              border: "1px solid var(--border-color)",
              borderRadius: 4,
              fontSize: "0.7rem",
              lineHeight: 1.5,
            }}
          >
            <div style={{ fontWeight: 700 }}>
              Applied: {PRESETS.find((p) => p.id === lastApplied.id)?.label} —{" "}
              <span style={{ color: "var(--accent-purple)" }}>
                Expected: {lastApplied.expected}
              </span>
            </div>
            {lastApplied.changes.length === 0 ? (
              <div style={{ color: "var(--text-muted)" }}>
                (No changes — values already matched.)
              </div>
            ) : (
              <ul style={{ margin: "0.3rem 0 0", paddingLeft: "1.1rem" }}>
                {lastApplied.changes.map((c) => (
                  <li key={c} style={{ color: "var(--text-muted)" }}>{c}</li>
                ))}
              </ul>
            )}
            <div style={{ marginTop: "0.35rem", color: "var(--text-muted)" }}>
              Review Pane 2/3, then click Commit if you want this row in the ledger.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
