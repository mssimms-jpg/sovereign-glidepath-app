import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  calculate,
  cleanNum,
  formatGBP,
  generateDirectives,
  lockingBucketFor,
  phaseFor,
  setCurrencySymbol,
  xorDecode,
  computeInflationTracking,
  computeUnderspendSignal,
  nominalFromReal,
  type LedgerEntry,
  type InflationTrackingResult,
  type UnderspendSignalResult,
} from "@/lib/sovereign/engine";
import {
  SEED_CPI_REFERENCE,
  lookupCpiIndex,
  upsertCpiRow,
  upsertManyRows,
  deleteCpiRow,
  parseBulkPaste,
  type CpiReferenceTable,
} from "@/lib/sovereign/cpiReference";
import {
  loadLicense,
  saveLicense,
  clearLicense,
  verifyLicense,
  getTrialState,
  POST_TRIAL_ENTRY_LIMIT,
  TRIAL_DAYS,
  type LicenseState,
  type TrialState,
} from "@/lib/sovereign/license";
import { IS_STORE_BUILD } from "@/lib/sovereign/build-flags";
import {
  MIN_PASSPHRASE_LENGTH,
  changePassphrase,
  decryptBackup,
  detectBackupKind,
  encryptBackup,
  flushWrites,
  secureRead,
  secureWrite,
} from "@/lib/sovereign/secureStore";
import sgLogoUrl from "@/assets/sg-logo.svg?url";
import "./desk.css";
import { AffordCalculator } from "./AffordCalculator";
import { LedgerTable } from "./LedgerTable";
import { DirectivesAndChart } from "./DirectivesAndChart";
import { DisclaimerModal, LicenseModal, EntryLimitLockoutModal, BackupRestoreModal } from "./SovereignModals";
import { CommitConfirmModal } from "./CommitConfirmModal";
import { Pane2Diagnostics } from "./Pane2Diagnostics";
import { Pane1Parameters } from "./Pane1Parameters";
import { type CurrencySymbol } from "./FormInputs";
import { exportSovereignLedgerCSV, exportSovereignLedgerXLSX } from "@/lib/sovereign/csvExport";
import { computeDefensiveRecommendation, type DefensiveRecResult } from "@/lib/sovereign/defensiveRec";
import type { ThresholdMode } from "@/lib/sovereign/drawdown";

const LEDGER_KEY = "shd_ledger_v4";
// Build 135 — CPI Index Reference Table. Same literal-key pattern as
// LEDGER_KEY/SETTINGS_KEY above; also registered in secureStore.ts's
// VAULT_KEYS so Back-Up/Restore picks it up.
const CPI_REFERENCE_KEY = "shd_cpi_reference_v1";
const DISCLAIMER_KEY = "shd_v7_disclaimer";
const SETTINGS_KEY = "shd_settings_v1";
// Build 113 — version/build stamp is injected by Vite from package.json's
// version (see vite.config.ts), so it auto-increments with every release and
// can no longer drift. The literals are only a dev-time fallback.
declare const __APP_VERSION__: string;
declare const __APP_BUILD__: string;
const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "1.0";
const APP_BUILD = typeof __APP_BUILD__ !== "undefined" ? __APP_BUILD__ : "113";

// Build 088 — the canonical directive-state registry lives in
// src/lib/sovereign/engine.ts (DIRECTIVE_STATES). LOCKING_STATES /
// NON_LOCKING_STATES / isLockingState() are derived from it and imported
// here, so Pane 2's readout, Pane 3's banner + footnote and the State Test
// Presets can never drift out of sync with the engine.

type InflowDest = "equities" | "cash";

