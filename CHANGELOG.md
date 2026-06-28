# Sovereign Glidepath — Changelog

A running record of updates, improvements and bug fixes by build number.
Location: project root (`CHANGELOG.md`). Update this file every build.

---

## v1.0 build 052 — 2026-06-28

### Mobile gate fix
- **Persistent dismissal.** The "Best viewed on a larger screen" overlay now stores its dismissal in `localStorage` (key `sg_mobile_gate_dismissed_v2`) instead of `sessionStorage`, so acknowledging it once permanently hides it on that device. Previously it reappeared every time the tab was re-opened or refreshed on mobile.
- **No resize re-trigger.** Removed the `resize` listener that could re-show the gate after dismissal if the viewport briefly crossed the 900px threshold; the gate is now evaluated once on mount only.

## v1.0 build 041 — 2026-06-25

### Pane 5 — Risk Simulator: documentation & input polish
- **"How to read this" panel.** Added a Zoom & hover paragraph describing the new brush, auto-rescaling Y-axis, pan, double-click reset, and crosshair tooltip.
- **Pension Start Age input.** Removed the native number-spinner arrows so the field height matches the Annual Withdrawal and Annual Pension inputs — tidier row alignment.
- **Manual & Help.** Quick Start and Full Manual already document the zoom brush from build 040; in-panel help now mentions it too.

## v1.0 build 040 — 2026-06-25

### Pane 5 — Risk Simulator: zoom brush & hover tooltip
- **Zoom brush.** New compact draggable strip beneath the fan chart with two handles. Drag either handle to narrow the time window, drag the highlighted region to pan, double-click to reset. Mini p10–p90 preview is rendered inside the brush so the overall shape stays visible while zooming. Handles are keyboard accessible (`role="slider"` + arrow keys).
- **Auto-rescaling Y-axis.** Y-axis domain recomputes from the visible window only, so when you zoom into a short horizon the lines no longer look flat — gridlines, labels, fan bands, median and deterministic line all rebuild smoothly to fit.
- **Crosshair + tooltip.** Hover the chart area to drop a dashed crosshair on the nearest year, with an absolutely-positioned, semi-transparent tooltip card (auto-flips at the right edge) showing Age, Assumed Growth, 90th percentile, Median Path, and 10th percentile — color-coded to match the chart series.
- **Axis labels.** X-axis ticks now show absolute Age when Current Age is set, falling back to `+Ny` otherwise.



## v1.0 build 037 — 2026-06-24

### Beta Release Candidate — cleanup & rename
- **Renamed app to "Sovereign Glidepath"** everywhere (dropped trailing "Desk"): Electron window title, `electron-builder.yml` `productName` / `appId` / `artifactName`, all NSIS installer strings (Start Menu, Desktop shortcut, uninstall keys, output filename `SovereignGlidepath-Setup-<version>.exe`), `package.json` `name` and `package:win` / `installer` scripts, both `build-installer.{sh,ps1}` wrappers, `installer/LICENSE.txt`, `installer/README.md`, `installer/BUILD-INSTRUCTIONS.md`, root route metadata (`<title>`, OG / Twitter tags), `desktop/index.html`.
- **Dropped legacy "Horizon" codename.** Component file `SovereignHorizonDesk.tsx` → `SovereignGlidepath.tsx` and exported symbol renamed; standalone manual `public/sovereign-horizon-manual.html` → `public/sovereign-glidepath-manual.html` (in-app "📖 Full Manual" button updated to match).
- **Removed orphan files.** Deleted unreferenced `public/sovereign-horizon-desk.html`, committed build output `dist-desktop/`, and stale `tsconfig.tsbuildinfo`. Added `dist-installer/` and `tsconfig.tsbuildinfo` to `.gitignore`.
- **Integrity verified.** Full grep returns zero hits for the old names in source; `tsgo --noEmit`, `eslint`, and `vite build` all clean.

### Notes
- `appId` change in `electron-builder.yml` (`com.sovereignhorizon.desk` → `com.sovereignglidepath.app`) means a fresh-install on Windows will not see the previous install — acceptable for the Beta RC.
- Historical CHANGELOG entries retain their original "Sovereign Glidepath Desk" wording for accuracy.

---

## v1.0 build 036 — 2026-06-24

### Documentation
- **Help / Quick Start** and **Full Manual** updated to document the new Deactivate License button and the Re-activate label, including the "transfer to another machine" workflow.

