# Build the Sovereign Glidepath NSIS installer on Windows.
# Requires: Node.js 20+, NSIS 3.09+ (makensis.exe on PATH).

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$pkg     = Get-Content package.json -Raw | ConvertFrom-Json
$version = $pkg.version
$appName = "Sovereign Glidepath"
$packDir = "electron-release/$appName-win32-x64"

Write-Host "==> Building Vite bundle (dist-desktop/) ..."
npx vite build

Write-Host "==> Packaging Electron app for win32/x64 ..."
$iconArgs = @()
if (Test-Path "installer/assets/app.ico") {
  $iconArgs = @("--icon=installer/assets/app.ico")
}
npx @electron/packager . "$appName" `
  --platform=win32 --arch=x64 `
  --out=electron-release --overwrite `
  --ignore='^/installer' `
  --ignore='^/src' --ignore='^/public' `
  --ignore='^/electron-release' `
  --ignore='^/dist-installer' `
  @iconArgs

New-Item -ItemType Directory -Force -Path "dist-installer" | Out-Null

if (-not (Get-Command makensis -ErrorAction SilentlyContinue)) {
  Write-Error "makensis not found. Install NSIS 3.09+ from https://nsis.sourceforge.io/Download and add it to PATH."
}

Write-Host "==> Running makensis ..."
makensis "-DVERSION=$version" "-DSOURCE_DIR=../$packDir" installer/installer.nsi

Write-Host ""
Write-Host "Installer built: dist-installer/SovereignGlidepath-Setup-$version.exe"
