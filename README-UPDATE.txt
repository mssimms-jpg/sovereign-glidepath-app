Sovereign Glidepath — Web Update (Build 1.0.130 + tooltip/axis whole-pounds fix)
=================================================================================

This zip is a drop-in replacement for the web-hosted (Cloudflare Pages) copy
of Sovereign Glidepath. It contains ONLY the files needed for the web demo;
desktop/installer artefacts are intentionally excluded to stay under
GitHub's 100 MB file limit.

What's in this update since the last GitHub push (Build 130)
--------------------------------------------------------------
Small follow-up fix, not a version-numbered build: the Risk Simulator and
Accumulation Simulator chart tooltips, and the Accumulation Simulator's
value-axis labels, now show whole pounds instead of pounds-and-pence. Fixes
tooltip text overflowing its box. Everywhere else in the app (ledger, forms,
summary stats) is unchanged and still shows full pence precision.

Contents
--------
- public/
- src/
- package.json
- tsconfig.json
- vite.config.ts
- wrangler.jsonc
- .gitignore
- CHANGELOG.md

Option A — GitHub web UI
------------------------
1. Open your repo on github.com.
2. Click "Add file" -> "Upload files".
3. Drag the contents of this zip (not the zip itself) into the upload area.
   Keep the folder structure intact.
4. Commit directly to the default branch with message:
   "Sync: whole-pounds tooltip/axis fix"

Option B — Git CLI
------------------
1. Unzip into your local clone, overwriting existing files:
     unzip -o sovereign-glidepath-web-latest.zip -d /path/to/repo
2. From the repo root:
     git add -A
     git commit -m "Sync: whole-pounds tooltip/axis fix"
     git push

Cloudflare
----------
No action needed. Cloudflare Pages is wired to the GitHub repo, so the push
automatically triggers a new build and redeploy (usually live in 1-2 min).
Watch progress in: Cloudflare -> Workers & Pages -> your project -> Deployments.