---

## v1.0 build 035 — 2026-06-24

### Licensing
- **Deactivate License button** added inside the Activate License modal (only visible when a license is active). Clears the saved license from this device after a confirmation prompt, so users can transfer their license to another machine without touching DevTools / localStorage.
- Modal's primary button now reads **Re-activate** when a license is already loaded, making the re-entry flow obvious.

---

## v1.0 build 034 — 2026-06-24

### Housekeeping
- Build bump to force a fresh bundle fetch after the offline licensing v2 rollout (some preview clients were still serving cached build 032).

---

## v1.0 build 033 — 2026-06-24

### Licensing (offline v2)
- New scheme: license key = **SHA-256(registered name/email + internal salt)**, 64-char lowercase hex. Verification runs fully offline via the browser's Web Crypto API.
- License modal now takes **two fields**: Registered Name/Email and License Key. On success, banner switches to `Licensed to: {name}` and the input UI is hidden.
- Added `IS_STORE_BUILD` flag (`src/lib/sovereign/build-flags.ts`). When `true`, the trial clock, entry cap, and License entry UI are all bypassed (reserved for the Windows Store build).

### 30-day evaluation + 5-entry post-expiry cap
- Stamps an installation date in `localStorage` on first launch.
- Dismissible amber banner during the trial: "Evaluation Copy: X days remaining…". Dismissal is session-scoped.
- After day 30, ledger is capped at **5 entries**. Attempting a 6th entry shows a lockout modal pointing to the License page.

### Migration
- Legacy SHD1 keys (`shd_license_v1`) are not recognised by the new scheme — re-issue keys with `node scripts/generate-license.mjs "<name-or-email>"`.

### Build
- Version bumped to **1.0.33**.

---

## v1.0 build 032 — 2026-06-24


### Rename
- App renamed from **Sovereign Glidepath Desk** to **Sovereign Glidepath** across UI strings, route metadata, disclaimer copy, exit confirmation and backup descriptor.

### Pane 6 — Can I Afford This?
- Default source toggle now opens on **Equities** (was "Cash first"). Source order reordered to Equities / Cash / Cash-first.
- Added a short italic hint above the quick-select preset buttons explaining they are toggles that sum together.

### Build
- Version bumped to **1.0.32**. Run `npm run installer` → `dist-installer/SovereignGlidepathDesk-Setup-1.0.32.exe`.

---


## v1.0 build 031 — 2026-06-24

### Documentation
- **Quick Start** updated with a description of the six-column ledger layout and the new Drawdown-from-ATH colour bands.
- **Full Manual** (Chapter 4, panel 5) extended with the same six-column breakdown.

### Hidden shortcut
- Shift-click on the **Restore** button now opens the changelog (previously on the License button). No hover hint — kept undocumented by design.

### Build
- Version bumped to **1.0.31**. Run `npm run installer` → `dist-installer/SovereignGlidepathDesk-Setup-1.0.31.exe`.

---

## v1.0 build 030 — 2026-06-24

### Ledger (Pane 7)
- **Renamed "Market Drop %" → "Drawdown from ATH"** — clearer that the figure is peak-to-trough decline from the all-time high (0% = at ATH).
- **Colour now reflects drawdown magnitude**, not the execution-rule name:
  - 🟢 Green: < 5% below ATH
  - ⚪ Muted: 5% – 10%
  - 🟡 Amber: 10% – 20%
  - 🔴 Red: > 20%
  This fixes the previous quirk where an at-ATH row could render amber because the rule contained the word "Shield".

### Build
- Version bumped to **1.0.30**. Run `npm run installer` → `dist-installer/SovereignGlidepathDesk-Setup-1.0.30.exe`.

---

## v1.0 build 029 — 2026-06-24

### Ledger (Pane 7)
- **Restructured to 6 semantic columns** with stacked content per cell, replacing the previous two-row split that broke grid alignment:
  1. **Timeline** — Period (bold) / Age + Phase badge.
  2. **Asset Pools** — Equities (top) / Cash (muted).
  3. **Portfolio Total** — Total (bold) / ATH (muted).
  4. **Market Drop %** — single centred metric, rule-coloured.
  5. **Drawdown Income** — Withdrawal £ (top) / WR % (muted).
  6. **Status & Controls** — Execution Rule with Edit / Del beneath.
