Sovereign Glidepath — Update Reference (Build 1.0.131)
==========================================================

This is a reference document for publishing updates, kept up to date each
build. The actual publish process changed since earlier versions of this
file — the instructions below are current as of Build 131. Ignore any older
copy of this file describing GitHub's web upload or the Git CLI; that
workflow is obsolete now that GitHub Desktop is set up.

What's in Build 131
--------------------
- New: Pane 2 flags a "potential underspend" pattern — realised withdrawal
  rate falling well below your original starting rate, combined with the
  pot never having fallen more than ~10% below its starting value. Soft
  pre-notice at year 3, real evaluation from year 5, re-fires yearly with a
  running count if it keeps holding. Thresholds are live-editable in the
  tile. See manual chapter 51 for the full explanation.
- Fixed: Pane 4's ledger chart no longer squashes its x-axis labels into an
  unreadable smear on a long-running ledger. Every quarter still gets a
  tick mark; past 8 years, only every other quarter gets a text label. The
  hover tooltip is unaffected either way.
- Changed: the two bundled QA scenarios built from a real personal ledger
  are now labelled "Typical Ledger" rather than a specific person's name.
- Folded in: the whole-pounds tooltip/axis fix from the previous informal
  update is now a properly numbered, changelog-documented build.

Full details: CHANGELOG.md at the project root, or the in-app Changelog
page.

How to publish an update (current process)
---------------------------------------------
1. In Lovable, publish/export the project to get the full codebase as a
   zip.
2. Unzip it directly into your sovereign-glidepath-LIVE folder (the one
   cloned via GitHub Desktop), overwriting existing files when prompted —
   choose "Replace the files in the destination."
3. Open GitHub Desktop. It automatically detects everything that changed —
   additions, edits, and deletions — no manual steps needed to spot any of
   it.
4. Review the change list. For a normal update this should be a
   reasonably contained set of files matching what actually changed (see
   "What's in Build 131" above) plus routine files like CHANGELOG.md.
   A very large batch of purely new (green +) files, especially anything
   under desktop/, electron/, installer/, or scripts/, most likely means
   this is the first time a full Lovable export has been synced since an
   earlier partial/web-only sync — expected once, not a sign anything's
   wrong.
5. Type a short summary describing the update (e.g. "Build 131: underspend
   signal, chart axis fix"), click "Commit to main", then click
   "Push origin".
6. Cloudflare Pages is wired to the GitHub repo and rebuilds automatically
   on push — usually live within 1-2 minutes. Check Cloudflare's
   Deployments tab if you want to watch it happen, or just hard-refresh
   (Ctrl+F5) the live site after a couple of minutes.

Nothing else needed — no batching, no upload size limits, no separate zip
required from anyone else. This file will be updated again alongside the
next build's changes.
