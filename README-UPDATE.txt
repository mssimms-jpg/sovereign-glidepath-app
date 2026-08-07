Sovereign Glidepath — Web Update Build 122
=============================================

This zip is a drop-in replacement for the web-hosted (Cloudflare Pages) copy
of Sovereign Glidepath. It contains ONLY the files needed for the web demo;
desktop/installer artefacts are intentionally excluded to stay under
GitHub's 100 MB file limit.

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
   "Sync to Build 122"

Option B — Git CLI
------------------
1. Unzip into your local clone, overwriting existing files:
     unzip -o sovereign-glidepath-web-build122.zip -d /path/to/repo
2. From the repo root:
     git add -A
     git commit -m "Sync to Build 122"
     git push

Cloudflare
----------
No action needed. Cloudflare Pages is wired to the GitHub repo, so the push
automatically triggers a new build and redeploy (usually live in 1-2 min).
Watch progress in: Cloudflare -> Workers & Pages -> your project -> Deployments.

What's new since the last web sync (Build 120 + Comparison Builder fix)
-------------------------------------------------------------------------
- Risk Simulator CSS fix (shd-root class + desk.css import)
- Comparison Builder click/download fix (isInitialLoad scope bug)
- Comparison Builder £ prefix on money fields
- Editable Current Age field in the Risk Simulator
- Build 121: package.json bump, CHANGELOG.md and in-app changelog entries
- Build 122: Risk Simulator and Comparison Builder now both follow the
  currency selected on Pane 1 (previously both were hardcoded to £ for
  field values, chart labels, and the Comparison Builder's Excel export)
- Comparison Builder and Risk Simulator now share a consistent header/User
  Guide button treatment (primary blue); the old "Simulator Guide" button
  was removed from the main app's help row since it's now reachable from
  within the Risk Simulator itself
- Full Manual, Quick Start Guide, and the Risk Simulator's own guide had a
  round of outdated "Pane 5" references corrected, including a genuine
  pane-numbering error in two Full Manual chapters (was off by one against
  the live app)
