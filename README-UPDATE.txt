Sovereign Glidepath — Web Update (Build 119)
=====================================================================

This zip is a drop-in replacement for the web-hosted (Cloudflare Pages) copy
of Sovereign Glidepath. It contains ONLY the files needed for the web demo;
desktop/installer artefacts (Electron, NSIS installer, etc.) are intentionally
excluded, as they always have been.

The currently-hosted site is running roughly Build 069. This zip brings it
up to Build 119. A LOT has changed under the hood since 069 — including the
drawdown engine itself (engine.ts / drawdown.ts) — so this is a full
overwrite, not a selective patch. Do not try to merge file-by-file; replace
everything.

Contents
--------
- public/   (includes the Full Manual, Quick Start Guide content, and the
             new Comparison Builder companion tool — comparison-builder.html,
             comparison_builder_guide.html)
- src/
- package.json
- tsconfig.json
- vite.config.ts
- wrangler.jsonc
- .gitignore

What's in this update
----------------------
- Everything shipped in Builds 070 through 119 (AES-256-GCM app-lock and
  encryption at rest, the Guyton-Klinger engine correctness fixes, per-row
  planning assumptions, the Companion Apps / Comparison Builder launcher,
  and the rest of the changelog).
- Full Manual and Quick Start Guide brought up to date with App-Lock,
  Companion Apps, and Extraordinary Inflow documentation (previously
  undocumented).
- Build 119: Pane 1's "Assumed Real Growth Rate" label no longer shows the
  "Shown on chart as [icon]" lead-in text — that phrasing now only appears
  on Pane 5 (the Risk Simulator), next to its own fan-chart legend, where
  it actually points at something.

Option A — GitHub web UI
------------------------
1. Open your repo on github.com.
2. Click "Add file" → "Upload files".
3. Drag the contents of this zip (not the zip itself) into the upload area.
   Keep the folder structure intact — this will overwrite public/, src/,
   and the root config files named above.
4. Commit directly to the default branch with message:
   "Sync to Build 119"

Option B — Git CLI
------------------
1. Unzip into your local clone, overwriting existing files:
     unzip -o sovereign-glidepath-web-update.zip -d /path/to/repo
2. From the repo root:
     git add -A
     git commit -m "Sync to Build 119"
     git push

Cloudflare
----------
No action needed. Cloudflare Pages is wired to the GitHub repo, so the push
automatically triggers a new build and redeploy (usually live in 1–2 min).
Watch progress in: Cloudflare → Workers & Pages → your project → Deployments.

Note on CHANGELOG.md
---------------------
Your GitHub repo already has a CHANGELOG.md from an earlier upload (around
two months old, so it stops well short of Build 119). This zip does not
include a replacement — CHANGELOG.md isn't required for the site to build
or run. If you'd like the GitHub copy brought up to date too, say the word
and it can be added to a future update zip.

Note on the manual's version stamp
------------------------------------
public/sovereign-glidepath-manual.html's cover currently reads "Version
1.0.118" — one build behind the real 1.0.119 in package.json, since 119
landed after the manual's cover was last hand-corrected. Cosmetic only;
worth a one-line fix in Lovable's file editor next time you're in there
(no prompt credit needed), but not blocking this deploy.
