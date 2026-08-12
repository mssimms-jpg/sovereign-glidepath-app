Sovereign Glidepath — Web Update Build 124
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
   "Sync to Build 124"

Option B — Git CLI
------------------
1. Unzip into your local clone, overwriting existing files:
     unzip -o sovereign-glidepath-web-build124.zip -d /path/to/repo
2. From the repo root:
     git add -A
     git commit -m "Sync to Build 124"
     git push

Cloudflare
----------
No action needed. Cloudflare Pages is wired to the GitHub repo, so the push
automatically triggers a new build and redeploy (usually live in 1-2 min).
Watch progress in: Cloudflare -> Workers & Pages -> your project -> Deployments.

What's new since the last web sync (Build 123)
-------------------------------------------------
- Accumulation Simulator now has its own dedicated manual, matching the
  Risk Simulator and Comparison Builder guides; the previously-unwired
  "User Guide" button on that page now opens it
- Fixed the Risk Simulator's "Back to..." link to reliably read "Back to
  Accumulation Simulator" when opened that way
- Fixed a real page freeze in both simulators: the 10,000-path calculation
  now runs deferred rather than blocking the page for 200-580ms
- Removed a "Recalculating..." indicator that was added to address the
  freeze above, after it turned out to cause a visible layout judder on
  the Windows desktop build. The underlying deferred-calculation fix is
  kept; the visible indicator itself was removed entirely for simplicity
- Fixed a data-loss risk: pending encrypted ledger writes are now flushed
  when the tab closes
- Fixed a mislabelled CSV export column: "Realised Withdrawal Rate" now
  correctly reads "Target Withdrawal Rate"
- Full Manual and Quick Start Guide brought up to date with the
  Accumulation Simulator and the Risk Simulator's Current Age / Horizon
  Age what-if fields, both previously undocumented. Full Manual's cover
  version stamp also corrected (was showing Build 118)
