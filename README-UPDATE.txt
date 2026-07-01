Sovereign Glidepath — Web Update Build 057
==========================================

Drop-in replacement for the Cloudflare Pages web copy. Contains only
files needed for the web demo (no desktop/installer binaries).

Option A — GitHub web UI
------------------------
1. github.com → your repo → Add file → Upload files.
2. Drag the CONTENTS of this zip (not the zip itself), preserving structure.
3. Commit to default branch: "Sync to Build 057".

Option B — Git CLI
------------------
  unzip -o sovereign-glidepath-web-build057.zip -d /path/to/repo
  cd /path/to/repo && git add -A && git commit -m "Sync to Build 057" && git push

Cloudflare Pages auto-redeploys on push (live in 1–2 min).
