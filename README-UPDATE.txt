Sovereign Glidepath — Web Update Build 052
===========================================
Version: 1.0.52

Fix: Mobile "best viewed on larger screen" overlay now uses localStorage,
so dismissing it once permanently hides it (instead of reappearing on
every refresh on a phone).

Deployment (drop-in for the existing Cloudflare/GitHub repo)
------------------------------------------------------------
1. Unzip into the root of your Sovereign Glidepath repository, overwriting
   matching files.
2. Commit & push. Cloudflare Pages will rebuild automatically.

Files included: package.json, CHANGELOG.md, public/, src/.
Excluded: node_modules, electron/, installer/, dist*, .git, large binaries.
