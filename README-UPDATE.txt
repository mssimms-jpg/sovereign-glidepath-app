Sovereign Glidepath — Web Update (Build 120 + Comparison Builder fix)
=====================================================================

This zip is a drop-in replacement for the web-hosted (Cloudflare Pages) copy
of Sovereign Glidepath. It contains ONLY the files needed for the web demo;
desktop/installer artefacts (Electron, NSIS installer, etc.) are intentionally
excluded, as they always have been.

The currently-hosted site is running roughly Build 069. This zip brings it
up to Build 120, plus one hand-applied fix layered on top (see below). A LOT
has changed under the hood since 069 — including the drawdown engine itself
(engine.ts / drawdown.ts) — so this is a full overwrite, not a selective
patch. Do not try to merge file-by-file; replace everything.

Contents
--------
- public/   (includes the Full Manual, Quick Start Guide content, the
             Comparison Builder companion tool, and the Risk Simulator's
             standalone route)
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
  planning assumptions, the Companion Apps section, the Risk Simulator's
  move to its own page, and the rest of the changelog).
- Full Manual and Quick Start Guide brought up to date with App-Lock,
  Companion Apps, and Extraordinary Inflow documentation.
- Comparison Builder fix, applied directly (not a numbered Lovable build):
  clicking a specific year's bar in the results chart, and the Download
  Excel Workbook button, both did nothing. Root cause was a stray reference
  to an out-of-scope variable (isInitialLoad) thrown on every comparison
  run, which — because it happened in a top-level script statement, not
  inside a function — silently prevented every event listener declared
  later in the file (the chart-click handler, the download button) from
  ever being registered. Fixed by threading isInitialLoad through to the
  function that needed it. Verified in an automated headless-browser test,
  not just by reading the code: confirmed both listeners now register, the
  chart-click correctly jumps to the clicked year, and the download flow
  reaches its intended code path with no errors.

Option A — GitHub web UI
------------------------
1. Open your repo on github.com.
2. Click "Add file" → "Upload files".
3. Drag the contents of this zip (not the zip itself) into the upload area.
   Keep the folder structure intact — this will overwrite public/, src/,
   and the root config files named above.
4. Commit directly to the default branch with message:
   "Sync to Build 120 (+ Comparison Builder click/download fix)"

Option B — Git CLI
------------------
1. Unzip into your local clone, overwriting existing files:
     unzip -o sovereign-glidepath-web-update.zip -d /path/to/repo
2. From the repo root:
     git add -A
     git commit -m "Sync to Build 120 (+ Comparison Builder click/download fix)"
     git push

Cloudflare
----------
No action needed. Cloudflare Pages is wired to the GitHub repo, so the push
automatically triggers a new build and redeploy (usually live in 1–2 min).
Watch progress in: Cloudflare → Workers & Pages → your project → Deployments.

Notes
-----
- CHANGELOG.md and the manual's cover version stamp still trail slightly
  behind (no Build 120 entry in CHANGELOG.md; manual cover reads 1.0.118).
  Neither affects the site running — cosmetic housekeeping for whenever
  convenient.