function ExtraordinaryInflowPane({
  currency,
  onCommit,
}: {
  currency: CurrencySymbol;
  onCommit: (amt: number, dest: InflowDest, description: string) => void;
}) {
  const [amtStr, setAmtStr] = useState<string>("");
  const [dest, setDest] = useState<InflowDest>("equities");
  const [desc, setDesc] = useState<string>("");
  const amt = cleanNum(amtStr);
  return (
    <div className="shd-card">
      <h2 className="shd-h2">6. Extraordinary Inflow — Windfall / Property Sale / Inheritance</h2>
      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.85rem" }}>
        Log a one-off lump sum landing in your accounts. This immediately increases the chosen pot and re-anchors the
        Stored ATH Baseline so future Guyton-Klinger guardrails treat it as a new permanent peak. A purple ★ EVENT row
        is written straight into the Historical Timeline Ledger.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div>
          <label>Amount ({currency})</label>
          <input
            type="text"
            inputMode="decimal"
            placeholder={`${currency}0.00`}
            value={amtStr}
            onChange={(e) => setAmtStr(e.target.value)}
          />
        </div>
        <div>
          <label>Destination</label>
          <div style={{ display: "flex", gap: 4 }}>
            {(["equities", "cash"] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={dest === s ? "" : "secondary"}
                style={{
                  fontSize: "0.7rem",
                  padding: "0.25rem 0.5rem",
                  textTransform: "capitalize",
                }}
                onClick={() => setDest(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ marginTop: "0.85rem" }}>
        <label>Short Description</label>
        <input
          type="text"
          maxLength={60}
          placeholder="e.g. House sale proceeds"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </div>
      <button
        type="button"
        style={{
          width: "100%",
          padding: "1rem",
          fontWeight: 800,
          borderRadius: "0.5rem",
          marginTop: "1rem",
        }}
        disabled={amt <= 0}
        onClick={() => {
          onCommit(amt, dest, desc.trim());
          setAmtStr("");
          setDesc("");
        }}
        title="Adds this lump sum to the chosen pot and steps the ATH baseline up so future guardrails re-anchor to the new peak."
      >
        Add Inflow &amp; Re-anchor ATH
      </button>
    </div>
  );
}

// --- IndexedDB tiny KV (used to remember the user's last backup folder) ---
function openShdDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open("shd", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("kv");
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
async function idbGet<T = unknown>(key: string): Promise<T | undefined> {
  try {
    const db = await openShdDB();
    return await new Promise<T | undefined>((res, rej) => {
      const tx = db.transaction("kv").objectStore("kv").get(key);
      tx.onsuccess = () => res(tx.result as T | undefined);
      tx.onerror = () => rej(tx.error);
    });
  } catch {
    return undefined;
  }
}
async function idbSet(key: string, val: unknown): Promise<void> {
  try {
    const db = await openShdDB();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction("kv", "readwrite").objectStore("kv").put(val, key);
      tx.onsuccess = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch {
    /* ignore */
  }
}

const BACKUP_HANDLE_KEY = "shd_backup_handle_v1";

async function saveBackupViaPicker(data: string, suggestedName: string): Promise<boolean> {
  const w = window as unknown as {
    showSaveFilePicker?: (opts: unknown) => Promise<FileSystemFileHandle>;
  };
  if (typeof w.showSaveFilePicker !== "function") return false;
  const lastHandle = await idbGet<FileSystemHandle>(BACKUP_HANDLE_KEY);
  const opts: Record<string, unknown> = {
    suggestedName,
    types: [
      {
        description: "Sovereign Glidepath Backup",
        accept: { "text/plain": [".shd"] },
      },
    ],
  };
  // startIn accepts a FileSystemHandle and opens in its containing folder.
  if (lastHandle) opts.startIn = lastHandle;
  else opts.startIn = "documents";
  const handle = await w.showSaveFilePicker(opts);
  const writable = await (
    handle as unknown as {
      createWritable: () => Promise<{
        write: (d: string) => Promise<void>;
        close: () => Promise<void>;
      }>;
    }
  ).createWritable();
  await writable.write(data);
  await writable.close();
  await idbSet(BACKUP_HANDLE_KEY, handle);
  return true;
}

function downloadBackupFallback(data: string, filename: string) {
  const blob = new Blob([data], { type: "text/plain" });
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type PersistedSettings = {
  cappingAge?: number;
  growthRate?: number;
  desiredRunwayMonths?: number;
  currency?: CurrencySymbol;
  legacyTarget?: number;
  cashRealPct?: number;
  inflationPct?: number;
  // Build 092 — pension is app-wide (shared by Pane 1/2/3 and the Risk Simulator).
  pensionAmount?: number;
  pensionStartAge?: number;
  pensionIncreasePct?: number;
  // Build 131 — "potential underspend" signal (Pane 2). Thresholds kept
  // editable rather than buried constants — they came from 29 overlapping
  // historical windows, not a large independent sample, so treating the
  // exact cutoffs as precisely calibrated would overclaim what the data
  // supports. underspendReviewedAtYears stores yearsSinceStart at the point
  // of the last "Reviewed" dismissal — the tile stays hidden until that
  // figure genuinely increases (i.e. another year passes), not just on a
  // page reload.
  underspendWrThresholdPct?: number;
  underspendDipFloorPct?: number;
  underspendReviewedAtYears?: number;
};

// Build 117 — ledger and settings live in the encrypted vault (secureStore).
// Reads come from the in-memory cache hydrated by AppLockGate at unlock, so
// these stay synchronous; writes are encrypted and persisted in the background.
function loadSettings(): PersistedSettings {
  try {
    const raw = secureRead(SETTINGS_KEY);
    return raw ? (JSON.parse(raw) as PersistedSettings) : {};
  } catch {
    return {};
  }
}

function saveSettings(s: PersistedSettings) {
  secureWrite(SETTINGS_KEY, JSON.stringify(s));
}

function loadLedger(): LedgerEntry[] {
  try {
    const raw = secureRead(LEDGER_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLedger(entries: LedgerEntry[]) {
  secureWrite(LEDGER_KEY, JSON.stringify(entries));
}

// Build 135 — CPI Index Reference Table. Seeds with the real ONS data on
// first run (nothing stored yet); once the user has their own vault copy,
// that copy is authoritative and the seed is never re-applied over it.
function loadCpiReference(): CpiReferenceTable {
  try {
    const raw = secureRead(CPI_REFERENCE_KEY);
    if (!raw) return SEED_CPI_REFERENCE;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SEED_CPI_REFERENCE;
  } catch {
    return SEED_CPI_REFERENCE;
  }
}

function saveCpiReference(table: CpiReferenceTable) {
  secureWrite(CPI_REFERENCE_KEY, JSON.stringify(table));
}

function autoQuarterLabel(): string {
  const n = new Date();
  return `Q${Math.floor(n.getMonth() / 3) + 1} ${n.getFullYear()}`;
}

// Build 073 — Period End Date helpers.
// ISO YYYY-MM-DD in the user's local timezone (matches the semantics of
// <input type="date">, which is calendar-local and has no timezone).
function todayIso(): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Attempt to parse a legacy free-text Reporting Period label into a real
// period-end date. Only recognises the unambiguous "Q<n> YYYY" pattern
// (case-insensitive, whitespace-flexible). Anything else returns undefined
// — we deliberately do NOT guess for arbitrary labels; the user fixes those
// manually via the new date picker on the entry form's Edit control.
function parseLegacyLabelToPeriodEnd(label: string | undefined): string | undefined {
  if (!label) return undefined;
  const m = label.trim().match(/^Q\s*([1-4])\s+(\d{4})$/i);
  if (!m) return undefined;
  const q = parseInt(m[1], 10);
  const year = parseInt(m[2], 10);
  // Quarter-end calendar dates.
  const endByQ: Record<number, string> = { 1: "03-31", 2: "06-30", 3: "09-30", 4: "12-31" };
  return `${year}-${endByQ[q]}`;
}

// Migration: for Normal rows missing periodEndDate, try to derive from label.
// Returns the migrated array and a report of counts for user-visible summary.
function migrateLedgerPeriodDates(entries: LedgerEntry[]): {
  entries: LedgerEntry[];
  parsed: number;
  unparsed: number;
  unparsedLabels: string[];
} {
  let parsed = 0;
  let unparsed = 0;
  const unparsedLabels: string[] = [];
  const next = entries.map((e) => {
    // Event rows use eventDate already — skip.
    if (e.isSpecialEvent || e.entryKind === "special_withdrawal" || e.entryKind === "windfall") {
      return e;
    }
    if (typeof e.periodEndDate === "string" && e.periodEndDate) return e;
    const parsedDate = parseLegacyLabelToPeriodEnd(e.label);
    if (parsedDate) {
      parsed += 1;
      return { ...e, periodEndDate: parsedDate };
    }
    unparsed += 1;
    unparsedLabels.push(e.label || "(no label)");
    return e;
  });
  return { entries: next, parsed, unparsed, unparsedLabels };
}

function ruleColor(rule: string): string {
  if (rule.includes("Preservation") || rule.includes("Shield") || rule.includes("Reduction"))
    return "var(--accent-amber)";
  if (rule.includes("Emergency") || rule.includes("Deficit")) return "var(--accent-red)";
  if (rule.includes("Refill") || rule.includes("Reverse")) return "var(--accent-blue)";
  return "var(--accent-green)";
}

// (WithdrawalHistoryBar removed in Build 062 — replaced by an explicit
// "Withdrawal recorded" input on Pane 1 that stores the actual £ drawn on
// each ledger row.)

export function SovereignGlidepath() {
  // --- Disclaimer ---
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [disclaimerHide, setDisclaimerHide] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISCLAIMER_KEY) !== "true") setShowDisclaimer(true);
    } catch {
      setShowDisclaimer(true);
    }
  }, []);

  // secureWrite() queues encryption + the actual localStorage write onto an
  // async chain and returns immediately -- if the tab closes before that
  // chain finishes, the last edit can be lost. beforeunload can't guarantee
  // async work completes before the page actually unloads, but calling
  // flushWrites() here is the standard best-effort mitigation: it nudges the
  // pending chain along in whatever time the browser does grant on exit,
  // which is the most any beforeunload handler can offer for async work.
  useEffect(() => {
    const onExit = () => {
      void flushWrites();
    };
    window.addEventListener("beforeunload", onExit);
    return () => window.removeEventListener("beforeunload", onExit);
  }, []);

  // --- License & 30-day evaluation ---
  const [license, setLicense] = useState<LicenseState>({
    licensed: false,
    name: null,
  });
  const [trial, setTrial] = useState<TrialState>({
    installedAt: Date.now(),
    daysRemaining: TRIAL_DAYS,
    expired: false,
  });
  const [showLicense, setShowLicense] = useState(false);
  const [showLockout, setShowLockout] = useState(false);
  const [licenseNameInput, setLicenseNameInput] = useState("");
  const [licenseKeyInput, setLicenseKeyInput] = useState("");
  const [licenseError, setLicenseError] = useState("");
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("sgp_banner_dismissed") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (IS_STORE_BUILD) return;
    loadLicense().then(setLicense);
    setTrial(getTrialState());
  }, []);

  // --- Inputs ---
  const [cappingAge, setCappingAge] = useState(95);
  const [age, setAge] = useState(55);
  const [label, setLabel] = useState(autoQuarterLabel());
  // Build 073 — real ISO date, default = today. User can override via the
  // date picker on the Normal-row entry form. Applied only to Normal rows;
  // event rows continue to use their own eventDate.
  const [periodEndDate, setPeriodEndDate] = useState<string>(todayIso());
  // Build 074 — banner is derived live from ledger contents (see dateHealth
  // below). We no longer cache a one-shot migration summary in state.
  const [equityVal, setEquityVal] = useState("");
  const [mmVal, setMmVal] = useState("");
  const [athVal, setAthVal] = useState("");
  const [targetYearly, setTargetYearly] = useState("");
  // Build 127 — Lifestyle-change slider baseline. Captured at every Pane 1
  // load/revert moment (boot, editEntry, loadNewEntry, deleteEntry re-seed),
  // NEVER by the slider itself or by direct typing into the field — this is
  // what makes 0% on the slider always mean "the real, last-committed
  // standard of living," not wherever the field happens to sit after a
  // previous drag.
  const [committedBaselineYearly, setCommittedBaselineYearly] = useState<number>(0);
  const [growthRate, setGrowthRate] = useState(4);
  const [desiredRunwayMonths, setDesiredRunwayMonths] = useState(36);
  const [stressPct, setStressPct] = useState(0);
  // Build 120 — the Build-084 "push to Risk Simulator" one-shot signal is gone.
  // The simulator now opens as its own page seeded from a fresh live snapshot.

  const [currency, setCurrency] = useState<CurrencySymbol>("£");
  const [legacyTarget, setLegacyTarget] = useState<number>(0);
  // Cash Pot real return — lifted from the Risk Simulator so Pane 1 and the simulator
  // share the same slider (and the Fun Bucket / Amortization Matrix now
  // reflects cash drag identically to the simulator).
  const [cashRealPct, setCashRealPct] = useState<number>(1);
  // Build 092 — State / DB pension. SINGLE SOURCE OF TRUTH for the whole app:
  // the live dashboard (Panes 1/2/3) nets it off the gross target once it is in
  // payment, and the Risk Simulator's pension inputs are controlled by these
  // same three values, so the two panels can never drift apart.
  // Build 114 — the pension amount is held as a RAW STRING while editing (same
  // pattern as equityVal / mmVal / targetYearly) so keystrokes are never
  // reformatted mid-typing; the numeric value everything downstream uses is
  // derived from it with the same cleanNum() helper.
  const [pensionAmountStr, setPensionAmountStr] = useState<string>("");
  const pensionAmount = (() => {
    const n = cleanNum(pensionAmountStr);
    return Number.isFinite(n) && n > 0 ? n : 0;
  })();
  const setPensionAmount = (n: number) => setPensionAmountStr(Number.isFinite(n) && n > 0 ? String(n) : "");
  const [pensionStartAge, setPensionStartAge] = useState<number>(67);
  const [pensionIncreasePct, setPensionIncreasePct] = useState<number>(0);

  // Build 131 — "potential underspend" signal (Pane 2). See
  // computeUnderspendSignal in engine.ts for the actual logic/rationale.
  const [underspendWrThresholdPct, setUnderspendWrThresholdPct] = useState<number>(90);
  const [underspendDipFloorPct, setUnderspendDipFloorPct] = useState<number>(10);
  const [underspendReviewedAtYears, setUnderspendReviewedAtYears] = useState<number | undefined>(undefined);

  const [editIndex, setEditIndex] = useState(-1);
  // Actual amount withdrawn this quarter — free-text (pre-filled from the
  // guardrail-adjusted Request). Empty string = "use the Request as-is".
  const [withdrawnStr, setWithdrawnStr] = useState<string>("");
  const [withdrawnTouched, setWithdrawnTouched] = useState<boolean>(false);
  // Build 070 — bucket-split fields for the quarterly withdrawal.
  // Default (matches pre-070 behaviour): the full Request goes to Cash, £0
  // from Equities. Once the user edits either side we stop auto-syncing.
  const [wdEqStr, setWdEqStr] = useState<string>("");
  const [wdCashStr, setWdCashStr] = useState<string>("");
  const [wdSplitTouched, setWdSplitTouched] = useState<boolean>(false);
  const [rebalDir, setRebalDir] = useState<"none" | "eq_to_cash" | "cash_to_eq">("none");
  const [rebalAmtStr, setRebalAmtStr] = useState<string>("");

  // Build 076 — Defensive-Draw Mode for the LIVE directive (Pane 3). Drives
  // which bucket the app recommends funding this quarter's withdrawal from,
  // and auto-populates the bucket-split fields until the user overrides.
  // Default matches the Risk Simulator's default ("standard").
  const [defensiveMode, setDefensiveMode] = useState<ThresholdMode>("standard");
  // Build 081 — QA-only State Test Presets panel, hidden by default, toggled
  // via double-click on the Pane 2 header (mirrors Audit Mode's pattern).
  const [showStatePresets, setShowStatePresets] = useState<boolean>(false);
  // Build 126 — Scenario Test Runner (hidden QA aid, same double-click
  // convention as State Test Presets). Builds a complete real ledger from
  // a JSON scenario file, driven through the real engine.
  const [showScenarioRunner, setShowScenarioRunner] = useState<boolean>(false);
  // App-wide inflation assumption. The only place the app currently persists
  // an inflation figure is the Risk Simulator's shd_mc_v1 store — we mirror
  // that so both surfaces stay in lock-step. Falls back to the same 2.5%
  // default the MC panel uses when no value has been saved yet.
  const [inflationPct, setInflationPct] = useState<number>(2.5);
  // Build 125 — actual CPI observed since the PRIOR committed row, entered
  // freely each quarter. Optional: left blank, the realised-inflation index
  // falls back to the assumed slider for that gap rather than forcing a
  // lookup. Cleared on Cancel / New Entry, restored on Edit.
  const [actualCpiInput, setActualCpiInput] = useState<string>("");
  // Build 125 — expand/collapse for the realised-inflation history table in Pane 2.
  const [showInflationHistory, setShowInflationHistory] = useState<boolean>(false);
  const [showInflationFormulaHelp, setShowInflationFormulaHelp] = useState<boolean>(false);

  // --- Ledger ---
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  // Build 135 — CPI Index Reference Table (raw ONS index values). Loaded
  // from the vault at bootstrap, same as ledger/settings.
  const [cpiReference, setCpiReference] = useState<CpiReferenceTable>(SEED_CPI_REFERENCE);
  const [cpiIndexInput, setCpiIndexInput] = useState<string>("");
  const [showCpiTableManager, setShowCpiTableManager] = useState(false);
  const [cpiBulkPasteText, setCpiBulkPasteText] = useState("");
  // Build 074 — live derivation of Period End Date health from the CURRENT
  // ledger. Replaces the old one-shot migrationReport, which grew stale after
  // restores or manual edits. Recomputed on every ledger change so the banner
  // always reflects what's actually on screen right now.
  const dateHealth = useMemo(() => {
    const normal = ledger.filter(
      (e) => !e.isSpecialEvent && e.entryKind !== "special_withdrawal" && e.entryKind !== "windfall",
    );
    const missing = normal.filter((e) => !(typeof e.periodEndDate === "string" && e.periodEndDate));
    return {
      total: normal.length,
      missing: missing.length,
      missingLabels: missing.map((e) => e.label || "(no label)"),
    };
  }, [ledger]);
  const [settingsReady, setSettingsReady] = useState(false);
  const bootstrapped = useRef(false);
  // Build 085 — snapshot of the two app-wide sliders (cashRealPct, inflationPct)
  // captured when the user enters Edit mode. Discard Changes / Exit Edit
  // restore from this snapshot so those sliders revert alongside the
  // per-row growthRate slider (which comes from the ledger row itself).
  // Null outside Edit mode.
  const preEditSlidersRef = useRef<{
    cashRealPct: number;
    inflationPct: number;
    legacyTarget: number;
    currency: CurrencySymbol;
    // Build 128 — pension IS captured here (unlike growth/cash/inflation,
    // which are deliberately per-row and carry forward after a commit).
    // Pension is documented as "your real figures" — a single ongoing
    // truth the Risk Simulator and every new commit read live — not a
    // per-quarter revisable assumption. So editing an old row's pension
    // for display/correction purposes must NOT leak into your live
    // settings just because you committed something else on that row;
    // restorePreEditSliders() puts these back after every exit from Edit,
    // successful commit included. Deliberately correcting a row's own
    // historical pension record still works — that's stamped onto the row
    // at commit time regardless — this only protects the live/ongoing copy.
    pensionAmountStr: string;
    pensionStartAge: number;
    pensionIncreasePct: number;
  } | null>(null);
  // Build 086 — app-wide baseline snapshot used by "Cancel" (new-entry mode)
  // to revert fields that are NOT stored on the ledger row itself
  // (cashRealPct, inflationPct, legacyTarget, currency). Captured on boot
  // and refreshed after every successful commit so Cancel always reverts to
  // the most recently committed baseline.
  const newEntryBaselineRef = useRef<{
    growthRate: number;
    cashRealPct: number;
    inflationPct: number;
    legacyTarget: number;
    currency: CurrencySymbol;
  } | null>(null);
  // Build 095 — true while editing a legacy row that carries no stored
  // assumption snapshot (Growth / Cash Real Return / Inflation). Drives the
  // "not recorded" indicator in Pane 1.
  const [assumptionsNotRecorded, setAssumptionsNotRecorded] = useState(false);
  // Build 128 — true while editing a legacy row that carries no stored
  // pension snapshot. Same treatment as assumptionsNotRecorded, separate
  // flag because a row can have one without the other (pension snapshots
  // were added in a later build than the growth/cash/inflation ones).
  const [pensionNotRecorded, setPensionNotRecorded] = useState(false);
  // Build 128 — true for the duration of an Edit session on a row whose
  // OWN pension snapshot differs from what was live in Pane 1 when Edit
  // was entered (e.g. a Scenario Test Runner row, or a real row from
  // before your pension figures changed). Drives an inline note so it's
  // visible that the pension figures on screen are that row's history,
  // not your current ongoing pension settings — without this, it looks
  // identical to just having typed a correction.
  const [pensionDiffersFromLive, setPensionDiffersFromLive] = useState(false);
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const s = loadSettings();
    const savedLedger = loadLedger();
    setCpiReference(loadCpiReference());
    // Build 073 — one-shot migration: attempt to derive a real periodEndDate
    // for Normal rows saved before this build. Rows whose free-text label
    // does not cleanly match a recognised pattern are left blank and
    // surfaced in the UI so the user can fix them manually.
    const migration = migrateLedgerPeriodDates(savedLedger);
    if (migration.parsed > 0) {
      // Persist so we don't re-derive on every mount.
      saveLedger(migration.entries);
    }
    // Banner state derives live from `ledger` (see dateHealth memo) — no
    // one-shot report to stash here.
    const latest = migration.entries[0];

    setLedger(migration.entries);
    setCappingAge(typeof s.cappingAge === "number" ? s.cappingAge : latest?.cappingAge || 95);
    setDesiredRunwayMonths(
      typeof s.desiredRunwayMonths === "number" ? s.desiredRunwayMonths : latest?.desiredMonths || 36,
    );
    setGrowthRate(
      typeof s.growthRate === "number"
        ? s.growthRate
        : typeof latest?.growthRate === "number" && !isNaN(latest.growthRate)
          ? latest.growthRate
          : 4,
    );
    if (s.currency === "£" || s.currency === "€" || s.currency === "$") {
      setCurrency(s.currency);
      setCurrencySymbol(s.currency);
    }
    if (typeof s.legacyTarget === "number" && s.legacyTarget >= 0) {
      setLegacyTarget(s.legacyTarget);
    } else if (typeof latest?.legacyTarget === "number") {
      setLegacyTarget(latest.legacyTarget);
    }
    if (typeof s.cashRealPct === "number" && s.cashRealPct >= 0) {
      setCashRealPct(s.cashRealPct);
    } else {
      // One-time migration from the old MC-local key so returning users don't lose their slider position.
      try {
        const raw = localStorage.getItem("shd_mc_v1");
        if (raw) {
          const mc = JSON.parse(raw);
          if (typeof mc?.cashRealPct === "number") setCashRealPct(mc.cashRealPct);
        }
      } catch {
        /* ignore */
      }
    }
    // Build 082 — inflation assumption is now an independent Pane 1 setting,
    // decoupled from the Risk Simulator's own slider. Precedence:
    //   (1) persisted app setting → (2) legacy shd_mc_v1 value (one-time
    //   migration for returning users) → (3) 2.5% default (already set in
    //   useState). Once the user moves either slider they diverge freely; the
    //   two only share a common seed on first load.
    if (typeof s.inflationPct === "number" && s.inflationPct >= 0) {
      setInflationPct(s.inflationPct);
    } else {
      try {
        const raw = localStorage.getItem("shd_mc_v1");
        if (raw) {
          const mc = JSON.parse(raw);
          if (typeof mc?.inflationPct === "number") setInflationPct(mc.inflationPct);
        }
      } catch {
        /* ignore */
      }
    }

    // Build 092 — pension settings. Persisted app-wide; on first load after the
    // upgrade we migrate whatever the Risk Simulator had stored locally so no
    // existing user has to re-enter their pension.
    {
      let mc: { pensionStr?: string; pensionAgeStr?: string; pensionIncreasePct?: number } = {};
      try {
        const raw = localStorage.getItem("shd_mc_v1");
        if (raw) mc = JSON.parse(raw) || {};
      } catch {
        /* ignore */
      }
      if (typeof s.pensionAmount === "number" && s.pensionAmount >= 0) setPensionAmount(s.pensionAmount);
      else if (mc.pensionStr) setPensionAmount(cleanNum(mc.pensionStr));
      if (typeof s.pensionStartAge === "number" && s.pensionStartAge > 0) setPensionStartAge(s.pensionStartAge);
      else if (mc.pensionAgeStr) setPensionStartAge(Math.max(0, Math.floor(cleanNum(mc.pensionAgeStr))));
      if (typeof s.pensionIncreasePct === "number" && s.pensionIncreasePct >= 0)
        setPensionIncreasePct(s.pensionIncreasePct);
      else if (typeof mc.pensionIncreasePct === "number") setPensionIncreasePct(mc.pensionIncreasePct);
    }

    if (typeof s.underspendWrThresholdPct === "number" && s.underspendWrThresholdPct > 0)
      setUnderspendWrThresholdPct(s.underspendWrThresholdPct);
    if (typeof s.underspendDipFloorPct === "number" && s.underspendDipFloorPct >= 0)
      setUnderspendDipFloorPct(s.underspendDipFloorPct);
    if (typeof s.underspendReviewedAtYears === "number") setUnderspendReviewedAtYears(s.underspendReviewedAtYears);

    if (latest) {
      setAge(latest.age || 55);
      setEquityVal(latest.equities ? String(latest.equities) : "");
      setMmVal(latest.mmFund ? String(latest.mmFund) : "");
      setAthVal(latest.ath ? String(latest.ath) : "");
      if (latest.targetYearly) {
        setTargetYearly(String(latest.targetYearly));
        setCommittedBaselineYearly(latest.targetYearly);
      }
    }

    setSettingsReady(true);
  }, []);

  // Build 086 — seed the new-entry baseline snapshot from the state that
  // just hydrated on boot. Runs exactly once when settingsReady flips true,
  // so Cancel in new-entry mode has a baseline to revert to before the user
  // has committed anything this session. Subsequent commits refresh this ref
  // directly (see commitEntry).
  useEffect(() => {
    if (!settingsReady) return;
    if (newEntryBaselineRef.current) return;
    newEntryBaselineRef.current = { growthRate, cashRealPct, inflationPct, legacyTarget, currency };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsReady]);

  // Persist standalone settings whenever they change (after hydration)
  useEffect(() => {
    if (!settingsReady) return;
    saveSettings({
      cappingAge,
      growthRate,
      desiredRunwayMonths,
      currency,
      legacyTarget,
      cashRealPct,
      inflationPct,
      pensionAmount,
      pensionStartAge,
      pensionIncreasePct,
      underspendWrThresholdPct,
      underspendDipFloorPct,
      underspendReviewedAtYears,
    });
  }, [
    cappingAge,
    growthRate,
    desiredRunwayMonths,
    currency,
    legacyTarget,
    cashRealPct,
    inflationPct,
    pensionAmount,
    pensionStartAge,
    pensionIncreasePct,
    underspendWrThresholdPct,
    underspendDipFloorPct,
    underspendReviewedAtYears,
    settingsReady,
  ]);

  // Keep the engine's currency symbol in sync with the selected currency.
  // IMPORTANT: do this SYNCHRONOUSLY during render (not in useEffect) so the
  // very first render after a currency change formats correctly. Without this
  // the module-level CURRENCY_SYMBOL only updates after commit, leaving the
  // Amortization Matrix, Directives, chart axis, etc. one render behind until
  // the next state change or a page refresh.
  setCurrencySymbol(currency);

  // Keep age slider <= cappingAge
  useEffect(() => {
    if (age > cappingAge) setAge(cappingAge);
  }, [cappingAge, age]);

  // --- Calc ---
  // Build 082 — main calc no longer receives stressPct. The Scenario Stress
  // Test slider is now local to Pane 2: it drives a separate `stressCalc`
  // preview inside the stress box only, and cannot contaminate the diagnostic
  // readouts (Total Capital, Peak Drawdown, Guardrail State) or the Pane 3
  // directive that a user relies on for real decisions.
  // Build 091 — plan-inception total (oldest ledger row). Independent
  // reference for the Guyton-Klinger Prosperity (+10%) branch.
  const planBaselineTotal = useMemo(() => {
    if (ledger.length === 0) return 0;
    const first = ledger[ledger.length - 1];
    return (Number(first.equities) || 0) + (Number(first.mmFund) || 0);
  }, [ledger]);

  // Build 125 — realised-inflation tracking. Chains actual CPI entries (or
  // the assumed fallback) across the ledger's Normal-row history to produce
  // a cumulative index the directive can use to show a genuine nominal draw
  // figure. Recomputed whenever the ledger or the assumed-CPI slider moves.
  const inflationTracking: InflationTrackingResult = useMemo(
    () => computeInflationTracking(ledger, inflationPct, cpiReference),
    [ledger, inflationPct, cpiReference],
  );

  // Build 131 — "potential underspend" signal. Recomputed whenever the
  // ledger or either threshold moves; cheap even for a large ledger (a
  // handful of scans over a few hundred rows at most).
  const underspendSignal: UnderspendSignalResult = useMemo(
    () => computeUnderspendSignal(ledger, underspendWrThresholdPct, underspendDipFloorPct),
    [ledger, underspendWrThresholdPct, underspendDipFloorPct],
  );
  const underspendShouldShow: boolean =
    (underspendSignal.isPreNotice || underspendSignal.triggered) &&
    (underspendReviewedAtYears === undefined || underspendReviewedAtYears < underspendSignal.yearsSinceStart);
  // Calendar year of the oldest tracked row, for the Pane 3 "Year-1 (20XX)" caption.
  const inflationBaseYear: number | undefined = useMemo(() => {
    if (inflationTracking.rows.length === 0) return undefined;
    const y = inflationTracking.rows[0].periodEndDate.slice(0, 4);
    const n = parseInt(y, 10);
    return isNaN(n) ? undefined : n;
  }, [inflationTracking]);

  // Build 125d — the SAME nominal-conversion the directive (Pane 3) applies
  // to its headline figures, made available here so the Withdrawal Recorded
  // fields auto-seed with the actual pounds the directive told the user to
  // withdraw — not the real-terms figure underneath it. Without this, the
  // directive could say "Withdraw £5,750.66" while the recorded amount
  // silently defaulted to £5,000.00, the exact inconsistency Mark caught.
  // Threshold matches engine.ts's hasNominalDrift exactly so the two can
  // never disagree about whether there's meaningful drift to apply.
  // Build 128 — when editing an EXISTING (historical) ledger row, the
  // nominal conversion now uses THAT row's own cumulative inflation index,
  // not the whole ledger's currentIndex (which is pinned to the most recent
  // committed row regardless of which row is loaded for editing). Before
  // this fix, opening an old entry — say Q2 2021 — would nominalise its
  // real figures using inflation accrued all the way to whatever the
  // newest ledger row happens to be. For a ledger kept close to
  // real-time, that's functionally close to today's actual date, so
  // reviewing old history silently imposed large, "as of right now"
  // numbers onto data that should show what was true back then. New
  // entries (editIndex === -1) are unaffected — currentIndex genuinely is
  // the right reference point when you're about to commit today's figure.
  const nominaliseRequest = useCallback(
    (realAmount: number): number => {
      const editingRow = editIndex > -1 ? inflationTracking.rows.find((r) => r.ledgerIndex === editIndex) : undefined;
      const idx = editingRow ? editingRow.cumulativeIndex : inflationTracking.currentIndex;
      const hasDrift = !!idx && Math.abs(idx - 1) > 0.0005;
      return hasDrift ? nominalFromReal(realAmount, idx) : realAmount;
    },
    [inflationTracking, editIndex],
  );

  // Build 135 — the period-end date of the "prior" Normal row relative to
  // whatever's on screen in Pane 1 right now (the row immediately before
  // this one chronologically, excluding the row currently being edited).
  // Same filter computeInflationTracking() uses. Used purely for the "Last
  // recorded index" sanity-check display — never for calculation, which
  // always goes through computeInflationTracking()'s own chain.
  const priorPeriodEndDate: string | undefined = useMemo(() => {
    const candidates = ledger
      .map((e, i) => ({ e, i }))
      .filter(
        ({ e, i }) =>
          i !== editIndex &&
          !e.isSpecialEvent &&
          e.entryKind !== "special_withdrawal" &&
          e.entryKind !== "windfall" &&
          !e.isInflowEvent &&
          typeof e.periodEndDate === "string" &&
          e.periodEndDate.length > 0,
      )
      .map(({ e }) => e.periodEndDate as string);
    if (candidates.length === 0) return undefined;
    const curDate = periodEndDate && periodEndDate.trim() ? periodEndDate : undefined;
    if (!curDate) return [...candidates].sort().reverse()[0];
    const earlier = candidates
      .filter((d) => d < curDate)
      .sort()
      .reverse();
    return earlier[0];
  }, [ledger, editIndex, periodEndDate]);

  const priorRecordedCpiIndex: number | undefined = useMemo(
    () => lookupCpiIndex(cpiReference, priorPeriodEndDate),
    [cpiReference, priorPeriodEndDate],
  );

  // Build 135 — live computed % from the two raw indices, purely for the
  // read-only preview in Pane 2. Undefined (shown as "—") until both the
  // prior index is known AND the user has typed a current one.
  const cpiIndexLiveComputedPct: number | undefined = useMemo(() => {
    const cur = cleanNum(cpiIndexInput);
    if (cur <= 0 || typeof priorRecordedCpiIndex !== "number" || priorRecordedCpiIndex <= 0) return undefined;
    return (cur / priorRecordedCpiIndex - 1) * 100;
  }, [cpiIndexInput, priorRecordedCpiIndex]);

  const applyCpiBulkPaste = useCallback(() => {
    const { rows, errors } = parseBulkPaste(cpiBulkPasteText);
    if (rows.length > 0) {
      const nextRef = upsertManyRows(cpiReference, rows);
      setCpiReference(nextRef);
      saveCpiReference(nextRef);
      setCpiBulkPasteText("");
    }
    return errors;
  }, [cpiBulkPasteText, cpiReference]);

  const deleteCpiReferenceRow = useCallback(
    (date: string) => {
      const nextRef = deleteCpiRow(cpiReference, date);
      setCpiReference(nextRef);
      saveCpiReference(nextRef);
    },
    [cpiReference],
  );

  // Build 112 — QA State Test Presets are self-contained scenarios. While one
  // is active, the Prosperity reference must come from the preset, not from
  // the real ledger's oldest row (otherwise presets can never reproduce their
  // documented result on a plan that has history).
  const [presetBaselineTotal, setPresetBaselineTotal] = useState<number | null>(null);
  const effectiveBaselineTotal =
    presetBaselineTotal != null && presetBaselineTotal > 0 ? presetBaselineTotal : planBaselineTotal;

  const calc = useMemo(() => {
    const prevEq = ledger.length > 0 ? Number(ledger[0].equities) || 0 : null;
    return calculate(
      {
        currentAge: age,
        cappingAge,
        rawEquities: cleanNum(equityVal),
        mmFund: cleanNum(mmVal),
        ath: cleanNum(athVal),
        targetYearly: cleanNum(targetYearly),
        stressPct: 0,
        growthRatePct: growthRate,
        desiredRunwayMonths,
        legacyTarget,
        cashRealPct,
        baselineTotal: effectiveBaselineTotal,
        pensionAmount,
        pensionStartAge,
        pensionIncreasePct,
        inflationIndex: inflationTracking.currentIndex,
        inflationBaseYear,
      },
      prevEq,
    );
  }, [
    age,
    cappingAge,
    equityVal,
    mmVal,
    athVal,
    targetYearly,
    growthRate,
    desiredRunwayMonths,
    legacyTarget,
    cashRealPct,
    pensionAmount,
    pensionStartAge,
    pensionIncreasePct,
    effectiveBaselineTotal,
    ledger,
    inflationTracking,
    inflationBaseYear,
  ]);

  // Build 082 — separate stress preview, ONLY consumed inside the Pane 2
  // Build 084 — the legacy `stressCalc` memo has been replaced by the richer
  // `stressPreview` computed below (which runs the full directive pipeline).

  // Build 076 — Defensive-draw recommendation. Uses the shared isDefensive()
  // predicate (same one Yearly-tick / Audit Mode use), keyed off the realised
  // real equity return since the last Normal ledger row, annualised over
  // actual elapsed days. Only reads from the ledger + current inputs — never
  // touches the Guyton-Klinger withdrawal AMOUNT.
  // Build 077 — When editing an existing row, anchor the elapsed-days
  // calculation to the ROW's OWN stored Period End Date, not the state
  // variable (which could be stale, mid-edit, or accidentally today's
  // date if editEntry didn't populate it). For new entries the state
  // (defaulted to today) is the correct anchor.
  // Build 081 — moved above `directive` so the selected mode's bucket
  // recommendation can feed generateDirectives(). Non-locking states
  // (Normal Draw, Comfortable Amortization, No-Go Amortization) now render
  // with the mode's bucket instead of hardcoded "Global Equities" wording.
  // Build 093 — Period End Date pinned by the State Test Presets: 90 days
  // (a typical quarterly gap) after the most recent real Normal ledger row,
  // so the annualisation never sees a near-zero elapsed span. Falls back to
  // today when there is no dated Normal row to anchor to.
  const presetPinnedPeriodEndDate: string = useMemo(() => {
    const dates = ledger
      .filter(
        (e) =>
          !e.isSpecialEvent &&
          e.entryKind !== "special_withdrawal" &&
          e.entryKind !== "windfall" &&
          !e.isInflowEvent &&
          typeof e.periodEndDate === "string" &&
          e.periodEndDate.length > 0,
      )
      .map((e) => Date.parse(e.periodEndDate + "T00:00:00Z"))
      .filter((ms) => !isNaN(ms));
    if (dates.length === 0) return todayIso();
    const latest = Math.max(...dates);
    return new Date(latest + 90 * 86_400_000).toISOString().slice(0, 10);
  }, [ledger]);

  const defensiveRec: DefensiveRecResult = useMemo(() => {
    const editingRow = editIndex > -1 ? ledger[editIndex] : undefined;
    const anchorDate = editingRow
      ? typeof editingRow.periodEndDate === "string" && editingRow.periodEndDate
        ? editingRow.periodEndDate
        : periodEndDate && periodEndDate.trim()
          ? periodEndDate
          : undefined
      : periodEndDate && periodEndDate.trim()
        ? periodEndDate
        : undefined;
    return computeDefensiveRecommendation(
      cleanNum(equityVal),
      anchorDate,
      // Ignore the row currently being edited so we don't compare a row against itself.
      editIndex > -1 ? ledger.filter((_, i) => i !== editIndex) : ledger,
      inflationPct,
      growthRate,
    );
  }, [equityVal, periodEndDate, ledger, editIndex, inflationPct, growthRate]);

  // Bucket override fed into generateDirectives — undefined when no prior
  // comparison exists (defensiveRec.isDefault), otherwise the selected mode's
  // recommendation ("equities" | "cash"). Locking states inside the directive
  // ignore this; non-locking states use it.
  const directiveBucket: "equities" | "cash" | undefined = defensiveRec.isDefault
    ? undefined
    : defensiveRec[defensiveMode].bucket === "cash"
      ? "cash"
      : "equities";

  const directive = useMemo(
    () =>
      generateDirectives(
        calc,
        {
          currentAge: age,
          cappingAge,
          rawEquities: cleanNum(equityVal),
          mmFund: cleanNum(mmVal),
          ath: cleanNum(athVal),
          targetYearly: cleanNum(targetYearly),
          // Build 082 — see comment on `calc`: stress slider is Pane-2-local.
          stressPct: 0,
          growthRatePct: growthRate,
          desiredRunwayMonths,
          legacyTarget,
          cashRealPct,
          pensionAmount,
          pensionStartAge,
          pensionIncreasePct,
          inflationIndex: inflationTracking.currentIndex,
          inflationBaseYear,
        },
        directiveBucket,
      ),
    [
      calc,
      age,
      cappingAge,
      equityVal,
      mmVal,
      athVal,
      targetYearly,
      growthRate,
      desiredRunwayMonths,
      legacyTarget,
      cashRealPct,
      pensionAmount,
      pensionStartAge,
      pensionIncreasePct,
      directiveBucket,
      inflationTracking,
      inflationBaseYear,
    ],
  );

  // Build 087 — resolved bucket AFTER narrative-override precedence. Single
  // source of truth for both the Pane 3 mode-line display AND the Pane 1
  // Commit-form auto-seed, so the two can never disagree. When the active
  // narrative is locking, that narrative dictates the bucket regardless of
  // which Defensive-Draw Mode is selected; when it's non-locking, we fall
  // back to the selected mode's own recommendation.
  const narrativeLockedBucket = lockingBucketFor(directive.guardrailText);
  const effectiveBucket: "equities" | "cash" =
    narrativeLockedBucket ??
    (defensiveRec.isDefault ? "equities" : defensiveRec[defensiveMode].bucket === "cash" ? "cash" : "equities");

  // Build 084 — Hypothetical Stress preview, computed with the SAME pipeline
  // that produces the real Pane 3 directive (defensiveRec → bucketOverride →
  // generateDirectives). This guarantees the preview's narrative-state
  // classification, bucket recommendation, and "Sell £X from …" wording are
  // never a second, separately-written calculation that could quietly drift
  // from the real panel. Local to the Pane 2 preview only — no state escapes.
  const stressPreview = useMemo(() => {
    if (!(stressPct > 0)) return null;
    const rawEq = cleanNum(equityVal);
    const hypEq = rawEq * (1 - stressPct / 100);
    const hypInputs = {
      currentAge: age,
      cappingAge,
      // Feed the stressed equities in as if it were the real balance so the
      // downstream directive/defensiveRec logic classifies WHICH narrative
      // state applies under the hypothetical, not just re-scales £ against
      // today's real state label.
      rawEquities: hypEq,
      mmFund: cleanNum(mmVal),
      ath: cleanNum(athVal),
      targetYearly: cleanNum(targetYearly),
      stressPct: 0, // stress already baked into rawEquities above
      growthRatePct: growthRate,
      desiredRunwayMonths,
      legacyTarget,
      cashRealPct,
      baselineTotal: effectiveBaselineTotal,
      pensionAmount,
      pensionStartAge,
      pensionIncreasePct,
    };

    const prevEq = ledger.length > 0 ? Number(ledger[0].equities) || 0 : null;
    const hypCalc = calculate(hypInputs, prevEq);
    // Re-run the defensive recommendation with the hypothetical equity value.
    const editingRow = editIndex > -1 ? ledger[editIndex] : undefined;
    const anchorDate = editingRow
      ? typeof editingRow.periodEndDate === "string" && editingRow.periodEndDate
        ? editingRow.periodEndDate
        : periodEndDate && periodEndDate.trim()
          ? periodEndDate
          : undefined
      : periodEndDate && periodEndDate.trim()
        ? periodEndDate
        : undefined;
    const hypRec = computeDefensiveRecommendation(
      hypEq,
      anchorDate,
      editIndex > -1 ? ledger.filter((_, i) => i !== editIndex) : ledger,
      inflationPct,
      growthRate,
    );
    const hypBucket: "equities" | "cash" | undefined = hypRec.isDefault
      ? undefined
      : hypRec[defensiveMode].bucket === "cash"
        ? "cash"
        : "equities";
    const hypDirective = generateDirectives(hypCalc, hypInputs, hypBucket);
    return { hypEq, hypCalc, hypRec, hypDirective, hypBucket };
  }, [
    stressPct,
    equityVal,
    mmVal,
    athVal,
    targetYearly,
    age,
    cappingAge,
    growthRate,
    desiredRunwayMonths,
    legacyTarget,
    cashRealPct,
    pensionAmount,
    pensionStartAge,
    pensionIncreasePct,
    ledger,

    editIndex,
    periodEndDate,
    inflationPct,
    defensiveMode,
  ]);

  // Auto-seed the "Withdrawal recorded" input from the live guardrail-adjusted
  // Request. Once the user edits it, we stop overriding. Build 125d — seeds
  // with the NOMINAL request (matching what the Pane 3 directive actually
  // told the user to withdraw), not the real-terms figure.
  useEffect(() => {
    if (withdrawnTouched) return;
    const req = nominaliseRequest(calc.guardrailAdjustedQuarterly);
    setWithdrawnStr(req > 0 ? req.toFixed(2) : "");
  }, [calc.guardrailAdjustedQuarterly, withdrawnTouched, nominaliseRequest]);

  // Build 076 / Build 087 — auto-seed the bucket split from the RESOLVED
  // effective bucket (narrative override wins over the selected Defensive-
  // Draw Mode's default). This reads the same `effectiveBucket` used to
  // render the mode-line advisory, so the Commit form can never record a
  // withdrawal source that contradicts the visible directive.
  // Build 125d — uses the same nominalised request as the directive text.
  useEffect(() => {
    if (wdSplitTouched) return;
    const req = nominaliseRequest(calc.guardrailAdjustedQuarterly);
    const drawFromCash = effectiveBucket === "cash";
    if (drawFromCash) {
      setWdEqStr("0.00");
      setWdCashStr(req > 0 ? req.toFixed(2) : "0.00");
    } else {
      setWdEqStr(req > 0 ? req.toFixed(2) : "0.00");
      setWdCashStr("0.00");
    }
    // Refill suggestion — only when we're drawing from equities AND cash
    // is below the shield target. Amount = shortfall, capped by the equity
    // left after this quarter's withdrawal (never suggest going negative).
    // Build 125d — targetCashAmount is also nominalised here for the same
    // reason def/excess were converted in the directive: comparing a
    // nominalised request against a real-terms shield target would
    // understate the true shortfall once inflation drift exists.
    const currentCash = cleanNum(mmVal);
    const currentEq = cleanNum(equityVal);
    const nominalTargetCash = nominaliseRequest(calc.targetCashAmount);
    const shortfall = Math.max(0, nominalTargetCash - currentCash);
    const equityAfter = Math.max(0, currentEq - (drawFromCash ? 0 : req));
    if (!drawFromCash && shortfall > 0 && equityAfter > 0) {
      const refill = Math.min(shortfall, equityAfter);
      setRebalDir("eq_to_cash");
      setRebalAmtStr(refill.toFixed(2));
    } else {
      setRebalDir("none");
      setRebalAmtStr("");
    }
  }, [
    calc.guardrailAdjustedQuarterly,
    calc.targetCashAmount,
    effectiveBucket,
    wdSplitTouched,
    mmVal,
    equityVal,
    nominaliseRequest,
  ]);

  // --- Toast ---
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((m: string) => {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  }, []);

  // --- Backup / passphrase modal ---
  // Build 117 — onSubmit may now be async (real AES-GCM key derivation takes a
  // moment), so the submit handler awaits it and shows a busy state.
  const [modal, setModal] = useState<null | {
    mode: "export" | "import" | "passphrase";
    title: string;
    desc: string;
    onSubmit: (pw: string, confirm: string, extra: string) => string | null | Promise<string | null>;
  }>(null);
  const [modalPw, setModalPw] = useState("");
  const [modalConfirm, setModalConfirm] = useState("");
  const [modalExtra, setModalExtra] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalBusy, setModalBusy] = useState(false);

  const closeModal = () => {
    setModal(null);
    setModalPw("");
    setModalConfirm("");
    setModalExtra("");
    setModalError("");
    setModalBusy(false);
  };

  const submitModal = () => {
    if (!modal || modalBusy) return;
    setModalError("");
    setModalBusy(true);
    void Promise.resolve(modal.onSubmit(modalPw, modalConfirm, modalExtra))
      .then((err) => {
        if (err) {
          setModalError(err);
          setModalBusy(false);
        } else closeModal();
      })
      .catch((ex: unknown) => {
        setModalError((ex as Error)?.message || "Something went wrong.");
        setModalBusy(false);
      });
  };

  // --- Commit / entry-cap ---
  // Post-expiry cap: once the 30-day eval is over and not licensed, ledger
  // is capped at POST_TRIAL_ENTRY_LIMIT entries. During the trial, unlimited.
  const entryCapActive = !IS_STORE_BUILD && !license.licensed && trial.expired;
  const trialBlocked = entryCapActive && editIndex < 0 && ledger.length >= POST_TRIAL_ENTRY_LIMIT;

  // Two-stage commit: openCommitConfirm() runs guard checks and pops a review
  // modal showing exactly what will be written to the ledger; performCommit()
  // actually writes the row. This gives the user one last sanity check for
  // typos or a still-armed stress slider.
  const [showCommitConfirm, setShowCommitConfirm] = useState(false);

  const openCommitConfirm = () => {
    // Build 082 — Stress Test slider no longer feeds the main calc or the
    // committed values, so there's no need to force it back to 0 first.
    if (trialBlocked) {
      setShowLockout(true);
      return;
    }
    setShowCommitConfirm(true);
  };

  const performCommit = () => {
    const trimmedLabel = (label || "Unlabeled").trim().slice(0, 40) || "Unlabeled";
    const eqR = cleanNum(equityVal);
    const mmR = cleanNum(mmVal);
    const tot = eqR + mmR;
    let a = cleanNum(athVal);
    if (tot > a) {
      a = tot;
      setAthVal(String(a));
    }
    const wdEq = cleanNum(wdEqStr);
    const wdCash = cleanNum(wdCashStr);
    const wdTotal = wdEq + wdCash;
    const rebAmt = rebalDir === "none" ? 0 : Math.max(0, cleanNum(rebalAmtStr));
    const entry: LedgerEntry = {
      label: trimmedLabel,
      age,
      cappingAge,
      equities: eqR,
      mmFund: mmR,
      ath: a,
      targetYearly: cleanNum(targetYearly),
      desiredMonths: desiredRunwayMonths,
      growthRate,
      totalCapital: tot,
      drawdownPct: a > 0 ? ((a - tot) / a) * 100 : 0,
      rule: directive.guardrailText,
      guardrailStatus: calc.guardrailStatus,
      phase: phaseFor(age),
      legacyTarget,
      withdrawnAmount: wdTotal > 0 ? wdTotal : cleanNum(withdrawnStr),
      withdrawnFromEquities: wdEq,
      withdrawnFromCash: wdCash,
      rebalanceDirection: rebalDir,
      rebalanceAmount: rebAmt,
      entryKind: "normal",
      // Build 073 — real period-end date. Empty string means the user cleared
      // the picker; store as undefined so downstream sort/UI treat it as
      // "date not set" (matches legacy-row semantics).
      periodEndDate: periodEndDate && periodEndDate.trim() ? periodEndDate : undefined,
      // Build 095 — snapshot the three planning assumptions as they stand in
      // Pane 1 at commit time, so a future Edit of this row shows what was
      // actually assumed then rather than today's globals.
      assumedGrowthRate: growthRate,
      assumedCashRealPct: cashRealPct,
      assumedInflationPct: inflationPct,
      // Build 125 — actual CPI since the prior row, if the user supplied one
      // this quarter. Blank input stores undefined (not 0 — a genuine 0%
      // reading and "not looked up" must stay distinguishable).
      actualCpiSincePriorRow: actualCpiInput.trim() !== "" ? cleanNum(actualCpiInput) : undefined,
      // Build 126 — snapshot Pane 2's Fun Bucket Balance at commit time,
      // matching the floor-at-zero display convention used everywhere else
      // it's shown (e.g. the live "FUN BUCKET BALANCE" stat).
      funBucket: Math.max(0, calc.surplus),
      // Build 128 — snapshot the pension inputs in force at commit time too
      // (see LedgerEntry.pensionAmount doc comment). Whatever is currently
      // showing in Pane 1's pension fields at the moment Commit is pressed —
      // which, mid-Edit, may be the row's OWN reloaded snapshot (unchanged)
      // or a deliberate correction the user just typed.
      pensionAmount: cleanNum(pensionAmountStr),
      pensionStartAge,
      pensionIncreasePct,
    };
    const next = editIndex > -1 ? ledger.map((e, i) => (i === editIndex ? entry : e)) : [entry, ...ledger];
    setLedger(next);
    saveLedger(next);
    // Build 135 — if a raw CPI index was typed for this period-end date,
    // upsert it into the reference table. This is what lets a later
    // correction (re-typing the index for the same date, or using the
    // manage panel) propagate to every row without touching the row itself
    // — the table, not the row, is the source of truth for "table" rows.
    if (cpiIndexInput.trim() !== "" && entry.periodEndDate) {
      const idx = cleanNum(cpiIndexInput);
      if (idx > 0) {
        const nextRef = upsertCpiRow(cpiReference, { date: entry.periodEndDate, index: idx });
        setCpiReference(nextRef);
        saveCpiReference(nextRef);
      }
    }
    setEditIndex(-1);
    // Build 128 — pension-only restore here (not legacyTarget/currency,
    // which correctly become the new global baseline below, same as
    // growth/cash/inflation already do). The row just got its own pension
    // figures stamped onto it above (correct, preserved forever in the
    // ledger); this only protects the ONGOING live setting from picking up
    // whatever pension happened to be on screen during this edit.
    restorePensionToLive();
    preEditSlidersRef.current = null;
    // Build 086 — refresh the new-entry baseline so Cancel reverts to
    // the just-committed app-wide values (cashRealPct, inflationPct,
    // legacyTarget, currency), not stale pre-edit ones.
    newEntryBaselineRef.current = { growthRate, cashRealPct, inflationPct, legacyTarget, currency };
    setAssumptionsNotRecorded(false);
    setShowCommitConfirm(false);
    // Re-arm the auto-seed so the next quarter's Request pre-fills again.
    setWithdrawnTouched(false);
    setWdSplitTouched(false);
    setRebalDir("none");
    setRebalAmtStr("");
    // Reset Period End Date to today so the next entry defaults sensibly.
    setPeriodEndDate(todayIso());
    showToast("Entry Committed");
  };

  // Commit a Special-Event withdrawal from Pane 5. Reduces both pots by the
  // supplied split, reduces ATH by the total expense (so the plan's peak
  // baseline reflects the drawdown), and creates a flagged ledger entry.
  const commitSpecialEvent = (opts: { description: string; fromEq: number; fromCash: number }): string | null => {
    if (trialBlocked) {
      setShowLockout(true);
      return "Ledger entry limit reached.";
    }
    const desc = (opts.description || "").trim().slice(0, 60);
    if (!desc) return "Please enter a short description of the event.";
    const amt = (opts.fromEq || 0) + (opts.fromCash || 0);
    if (amt <= 0) return "Nothing to withdraw.";
    const eqCur = cleanNum(equityVal);
    const mmCur = cleanNum(mmVal);
    if (opts.fromEq > eqCur + 0.005) return "Not enough in Global Equities.";
    if (opts.fromCash > mmCur + 0.005) return "Not enough in the Cash Pot.";

    const eqAfter = Math.max(0, eqCur - opts.fromEq);
    const cashAfter = Math.max(0, mmCur - opts.fromCash);
    const athCur = cleanNum(athVal);
    const athAfter = Math.max(eqAfter + cashAfter, athCur - amt);
    const tot = eqAfter + cashAfter;
    const iso = new Date().toISOString().slice(0, 10);

    const entry: LedgerEntry = {
      label: `SPECIAL: ${desc}`,
      age,
      cappingAge,
      equities: eqAfter,
      mmFund: cashAfter,
      ath: athAfter,
      targetYearly: cleanNum(targetYearly),
      desiredMonths: desiredRunwayMonths,
      growthRate,
      totalCapital: tot,
      drawdownPct: athAfter > 0 ? ((athAfter - tot) / athAfter) * 100 : 0,
      rule: "Special Event Withdrawal",
      phase: phaseFor(age),
      legacyTarget,
      isSpecialEvent: true,
      eventNote: desc,
      eventDate: iso,
      eventFromEq: opts.fromEq,
      eventFromCash: opts.fromCash,
      eventAmount: amt,
      entryKind: "special_withdrawal",
    };

    const next = [entry, ...ledger];
    setLedger(next);
    saveLedger(next);
    // Reflect the deduction in the live input fields so Pane 1 stays honest.
    setEquityVal(eqAfter ? String(eqAfter.toFixed(2)) : "");
    setMmVal(cashAfter ? String(cashAfter.toFixed(2)) : "");
    setAthVal(athAfter ? String(athAfter.toFixed(2)) : "");
    showToast(`Special event recorded: ${desc}`);
    return null;
  };

  // Build 065 — Extraordinary Inflow: adds funds to a pot and writes a purple
  // ★ EVENT row to the ledger, re-anchoring the ATH baseline in one step.
  const commitInflowEvent = (amt: number, dest: InflowDest, description: string): string | null => {
    if (trialBlocked) {
      setShowLockout(true);
      return "Ledger entry limit reached.";
    }
    if (amt <= 0) return "Nothing to add.";
    const eqCur = cleanNum(equityVal);
    const mmCur = cleanNum(mmVal);
    const eqNew = eqCur + (dest === "equities" ? amt : 0);
    const cashNew = mmCur + (dest === "cash" ? amt : 0);
    const tot = eqNew + cashNew;
    const athCur = cleanNum(athVal);
    const athNew = Math.max(athCur, tot);
    const desc = (description || "Windfall Inflow").trim().slice(0, 60);
    const iso = new Date().toISOString().slice(0, 10);
    const entry: LedgerEntry = {
      label: `EVENT: Windfall Inflow — ${desc}`,
      age,
      cappingAge,
      equities: eqNew,
      mmFund: cashNew,
      ath: athNew,
      targetYearly: cleanNum(targetYearly),
      desiredMonths: desiredRunwayMonths,
      growthRate,
      totalCapital: tot,
      drawdownPct: athNew > 0 ? ((athNew - tot) / athNew) * 100 : 0,
      rule: "Extraordinary Inflow",
      phase: phaseFor(age),
      legacyTarget,
      isSpecialEvent: true,
      isInflowEvent: true,
      eventNote: desc,
      eventDate: iso,
      eventFromEq: dest === "equities" ? amt : 0,
      eventFromCash: dest === "cash" ? amt : 0,
      eventAmount: amt,
      entryKind: "windfall",
    };
    const next = [entry, ...ledger];
    setLedger(next);
    saveLedger(next);
    setEquityVal(eqNew ? String(eqNew.toFixed(2)) : "");
    setMmVal(cashNew ? String(cashNew.toFixed(2)) : "");
    setAthVal(athNew ? String(athNew.toFixed(2)) : "");
    showToast(`Extraordinary inflow of ${formatGBP(amt)} added — ATH re-anchored to ${formatGBP(athNew)}.`);
    return null;
  };

  const editEntry = (i: number) => {
    const d = ledger[i];
    if (!d) return;
    // Build 085 — snapshot pre-edit app-slider values ONCE per Edit session
    // (i.e. only when transitioning from new-entry mode into Edit). Discard
    // Changes / Exit Edit restore from this snapshot. Guarding with
    // `editIndex === -1` prevents Discard-during-Edit (which re-calls
    // editEntry) from overwriting the original snapshot with mid-edit values.
    if (editIndex === -1) {
      preEditSlidersRef.current = {
        cashRealPct,
        inflationPct,
        legacyTarget,
        currency,
        pensionAmountStr,
        pensionStartAge,
        pensionIncreasePct,
      };
    }
    setLabel(d.label || "");
    // Build 073 — populate the date picker with the stored real date. Empty
    // string means "date not set"; leave the picker blank so the warning
    // stays visible until the user picks one.
    setPeriodEndDate(typeof d.periodEndDate === "string" ? d.periodEndDate : "");
    setCappingAge(d.cappingAge || 95);
    setAge(d.age || 55);
    setEquityVal(String(d.equities ?? ""));
    setMmVal(String(d.mmFund ?? ""));
    setAthVal(String(d.ath ?? ""));
    setTargetYearly(String(d.targetYearly ?? ""));
    setCommittedBaselineYearly(d.targetYearly ?? 0);
    setDesiredRunwayMonths(d.desiredMonths || 36);
    // Build 095 — load the row's OWN stored planning assumptions. Legacy rows
    // (no snapshot) show 0 / "not recorded" rather than inheriting today's
    // globals, so it's obvious the row needs a manual re-save to correct.
    const hasAssumptions =
      typeof d.assumedGrowthRate === "number" ||
      typeof d.assumedCashRealPct === "number" ||
      typeof d.assumedInflationPct === "number";
    setGrowthRate(hasAssumptions ? (d.assumedGrowthRate ?? 0) : 0);
    setCashRealPct(hasAssumptions ? (d.assumedCashRealPct ?? 0) : 0);
    setInflationPct(hasAssumptions ? (d.assumedInflationPct ?? 0) : 0);
    setAssumptionsNotRecorded(!hasAssumptions);
    // Build 128 — load the row's OWN stored pension snapshot, same treatment
    // as growth/cash/inflation above: legacy rows (no snapshot) show 0 /
    // "not recorded" rather than silently inheriting today's live pension.
    // Live values captured FIRST, before any setter below runs, so the
    // "differs from live" comparison is explicit rather than relying on
    // React's setState-is-deferred semantics to read the pre-update value.
    const livePensionAmount = cleanNum(pensionAmountStr);
    const livePensionStartAge = pensionStartAge;
    const livePensionIncreasePct = pensionIncreasePct;
    const hasPension =
      typeof d.pensionAmount === "number" ||
      typeof d.pensionStartAge === "number" ||
      typeof d.pensionIncreasePct === "number";
    const rowPensionAmount = hasPension ? (d.pensionAmount ?? 0) : 0;
    const rowPensionStartAge = hasPension ? (d.pensionStartAge ?? 67) : 67;
    const rowPensionIncreasePct = hasPension ? (d.pensionIncreasePct ?? 0) : 0;
    setPensionAmount(rowPensionAmount);
    setPensionStartAge(rowPensionStartAge);
    setPensionIncreasePct(rowPensionIncreasePct);
    setPensionNotRecorded(!hasPension);
    setPensionDiffersFromLive(
      hasPension &&
        (Math.abs(rowPensionAmount - livePensionAmount) > 0.005 ||
          rowPensionStartAge !== livePensionStartAge ||
          Math.abs(rowPensionIncreasePct - livePensionIncreasePct) > 0.005),
    );
    if (typeof d.legacyTarget === "number" && d.legacyTarget >= 0) setLegacyTarget(d.legacyTarget);
    if (typeof d.withdrawnAmount === "number") {
      setWithdrawnStr(d.withdrawnAmount ? d.withdrawnAmount.toFixed(2) : "");
      setWithdrawnTouched(true);
    } else {
      setWithdrawnTouched(false);
    }
    // Build 070 — load bucket-split fields when present (any Build 070+ row).
    // Legacy rows have all three undefined; we leave the auto-seed to populate.
    if (typeof d.withdrawnFromEquities === "number" || typeof d.withdrawnFromCash === "number") {
      setWdEqStr((d.withdrawnFromEquities ?? 0).toFixed(2));
      setWdCashStr((d.withdrawnFromCash ?? 0).toFixed(2));
      setWdSplitTouched(true);
    } else {
      setWdSplitTouched(false);
    }
    setRebalDir(d.rebalanceDirection ?? "none");
    setRebalAmtStr(typeof d.rebalanceAmount === "number" && d.rebalanceAmount > 0 ? d.rebalanceAmount.toFixed(2) : "");
    // Build 125 — restore the row's own actual-CPI entry, if it recorded one.
    setActualCpiInput(typeof d.actualCpiSincePriorRow === "number" ? String(d.actualCpiSincePriorRow) : "");
    // Build 135 — restore the raw CPI index recorded for THIS row's own
    // period-end date, if the reference table has one, so re-opening the
    // row for edit shows (and allows correcting) that specific point.
    const rowIdx = typeof d.periodEndDate === "string" ? lookupCpiIndex(cpiReference, d.periodEndDate) : undefined;
    setCpiIndexInput(typeof rowIdx === "number" ? String(rowIdx) : "");
    setEditIndex(i);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Build 082 — contextual revert for Pane 1. Two behaviours driven by
  // editIndex (matches the primary button's label switch):
  //   - editIndex > -1 → mid-Edit → "Discard Changes" reloads THAT row.
  //   - editIndex === -1 → new-entry → "Cancel" reloads the latest committed
  //     Normal row (same source Pane 1 loads from on app boot). If the ledger
  //     has no Normal rows yet, we clear the withdrawal/split/rebalance fields
  //     but leave the capital figures alone (there's nothing to revert to).
  // Distinct from "Reset split" (which only clears the two withdrawal-split
  // inputs). This clears the entire Pane 1 draft.
  // Loads Pane 1 into the fresh "new entry" state — the values that show on
  // app boot, sourced from the most recently committed Normal ledger row.
  // Shared by "Cancel" (new-entry mode), "Exit Edit / New Entry", and the
  // State Test Presets auto-revert-on-hide behaviour.
  const loadNewEntry = () => {
    // Build 112 — leaving a QA preset drops its self-contained Prosperity baseline.
    setPresetBaselineTotal(null);
    const latest = ledger.find(
      (e) => !e.isSpecialEvent && e.entryKind !== "special_withdrawal" && e.entryKind !== "windfall",
    );
    setLabel(autoQuarterLabel());
    setPeriodEndDate(todayIso());
    // Build 085 — reset touched flags so the auto-seed effects re-populate
    // withdrawnStr / wdEqStr / wdCashStr / rebalDir / rebalAmtStr from the
    // current calc. DO NOT clear the string values here: when Cancel is
    // clicked a second time with no intervening changes, wdSplitTouched
    // is already false — setting it to false again is a no-op for React,
    // no dep changes, the auto-seed effect does not re-run, and the
    // manually-cleared "" values get stuck on screen as £0.00. Leaving the
    // strings alone keeps the (already-correct) seeded values in place.
    setWithdrawnTouched(false);
    setWdSplitTouched(false);
    // Build 125 — actual CPI is a fresh-each-quarter entry, not a persisted
    // assumption; always blank on New Entry so last quarter's figure can't
    // accidentally get re-applied to this quarter.
    setActualCpiInput("");
    // Build 135 — same treatment for the raw CPI index field: fresh each
    // quarter, never carried over from whatever was last typed/loaded.
    setCpiIndexInput("");
    // Build 086 — Cancel (new-entry mode) must also revert the app-wide
    // fields that are NOT stored on the ledger row (cashRealPct,
    // inflationPct, legacyTarget, currency). Restore from the baseline
    // snapshot captured on boot and refreshed after every successful
    // commit. legacyTarget on the row is preferred if present (matches
    // the pre-Build-086 behaviour for legacyTarget), otherwise fall
    // through to the baseline.
    setAssumptionsNotRecorded(false);
    const base = newEntryBaselineRef.current;
    if (base) {
      setGrowthRate(base.growthRate);
      setCashRealPct(base.cashRealPct);
      setInflationPct(base.inflationPct);
      setLegacyTarget(base.legacyTarget);
      setCurrency(base.currency);
      setCurrencySymbol(base.currency);
    }
    if (!latest) return;
    setEquityVal(latest.equities ? String(latest.equities) : "");
    setMmVal(latest.mmFund ? String(latest.mmFund) : "");
    setAthVal(latest.ath ? String(latest.ath) : "");
    setTargetYearly(latest.targetYearly ? String(latest.targetYearly) : "");
    setCommittedBaselineYearly(latest.targetYearly || 0);
    setAge(latest.age || 55);
    setCappingAge(latest.cappingAge || 95);
    setDesiredRunwayMonths(latest.desiredMonths || 36);
    // Build 096 — Growth is now a per-row assumption (Build 095). New-entry
    // state must therefore show the CURRENT global growth rate (restored from
    // newEntryBaselineRef above), not the latest committed row's stored value.
    if (typeof latest.legacyTarget === "number") setLegacyTarget(latest.legacyTarget);
  };

  // Build 128 — pension-only slice of the restore below. Used on successful
  // Commit, where legacyTarget/currency must KEEP their existing behaviour
  // (become the new global baseline — see the newEntryBaselineRef refresh
  // right after this is called) while pension must NOT: pension restores to
  // its pre-edit live value on every exit from Edit, commit included.
  const restorePensionToLive = () => {
    const snap = preEditSlidersRef.current;
    if (!snap) return;
    setPensionAmountStr(snap.pensionAmountStr);
    setPensionStartAge(snap.pensionStartAge);
    setPensionIncreasePct(snap.pensionIncreasePct);
    setPensionNotRecorded(false);
    setPensionDiffersFromLive(false);
  };

  // Build 128 — legacyTarget/currency-only slice of the restore below. Used
  // by Discard Changes (revertPane1, mid-edit): that path calls editEntry()
  // FIRST, which already correctly reloads the row's OWN pension (and
  // growth/cash/inflation) from its stored snapshot — calling the pension
  // part of restorePreEditSliders() right after would immediately overwrite
  // that correct reload with the pre-edit-SESSION live value, which is
  // exactly backwards for Discard Changes (caught live: discarding a change
  // was jumping pension to today's live figures instead of keeping the
  // row's own recorded ones). legacyTarget/currency have no such per-row
  // reload to clobber, so they still restore here as before.
  const restoreLegacyAndCurrencyToLive = () => {
    const snap = preEditSlidersRef.current;
    if (!snap) return;
    setLegacyTarget(snap.legacyTarget);
    setCurrency(snap.currency);
    setCurrencySymbol(snap.currency);
  };

  // Build 095 — Growth / Cash Real Return / Inflation are stored PER ROW,
  // so Discard Changes and Exit Edit must NOT restore them from a pre-edit
  // global snapshot: editEntry() reloads them from the row itself (or 0 /
  // "not recorded" for legacy rows), and loadNewEntry() restores the global
  // baseline when leaving Edit. Pension is different (Build 128): it is
  // also now stored per row, but unlike growth/cash/inflation it is
  // documented as "your real figures" — a single ongoing truth the Risk
  // Simulator and every new commit read live, not a per-quarter revisable
  // assumption. So pension DOES get restored to the live value — but ONLY
  // when actually leaving Edit entirely (this function, used by
  // exitEditToNewEntry) or on a successful Commit (restorePensionToLive()
  // above, called directly by the commit handler) — never on a mid-edit
  // Discard Changes, where editEntry() has already put the row's own
  // pension back and this must not fight it. (A deliberate correction to a
  // row's own historical pension figure still works — it's stamped onto
  // that row at commit time regardless of this restore.)
  const restorePreEditSliders = () => {
    restoreLegacyAndCurrencyToLive();
    restorePensionToLive();
  };

  const revertPane1 = () => {
    if (editIndex > -1) {
      editEntry(editIndex);
      restoreLegacyAndCurrencyToLive();
      return;
    }
    loadNewEntry();
  };

  // Build 083 — fully exits Edit mode and loads Pane 1 with the fresh
  // new-entry state (as if the app had just been booted). Distinct from
  // "Discard Changes" which reloads the row being edited but stays in Edit.
  const exitEditToNewEntry = () => {
    restorePreEditSliders();
    preEditSlidersRef.current = null;
    setEditIndex(-1);
    loadNewEntry();
  };

  const deleteEntry = (i: number) => {
    if (!confirm("Delete this entry?")) return;
    const next = ledger.filter((_, idx) => idx !== i);
    setLedger(next);
    saveLedger(next);

    // Build 106 — keep Edit mode pointed at the right row after the splice.
    if (editIndex === i) {
      setEditIndex(-1);
    } else if (editIndex > i) {
      setEditIndex(editIndex - 1);
    }

    // Build 106 — Pane 1 always mirrors the MOST RECENT ledger row (index 0),
    // exactly as the boot bootstrap does. Deleting that row previously left
    // Pane 1 showing the now-deleted figures until a manual page refresh.
    // Re-seed here from the surviving newest row (any kind — Normal, Special
    // Event or Windfall — matching boot behaviour). Deleting any OLDER row
    // cannot change Pane 1's displayed state, so we deliberately do nothing.
    if (i !== 0) return;
    const latest = next[0];
    if (!latest) return;
    setAge(latest.age || 55);
    setEquityVal(latest.equities ? String(latest.equities) : "");
    setMmVal(latest.mmFund ? String(latest.mmFund) : "");
    setAthVal(latest.ath ? String(latest.ath) : "");
    if (latest.targetYearly) {
      setTargetYearly(String(latest.targetYearly));
      setCommittedBaselineYearly(latest.targetYearly);
    }
  };

  const clearLedger = () => {
    if (!confirm("Wipe all ledger records? This cannot be undone.")) return;
    setLedger([]);
    saveLedger([]);
  };

  // --- Ledger CSV export (Build 072) ---
  // Reuses the shared exportLedgerCSV helper from src/lib/sovereign/csvExport.ts
  // — the same one the Audit Mode CSV export uses. Do not add a second exporter.
  const exportLedgerCsv = () => {
    exportSovereignLedgerCSV(ledger, {
      cappingAge,
      growthRate,
      desiredRunwayMonths,
      targetYearly: cleanNum(targetYearly),
      currency,
      inflationPct,
      referenceTable: cpiReference,
    });
  };

  // --- Ledger XLSX export (Build 130) ---
  // Styled two-sheet workbook alongside the plain CSV export — see the XLSX
  // section at the bottom of src/lib/sovereign/csvExport.ts for why its
  // column set deliberately does not clone the one-off sample workbook Mark
  // supplied. Passes the fuller set of live Pane 1 assumptions the CSV
  // export doesn't need, since the XLSX's Summary sheet documents more of
  // them.
  const [xlsxExporting, setXlsxExporting] = useState(false);
  const exportLedgerXlsx = async () => {
    setXlsxExporting(true);
    try {
      await exportSovereignLedgerXLSX(ledger, {
        cappingAge,
        growthRate,
        desiredRunwayMonths,
        targetYearly: cleanNum(targetYearly),
        currency,
        legacyTarget,
        cashRealPct,
        inflationPct,
        pensionAmount,
        pensionStartAge,
        pensionIncreasePct,
        defensiveMode,
        referenceTable: cpiReference,
      });
    } catch (ex) {
      alert(`XLSX export failed: ${ex instanceof Error ? ex.message : String(ex)}`);
    } finally {
      setXlsxExporting(false);
    }
  };

  // --- Backup / restore ---
  // Build 117 — backups are now really encrypted (AES-256-GCM with a key
  // derived from the password), not obfuscated. Old XOR files still restore.
  const exportData = () => {
    if (ledger.length === 0) {
      alert("Ledger is empty — nothing to export.");
      return;
    }
    setModal({
      mode: "export",
      title: "Export Backup",
      desc: "Set a password. The backup file is encrypted with AES-256-GCM — without this password the file cannot be read.",
      onSubmit: async (pw, confirm) => {
        if (!pw) return "Password cannot be empty.";
        if (pw !== confirm) return "Passwords do not match.";
        const filename = `Backup_${new Date().toISOString().split("T")[0]}.shd`;
        const data = await encryptBackup(JSON.stringify(ledger, null, 2), pw);
        // Try the modern picker first (remembers last folder), fall back to a
        // plain download.
        try {
          const saved = await saveBackupViaPicker(data, filename);
          if (!saved) downloadBackupFallback(data, filename);
          showToast("Backup exported (encrypted)");
        } catch (ex) {
          const e = ex as { name?: string; message?: string };
          if (e?.name === "AbortError") return null; // user cancelled
          return "Export failed: " + (e?.message || String(ex));
        }
        return null;
      },
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const triggerRestore = () => fileInputRef.current?.click();
  const importData = (file: File) => {
    const r = new FileReader();
    r.onload = (e) => {
      const c = String(e.target?.result || "");
      const kind = detectBackupKind(c);
      const apply = (jsonStr: string): string | null => {
        try {
          const parsed = JSON.parse(jsonStr);
          if (!Array.isArray(parsed)) return "File does not contain a ledger array.";
          // Build 074 — auto-heal restored data: run the per-row Period End Date
          // migration against the incoming array before persisting, so backups
          // taken before Build 073 (or from any source where dates were never
          // populated) get their dates derived from the free-text label
          // wherever possible. Idempotent — rows with a real date are untouched.
          const healed = migrateLedgerPeriodDates(parsed as LedgerEntry[]).entries;
          setLedger(healed);
          saveLedger(healed);
          showToast("Ledger restored");
          return null;
        } catch {
          return "File is not valid JSON.";
        }
      };
      if (kind === "plain") {
        const err = apply(c);
        if (err) alert(err);
        return;
      }
      setModal({
        mode: "import",
        title: "Decrypt Backup",
        desc:
          kind === "aes"
            ? "Enter the password used when exporting:"
            : "This is an older backup file. Enter the password used when exporting:",
        onSubmit: async (pw) => {
          try {
            // Legacy XOR files remain readable (read-only support); new files
            // go through authenticated AES-GCM decryption.
            const decoded = kind === "aes" ? await decryptBackup(c, pw) : xorDecode(c, pw);
            return apply(decoded);
          } catch {
            return "Could not decrypt or parse file. Check the password.";
          }
        },
      });
    };
    r.onerror = () => alert("Could not read file.");
    r.readAsText(file);
  };

  // --- App-lock: change passphrase ---
  const openChangePassphrase = () => {
    setModal({
      mode: "passphrase",
      title: "Change App-Lock Passphrase",
      desc: "Your ledger, settings and licence details are re-encrypted with the new passphrase. It still cannot be recovered if forgotten.",
      onSubmit: async (current, next, confirmNext) => {
        if (!current) return "Enter your current passphrase.";
        if (next.length < MIN_PASSPHRASE_LENGTH)
          return `New passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters.`;
        if (next !== confirmNext) return "The new passphrases do not match.";
        let ok = false;
        try {
          ok = await changePassphrase(current, next);
        } catch (ex) {
          return (ex as Error)?.message || "Could not change passphrase.";
        }
        if (!ok) return "Current passphrase is incorrect.";
        showToast("Passphrase changed");
        return null;
      },
    });
  };

  // --- License submit ---
  const submitLicense = async () => {
    setLicenseError("");
    const name = licenseNameInput.trim();
    const key = licenseKeyInput.trim();
    if (!name) {
      setLicenseError("Enter the registered name or email exactly as supplied.");
      return;
    }
    if (!key) {
      setLicenseError("Paste your license key.");
      return;
    }
    const v = await verifyLicense(name, key);
    if (!v.ok) {
      setLicenseError(
        "License key does not match the registered name/email. Check both fields for typos (including whitespace and case) and try again.",
      );
      return;
    }
    saveLicense({ name: v.name, key: key.toLowerCase() });
    setLicense({ licensed: true, name: v.name });
    setShowLicense(false);
    setShowLockout(false);
    setLicenseKeyInput("");
    setLicenseNameInput("");
    showToast(`Licensed to ${v.name}`);
  };

  // --- Chart rendered via <TrendChart /> ---

  const phase = phaseFor(age);
  const phaseBadge = phase === "Go-Go" ? "pb-gogo" : phase === "Go-Slow" ? "pb-goslow" : "pb-nogo";

  if (!settingsReady) {
    return (
      <div className="shd-root">
        <div className="shd-loading">Loading Sovereign Glidepath…</div>
      </div>
    );
  }

  return (
    <div className="shd-root">
      <DisclaimerModal visible={showDisclaimer} onClose={() => setShowDisclaimer(false)} />

      <LicenseModal
        visible={showLicense && !IS_STORE_BUILD}
        license={license}
        setLicense={setLicense}
        clearLicense={clearLicense}
        licenseNameInput={licenseNameInput}
        setLicenseNameInput={setLicenseNameInput}
        licenseKeyInput={licenseKeyInput}
        setLicenseKeyInput={setLicenseKeyInput}
        licenseError={licenseError}
        setLicenseError={setLicenseError}
        submitLicense={submitLicense}
        onClose={() => setShowLicense(false)}
        showToast={showToast}
      />

      <CommitConfirmModal
        visible={showCommitConfirm}
        editIndex={editIndex}
        label={label}
        periodEndDate={periodEndDate}
        age={age}
        equityVal={equityVal}
        mmVal={mmVal}
        athVal={athVal}
        targetYearly={targetYearly}
        legacyTarget={legacyTarget}
        desiredRunwayMonths={desiredRunwayMonths}
        growthRate={growthRate}
        actualCpiInput={actualCpiInput}
        wdEqStr={wdEqStr}
        wdCashStr={wdCashStr}
        rebalDir={rebalDir}
        rebalAmtStr={rebalAmtStr}
        guardrailAdjustedQuarterly={calc.guardrailAdjustedQuarterly}
        nominaliseRequest={nominaliseRequest}
        directiveGuardrailText={directive.guardrailText}
        directiveGuardrailColor={directive.guardrailColor}
        onCancel={() => setShowCommitConfirm(false)}
        onCommit={performCommit}
      />

      <EntryLimitLockoutModal
        visible={showLockout && !IS_STORE_BUILD}
        onCancel={() => setShowLockout(false)}
        onEnterLicenseKey={() => {
          setShowLockout(false);
          setLicenseError("");
          setShowLicense(true);
        }}
      />

      <BackupRestoreModal
        modal={modal}
        modalPw={modalPw}
        setModalPw={setModalPw}
        modalConfirm={modalConfirm}
        setModalConfirm={setModalConfirm}
        modalExtra={modalExtra}
        setModalExtra={setModalExtra}
        modalError={modalError}
        modalBusy={modalBusy}
        submitModal={submitModal}
        closeModal={closeModal}
      />

      {/* Toast */}
      <div className={`shd-toast ${toast ? "show" : ""}`} role="status">
        💾 {toast}
      </div>

      <div className="shd-container">
        <header
          className="shd-header"
          style={{
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "1.5rem",
              flexWrap: "wrap",
            }}
          >
            <img
              src={sgLogoUrl}
              alt=""
              aria-hidden="true"
              width={84}
              height={84}
              style={{
                borderRadius: 16,
                boxShadow: "0 2px 10px rgba(15,23,42,0.4)",
                opacity: 0.95,
              }}
            />
            <h1 style={{ fontSize: "2.4rem", margin: 0, letterSpacing: "-0.01em" }}>Sovereign Glidepath</h1>
            <img
              src={sgLogoUrl}
              alt=""
              aria-hidden="true"
              width={84}
              height={84}
              style={{
                borderRadius: 16,
                boxShadow: "0 2px 10px rgba(15,23,42,0.4)",
                opacity: 0.95,
              }}
            />
          </div>
          <div
            className="shd-build-stamp-inline"
            style={{
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontSize: "0.72rem",
              textAlign: "center",
            }}
          >
            Version {APP_VERSION} · build {APP_BUILD}
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
            <button
              className="secondary"
              onClick={() => {
                const isFile = typeof window !== "undefined" && window.location.protocol === "file:";
                window.open(isFile ? "#/help" : "/help", "_blank", "noopener");
              }}
            >
              ❓ Quick Start
            </button>
            <button
              className="secondary"
              onClick={() => {
                const isFile = typeof window !== "undefined" && window.location.protocol === "file:";
                window.open(
                  isFile ? "./sovereign-glidepath-manual.html" : "/sovereign-glidepath-manual.html",
                  "_blank",
                  "noopener",
                );
              }}
            >
              📖 Full Manual
            </button>
            <button className="secondary" onClick={exportData}>
              💾 Back-Up
            </button>
            <button className="secondary" onClick={openChangePassphrase}>
              🔑 Passphrase
            </button>
            <button
              className="secondary"
              onClick={(e) => {
                if (e.shiftKey) {
                  const isFile = typeof window !== "undefined" && window.location.protocol === "file:";
                  window.open(isFile ? "#/changelog" : "/changelog", "_blank", "noopener");
                  return;
                }
                triggerRestore();
              }}
            >
              📂 Restore
            </button>
            {!IS_STORE_BUILD && (
              <button
                className="secondary"
                onClick={() => {
                  setLicenseNameInput(license.name ?? "");
                  setLicenseKeyInput("");
                  setLicenseError("");
                  setShowLicense(true);
                }}
              >
                🔑 License
              </button>
            )}

            <button
              className="secondary"
              onClick={() => {
                if (confirm("Exit Sovereign Glidepath?")) {
                  window.close();
                }
              }}
              title="Close the window"
            >
              🚪 Exit
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".shd,.json,.txt"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importData(f);
                e.currentTarget.value = "";
              }}
            />
          </div>
        </header>

        {/* Trial / licensed banner */}
        {!IS_STORE_BUILD &&
          (() => {
            if (license.licensed) {
              return (
                <div className="shd-trial-banner licensed">
                  <span>✓ Licensed to: {license.name}</span>
                </div>
              );
            }
            if (trial.expired) {
              return (
                <div className="shd-trial-banner expired">
                  <span>
                    Evaluation expired — ledger capped at {POST_TRIAL_ENTRY_LIMIT} entries (
                    {Math.min(ledger.length, POST_TRIAL_ENTRY_LIMIT)}/{POST_TRIAL_ENTRY_LIMIT} used). Enter your license
                    key to unlock unlimited entries.
                  </span>
                  <button onClick={() => setShowLicense(true)}>Enter License Key</button>
                </div>
              );
            }
            if (bannerDismissed) return null;
            return (
              <div className="shd-trial-banner dismissible">
                <span>
                  Evaluation Copy: {trial.daysRemaining} day{trial.daysRemaining === 1 ? "" : "s"} remaining in your{" "}
                  {TRIAL_DAYS}-day trial. Enter your license key to remove entry limits.
                </span>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <button onClick={() => setShowLicense(true)}>Enter License Key</button>
                  <button
                    className="shd-banner-dismiss"
                    aria-label="Dismiss"
                    onClick={() => {
                      setBannerDismissed(true);
                      try {
                        sessionStorage.setItem("sgp_banner_dismissed", "1");
                      } catch {
                        /* ignore */
                      }
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })()}

        <main>
          <div className="shd-grid">
            <Pane1Parameters
              currency={currency}
              calc={calc}
              inflationTracking={inflationTracking}
              nominaliseRequest={nominaliseRequest}
              cappingAge={cappingAge}
              setCappingAge={setCappingAge}
              age={age}
              setAge={setAge}
              label={label}
              setLabel={setLabel}
              periodEndDate={periodEndDate}
              setPeriodEndDate={setPeriodEndDate}
              equityVal={equityVal}
              setEquityVal={setEquityVal}
              growthRate={growthRate}
              setGrowthRate={setGrowthRate}
              mmVal={mmVal}
              setMmVal={setMmVal}
              cashRealPct={cashRealPct}
              setCashRealPct={setCashRealPct}
              editIndex={editIndex}
              assumptionsNotRecorded={assumptionsNotRecorded}
              pensionNotRecorded={pensionNotRecorded}
              pensionDiffersFromLive={pensionDiffersFromLive}
              inflationPct={inflationPct}
              setInflationPct={setInflationPct}
              targetYearly={targetYearly}
              setTargetYearly={setTargetYearly}
              committedBaselineYearly={committedBaselineYearly}
              pensionAmountStr={pensionAmountStr}
              setPensionAmountStr={setPensionAmountStr}
              pensionStartAge={pensionStartAge}
              setPensionStartAge={setPensionStartAge}
              pensionIncreasePct={pensionIncreasePct}
              setPensionIncreasePct={setPensionIncreasePct}
              desiredRunwayMonths={desiredRunwayMonths}
              setDesiredRunwayMonths={setDesiredRunwayMonths}
              legacyTarget={legacyTarget}
              setLegacyTarget={setLegacyTarget}
              setCurrency={setCurrency}
              wdEqStr={wdEqStr}
              setWdEqStr={setWdEqStr}
              wdCashStr={wdCashStr}
              setWdCashStr={setWdCashStr}
              setWdSplitTouched={setWdSplitTouched}
              rebalDir={rebalDir}
              setRebalDir={setRebalDir}
              rebalAmtStr={rebalAmtStr}
              setRebalAmtStr={setRebalAmtStr}
              withdrawnStr={withdrawnStr}
              trialBlocked={trialBlocked}
              openCommitConfirm={openCommitConfirm}
              revertPane1={revertPane1}
              exitEditToNewEntry={exitEditToNewEntry}
            />

            <Pane2Diagnostics
              currency={currency}
              calc={calc}
              directive={directive}
              showStatePresets={showStatePresets}
              setShowStatePresets={setShowStatePresets}
              revertPane1={revertPane1}
              presetPinnedPeriodEndDate={presetPinnedPeriodEndDate}
              age={age}
              cappingAge={cappingAge}
              equityVal={equityVal}
              mmVal={mmVal}
              athVal={athVal}
              targetYearly={targetYearly}
              stressPct={stressPct}
              desiredRunwayMonths={desiredRunwayMonths}
              legacyTarget={legacyTarget}
              growthRate={growthRate}
              periodEndDate={periodEndDate}
              setAge={setAge}
              setCappingAge={setCappingAge}
              setEquityVal={setEquityVal}
              setMmVal={setMmVal}
              setAthVal={setAthVal}
              setTargetYearly={setTargetYearly}
              setStressPct={setStressPct}
              setDesiredRunwayMonths={setDesiredRunwayMonths}
              setLegacyTarget={setLegacyTarget}
              setGrowthRate={setGrowthRate}
              setPeriodEndDate={setPeriodEndDate}
              setPresetBaselineTotal={setPresetBaselineTotal}
              setWdSplitTouched={setWdSplitTouched}
              setWithdrawnTouched={setWithdrawnTouched}
              inflationTracking={inflationTracking}
              inflationPct={inflationPct}
              actualCpiInput={actualCpiInput}
              setActualCpiInput={setActualCpiInput}
              showInflationHistory={showInflationHistory}
              setShowInflationHistory={setShowInflationHistory}
              showInflationFormulaHelp={showInflationFormulaHelp}
              setShowInflationFormulaHelp={setShowInflationFormulaHelp}
              inflationBaseYear={inflationBaseYear}
              cpiIndexInput={cpiIndexInput}
              setCpiIndexInput={setCpiIndexInput}
              priorRecordedCpiIndex={priorRecordedCpiIndex}
              priorPeriodEndDate={priorPeriodEndDate}
              cpiIndexLiveComputedPct={cpiIndexLiveComputedPct}
              cpiReference={cpiReference}
              showCpiTableManager={showCpiTableManager}
              setShowCpiTableManager={setShowCpiTableManager}
              cpiBulkPasteText={cpiBulkPasteText}
              setCpiBulkPasteText={setCpiBulkPasteText}
              applyCpiBulkPaste={applyCpiBulkPaste}
              deleteCpiReferenceRow={deleteCpiReferenceRow}
              stressPreview={stressPreview}
              directiveBucket={directiveBucket}
              defensiveMode={defensiveMode}
              pensionAmountStr={pensionAmountStr}
              pensionStartAge={pensionStartAge}
              cashRealPct={cashRealPct}
              underspendSignal={underspendSignal}
              underspendShouldShow={underspendShouldShow}
              underspendWrThresholdPct={underspendWrThresholdPct}
              underspendDipFloorPct={underspendDipFloorPct}
              setUnderspendWrThresholdPct={setUnderspendWrThresholdPct}
              setUnderspendDipFloorPct={setUnderspendDipFloorPct}
              onReviewUnderspend={() => setUnderspendReviewedAtYears(underspendSignal.yearsSinceStart)}
            />
          </div>

          <DirectivesAndChart
            ledger={ledger}
            currency={currency}
            directive={directive}
            defensiveRec={defensiveRec}
            defensiveMode={defensiveMode}
            setDefensiveMode={setDefensiveMode}
            setWdSplitTouched={setWdSplitTouched}
            guardrailFactor={calc.guardrailFactor}
          />

          {/* Build 120 — the Risk Simulator now lives on its own /risk-simulator
              route, launched from Pane 2's Companion Apps section. */}

          {/* Can I Afford This? — Instant Impact Calculator */}
          <AffordCalculator
            equityVal={equityVal}
            mmVal={mmVal}
            athVal={athVal}
            targetYearly={targetYearly}
            growthRate={growthRate}
            cashRealPct={cashRealPct}
            baselineTotal={effectiveBaselineTotal}
            pensionAmount={pensionAmount}
            pensionStartAge={pensionStartAge}
            pensionIncreasePct={pensionIncreasePct}
            age={age}
            cappingAge={cappingAge}
            stressPct={0 /* Build 082 — stress slider is Pane-2-local. */}
            desiredRunwayMonths={desiredRunwayMonths}
            legacyTarget={legacyTarget}
            currency={currency}
            onCommitSpecialEvent={commitSpecialEvent}
          />

          {/* Build 065 — Extraordinary Inflow (moved below "Can I Afford This?") */}
          <ExtraordinaryInflowPane
            currency={currency}
            onCommit={(amt, dest, description) => {
              commitInflowEvent(amt, dest, description);
            }}
          />

          <LedgerTable
            ledger={ledger}
            setLedger={setLedger}
            showToast={showToast}
            downloadAsFile={downloadBackupFallback}
            showScenarioRunner={showScenarioRunner}
            setShowScenarioRunner={setShowScenarioRunner}
            exportLedgerCsv={exportLedgerCsv}
            exportLedgerXlsx={exportLedgerXlsx}
            xlsxExporting={xlsxExporting}
            clearLedger={clearLedger}
            editEntry={editEntry}
            deleteEntry={deleteEntry}
          />
        </main>
      </div>
    </div>
  );
}
