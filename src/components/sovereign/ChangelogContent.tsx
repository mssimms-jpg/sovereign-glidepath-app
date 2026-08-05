import React from "react";
import "@/components/sovereign/desk.css";

export function ChangelogContent() {
  return (
    <div className="shd-root">
      <div className="shd-container" style={{ maxWidth: 900 }}>
        <header className="shd-header">
          <h1>Changelog</h1>
        </header>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 119 — Tidy-up: growth rate label in Pane 1
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li><strong>Cleaner label.</strong> The "Assumed Real Growth Rate" slider in Pane 1 no longer carries the "Shown on chart as" dashed-line cue — that hint belongs beside the fan chart's own legend in Pane 5, where it stays.</li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 118 — Companion Apps: Comparison Builder, launched with your live figures
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li><strong>New "Companion Apps" section</strong> at the foot of Pane 2, a home for spin-off tools that sit alongside the dashboard.</li>
              <li><strong>First companion: "📊 Compare vs 4% Rule (Historical)".</strong> The Comparison Builder backtests your plan against every real rolling retirement since 1928 using the same Guyton-Klinger engine as this app, next to a faithful classic 4% Rule replica.</li>
              <li><strong>Your live Pane 1 figures are handed over automatically</strong> — equities, cash, age, horizon, gross target withdrawal and, if configured, your state pension. The comparison runs against them the moment it opens. With no pension set, both models run with none.</li>
              <li><strong>The Comparison Builder's own "📖 User Guide" button now works</strong> — its guide document ships with the app for the first time.</li>
              <li>Opened on its own, with no plan attached, the tool still falls back to its editable example values.</li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>

          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 117 — App-Lock: real encryption for your data at rest
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li><strong>New App-Lock passphrase (minimum 8 characters).</strong> Your ledger, saved settings and licence details are encrypted on this device with AES-256-GCM — authenticated encryption, so tampering is detected rather than silently accepted.</li>
              <li><strong>Nothing loads until you unlock.</strong> The dashboard does not mount until the passphrase is verified and the data decrypted — no figures render behind a dismissible overlay.</li>
              <li><strong>The passphrase cannot be recovered.</strong> No reset, no backdoor. The setup screen requires you to acknowledge this before continuing.</li>
              <li><strong>Existing data migrates automatically</strong> the moment you set a passphrase, and the migration is crash-safe — if interrupted it completes on the next unlock.</li>
              <li><strong>Backups are now genuinely encrypted</strong> (AES-256-GCM keyed from your export password), replacing the old reversible XOR obfuscation. Older XOR backups still restore, read-only.</li>
              <li><strong>New "🔑 Passphrase" button</strong> re-encrypts everything under a new passphrase after verifying the current one.</li>
              <li>Key derivation: scrypt on the desktop app, PBKDF2-SHA256 at 250,000 iterations on the web. Fresh salt per install, fresh nonce per write; the passphrase and derived key are never written to disk.</li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 116 — Dashed-line cue matches the chart legend; clearer Allocation Bias reset link
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li><strong>The dashed-line cue beside "Assumed Real Growth Rate" now reuses the Fan Chart's own legend swatch</strong> — same bright colour, same dash pattern and length — instead of the fainter, shorter icon introduced in build 115.</li>
              <li><strong>A lead-in phrase, "Shown on chart as", now precedes the swatch</strong> in both Pane 1 and Pane 5, so the label reads as a direct pointer to the chart line.</li>
              <li><strong>"Reset split to actual" is now "Reset to starting split &amp; actual values"</strong>, making clear it restores the underlying Equities and Cash figures as well as the percentage. Text only — behaviour unchanged.</li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 115 — Growth sliders reach 20%; clearer Fan Chart vs. dashed-line labelling
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li><strong>Build stamp corrected.</strong> Build 114 shipped without bumping <code>package.json</code>'s version, so the automated stamp still read 113. Bumping the version is now a required, checked step of every build.</li>
              <li><strong>Assumed Real Growth Rate now runs 0–20%</strong> (0.1% steps) in both Pane 1 and the Risk Simulator — headroom for optimistic stress tests, not a realistic claim.</li>
              <li><strong>Clearer simulator labelling:</strong> the mode button is now "Parametric Fan Chart", and its two inputs are marked "(Fan Chart)".</li>
              <li><strong>A dashed-line icon</strong> now sits beside "Assumed Real Growth Rate" in both panes, showing at a glance that it only moves the dashed deterministic line.</li>
              <li><strong>Hover tooltips</strong> on the two Parametric fields, Assumed Real Growth Rate and Cash Real Return explain what moving each one actually does to the chart.</li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>

          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 114 — Simulator Guide button; Annual Pension field types normally
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li><strong>New "📊 Simulator Guide" button</strong> in the header row, between Full Manual and Back-Up, opening the Risk Simulator companion ebook in a new tab exactly as Full Manual does.</li>
              <li><strong>The Annual Pension field no longer reformats mid-keystroke.</strong> It now stores the raw text you type (like Equities, Cash and Target Withdrawal), so the cursor stays put and backspace works normally. The numeric value feeding the guardrail and pension-netting maths is unchanged.</li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 113 — Build stamp automated; negative pots blocked; exhausted portfolio no longer reports "Prosperity"
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li><strong>The build stamp is now generated from <code>package.json</code> at build time</strong>, so it can never silently drift behind the release again.</li>
              <li><strong>Negative pot values are blocked</strong> in Global Equities, Cash and All-Time High — minus signs are stripped as you type and clamped on blur.</li>
              <li><strong>Exhaustion guard:</strong> with Total Capital at or below zero the withdrawal rate used to fall back to 0%, which triggered a bogus "Prosperity Bonus (+10%)" while the Guardrail State said "Preservation".</li>
              <li><strong>Withdrawal Status, Guardrail State and the Pane 3 banner now agree</strong> — guardrails off, status "Portfolio Exhausted", banner "Shield Deficit / Exhaustion".</li>
              <li><strong>Normal scenarios are unaffected</strong>; the guard only engages when total capital is ≤ 0.</li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 112 — Cash Real Return reaches "Can I Afford This?"; State Test Presets are now self-contained
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li><strong>Pane 6 now honours the Cash Real Return slider</strong> — it was never passed through, so the engine silently defaulted to 1.0%. Its Fun Bucket (Surplus) now matches Pane 2 for the same inputs.</li>
              <li><strong>Pane 6 also receives the plan baseline and State Pension details</strong>, so both panes compute from identical assumptions.</li>
              <li><strong>State Test Presets inject their own Guyton-Klinger baseline</strong> — previously the Prosperity reference came from the real ledger, so preset 6 could never show Prosperity and presets 1, 2 and 4 could show it spuriously.</li>
              <li><strong>Stale comment corrected</strong> in <code>defensiveRec.ts</code>: inflation comes from Pane 1's CPI slider, not the Risk Simulator. No calculation change.</li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 111 — Deterministic "Assumed Rate" line now uses the shared drawdown engine
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li><strong>Routed through <code>applyPeriod()</code></strong> — the same shared step function used by the 10,000 Monte Carlo paths and Audit Mode, with a flat deterministic return sequence.</li>
              <li><strong>Depletion is now real:</strong> the old loop drew only from equities and clamped negatives to zero, deleting the shortfall and leaving an untouched cash pot that appeared to grow after the plan had already failed.</li>
              <li><strong>Guyton-Klinger guardrails now apply</strong> to the dashed line (±10%, still off in the No-Go phase).</li>
              <li><strong>Yearly vs Quarterly tick is now respected</strong> — previously ignored entirely.</li>
              <li><strong>Extraordinary inflows re-anchor the deterministic all-time high</strong>, matching the stochastic paths.</li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>

          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 110 — Fan chart tooltip: Assumed Rate split onto two lines
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li><strong>"Assumed Rate" is now its own label line</strong>, with its value right-aligned in the same column as the percentile rows.</li>
              <li><strong>"(blended, real): X.XX%"</strong> now sits as a smaller muted sub-line beneath the label.</li>
              <li><strong>Legend unchanged</strong> — still a single static line with matching core wording.</li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 109 — Fan chart tooltip edge-aware positioning
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li><strong>Fixed-width tooltip (280px)</strong> that never shrinks or wraps, at any hover position.</li>
              <li><strong>Flip-left near the right edge:</strong> the tooltip renders to the left of the cursor as soon as there isn't room to its right, including at the rightmost data point.</li>
              <li><strong>Shortened rate line</strong> to <em>Assumed Rate (blended, real): X.XX%</em>, applied identically to the tooltip and the chart legend.</li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 108 — Ledger row left-column restructure, simpler event labelling
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li><strong>Normal rows</strong> now read as three lines: <em>Age XX · Horizon Age XX</em>, then the phase badge (with any state badge alongside), then <em>Date committed: YYYY-MM-DD</em>.</li>
              <li><strong>Special Event / Windfall rows</strong> skip the Age/Horizon line entirely — badge + description, then the phase/state badge line, then the Date committed line.</li>
              <li><strong>State badges</strong> sit on the phase badge's line and wrap onto their own line only when too long for the column.</li>
              <li><strong>Purple badge simplified</strong> to exactly <em>★ Event: Inflow</em> or <em>★ Event: Outflow</em>.</li>
              <li><strong>Event title line</strong> now shows only your own description — the old <em>EVENT:</em> / <em>SPECIAL:</em> prefixes are stripped, including on older rows.</li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>

          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 107 — Ledger row tidy-up
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li><strong>"Horizon Age 85"</strong> now reads on a single line (was "· Horizon" with the age wrapping beneath).</li>
              <li><strong>Duplicate guardrail-state badge removed</strong> from the left of each row — the same text already appears in Status &amp; Controls. Phase and Withdrawal Status badges are unchanged.</li>
              <li><strong>Windfall rows</strong> now show simply <em>Extraordinary Inflow</em> in Status &amp; Controls.</li>
              <li><strong>Del button aligned</strong> on event rows with the Del position used on Normal rows.</li>
              <li><strong>Withdrawal Recorded</strong> on Normal rows now shows the total on its own line with the Eq / Cash breakdown beneath.</li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 106 — Event rows are Delete-only, Pane 1 refreshes after a delete
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Edit removed from Special Event and Windfall ledger rows.</strong> Pane
                1's Normal-entry editor was the wrong shape for them and corrupted the row on
                save, so those rows are now <em>Del</em>-only — delete and re-commit to correct
                one. Normal rows are unchanged (Edit and Del).
              </li>
              <li>
                <strong>Bug fixed — Pane 1 no longer goes stale after a delete.</strong> Deleting
                the most recent row now immediately re-derives Equities, Cash, ATH, Age and
                Annual Withdrawal from the surviving newest row, with no page refresh. This
                affected Normal row deletes too, not just event rows. Deleting an older row
                correctly leaves Pane 1 untouched.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>

          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 105 — Pane renumbering and segmented Destination control
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Extraordinary Inflow panel is now numbered “7.”</strong> — it was
                previously the only unnumbered pane header.
              </li>
              <li>
                <strong>Historical Timeline Ledger renumbered 7 → 8.</strong> No other live-app
                text referenced “Pane 7” by number, so nothing else required updating.
              </li>
              <li>
                <strong>Destination Pot dropdown replaced with a segmented button pair</strong>{" "}
                (Equities / Cash), relabelled <em>Destination</em> and matching Pane 6's Source
                button styling. Inflow and ATH re-anchoring logic is unchanged.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 104 — Field-height match, inflow currency formatting, caption trim
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Parametric number fields</strong> now use the same compact height as the
                Pension fields beside them, so both halves of Pane 5's top row line up.
              </li>
              <li>
                <strong>Bug fixed.</strong> Pane 5's Future Extraordinary Inflow{" "}
                <em>Amount</em> field now displays proper currency formatting (£125,000.00),
                matching every other money field.
              </li>
              <li>
                <strong>Pane 1's Inflation / CPI Assumption caption</strong> shortened to
                “— used by the Pane 3 directive to deflate the annualised return.”
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 103 — Blended assumed-rate fix, pension currency formatting, Pane 5
            reshuffle
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Bug fixed.</strong> The fan chart's dashed{" "}
                <em>Your Assumed Rate (blended, real)</em> line was not actually blended — it
                followed the equity Growth slider alone, so Cash Real Return had no effect on
                it. It now uses the same pot-weighted formula as Pane 2's Actuarial
                Amortization Matrix: (equities × equity return + cash × cash real return) ÷
                (equities + cash).
              </li>
              <li>
                <strong>Pane 1's Annual Pension field</strong> now shows standard currency
                formatting (£12,700.00) like every other money field.
              </li>
              <li>
                <strong>Pane 5 reordered:</strong> Parametric fields and the Pension block
                now sit at the very top, above Annual Withdrawal and the pots, so the fan
                chart sits closer to mid-pane.
              </li>
              <li>
                <strong>Parametric fields stack vertically</strong>, and the Pension block is
                compacted — a narrower Real Increase % slider sharing its row with smaller{" "}
                <strong>Actual Pension / Hypothetical</strong> toggle buttons.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 102 — Naming, captions and Pane 5 layout
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>"Global Equities Pot"</strong> used consistently for that input label
                in Pane 1 and Pane 5; no other usage was altered.
              </li>
              <li>
                <strong>"(after-inflation)" captions</strong> added under Pane 1's Growth and
                Cash Real Return sliders.
              </li>
              <li>
                <strong>Fan chart tooltip and legend</strong> now agree on the dashed line's
                name, and the tooltip shows the active Parametric / Historical mode.
              </li>
              <li>
                <strong>Parametric fields renamed</strong> and grouped in a shared row with
                the Pension block.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 101 — Risk Simulator growth &amp; cash sliders fully independent
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Deliberate design change.</strong> Pane 5's{" "}
                <strong>Assumed Real Growth Rate</strong> and{" "}
                <strong>Cash Real Return</strong> sliders are no longer two-way mirrors of
                Pane 1. They are now fully independent what-if controls that behave exactly
                like Inflation / Escalation: each simply keeps whatever value it was last
                left at, persisted with the pane's own settings, with no seeding from or
                write-back to Pane 1.
              </li>
              <li>
                <strong>No divergence indicator.</strong> Deliberately no "what-if" badge on
                these two sliders — once fully independent, there is nothing to diverge
                from. Pension Real Increase keeps its own seed-then-diverge pattern, and the
                Annual Withdrawal / Equities / Cash Pot override fields keep their existing
                <em> what-if</em> flag and "Reset to actual" links unchanged.
              </li>
              <li>
                <strong>Captions rewritten</strong> in the plain Inflation / Escalation
                style, with no reference to Pane 1.
              </li>
              <li>
                <strong>About these figures</strong> now sits inside the stats row beside
                Ruin rate rather than on its own line.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 100 — Build 099 verified live; stale preview-bundle incident
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>What went wrong.</strong> Every Build 099 change was written to
                disk correctly, but the preview dev server kept serving a{" "}
                <strong>stale transformed copy</strong> of{" "}
                <code>MonteCarloPanel.tsx</code> from its module cache. The browser
                therefore rendered the pre-099 Risk Simulator no matter how hard it was
                refreshed — a client-side hard refresh cannot defeat a server-side stale
                transform. Only the Pane 1 pension relocation appeared, because that change
                lives in <code>SovereignGlidepath.tsx</code>, which was re-transformed
                normally.
              </li>
              <li>
                <strong>Fix.</strong> Dev-server module cache cleared and the server
                restarted. No application code needed re-writing.
              </li>
              <li>
                <strong>Re-verified in the rendered app:</strong> section order is inputs →
                sliders → Defensive Draw Threshold → fan chart → percentile stats →
                Allocation Bias → Future Extraordinary Inflow; the Inflow has an{" "}
                <strong>Destination</strong> Equities/Cash segmented selector (no 50/50
                wording anywhere); <strong>About these figures</strong> sits beside the
                stats panel with the methodology note behind it; the Growth and Cash Real
                Return captions read "Same value as Pane 1 — moving either moves both."
              </li>
              <li>
                <strong>Process change.</strong> Completion is now reported only after
                checking the rendered app, not the written source.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 099 — Pension inputs move to Pane 1; Risk Simulator reordered and
            compacted
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Pension inputs relocated to Pane 1</strong> — Annual Pension,
                Pension Start Age and Pension Real Increase now sit beneath Target Annual
                Base Withdrawal as the single app-wide source. Pane 5 keeps a{" "}
                <strong>Use real pension details</strong> toggle; switch it off to explore
                hypothetical pension figures without touching the real ones.
              </li>
              <li>
                <strong>Pane 5 reordered:</strong> inputs → sliders → Defensive Draw
                Threshold → fan chart → percentile stats → Allocation Bias → Future
                Extraordinary Inflow.
              </li>
              <li>
                <strong>Inflow Destination selector</strong> replaces the old fixed 50/50
                split — send a windfall entirely to Equities or entirely to Cash, matching
                Pane 6's Source button style.
              </li>
              <li>
                <strong>About these figures</strong> button now holds the methodology
                caption, freeing vertical space beneath the stats panel.
              </li>
              <li>
                <strong>Mirrored-slider captions corrected</strong> — Growth and Cash Real
                Return are genuinely two-way bound with Pane 1; the captions now say so.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>

          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 098 — Withdraw-then-grow across every forward projection
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Convention change (deliberate).</strong> Forward projections used{" "}
                <code>End = Start × (1 + r) − Withdrawal</code>. They now use{" "}
                <code>End = (Start − Withdrawal) × (1 + r)</code> — the draw is taken from
                the balance as it is actually known when the decision is made, and only the
                remainder is exposed to that period's return. This matches real retirement
                behaviour and the convention used by most other planning tools.
              </li>
              <li>
                <strong>Locations fixed:</strong> <code>applyPeriod()</code> in{" "}
                <code>drawdown.ts</code> (Monte Carlo, Audit Mode, historical cohorts); the
                Risk Simulator's deterministic dashed-line projection; and Pane 2's
                Comfortable Amortization baseline need, which is now an annuity-due to match
                start-of-year withdrawals.
              </li>
              <li>
                <strong>Why it matters.</strong> On £500k equities / £100k cash drawing
                £6,000 a quarter, the Preservation guardrail used to fire at Q4 (WR 4.8058%).
                It now correctly reads Normal at Q4 (WR 4.7962%) and first fires at Q5
                (WR 5.0144%) — a full quarter of unnecessary −10% cut removed.
              </li>
              <li>
                <strong>No threshold or sourcing change.</strong> Guyton-Klinger trigger
                percentages, Build 089's No-Go gate and Build 090's trailing-drawdown bucket
                sourcing are untouched. Previous Monte Carlo / Audit / backtest figures will
                differ — that is the intended outcome.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 097 — Risk Simulator sliders no longer re-run 10,000 paths per drag pixel
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Performance fix.</strong> Every Risk Simulator control (Expected
                Return, Volatility, Allocation Bias, Cash Real Return, Inflation /
                Escalation, Pension Real Increase, Assumed Growth Rate, Horizon,
                Defensive-Draw Threshold, tick mode and the pot / withdrawal fields) fired
                a full 10,000-path Monte Carlo re-run on <em>every</em> intermediate change
                event. Since Build 080 raised the run count from 2,750 to 10,000 paths,
                that made dragging feel sluggish.
              </li>
              <li>
                The simulation now reads a <strong>180 ms trailing-debounced</strong>
                snapshot of its inputs, so the heavy re-run happens once after the drag
                settles rather than on every pixel of movement.
              </li>
              <li>
                Slider handles and their numeric labels still update instantly during the
                drag — only the chart and percentile stats wait for the debounce. No
                change to the maths or to any result.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>

          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 096 — Exit Edit / New Entry resets the three planning assumptions
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                Follow-up to Build 095. Leaving Edit via{" "}
                <strong>Exit Edit / New Entry</strong> now reliably loads today's current
                global <strong>Assumed Real Growth Rate</strong>,{" "}
                <strong>Cash Real Return</strong> and{" "}
                <strong>Inflation / CPI Assumption</strong> — exactly what a fresh
                new-entry (Cancel) state shows.
              </li>
              <li>
                Growth previously had no global baseline to fall back on: the new-entry
                state re-seeded it from the latest committed row, so if that row was a
                legacy row with nothing stored, the slider could stay stuck at whatever
                was typed mid-edit. Growth is now captured in the new-entry baseline on
                boot and after every commit.
              </li>
              <li>
                <strong>Discard Changes</strong> is unchanged — it stays in Edit and still
                reverts all three fields to the row's own stored values.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>

          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 095 — planning assumptions are now recorded on each ledger row
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                Every newly-committed Normal row now stores its own{" "}
                <strong>Assumed Real Growth Rate</strong>,{" "}
                <strong>Cash Real Return</strong> and{" "}
                <strong>Inflation / CPI Assumption</strong>, alongside the existing
                Withdrawal Recorded split. Editing a row shows what was actually assumed
                when it was committed, not today's slider positions.
              </li>
              <li>
                <strong>Discard Changes</strong> mid-Edit now reverts these three fields
                to the row's own stored values, in line with every other per-row field.
              </li>
              <li>
                Legacy rows committed before this build carry no snapshot. They are{" "}
                <strong>not</strong> backfilled with a guessed value — Edit shows 0% for
                all three plus an amber "assumptions not recorded" note, so it is obvious
                the row needs a manual re-save if you want it corrected.
              </li>
              <li>
                New-entry mode (Cancel) and the live dashboard's real-time calculations
                are unchanged — both still use the current global slider values.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 094 — Fun Bucket before/after always visible in the Hypothetical box
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                The Scenario Stress Test's Hypothetical preview now shows{" "}
                <strong>Fun Bucket Balance: real → hypothetical</strong> whenever the
                Stress slider is off zero, matching how Stressed Equities, Total Capital
                and Drawdown already behave. Previously the real-vs-hypothetical
                comparison only appeared inside the "Directive would change" box, so it
                was hidden at slider values that moved the Fun Bucket without crossing a
                narrative-state boundary.
              </li>
              <li>
                The secondary "Directive would change" box is unchanged — it still appears
                only on an actual state change, with its own Fun Bucket before/after line.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 093 — State Test Presets pin the Period End Date; annualisation guarded
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Root fix.</strong> Every State Test Preset now pins Pane 1's Period
                End Date alongside the other trigger fields — to 90 days (a typical quarterly
                gap) after the most recent real Normal ledger row. Previously the date was
                left wherever it happened to be, so a ledger row dated one day earlier
                produced a 1-day elapsed span and an absurd annualised figure.
              </li>
              <li>
                <strong>Defensive guard.</strong> The annualisation in{" "}
                <code>defensiveRec.ts</code> now refuses to annualise gaps under 14 days,
                showing a clearly-flagged "insufficient elapsed time to annualise" state
                instead, and clamps any surviving result to ±1000% real so no display can
                ever overflow again.
              </li>
              <li>
                <strong>Docs.</strong> The now-redundant "System Directive Testing &amp;
                Verification Cheat Sheet" has been removed from the Quick Start Guide — the
                8 one-click presets replace it.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 092 — the live dashboard now accounts for your State Pension
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Gap closed.</strong> <code>engine.ts</code> had no pension concept at
                all: Panes 2/3 computed the withdrawal rate, guardrail status and Brokerage
                Desk Directive against the raw GROSS Target Annual Base Withdrawal, while the
                Monte Carlo / Audit engines had netted pension off since Build 021. Once a
                pension was in payment the two halves of the app disagreed, and the gap widened
                every year the pension escalated.
              </li>
              <li>
                <strong>Auto-netting, same convention as the simulators.</strong> Once your
                Age ≥ Pension Start Age, <code>calculate()</code> uses{" "}
                <code>max(0, target − pension)</code> — with the pension escalated by the Real
                Annual Increase for each year in payment — as the anchor for the WR ratio,
                guardrail factor, shield target, runway and amortization. Before the start age
                nothing changes: the full gross target is used exactly as before.
              </li>
              <li>
                <strong>One place for the data.</strong> Pension Amount, Start Age and Real
                Annual Increase are now app-wide state owned by the dashboard. The Risk
                Simulator's existing inputs write straight into it, so the two panels are
                physically incapable of drifting apart. Existing values are migrated
                automatically on first load.
              </li>
              <li>
                <strong>Nothing hidden.</strong> Pane 1 shows the gross lifestyle target, the
                pension deducted, and the net figure drawn from the pot side by side, and the
                Pane 3 directive states plainly when pension is factoring into the
                recommendation.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>

            v1.0 build 091 — Guyton-Klinger Prosperity Bonus (+10%) is reachable again
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Fix — the +10% bonus was dead code in the simulators.</strong>{" "}
                <code>applyPeriod()</code> compared the current withdrawal rate against an
                ATH-anchored rate for BOTH guardrail branches. Because the path ATH is a
                running maximum of the total, the opening total can never exceed it, so
                currentWR was always ≥ athWR and the Prosperity branch (which needs
                currentWR 20% BELOW the reference) could never fire — 0 hits across every
                historical cohort and bootstrap run, including strong bull markets.
              </li>
              <li>
                <strong>Two independent references.</strong> Preservation (−10%) still
                compares against the PEAK (ATH) rate — unchanged behaviour. Prosperity
                (+10%) now compares against the plan's BASELINE rate: the withdrawal rate
                implied by the portfolio at plan inception. That reference does not track
                the peak, so a portfolio growing beyond its starting value genuinely drives
                the rate below it.
              </li>
              <li>
                <strong>One shared implementation.</strong> New{" "}
                <code>gkGuardrail(currentWR, athWR, baselineWR, phase)</code> in{" "}
                <code>engine.ts</code> is now the single source of truth; both{" "}
                <code>calculate()</code> (live dashboard) and <code>applyPeriod()</code>{" "}
                (Monte Carlo, Quarterly-tick, Audit Mode) call it. The No-Go gate from
                Build 089 lives inside the helper.
              </li>
              <li>
                <strong>Dashboard — comfort bypass no longer swallows the bonus.</strong>{" "}
                <code>engine.ts</code>'s guardrail was structurally reachable (its ATH is a
                stored, lagging field) but the Comfortable Amortization bypass neutralised
                <em>any</em> guardrail factor — including the bonus, in exactly the
                surplus-rich situation where a bonus is the correct signal. The bypass now
                suppresses reductions only.
              </li>
              <li>
                <strong>Verified.</strong> Synthetic sustained bull (+12% real, £1m start,
                £40k anchor): Prosperity fires from year 5 onward, spend £40,000 → £44,000.
                Bear run (−20% real): Preservation fires in the same years, with the same
                factors, as Build 090.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 090 — simulator no longer "peeks" at the quarter it is deciding for
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Fix — look-ahead bias in the defensive-draw decision.</strong>{" "}
                <code>applyPeriod()</code> decided cash-vs-equities by testing the SAME
                period's realized equity return, information a real investor cannot have at
                the start of the quarter. A year-2000 cohort therefore flagged its very first
                quarter as defensive despite having zero prior history.
              </li>
              <li>
                <strong>How it was fixed.</strong> The decision now uses trailing
                drawdown-off-ATH measured from balances BEFORE the period's return is applied,
                via <code>isDefensiveByTrailingDrawdown()</code> in <code>engine.ts</code> —
                the same phase-aware thresholds (10%/15% Preservation, 20%/25% severe) the live
                dashboard already uses, so both engines read one signal. Strict = severe
                threshold, Standard = Preservation threshold, Aggressive = half Preservation.
              </li>
              <li>
                <strong>Worked check (2000 cohort, quarterly, Standard, age 65).</strong>{" "}
                Q1 trailing drawdown 0.00% → not defensive (previously defensive). Q2–Q4
                (4.4%, 6.1%, 4.9%) normal. Q5 at 10.40% off ATH → defensive, as the trailing
                threshold is genuinely crossed. Q6 (−5% quarter, 14.9% drawdown) is defensive
                under both the old and new signals — unchanged.
              </li>
              <li>
                <strong>Scope.</strong> <code>isDefensive()</code> (return-based) is retained
                only for <code>defensiveRec.ts</code>, where the return tested is a genuinely
                trailing, already-observed return between two committed ledger rows.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>

            v1.0 build 089 — Guyton-Klinger now switches off in No-Go phase inside the simulator
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Fix — simulator applied G-K after age 85.</strong>{" "}
                <code>applyPeriod()</code> in <code>drawdown.ts</code> (the shared step used by
                the Risk Simulator, the quarterly-tick engine and Audit Mode) had no phase
                check, so it kept applying the ±10% Guyton-Klinger guardrail during No-Go
                phase — contradicting <code>engine.ts</code>'s <code>calculate()</code>, which
                has always gated it off, and contradicting the dashboard's own
                "No-Go Amortization … guardrails are switched off" directive. An independent
                test harness running 25 synthetic lifetimes found 244 disagreeing quarters,
                all from this single cause.
              </li>
              <li>
                <strong>How it was fixed.</strong> <code>PeriodInputs</code> gained an optional{" "}
                <code>age</code> field; <code>applyPeriod()</code> imports{" "}
                <code>phaseFor()</code> from <code>engine.ts</code> — the same helper{" "}
                <code>calculate()</code> uses — so "what counts as No-Go" is defined in exactly
                one place and cannot drift. All four simulator call sites (yearly and quarterly,
                Monte Carlo and Audit) now pass the age of the period being advanced.
              </li>
              <li>
                <strong>Scope.</strong> Behaviour in Go-Go and Go-Slow phases is byte-identical
                to Build 088. Worked check at the boundary: with pot £450k against a £1m
                per-path ATH and a £42,000 anchor, age 84 and age 85 both draw £37,800
                (Preservation −10%); age 86 and age 90 draw the full £42,000 (Normal). A
                Prosperity case draws £46,200 at ages 70 and 85 and £42,000 at age 86.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 088 — Canonical directive-state registry: one source of truth for banner, footnote and docs
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>New — <code>DIRECTIVE_STATES</code> registry in{" "}
                <code>engine.ts</code>.</strong> Every state the engine can emit is now
                declared once, together with its banner headline and whether it locks the
                withdrawal source (and to which bucket). The ten canonical states are:
                Peak Refill, Recovery Wave Refill, Refilling Shield, Reverse-Shielding,
                Shield Deficit, Exhaustion, Preservation (seven locking) and Normal Draw,
                Comfortable Amortization, No-Go Amortization (three non-locking).{" "}
                <code>LOCKING_STATES</code>, <code>NON_LOCKING_STATES</code>,{" "}
                <code>isLockingState()</code> and <code>lockingBucketFor()</code> are all
                derived from that one table, and Pane 3 now imports them instead of keeping
                its own duplicated copies. A future rename is a one-place edit.
              </li>
              <li>
                <strong>Fix — banner vs. footnote naming mismatch.</strong> Three states
                rendered a headline that differed from their canonical name
                (Preservation → "Freeze Equities — Draw from Cash", Refilling Shield →
                "Normal Draw — Shield Below Target", Exhaustion → "Shield Deficit /
                Exhaustion"), so the banner and the footnote beneath it appeared to name two
                different "current states". The banner now prints the canonical state name
                under the headline whenever the two differ.
              </li>
              <li>
                <strong>Fix — Guyton-Klinger shown as an overlay, not a state.</strong>{" "}
                When a ±10% G-K adjustment is live, both the banner sub-line and the Pane 3
                footnote now say so explicitly (e.g. "State: Preservation · G-K Preservation
                overlay (−10%)"), instead of the banner naming the base directive while the
                footnote named the overlay.
              </li>
              <li>
                <strong>Audit result — "Refilling Shield" is real, not a stray.</strong>{" "}
                It is emitted when drawdown is below the phase threshold, the shield is below
                target, and momentum is not ascending (and drawdown ≥ 2%). It was invisible
                because its headline read "Normal Draw — Shield Below Target". It has been
                kept and documented rather than removed.
              </li>
              <li>
                <strong>Docs — manual directive table rebuilt.</strong> Chapter 8 now lists
                all ten canonical states with their locking bucket and their banner headline,
                and states plainly that Preservation/Prosperity G-K banners are overlays.
                Comfortable Amortization was previously missing entirely.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 087 — Narrative-override precedence: visible strikethrough + Commit-form auto-seed fix
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Data-integrity fix (Commit form auto-seed):</strong>{" "}
                When a locking narrative (Peak Refill, Recovery Wave Refill,
                Refilling Shield, Reverse-Shielding, Preservation, Shield
                Deficit, Exhaustion) forces a funding source that differs
                from the selected Defensive-Draw Mode's default, the Pane 1
                "Withdrawal Recorded" Equities/Cash split now auto-seeds
                from the narrative's actual instruction — not the mode's raw
                default. Previously the split could pre-fill against the
                visible directive, risking a mis-recorded source at commit.
              </li>
              <li>
                <strong>Display fix (Pane 3 mode-line override marker):</strong>{" "}
                In the Actionable Brokerage Desk Directives panel, when a
                locking narrative overrides a Strict/Standard/Aggressive
                mode's default bucket recommendation, that mode's
                "Draw from …" text is now rendered with strikethrough and
                an inline amber "(overridden — see narrative)" flag, so the
                contradiction is visible at the mode-line rather than only
                resolvable via the footnote. Non-overridden mode-lines
                display exactly as before.
              </li>
              <li>
                <strong>Single source of truth:</strong>{" "}
                Both the mode-line marker and the Commit-form auto-seed now
                read from one resolved <code>effectiveBucket</code> derived
                from the same <code>directive.guardrailText</code> that
                renders the narrative banner, via a new{" "}
                <code>lockingBucketFor()</code> helper in{" "}
                <code>engine.ts</code>. The Strict/Standard/Aggressive
                segmented buttons themselves are visually unchanged.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 086 — Cancel/Discard/Exit revert coverage for Cash Real Return, Inflation, Legacy Target, Currency
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Cancel (new-entry mode) revert coverage:</strong>{" "}
                Added a boot-seeded, per-commit-refreshed app-wide baseline
                snapshot so plain <em>Cancel</em> now correctly reverts
                Cash Real Return, Inflation / CPI Assumption, Legacy Target,
                and Currency alongside Assumed Real Growth Rate — previously
                only Growth reverted.
              </li>
              <li>
                <strong>Discard / Exit Edit revert coverage:</strong>{" "}
                Extended the mid-Edit snapshot (Build 085's{" "}
                <code>preEditSlidersRef</code>) to also capture Legacy Target
                and Currency, so <em>Discard Changes</em> and{" "}
                <em>Exit Edit / New Entry</em> revert all four app-wide
                fields, not just the two sliders originally fixed.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 085 — Cancel/split-toggle fix + all-three-slider revert + purple State Test Presets
          </h2>

          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Bug fix (State Test Presets contamination):</strong>{" "}
                Double-clicking the Pane 2 header to hide the State Test Presets panel
                now automatically reverts Pane 1 to the real committed state (same as
                clicking <em>Cancel</em>), so leftover preset values can't silently
                contaminate a subsequent commit.
              </li>
              <li>
                <strong>New button (Exit Edit / New Entry):</strong>{" "}
                While mid-Edit, Pane 1 now shows three buttons — <em>Update Entry</em>,{" "}
                <em>Discard Changes</em> (unchanged: reverts typed values, stays in
                Edit), and the new <em>Exit Edit / New Entry</em> which fully exits
                Edit mode and loads Pane 1 with the fresh new-entry state. Outside
                Edit mode the layout is unchanged (primary + <em>Cancel</em>).
              </li>
              <li>
                <strong>Styling (blue app-consistent buttons):</strong>{" "}
                <em>Cancel</em>, <em>Discard Changes</em>, <em>Exit Edit / New Entry</em>,
                and every button in the State Test Presets panel now use the app's
                standard blue button styling (matching <em>Commit Entry to Ledger</em>{" "}
                and the Strict/Standard/Aggressive segmented buttons) instead of the
                ghost/outline treatment they previously shipped with.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 082 — Decoupled stress test + independent inflation + Pane 1 revert + dynamic locking-state advisory
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Bug fix (Scenario Stress Test slider, high priority):</strong>{" "}
                Moving the Pane 2 "Simulated Drop" slider no longer overwrites Pane 1's real
                Equities / Cash / Total Capital figures, nor does it contaminate the Pane 3
                directive, the Fun Bucket, or "Can I Afford This?". The main <code>calc</code>{" "}
                and the directive now hardcode <code>stressPct: 0</code>; a separate{" "}
                <code>stressCalc</code> renders a dashed{" "}
                <em>"HYPOTHETICAL — X% equities drop"</em> preview{" "}
                <strong>inside the stress box only</strong>, with a one-click{" "}
                <em>"Return to baseline (0%)"</em> link when the slider is off zero.
              </li>
              <li>
                <strong>Bug fix (inflation assumption drift, high priority):</strong>{" "}
                The Pane 3 directive's annualised-real deflation is now driven by an{" "}
                <strong>independent Pane 1 slider</strong> — "Inflation / CPI Assumption",
                positioned directly under Cash Real Return. The Risk Simulator's own
                Inflation / Escalation slider remains local to that panel. First-load seed:
                persisted app setting → legacy <code>shd_mc_v1</code> → 2.5%; once either
                slider moves they diverge freely. The Pane 3 advisory line now reads
                "…from Pane 1's independent CPI assumption" to make the source explicit.
              </li>
              <li>
                <strong>Bug fix (locking-state advisory drift):</strong>{" "}
                The advisory sentence under the directive banner no longer hardcodes the
                stale 3-item list "Peak Refill, Reverse-Shielding, Shield Deficit". It now
                derives from a single <code>NON_LOCKING_STATES</code> table (Normal Draw,
                Comfortable Amortization, No-Go Amortization are the only non-locking
                states) and lists the locking states. <em>Correction (Build 088): this entry
                originally said "six locking states" — the engine emits <strong>seven</strong>
                (Peak Refill, Recovery Wave Refill, Refilling Shield, Reverse-Shielding,
                Preservation, Shield Deficit, Exhaustion). The list rendered in the app was
                always correct; only this changelog wording was wrong.</em> It also spells out the current
                state and whether it is locking or advisory — so State Test Preset 4
                (Freeze Equities) is immediately visible in the list.
              </li>
              <li>
                <strong>New — Cancel / Discard Changes button on Pane 1.</strong>{" "}
                A secondary revert button now sits alongside the primary Commit / Update
                button in a 75 / 25 grid. Label switches contextually:{" "}
                <strong>Cancel</strong> (new-entry mode — reverts every Pane 1 field to
                the most recently committed Normal ledger entry) or{" "}
                <strong>Discard Changes</strong> (mid-Edit — reverts to that specific
                row's stored values). Distinct from the existing "Reset split" button,
                which only clears the two withdrawal-split inputs.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 081 — Non-locking directive banner bucket fix + preset pinning + presets moved to Pane 2
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Bug fix (banner text hardcoded "Equities", high priority):</strong>{" "}
                For non-locking states (Normal Draw, Comfortable Amortization,
                No-Go Amortization) the Pane 3 banner action text now reflects
                the currently-selected Defensive-Draw Mode's bucket instead of
                always saying "Sell from Global Equities". Locking states
                (Peak Refill, Recovery Wave, Refilling Shield, Reverse-Shielding,
                Freeze Equities, Shield Deficit) still dictate their own bucket.
                Root cause: <code>generateDirectives()</code> hardcoded equities
                wording in every branch; the mode selector only fed the advisory
                line and split-field auto-seed, so the three lines could disagree
                on the same screen. Fix: <code>generateDirectives()</code> now
                takes an optional <code>bucketOverride</code>, applied to the
                three non-locking branches only.
              </li>
              <li>
                <strong>Split-field stale value fix:</strong> Applying a State
                Test Preset (or otherwise moving between test scenarios) now
                re-arms the withdrawal-split auto-seed, so the "Withdrawn from
                Equities / Cash" fields always reflect the CURRENT state's
                recommendation rather than a leftover value from a previous
                preset. Root cause: <code>wdSplitTouched</code> latched once set
                and was never cleared when inputs were re-populated
                programmatically.
              </li>
              <li>
                <strong>State Test Presets now pin every trigger field.</strong>{" "}
                Each of the eight presets explicitly sets age, capping age,
                equities, cash, ATH, target withdrawal, stress, cash-shield
                months, Legacy Target, and assumed real growth — so state no
                longer depends on whatever a previous test left behind. Presets
                1 (Normal Draw), 3 (Reverse-Shielding), and 6 (G-K Prosperity)
                also had their recipe values corrected — the previous values
                landed on Peak Refill, Freeze Equities, and Comfortable
                Amortization respectively.
              </li>
              <li>
                <strong>State Test Presets moved to Pane 2.</strong> Hidden by
                default, toggled via double-click on the "2. Intelligence
                Diagnostics" header — matching Audit Mode's existing
                double-click-to-toggle pattern.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 080 — Risk Simulator iteration count raised to 10,000
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Monte Carlo runs: 2,750 → 10,000.</strong> Applies to
                every combination of Historical / Parametric × Yearly-tick /
                Quarterly-tick. Pure sample-size change — no changes to
                withdrawal timing, growth-then-draw convention, defensive-draw
                thresholds, Guyton-Klinger logic, cash-drag treatment, or any
                other calculation. Percentile bands (p5 / p10 / p50 / p90 /
                p95) become noticeably steadier between refreshes.
              </li>
              <li>
                <strong>Docs updated.</strong> "How to read this panel" caption,
                Help / Quick Start Guide, and the full manual now all quote
                10,000 paths instead of 2,750.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 079 — Directive banner restored to full state machine + per-row status snapshot + State Test Presets
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Bug fix (Directive banner regression, high priority).</strong>{" "}
                Reverted the Build 078 two-state banner. Pane 3 now always
                renders the full narrative from <code>generateDirectives()</code>,
                restoring all eight documented states — Peak Refill, Recovery
                Wave, Reverse-Shielding, Comfortable Amortization, Normal Draw,
                G-K Preservation (−10%), G-K Prosperity (+10%), No-Go
                Amortization, and Shield Deficit / Exhaustion. Root cause of
                the regression: the mode-reactive banner was written as a
                REPLACEMENT for <code>directive.html</code>, so whenever a
                prior Normal row existed the banner collapsed to a two-state
                view and silently dropped every richer narrative Pane 2 was
                still correctly computing. Fix: Pane 3 = Pane 2 by
                construction now (both driven by <code>directive.guardrailText</code>);
                the Defensive-Draw Mode composes on top as an advisory
                beneath the banner and via the split-field auto-seed at
                commit time — it never overrides the narrative.
              </li>
              <li>
                <strong>Pane 2 state snapshot on every ledger row.</strong>{" "}
                Every Normal row now stores <code>guardrailStatus</code>{" "}
                (Withdrawal Status) at commit time alongside the existing{" "}
                <code>rule</code> (Guardrail State). Both surface as small
                badges next to Age / Phase / Horizon on the ledger table, and
                as two dedicated columns (<code>Withdrawal Status</code>,{" "}
                <code>Guardrail State</code>) in the CSV export.
              </li>
              <li>
                <strong>State Test Presets (QA aid).</strong> New collapsible
                panel above the Commit button with eight one-click buttons —
                one for each documented cheat-sheet recipe. Populates Pane 1
                without committing; shows a before/after diff and the state
                Pane 2/3 should now reflect.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 078 — Mode-reactive directive banner + per-row Horizon Age in CSV
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Bug fix (high priority — banner did not follow mode selection).</strong>{" "}
                The large coloured banner in the Actionable Brokerage Desk
                Directives pane is now driven by the currently-selected
                Defensive-Draw Mode's actual recommendation. Previously it could
                read "NORMAL DRAW FROM EQUITIES — Sell £X from Global Equities"
                even when the small three-way comparison line and the entry-form
                split fields both correctly showed "Draw from Cash" for the
                selected mode. Root cause: the banner rendered{" "}
                <code>directive.html</code> from{" "}
                <code>generateDirectives()</code>, which branches purely on
                drawdown%, runway, and Guyton-Klinger factor — it knows nothing
                about the mode selector introduced in Build 076. Fix: when a
                prior Normal row exists to anchor a comparison, the banner now
                renders in the same <code>directive-box</code> styles (green
                "Normal Draw from Equities" for equity recommendations, amber
                "Freeze Equities — Draw from Cash" for cash recommendations),
                with £ amount and bucket matching what the split fields
                auto-seed. When no prior row exists, we fall back to the
                original directive.html so the richer narrative states (Peak
                Refill, Recovery Wave, Reverse-Shielding, Comfortable
                Amortization, Shield Deficit) still render on fresh ledgers.
                The small three-way comparison line is unchanged.
              </li>
              <li>
                <strong>CSV export — per-row Horizon Age column.</strong> The
                main Historical Timeline Ledger CSV now includes a{" "}
                <code>Horizon Age</code> column immediately after{" "}
                <code>Age</code>, sourced from each row's own stored{" "}
                <code>cappingAge</code> at commit time. The metadata header's
                global <code>Target Horizon Age</code> line is retained for the
                current live setting.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>

          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 077 — Defensive Draw elapsed-days fix + nominal return + horizon on ledger
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Bug fix (high priority):</strong> When editing an
                existing Normal row, the Defensive Draw directive's elapsed-days
                calculation now anchors to the <em>row's own stored Period End
                Date</em>, not the date-picker state (which in some code paths
                held today's date instead). Symptom before fix: editing a row
                dated 2026-09-30 with a prior row dated 2026-06-30 (true 92-day
                gap) reported "annualised over ~18 days". New entries still use
                the picker state (which defaults to today — correct for that
                case).
              </li>
              <li>
                <strong>Nominal return now shown</strong> alongside the
                annualised real figure — e.g. "Nominal +0.09% this period ·
                Annualised real −2.08% over 92 days". Gives grounding context
                so the annualised figure isn't misread as the actual
                single-period move.
              </li>
              <li>
                <strong>Horizon / Capping Age visible on ledger rows.</strong>{" "}
                Each row now shows the horizon age in effect when it was
                committed, next to the Age/Phase badge — previously only
                visible by opening Edit.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 076 — Three-way Defensive Draw directive on Pane 3
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Defensive Draw Mode segmented control</strong>{" "}
                (Strict / Standard / Aggressive, default Standard) added to the
                Actionable Brokerage Desk Directives pane. Only affects which
                <em> bucket</em> is recommended to fund this quarter's
                withdrawal — the Guyton-Klinger ±10% withdrawal amount is
                untouched.
              </li>
              <li>
                <strong>All three modes shown at once</strong> so you can see
                where they agree or disagree at a glance. Cash recommendations
                render amber, equity recommendations green; the currently
                selected mode is bold and underlined.
              </li>
              <li>
                <strong>Realised return, annualised over actual elapsed days.</strong>{" "}
                Anchors to the most recent Normal ledger row by <em>Period End
                Date</em> (not Age, not label), deflates the nominal return
                using the app's existing inflation assumption, annualises with{" "}
                <code>(1 + r)^(365.25 / days) − 1</code>, and compares against
                the same annual hurdles that <code>isDefensive()</code> already
                uses in Yearly-tick and Audit Mode. No parallel threshold
                logic was added.
              </li>
              <li>
                <strong>Inflation source:</strong> reuses the Risk Simulator's
                persisted <code>inflationPct</code> (2.5% default).
              </li>
              <li>
                <strong>Auto-fills the entry form.</strong> Selecting a mode
                populates the Withdrawn from Equities / Cash fields (and a
                Rebalance Move if cash is under target and equities can
                spare it). Manual edits still win — touch a field and the
                auto-seed backs off.
              </li>
              <li>
                <strong>Safe defaults for edge cases.</strong> First-ever
                Normal row, previous row missing a date, same-or-earlier
                date, or a zero prior equities balance → all three modes
                show "Draw from Equities — no prior quarter to compare
                against". Comparisons spanning &gt; 730 days display an
                amber long-gap warning.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 075 — CSV UTF-8 BOM for Excel compatibility
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Fix:</strong> Prepended a UTF-8 byte-order-mark
                (<code>\uFEFF</code>) to CSV exports so Excel on Windows renders
                <code> £</code>, <code>—</code> and other non-ASCII characters
                correctly instead of mojibake. Applied once in the shared
                <code> exportLedgerCSV()</code> helper, so both Audit Mode and
                the Historical Ledger export are fixed by the single change.
                No columns, ordering or filename behaviour changed.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 074 — Live Period End Date banner + per-row idempotent migration
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Migration is per-row idempotent</strong> and now also runs on
                Restore, not only at first bootstrap. Restoring an older backup
                auto-heals missing Period End Dates from the free-text label wherever
                they can be parsed, instead of leaving every restored row flagged.
              </li>
              <li>
                <strong>Ledger date-health banner is live.</strong> Recomputed from
                the current ledger on every render — reads "N of M ledger rows
                currently lack a Period End Date", or hides entirely when all rows are
                dated. Replaces the old one-shot summary that grew stale after
                restores.
              </li>
              <li>
                <strong>Bug 1 (Edit form withdrawal split) — investigated, not
                reproduced.</strong> Build 070+ rows load their own stored Eq/Cash
                split via <code>editEntry</code>; legacy rows without a stored split
                intentionally fall through to the live auto-seed because there is
                nothing historical to preserve.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 073 — Period End Date (real date for chronological ordering)
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>New Period End Date field</strong> on Normal-row entries — a real{" "}
                <code>&lt;input type="date"&gt;</code> alongside (not replacing) the
                free-text “Reporting Period” label. Label stays cosmetic; the date is
                the single source of truth for chronological ordering.
              </li>
              <li>
                <strong>Default = today.</strong> Auto-Label now refreshes both the
                label and the date together. Manually override the date for
                back-fills.
              </li>
              <li>
                <strong>Sort key.</strong> On-screen ledger display and the CSV
                export now sort by real date (event rows keep their existing{" "}
                <code>eventDate</code>). Age is no longer used as a chronological
                proxy anywhere.
              </li>
              <li>
                <strong>CSV export:</strong> new{" "}
                <code>Period End Date</code> column in ISO format, positioned next
                to <code>Reporting Period</code>.
              </li>
              <li>
                <strong>Legacy migration.</strong> Rows whose label cleanly matches{" "}
                <code>Q&lt;n&gt; YYYY</code> are auto-dated to that quarter’s last
                day. Anything else is left blank rather than guessed and shows a
                small amber <code>⚠ date not set</code> badge until the user
                fixes it via Edit. A summary banner above the ledger reports the
                migration counts.
              </li>
              <li>
                <strong>Special Withdrawal and Windfall rows unchanged</strong> —
                they continue to use their existing <code>eventDate</code> field.
              </li>
              <li>
                <strong>Duplicate dates allowed</strong> — same-date rows are
                accepted; the sort is stable. Same-date handling logic is
                deferred to a later phase.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 072 — Historical Ledger CSV export
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>New “Download Ledger (CSV)” button</strong> in the
                Pane 7 Historical Timeline Ledger header, next to{" "}
                <em>Wipe Records</em>. Styled as a primary action (filled
                accent + ⬇ glyph), matching the Audit Mode CSV button.
              </li>
              <li>
                <strong>Reuses the shared exporter.</strong> Wired through the
                same <code>exportLedgerCSV()</code> helper the Audit Mode
                export uses — no second implementation. The helper now
                accepts a plain <code>{"{ filename }"}</code> override so the
                ledger export can use its own naming convention.
              </li>
              <li>
                <strong>Full ledger, chronological order.</strong> Every row
                is exported, sorted by age ascending so back-filled entries
                land in true chronological order regardless of on-screen
                display order (which is newest-first).
              </li>
              <li>
                <strong>Legacy and event rows handled correctly.</strong>{" "}
                Rows committed before Build 070 show blanks — not zeros — in
                the Withdrawn from Equities/Cash and Rebalance columns.
                Special Withdrawal and Windfall rows carry their single
                amount in a dedicated <em>Event Amount</em> column.
              </li>
              <li>
                <strong>Self-documenting file.</strong> Filename is{" "}
                <code>sovereign-ledger_{"{YYYYMMDD-HHmm}"}.csv</code>{" "}
                (deliberately distinct from the Audit Mode{" "}
                <code>sovereign-audit_*</code> pattern). Commented header
                lines record the export timestamp, row count, Target Horizon
                Age, Assumed Growth Rate, Cash Buffer Target, Annual Target
                Withdrawal, and currency.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 071 — Phase 1 tidy-up (defaults, control styling, CSV prominence)
          </h2>

          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Withdrawal split default swapped.</strong> The entry
                form now auto-fills the full Request into{" "}
                <em>Withdrawn from Equities</em> (was Cash), with{" "}
                <em>Withdrawn from Cash</em> defaulting to £0. Manual override
                still works as before; Rebalance Move is unaffected. Follow-up
                noted: these should eventually auto-populate based on the
                recommended defensive-draw directive rather than a fixed
                default.
              </li>
              <li>
                <strong>Rebalance Move restyled.</strong> Replaced the native{" "}
                <code>&lt;select&gt;</code> dropdown (which rendered
                white-on-white against the dark theme) with a three-button
                segmented control matching the Strict / Standard / Aggressive
                threshold buttons: <em>None</em> · <em>Equities → Cash</em> ·{" "}
                <em>Cash → Equities</em>. Adjacent £ amount field unchanged.
              </li>
              <li>
                <strong>Audit Mode CSV export promoted.</strong> The
                “Download Ledger (CSV)” button in the Audit Ledger header is
                now a filled primary-accent button with a ⬇ glyph, so it
                reads as the section's primary action rather than blending
                into the surrounding text.
              </li>
              <li>
                <strong>Scope:</strong> UI/UX only — no schema, validation,
                ledger logic, or engine maths changed in this pass.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 070 — Ledger bucket-split (Phase 1)
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Withdrawal Recorded split into three fields.</strong>
                Normal quarterly ledger entries now capture{" "}
                <em>Withdrawn from Equities</em>, <em>Withdrawn from Cash</em>,
                and an optional <em>Rebalance Move</em> (None / Eq → Cash /
                Cash → Eq, plus £ amount). Defaults preserve prior behaviour
                (full Request → Cash, £0 → Equities). Sum-mismatch surfaces an
                inline amber warning but does not block commit.
              </li>
              <li>
                <strong>Available everywhere it matters.</strong> New fields
                appear on the entry form, in the pre-commit confirmation
                dialog, and on the past-row Edit control — so correcting a
                total via Edit lets the bucket split be corrected in the same
                pass.
              </li>
              <li>
                <strong>Special Withdrawal &amp; Windfall rows unchanged.</strong>
                Event rows continue to record a single amount; the split only
                applies to Normal quarterly drawdown rows. A new{" "}
                <code>entryKind</code> discriminator (<code>normal</code> /{" "}
                <code>special_withdrawal</code> / <code>windfall</code>) is
                written to every Build 070+ row so downstream logic can tell
                types apart without parsing labels.
              </li>
              <li>
                <strong>Legacy rows.</strong> Rows committed before Build 070
                have no split data; they render as before with a{" "}
                <em>“source not recorded”</em> caption rather than defaulting
                to a fake £0/£0 split.
              </li>
              <li>
                <strong>Ledger CSV export.</strong> The main Historical Ledger
                does not currently have a CSV export (only an encrypted
                password-protected backup); no CSV columns to update. The
                Audit-Mode CSV export is a separate feature and is unchanged
                by this build. A “snapshot my ledger to CSV” export can be
                added in a follow-up using the same generic exporter that
                Audit Mode uses.
              </li>
              <li>
                <strong>Phase 1 scope.</strong> No simulation-engine changes.
                The three-way defensive-draw directive that will consume these
                fields lands in a follow-up pass.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 069 — Threshold period-basis fix + boundary rounding
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Fixed Standard ≡ Aggressive collision in Parametric +
                Quarterly.</strong> Root cause: the defensive hurdles are
                declared annually, but the quarterly-tick engine was passing a
                quarterly real return (~1.08% at 7%/2.5%) straight into the
                comparison against the annual hurdles (Standard ½·detRReal ≈
                2.20%, Aggressive detRReal ≈ 4.39%), so every quarter tripped
                both hurdles and the two modes emitted byte-identical ledgers.{" "}
                <code>applyPeriod()</code> now takes a <code>periodsPerYear</code>
                argument (1 yearly, 4 quarterly) and prorates each hurdle to its
                per-period equivalent — <code>(1 + hurdleAnnual)^(1/N) − 1</code>
                — before comparing.
              </li>
              <li>
                <strong>Boundary rounding.</strong> A flat parametric return
                sitting exactly on a hurdle (e.g. Aggressive == Assumed Growth
                Rate) could flip on/off between ticks due to 10th-decimal fp
                noise from the quartic root. Both sides of the comparison are
                now rounded to 4&nbsp;dp, so equal-to-hurdle deterministically
                counts as <em>not</em> defensive across ticks.
              </li>
              <li>
                <strong>Historical + Yearly, Strict ≡ Standard is data-driven,
                not a bug.</strong> With the audit's deterministic window (30
                years from 1973) every nominal return either sits below −2.6%
                or above +4.75%, so no year lands in the [−5%, +2.20%] real
                band where Strict and Standard would classify differently. Both
                modes therefore route every year to the same bucket. Standard
                vs. Aggressive still differ on the +6% nominal year (+3.4%
                real).
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 068 — Audit Ledger CSV export
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Download Ledger (CSV)</strong> button added next to the
                Audit Ledger header. Exports every generated row (all 30 yearly
                or all 120 quarterly), every column shown on screen, plus a
                self-documenting <code>#</code>-commented metadata header with
                starting Equity, starting Cash, annual withdrawal, pension amount
                and start age, inflation, cash real return, and — depending on
                mode — the parametric mean or the historical bootstrap start
                year (1973).
              </li>
              <li>
                Filename is built from the active run settings, e.g.{" "}
                <code>sovereign-audit_historical_quarterly_aggressive_age55-85_20260713-1042.csv</code>.
              </li>
              <li>
                Exporter is a generic utility (<code>exportLedgerCSV</code>) so
                a "snapshot current simulation" button can be wired into the
                live pane later without rewriting anything.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 066 — Yearly-tick defensive fix, Standard hurdle recalibration, audit banner
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Yearly-tick defensive routing fixed.</strong> The
                yearly engine loop already used the shared <code>defensiveFor()</code>
                predicate, but Standard mode was silently identical to Strict
                because both fired only on outright negatives. Standard now has
                its own distinct middle hurdle — <em>real return &lt; half the
                deterministic hurdle</em> — so weak-positive years (e.g. Y6 at
                +3.41% nominal / ~+0.89% real) correctly source from Cash under
                Standard while still leaving them alone under Strict.
              </li>
              <li>
                <strong>Threshold recap.</strong> Strict: real Eq return &lt; −5%.
                Standard: real Eq return &lt; ½ × detRReal (≈ +2.2% at the
                default 7%/2.5% params). Aggressive: real Eq return &lt; detRReal
                (≈ +4.4%). Applied identically across yearly-tick, quarterly-tick
                and Audit Mode.
              </li>
              <li>
                <strong>Audit banner age.</strong> The "AUDIT MODE ACTIVE" banner
                now reads "Age 55 → 85" (was still saying 64 → 85 after the
                Build 065 default change).
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 065 — Inflow pane relocated, audit defensive routing, layout polish
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Audit Mode now honours the Defensive Draw Threshold.</strong>{" "}
                Each step checks the real Eq Ret % and, when it falls under the
                selected threshold, sources the full withdrawal from Cash rather
                than Equities (overflow spills to the other pot if the source runs
                dry). The Defensive % readout is wired to Audit Mode too.
              </li>
              <li>
                <strong>Audit Mode default start age moved 64 → 55.</strong> Yearly
                tick now shows all 30 years (Age 55 → 85); quarterly tick shows
                the full 120 rows. Both share the same 380px scrollable container.
              </li>
              <li>
                <strong>Extraordinary Inflow relocated.</strong> Removed from
                Pane 1. Now lives as its own pane directly below "Can I Afford
                This?" with a solid blue prominent action button matching
                "Commit Entry to Ledger". The Blended 50/50 destination is gone
                — only Equities or Cash.
              </li>
              <li>
                <strong>Direct ledger commit.</strong> "Add Inflow &amp; Re-anchor
                ATH" now writes a purple ★ EVENT: Windfall Inflow row straight
                into the Historical Timeline Ledger — positive +£ amount, updated
                pot balance, and the new ATH baseline. Toast copy ends at the
                ATH re-anchor confirmation.
              </li>
              <li>
                <strong>Slider re-label.</strong> "Assumed Real Growth Rate
                (After Inflation)" → <em>"Assumed Real Growth Rate"</em> in both
                Pane 1 and the Risk Simulator.
              </li>
              <li>
                <strong>Layout polish.</strong> Future Extraordinary Inflow panel
                moved below Allocation Bias. Allocation Bias title promoted to a
                bold pane-level heading. Amount helper text updated to "Property
                sale, inheritance, etc. Injected as a flat amount in today's
                purchasing power (no inflation scaling applied)."
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 064 — Draw-mode overhaul, deterministic-line fix &amp; windfalls
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Defensive-draw modes actually differ.</strong> The
                Strict / Standard / Aggressive toggle now keys off the REAL
                equity return, not a compound nominal band that used to
                collapse into the same bucket. Strict = cash only when real
                equity return &lt; −5% (crash year). Standard = cash whenever
                the real equity return is negative. Aggressive = cash by
                default unless the real equity return is cleanly above the
                deterministic hurdle. Overflow spill-over kept: if the primary
                pot hits £0 the remainder is drawn from the secondary pot.
              </li>
              <li>
                <strong>Deterministic dashed line reconciled.</strong> The
                smooth "Assumed Growth" projection is no longer forced into
                the defensive branch when the Standard / Aggressive thresholds
                sit above the smooth hurdle. Under smooth positive parameters
                the dashed line now tracks or sits slightly above the median
                stochastic path — the previous ~2× low reading is gone.
              </li>
              <li>
                <strong>Slider re-label.</strong> "Assumed Growth Rate" is now
                <em>"Assumed Real Growth Rate (After Inflation)"</em> in both
                Pane 1 and the Risk Simulator so the baseline projection matches
                the real-terms nature of the rest of the app.
              </li>
              <li>
                <strong>Future Extraordinary Inflow (Risk Simulator).</strong>{" "}
                Two new fields — Amount ({`£/€/$`}) and Timeline (years from
                now) — inject a real-terms windfall into the sim at end of
                year N (blended 50/50 into both buckets). The lump lifts total
                capital, drops the Realised Withdrawal Rate, and re-anchors
                the per-path ATH so downstream guardrails treat it as a new
                peak.
              </li>
              <li>
                <strong>Extraordinary Inflow (left panel, immediate).</strong>{" "}
                Beneath "Commit Entry to Ledger" a new block records a
                current-quarter windfall. Choose destination (100% Equities,
                100% Cash, or blended), click <em>Add Inflow &amp; Re-anchor
                ATH</em>, and the pot totals rise and the Stored ATH Baseline
                steps up to the new peak so Guyton-Klinger guardrails re-align.
              </li>
              <li>
                <strong>Directive Testing Cheat Sheet</strong> added to the
                Quick Start Guide (Documentation tab) — a compact recipe table
                for triggering every directive state (Green / Blue / Amber /
                Purple / Red) with worked example inputs.
              </li>
            </ul>
          </div>
        </div>


        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 063 — Audit Mode calibration &amp; chart alignment
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>Eq Ret % now shows the real return actually applied; manual arithmetic reconciles to End Eq to the penny.</li>
              <li>Flat-real pension offset in Audit Mode — no more compounding of the £12,700 by 2.5%/yr.</li>
              <li>Chart X-axis honours the Audit starting age (64 → 85).</li>
              <li>Slider re-label — "Yearly Withdrawal Increase Rate %" → "Inflation / Escalation %".</li>
              <li>Scrollable audit ledger — 380 px capped scrolling container.</li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>

          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 062 — Withdrawal-recorded field &amp; Audit Mode
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Withdrawal Recorded field (Pane 1).</strong> New editable
                money input, auto-seeded from the guardrail-adjusted Request. The
                actual £ that left the pot each quarter is now stored on the
                ledger row and shown in the timeline table in place of the old
                "Drawdown Income" figure.
              </li>
              <li>
                <strong>Withdrawal-history bar removed.</strong> Replaced by the
                explicit per-row record above — richer signal, less chart clutter.
              </li>
              <li>
                <strong>Audit Mode (hidden).</strong> Double-click the "5. Risk
                Simulator — Monte Carlo Fan Chart" header to freeze the RNG and
                run a single deterministic path with canonical inputs (Age 64→85,
                {" £610k / £90k / £36k, Pension £12,700 @ 67, +7% flat equity or "}
                historical from 1973). A step-by-step ledger (2 dp) is rendered
                below the chart for pocket-calculator reproduction. Double-click
                again to restore the full 2,750-run engine.
              </li>
              <li>
                <strong>Engine.</strong> Quarterly-tick G-K now anchors target WR
                to the per-path All-Time-High rather than the starting pot, so
                the reduction / prosperity bands mirror how the live app
                actually reasons about drawdowns.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 061 — Quarterly-tick simulator &amp; withdrawal-history bar
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>Quarterly/Yearly tick toggle in the Risk Simulator.</li>
              <li>Withdrawal-history stacked bar under the trend chart (removed in 062).</li>
              <li>Allocation-bias slider labels corrected.</li>
              <li>Quick Start Guide renamed, Full Manual bumped to Edition XI.</li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>

          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 060 — Commit-confirmation modal &amp; alignment polish
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Commit-confirmation modal.</strong> Every ledger commit now pops a review
                dialog first — label, age/phase, both pots, total, ATH (flagged if it's being
                raised), drawdown, target draw + WR, legacy target, cash-buffer target, growth
                rate, and current directive. Cancel returns you to Pane 1 unchanged.
              </li>
              <li>
                <strong>Pane 1 alignment.</strong> Cash Buffer / Legacy Target / Currency labels
                now fit on a single line each; grid tightened so all three fields align.
              </li>
              <li>
                <strong>Pane 5 alignment.</strong> Pension Start Age column narrowed so the row of
                sliders (Yearly Withdrawal Increase / Assumed Growth / Cash Real Return / Pension
                Real Increase) gets more room and lines up cleanly.
              </li>
              <li>
                <strong>Pane 6 wording.</strong> "Nothing is committed" removed — replaced with a
                two-line explanation that the calculator is hypothetical by default but can be
                committed as a Special Event.
              </li>
              <li>
                <strong>Docs sync.</strong> Quick Start Guide and Full Manual updated with sections
                on Legacy Target, Automatic ATH, Special-Event withdrawals, the Commit-confirmation
                modal, and the Comfortable Amortization override. Manual bumped to Edition X.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>

          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 059 — Mirrored growth sliders &amp; comfort-bypass fix
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <p style={{ marginBottom: "0.5rem" }}>
              <strong>Directives now match the actuarial matrix when a stale ATH would otherwise trigger a −10% cut.</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Comfort-bypass hardening.</strong> When the plan holds 3+ years of true
                surplus (beyond lifetime needs and legacy target), the Guyton-Klinger −10%
                reduction is now suppressed at the calculation layer — so both the guardrail
                status readout <em>and</em> the directive box agree on "Draw Normally."
              </li>
              <li>
                <strong>Ledger shows Special-Event amounts.</strong> The Drawdown Income column
                now displays the withdrawal amount (in the accent-purple), the Equities/Cash
                split, and the note you typed (e.g. "Car — £24,000 · Eq £18,000 · Cash £6,000").
              </li>
              <li>
                <strong>Assumed Growth Rate + Cash Real Return mirrored across Pane 1 and the
                Risk Simulator.</strong> Change either slider in either place — the other
                updates immediately. In Pane 1 the sliders sit directly under Global Equities
                and Cash Pot; the currency selector moves down beside Cash Buffer and Legacy.
              </li>
              <li>
                <strong>Fun Bucket now feels cash drag.</strong> Pane 2's Amortization Matrix
                uses a blended real-growth rate (equities × equity return + cash × cash real
                return, weighted by pot size) — so raising cash allocation shortens the
                comfort horizon exactly as the Risk Simulator predicts.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 058 — Legacy target &amp; Special-Event withdrawals
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <p style={{ marginBottom: "0.5rem" }}>
              <strong>Stops the "silly late-life freeze" directive.</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>New Pane 1 field — Legacy / Inheritance Target.</strong> Real-terms
                amount you want to leave behind. It is reserved from the Fun Bucket and factored
                into the surplus and comfort-years calculations. Set to 0 to happily amortize to
                zero; raise it any time to reflect changing family plans.
              </li>
              <li>
                <strong>Comfortable Amortization directive.</strong> When the plan still holds
                3+ years of true surplus (beyond both lifetime needs and the legacy target), the
                Preservation / Freeze branch is bypassed and a green "Draw Normally" directive
                fires — even if drawdown vs a very old ATH looks large. This fixes the case
                where an 80-year-old with £790k and only 10 years left was being told to freeze
                equities against a stale £1m peak.
              </li>
              <li>
                <strong>Pane 6 — Commit as Special-Event Withdrawal.</strong> When "Can I afford
                this?" reflects a real one-off spend (car, kitchen, gift), type a short
                description and hit <em>Commit Special Event</em>. The app deducts the split
                shown from Equities/Cash, lowers ATH by the same amount so the peak baseline
                stays honest, and writes a purple <code>★ EVENT</code> ledger entry stamped with
                today's date and your note.
              </li>
              <li>
                <strong>Ledger — Special Event styling.</strong> Special-event rows are tinted
                purple with an <code>★ EVENT</code> chip and the transaction date so they are
                obvious in the historical timeline.
              </li>
              <li>
                <strong>Fun Bucket wording.</strong> The Actuarial Amortization Matrix now
                explicitly shows "(after reserving £X legacy target)" whenever a legacy figure
                is set.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>

          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 055 — 2026-06-29
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <p style={{ marginBottom: "0.5rem" }}>
              <strong>Pane 5 — defensive threshold buttons now materially re-run the sim.</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Threshold fix.</strong> Strict / Standard / Aggressive now use wider
                nominal-return bands so each preset changes which years spend from Cash. The previous
                real-return thresholds could collapse onto the same historical years, making the p10,
                median and p90 figures identical to the penny.
              </li>
              <li>
                <strong>Immediate re-simulation.</strong> Every threshold click updates state and
                re-runs all 2,750 paths against the same seeded return sequence, so differences come
                from the draw rule rather than from random re-rolling.
              </li>
              <li>
                <strong>Docs and changelog caught up.</strong> Help, Full Manual and this hidden
                changelog now show the latest builds instead of stopping at build 041.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 054 — 2026-06-29
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <p style={{ marginBottom: "0.5rem" }}>
              <strong>Pane 5 — allocation bias slider + visible defensive-draw feedback.</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Allocation bias slider.</strong> Rebalances Equities ↔ Cash while keeping
                the total pot fixed; free-text what-if overrides remain the source of truth.
              </li>
              <li>
                <strong>Defensive-draw counter.</strong> Shows the average number of years per run
                that drew from Cash, making the threshold logic visible immediately.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 053 — 2026-06-29
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <p style={{ marginBottom: "0.5rem" }}>
              <strong>Pane 5 — true two-bucket Risk Simulator.</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                Tracks Equities and Cash as separate buckets through every Monte Carlo path instead
                of treating the whole pot as equities.
              </li>
              <li>
                Added the Cash real return slider, defensive draw thresholds, and separate Equities / Cash what-if overrides.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 052 — 2026-06-28
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <p style={{ marginBottom: "0.5rem" }}>
              <strong>Mobile gate fix.</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                The small-screen warning now remembers dismissal in local storage and no longer
                reappears after refresh on the same device.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 041 — 2026-06-25
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <p style={{ marginBottom: "0.5rem" }}>
              <strong>Pane 5 — documentation &amp; input polish.</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                Added a <strong>Zoom &amp; hover</strong> paragraph to the in-panel "How to read
                this" help, describing the brush, auto-rescaling Y-axis, pan, double-click reset,
                and crosshair tooltip introduced in build 040.
              </li>
              <li>
                Removed the native up/down spinner from the <strong>Pension Start Age</strong>{" "}
                input so its height matches the Annual Withdrawal and Annual Pension fields.
              </li>
              <li>
                Quick Start and Full Manual cross-checked — zoom brush and crosshair tooltip
                documented in both.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 040 — 2026-06-25
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <p style={{ marginBottom: "0.5rem" }}>
              <strong>Pane 5 — Risk Simulator: zoom brush &amp; hover tooltip.</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Zoom brush.</strong> Draggable strip beneath the fan chart with two handles
                and a draggable selected window. Drag a handle to narrow the time window, drag the
                window to pan, double-click to reset. Includes a mini p10–p90 preview so overall
                shape stays visible while zooming. Arrow-key accessible.
              </li>
              <li>
                <strong>Auto-rescaling Y-axis.</strong> The vertical domain recomputes from the
                visible window only, so zooming into a short horizon no longer flattens the lines —
                gridlines, fan bands, median and deterministic path all smoothly rescale.
              </li>
              <li>
                <strong>Crosshair + tooltip.</strong> Hover the chart to drop a dashed crosshair on
                the nearest year. A semi-transparent tooltip card shows Age, Assumed Growth, 90th
                percentile, Median Path, and 10th percentile — colour-coded to the chart series.
              </li>
              <li>
                <strong>X-axis labels.</strong> Ticks now show absolute Age when Current Age is
                set, falling back to <code>+Ny</code>.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 037 — 2026-06-24
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <p style={{ marginBottom: "0.5rem" }}>
              <strong>Beta Release Candidate — cleanup &amp; rename.</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Renamed app to "Sovereign Glidepath"</strong> everywhere (Electron window
                title, installer / shortcut / uninstall strings, <code>productName</code>,{" "}
                <code>appId</code>, route metadata, desktop bundle <code>&lt;title&gt;</code>).
                Installer output is now <code>SovereignGlidepath-Setup-&lt;version&gt;.exe</code>.
              </li>
              <li>
                <strong>Dropped legacy "Horizon" codename.</strong> Component file{" "}
                <code>SovereignHorizonDesk.tsx</code> renamed to <code>SovereignGlidepath.tsx</code>{" "}
                (and its exported symbol); standalone manual{" "}
                <code>public/sovereign-horizon-manual.html</code> renamed to{" "}
                <code>public/sovereign-glidepath-manual.html</code> with the in-app "📖 Full Manual"
                button updated to match.
              </li>
              <li>
                <strong>Removed orphan files.</strong> Deleted unreferenced{" "}
                <code>public/sovereign-horizon-desk.html</code>, committed build output{" "}
                <code>dist-desktop/</code>, and stale <code>tsconfig.tsbuildinfo</code>. Added{" "}
                <code>dist-installer/</code> and <code>tsconfig.tsbuildinfo</code> to{" "}
                <code>.gitignore</code>.
              </li>
              <li>
                <strong>Integrity verified.</strong> Full grep returns zero hits for the old names
                in source; TypeScript, ESLint and the Vite production build all run clean.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 036 — 2026-06-24
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Docs caught up.</strong> Help / Quick Start and the Full Manual now describe
                the Deactivate License button, the Re-activate label, and the "transfer to another
                machine" workflow introduced in build 035.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 035 — 2026-06-24
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Deactivate License button.</strong> Added to the Activate License modal
                (only visible when a license is active). Clears the saved license from this device
                after a confirmation prompt, so users can transfer their license to another machine
                without touching DevTools.
              </li>
              <li>
                <strong>Re-activate label.</strong> The modal's primary button now reads{" "}
                <em>Re-activate</em> when a license is already loaded.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 034 — 2026-06-24
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Build bump.</strong> Forces a fresh bundle fetch after the offline licensing
                v2 rollout (some preview clients were still serving cached build 032). No functional
                changes.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 033 — 2026-06-24
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>New offline licensing scheme.</strong> License key = SHA-256(registered
                name/email + internal salt). Activation modal now takes two fields — name/email and
                key — and verifies entirely in-browser via Web Crypto.
              </li>
              <li>
                <strong>30-day evaluation clock.</strong> First launch stamps an install date. A
                dismissible amber banner shows days remaining throughout the trial.
              </li>
              <li>
                <strong>5-entry post-expiry cap.</strong> After day 30 (unregistered), the ledger is
                capped at 5 entries. A 6th commit opens a lockout modal pointing to the License
                screen.
              </li>
              <li>
                <strong>Licensed banner.</strong> Switches to <code>Licensed to: {`{name}`}</code>{" "}
                after successful activation; the license entry UI hides.
              </li>
              <li>
                <strong>IS_STORE_BUILD flag.</strong> New{" "}
                <code>src/lib/sovereign/build-flags.ts</code>. When <code>true</code>, all trial
                gating and the License button disappear (reserved for the Windows Store build).
              </li>
              <li>
                <strong>Migration note.</strong> Legacy SHD1 keys no longer verify — re-issue with{" "}
                <code>node scripts/generate-license.mjs "&lt;name-or-email&gt;"</code>.
              </li>
              <li>
                <strong>Windows installer build → 1.0.33.</strong> Output:{" "}
                <code>dist-installer/SovereignGlidepathDesk-Setup-1.0.33.exe</code>.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 032 — 2026-06-24
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Renamed to Sovereign Glidepath.</strong> Dropped "Desk" from the app title
                across the UI, route metadata, disclaimer, exit prompt and backup descriptor.
              </li>
              <li>
                <strong>Pane 6 — default source is now Equities.</strong> The "Can I Afford This?"
                calculator opens with Equities selected (was "Cash first"), and the source toggle is
                reordered Equities / Cash / Cash-first.
              </li>
              <li>
                <strong>Pane 6 — toggle hint.</strong> Added a small italic note above the
                quick-select buttons explaining they are toggles that sum together.
              </li>
              <li>
                <strong>Windows installer build → 1.0.32.</strong> Re-run{" "}
                <code>npm run installer</code>. Output:{" "}
                <code>dist-installer/SovereignGlidepathDesk-Setup-1.0.32.exe</code>.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 031 — 2026-06-24
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Docs refreshed.</strong> Quick Start and the Full Manual (Ch. 4) now
                describe the six-column ledger and the Drawdown-from-ATH colour bands.
              </li>
              <li>
                <strong>Hidden shortcut moved.</strong> Shift-click for the changelog has migrated
                from the License button to the <strong>Restore</strong> button. No tooltip — it
                stays undocumented by design.
              </li>
              <li>
                <strong>Windows installer build → 1.0.31.</strong> Re-run{" "}
                <code>npm run installer</code>. Output:{" "}
                <code>dist-installer/SovereignGlidepathDesk-Setup-1.0.31.exe</code>.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 030 — 2026-06-24
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Ledger — column renamed.</strong> "Market Drop %" is now{" "}
                <strong>Drawdown from ATH</strong> — clearer that the figure is peak-to-trough
                decline from the all-time high (0% means the portfolio is at a new ATH).
              </li>
              <li>
                <strong>Drawdown colour now reflects magnitude</strong>, not the execution-rule
                name. Green &lt; 5%, muted 5–10%, amber 10–20%, red &gt; 20%. Fixes the case where
                an at-ATH row rendered amber just because the rule contained the word "Shield".
              </li>
              <li>
                <strong>Windows installer build → 1.0.30.</strong> Re-run{" "}
                <code>npm run installer</code>. Output:{" "}
                <code>dist-installer/SovereignGlidepathDesk-Setup-1.0.30.exe</code>.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 029 — 2026-06-24
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Ledger redesign — 6 semantic columns.</strong> The previous two-row split
                was breaking grid alignment. The table now uses six columns, each stacking a bold
                primary figure with a muted secondary line: <em>Timeline</em> (Period / Age +
                Phase), <em>Asset Pools</em> (Equities / Cash), <em>Portfolio Total</em> (Total /
                ATH), <em>Market Drop %</em> (single centred metric), <em>Drawdown Income</em>{" "}
                (Withdrawal £ / WR %), and <em>Status & Controls</em> (Execution Rule / Edit + Del).
              </li>
              <li>
                <strong>Lighter muted text.</strong> Secondary lines now render in slate-gray so
                primary numbers visually dominate.
              </li>
              <li>
                <strong>Windows installer build → 1.0.29.</strong> Re-run{" "}
                <code>npm run installer</code>. Output:{" "}
                <code>dist-installer/SovereignGlidepathDesk-Setup-1.0.29.exe</code>.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 028 — 2026-06-24
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Risk Simulator — native steppers.</strong> Expected Return %, Volatility
                (StDev) % and Pension Start Age now use numeric inputs with built-in up/down arrows,
                matching the Target Horizon Age control in Pane 1 for consistency.
              </li>
              <li>
                <strong>Ledger — clearer column name.</strong> "Drawdown" renamed to{" "}
                <strong>Market Drop %</strong> so it's unambiguous that the figure is peak-to-trough
                loss.
              </li>
              <li>
                <strong>Ledger — new income columns.</strong> Two new columns added:{" "}
                <strong>Withdrawal ({`{currency}`})</strong> (the cash drawn that period) and{" "}
                <strong>WR %</strong> (that cash as a percentage of current portfolio — the number
                Guyton-Klinger guardrails monitor).
              </li>
              <li>
                <strong>Ledger — two-line row layout.</strong> Each entry now spans two rows: Period
                / Age / Phase / Actions on the title line, then Equities / Cash / Total / ATH /
                Market Drop % / Withdrawal / WR % / Execution Rule beneath. Stays legible at
                narrower window widths.
              </li>
              <li>
                <strong>Windows installer build → 1.0.28.</strong> Re-run{" "}
                <code>npm run installer</code>. Output:{" "}
                <code>dist-installer/SovereignGlidepathDesk-Setup-1.0.28.exe</code>.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 027 — 2026-06-23
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Installer fix — "Can't open output file".</strong> The build script now
                creates the <code>dist-installer\</code> folder before NSIS runs. On a fresh
                checkout this was the cause of the error right at the final step.
              </li>
              <li>
                <strong>Installer fix — version drift.</strong> The version is now read straight
                from <code>package.json</code> (<code>1.0.27</code>) instead of being hard-coded in
                the script, so the three places that used to disagree can no longer get out of sync.
              </li>
              <li>
                <strong>Version format note.</strong> Use three parts only — e.g.{" "}
                <code>1.0.27</code>. The NSI script pads to <code>1.0.27.0</code> automatically.
                Writing a four-part version like <code>1.0.0.27</code> yourself causes the malformed
                filename and the build error you may have seen.
              </li>
              <li>
                <strong>Output:</strong>{" "}
                <code>dist-installer/SovereignGlidepathDesk-Setup-1.0.27.exe</code>.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 026 — 2026-06-23
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Risk Simulator inputs shrunk further.</strong> Labels, text inputs and
                slider controls reduced again so the row stays clean at narrow window widths.
              </li>
              <li>
                <strong>License button tooltip removed.</strong> The hover hint that advertised the
                hidden changelog shortcut has been removed. The shortcut itself (shift-click 🔑
                License) still works.
              </li>
              <li>
                <strong>Windows installer build → 1.0.26.</strong> Re-run{" "}
                <code>npm run installer</code> to produce the new{" "}
                <code>SovereignGlidepathDesk-Setup-1.0.26.exe</code>. Full step-by-step in{" "}
                <code>installer/BUILD-INSTRUCTIONS.md</code>.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 025 — 2026-06-22
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Pane 3 directives — emphasised.</strong> The Actionable Brokerage Desk
                Directive box now uses a gradient fill, accent ring and larger type so the current
                call-to-action stands out as the main message of the screen. Danger / warning /
                refill variants each get their own colour-matched glow.
              </li>
              <li>
                <strong>Risk Simulator — compact inputs.</strong> Annual Withdrawal, Annual Pension,
                Pension Start Age and the slider controls are now noticeably smaller so the whole
                control row stays legible at narrow window widths. Applies to both Historical and
                Parametric modes.
              </li>
              <li>
                <strong>Pane 6 — toggleable presets.</strong> The expense preset buttons in "Can I
                Afford This?" now toggle on/off and sum together (e.g. click {`£1,000`} and{" "}
                {`£5,000`} → {`£6,000`} entered). Added a new {`£100,000`} preset for big-ticket
                events.
              </li>
              <li>
                <strong>Windows installer build → 1.0.25.</strong> See{" "}
                <code>installer/BUILD-INSTRUCTIONS.md</code> for a fully spelled-out step-by-step
                guide.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 024 — 2026-06-18
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <p style={{ marginBottom: "0.5rem" }}>
              <strong>Currency selector — full reactivity fix</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                Changing the currency in Pane 1 now updates <em>every</em> currency value instantly
                — no refresh needed. The Actuarial Amortization Matrix, Actionable Brokerage Desk
                Directives and Historical Trend Visualizer y-axis (previously hardcoded £) all
                switch in lockstep.
              </li>
            </ul>
            <p style={{ marginTop: "0.75rem", marginBottom: "0.5rem" }}>
              <strong>Risk Simulator</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Pension slider rework → "Pension Real Annual Increase".</strong> Now
                compounds the pension directly in today's pounds (2% = 2% real growth per year).
                Default is 0% (flat-real). The previous formula deflated by the withdrawal-inflation
                rate, which made matched settings cancel out and the slider feel inert.
              </li>
              <li>
                <strong>Seeded RNG.</strong> The fan chart now uses a deterministic mulberry32 PRNG,
                so dragging a slider produces smooth, predictable deltas instead of re-rolling every
                path on every tick.
              </li>
            </ul>
            <p style={{ marginTop: "0.75rem", marginBottom: "0.5rem" }}>
              <strong>Header</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Changelog hidden behind License.</strong> The visible 📋 Changelog button
                has been removed. <strong>Shift-click the 🔑 License button</strong> to open the
                changelog; plain click still opens the license dialog.
              </li>
            </ul>
            <p style={{ marginTop: "0.75rem", marginBottom: "0.5rem" }}>
              <strong>Electron / Windows installer</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>One-command Windows build.</strong> <code>npm run installer</code> chains
                build → electron-packager → makensis to produce{" "}
                <code>dist-installer/SovereignGlidepathDesk-Setup-1.0.24.exe</code>. After clone,
                the only manual step is dropping <code>app.ico</code> into{" "}
                <code>installer/assets/</code>.
              </li>
              <li>
                Hardened main process: added <code>electron/preload.cjs</code>, window icon and{" "}
                <code>sandbox: false</code>.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 023 — 2026-06-17
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <p style={{ marginBottom: "0.5rem" }}>
              <strong>Panels</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Renumbered</strong> "Can I Afford This?" to <strong>Pane 6</strong> and
                Historical Timeline Ledger to <strong>Pane 7</strong> for consistent sequential
                numbering.
              </li>
            </ul>
            <p style={{ marginTop: "0.75rem", marginBottom: "0.5rem" }}>
              <strong>Risk Simulator</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Annual Pension and Pension Start Age now persist</strong> across refresh,
                alongside the Yearly Withdrawal Increase and the new Pension Annual Increase
                sliders.
              </li>
              <li>
                <strong>New slider: Assumed State Pension Annual Increase (0–6%).</strong> Escalates
                the pension nominal value year-on-year starting the year after the simulation
                begins. Combined with the Yearly Withdrawal Increase slider this models real-terms
                pension growth, flat-real, or erosion.
              </li>
            </ul>
            <p style={{ marginTop: "0.75rem", marginBottom: "0.5rem" }}>
              <strong>Pane 1 — Parameters</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Currency selector (£ / € / $).</strong> A dropdown switches every currency
                field, label, simulator readout and directive. Cosmetic — no FX conversion.
              </li>
            </ul>
            <p style={{ marginTop: "0.75rem", marginBottom: "0.5rem" }}>
              <strong>Documentation</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Quick Start two-bucket note.</strong> The Quick Start now states the desk
                assumes a two-bucket strategy (Cash Pot + Global Equities Pot) and explains how to
                notionally group existing holdings if you don't physically run two pots today.
              </li>
              <li>
                <strong>Help updated</strong> to document the Pension Annual Increase slider.
              </li>
            </ul>
            <p style={{ marginTop: "0.75rem", marginBottom: "0.5rem" }}>
              <strong>Build</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>NSIS Windows installer scaffold</strong> added under <code>installer/</code>
                . Produces a proper Setup.exe with Start Menu / Desktop shortcuts and an
                uninstaller; signing-ready.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 022 — 2026-06-16
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <p style={{ marginBottom: "0.5rem" }}>
              <strong>Branding</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Renamed to Sovereign Glidepath.</strong> The name "Sovereign Horizon" was
                already in use. All user-visible references — header, window title, installer,
                manual and Quick Start — have been updated.
              </li>
            </ul>
            <p style={{ marginTop: "0.75rem", marginBottom: "0.5rem" }}>
              <strong>Risk Simulator (Monte Carlo)</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>
                  Renamed the "Inflation" slider to "Yearly Withdrawal Increase Rate".
                </strong>{" "}
                This is what the slider actually does — it escalates the annual withdrawal smoothly
                year on year and deflates returns by the same rate so the chart stays in today's
                pounds. Behaviour is unchanged.
              </li>
              <li>
                <strong>Quick Start and Full Manual updated</strong> to reflect the move from
                S&amp;P 500 to MSCI World (NTR, GBP) 1970–2024 and to document the
                withdrawal-increase slider.
              </li>
            </ul>
            <p style={{ marginTop: "0.75rem", marginBottom: "0.5rem" }}>
              <strong>Can I Afford This?</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>One-off Expense is now a £-formatted currency input</strong> matching the
                Annual Withdrawal field (raw digits on focus, GBP formatting on blur).
              </li>
              <li>
                <strong>Removed the "What is it?" label field</strong> — the text was never
                persisted or displayed anywhere meaningful.
              </li>
            </ul>
            <p style={{ marginTop: "0.75rem", marginBottom: "0.5rem" }}>
              <strong>Historical Trend Visualiser</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Added an "Equities" line</strong> to the chart (green), alongside Total
                Capital, ATH Baseline and Money Market.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 021 — 2026-06-15
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <p style={{ marginBottom: "0.5rem" }}>
              <strong>Risk Simulator (Monte Carlo)</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>New Pension fields for both Historical and Parametric modes.</strong> Enter
                an annual pension amount (today's £) and the age at which it begins. From that age
                onward, the net draw on the pot is reduced by the pension (
                <code>net = max(0, withdrawal − pension)</code>). Before pension age the full
                withdrawal is funded from capital — producing materially more realistic long-term
                outcomes for users with state or DB pensions starting later in retirement.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 020 — 2026-06-15
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <p style={{ marginBottom: "0.5rem" }}>
              <strong>Risk Simulator (Monte Carlo)</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Expected Return % / Volatility % inputs now allow full deletion.</strong>{" "}
                The most-significant digit used to refuse to clear because the field snapped back to{" "}
                <code>0</code>
                whenever the buffer went empty. Both fields are now string-buffered, so backspacing
                all the way out works.
              </li>
              <li>
                <strong>
                  Historical mode switched from S&amp;P 500 to MSCI World (Net Total Return, GBP)
                  1970–2024.
                </strong>{" "}
                The S&amp;P series was too optimistic for a typical UK user holding a global tracker
                (VWRL, FTSE Global All Cap, MSCI ACWI). The new series is a closer proxy and
                produces more realistic outcomes.
              </li>
              <li>
                <strong>New Inflation slider (0–5%, default 2.5%) for both modes.</strong> Each
                year's nominal return is converted to a real return via (1 + nominal) / (1 +
                inflation) − 1, and the withdrawal stays constant in today's pounds. The whole
                chart, deterministic line and summary stats are now in
                <strong> today's money</strong>. Set to 0% to model nominal returns.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 019 — 2026-06-14
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <p style={{ marginBottom: "0.5rem" }}>
              <strong>Desktop app</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Changelog button now opens the changelog</strong> in the desktop build
                instead of launching a second copy of the main app. The Electron renderer recognises
                the <code>#/changelog</code>
                hash route and renders the changelog page directly.
              </li>
              <li>
                <strong>Single-instance lock.</strong> Launching the app while it is already running
                no longer opens a second window — focus is moved to the existing window (restored if
                minimised).
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 018 — 2026-06-14
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <p style={{ marginBottom: "0.5rem" }}>
              <strong>Bug fix</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>
                  Monte Carlo "Sims beating your assumption" no longer gives a false green light
                  when the pot depletes.
                </strong>{" "}
                A withdrawal large enough to empty the fund used to drive the deterministic dashed
                projection deeply negative while the simulated paths were floored at £0 — so every
                sim "beat" the projection and the headline read a cheerful "Conservative — most
                futures beat your assumption" on a clearly failing plan. The deterministic line is
                now floored at £0 (same as the sims), a new <strong>Ruin rate</strong>
                stat shows the % of simulated futures that ran out of money, and when ruin rate ≥
                50% (or your own assumed-rate projection depletes) the headline switches to a red
                "Plan unsustainable — X% of futures run out of money" warning. Smaller depletion is
                shown as a "(X% deplete)" suffix on the existing optimistic / aggressive labels.
                Help panel updated.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 016 — 2026-06-11
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <p style={{ marginBottom: "0.5rem" }}>
              <strong>New feature</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                Added the <strong>“Can I Afford This?” Instant Impact Calculator</strong> — a
                hypothetical, non-committing panel that simulates a one-off expense (new car, gift,
                holiday) using your current Pane 1 inputs. Instantly shows the impact on Total
                Capital, Drawdown vs ATH, Shield Runway, next Quarterly Wage (with the same
                Guyton-Klinger guardrail logic as the live directives), and Fun Bucket surplus.
                Funding source defaults to Cash first then Equities, with manual override. Nothing
                is written to the ledger.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 015 — 2026-06-11
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <p style={{ marginBottom: "0.5rem" }}>
              <strong>Bug fix</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                Age slider no longer jumps when editing Target Horizon Age. Numeric inputs (Target
                Horizon Age, Desired Shield Runway, Annual Withdrawal £) previously committed every
                intermediate keystroke — typing <code>85</code> passed through <code>8</code>, which
                set the capping age to 8 and triggered the "keep Age ≤ capping age" clamp, dragging
                the slider down. Numeric inputs now only commit values within their min/max range,
                and snap out-of-range entries to the nearest bound on blur.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 014 — 2026-06-11
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <p style={{ marginBottom: "0.5rem" }}>
              <strong>Documentation (fix)</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                <strong>Full Manual (static HTML) updated.</strong> Build 013 added the dashed-line
                curvature explanation to the in-app
                <code> /help </code> page, but the <strong>📖 Full Manual</strong>
                button actually opens the static
                <code> public/sovereign-horizon-manual.html</code>, so the change wasn't visible
                there. The explanation is now added to that file as a callout in Chapter 23
                ("Reading the fan chart"):
                <code> next = prev × (1 + r) − withdrawal</code>, exponential compounding on a
                linear Y-axis, and how fixed-£ withdrawals tilt the curve up or down depending on
                the capital-to-withdrawal ratio.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 013 — 2026-06-11
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <p style={{ marginBottom: "0.5rem" }}>
              <strong>Documentation</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                In-app Full Manual (<code>/help</code>) — added the dashed-line curvature
                explanation to the Risk Simulator section. (Static HTML manual followed in build
                014.)
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 012 — 2026-06-11
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <p style={{ marginBottom: "0.5rem" }}>
              <strong>Documentation</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                Changelog entry explaining why the dashed "your assumption" line in the Monte Carlo
                Fan Chart curves rather than running straight — compounding is exponential on a
                linear axis, and fixed-£ withdrawals tilt the curve.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 011
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <p>
              <strong>New:</strong> In-app changelog viewer — open it from the top button bar to see
              a running record of every update, improvement and bug fix by build number.
            </p>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 010 — 2026-06-11
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <p style={{ marginBottom: "0.5rem" }}>
              <strong>Improvements</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.75rem" }}>
              <li>
                Header layout — Title is now prominent and centred at the top of the page, with the
                version/build stamp directly beneath it. The action buttons sit on a second row
                below the title.
              </li>
              <li>
                Button order standardised — Quick Start, Full Manual, Back-Up, Restore, License,
                Exit (left to right).
              </li>
              <li>
                New "Exit" button — Closes the desktop window. In the browser it closes the current
                tab where the runtime permits.
              </li>
              <li>Pane 1 label — "Modeling Age" renamed to "Age".</li>
              <li>
                Risk Simulator (Pane 5) — Annual Withdrawal now seeds its initial value from{" "}
                <em>Target Annual Base Withdrawal</em> (Pane 1). The fields are not bound after that
                — change one freely without affecting the other. Field is now a formatted GBP (£)
                currency input rather than a raw number.
              </li>
              <li>
                Backup folder is remembered — When the OS save dialog supports it (Electron /
                Chromium), the directory chosen on your last backup is reused as the starting folder
                on the next backup. Falls back to the standard browser download flow where the API
                is unavailable.
              </li>
            </ul>
            <p style={{ marginBottom: "0.5rem" }}>
              <strong>Bug fixes</strong>
            </p>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>
                Backspace deletion in numeric inputs — Target Horizon Age, Desired Shield Runway
                (months) and Annual Withdrawal £ now accept an empty value while editing.
                Previously, deleting the most-significant digit snapped the field back to its
                default, blocking left-to-right backspace edits. The field still reverts to a
                sensible default if you leave it empty on blur.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 009
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <ul style={{ paddingLeft: "1.25rem" }}>
              <li>First Electron-packaged Windows portable release.</li>
              <li>Risk Simulator "How to read" inline help.</li>
              <li>Quick Start and Full Manual updated to cover the Monte Carlo Fan Chart.</li>
              <li>
                Percentile colour direction corrected so "majority of futures beat your assumption"
                reads green, not red.
              </li>
            </ul>
          </div>
        </div>

        <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
            v1.0 build 008 and earlier
          </h2>
          <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>
            <p>Not formally tracked — see Git history for context.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
