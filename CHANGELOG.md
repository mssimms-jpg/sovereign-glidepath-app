# Sovereign Glidepath — Changelog

A running record of updates, improvements and bug fixes by build number.

Location: project root (`CHANGELOG.md`). Update this file every build.

## 1.0.133

### Fixed

- The 40-file QA scenario pool mixed two different UK inflation measures: 38 files were built on RPI, while the canonical 1996–2021 lifetime ledger scenario (and its aggressive pair) used CPI. All 40 files now use CPI, sourced from ONS's historical modelled CPI series (1971–2021) plus published ONS annual figures (2022–2025)
- This changed real computed outcomes, not just labelling: five aggressive/stagflation-era scenarios that previously reached Exhaustion under the incorrect RPI figures now complete successfully under correct CPI
- Every scenario file's `expected` checkpoints were regenerated against the real engine following the correction
- The standing 1996–2021 regression anchor moved from £2,007,282.02 to £2,006,221.98, reflecting a minor CPI data revision found while re-sourcing the canonical scenario's own inflation figures directly from ONS — not an engine change

## 1.0.132

### Added

- Quarterly Growth (%) column in ledger exports, derived from realised returns

### Changed

- CSV and XLSX exports now share a single row-builder (buildLedgerExportRows), eliminating drift risk between the two formats

### Fixed

- Withdrawal adjustment was being applied to the wrong row in the growth calculation; corrected and reverified against real 1996/1997 return data

## Version 1.0 build 131 — A new "potential underspend" signal, and three small fit-and-finish fixes

**Pane 2 now flags the opposite failure mode from the guardrails.** Everything the app already does — Preservation cuts, the Shield Runway, Prosperity bonuses — is aimed at not running out. Nothing previously said anything about the other real risk: dying with far more left over than intended, purely because the withdrawal rate never got revisited after an unusually strong run. A rolling study of 29 overlapping real historical UK/global 26-year windows (same real MSCI World + UK inflation data the QA scenario pool uses) found a genuinely clean pattern: every scenario that ended with a large surplus (4x+ the starting pot) had its realised withdrawal rate fall well below where it started by year 5, *and* the pot never fell more than ~10% below its starting value at any point — both conditions together, not either alone. Pane 2 now checks the real live ledger against exactly that pattern: a soft, deliberately hedged pre-notice at year 3 (the signal isn't validated that early), the real evaluation from year 5, and — if it keeps holding — a re-fire every year after with a running "Nth year" count, going silent again the moment either condition breaks. Both thresholds (currently 90% of original rate, 10% dip floor) are live-editable in the tile itself, not buried constants, since they came from a rolling window of one real history, not a large independent sample. Dismissing shows "Reviewed — check again next year" and genuinely waits a year, not just a page reload.

**Historical Timeline Ledger's chart (Pane 4) — axis labels no longer overlap into an unreadable smear on a long-running ledger.** Every quarter still gets its tick mark; past 8 years of history, only every other quarter gets a text label. The hover tooltip is unaffected either way — it resolves from mouse position directly to the nearest data point, never from which labels happen to be visible.

**The two bundled QA scenarios built from Mark's own real ledger are no longer personalised in the UI.** Relabelled "Typical Ledger" in the Scenario Test Runner's picker — same ★ marking, same underlying data, just not naming a specific person in a tool other people may end up using.

**Whole-pounds tooltip/axis fix (from the previous informal update) is now folded into a proper numbered build.** Risk Simulator and Accumulation Simulator chart tooltips, and the Accumulation Simulator's value-axis labels, show whole pounds instead of pounds-and-pence — fixes tooltip text overflowing its box. Everywhere else (ledger, forms, summary stats) is unchanged.

## Version 1.0 build 130 — Pane 7 gets a styled XLSX export

**"Download Ledger (CSV)" in Pane 7 now has a companion "Export as XLSX" button.** Produces a two-sheet workbook — a Summary & Assumptions sheet (live Pane 1 assumptions plus a Result section: row count, date range, any exhaustion, final total capital, final cumulative inflation index) and a Full Ledger sheet — styled to match a sample workbook built in an earlier session: navy header row, white bold wrapped text, frozen header row, currency and percentage number formats throughout. Deliberately does not clone that sample's exact column set: two of its columns (Annual Eq Return, Annual UK CPI) came from that specific scenario file's own year-by-year inputs, which only exist for a ledger built via the Scenario Test Runner — a hand-committed real ledger has no equivalent, since Pane 1's assumptions are live settings, not a per-row record of what actually happened in the market that quarter. Uses the same proven column set `exportSovereignLedgerCSV` already relies on instead, which is populated correctly for both real and scenario-built ledgers. The sample's dead last column ("Actual CPI to enter (%)", literally the placeholder text `(first row)` on every one of its 104 rows) is not reproduced at all.

**Built with ExcelJS, not the community `xlsx`/SheetJS package**, because real cell styling (fills, fonts, wrapped headers, number formats, frozen panes) needs it — a plain unstyled xlsx-writer can't produce any of the above. ExcelJS is imported dynamically inside the export function rather than at module scope: it's a large dependency (~500KB) needed only when someone actually clicks the button, and a static import was pulling it into the app's main bundle on every load, nearly tripling the desktop build's JS payload for a feature most sessions never touch. The dynamic import puts it in its own chunk, fetched once, on demand — desktop main bundle back down to its normal ~650KB with ExcelJS split out separately.

**The export function itself lives inside `csvExport.ts`, not a separate `xlsxExport.ts`.** Functionally it would have been cleaner as its own file, but that would have needed a Lovable prompt (new-file creation costs credit) rather than a free direct-editor paste — with credits tight, everything here went in as existing-file edits instead: one new line in `package.json`, the export function appended to `csvExport.ts`, and three small additions to `SovereignGlidepath.tsx` to wire it up.

## Version 1.0 build 129 — Scenario Test Runner gets a bundled scenario picker

**The Scenario Test Runner panel now has a dropdown of 40 pre-loaded QA scenarios** (20 base + 20 matched +1.5pp-aggressive pairs, spanning 1971–2025, all verified at 0 mismatches — see the pool described under Build 128), grouped into "Base" and "Aggressive" option groups and sorted oldest-era-first, alongside the existing "upload your own file" flow. Both paths — bundled and uploaded — now funnel through one shared `stageScenario()` so the ledger-backup-and-confirm behaviour is identical either way; picking a scenario from the dropdown never bypasses the same backup step a manual upload gets. The 40 files live as static JSON assets under `public/scenarios/base/` and `public/scenarios/aggressive/`, referenced by a small manifest (`scenarioManifest.ts`) rather than bundled into the JS — adding scenario #41 later is one manifest line plus dropping the file in, no other code changes.

**Two rendering bugs surfaced during real use and are fixed as part of this build, before it ever shipped documented as done.** First, selecting a new scenario from the dropdown without running it yet showed two different scenario names on screen at once — the newly-selected one in the dropdown, and a separate caption still showing whichever scenario had actually been run last. That caption has been removed entirely; the dropdown's own selection is the only place a scenario name needs to appear. Second, every `<select>` in the app — this dropdown and Pane 1's Currency picker — had no dark theme applied at all, only `<input>` did. The closed control looked dark-ish mostly by accident; the native options popup had no styling whatsoever, so with the app's light text colour inherited into an unstyled white popup, the option list rendered white text on a white background — unreadable. Fixed app-wide with one CSS rule (`color-scheme: dark` plus matching background/border/colour, mirroring the existing input styling), not a per-select patch. The dropdown itself is also now paired with a proper "Select scenario" label and full input-height sizing, rather than relying on the native chevron alone to signal it's interactive.

## Version 1.0 build 128 — Real MSCI World data, pension history, and a QA scenario pool

**The Risk Simulator and Accumulation Simulator's "Historical" mode was quietly running on approximate data.** `GLOBAL_ANNUAL` (the 1970–2024 MSCI World GBP series both simulators bootstrap from) had several pre-2000 years off by double digits — 1971 modelled as +31% vs. the real +12.43%, 1975 (the post-oil-shock snapback) modelled as +36% vs. the real +52.99%, 1990 modelled as −21% vs. the real −31.07%, understating that crash by over 10 points — despite the in-app "How to Read This" panel telling users it was drawing from real data. Post-2000 was a close match (evidently rounded from a real series already); the older years weren't. Replaced with the real series, computed directly from actual monthly index levels. Verified index-by-index against the source data: every one of the 55 years now matches to within 0.005pp (pure rounding).

**Two structural bugs in the Monte Carlo seeding were caught while verifying the fix, and both are fixed.** First: Historical mode's random seed always folded in the Parametric tab's mean/stdev fields, even though Historical mode never uses them to generate a return — so touching the _other_ tab's sliders silently reshuffled Historical mode's whole 10,000-path draw sequence with no visible cause. Historical mode's seed now depends only on {pot size, years, mode} — Parametric mode is unchanged, its own seed still depends on mean/sd (that's what gives its slider smooth deltas instead of a full reshuffle on every tweak). Second: the Parametric-mode mean/stdev defaults (7%/15%) were closer to the post-2000-only period than the real 55-year record — updated to 11.85%/17.8%, the real full-period arithmetic mean/stdev.

**`mulberry32`, `gaussian`, `quantile`, and the Parametric defaults were each duplicated byte-for-byte between the Risk Simulator and the Accumulation Simulator** — exactly the kind of drift risk that caused the data bug above, just in the "two copies, someone forgets one" direction. Consolidated into a new `monteCarloShared.ts`, both simulators now import from the single copy.

**Volatility (stdev) slider in the Accumulation Simulator stepped in 0.5% increments** while every other assumption-rate slider in the app — 12 of them — steps in 0.1%. Fixed to match.

**Editing an old ledger row's nominal figures used the wrong inflation reference point.** `nominaliseRequest()` always used the ledger's _most recent_ cumulative inflation index, regardless of which row was actually being edited — so opening a several-year-old entry showed "live nominal preview" and directive figures inflated all the way to your latest commit, not to that entry's own period. Now uses the specific row's own cumulative index when `editIndex` is set. The caption wording changes to match: "as of this entry's period" instead of "today" when editing history.

**Pension is now a genuine per-row snapshot, not a single global figure silently reapplied to every row you look at.** `LedgerEntry` gains `pensionAmount`/`pensionStartAge`/`pensionIncreasePct`, following the same pattern as the Build 095 growth/cash/inflation snapshot. This was caught live: editing a Scenario Test Runner row showed "Less pension in payment: £13,137.63" — the _live_ Pane 1 pension (£12,500/67/+1.0%) compounded forward to that row's age — when the scenario itself was built on a completely different pension (£5,503.33/65/0%). The row's own numbers were always correct; only the explanatory breakdown box was reading from the wrong source. Pension is treated differently from growth/cash/inflation on exit, deliberately: it's documented as "your real figures," a single ongoing truth the Risk Simulator and every new commit read live, not a per-quarter revisable assumption — so your live pension is protected from being overwritten by reviewing or correcting old history, restored after every exit from Edit (Discard, Exit, or a successful Commit). A genuine second bug surfaced testing this: Discard Changes was found to jump pension to today's live value instead of keeping the row's own — `editEntry()` already reloads the row's pension correctly, and the restore-on-exit logic was firing straight after it and clobbering that reload. Fixed by giving Discard Changes its own legacyTarget/currency-only restore, separate from the full restore Exit Edit uses. Legacy rows and rows whose pension differs from your live settings now show an inline indicator in Pane 1 so this is visible rather than silently swapped.

**Shield Target (£) and (Months) tiles in Pane 2 restored to status colour** (green/amber/red, the same `runwayColor` logic the Actual Cash Shield Runway tile already uses) after drifting to a flat blue across two prior cosmetic passes.

**Scenario Test Runner panel rebuilt off the app's actual dark-theme conventions.** It was built with Tailwind/shadcn utility classes that never resolved here — the app never applies the `.dark` class shadcn's theme needs, and `.btn-primary` was never defined at all — so it silently rendered as an unstyled light-mode card with a browser-default button inside the dark app. Also replaced the native `window.confirm()` before a ledger replace with the app's own modal: a native confirm can only show plain text, and the backup-filename callout and the "this backup is unencrypted" warning both needed bold/colour to actually stand out.

**A 20-scenario QA pool was built and verified** (real MSCI World GBP returns from an authoritative monthly series, real UK RPI inflation via ONS, both deflated to nominal-at-plan-start using the same convention the app itself uses for the Frozen Baseline), spanning 1971–2025, plus a matched +1.5pp-aggressive-withdrawal pair for each. All 40 files carry engine-computed checkpoints and verify at 0 mismatches. An earlier pass of these had pension anchored on the 2025/26 State Pension rate (£11,973) after that had already lapsed — corrected to the current 2026/27 rate (£12,547.60) and every affected file's checkpoints regenerated.

