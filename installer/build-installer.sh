#!/usr/bin/env bash
# Build the Sovereign Glidepath NSIS installer on Linux / macOS / WSL.
set -euo pipefail

cd "$(dirname "$0")/.."

VERSION="$(node -p "require('./package.json').version")"
APP_NAME="Sovereign Glidepath"
PACK_DIR="electron-release/${APP_NAME}-win32-x64"

echo "==> Building Vite bundle (dist-desktop/) ..."
npx vite build

echo "==> Packaging Electron app for win32/x64 ..."
ICON_ARG=()
if [ -f installer/assets/app.ico ]; then
  ICON_ARG=(--icon=installer/assets/app.ico)
fi
npx @electron/packager . "${APP_NAME}" \
  --platform=win32 --arch=x64 \
  --out=electron-release --overwrite \
  --ignore='^/installer' \
  --ignore='^/src' --ignore='^/public' \
  --ignore='^/electron-release' \
  --ignore='^/dist-installer' \
  "${ICON_ARG[@]}"

mkdir -p dist-installer

echo "==> Running makensis ..."
if ! command -v makensis >/dev/null 2>&1; then
  echo "ERROR: makensis not found. Install NSIS 3.09+ (apt: nsis, brew: makensis)." >&2
  exit 1
fi
makensis -DVERSION="${VERSION}" -DSOURCE_DIR="../${PACK_DIR}" installer/installer.nsi

echo ""
echo "Installer built: dist-installer/SovereignGlidepath-Setup-${VERSION}.exe"
