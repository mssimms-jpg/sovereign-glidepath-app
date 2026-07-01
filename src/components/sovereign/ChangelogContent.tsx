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
