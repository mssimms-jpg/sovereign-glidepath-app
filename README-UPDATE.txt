Sovereign Glidepath — Web Update Build 063
=============================================

Drop-in replacement for the Cloudflare Pages copy of Sovereign Glidepath.
Web files only; desktop/installer artefacts excluded to stay under GitHub's
100 MB limit.

Contents
--------
- public/
- src/
- package.json
- tsconfig.json
- vite.config.ts
- wrangler.jsonc
- .gitignore

Option A — GitHub web UI
------------------------
1. Open your repo on github.com.
2. "Add file" → "Upload files".
3. Drag the contents of this zip (not the zip itself) into the upload area,
   keeping the folder structure intact.
4. Commit to the default branch: "Sync to Build 063".

Option B — Git CLI
------------------
    unzip -o sovereign-glidepath-web-build063.zip -d /path/to/repo
    cd /path/to/repo
    git add -A
    git commit -m "Sync to Build 063"
    git push

Cloudflare
----------
No action needed — Cloudflare Pages is wired to the GitHub repo and will
redeploy automatically (usually 1–2 min). Watch progress in
Cloudflare → Workers & Pages → your project → Deployments.