## Version 1.0 build 127 — Lifestyle-change slider, and Shield Target moves to Pane 2

**New: a −30% to +30% lifestyle-change slider under the Initial Annual Withdrawal field.** Previously, applying a "genuine lifestyle change" meant retyping the figure by hand, working out the new nominal amount yourself. The slider does that arithmetic live — but the harder design question was what 0% means. It's anchored to the last _committed_ baseline, not wherever the field currently sits: dragging to +15% always means 15% above what was actually last committed, regardless of how many times the slider has already been dragged this session, so repeated drags can't silently compound. That baseline is captured at every Pane 1 load or revert moment — app boot, entering Edit mode, Cancel/Discard, and the re-seed after deleting the newest ledger row — never by the slider itself. Typing directly into the field still works exactly as before; it just repositions the slider to match. The slider's thumb is visually clamped at ±30%, but the field itself, and the % readout above the slider, accept and display values outside that range without complaint.

**Caption and live nominal preview rewritten to match.** The old caption said "Set your desired standard of living once"; it now points at the new slider directly. The live preview footnote dropped its worked-example walkthrough (a 20%-rise arithmetic explainer) since the slider now demonstrates the multiplier itself, live, rather than in words.

**Removed the Request: / Shield Target: line from Pane 1.** Mark's call — stale once a plan's been running a while, and duplicated by the diagnostics below.

**Added Shield Target (£ and Months) to Pane 2's diagnostics row**, directly under Total Capital / Peak Drawdown / Fun Bucket Balance — the same £ figure that used to live on the removed Pane 1 line, alongside its months figure for the first time. Split into two tiles rather than one combined tile so the type scale stays consistent with the row's existing pattern; sized down from the primary three (1.3rem vs. 1.75rem) since these are supplementary figures, not the pane's headline numbers. The months figure shown is the phase-adjusted target (`modifiedTargetMonths` — capped at 24 months in Go-Slow, 12 in No-Go) rather than the raw runway setting, so it always matches the £ figure it sits next to.

Verified against the real 1996–2021 lifetime ledger: 104 rows, £2,007,282.02, 0 mismatches — unchanged from Build 126, as expected, since none of this touched `engine.ts`. `tsc`, web build, and desktop build all clean throughout.

## Version 1.0 build 126 — Empty-pot fix, the Scenario Test Runner, and a much smaller codebase

**Fixed a real bug: three directive states could tell you to withdraw from a pot that was already empty.** Comfortable Amortization, Normal Draw, and No-Go Amortization all pick their funding bucket purely from the Defensive-Draw Mode recommendation, with no check that the recommended bucket actually holds enough — unlike Preservation and Shield Deficit, which have that check built into their own trigger conditions. Building a real 26-year lifetime ledger surfaced this directly: a real quarter's directive said _"Withdraw £13,326.71 from the Cash Pot"_ when the Cash Pot held nothing, and had held nothing for nine years. The three affected branches now check the real balance (not the hypothetical Scenario Stress Test preview, which was deliberately excluded from the check) before naming a source, and fall back to the other bucket with an explicit note — _"the Cash Pot does not currently hold enough to cover this — funding from Global Equities instead"_ — rather than silently instructing something impossible.

**Fun Bucket Balance is now recorded on every ledger row**, not just shown live in Pane 2 — a purple sub-line under Portfolio Total in the table, and its own CSV column. Legacy rows committed before this build correctly show blank rather than a fabricated backfilled figure.

**New: the Scenario Test Runner** (hidden QA panel, double-click "7. Historical Timeline Ledger" to reveal). Upload a JSON file — starting balances, plan parameters, and a year-by-year sequence of real returns and inflation — and it builds a complete, real ledger in seconds, calling the exact same `calculate()`/`generateDirectives()` functions the live app uses for every row, not a re-implementation. Optional `expected` assertions in the file get checked against the actual result and every mismatch is reported, not just the first. Because running a scenario replaces the current ledger, any existing ledger is auto-backed-up as a plain JSON download (restorable via the normal Restore button) before the replacement is confirmed. Verified against a real hand-built 26-year ledger (1996–2021, real historical MSCI World returns and real UK CPI): £2,007,282.02 from the tool against £2,007,282.03 built by hand, row by row, in the live app — a penny of floating-point rounding across 104 quarters.

**Rewrote the lifestyle-change guidance on the Frozen Baseline field**, after a mix-up over which figure a "20% rise" multiplier should apply to. The caption now names the input box directly rather than "the frozen baseline," explicitly says not to scale any other figure shown elsewhere on screen, and states plainly that the State Pension is deliberately excluded from the multiplier — a fixed external income, not a lifestyle choice, netted off separately by the engine after the edit is made.

**Ledger table given a visual pass** — zebra striping and a hover highlight on a table that had neither, making a long ledger easier to track a row across.

**Under the hood: `SovereignGlidepath.tsx` split from 5,038 lines down to 2,111** (58% smaller), across nine new files (modals, the ledger table, Pane 3 and its chart, the commit-confirmation review screen, shared form inputs, and Panes 1 and 2 themselves). Every extraction kept state exactly where it already lived — a pure relocation of markup, never a change to who owns what — and every step was checked against the same real 1996 scenario before moving to the next: `tsc`, both web and desktop builds, and a full 104-row regression run, all unchanged throughout. No user-facing behaviour changed; this was purely to make the codebase easier to work in going forward.

## Version 1.0 build 125 — Realised Inflation Tracking, and a genuine one-number directive

