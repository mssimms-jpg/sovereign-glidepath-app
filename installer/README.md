# Sovereign Glidepath — Windows installer (NSIS)

This folder contains everything needed to build a real `Setup.exe`
installer for Windows, separate from the Electron-builder portable
target already configured at the project root.

## One-command build (Windows)

After cloning, this is all you need:

1. Drop your `app.ico` into `installer/assets/`
2. `npm install`
3. `npm run installer`

The `installer` script runs `build:desktop` → `package:win` → `makensis`
end-to-end and writes
`dist-installer/SovereignGlidepath-Setup-<version>.exe`, where
`<version>` is read straight from `package.json`.

> **New to this?** See `installer/BUILD-INSTRUCTIONS.md` for a fully
> spelled-out, no-assumptions step-by-step Windows build guide.

> **Version format:** use 3 parts in `package.json` (e.g. `1.0.37`).
> The `.nsi` pads to the 4-part `VIProductVersion` Windows requires.
> A 4-part version in `package.json` produces an invalid 5-part
> metadata version and a malformed filename.

## Pipeline (what `npm run installer` does)

1. `vite build --config desktop/vite.config.ts` — produces `dist-desktop/` (uses `base: './'`)
2. `electron-packager . "Sovereign Glidepath" --platform=win32 --arch=x64 --out=electron-release --overwrite --icon=installer/assets/app.ico`
   → outputs `electron-release/Sovereign Glidepath-win32-x64/`
3. `node -e "mkdirSync('dist-installer',{recursive:true})"` — ensures the output dir exists (NSIS won't create it)
4. `makensis -DVERSION=<pkg.version> -DSOURCE_DIR="..\electron-release\Sovereign Glidepath-win32-x64" installer/installer.nsi`
   → outputs `dist-installer/SovereignGlidepath-Setup-<version>.exe`


The bundled scripts wrap the same steps for CI / manual runs:

- `installer/build-installer.ps1` — Windows / PowerShell
- `installer/build-installer.sh`  — Linux / macOS / WSL

## Required tooling

| Tool                | Min version | Notes                                          |
| ------------------- | ----------- | ---------------------------------------------- |
| Node.js             | 20.x        | Matches the project's lockfile                 |
| `@electron/packager`| 18.x        | Installed as a dev dependency on first run     |
| NSIS                | 3.09        | Provides `makensis`. On Debian/Ubuntu: `apt install nsis`. On Windows: https://nsis.sourceforge.io/Download |

## Assets you supply

Drop `app.ico` into `installer/assets/` before running the build (the
script will fall back to packaging without it if missing, but the
installer will look generic): 256×256 ICO used as installer icon,
uninstaller icon and shortcut icon.

## Code signing (recommended)

Sign the produced installer with `signtool` (Microsoft SDK):

```
signtool sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 ^
  /f path\to\cert.pfx /p <password> ^
  dist-installer\SovereignGlidepath-Setup-<version>.exe
```

Sign the inner `.exe` (the application binary in
`electron-release\Sovereign Glidepath-win32-x64\Sovereign Glidepath.exe`)
**before** packaging the installer so Windows SmartScreen treats the app
itself as trusted, not just the installer.

## Single-instance behaviour

The application enforces a single running instance via Electron's
`requestSingleInstanceLock()` (see `electron/main.cjs`). Launching the
app a second time focuses the existing window. The installer
additionally refuses to run twice via a named mutex.

## Bumping version

Update `package.json` `"version"` (the build scripts read it
automatically) and run the build script. `VIProductVersion` in
`installer.nsi` requires a four-part numeric version — the script pads
to `X.Y.Z.0` automatically.
