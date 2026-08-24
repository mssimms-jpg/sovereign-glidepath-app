## 1. Fix: Defensive-draw threshold has no visible effect

The threshold state IS wired into the simulation `useMemo` dep array, but in practice the median/bands shift very little because the seed and growth paths are identical across modes — only the defensive-draw branch differs, and on a multi-decade plan the total `E+C` per year ends up close. So changes are happening but are visually imperceptible, which reads as "broken".

Two fixes in `src/components/sovereign/MonteCarloPanel.tsx`:

a. **Add a live "defensive years" counter** next to the threshold buttons. Track inside the Monte Carlo loop a running count of years where the defensive branch fired, average it across runs, and display e.g. *"Defensive draws: avg 12.4 of 30 yrs (41%)"*. This gives the user immediate, unambiguous feedback that the choice is doing something — and makes the difference between Strict / Standard / Aggressive obvious at a glance.

b. **Amplify the chart impact** by also tracking, per year, the `p10` (worst-decile) outcome separately for the cash bucket vs equities. The current code already differentiates buckets — the bug is that we only display the *sum*. Add a faint dashed "p10 floor" line (already partly there) and confirm it visibly shifts up under Standard/Aggressive (more cash buffer preserved in bad years). No engine maths change — just routing the already-computed numbers into a visible signal.

If after (a) the user can see the counter shift (e.g. Strict ≈ 25%, Standard ≈ 40%, Aggressive ≈ 55%), the simulation is correct and the "no change" perception is resolved.

## 2. New: Allocation bias slider under Equities / Cash

Add a single horizontal slider directly below the two override inputs:

```
Equities ←────────●────────→ Cash
              60% / 40%
```

Behaviour:

- **Default position** = the current live split `livEquities / (livEquities + livCash)`. Persists across re-renders by re-anchoring whenever `livEquities`/`livCash` change (same pattern as the existing seed refs), so on refresh it returns to the actual split.
- **Total preserved**: the sum `simEquities + simCash` stays equal to `livEquities + livCash` (or the user's combined override if both fields are overridden — see below).
- **Moving the slider** writes new values into `equitiesStr` and `cashStr` directly, so the existing what-if pipeline picks them up unchanged. The "✎ what-if" amber marker will appear on whichever side is now overridden, and **Reset to actual** still works per field.
- **Typing in the free-text fields** continues to work exactly as today; after a manual edit the slider position recomputes from the current `simEquities / (simEquities + simCash)` ratio so it stays in sync. Free-text remains the source of truth.
- **Range**: 0–100% in 1% steps. A small "Reset split" link next to the slider snaps both fields back to the live split (separate from per-field "Reset to actual" so the user can rebalance without losing a total-pot override).
- Slider uses the same `<input type="range">` styling as the existing pension/return sliders for visual consistency.

## 3. Versioning + docs

- `package.json` → **1.0.54**
- `SovereignGlidepath.tsx` build stamp → Build 054
- `CHANGELOG.md` → new entry covering the threshold-counter fix and the allocation-bias slider
- `HelpContent.tsx` → 1-sentence note in the Risk Simulator "How to read this" block explaining the slider and the defensive-draw counter
- `public/sovereign-glidepath-manual.html` → mirror the note in §23b (Two-bucket sim), bump cover to Edition VI

## Out of scope

- No engine maths changes — the two-bucket logic stays exactly as Build 053. Only display + a new input control.
- No change to the ledger, license logic, or any other pane.
- No update-zip in this build; you can run `/update-zip` after it lands if you want to deploy.
