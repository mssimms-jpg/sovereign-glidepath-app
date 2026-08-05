Sovereign Glidepath — Web Update (Build 120)
=====================================================================

This zip is a drop-in replacement for the web-hosted (Cloudflare Pages) copy
of Sovereign Glidepath. It contains ONLY the files needed for the web demo;
desktop/installer artefacts (Electron, NSIS installer, etc.) are intentionally
excluded, as they always have been.

The currently-hosted site is running roughly Build 069. This zip brings it
up to Build 120. A LOT has changed under the hood since 069 — including the
drawdown engine itself (engine.ts / drawdown.ts) — so this is a full
overwrite, not a selective patch. Do not try to merge file-by-file; replace
everything.

Contents
--------
- public/   (includes the Full Manual, Quick Start Guide content, the
             Comparison Builder companion tool, and the Risk Simulator's
             new standalone route)
- src/
- package.json
- tsconfig.json
- vite.config.ts
- wrangler.jsonc
- .gitignore

What's in this update
----------------------
- Everything shipped in Builds 070 through 120 (AES-256-GCM app-lock and
  encryption at rest, the Guyton-Klinger engine correctness fixes, per-row
  planning assumptions, the Companion Apps section, and the rest of the
  changelog).
- Full Manual and Quick Start Guide brought up to date with App-Lock,
  Companion Apps, and Extraordinary Inflow documentation.
- Build 119: Pane 1's growth rate label tidy-up (dropped the "Shown on
  chart as" cue, which now only appears on the Risk Simulator).
- Build 120: the Risk Simulator (formerly Pane 5) moved out of the main
  scroll into its own page at /risk-simulator, launched from a new card in
  Pane 2's Companion Apps section — same pattern as the Comparison Builder.
  It opens with a live snapshot of your current plan; nothing entered there
  writes back to the real ledger. The remaining panes renumbered down to
  close the gap (Can I Afford This? is now Pane 5, Extraordinary Inflow is
  Pane 6, the Ledger is Pane 7). Includes a follow-up fix so the new page
  correctly picks up the app's stylesheet (it was rendering unstyled in an
  earlier export of this build).

Option A — GitHub web UI
------------------------
1. Open your repo on github.com.
2. Click "Add file" → "Upload files".
3. Drag the contents of this zip (not the zip itself) into the upload area.
   Keep the folder structure intact — this will overwrite public/, src/,
   and the root config files named above.
4. Commit directly to the default branch with message:
   "Sync to Build 120"

Option B — Git CLI
------------------
1. Unzip into your local clone, overwriting existing files:
     unzip -o sovereign-glidepath-web-update.zip -d /path/to/repo
2. From the repo root:
     git add -A
     git commit -m "Sync to Build 120"
     git push

Cloudflare
----------
No action needed. Cloudflare Pages is wired to the GitHub repo, so the push
automatically triggers a new build and redeploy (usually live in 1–2 min).
Watch progress in: Cloudflare → Workers & Pages → your project → Deployments.

Notes
-----
- CHANGELOG.md in this zip does not yet have a Build 120 entry — the in-app
  changelog (src/components/sovereign/ChangelogContent.tsx) does, but the
  two drifted apart at this build. Not required for the site to run; worth
  a quick manual add if you'd like the two back in sync.
- public/sovereign-glidepath-manual.html's cover still reads "Version
  1.0.118" — now two builds behind. Cosmetic only, hand-editable in Lovable
  whenever convenient.
