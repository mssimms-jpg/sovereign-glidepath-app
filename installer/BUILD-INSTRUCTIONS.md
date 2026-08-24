# Building the Windows Installer — Step by Step

This guide assumes **you have never built a Node.js or Electron app
before**. Follow it top to bottom and you will end up with a single
file:

```
dist-installer\SovereignGlidepath-Setup-1.0.37.exe
```

(The number on the end is whatever `"version"` is set to in
`package.json` at the time you build.)

That `.exe` is a standard Windows installer (Next → Next → Finish).
Double-clicking it installs Sovereign Glidepath, adds Start Menu
and Desktop shortcuts, and registers an uninstaller in
**Settings → Apps**.

---

## ⚠️ Important — about the version number

The version in `package.json` is the **single source of truth**. The
installer script reads it automatically — you do **not** need to edit
the script.

Use **three parts only**: `MAJOR.MINOR.PATCH` — e.g. `1.0.37`.

The NSIS script automatically pads this to the 4-part form that
Windows requires for metadata (`1.0.37.0`). If you type a 4-part
version yourself (e.g. `1.0.0.37`) the build will fail with a
malformed filename and / or `Can't open output file`.

---

## 0. One-time setup on the build machine

You only do this section **once**. After that, every future build is
just sections 4–5.

### 0.1 Node.js 20 LTS

1. Open https://nodejs.org/en/download in your browser.
2. Click the **Windows Installer (.msi) 64-bit** link under the **LTS**
   tab (it should say "20.x.x LTS" or higher).
3. Run the downloaded `node-vXX.X.X-x64.msi`.
4. Click **Next** through every screen. Leave all defaults ticked
   (especially "Automatically install the necessary tools").
5. When it finishes, open a **new** Command Prompt window
   (Start → type `cmd` → Enter) and type:
   ```
   node --version
   npm --version
   ```
   You should see two version numbers. If you get "not recognized",
   close that window and open a fresh Command Prompt — `PATH` only
   refreshes in new windows.

### 0.2 NSIS (the installer compiler)

1. Open https://nsis.sourceforge.io/Download
2. Click the **latest stable release** link (3.09 or newer).
3. Download `nsis-3.XX-setup.exe` and run it. Next → Next → Finish.
4. Add NSIS to PATH so `makensis` works from anywhere:
   - Press **Start** → type `environment` → click **Edit the system
     environment variables**.
   - Click **Environment Variables...**
   - Under **System variables**, select `Path`, click **Edit**.
   - Click **New**, paste `C:\Program Files (x86)\NSIS`, click **OK**
     on every dialog.
5. Open a **new** Command Prompt and type:
   ```
   makensis /VERSION
   ```
   You should see "v3.09" or similar. If "not recognized", the PATH
   entry above is wrong — re-check the exact NSIS install folder.

---

## 1. Get the source code

Either:

- **Download:** Click **Code → Download ZIP** on the GitHub page,
  then right-click the ZIP → **Extract All...** to e.g.
  `C:\Users\YourName\sovereign-glidepath\`.
- **Git clone:**
  ```
  git clone <repo-url> sovereign-glidepath
  ```

You should end up with a folder containing `package.json` at the top
level. We'll call this `<project>` from now on.

---

## 2. Drop in your icon

The installer expects one file:

```
<project>\installer\assets\app.ico
```

`.ico` is a Windows icon file (multi-resolution; 256×256 recommended).
If you don't have one, use any free converter (e.g.
https://icoconvert.com) on a square PNG ≥ 512×512.

The build still works without `app.ico`, but the installer and
shortcut will use a generic Electron icon.

---

## 3. Install Node dependencies (first time only, ~5 minutes)

1. Open Command Prompt.
2. Change directory into the project:
   ```
   cd C:\Users\YourName\sovereign-glidepath
   ```
3. Run:
   ```
   npm install
   ```
4. Wait. It will download ~400 MB into `node_modules\` and may print
   warnings about deprecated packages — that's normal, ignore them.

---

## 4. Build the installer (every time)

From the same Command Prompt, in the project folder:

```
npm run installer
```

This runs four steps back-to-back:

1. **`vite build`** — bundles the web app into `dist-desktop\`.
2. **`electron-packager`** — wraps it in Electron and writes
   `electron-release\Sovereign Glidepath-win32-x64\`.
3. **`installer:prep`** — creates the `dist-installer\` folder if it
   doesn't already exist.
4. **`makensis`** — compresses everything into the final installer:
   ```
   dist-installer\SovereignGlidepath-Setup-<version>.exe
   ```

Total time: 1–3 minutes.

---

## 5. Test the installer

1. In Explorer, navigate to `<project>\dist-installer\`.
2. Double-click the `…-Setup-<version>.exe` file.
3. Windows SmartScreen may show **"Windows protected your PC"** — the
   installer is not code-signed. Click **More info → Run anyway**.
4. Step through the wizard. The app installs to
   `C:\Program Files\Sovereign Glidepath\`.
5. Desktop and Start Menu both get a shortcut. Launch it — the window
   should open with your saved ledger intact (data lives in your user
   profile, not the install folder).
6. To uninstall: **Settings → Apps → Sovereign Glidepath →
   Uninstall**.

---

## 6. Common problems and fixes

| Symptom | Cause | Fix |
| --- | --- | --- |
| `'npm' is not recognized` | Node.js not installed, or you didn't open a fresh Command Prompt after installing | See **0.1** |
| `'makensis' is not recognized` | NSIS not on PATH | See **0.2** step 4 |
| `Can't open output file` at the end of the build | `dist-installer\` folder missing | The `installer:prep` step creates it. If you're on an older copy, manually `mkdir dist-installer` first. |
| Output filename looks like `…-Setup-1.0.0.37.exe` | Someone typed a 4-part version in `package.json` | Edit `package.json` `"version"` back to 3 parts. NSI handles the 4-part padding itself. |
| `npm install` hangs forever | Slow network or proxy | Retry; corporate proxies: `npm config set proxy http://...` |
| `vite build` "out of memory" | Low RAM | `set NODE_OPTIONS=--max-old-space-size=4096` then re-run |
| Installer opens but app window is blank/white | Stale `dist-desktop\` from a partial run | Delete `dist-desktop\`, `electron-release\` and `dist-installer\`, then re-run `npm run installer` |
| SmartScreen blocks the installer | Installer is unsigned | Click **More info → Run anyway**, or sign it (see README) |

---

## 7. Releasing a new version

Two-line change:

1. Open `package.json` and change `"version"` (3 parts, e.g. `1.0.38`).
2. Optionally bump `APP_BUILD` in
   `src/components/sovereign/SovereignGlidepath.tsx`.

Then run `npm run installer` again. The output filename follows the
new version automatically. There is **no other file to edit** — the
installer script and the `.nsi` both read the version from
`package.json`.

---

That's it. Section 0 is one-time. Everything else is just
**`npm run installer`** from then on.
