// Build 116 — reuses the exact dashed swatch from the fan chart's own legend
// ("Assumed Rate (blended, real)"): 30px wide, 3px dashed var(--text-main).
// Used next to the "Assumed Real Growth Rate" label in the Risk Simulator to
// make it obvious that this field only affects the dashed deterministic line.
// (Build 119 removed the equivalent "Shown on chart as" cue from Pane 1 —
// this icon is Risk-Simulator-only now.)
export function DashedLineIcon() {
  return (
    <span
      className="legend-line"
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: 30,
        height: 0,
        borderTop: "3px dashed var(--text-main)",
        verticalAlign: "middle",
        margin: "0 4px",
      }}
    />
  );
}
