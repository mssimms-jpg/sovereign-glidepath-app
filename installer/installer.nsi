; =====================================================================
;  Sovereign Glidepath — NSIS Installer
;  Build with: makensis -DVERSION=1.0.37 -DSOURCE_DIR=<packed-app-dir> installer.nsi
;  Tested with NSIS 3.09+ (Modern UI 2).
; =====================================================================

!ifndef VERSION
  !define VERSION "1.0.0"
!endif

!ifndef SOURCE_DIR
  !error "SOURCE_DIR must be defined: pass -DSOURCE_DIR=path/to/packaged/win32-x64 to makensis."
!endif

!define APP_NAME       "Sovereign Glidepath"
!define APP_NAME_SHORT "SovereignGlidepath"
!define APP_EXE        "Sovereign Glidepath.exe"
!define COMPANY        "Sovereign Glidepath"
!define WEBSITE        "https://sovereignglidepath.app"
!define UNINST_KEY     "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME_SHORT}"

; ---------- General ----------
Name "${APP_NAME}"
OutFile "..\dist-installer\${APP_NAME_SHORT}-Setup-${VERSION}.exe"
InstallDir "$PROGRAMFILES64\${APP_NAME}"
InstallDirRegKey HKLM "Software\${APP_NAME_SHORT}" "InstallDir"
RequestExecutionLevel admin           ; per-machine install
Unicode true
SetCompressor /SOLID lzma
BrandingText "${APP_NAME} v${VERSION}"

; Single-instance installer mutex
!define INSTALLER_MUTEX "SovereignGlidepathInstallerMutex"

; ---------- Modern UI 2 ----------
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"
!include "x64.nsh"

!define MUI_ABORTWARNING
!define MUI_ICON   "assets\app.ico"
!define MUI_UNICON "assets\app.ico"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APP_EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "Launch ${APP_NAME}"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

; Version metadata baked into the installer .exe
VIProductVersion "${VERSION}.0"
VIAddVersionKey  "ProductName"      "${APP_NAME}"
VIAddVersionKey  "CompanyName"      "${COMPANY}"
VIAddVersionKey  "LegalCopyright"   "(c) ${COMPANY}"
VIAddVersionKey  "FileDescription"  "${APP_NAME} Installer"
VIAddVersionKey  "FileVersion"      "${VERSION}"
VIAddVersionKey  "ProductVersion"   "${VERSION}"

; ---------- .onInit: single-instance + 64-bit guard ----------
Function .onInit
  System::Call 'kernel32::CreateMutexW(p 0, i 0, w "${INSTALLER_MUTEX}") p .r0 ?e'
  Pop $0
  ${If} $0 != 0
    MessageBox MB_ICONEXCLAMATION|MB_OK \
      "The ${APP_NAME} installer is already running."
    Abort
  ${EndIf}

  ${IfNot} ${RunningX64}
    MessageBox MB_ICONSTOP|MB_OK \
      "${APP_NAME} requires 64-bit Windows."
    Abort
  ${EndIf}
  SetRegView 64
FunctionEnd

Function un.onInit
  SetRegView 64
FunctionEnd

; ---------- Install ----------
Section "${APP_NAME}" SecMain
  SectionIn RO
  SetOutPath "$INSTDIR"

  ; Copy the packaged Electron app tree (produced by @electron/packager).
  File /r "${SOURCE_DIR}\*.*"

  ; Start Menu shortcut
  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  CreateShortCut  "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk"   "$INSTDIR\${APP_EXE}" "" "$INSTDIR\${APP_EXE}" 0
  CreateShortCut  "$SMPROGRAMS\${APP_NAME}\Uninstall.lnk"     "$INSTDIR\Uninstall.exe"

  ; Desktop shortcut
  CreateShortCut  "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\${APP_EXE}" "" "$INSTDIR\${APP_EXE}" 0

  ; Uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; Add/Remove Programs registration
  WriteRegStr   HKLM "${UNINST_KEY}" "DisplayName"     "${APP_NAME}"
  WriteRegStr   HKLM "${UNINST_KEY}" "DisplayVersion"  "${VERSION}"
  WriteRegStr   HKLM "${UNINST_KEY}" "DisplayIcon"     "$INSTDIR\${APP_EXE}"
  WriteRegStr   HKLM "${UNINST_KEY}" "Publisher"       "${COMPANY}"
  WriteRegStr   HKLM "${UNINST_KEY}" "URLInfoAbout"    "${WEBSITE}"
  WriteRegStr   HKLM "${UNINST_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr   HKLM "${UNINST_KEY}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr   HKLM "${UNINST_KEY}" "QuietUninstallString" '"$INSTDIR\Uninstall.exe" /S'
  WriteRegDWORD HKLM "${UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKLM "${UNINST_KEY}" "NoRepair" 1

  ; Estimated size in KB
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKLM "${UNINST_KEY}" "EstimatedSize" "$0"

  WriteRegStr HKLM "Software\${APP_NAME_SHORT}" "InstallDir" "$INSTDIR"
SectionEnd

; ---------- Uninstall ----------
Section "Uninstall"
  ; Best-effort: close any running instance.
  ExecWait 'taskkill /F /IM "${APP_EXE}" /T'

  Delete "$DESKTOP\${APP_NAME}.lnk"
  Delete "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk"
  Delete "$SMPROGRAMS\${APP_NAME}\Uninstall.lnk"
  RMDir  "$SMPROGRAMS\${APP_NAME}"

  Delete "$INSTDIR\Uninstall.exe"
  RMDir /r "$INSTDIR"

  DeleteRegKey HKLM "${UNINST_KEY}"
  DeleteRegKey HKLM "Software\${APP_NAME_SHORT}"
SectionEnd