**Realised Inflation Tracking** — the live directive has always spoken in real terms (today's money): the withdrawal target stays flat, and the model deflates portfolio returns rather than inflating the withdrawal. That was internally consistent, but the pound figure on screen was never the actual nominal amount to withdraw in cash — the user had to do that translation themselves, with no help from the app.

- **New per-row field**: an optional "Actual CPI since last entry" — entered freely each quarter, or left blank to fall back to the assumed CPI slider (pro-rated for the real elapsed gap, not assumed to be a full year).
- **New Pane 2 section**: cumulative realised-inflation index, implied average annual rate, and a "View realised-inflation history" table showing every tracked row, its rate, source (actual vs assumed), and running index.
- **The directive (Pane 3) now shows genuine actual pounds.** Every action figure — the main draw, sweep-to-shield amounts, deploy-to-equities amounts, Guyton-Klinger overlay figures — is converted through the realised index before display, so there's exactly one number to act on per instruction, not a real-terms figure and a nominal figure competing for attention. The real-terms baseline appears only as a small reference footnote, explicitly stating it never needs manual updating.
- **Withdrawal Recorded now auto-seeds with the same nominal figure the directive shows** (previously it silently seeded from the real-terms figure, which could quietly diverge from what the directive actually told the user to withdraw — caught via a live walkthrough, not spotted by inspection).

**Field renamed for clarity**: "Target Annual Base Withdrawal" is now **"Initial Annual Withdrawal — Frozen Baseline"**, with an explanatory caption and a **live nominal preview** that updates as you type — including a worked example showing a genuine lifestyle change (e.g. a 20% rise) is a straight multiplier on the frozen figure, never a guess at a nominal number.

**Documentation**: build-number references stripped from the Quick Start guide and Full Manual (three "Recent additions (Builds X–Y)" chapter parts retitled thematically); a new Quick Start section explains the Pane 2 Scenario Stress Test slider is a lightweight, local, single-hypothetical preview — distinct from the standalone Risk Simulator companion app, a distinction the guide previously left unclear; field-name references propagated across all four guide files.

- **Accumulation Simulator now has its own manual**, matching the Risk Simulator and Comparison Builder guides in style and structure — the same layered chapters, the same appendix format. The "User Guide" button on the Accumulation Simulator, previously unwired, now opens it.
- **The Risk Simulator's "Back to…" link now correctly reads "Back to Accumulation Simulator"** when opened that way, in every case — an earlier attempt at this fix was accidentally reverted by a later, unrelated edit; this build carries the corrected version, verified end-to-end through the actual hand-off flow rather than just checking the code.
- **Fixed a real page freeze.** Both the Risk Simulator and the Accumulation Simulator ran their 10,000-path simulation synchronously, which could block the whole page for 200–580ms every time an input settled — long enough to feel like the tab had hung, with nothing on screen to say otherwise. Both now defer the calculation and show a small "Recalculating…" indicator while it runs, confirmed actually visible on screen (an initial attempt at this fix silently failed to show anything, despite looking correct — caught only by testing it directly rather than trusting the code).
- **Fixed a data-loss risk on exit.** Ledger writes are encrypted and queued asynchronously; closing the tab an instant after an edit could lose that edit before it finished writing. The app now asks the browser to flush any pending writes when the tab closes.
- **Fixed a mislabelled CSV export column.** "Realised Withdrawal Rate" was actually your _target_ rate, not what was genuinely drawn — renamed to "Target Withdrawal Rate" to match what it's always computed.

## Version 1.0 build 123 — Accumulation Simulator

A new companion app: the **Accumulation Simulator**. Shows how a pot could grow from an early starting age to a chosen retirement age across 10,000 possible market paths — aimed at demonstrating the value of starting early to family members who aren't near retirement themselves. Launches from Pane 2's Companion Apps section with its own sensible starting defaults, not your live plan figures.

- **Core engine.** Single-pot compounding model (no equities/cash split at this stage — a young saver isn't managing a cash buffer decades out). Historical (real MSCI World sequence, same dataset as the Risk Simulator) and Parametric modes, monthly contributions with an optional annual real increase, and an Assumed Real Growth Rate slider independent of the Parametric mean — mirroring the Risk Simulator's own field separation.
- **Interactive fan chart.** Hover crosshair and tooltip showing the P10/Median/P90 spread and the assumed-rate line at any age, plus a drag-to-zoom brush beneath the chart — both ported from the Risk Simulator's own chart.
- **Sticky by design.** Every field on the page persists across navigation (leaving for the Risk Simulator and coming back, or leaving the app entirely) — there's no "real plan" behind this tool the way the Risk Simulator has, so everything here is meant to remember itself.
- **Move to Risk Simulator.** A single button opens a confirmation window — set your desired retirement income, State Pension age and amount, and choose whether the projected Median or Assumed Growth Rate value becomes your starting pot. The review updates live as you edit, and confirming opens the Risk Simulator pre-filled, with the pot split 15% cash / 85% equities (freely adjustable once there, like everything else handed over).
- **Currency-prefixed money fields**, matching the treatment already used elsewhere in the app.

Risk Simulator also picked up several improvements alongside this:

- **Horizon Age is now its own editable what-if field**, seeded from Pane 1 and freely adjustable, same pattern as Current Age.
- **Tooltip now shows the annual drawdown**, and once State Pension has started paying, the reduction it makes to what's actually drawn from the pot.
- **Tooltip now shows an approximate Fun Bucket figure** (in purple, matching Pane 2's own Fun Bucket styling) — a rough equivalent of Pane 2's surplus calculation, using the tool's own Assumed Rate as the discount rate since there's no per-year bucket split or Legacy Target input to draw an exact blended rate from here.
- **Fixed a tooltip/crosshair misalignment** on both fan charts, caused by the chart's fixed aspect ratio not matching its actual on-screen size.

Smaller polish:

- **Companion Apps reordered**: Accumulation Simulator, Risk Simulator, Comparison Builder.
- **The Risk Simulator's "Back to..." link is now dynamic** — correctly reads "Back to Accumulation Simulator" when opened from there, "Back to Sovereign Glidepath" otherwise.
- **Fixed a routing bug** that could 404 the Risk Simulator in a production build (Lovable Publish and, very likely, Cloudflare) despite working fine in the dev server — caused by the route file exporting its page component directly rather than through its own file, which broke code-splitting.

## Version 1.0 build 122 — Currency now follows through to the companion apps

- **Risk Simulator: field values now match your selected currency, not just the labels.** The simulator's actual input values, "Reset to actual" links, and fan chart bands were still hardcoded to £ regardless of your Pane 1 currency choice — a leftover gap in the currency plumbing added in Build 121.
- **Risk Simulator: launch link now carries your currency choice.** Previously only your figures were handed over; the simulator always opened defaulting to £.
- **Comparison Builder: fully currency-aware for the first time.** Labels, input prefixes, results, the trajectory tooltip, and the downloadable Excel workbook (column headers and cell formats) all now follow whichever currency is set on Pane 1, instead of being fixed to £ throughout.

## Version 1.0 build 121 — Comparison Builder fixes, desktop hand-off fix, editable simulator age

- **Comparison Builder: clicking a year in the results chart and the "Download Excel Workbook" button both work again.** A stray out-of-scope variable reference in a top-level script statement threw on every comparison run, which silently prevented every event listener declared later in the file from ever registering — so both controls looked alive but did nothing.
- **Risk Simulator: your live plan figures now reach the simulator in the desktop app.** A query-parameter helper had been added but never actually wired in, so in the desktop's hash-routed window it kept reading an empty value and the simulator opened unseeded.
- **Risk Simulator: new editable "Current Age" field.** Seeded from your live plan but freely editable — useful for modelling the same plan at a different age, or for someone else entirely. It carries the usual "✎ what-if" badge and a "Reset to actual" link, and never writes back to your real plan.

## Version 1.0 build 119 — Tidy-up: growth rate label in Pane 1

- **Cleaner label.** The "Assumed Real Growth Rate" slider in Pane 1 no longer carries the "Shown on chart as" dashed-line cue — that hint belongs beside the fan chart's own legend in Pane 5, where it stays.

## Version 1.0 build 118 — Companion Apps: Comparison Builder, launched with your live figures

- **New "Companion Apps" section** at the foot of Pane 2 (Intelligence Diagnostics), a home for spin-off tools that sit alongside the main dashboard.
- **First companion: "📊 Compare vs 4% Rule (Historical)"** — the Comparison Builder backtests your plan against every real rolling retirement since 1928 using the same Guyton-Klinger engine as this app, alongside a faithful classic 4% Rule replica.
- **Your live Pane 1 figures are handed over automatically** — equities, cash, age, horizon, gross target withdrawal and (if configured) your state pension. No re-typing, and the comparison runs against them on open. If no pension is set, the tool runs both models with none.
- **The Comparison Builder's own "📖 User Guide" button now works** — its guide document is shipped with the app for the first time.
- Opening the Comparison Builder directly, with no plan attached, still falls back to its editable example values.

## Version 1.0 build 117 — App-Lock: real encryption for your data at rest

- **New App-Lock passphrase.** On first launch you set a passphrase (minimum 8 characters). Your ledger, your saved settings and your licence details are encrypted on this device with **AES-256-GCM** — authenticated encryption, so tampering is detected, not just scrambled.
- **Nothing loads until you unlock.** The dashboard does not mount at all until the passphrase has been verified and the data decrypted, so ledger figures never render behind a dismissible overlay.
- **The passphrase cannot be recovered.** There is no reset, no backdoor and no recovery — the setup screen makes you tick to confirm you understand this before continuing.
- **Existing installs migrate automatically.** Any data already stored in plain text is encrypted in place the moment you set your passphrase. Nothing has to be re-entered, and the migration is crash-safe: if it is interrupted it completes on the next unlock.
- **Backup files are now genuinely encrypted.** Exported `.shd` backups use AES-256-GCM with a key derived from your export password, replacing the old XOR obfuscation (which was reversible without the password). Older XOR backups still restore, read-only.
- **New "🔑 Passphrase" button** in the header row re-encrypts everything under a new passphrase after verifying the current one.
- Under the hood: scrypt key derivation on the desktop app (via a minimal, locked-down Electron bridge), PBKDF2-SHA256 at 250,000 iterations on the web. Fresh random salt per install and a fresh random nonce per write. The passphrase and the derived key are never written to disk.

## Version 1.0 build 116 — Dashed-line cue matches the chart legend; clearer Allocation Bias reset link

- **The dashed-line cue beside "Assumed Real Growth Rate" now reuses the Fan Chart legend swatch exactly** — same bright `--text-main` colour, same 30px 3px-dashed pattern — instead of a fainter, shorter custom SVG.
- **A short lead-in phrase, "Shown on chart as", now precedes the swatch** in both Pane 1 and Pane 5, so the label reads as a direct pointer to the chart line.
- **"Reset split to actual" is now "Reset to starting split & actual values"**, making clear it restores the underlying Equities/Cash figures as well as the percentage. Text only — no behaviour change.

## Version 1.0 build 115 — Growth sliders reach 20%; clearer Fan Chart vs. dashed-line labelling

- **Build stamp corrected.** Build 114 shipped without bumping `package.json`'s version, so the auto-derived stamp still read 113. The derivation was fine; the version bump was missed. Bumping `package.json` is now an explicit, checked release step alongside this changelog.
- **Assumed Real Growth Rate now spans 0–20%** in 0.1% steps, in both Pane 1 and the Risk Simulator (Pane 5). Deliberate headroom for optimistic stress-testing.
- **"Parametric" mode is now "Parametric Fan Chart"**, and its two inputs read "… % (Fan Chart)", making clear they drive the random 10,000-path fan rather than the deterministic reference line.
- **Dashed-line icon** beside "Assumed Real Growth Rate" in both panes — it affects only the dashed Assumed Rate line and the Defensive Draw Threshold hurdle.
- **Effect-based tooltips** added to the two Parametric fields, Assumed Real Growth Rate and Cash Real Return.

## Version 1.0 build 114 — Simulator Guide button; Annual Pension field types normally

- **New "📊 Simulator Guide" button** sits between Full Manual and Back-Up in the header row and opens the Risk Simulator companion ebook (`/sovereign-glidepath-simulator-guide.html`) in a new tab, using the same open behaviour and styling as Full Manual.
- **Annual Pension input fixed.** It parsed and reformatted every keystroke (typing "1" became "1.00"), forcing the cursor to the end and breaking backspace. It now stores the raw string while editing, like every other money field, and the numeric value is derived with the same `cleanNum()` helper — no change to the pension-netting or guardrail calculations.

## Version 1.0 build 113 — Build stamp automated; negative pots blocked; exhausted portfolio no longer reports "Prosperity"

- **The in-app build stamp is generated at build time** from `package.json`'s version (via a Vite `define`), so it can no longer drift behind the release as it did through builds 111 and 112.
- **Negative pot values are rejected at the input layer.** Global Equities, Cash and All-Time High fields strip minus signs as you type and clamp on blur — a real bucket cannot hold a negative balance.
- **Exhaustion guard.** When Total Capital is zero or less with a live spending target, the withdrawal rate was silently treated as 0%, which trivially satisfied the Guyton-Klinger Prosperity test and reported "Prosperity Bonus (+10%)" on an empty portfolio while the Guardrail State said "Preservation". Guardrails are now switched off in that case, Withdrawal Status reads "Portfolio Exhausted", and the Pane 3 banner shows the canonical **Shield Deficit / Exhaustion** state — all three agree.
- **No change to normal scenarios** — the guard only engages when total capital is ≤ 0.

## Version 1.0 build 112 — Cash Real Return reaches "Can I Afford This?"; State Test Presets are now self-contained

- **Pane 6 now uses your live Cash Real Return.** The "Can I Afford This?" calculator never received the Cash Real Return slider, so the engine silently fell back to a hard-coded 1.0%. Its Fun Bucket (Surplus) now matches Pane 2 exactly for the same inputs. It also now receives the plan baseline and State Pension details, so every figure is computed from identical assumptions.
- **State Test Presets carry their own Guyton-Klinger baseline.** The Prosperity (+10%) reference was read from the real ledger's oldest committed row, so on a plan with history preset 6 could never show Prosperity — and presets 1, 2 and 4 could spuriously show it. Each preset now injects a matching baseline and produces its documented result regardless of ledger history; leaving preset mode restores the real plan baseline.
- **Corrected a stale code comment** in `defensiveRec.ts`: the inflation figure comes from Pane 1's own Inflation / CPI Assumption slider, not the Risk Simulator's setting. No calculation change.

## Version 1.0 build 111 — Deterministic "Assumed Rate" line now uses the shared drawdown engine

- **The dashed Assumed Rate line runs through `applyPeriod()`** — the same shared function used by the 10,000 Monte Carlo paths and Audit Mode — driven by a flat (deterministic) return sequence.
- **Depletion is now real.** The old hand-rolled loop always drew from equities and clamped a negative equity balance to zero, silently deleting the shortfall and leaving an untouched cash pot that appeared to _grow_ after the plan had actually failed. Shortfalls now spill correctly into cash and the line reaches zero.
- **Guyton-Klinger guardrails now apply** to the deterministic line (±10%, still switched off in the No-Go phase), as they always have for the stochastic paths.
- **Tick mode is now respected** — the deterministic line steps four times a year in Quarterly mode instead of ignoring the setting.
- **Extraordinary inflows re-anchor the deterministic ATH**, matching the stochastic paths.

## Version 1.0 build 110 — Fan chart tooltip: Assumed Rate split onto two lines

- **"Assumed Rate" is now its own label line** with its value right-aligned in the same column as the 90th percentile, Median Path and 10th percentile values.
- **"(blended, real): X.XX%" moved to a smaller muted sub-line** directly beneath the label.
- **Chart legend unchanged** — still a single static line reading "Assumed Rate (blended, real)", consistent with the tooltip's wording.

## Version 1.0 build 109 — Fan chart tooltip edge-aware positioning

- **Tooltip keeps a fixed 280px width** and no longer shrinks or wraps when hovering near the right edge of the fan chart; all lines render on a single line (`white-space: nowrap`).
- **Flip-left positioning:** the tooltip now measures the real container width and renders to the LEFT of the cursor as soon as there isn't room to its right, including at the exact rightmost data point.
- **Shortened assumed-rate line** to "Assumed Rate (blended, real): X.XX%", applied identically to both the tooltip and the chart legend so they continue to match.

## Version 1.0 build 108 — Ledger row left-column restructure and simpler event labelling

- **Normal rows now read as three lines:** "Age XX · Horizon Age XX", then the phase badge (with any state badge such as the Withdrawal Status alongside it), then "Date committed: YYYY-MM-DD".
- **Special Event / Windfall rows skip the Age/Horizon line entirely** — badge + description, then the phase/state badge line, then "Date committed:".
- **State badges share the phase badge's line** and wrap onto their own line automatically only when the text is too long for the column.
- **Purple event badge simplified** to exactly "★ Event: Inflow" or "★ Event: Outflow".
- **Event title line now shows only the user's own description** — the redundant "EVENT:" / "SPECIAL:" prefixes are stripped on display, including on rows committed by earlier builds.

## Version 1.0 build 107 — Ledger row tidy-up

- **"Horizon Age" and its value now sit on one line** (previously "· Horizon" with the age wrapping to the next line).
- **Duplicate guardrail-state badge removed** from the left-hand badge row — the same guardrail/execution-rule text already appears in the Status & Controls column. Phase badges and the Withdrawal Status badge are untouched.
- **Windfall / Extraordinary Inflow rows** now read simply **"Extraordinary Inflow"** in Status & Controls (dropped "— ATH Re-anchored").
- **Del button on event rows** now aligns horizontally with the Del button on Normal rows.
- **Withdrawal Recorded (Normal rows)** now shows the total on its own line with the "Eq … / Cash …" breakdown on a muted second line. Special Event and Windfall formatting unchanged.

## Version 1.0 build 106 — Event rows are Delete-only, and Pane 1 refreshes after a delete

- **Edit button removed from Special Event Withdrawal and Windfall / Extraordinary Inflow ledger rows.** Those rows routed through Pane 1's generic Normal-entry editor, which mis-mapped their fields, wrongly raised the "assumptions not recorded (pre-Build 095)" warning, and corrupted the row on save (lost Period End Date, lost purple event styling, row sank to the bottom). They now offer **Del** only — delete and re-commit to correct one. Normal rows keep both Edit and Del, unchanged.
- **Bug fixed — Pane 1 went stale after deleting the most recent ledger row.** This was a general delete-handler gap (it affected Normal rows too, not just event rows): `deleteEntry` rewrote the ledger but never re-seeded Pane 1. It now re-derives Equities, Cash, ATH, Age and Annual Withdrawal from the surviving newest row, exactly as the boot bootstrap does — no page refresh needed. Deleting an older row correctly changes nothing in Pane 1, since every row is an independent snapshot and Pane 1 only ever mirrors the newest one.
- **Edit-mode index kept in sync** when a row is deleted while Pane 1 is in Edit mode.

## Version 1.0 build 105 — Pane renumbering (Extraordinary Inflow = 7, Ledger = 8) and segmented Destination control

- **Extraordinary Inflow panel is now numbered:** its header reads **"7. Extraordinary Inflow — Windfall / Property Sale / Inheritance"** (it was previously unnumbered).
- **Historical Timeline Ledger renumbered 7 → 8.**
- **Stale cross-references checked:** no other live-app text (help pages, tooltips, CSV export metadata) referenced "Pane 7" by number, so nothing else needed changing. Historic changelog entries were left as written.
- **Destination Pot dropdown replaced by a segmented button pair** (Equities / Cash) using the exact styling of Pane 6's _Source_ buttons, and relabelled **"Destination"**. Pane 6's third "Cash first" option is deliberately not offered here. No change to the inflow or ATH re-anchoring logic.

## Version 1.0 build 104 — Field-height match, inflow currency formatting, caption trim

- **Parametric number fields** now inherit the compact input styling used elsewhere in Pane 5, so they match the height of the Pension Amount / Start Age fields beside them (both 29.3px, verified live).
- **Bug fixed — Pane 5's Future Extraordinary Inflow _Amount_ field** now uses the app's standard currency formatting (`£125,000.00`) on blur, with the raw number shown while editing.
- **Pane 1's Inflation / CPI Assumption caption** shortened to "— used by the Pane 3 directive to deflate the annualised return."

## Version 1.0 build 103 — Blended assumed-rate fix, pension currency formatting, Pane 5 top-of-pane reshuffle

- **Bug fixed — the fan chart's dashed "Your Assumed Rate (blended, real)" line was not blended.** It followed the equity Growth slider alone, so moving Cash Real Return had zero effect on it despite the label. It now uses the **same pot-weighted formula as Pane 2's Actuarial Amortization Matrix**: `(equities × equityReturn + cash × cashRealReturn) ÷ (equities + cash)`, using the simulator's own (possibly overridden) pot sizes. Verified live: £850,000 equities @ 4.0% + £150,000 cash @ 1.0% now reads **3.55%**, and both the tooltip and the legend show the identical figure.
- **Pane 1's Annual Pension field now uses the app's standard currency formatting** (`£12,700.00`), matching every other money field — it previously displayed a raw unformatted number.
- **Pane 5 section order finalised:** mode toggles → Parametric fields + Pension block → Annual Withdrawal / Global Equities Pot / Cash Pot and their three sliders → Defensive Draw Threshold → fan chart → stats footer (with _About these figures_ beside Ruin rate) → Allocation Bias → Future Extraordinary Inflow.
- **Parametric fields stack vertically** (Expected Annual Equity Return above Return Volatility) so the longer label no longer makes one field taller than its neighbour.
- **Pension block compacted:** the Real Increase % slider is narrower and now shares its row with the **Actual Pension / Hypothetical** toggle pair, reduced to the app's smallest button size.

## Version 1.0 build 102 — Naming, captions and Pane 5 layout

- **"Global Equities Pot"** used consistently for that input's label in both Pane 1 and Pane 5; no other usage of "Equities" / "Global Equities" was altered.
- **"(after-inflation)" captions** added under Pane 1's Assumed Real Growth Rate and Cash Real Return sliders, matching Pane 5's existing caption style.
- **Fan chart tooltip and legend reconciled** on one name for the dashed line, and the tooltip now shows which mode (**Parametric** / **Historical**) produced the figures.
- **Parametric fields renamed** to _Parametric Expected Annual Equity Return %_ and _Parametric Return Volatility (Standard Deviation) %_.
- **Parametric + Pension share one row**; Pension's Real Increase % slider regrouped with its own block. In Historical mode the Pension group expands to the full row width.

## Version 1.0 build 101 — Risk Simulator Growth & Cash Real Return sliders fully independent

- **Deliberate design change (not a bug fix).** Pane 5's **Assumed Real Growth Rate** and **Cash Real Return** sliders are no longer live-mirrored with Pane 1. They are now fully independent what-if controls handled exactly like Inflation / Escalation: plain local state persisted with the pane's own settings, seeded from Pane 1 only on very first use, never written back.
- **No "diverged from Pane 1" indicator** on these two sliders — the concept no longer applies. Pension Real Increase's seed-then-diverge pattern and the Annual Withdrawal / Equities / Cash Pot **what-if + "Reset to actual"** pattern are untouched.
- **Captions rewritten** in the plain Inflation / Escalation style with no reference to Pane 1.
- **"About these figures" relocated** into the stats footer row, beside Ruin rate.
- Pane 1's sliders and the live dashboard's guardrail maths are unchanged.

## Version 1.0 build 100 — Build 099 verified live; stale preview-bundle incident

- **Root cause found.** All of Build 099's code changes (Pane 5 reorder, Allocation Bias compaction, Inflow **Destination** selector, **About these figures** button, corrected mirrored-slider captions, help-content updates and the build-099 changelog entry) were correctly written to disk and committed. The **preview dev server kept serving a stale transformed copy of `MonteCarloPanel.tsx`** from its module cache, so the browser rendered the pre-099 pane no matter how hard it was refreshed — a browser-side hard refresh cannot defeat a server-side stale transform. Only the Pane 1 pension relocation appeared to land because that change lives in `SovereignGlidepath.tsx`, which was re-transformed normally.
- **Fix:** the dev-server module cache was cleared and the server restarted, after which every Build 099 change renders. No application code needed re-writing.
- **Independently re-verified in the live rendered app** (headless browser, seeded ledger row): section order is inputs → sliders → Defensive Draw Threshold → fan chart → percentile stats → Allocation Bias → Future Extraordinary Inflow; the Inflow shows a **Destination** Equities/Cash segmented selector and no 50/50 wording; **About these figures** sits beside the stats panel with the methodology text hidden behind it; the Growth and Cash Real Return captions now read "Same value as Pane 1 — moving either moves both…"; the Quick Start Guide describes the pane as it now stands.
- **Process change:** future builds are verified against the rendered app, not just the written source, before completion is reported.

## Version 1.0 build 099 — Pension inputs move to Pane 1; Risk Simulator reordered and compacted

- **Pension inputs relocated to Pane 1.** Annual Pension, Pension Start Age and Pension Real Increase are now entered in Pane 1, directly beneath Target Annual Base Withdrawal — the same place the netting is displayed. This is the single real, app-wide source; Panes 2, 3 and 5 all read it.
- **Pane 5 pension is now read-only by default,** with a **Use real pension details / Hypothetical** switch. "Real" reads Pane 1 live. "Hypothetical" seeds once from the real values, then runs fully independently and is marked with the amber `✎ what-if` flag — it never writes back to Pane 1. The switch state persists; hypothetical values do not.
- **Pane 5 reordered** to read top-to-bottom in use order: inputs → sliders → Defensive-Draw Threshold → fan chart → percentile stats → Allocation Bias → Future Extraordinary Inflow.
- **Allocation Bias compacted** — title, live split and the "Reset split to actual" link now share one line, and the total-pot note sits inline with the slider.
- **Future Extraordinary Inflow compacted and extended** — the description now sits on the title line, and a new **Destination** selector (Equities / Cash) replaces the old hard-coded 50/50 split in both the Monte Carlo and the deterministic projection. ATH re-anchoring is unchanged.
- **Methodology caption moved behind an About button** next to the percentile stats, reclaiming the full-width footer.
- **Stale slider captions fixed.** "mirrored with Pane 1" now states the actual relationship: the Growth and Cash Real Return sliders are genuine two-way mirrors of Pane 1's globals, and while a ledger row is open in Edit both show that row's stored assumption.
- Quick Start Guide "How to read this" updated for every change above.

## Version 1.0 build 098 — Withdraw-then-grow across every forward projection

- **Convention change (deliberate).** All forward projections used `End = Start × (1 + r) − Withdrawal` (grow-then-withdraw). They now use **`End = (Start − Withdrawal) × (1 + r)`** (withdraw-then-grow): the draw is taken from the balance as it is actually known when the decision is made, and only the remaining balance is exposed to that period's return. This matches real retirement behaviour and the convention used by most other planning tools.
- **Locations fixed:** (1) `applyPeriod()` in `drawdown.ts` — Monte Carlo, Audit Mode and historical cohorts; (2) the Risk Simulator's deterministic "your assumption" dashed-line projection in `MonteCarloPanel.tsx`; (3) Pane 2's Comfortable Amortization baseline need in `engine.ts`, which was an ordinary-annuity present value and is now an **annuity-due** (× (1 + g)) to match start-of-year withdrawals.
- **Not affected (checked):** `defensiveRec.ts` (measures a trailing, already-observed return), the Can-I-Afford-It calculator (single-point impact, no projection), and the pension escalation helper.
- **Worked example** (£500k equities / £100k cash, £6,000/quarter, quarterly returns −9%, −7%, −1.5%, −4%, +1%): the Preservation guardrail used to fire at Q4 (WR 4.8058%); it now correctly reads Normal at Q4 (WR 4.7962%) and first fires at Q5 (WR 5.0144%).
- **No threshold or sourcing change.** Guyton-Klinger trigger percentages, Build 089's No-Go gate and Build 090's trailing-drawdown bucket sourcing are all untouched — only the order of operations within a period changed.
- **Historical outputs will differ.** Every previous Monte Carlo, Audit and backtest result now produces different, more realistic numbers. This is intended.

## Version 1.0 build 097 — Risk Simulator slider responsiveness (debounced Monte Carlo)

- **Performance fix.** Every Risk Simulator input (Expected Return %, Volatility %, Allocation Bias, Cash Real Return, Inflation / Escalation, Pension Real Increase, Assumed Real Growth Rate, Horizon, Defensive-Draw Threshold, Historical/Parametric, Yearly/Quarterly tick, pot and withdrawal overrides, extraordinary inflow) was wired straight into the `sim` memo's dependency list, so a full **10,000-path** re-run fired on every intermediate `onChange` during a drag. Build 080's increase from 2,750 → 10,000 paths made this noticeable, most of all in the dev/preview environment.
- **Fix:** the sim inputs are collected into a single object and passed through a new `useDebouncedValue()` hook with a **180 ms trailing delay**; `sim` now depends only on that debounced snapshot. The heavy re-run therefore happens once after the user stops moving a control.
- **Slider responsiveness is unchanged:** handles and their numeric labels still bind to the raw state and update immediately during the drag — only the chart and percentile stats settle a moment later.
- **No maths change.** Identical inputs produce identical results; the seeded PRNG path is untouched.

## Version 1.0 build 096 — Exit Edit / New Entry now resets the three per-row assumptions

- **Follow-up to Build 095.** `restorePreEditSliders()` was narrowed in 095 to cover only Legacy Target and Currency, which left a gap on the **Exit Edit / New Entry** path: `loadNewEntry()` restored Cash Real Return and Inflation from `newEntryBaselineRef`, but **Growth** had no global baseline — it was re-seeded from the latest committed row's stored `growthRate`, and if that row was a legacy row with no stored value the slider stayed at whatever was typed mid-edit.
- **Fix:** `newEntryBaselineRef` now also captures `growthRate` (on boot and after every commit), and `loadNewEntry()` restores it alongside Cash Real Return and Inflation. The old "seed Growth from the latest ledger row" line is removed — Growth is a per-row assumption as of 095, so the fresh new-entry state correctly shows today's _global_ value.
- **Result:** Exit Edit / New Entry and Cancel (new-entry) now both show today's current global Growth / Cash Real Return / Inflation, and the primary button correctly returns to "Commit Entry to Ledger".
- **Unchanged:** Discard Changes still stays in Edit and reverts all three to the row's own stored values via `editEntry()`.

## Version 1.0 build 095 — per-row planning assumptions (Growth / Cash Real Return / Inflation)

- **New — assumptions stored per ledger row.** Every newly-committed Normal row now records `assumedGrowthRate`, `assumedCashRealPct` and `assumedInflationPct` at commit time (mirroring how the Build 070 Withdrawal Recorded split is captured). Editing a row loads THAT ROW'S stored assumptions instead of today's global slider positions.
- **Discard Changes** mid-Edit now reverts these three fields to the row's own stored values. `restorePreEditSliders()` no longer touches them (it now covers only Legacy Target and Currency); `editEntry()` is the single source for per-row assumption restore.
- **Legacy rows are not backfilled.** Rows committed before Build 095 have no snapshot: Edit shows 0% for all three and an amber "assumptions not recorded on this row" note in Pane 1, consistent with how "source not recorded" is handled for legacy withdrawal splits. Re-save a row to record its assumptions.
- **Unchanged:** new-entry mode (Cancel) still restores the global baseline, and the live dashboard (Panes 2/3, Guyton-Klinger, simulators) still calculates from the current global sliders.

## Version 1.0 build 082 — Decoupled stress test + independent inflation + Pane 1 revert button + dynamic locking-state advisory

- **Bug fix (Scenario Stress Test slider, high priority):** Moving the Pane 2 "Simulated Drop" slider no longer overwrites Pane 1's real Equities / Cash / Total Capital figures, nor does it contaminate the Pane 3 directive, the Fun Bucket, or the "Can I Afford This?" pane. Root cause: `stressPct` was fed into the single `calculate()` call whose output (`calc`) is consumed by the whole app, so a "what-if" slider was silently mutating every downstream reading. Fix: the main `calc` and the directive now hardcode `stressPct: 0`; a new memo `stressCalc` runs only when the slider is above 0 and its results render _inside the stress box itself_ as a dashed "HYPOTHETICAL — X% equities drop" preview showing stressed Equities, stressed Total Capital, and stressed Drawdown vs ATH. A one-click "Return to baseline (0%)" button appears alongside the label whenever the slider is off zero, matching the "Reset to actual" pattern already used by the Risk Simulator's "✎ WHAT-IF" field. `AffordCalculator` now also receives `stressPct={0}`.
- **Bug fix (inflation assumption drift, high priority):** The Pane 3 directive's annualised-real deflation is now driven by an **independent Pane 1 slider** — "Inflation / CPI Assumption", positioned directly under the Cash Real Return control. The Risk Simulator's own Inflation / Escalation slider remains local to that panel. First-load seed for the Pane 1 slider: (1) persisted app setting → (2) legacy `shd_mc_v1` value from any returning user → (3) 2.5% default. Once either slider moves, they diverge freely — a decision confirmed against the "shared common default on first load, entirely independent thereafter" option in the request. The Pane 3 advisory line now reads "…from Pane 1's independent CPI assumption" instead of "…from Risk Simulator" to make the source explicit.
- **Bug fix (locking-state advisory drift):** The advisory sentence beneath the directive banner used to hardcode a stale 3-item list — "Peak Refill, Reverse-Shielding, Shield Deficit" — even though Build 081 already expanded the locking-state set to six states. It now derives the list from a single `NON_LOCKING_STATES` / `LOCKING_STATES` table (Normal Draw, Comfortable Amortization, No-Go Amortization are the only non-locking states; everything else locks the bucket) that lives at the top of `SovereignGlidepath.tsx` and is used both here and by the future engine glue. The sentence also now spells out the _current_ state and whether it is locking or advisory (`Current state: Freeze Equities — locked by narrative.`), so State Test Preset 4 (Freeze Equities) is immediately visible in the list.
- **New — contextual Cancel / Discard Changes button on Pane 1.** The primary "Commit Entry to Ledger" / "Update Entry" button is now paired with a secondary revert button in a 3fr / 1fr (75/25) grid layout. Label mirrors the primary button: **Cancel** when creating a new entry (reverts every Pane 1 field to the most recently committed Normal ledger entry — the same source Pane 1 loads from on app boot) and **Discard Changes** when mid-Edit (reverts to _that specific row's_ stored values). Distinct from "Reset split" (which only clears the two withdrawal-split inputs) — this clears the entire Pane 1 draft. Styled as an outline / secondary action so it is visually unmistakeable from the primary commit button. No confirmation dialog because nothing has been written yet.

## Version 1.0 build 081 — Non-locking directive banner bucket fix + preset pinning + presets moved to Pane 2

- **Bug fix (banner text hardcoded "Equities" for non-locking states, high priority):** `generateDirectives()` now takes an optional `bucketOverride` and uses it in the three non-locking branches — Normal Draw, Comfortable Amortization, No-Go Amortization — so the banner action text (verb, £ amount, bucket name) matches the currently-selected Defensive-Draw Mode's recommendation instead of always saying "Sell £X from Global Equities". Root cause: banner branches hardcoded equities wording; the mode selector only fed the advisory line and split-field auto-seed, so on-screen the banner, comparison line, and advisory line could all disagree. Locking states (Peak Refill, Recovery Wave, Refilling Shield, Reverse-Shielding, Freeze Equities, Shield Deficit) still dictate their own bucket by design and ignore the override.
- **Split-field staleness fix:** Applying a State Test Preset now clears `wdSplitTouched` / `withdrawnTouched`, so the "Withdrawn from Equities / Cash" fields always reflect the current state's correct recommendation instead of a leftover value from a previous preset. This is what caused the "Total £10,500 ≠ Request £9,000" mismatch: the touched flag had latched during earlier interactions, blocking the auto-seed from re-populating when the preset changed the request amount.
- **State Test Presets now pin every trigger-relevant field.** Each of the eight presets explicitly sets age, capping age, equities, cash, ATH, target withdrawal, stress %, cash-shield months, Legacy Target, and assumed real growth. Presets 1 (Normal Draw), 3 (Reverse-Shielding), and 6 (G-K Prosperity) also had their recipe values corrected — the previous values were landing on Peak Refill, Freeze Equities, and Comfortable Amortization respectively.
- **State Test Presets moved to Pane 2.** Hidden by default, toggled via double-click on the "2. Intelligence Diagnostics" header (matches the existing Audit Mode double-click-to-toggle pattern on Pane 5).

## Version 1.0 build 079 — Directive banner restored to full state machine + per-row status snapshot + State Test Presets

- **Bug fix (Directive banner regression, high priority):** Reverted the Build 078 two-state banner. Pane 3's large coloured banner now always renders `directive.html` from `generateDirectives()`, restoring the full set of documented states — Peak Refill, Recovery Wave, Reverse-Shielding, Comfortable Amortization, Normal Draw, G-K Preservation (−10%), G-K Prosperity (+10%), No-Go Amortization, Shield Deficit / Exhaustion. Root cause of the regression: the Build 076/078 mode-reactive banner was written as a REPLACEMENT for `directive.html`, so whenever a prior Normal row existed the banner collapsed to a two-state ("Normal Draw" / "Freeze Equities — Draw from Cash") view and silently dropped every richer narrative Pane 2 was still computing. Fix: Pane 3 now shows the true narrative (matching Pane 2's Guardrail State by construction), with the Defensive-Draw Mode composing on top as an advisory box beneath the banner and via the split-field auto-seed at commit time — it never overrides the narrative.
- **Verification — 8 documented states now agree between Pane 2 and Pane 3:** Normal Draw, Peak Refill/Recovery Wave, Reverse-Shielding, Freeze Equities (Preservation), G-K Preservation (−10%), G-K Prosperity (+10%), No-Go Amortization, and Shield Deficit/Exhaustion.
- **Ledger row + CSV — Pane 2 state snapshot per row.** Every Normal ledger row now stores `guardrailStatus` (Pane 2's "Withdrawal Status": Normal / Reduction Applied / Prosperity Bonus / Comfortable Amortization) at commit time. Pane 2's "Guardrail State" was already stored per row (`rule`); both now surface as small badges next to Age / Phase / Horizon on the ledger table, and as two dedicated columns (`Withdrawal Status`, `Guardrail State`) in the CSV export, positioned near `Horizon Age`.
- **State Test Presets (QA aid, Pane 1).** New collapsible panel above the Commit button with eight one-click buttons — one for each documented cheat-sheet recipe. Clicking a preset populates Pane 1's inputs (age, capping age, equities, cash, ATH, target withdrawal, stress, cash-shield months) but never auto-commits. Shows a small before/after diff so it's clear what changed, plus the state Pane 2/3 should now be reflecting.

## Version 1.0 build 078 — Mode-reactive directive banner + per-row Horizon Age in CSV

- **Bug fix (Directive banner, high priority):** The large coloured banner in the Actionable Brokerage Desk Directives pane is now driven by the currently-selected Defensive-Draw Mode's actual recommendation, not the drawdown-vs-ATH heuristic in `engine.ts`. Previously the banner could read "NORMAL DRAW FROM EQUITIES — Sell £X from Global Equities" while the small three-way comparison line and the entry-form split fields both correctly said "Draw from Cash" for the selected mode. Root cause: the banner rendered `directive.html` from `generateDirectives()`, which knows nothing about the mode selector introduced in Build 076 — it branches purely on `draw%`, `runwayMonths`, `guardrailFactor`, and the No-Go/Comfort bypass predicates. Fix: when `defensiveRec` has a valid comparison (a prior Normal row exists), we now render a mode-driven banner in the same `directive-box` styles (green `Normal Draw from Equities` for equities recommendations, amber `Freeze Equities — Draw from Cash` for cash recommendations), with the £ amount and bucket text matching what the split fields auto-seed (`calc.guardrailAdjustedQuarterly`). When no prior row exists to anchor a comparison, we fall back to the original `directive.html` so the richer narrative states (Peak Refill, Recovery Wave, Reverse-Shielding, Comfortable Amortization, Shield Deficit) still render on fresh ledgers. The small three-way comparison line is unchanged.
- **CSV export:** The main Historical Timeline Ledger CSV now includes a per-row `Horizon Age` column immediately after `Age`, sourced from each row's own stored `cappingAge` at commit time. The metadata header's global `Target Horizon Age` line is retained for the current live setting. Sample row: `2026 Q3,2026-09-30,64,90,Go-Go,700000.00,90000.00,790000.00,...`.

## Version 1.0 build 077 — Defensive Draw elapsed-days fix + nominal return + horizon age on ledger

- **Bug fix (Defensive Draw, high priority):** When editing an existing Normal row, the elapsed-days figure feeding the annualisation formula now uses the **row's own stored Period End Date** as the anchor, not the current date-picker state (which in some paths could carry today's date rather than the row's own). Symptom before fix: opening Edit on a row dated 2026-09-30 with a prior row dated 2026-06-30 (true 92-day gap) reported "annualised over ~18 days" — the difference between today's system date and the prior row. New entries continue to use the date-picker state (which defaults to today, correct for that case).
- **New display:** The Defensive Draw directive panel now shows the **nominal period return** alongside the annualised real figure — e.g. "Nominal equity return +0.09% this period · Annualised real −2.08% over 92 days since Q2 2026". Gives grounding context so the annualised figure doesn't look dramatic for what was a small single-period move.
- **New display:** Each ledger row now shows the **Horizon / Capping Age** in effect when that row was committed, next to the Age/Phase badge (e.g. "Age 64 · Go-Go · Horizon 90"). Value was already stored per row (Build 074 audit confirmed) but previously only visible by opening Edit.

- **New "Defensive Draw Mode" segmented control** (Strict / Standard / Aggressive) inside the Actionable Brokerage Desk Directives pane. Defaults to Standard. Only affects which BUCKET the app recommends funding this quarter's withdrawal from — the Guyton-Klinger ±10% AMOUNT logic in `engine.ts` is untouched.
- **All three modes shown side-by-side** so you can see where they agree or disagree at a glance (e.g. "Strict: Draw from Equities · Standard: Draw from Equities · Aggressive: Draw from Cash"). Currently-selected mode is bold + underlined; cash recommendations render amber, equity recommendations green.
- **Realised-return comparison, annualised over actual elapsed days.** Anchors to the most recent Normal ledger row by **Period End Date** (not Age, not free-text label). Deflates the nominal `Eq_now / Eq_prev − 1` return using the app's existing inflation assumption, then annualises with `(1+r)^(365.25/days) − 1` and compares against the same **annual** hurdles that `isDefensive()` already uses in Yearly-tick / Audit Mode. No parallel threshold logic was added.
- **Shared code, not a parallel implementation.** New helper `src/lib/sovereign/defensiveRec.ts` calls straight into `isDefensive()` from `src/lib/sovereign/drawdown.ts` (the single source of truth already reused by Yearly-tick / Quarterly-tick / Audit).
- **Inflation source.** Reuses the Risk Simulator's persisted `inflationPct` (localStorage key `shd_mc_v1`), same 2.5% default as `MonteCarloPanel` when not yet set.
- **Auto-populates the entry form.** Selecting a mode auto-fills "Withdrawn from Equities" / "Withdrawn from Cash" (and the Rebalance Move fields, if a refill is warranted) to match that mode's recommendation. Manual edits still win — as soon as you touch a field the auto-seed backs off, exactly as before.
- **Refill suggestion.** When a mode says "draw from equities AND cash is below the shield target", the auto-seed additionally proposes `Rebalance: Equities → Cash`, sized to the shortfall and capped at what equities can spare after the quarterly draw.
- **Safe defaults for edge cases.** First-ever Normal row / no prior dated Normal row / previous row's Period End Date not set / same-or-earlier date / previous equities = 0 → all three modes fall back to "Draw from Equities — no prior quarter to compare against" and the reason is shown inline. Comparisons spanning **> 730 days** raise an amber "gap > 2 years" warning next to the annualised figure.
- **Row-being-edited excluded from the anchor search** so editing an existing row can't compare it against itself.

## Version 1.0 build 075 — CSV UTF-8 BOM for Excel compatibility

- **Fix:** Prepended a UTF-8 byte-order-mark (`\uFEFF`) to CSV exports so Excel on Windows correctly renders `£`, `—` and other non-ASCII characters instead of mojibake. Applied once in the shared `exportLedgerCSV()` helper, so both Audit Mode and the Historical Ledger export are fixed by the single change. No other content, columns, ordering or filename behaviour changed.

## Version 1.0 build 074 — Live Period End Date banner + per-row idempotent migration

- **Migration is now per-row idempotent, not gated by a single global "has run" flag.** The `migrateLedgerPeriodDates()` helper was already row-by-row (it skips rows that already have a real date), but it was only invoked from the one-shot bootstrap. It is now also invoked inside `importData()` so restoring a pre-Build-073 backup (or any backup where a row lacks a Period End Date) auto-heals on restore instead of leaving every restored row permanently flagged.
- **Ledger date-health banner is now computed live from the current ledger contents on every render.** Replaces the static `migrationReport` state (which was snapshotted at bootstrap and never recalculated). New text: "N of M ledger rows currently lack a Period End Date" — hides entirely when all rows are dated. Fixes the contradictory "6 auto-dated, 0 need attention" message appearing on a ledger where every row was flagged ⚠.
- **Bug 1 (Edit form loads current live target instead of stored withdrawal split) — investigated, not reproduced.** For Build 070+ rows with a real stored split, `editEntry()` loads `d.withdrawnFromEquities` / `d.withdrawnFromCash` directly and sets `wdSplitTouched=true`, blocking the auto-seed. For legacy rows (no stored split), fields intentionally fall through to the live auto-seed because there is nothing historical to preserve. Verified by code inspection; no fix applied.

## Version 1.0 build 073 — Period End Date (real date for chronological ordering)

- **New "Period End Date" field on Normal-row entries** — a real `<input type="date">` alongside (not replacing) the free-text "Reporting Period" label. The label stays cosmetic; the date is the single source of truth for chronological ordering. Defaults to today; the Auto-Label button now refreshes both the label and this date together.
- **Schema:** `LedgerEntry.periodEndDate?: string` (ISO `YYYY-MM-DD`). Applied to Normal rows only. Special Withdrawal and Windfall rows continue to use their existing `eventDate` and are untouched by this change.
- **Sort key:** the Historical Ledger on-screen display and the Build 072 CSV export now sort by real date (event rows use `eventDate`, Normal rows use `periodEndDate`). Age is no longer used as a chronological proxy anywhere. Rows with no date sink to the end / bottom but keep their insertion order.
- **CSV export:** new "Period End Date" column immediately after "Reporting Period", in ISO format.
- **Pre-commit modal:** shows the Period End Date row with an amber "date not set" indicator if the picker was cleared.
- **Edit control:** loads the stored real date into the picker; blank if the row is legacy and unmigrated.
- **Legacy migration (one-shot, at first load after upgrade):** rows whose free-text label cleanly matches `Q<n> YYYY` are auto-dated to that quarter's last day (Q1→Mar 31, Q2→Jun 30, Q3→Sep 30, Q4→Dec 31). Anything else is left blank rather than guessed, and each unmigrated row shows a small amber `⚠ date not set` badge in the Timeline column. A summary banner above the ledger reports the counts and lists the unparsed labels in its tooltip.
- **Duplicate dates:** allowed — two Normal rows may share a Period End Date; the sort is stable so relative order is preserved. Downstream logic for same-date handling is deferred to a later phase.

## Version 1.0 build 072 — Historical Ledger CSV export

- **New "Download Ledger (CSV)" button** in the Pane 7 Historical Timeline Ledger header, alongside the existing `Wipe Records` control. Uses the same primary-action styling as the Audit Mode CSV export (filled accent button + ⬇ glyph).
- **Reuses the shared `exportLedgerCSV()` helper** from `src/lib/sovereign/csvExport.ts` — no second one-off implementation. The helper was extended to accept a plain `{ filename }` override alongside the existing `CsvFilenameParts` shape, and `localTimestamp()` is now exported for reuse.
- **All ledger rows exported** in true chronological order by age ascending (back-filled entries land in the right place regardless of on-screen display order, which is newest-first).
- **Columns:** Reporting Period, Age, Phase, Equities, Cash, Portfolio Total, ATH, Drawdown from ATH (%), entryKind, Withdrawn from Equities, Withdrawn from Cash, Withdrawal Total, Rebalance Direction, Rebalance Amount, Event Amount, Realised Withdrawal Rate (%), Status/Directive.
- **Legacy rows** (committed before Build 070) show blanks — not zeros — in the Withdrawn from Equities/Cash and Rebalance columns, matching how the on-screen ledger already treats them as "source not recorded".
- **Event rows** (`special_withdrawal` / `windfall`) show blanks in the bucket-split and Withdrawal Total columns and carry their single amount in the separate `Event Amount` column so it can't be confused with a normal quarterly withdrawal.
- **Filename:** `sovereign-ledger_{YYYYMMDD-HHmm}.csv` (local timestamp). Deliberately distinct from the Audit Mode `sovereign-audit_*` naming pattern so the two exports can't be mixed up.
- **Metadata header** (commented `#` lines above the column headers): export timestamp, row count, Target Horizon Age, Assumed Growth Rate, Cash Buffer Target (months), Annual Target Withdrawal, and currency — the file is self-documenting when reopened later.
- **Scope:** UI + export only. No changes to ledger schema, entry/edit forms, or the drawdown engine.

## Version 1.0 build 071 — Phase 1 tidy-up (defaults, control styling, CSV prominence)

- **Withdrawal split default swapped:** the entry form's auto-fill now defaults the full Request into `Withdrawn from Equities` (was Cash), with `Withdrawn from Cash` defaulting to £0. Manual override still works exactly as before, and the Rebalance Move field is unaffected. _(Follow-up noted: eventually these should auto-populate based on the recommended defensive-draw directive rather than a fixed default.)_
- **Rebalance Move restyled** from a native `<select>` (which rendered white-on-white on dark theme) into a three-button segmented control matching the Strict / Standard / Aggressive threshold buttons: `None` · `Equities → Cash` · `Cash → Equities`. Adjacent £ amount field unchanged.
- **Audit Mode "Download Ledger (CSV)" button** promoted from muted secondary styling to a primary filled accent-colour button with a ⬇ glyph, so it reads as the section's primary action rather than blending in.
- **Scope:** UI/UX only — no schema, validation, ledger logic, or engine maths changed.

## Version 1.0 build 070 — Ledger bucket-split (Phase 1)

- **Withdrawal Recorded split into three fields** on Normal quarterly ledger entries: `Withdrawn from Equities`, `Withdrawn from Cash`, and an optional `Rebalance Move` (direction: None / Equities→Cash / Cash→Equities, plus £ amount). Defaults preserve prior single-field behaviour — full Request auto-fills into Cash, £0 into Equities. Sum-mismatch (Eq + Cash ≠ Request) surfaces an inline amber warning on the form and in the pre-commit dialog but does NOT block commit.
- **Available in three places:** the entry form (Pane 1), the pre-commit confirmation modal, and the past-row Edit control. Editing an existing row loads the stored split into all three fields so a typo'd total can be corrected alongside its bucket breakdown.
- **Special Withdrawal and Windfall event rows unchanged** — they continue to record a single amount and re-anchor ATH exactly as before. A new discriminator field `entryKind: "normal" | "special_withdrawal" | "windfall"` is written on every Build 070+ commit so downstream logic can tell row types apart without parsing the label text.
- **Ledger table display** on Normal rows now reads `£10,000.00 (Eq £6,000 / Cash £4,000)` when split data is present, with a second italic line `Rebalance: £5,000 Eq → Cash` when applicable.
- **Legacy compatibility:** rows committed before Build 070 have no split data and render with a `source not recorded` caption rather than defaulting to a fake `£0 / £0` split that would misrepresent history.
- **CSV export:** the main Historical Ledger has no CSV export today (only an encrypted password-protected backup), so there is nothing to update in that path. The separate Audit-Mode CSV export is unchanged. A "snapshot my ledger to CSV" export can be added later using `exportLedgerCSV()` from `src/lib/sovereign/csvExport.ts`; when it lands it will include the three new columns (blank for legacy rows, not zero).
- **Scope:** Phase 1 is schema + UI only. No changes to the drawdown engine or the three-way defensive-draw directive — those come in the follow-up pass that will consume these fields.

## Version 1.0 build 069 — Threshold period-basis fix + boundary rounding

- **Fix: Standard ≡ Aggressive collision in Parametric + Quarterly.** Root cause: `isDefensive()` compared a _quarterly_ real return (`rEqReal ≈ 1.08%` at a 7% nominal / 2.5% infl flat) against the _annual_ hurdles (Standard ½·detRReal ≈ 2.20%, Aggressive detRReal ≈ 4.39%), so every quarter tripped both hurdles and the two modes produced byte-identical ledgers. The fix: `applyPeriod` / `isDefensive` now take a `periodsPerYear` argument (1 for yearly, 4 for quarterly) and prorate each annual hurdle to its per-period equivalent — `(1 + hurdleAnnual)^(1/N) − 1` — before comparing to `rEqReal`. All four call sites in `MonteCarloPanel.tsx` (main-sim yearly, main-sim quarterly, audit yearly, audit quarterly) now pass the correct value.
- **Fix: threshold-boundary floating-point flip.** A flat parametric return sitting exactly on a hurdle (e.g. Aggressive == Assumed Growth Rate) could flip defensive on/off between yearly and quarterly ticks due to 10th-decimal fp noise from the `pow(1+x, 0.25)` prorate. Both sides of the `<` are now rounded to 4 dp before comparison, so equal-to-hurdle deterministically counts as **not** defensive across ticks.
- **Not a code bug, documented for the record: Historical + Yearly, Strict ≡ Standard.** With the deterministic audit window (30 years from index 3 = 1973), every nominal return in the dataset either lies below −2.6% or above +4.75%, so no year falls in the [−5%, +2.20%] real band where Strict and Standard would classify differently. Both modes therefore route every year to the same bucket and produce identical End Eq / End Cash values — this is data-driven, not a fallthrough. Standard vs. Aggressive in that same window differ on exactly one year (the +6% nominal year → +3.4% real).

## Version 1.0 build 068 — Audit Ledger CSV export

- **Download Ledger (CSV)** button added next to the Audit Ledger header in the Risk Simulator. Exports every row currently generated for the audit run (all 30 yearly or all 120 quarterly) with all nine on-screen columns: Interval/Age, Start Eq, Start Cash, Net Outflow, Eq Ret %, Cash Ret %, G-K Rule, End Eq, End Cash.
- **Self-documenting header.** The CSV begins with `#`-commented metadata: return source, tick mode, draw mode, starting Equity, starting Cash, annual withdrawal, pension amount and start age, inflation rate, cash real return, and — depending on mode — parametric mean (nominal) or historical bootstrap start year (1973).
- **Dynamic filename** built from the active run: `sovereign-audit_{historical|parametric}_{yearly|quarterly}_{strict|standard|aggressive}_age55-85_YYYYMMDD-HHmm.csv`.
- **Reusable utility.** Extracted as `exportLedgerCSV(rows, columns, metadata, filenameParts)` in `src/lib/sovereign/csvExport.ts` so the same exporter can be wired into a future "snapshot current simulation" button in the live pane without rebuilding it.

## Version 1.0 build 067 — Unified drawdown engine (shared `applyPeriod`)

- **Single source of truth.** Yearly-tick, Quarterly-tick and Audit Mode all now call the same `applyPeriod(state, inputs)` function in `src/lib/sovereign/drawdown.ts`. The defensive-draw threshold predicate, the withdrawal-source (Cash-vs-Equities) routing, the cash-refill-to-target logic on good periods, and the Guyton-Klinger ±10% Preservation/Prosperity state all live in exactly one place. Yearly = one call per year with yearly returns; Quarterly = four calls with prorated returns and spend/4; Audit = same function driven by a deterministic (flat parametric) or historical (1973-onward) return sequence.
- **Behavioural reconciliations from consolidation:**
  - Yearly-tick main sim now applies Guyton-Klinger ±10% every year (previously only quarterly did; audit-yearly already did). Yearly and quarterly now use identical guardrail logic.
  - Withdrawal routing is now uniformly evaluated on the **post-growth** cash balance (previously the main-sim quarterly checked pre-growth cash against spend, then applied growth to a partial residual — audit already did it the post-growth way).
  - Non-defensive shortfall now spills correctly from Equities → Cash across all three modes (previously the main sim just clamped equities to zero without touching cash if equities couldn't cover a full non-defensive draw).
- **Strict-mode caption fixed** in the Risk Simulator help block: "spend from cash only when equities post a negative _nominal_ year" → "spend from cash only when the **real** equity return is below **−5%**".
- **Audit banner** already reads "Age 55 → 85" (Build 066); confirmed no regression.

## Version 1.0 build 066 — Yearly-tick defensive fix, Standard hurdle recalibration, audit banner

- **Yearly-tick defensive routing fixed.** The yearly engine loop shares the same `defensiveFor()` predicate as quarterly, but Standard mode had collapsed onto Strict because both fired only on outright negatives — so weak-positive years (e.g. Y6 at +3.41% nominal ≈ +0.89% real) never triggered Cash sourcing under Standard. Standard now has its own distinct middle hurdle: real Eq return < ½ × detRReal.
- **Threshold recap (applied identically across yearly-tick, quarterly-tick and Audit Mode):**
  - **Strict** — Cash only when real equity return < −5% (serious drawdown years).
  - **Standard** — Cash whenever real equity return < ½ × detRReal (≈ +2.2% at the default 7% mean / 2.5% inflation).
  - **Aggressive** — Cash by default unless real equity return cleanly exceeds detRReal (≈ +4.4%).
- **Audit banner age.** "AUDIT MODE ACTIVE" now reads "Age 55 → 85" (was still showing 64 → 85 after the Build 065 default change).

## Version 1.0 build 065 — Inflow pane relocated, audit defensive routing, layout polish

- **Audit Mode now honours the Defensive Draw Threshold.** The step-by-step loop checks the Eq Ret % of each tick and, when it falls under the selected threshold (Strict < −5% real, Standard < 0% real, Aggressive < detR hurdle), routes the full withdrawal from Cash instead of Equities. Overflow spills to the other pot when the source runs dry.
- **Defensive % readout wired to Audit Mode.** The summary line now reports true defensive coverage under the active threshold ("Defensive draws: X of Y yrs (Z%) sourced from Cash under standard mode").
- **Audit Mode default start age moved from 64 → 55.** Yearly tick now shows all 30 years (Age 55 → 85). Quarterly tick shows the full 120 rows (30y × 4). Both share the same scrollable 380px container.
- **Extraordinary Inflow relocated.** Removed from Pane 1. Now lives as its own self-contained pane directly below "Can I Afford This?" with a solid blue prominent action button matching "Commit Entry to Ledger".
- **Destination Pot restricted to Equities or Cash** (the Blended 50/50 option is gone). Free-text short description is now captured on the pane.
- **Direct ledger commit.** Clicking "Add Inflow & Re-anchor ATH" immediately writes a purple ★ EVENT: Windfall Inflow row into the Historical Timeline Ledger (mirroring the SPECIAL structure with a positive +£amount and the new ATH baseline). Toast copy now ends at the ATH re-anchor confirmation — no "Remember to commit an entry" tail.
- **Slider re-label.** "Assumed Real Growth Rate (After Inflation)" → **"Assumed Real Growth Rate"** in both Pane 1 and Risk Simulator.
- **Future Extraordinary Inflow panel** moved below the Allocation Bias panel; helper text under Amount reads "Property sale, inheritance, etc. Injected as a flat amount in today's purchasing power (no inflation scaling applied)."
- **Allocation Bias title promoted** to a bold pane-level heading to match the other section titles in the Risk Simulator.

## Version 1.0 build 064 — Draw-mode overhaul, deterministic-line fix & windfalls

- **Defensive-draw toggle now truly differentiates the three modes.** Predicate keyed on REAL equity return: Strict = cash only when real equity return < −5%; Standard = cash whenever real equity return < 0; Aggressive = cash unless real equity return is cleanly above the deterministic hurdle. Overflow spill-over preserved: if the primary pot hits £0 the residue is drawn from the secondary pot.
- **Deterministic dashed line reconciled.** The smooth "Assumed Growth" projection is no longer forced into the defensive branch when the Standard/Aggressive thresholds sit above the smooth hurdle. Under smooth positive parameters the line now tracks or sits slightly above the median stochastic path — the previous ~2× low reading is gone.
- **Slider re-label.** "Assumed Growth Rate" → **"Assumed Real Growth Rate (After Inflation)"** in both Pane 1 and the Risk Simulator.
- **Future Extraordinary Inflow (Risk Simulator).** New Amount + Timeline (years-from-now) fields inject a real-terms windfall (blended 50/50) at end of year N. Total capital rises, WR drops, and the per-path ATH re-anchors so guardrails treat it as a new peak.
- **Extraordinary Inflow — immediate (left panel).** New commit block beneath "Commit Entry to Ledger": Amount + Destination Pot (100% Equities / 100% Cash / Blended). One click adds the lump to the chosen pot(s) and steps the Stored ATH Baseline up so future Guyton-Klinger guardrails re-align.
- **Directive Testing Cheat Sheet.** New recipe table in the Quick Start Guide covering all directive states (Green / Blue / Amber / Purple / Red) with worked example inputs for triggering each in the UI.

## Version 1.0 build 063 — Audit Mode calibration & chart alignment

- **Eq Ret % now shows the REAL return actually applied.** Parametric mode displays `((1 + 7%)/(1 + 2.5% infl)) − 1 ≈ 4.3902%` per year (quarterly form `((1+nom)/(1+infl))^0.25 − 1`); historical mode shows the per-cycle real return. Multiplying `(Start Eq − Net Outflow) × (1 + Eq Ret %)` now reconciles to End Eq to the penny.
- **Flat-real pension offset.** Audit Mode no longer compounds the £12,700 pension by 2.5%/yr — it is held flat in today's £, so Net Outflow drops to exactly £23,300 yearly / £5,825 quarterly from Age 67 onwards.
- **Chart X-axis honours the Audit starting age.** Ticks now run 64 → 85 (was mislabelled 60 → 81); the pension inflection lands cleanly on Age 67 and the horizon ends at 85. Hover tooltip and brush-window readout follow suit.
- **Slider re-label.** "Yearly Withdrawal Increase Rate %" → "Inflation / Escalation %".
- **Scrollable audit ledger.** The step table is capped at 380px vertical with sticky scroll, so 24 quarterly rows (6 years) stay scannable without pushing the page layout around.

## Version 1.0 build 062 — Withdrawal-recorded field & Audit Mode

- Pane 1: new "Withdrawal Recorded" money input, auto-seeded from the guardrail-adjusted Request; value is stored on the ledger row and shown in the timeline in place of "Drawdown Income".
- Removed the withdrawal-history stacked-bar strip from under the trend chart.
- Risk Simulator: hidden Audit Mode (double-click the pane header). Single deterministic path with fixed canonical inputs (Age 64→85, £610k/£90k/£36k, Pension £12,700 @ 67, flat +7% parametric or historical from 1973). Renders a 2-dp step ledger below the chart.
- Engine: quarterly-tick G-K now anchors target WR to the per-path All-Time High rather than the starting pot, matching the live app.
- Docs: Manual bumped to Edition XII with revised chapter 33 (Withdrawal Recorded) and new chapter 34 (Audit Mode). Quick Start & Overview updated. TOC updated.

---

## Version 1.0 build 061 — Quarterly-tick simulator, withdrawal-history bar, docs sync

- **Quarterly-tick simulator mode.** New Yearly/Quarterly toggle in the Risk Simulator header. Quarterly mode splits each year's nominal return into four equal geometric quarters and re-applies Guyton-Klinger ±10% every quarter against a per-path ATH — matching the live app's quarterly discipline. Runs in parallel with the original yearly engine; flip between the two to see how much of the p10-floor gap the quarterly ritual closes.
- **Withdrawal-history bar.** Slim stacked bar per ledger commit under the Historical Trend Visualizer: green = equities drawn, blue = cash drawn, purple = special event. At a glance shows whether the Cash Shield was actually used in the quarters the desk directed a Freeze.
- **Allocation-bias slider labels fixed.** ← Cash / Equities → now correctly reflect the direction the slider moves the mix.
- **Docs.** In-app Quick Start Guide renamed to _Quick Start Guide & Overview Manual_ with a link to the Full Manual; step count updated to 8. Full Manual bumped to Edition XI with new chapters 32 (Quarterly-tick simulator) and 33 (Withdrawal-history bar); TOC updated.

## Version 1.0 build 060 — Commit-confirmation modal, tighter Pane 1/5 alignment, docs sync

- **Commit-confirmation modal.** Clicking _Commit Entry to Ledger_ now opens a review dialog listing exactly what will be written — label, age/phase, both pot balances, total, (possibly raised) ATH, drawdown, target draw + WR, legacy target, cash-buffer target, growth rate, and directive. Cancel returns you to Pane 1 unchanged.
- **Pane 1 alignment.** _Cash Buffer Target_, _Legacy Target_ and _Currency_ labels now fit on a single line each; column grid tightened so all three fields align neatly.
- **Pane 5 alignment.** _Pension Start Age_ column narrowed so the four sliders across the row (Yearly Withdrawal Increase / Assumed Growth / Cash Real Return / Pension Real Increase) get more room and line up cleanly under their related inputs.
- **Pane 6 wording.** Removed "Nothing is committed to the ledger" — reworded to reflect that the _Commit Special Event_ button now writes a real ledger row.
- **Docs sync.** Quick Start Guide (in-app Help) and Full Manual now cover the Legacy Target, Automatic ATH, Special-Event withdrawals, Commit-confirmation modal, and Comfortable Amortization override. Manual bumped to Edition X.

## Version 1.0 build 059 — Mirrored growth sliders & comfort-bypass fix

- **Comfort-bypass hardening.** When surplus ≥ 3 years, guardrail factor is neutralised at the calc layer so the status readout and directive both say "Draw Normally" — no more phantom −10% cuts against a stale ATH.
- **Ledger shows Special-Event amounts.** Drawdown Income column now displays the withdrawal (purple), Equities/Cash split, and note for `★ EVENT` rows.
- **Assumed Growth Rate + Cash Real Return mirrored** between Pane 1 and the Risk Simulator. Currency selector relocated to sit with Cash Buffer / Legacy in Pane 1.
- **Fun Bucket cash drag.** Pane 2 Amortization Matrix now uses a pot-weighted blended real rate so raising cash allocation shortens comfort years exactly as the simulator predicts.

---

## Version 1.0 build 058

### Legacy target & Special-Event withdrawals

- **New Pane 1 field — Legacy / Inheritance Target.** Real-terms amount you plan to
  leave behind. Held aside from the Fun Bucket and factored into every directive.
- **New "Comfortable Amortization" directive.** When the plan still holds 3+ years of
  true surplus (beyond lifetime needs and any legacy target), the app now suppresses
  the Preservation / Freeze branch and issues a green normal-draw directive — even if
  drawdown vs a very old ATH looks large. Fixes the case where an 80-year-old with
  £790k and 10 years left was being told to freeze equities against a stale £1m peak.
- **Pane 6 — Commit as Special-Event Withdrawal.** A new purple panel appears once
  you enter an expense. Type a short description (e.g. "Car purchase") and hit
  _Commit Special Event_. The pots are deducted by the split shown, ATH is lowered by
  the same total (preserving baseline honesty), and a flagged ★ EVENT ledger entry is
  written with today's date and note.
- **Ledger — Special-Event styling.** Special-event rows are tinted purple with a
  chip and the transaction date so they stand out in the historical timeline.
- **Fun Bucket / Actuarial Matrix.** Now explicitly annotates "(after reserving £X
  legacy target)" whenever a legacy figure is set.

---

## Version 1.0 build 057

### Pane 3 — Directives rewritten

- **Full-width, quarterly-report tone.** Each directive now shows a clear title (matching the manual), a 1–2 sentence description of _why_ this directive fired (drawdown %, shield state, momentum), and an explicit action line with the exact £/€/$ amount to sell or withdraw — including the "normal" case, which previously omitted the amount.
- **"Draw adjusted" cleaned up.** The word _adjusted_ now only appears when Guyton-Klinger has actually modified the payout; otherwise the app just says "quarterly draw" with the target amount. When GK is active, the banner now spells out the trigger (WR >20% above/below target), the ±10% factor, and the baseline it was applied to.
- **New Normal / Green variant.** "Normal draw from Equities" now renders with a green left border, matching the manual, instead of the previous blue-by-default look.
- **All seven manual directive types reflected 1:1.** Peak Refill, Recovery Wave Refill, Reverse-Shielding, Freeze Equities / Draw from Cash, No-Go Amortization, Shield Deficit / Exhaustion, and Normal Draw now match the wording, colour band, and meaning in §8 of the Full Manual.
- **Cash Drag note** rewritten as a full sentence with the exact surplus amount and the shield target it exceeded.

## Version 1.0 build 056

### Full Manual — Worked 30-year stress-test example

- **New chapter §23c.** A full year-by-year walk-through of one Monte Carlo path using a realistic UK setup (£650k equities, £125k cash, £42k withdrawal from age 60, £13k State Pension from 67 escalating at 3%, 30-year horizon, Standard threshold). Shows the nominal return, pension, net draw, draw mode, and both bucket balances for every year.
- **Engine narrative.** Explains the five steps the engine performs each year, why the buffer earns its keep early, why refill is asymmetric, and how the State Pension cuts the net bite by ~31%.
- **Sim vs live app table.** Side-by-side comparison of the simulator (annual, flat real draw, no guardrails) and the live quarterly app (quarterly, guardrail-adjusted, phase-shifting). Confirms why real life should track closer to p50–p75 than to p10.
- **Help deep-link.** The Risk Simulator "How to read this" panel now links directly to §23c so users can jump from the chart explanation into the worked example.
- **Manual cover.** Bumped to Version 1.0.56 · Edition VIII; new TOC entry added.

## Version 1.0 build 055

### Pane 5 — Defensive threshold buttons now materially re-run the sim

- **Threshold fix.** The Strict / Standard / Aggressive buttons now use wider nominal-return bands so each preset changes which years spend from Cash. The previous real-return thresholds collapsed onto the same historical years in many settings, making the p10 / median / p90 figures identical to the penny.
- **Immediate re-simulation.** Every threshold click updates React state and re-runs all 2,750 paths against the same seeded return sequence, so differences are caused by the defensive draw rule rather than by random re-rolling.
- **Documentation.** Help and the Full Manual now describe the revised threshold meanings: Strict = negative years only, Standard = flat/weak markets, Aggressive = unless markets are clearly strong.
- **Changelog route.** The hidden Shift+Click Restore changelog view now opens on the latest build entries instead of stopping at build 041.

---

## Version 1.0 build 054

### Pane 5 — Allocation bias slider + visible defensive-draw feedback

- **Allocation bias slider.** New slider beneath the Equities and Cash Pot inputs that rebalances the two buckets while keeping the total pot fixed. Defaults to the live split from the ledger and snaps back on refresh. Moving it writes new values into the existing Equities and Cash fields, so the free-text "what-if" overrides remain the source of truth. A "Reset split to actual" link appears once the split is overridden.
- **Defensive-draw counter.** The threshold row now reports the average number of years per simulation that drew from Cash, e.g. _"avg 12.4 of 30 yrs (41%) draw from cash"_. Makes the difference between Strict / Standard / Aggressive immediately visible — previously the chart shift was real but subtle enough to look like a no-op.
- **Engine unchanged.** No maths changes from build 053; this build only surfaces a new input and a new readout.

## Version 1.0 build 053

### Pane 5 — True two-bucket Risk Simulator (cash-drag fix)

- **Dual-bucket engine.** The Monte Carlo engine now tracks Equities and Cash as separate buckets every year of every run, instead of treating the whole pot as one volatile blob. Equities follow the chosen return model (Historical or Parametric); Cash earns a deterministic real return (new slider, default 1%).
- **Defensive draw rule.** Each year the simulator decides which bucket to spend from. In a "good" year (equities clear the defensive threshold) it spends from Equities and **refills the Cash Pot** up to its starting size. In a "bad" year it spends from Cash to avoid forced selling at a discount.
- **Threshold presets.** Three buttons: **Strict** (cash only on negative nominal years), **Standard** (default — cash whenever equities don't beat inflation), **Aggressive** (cash whenever equities under-perform the Assumed Growth Rate).
- **Equities / Cash overrides.** The single "Total Capital" override is replaced by separate **Equities** and **Cash Pot** inputs, each seeded from the latest ledger entry, each with an amber "✎ what-if" marker and a "Reset to actual" link. Overrides are never persisted.
- **Deterministic path matches.** The grey "Assumed" line now walks the same two-bucket refill/draw rules so it is comparable to the median, not idealised.
- **Documentation.** HelpContent ("How to read this") and the in-panel help now describe the two-bucket model, the threshold rule, and the overrides. The standalone manual is bumped to Edition V to match.

## Version 1.0 build 052

### Mobile gate fix

- **Persistent dismissal.** The "Best viewed on a larger screen" overlay now stores its dismissal in `localStorage` (key `sg_mobile_gate_dismissed_v2`) instead of `sessionStorage`, so acknowledging it once permanently hides it on that device. Previously it reappeared every time the tab was re-opened or refreshed on mobile.
- **No resize re-trigger.** Removed the `resize` listener that could re-show the gate after dismissal if the viewport briefly crossed the 900px threshold; the gate is now evaluated once on mount only.

## Version 1.0 build 041

### Pane 5 — Risk Simulator: documentation & input polish

- **"How to read this" panel.** Added a Zoom & hover paragraph describing the new brush, auto-rescaling Y-axis, pan, double-click reset, and crosshair tooltip.
- **Pension Start Age input.** Removed the native number-spinner arrows so the field height matches the Annual Withdrawal and Annual Pension inputs — tidier row alignment.
- **Manual & Help.** Quick Start and Full Manual already document the zoom brush from build 040; in-panel help now mentions it too.

## Version 1.0 build 040

### Pane 5 — Risk Simulator: zoom brush & hover tooltip

- **Zoom brush.** New compact draggable strip beneath the fan chart with two handles. Drag either handle to narrow the time window, drag the highlighted region to pan, double-click to reset. Mini p10–p90 preview is rendered inside the brush so the overall shape stays visible while zooming. Handles are keyboard accessible (`role="slider"` + arrow keys).
- **Auto-rescaling Y-axis.** Y-axis domain recomputes from the visible window only, so when you zoom into a short horizon the lines no longer look flat — gridlines, labels, fan bands, median and deterministic line all rebuild smoothly to fit.
- **Crosshair + tooltip.** Hover the chart area to drop a dashed crosshair on the nearest year, with an absolutely-positioned, semi-transparent tooltip card (auto-flips at the right edge) showing Age, Assumed Growth, 90th percentile, Median Path, and 10th percentile — color-coded to match the chart series.
- **Axis labels.** X-axis ticks now show absolute Age when Current Age is set, falling back to `+Ny` otherwise.

## Version 1.0 build 037

### Beta Release Candidate — cleanup & rename

- **Renamed app to "Sovereign Glidepath"** everywhere (dropped trailing "Desk"): Electron window title, `electron-builder.yml` `productName` / `appId` / `artifactName`, all NSIS installer strings (Start Menu, Desktop shortcut, uninstall keys, output filename `SovereignGlidepath-Setup-<version>.exe`), `package.json` `name` and `package:win` / `installer` scripts, both `build-installer.{sh,ps1}` wrappers, `installer/LICENSE.txt`, `installer/README.md`, `installer/BUILD-INSTRUCTIONS.md`, root route metadata (`<title>`, OG / Twitter tags), `desktop/index.html`.
- **Dropped legacy "Horizon" codename.** Component file `SovereignHorizonDesk.tsx` → `SovereignGlidepath.tsx` and exported symbol renamed; standalone manual `public/sovereign-horizon-manual.html` → `public/sovereign-glidepath-manual.html` (in-app "📖 Full Manual" button updated to match).
- **Removed orphan files.** Deleted unreferenced `public/sovereign-horizon-desk.html`, committed build output `dist-desktop/`, and stale `tsconfig.tsbuildinfo`. Added `dist-installer/` and `tsconfig.tsbuildinfo` to `.gitignore`.
- **Integrity verified.** Full grep returns zero hits for the old names in source; `tsgo --noEmit`, `eslint`, and `vite build` all clean.

### Notes

- `appId` change in `electron-builder.yml` (`com.sovereignhorizon.desk` → `com.sovereignglidepath.app`) means a fresh-install on Windows will not see the previous install — acceptable for the Beta RC.
- Historical CHANGELOG entries retain their original "Sovereign Glidepath Desk" wording for accuracy.

---

## Version 1.0 build 036

### Documentation

- **Help / Quick Start** and **Full Manual** updated to document the new Deactivate License button and the Re-activate label, including the "transfer to another machine" workflow.

---

## Version 1.0 build 035

### Licensing

- **Deactivate License button** added inside the Activate License modal (only visible when a license is active). Clears the saved license from this device after a confirmation prompt, so users can transfer their license to another machine without touching DevTools / localStorage.
- Modal's primary button now reads **Re-activate** when a license is already loaded, making the re-entry flow obvious.

---

## Version 1.0 build 034

### Housekeeping

- Build bump to force a fresh bundle fetch after the offline licensing v2 rollout (some preview clients were still serving cached build 032).

---

## Version 1.0 build 033

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

## Version 1.0 build 032

### Rename

- App renamed from **Sovereign Glidepath Desk** to **Sovereign Glidepath** across UI strings, route metadata, disclaimer copy, exit confirmation and backup descriptor.

### Pane 6 — Can I Afford This?

- Default source toggle now opens on **Equities** (was "Cash first"). Source order reordered to Equities / Cash / Cash-first.
- Added a short italic hint above the quick-select preset buttons explaining they are toggles that sum together.

### Build

- Version bumped to **1.0.32**. Run `npm run installer` → `dist-installer/SovereignGlidepathDesk-Setup-1.0.32.exe`.

---

## Version 1.0 build 031

### Documentation

- **Quick Start** updated with a description of the six-column ledger layout and the new Drawdown-from-ATH colour bands.
- **Full Manual** (Chapter 4, panel 5) extended with the same six-column breakdown.

### Hidden shortcut

- Shift-click on the **Restore** button now opens the changelog (previously on the License button). No hover hint — kept undocumented by design.

### Build

- Version bumped to **1.0.31**. Run `npm run installer` → `dist-installer/SovereignGlidepathDesk-Setup-1.0.31.exe`.

---

## Version 1.0 build 030

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

## Version 1.0 build 029

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

## Version 1.0 build 028

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

## Version 1.0 build 027

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

## Version 1.0 build 026

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

## Version 1.0 build 025

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

## Version 1.0 build 024

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

## Version 1.0 build 023

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

## Version 1.0 build 022

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

## Version 1.0 build 021

### Risk Simulator (Monte Carlo)

- **New Pension fields (both Historical and Parametric modes).** Enter an
  annual pension amount (today's £) and the age at which it begins. From
  that age onward, the simulator reduces the net draw on the pot by the
  pension amount (`net = max(0, withdrawal − pension)`). Before pension
  age the full withdrawal is funded from capital, producing materially
  more realistic long-term outcomes for users with state or DB pensions
  starting later in retirement.

---

## Version 1.0 build 020

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

## Version 1.0 build 019

### Desktop app

- **Changelog button opens the changelog in the desktop build** instead of
  spawning a second copy of the main desk. The Electron renderer now handles
  the `#/changelog` hash route and mounts `ChangelogContent` directly.
- **Single-instance lock.** Launching the app while it is already running no
  longer opens a second window — `app.requestSingleInstanceLock()` releases
  the duplicate process and the `second-instance` event restores / focuses
  the existing window.

---

## Version 1.0 build 018

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

## Version 1.0 build 016

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

## Version 1.0 build 015

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

## Version 1.0 build 014

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

## Version 1.0 build 013

### Documentation

- **Full Manual updated** — Folded the dashed-line curvature explanation
  into the in-app Help / Full Manual under "Risk Simulator — Monte Carlo
  fan chart", so users see it alongside the rest of the chart-reading
  guidance (not only in the changelog). Quick start unchanged — it stays
  a 6-step orientation; the deeper "why" lives in the Risk Simulator
  section where it belongs.

---

## Version 1.0 build 012

### Documentation / knowledge base

- **Why the dashed assumption line curves** — Added to the changelog record.
  The dashed line in the Monte Carlo Fan Chart is not straight because it
  reflects compounding growth _minus_ annual withdrawals:

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

## Version 1.0 build 011

### New features

- **In-app changelog viewer** — A "Changelog" button in the header opens a
  dedicated page listing every build's changes, so you can see what's new
  without leaving the app.

---

## Version 1.0 build 010

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
  - Now seeds its initial value from _Target Annual Base Withdrawal_ (Pane 1).
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

## Version 1.0 build 009 — earlier

- First Electron-packaged Windows portable release.
- Risk Simulator "How to read" inline help.
- Quick Start and Full Manual updated to cover the Monte Carlo Fan Chart.
- Percentile colour direction corrected so "majority of futures beat your
  assumption" reads green, not red.

## Version 1.0 build 008 and earlier

Not formally tracked — see Git history for context.