- Muted secondary lines now use a lighter slate-gray (#94a3b8) so primary figures stand out.

### Build
- Version bumped to **1.0.29**. Run `npm run installer` → `dist-installer/SovereignGlidepathDesk-Setup-1.0.29.exe`.

---

## v1.0 build 028 — 2026-06-24

### Risk Simulator (Pane 5)
- **Native number steppers** on Expected Return %, Volatility (StDev) %
  and Pension Start Age — matches the Target Horizon Age control in
  Pane 1 (up/down arrow buttons, keyboard ↑/↓).

### Ledger (Pane 7)
- **Renamed "Drawdown" → "Market Drop %"** so the column unambiguously
  describes peak-to-trough loss.
- **New columns**: **Withdrawal ({currency})** — cash drawn that period —
  and **WR %** — that cash as a percentage of current portfolio.
  WR % is the figure Guyton-Klinger guardrails monitor.
- **Two-line row layout**: each entry now spans two rows. Title line
  shows Period / Age / Phase / Actions; the detail line beneath shows
  Equities / Cash / Total / ATH / Market Drop % / Withdrawal / WR % /
  Execution Rule. Keeps the table legible at narrower window widths.

### Installer
- Re-run `npm run installer`. Output:
  `dist-installer/SovereignGlidepathDesk-Setup-1.0.28.exe`.

---



## v1.0 build 027 — 2026-06-23

### Installer — bug fixes
- **Fixed "Can't open output file" NSIS error.** The `npm run installer`
  script now creates `dist-installer/` before invoking `makensis`. NSIS
  does not create the output directory itself; on a fresh checkout this
  caused the build to abort right at the end.
- **Fixed version drift.** `package.json` `"version"` is now the single
  source of truth (`1.0.27`). The installer script reads it dynamically
  via `require('./package.json').version` instead of a hard-coded number,
  so the three places that used to disagree (package.json, the script,
  and the output filename) can never drift again.
- **Documented the version format.** Use **three parts** only —
  `MAJOR.MINOR.PATCH` (e.g. `1.0.27`). The `.nsi` script automatically
  pads to the 4-part form Windows requires (`1.0.27.0`). Writing a
  4-part version yourself produces an invalid 5-part `VIProductVersion`
  and a malformed output filename like `…-Setup-1.0.0.27.exe`.

### Output
`dist-installer/SovereignGlidepathDesk-Setup-1.0.27.exe`

---

## v1.0 build 026 — 2026-06-23

### UI polish
- **Risk Simulator inputs shrunk further.** Label font reduced to 0.62rem,
  text input to 0.74rem, slider track 3px / thumb 13px. Controls now fit
  cleanly at narrow window widths without truncation.
- **License button tooltip removed.** The "Shift-click to open the
  changelog" hover hint was advertising a hidden feature; it is now
  silent. Shift-click on 🔑 License still opens the changelog.

### Build & packaging
- Bumped installer version to **1.0.26**. Output:
  `dist-installer/SovereignGlidepathDesk-Setup-1.0.26.exe`.
- `installer/BUILD-INSTRUCTIONS.md` refreshed with the new version
  number throughout.

---

## v1.0 build 025 — 2026-06-22

### UI polish
- **Pane 3 directives now stand out.** The Actionable Brokerage Desk
  Directive box was previously rendering with no specific styling
  (a class-name mismatch in `desk.css`). It now uses a gradient fill,
  accent ring, larger type and a colour-matched glow per state
  (normal / warning / danger / refill), so the current call-to-action
  is unmistakably the headline message on screen.
- **Risk Simulator controls compacted.** Annual Withdrawal, Annual
  Pension, Pension Start Age and the slider controls now use smaller
  input sizes and a tighter grid (135px min-column) so the whole row
  stays usable at narrow window widths. Applies to both Historical and
  Parametric modes.

### Pane 6 — Can I Afford This?
- **Preset buttons are now toggles.** Clicking £1,000 then £5,000
  enters £6,000 in the one-off expense field; clicking a preset again
  removes it. Added a **£100,000** preset for big-ticket events. Typing
  in the field manually clears any active presets.

### Build & packaging
- Bumped installer version to **1.0.25**.
- Added `installer/BUILD-INSTRUCTIONS.md` — a no-assumption,
  step-by-step Windows installer guide aimed at users new to the
  toolchain.

---

## v1.0 build 024 — 2026-06-18


### Currency selector — full reactivity fix
- **Currency symbol now updates everywhere instantly** when changed in
  Pane 1 (no more page refresh needed). Root cause: the engine's module-
  level symbol was being synced inside a `useEffect`, one render behind
  the dropdown. It's now applied synchronously during render, so the
  Actuarial Amortization Matrix, Actionable Brokerage Desk Directives,
  Historical Trend Visualizer y-axis (previously hardcoded `£`), MoneyInput
  fields, ledger table and Monte Carlo readouts all switch in lockstep.

### Risk Simulator (Monte Carlo)
- **Pension Annual Increase rework — "Pension Real Annual Increase".**
  The slider was previously deflated by the withdrawal-inflation rate, so
  matching settings cancelled out and effects looked minimal. It now
  compounds the pension directly in today's pounds: 2% means the
  pension's real value grows by 2% per year. Default is 0% (flat-real).
- **Fan-chart smoothness — seeded RNG.** The simulator now uses a
  deterministic mulberry32 PRNG keyed off only inputs that should change
  the underlying random draws. Dragging the pension or inflation sliders
  produces smooth, monotone deltas in the fan instead of re-rolling every
  path on every tick.

### Header
- **Changelog button hidden behind License.** The visible 📋 Changelog
  button has been removed. **Shift-click the 🔑 License button** to open
  the changelog. Plain click still opens the license dialog (unchanged).

### Electron / Windows installer
- **One-command Windows build.** New `npm run installer` script chains
  `build:desktop` → `electron-packager` → `makensis` to produce a real
  `dist-installer/SovereignGlidepathDesk-Setup-1.0.24.exe`. After
  `git clone` the only manual step is dropping `app.ico` into
  `installer/assets/`.
- **Electron main process hardened.** Added preload script
  (`electron/preload.cjs`), explicit window icon, and `sandbox: false`
  to match production Electron settings.
- Added `electron-winstaller@5.4.0` devDependency to satisfy projects
  preferring a Squirrel-based flow.

---

## v1.0 build 023 — 2026-06-17

### Panels
- **Renumbered "Can I Afford This?" → Pane 6** and **Historical Timeline
  Ledger → Pane 7**, restoring sequential numbering across the dashboard.

### Risk Simulator (Monte Carlo)
- **Annual Pension and Pension Start Age are now sticky** — they persist
  across refresh, alongside the Yearly Withdrawal Increase slider and
  (new) Pension Annual Increase slider.
- **New slider: Assumed State Pension Annual Increase (0–6%).** The
  pension nominal value grows at this rate each year starting the year
  after the simulation begins. Set above the withdrawal-increase rate to
  model real-terms pension growth (e.g. triple-lock), equal for flat
  real, below for erosion.

### Pane 1 — Parameters
- **Currency selector (£ / € / $).** A new dropdown lets you pick the
  display currency. All currency-formatted fields, labels, simulator
  outputs, directives and charts update immediately. Purely cosmetic —
  no FX conversion is performed.

### Documentation
- **Quick Start** now opens with an explicit note that the desk assumes a
  two-bucket strategy (Cash Pot + Global Equities Pot) and explains how
  to notionally group existing holdings (cash / MM / premium bonds /
  high-interest accounts → Cash Pot; ETFs / funds / equities → Equities
  Pot). New "Two-bucket strategy" section added.
- **Help** updated to document the Pension Annual Increase slider.

### Build
- **NSIS Windows installer scaffold** added under `installer/`
  (`installer.nsi`, build scripts, README). Produces a proper signed-
  ready Setup .exe with Start Menu / Desktop shortcuts and an
  uninstaller.

---

## v1.0 build 022 — 2026-06-16

### Branding
- **Renamed application to Sovereign Glidepath Desk.** The name "Sovereign
  Horizon" was already in use; all user-visible references in the app,
  installer, window title, manual and Quick Start have been updated.
  Internal file paths and component identifiers are unchanged.

### Risk Simulator (Monte Carlo)
- **Renamed the "Inflation" slider to "Yearly Withdrawal Increase Rate".**
  This is what the slider actually does — it escalates the annual
  withdrawal smoothly year on year (and deflates returns by the same rate
  so the chart stays in today's pounds). Behaviour unchanged.
- **Quick Start and Full Manual updated** to reflect the move from S&P 500
  to MSCI World (NTR, GBP) 1970–2024 and to document the slider.

### Can I Afford This?
- **One-off Expense field is now a £-formatted currency input** matching
  the Annual Withdrawal field (raw digits on focus, GBP formatting on
  blur).
- **Removed the "What is it?" label field.** The text was never persisted
  or shown anywhere meaningful.

### Historical Trend Visualiser
- **Added an "Equities" line** to the chart (green), alongside Total
  Capital, ATH Baseline and Money Market.

---

## v1.0 build 021 — 2026-06-15

### Risk Simulator (Monte Carlo)
- **New Pension fields (both Historical and Parametric modes).** Enter an
  annual pension amount (today's £) and the age at which it begins. From
  that age onward, the simulator reduces the net draw on the pot by the
  pension amount (`net = max(0, withdrawal − pension)`). Before pension
  age the full withdrawal is funded from capital, producing materially
  more realistic long-term outcomes for users with state or DB pensions
  starting later in retirement.

---

## v1.0 build 020 — 2026-06-15


### Risk Simulator (Monte Carlo)
- **Expected Return % / Volatility % inputs now allow full deletion.**
  Previously the most-significant digit refused to clear because the field
  snapped back to `0` whenever the buffer went empty. Both fields are now
  string-buffered (same pattern as Annual Withdrawal), so backspacing all
  the way out works as expected.
- **Historical mode switched from S&P 500 to MSCI World (NTR, GBP)
  1970–2024.** The S&P series was too optimistic for a typical UK user
  holding a global tracker (VWRL, FTSE Global All Cap, MSCI ACWI). The
  new series is a closer proxy and produces more realistic outcomes.
- **New Inflation slider (0–5%, step 0.1, default 2.5%) for both modes.**
  Each year's nominal return is converted to a real return via
  (1 + nominal) / (1 + inflation) − 1, and the withdrawal stays constant
  in today's pounds. The whole chart, deterministic line and summary
  stats are now in **today's money** (real terms). Set to 0% to model
  nominal returns.

---

## v1.0 build 019 — 2026-06-14

### Desktop app
- **Changelog button opens the changelog in the desktop build** instead of
  spawning a second copy of the main desk. The Electron renderer now handles
  the `#/changelog` hash route and mounts `ChangelogContent` directly.
- **Single-instance lock.** Launching the app while it is already running no
  longer opens a second window — `app.requestSingleInstanceLock()` releases
  the duplicate process and the `second-instance` event restores / focuses
  the existing window.

---

## v1.0 build 018 — 2026-06-14

### Bug fix
- **Monte Carlo "Sims beating your assumption" no longer lies when the pot
  depletes.** Previously, a withdrawal large enough to empty the fund made
  the deterministic dashed line go deeply negative while the simulated paths
  were floored at £0. Every sim then technically "beat" the projection,
  yielding a green "Conservative — most futures beat your assumption"
  headline on a clearly failing plan.
  - Deterministic projection is now floored at £0, same as the simulations.
  - New **Ruin rate** stat shows the % of simulated futures that ran out of
    money entirely.
  - When ruin rate ≥ 50% (or your own assumed-rate projection depletes),
    the headline switches to a red **"Plan unsustainable — X% of futures
    run out of money"** warning instead of the misleading "Conservative"
    label. Lesser depletion (1–49%) is appended as a "(X% deplete)" suffix
    on the existing optimistic/aggressive labels.
  - Help panel updated to explain the new ruin metric and the override.

---

## v1.0 build 016 — 2026-06-11

### New feature
- **"Can I Afford This?" Instant Impact Calculator.** New panel between the
  Monte Carlo Risk Simulator and the Ledger. User enters a one-off expense
  (new car, gift, holiday) and the panel instantly shows the impact on Total
  Capital, Drawdown vs ATH, Shield Runway, next Quarterly Wage (using the
  same Guyton-Klinger guardrail logic as the live directives) and Fun Bucket
  surplus. Funding source defaults to Cash-first then Equities, with a
  manual override to draw entirely from Cash or Equities. Hypothetical only
  — nothing is written to the ledger.
- Added `src/components/sovereign/AffordCalculator.tsx`, wired into
  `SovereignHorizonDesk.tsx`, build bumped to 016.

---

## v1.0 build 015 — 2026-06-11

### Bug fix
- **Age slider no longer jumps when editing Target Horizon Age.** Numeric
  inputs (Target Horizon Age, Desired Shield Runway, Annual Withdrawal,
  etc.) previously committed every intermediate keystroke. Typing `85`
  passed through `8`, which set `cappingAge = 8` and triggered the
  "keep age ≤ cappingAge" clamp — yanking the Age slider down to 8.
  `IntInput` now only commits values that fall within the configured
  `min`/`max`, and snaps out-of-range entries to the nearest bound on
  blur. The Age slider stays put when you adjust Target Horizon Age.

---

## v1.0 build 014 — 2026-06-11


### Documentation (fix)
- **Full Manual (static HTML) updated** — Build 013 added the dashed-line
  curvature explanation to the in-app `/help` page, but the **📖 Full
  Manual** button actually opens the static
  `public/sovereign-horizon-manual.html`, so the change wasn't visible
  there. The explanation is now added to that file as a callout in
  Chapter 23 ("Reading the fan chart"), covering: `next = prev × (1 + r)
  − withdrawal`, exponential compounding on a linear Y-axis, and how
  fixed-£ withdrawals tilt the curve up or down depending on the
  capital-to-withdrawal ratio.

---

## v1.0 build 013 — 2026-06-11

### Documentation
- **Full Manual updated** — Folded the dashed-line curvature explanation
  into the in-app Help / Full Manual under "Risk Simulator — Monte Carlo
  fan chart", so users see it alongside the rest of the chart-reading
  guidance (not only in the changelog). Quick start unchanged — it stays
  a 6-step orientation; the deeper "why" lives in the Risk Simulator
  section where it belongs.

---

## v1.0 build 012 — 2026-06-11

### Documentation / knowledge base
- **Why the dashed assumption line curves** — Added to the changelog record.
  The dashed line in the Monte Carlo Fan Chart is not straight because it
  reflects compounding growth *minus* annual withdrawals:

  `next = prev × (1 + r) − withdrawal`

  Compounding is exponential (each year's growth applies to a larger base),
  so even with zero withdrawals the line would curve upward. When withdrawals
  are introduced the curvature depends on the balance between the two forces:

  - High capital / low withdrawal → curves **up** (compounding dominates)
  - Low capital / high withdrawal → curves **down** (withdrawals dominate,
    and the decline accelerates)
  - Balanced → near-flat

  A perfectly straight line would only appear with simple (non-compounding)
  interest or a log-scale chart at zero withdrawals — neither reflects how a
  real portfolio behaves. The Monte Carlo percentile bands curve for the same
  reason; the dashed line is simply the deterministic version of the same maths.

---

## v1.0 build 011 — 2026-06-11

### New features
- **In-app changelog viewer** — A "Changelog" button in the header opens a
  dedicated page listing every build's changes, so you can see what's new
  without leaving the app.

---

## v1.0 build 010 — 2026-06-11

### Improvements
- **Header layout** — Title is now prominent and centred at the top of the page,
  with the version/build stamp directly beneath it. The action buttons sit on a
  second row below the title.
- **Button order standardised** — Quick Start, Full Manual, Back-Up, Restore,
  License, Exit (left to right).
- **New "Exit" button** — Closes the desktop window. In the browser it closes
  the current tab where the runtime permits.
- **Pane 1 label** — "Modeling Age" renamed to "Age".
- **Risk Simulator (Pane 5) — Annual Withdrawal**
  - Now seeds its initial value from *Target Annual Base Withdrawal* (Pane 1).
    The fields are not bound after that — change one freely without affecting
    the other.
  - Field is now a formatted GBP (£) currency input rather than a raw number.
- **Backup folder is remembered** — When the OS save dialog supports it
  (Electron / Chromium), the directory chosen on your last backup is reused as
  the starting folder on the next backup. Falls back to the standard browser
  download flow where the API is unavailable.

### Bug fixes
- **Backspace deletion in numeric inputs** — Target Horizon Age, Desired
  Shield Runway (months) and Annual Withdrawal £ now accept an empty value
  while editing. Previously, deleting the most-significant digit snapped the
  field back to its default, blocking left-to-right backspace edits. The
  field still reverts to a sensible default if you leave it empty on blur.

---

## v1.0 build 009 — earlier

- First Electron-packaged Windows portable release.
- Risk Simulator "How to read" inline help.
- Quick Start and Full Manual updated to cover the Monte Carlo Fan Chart.
- Percentile colour direction corrected so "majority of futures beat your
  assumption" reads green, not red.

## v1.0 build 008 and earlier

Not formally tracked — see Git history for context.
