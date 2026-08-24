---
name: update-zip
description: Build a web-only drop-in update zip of the Sovereign Glidepath repo for Cloudflare/GitHub deployment. Triggers on "/update-zip", "update zip", "build update package", or "drop-in zip". Produces a zip in /mnt/documents containing only the files Cloudflare Pages needs, excluding desktop/installer bloat, plus a README-UPDATE.txt with GitHub web and CLI instructions.
---

# /update-zip

Build a web-only drop-in update zip of the current repo at the current build number, save it to `/mnt/documents/`, and return the artifact link.

## When to use

User types `/update-zip`, asks for an "update zip", "update package", "drop-in zip", or "Cloudflare/GitHub update bundle".

## Inputs to confirm (silently — infer from repo)

- Build number: read from `package.json` `version` field (e.g. `1.0.48` → Build 048).
- Output filename: `sovereign-glidepath-web-build<NNN>.zip` where NNN is zero-padded patch version.

If the user adds qualifiers:
- "delta only since build XXX" → include only files changed since that build (ask if no reference is given).
- "include everything" / "full codebase" → skip the exclude list.

## What to include

- `public/`
- `src/`
- `package.json`
- `tsconfig.json`
- `vite.config.ts`
- `wrangler.jsonc`
- `.gitignore`
- `CHANGELOG.md`
- `README-UPDATE.txt` (generated, see template below)

## What to exclude (always)

`electron/`, `desktop/`, `installer/`, `release/`, `scripts/`, `dist/`, `dist-installer/`, `node_modules/`, `electron-builder.yml`, any `*.exe`, `*.msi`, `*.dmg`, `*.AppImage`, `.DS_Store`.

## Procedure

1. Read `package.json` to get the version. Compute `NNN` = zero-padded patch (e.g. `48` → `048`).
2. Verify `package.json` version and the header build string in `src/components/sovereign/SovereignGlidepath.tsx` agree. If not, flag to user before zipping.
3. Stage files in `/tmp/update-zip-build<NNN>/` using `rsync` or `cp` with the include list above.
4. Write `README-UPDATE.txt` into the staging dir using the template below.
5. Zip with `cd /tmp/update-zip-build<NNN> && zip -r /mnt/documents/sovereign-glidepath-web-build<NNN>.zip . -x "*.DS_Store"`.
6. Emit the artifact tag and a one-line confirmation that Cloudflare Pages will auto-redeploy on push.

## Artifact tag

```
<presentation-artifact path="sovereign-glidepath-web-build<NNN>.zip" mime_type="application/zip"></presentation-artifact>
```

## README-UPDATE.txt template

```
Sovereign Glidepath — Web Update Build <NNN>
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
2. Click "Add file" → "Upload files".
3. Drag the contents of this zip (not the zip itself) into the upload area.
   Keep the folder structure intact.
4. Commit directly to the default branch with message:
   "Sync to Build <NNN>"

Option B — Git CLI
------------------
1. Unzip into your local clone, overwriting existing files:
     unzip -o sovereign-glidepath-web-build<NNN>.zip -d /path/to/repo
2. From the repo root:
     git add -A
     git commit -m "Sync to Build <NNN>"
     git push

Cloudflare
----------
No action needed. Cloudflare Pages is wired to the GitHub repo, so the push
automatically triggers a new build and redeploy (usually live in 1–2 min).
Watch progress in: Cloudflare → Workers & Pages → your project → Deployments.
```

## Notes

- Never include `node_modules/` — the user has reported >100 MB push failures before.
- Do not bump the version as part of this command; only package what's there.
- If the repo has uncommitted desktop/installer changes, ignore them — this command is web-only by design.
- `CHANGELOG.md` is included even though nothing in the running app reads it directly (the in-app changelog at
  `/changelog` is served entirely from `ChangelogContent.tsx` in `src/`, kept manually in sync). It's included so the
  GitHub repo itself shows an up-to-date changelog file, not because the build needs it. Added at Build 122 — this
  skill predates that build and had omitted it by oversight, not by design.
