Sovereign Glidepath — Web Demo Update (Build 048)
==================================================

This bundle is a drop-in replacement for the seven items already in your
GitHub repo (the same minimal Cloudflare set used for Build 047):

  .gitignore
  package.json
  tsconfig.json
  vite.config.ts
  wrangler.jsonc
  public/
  src/

WHAT'S NEW IN 048
-----------------
Risk Simulator pension start age fix. The fan-chart kink now lands at the
pension start age (e.g. 67) instead of one year early. Isolated change in
src/components/sovereign/MonteCarloPanel.tsx; engine/ledger untouched.

HOW TO APPLY (GitHub web UI)
----------------------------
1. Open your repo on github.com.
2. For each top-level file (.gitignore, package.json, tsconfig.json,
   vite.config.ts, wrangler.jsonc): click the file → pencil icon → paste
   the new contents → Commit.
3. For public/ and src/: easiest is "Add file → Upload files" and drag the
   folders from this zip into the repo root. GitHub overwrites matching
   paths. Commit.

HOW TO APPLY (command line)
---------------------------
Unzip into a working copy, then:
    git add -A
    git commit -m "Sovereign Glidepath build 048"
    git push

CLOUDFLARE
----------
Nothing to do. Cloudflare Pages picks up the push automatically and
redeploys within a minute or two. Watch progress in
Workers & Pages → your project → Deployments.

VERIFY
------
After deploy, header should read "v1.0 build 048". In Pane 5 with
pensionAge 67, the fan-chart slope change should sit at x = 67.
