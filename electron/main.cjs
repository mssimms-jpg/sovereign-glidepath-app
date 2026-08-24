// Electron main process. CommonJS so __dirname works under "type": "module".
const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");

// Single-instance lock: if another copy of the app is already running,
// quit this process and ask the existing instance to focus its window.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  return;
}

let mainWindow = null;

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#0f172a",
    title: "Sovereign Glidepath",
    icon: path.join(__dirname, "..", "installer", "assets", "app.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  // Open external links (Help/Manual buttons use window.open) in the user's
  // real browser instead of a new Electron window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    // Hash-only links (e.g. "#/help", "#/changelog") -> open a small in-app window.
    return {
      action: "allow",
      overrideBrowserWindowOptions: {
        width: 980,
        height: 820,
        backgroundColor: "#0f172a",
      },
    };
  });

  mainWindow.removeMenu();
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  mainWindow.loadFile(path.join(__dirname, "..", "dist-desktop", "index.html"));
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
