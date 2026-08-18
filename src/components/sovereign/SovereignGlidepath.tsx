import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  calculate,
  cleanNum,
  formatGBP,
  generateDirectives,
  lockingBucketFor,
  isLockingState,
  LOCKING_STATES,
  phaseFor,
  setCurrencySymbol,
  xorDecode,
  computeInflationTracking,
  nominalFromReal,
  type LedgerEntry,
  type InflationTrackingResult,
} from "@/lib/sovereign/engine";
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
import { StateTestPresets, type PresetValues } from "./StateTestPresets";
import { exportLedgerCSV, localTimestamp } from "@/lib/sovereign/csvExport";
import { computeDefensiveRecommendation, type DefensiveRecResult } from "@/lib/sovereign/defensiveRec";
import type { ThresholdMode } from "@/lib/sovereign/drawdown";

const LEDGER_KEY = "shd_ledger_v4";
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

type CurrencySymbol = "£" | "€" | "$";

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

function phaseBadgeClass(phase: string): string {
  if (phase.includes("Slow")) return "pb-goslow";
  if (phase.includes("No-Go")) return "pb-nogo";
  return "pb-gogo";
}

function ruleColor(rule: string): string {
  if (rule.includes("Preservation") || rule.includes("Shield") || rule.includes("Reduction"))
    return "var(--accent-amber)";
  if (rule.includes("Emergency") || rule.includes("Deficit")) return "var(--accent-red)";
  if (rule.includes("Refill") || rule.includes("Reverse")) return "var(--accent-blue)";
  return "var(--accent-green)";
}

// Colour by drawdown magnitude (peak-to-trough %). Treats input as positive %.
function drawdownColor(pct: number): string {
  const d = Math.abs(Number(pct) || 0);
  if (d < 5) return "var(--accent-green)";
  if (d < 10) return "var(--text-muted)";
  if (d < 20) return "var(--accent-amber)";
  return "var(--accent-red)";
}

interface MoneyInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id: string;
  /**
   * Build 113 — when true the field refuses negative values entirely. A real
   * portfolio bucket cannot hold a negative balance, and a negative pot could
   * drive Total Capital to <= 0 and produce self-contradictory guardrail
   * readouts. Closed off at the input layer.
   */
  nonNegative?: boolean;
}

function MoneyInput({
  value,
  onChange,
  placeholder,
  id,
  currency = "£",
  nonNegative = false,
}: MoneyInputProps & { currency?: CurrencySymbol }) {
  const [focused, setFocused] = useState(false);
  const display = focused ? value : value ? formatGBP(cleanNum(value)) : "";
  const emit = (v: string) => {
    onChange(nonNegative ? v.replace(/-/g, "") : v);
  };
  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      placeholder={placeholder ?? `${currency}0.00`}
      value={display}
      onFocus={(e) => {
        const n = cleanNum(e.currentTarget.value);
        const clamped = nonNegative ? Math.max(0, n) : n;
        onChange(clamped !== 0 ? clamped.toFixed(2) : "");
        setFocused(true);
      }}
      onBlur={() => {
        setFocused(false);
        if (nonNegative && cleanNum(value) < 0) onChange("");
      }}
      onChange={(e) => emit(e.target.value)}
    />
  );
}

// Integer input that allows the field to be emptied while typing.
// Falls back to `fallback` only on blur if left empty/invalid.
interface IntInputProps {
  id?: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  fallback: number;
}
function IntInput({ id, value, onChange, min, max, fallback }: IntInputProps) {
  const [text, setText] = useState<string>(String(value));
  // Re-sync local text only when the upstream numeric value actually changes
  // to something different (e.g. edit-entry). Do NOT clobber an empty string
  // the user has typed while editing.
  useEffect(() => {
    setText((t) => {
      const n = parseInt(t, 10);
      if (!isNaN(n) && n === value) return t;
      return String(value);
    });
  }, [value]);
  return (
    <input
      id={id}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={text}
      onChange={(e) => {
        const t = e.target.value;
        setText(t);
        if (t === "") return;
        const n = parseInt(t, 10);
        if (isNaN(n)) return;
        // Only commit values within bounds — prevents intermediate keystrokes
        // (e.g. typing "85" passes through "8") from clobbering dependent state.
        if (typeof min === "number" && n < min) return;
        if (typeof max === "number" && n > max) return;
        onChange(n);
      }}
      onBlur={() => {
        const n = parseInt(text, 10);
        if (text === "" || isNaN(n)) {
          setText(String(fallback));
          onChange(fallback);
          return;
        }
        let clamped = n;
        if (typeof min === "number" && clamped < min) clamped = min;
        if (typeof max === "number" && clamped > max) clamped = max;
        if (clamped !== n) {
          setText(String(clamped));
          onChange(clamped);
        }
      }}
    />
  );
}

interface TrendChartProps {
  ledger: LedgerEntry[];
  currency: CurrencySymbol;
}

function TrendChart({ ledger, currency }: TrendChartProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const t = useMemo(() => [...ledger].reverse(), [ledger]);

  if (ledger.length < 2) return null;

  const w = 1000,
    h = 360,
    pL = 90,
    pR = 30,
    pT = 20,
    pB = 110;
  const allV = t.flatMap((d) => [
    Number(d.totalCapital) || 0,
    Number(d.ath) || 0,
    Number(d.mmFund) || 0,
    Number(d.equities) || 0,
  ]);
  const rawMax = Math.max(...allV);
  const maxV = rawMax > 0 ? rawMax * 1.1 : 1;
  const getX = (i: number) => pL + (t.length === 1 ? 0 : (i / (t.length - 1)) * (w - pL - pR));
  const getY = (v: number) => h - pB - ((Number(v) || 0) / maxV) * (h - pB - pT);

  const fmt = (val: number) =>
    val >= 1_000_000 ? `${currency}${(val / 1_000_000).toFixed(2)}M` : `${currency}${(val / 1000).toFixed(1)}k`;

  const gridLines: React.ReactElement[] = [];
  for (let i = 0; i <= 5; i++) {
    const val = (maxV / 5) * i;
    const y = getY(val);
    const lab =
      val >= 1_000_000 ? `${currency}${(val / 1_000_000).toFixed(1)}M` : `${currency}${(val / 1000).toFixed(0)}k`;
    gridLines.push(
      <g key={`g${i}`}>
        <line x1={pL} y1={y} x2={w - pR} y2={y} stroke="var(--border-color)" strokeWidth={1} opacity={0.3} />
        <text x={pL - 10} y={y + 5} fill="var(--text-muted)" fontSize={12} textAnchor="end">
          {lab}
        </text>
      </g>,
    );
  }

  const axisY = h - pB;
  const xLabels = t.map((d, i) => {
    const x = getX(i);
    const labelText = String(d.label || "").slice(0, 22);
    return (
      <g key={`x${i}`}>
        <line x1={x} y1={axisY} x2={x} y2={axisY + 5} stroke="var(--text-muted)" strokeWidth={1} opacity={0.6} />
        <text
          x={x}
          y={axisY + 10}
          fill="var(--text-muted)"
          fontSize={11}
          textAnchor="end"
          transform={`rotate(-90 ${x} ${axisY + 10})`}
        >
          {labelText}
        </text>
      </g>
    );
  });

  const pts = (sel: (d: LedgerEntry) => number) => t.map((d, i) => `${getX(i)},${getY(sel(d))}`).join(" ");

  const series = [
    { key: "ath", label: "ATH Baseline", color: "var(--accent-amber)" },
    { key: "totalCapital", label: "Total Capital", color: "var(--text-main)" },
    { key: "equities", label: "Equities", color: "var(--accent-green)" },
    { key: "mmFund", label: "Money Market", color: "var(--accent-blue)" },
  ] as const;

  const updateHoverFromClientX = (clientX: number) => {
    const el = wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    const svgX = ((clientX - rect.left) / rect.width) * w;
    if (svgX < pL - 5 || svgX > w - pR + 5) {
      setHoverIdx(null);
      return;
    }
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < t.length; i++) {
      const dx = Math.abs(getX(i) - svgX);
      if (dx < best) {
        best = dx;
        nearest = i;
      }
    }
    setHoverIdx(nearest);
  };

  const hovered = hoverIdx != null ? t[hoverIdx] : null;
  const hoverX = hoverIdx != null ? getX(hoverIdx) : 0;

  // Tooltip placement in pixel coords of wrapper
  const rectEl = wrapperRef.current?.getBoundingClientRect();
  const tooltipLeftPct = rectEl ? (hoverX / w) * 100 : 0;
  // Flip tooltip to left side when near right edge
  const flip = tooltipLeftPct > 70;

  return (
    <div
      ref={wrapperRef}
      style={{ position: "relative", width: "100%", height: "100%" }}
      onMouseMove={(e) => updateHoverFromClientX(e.clientX)}
      onMouseLeave={() => setHoverIdx(null)}
      onTouchMove={(e) => {
        if (e.touches[0]) updateHoverFromClientX(e.touches[0].clientX);
      }}
      onTouchEnd={() => setHoverIdx(null)}
    >
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: "100%", overflow: "visible", display: "block" }}
        role="img"
        aria-label="Trend chart of Total Capital, Equities, ATH Baseline and Money Market over time"
      >
        {gridLines}
        <line x1={pL} y1={axisY} x2={w - pR} y2={axisY} stroke="var(--border-color)" strokeWidth={1} opacity={0.6} />
        <polyline points={pts((d) => d.mmFund)} fill="none" stroke="var(--accent-blue)" strokeWidth={2.5} />
        <polyline points={pts((d) => d.equities)} fill="none" stroke="var(--accent-green)" strokeWidth={2.5} />
        <polyline
          points={pts((d) => d.ath)}
          fill="none"
          stroke="var(--accent-amber)"
          strokeWidth={1.5}
          strokeDasharray="5,5"
          opacity={0.8}
        />
        <polyline points={pts((d) => d.totalCapital)} fill="none" stroke="var(--text-main)" strokeWidth={3.5} />
        {xLabels}
        {hovered && (
          <g pointerEvents="none">
            <line
              x1={hoverX}
              y1={pT}
              x2={hoverX}
              y2={axisY}
              stroke="#94a3b8"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.85}
            />
            {series.map((s) => {
              const val = Number(hovered[s.key as keyof LedgerEntry]) || 0;
              return (
                <circle
                  key={s.key}
                  cx={hoverX}
                  cy={getY(val)}
                  r={4.5}
                  fill="#0f172a"
                  stroke={s.color}
                  strokeWidth={2}
                />
              );
            })}
          </g>
        )}
      </svg>
      {hovered && (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: flip ? "auto" : `calc(${tooltipLeftPct}% + 12px)`,
            right: flip ? `calc(${100 - tooltipLeftPct}% + 12px)` : "auto",
            minWidth: 200,
            padding: "10px 12px",
            background: "rgba(15, 23, 42, 0.92)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            border: "1px solid rgba(148, 163, 184, 0.35)",
            borderRadius: 8,
            boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
            color: "var(--text-main)",
            fontSize: "0.78rem",
            lineHeight: 1.4,
            pointerEvents: "none",
            zIndex: 5,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: "0.82rem",
              marginBottom: 6,
              paddingBottom: 6,
              borderBottom: "1px solid rgba(148,163,184,0.25)",
              color: "var(--text-main)",
              letterSpacing: 0.3,
            }}
          >
            {String(hovered.label || "")}
          </div>
          {series.map((s) => {
            const val = Number(hovered[s.key as keyof LedgerEntry]) || 0;
            return (
              <div
                key={s.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 14,
                  padding: "2px 0",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: s.color,
                    }}
                  />
                  <span style={{ color: "var(--text-muted)" }}>{s.label}</span>
                </span>
                <span style={{ fontVariantNumeric: "tabular-nums", color: s.color, fontWeight: 600 }}>{fmt(val)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
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

  // --- Ledger ---
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
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
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const s = loadSettings();
    const savedLedger = loadLedger();
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

    if (latest) {
      setAge(latest.age || 55);
      setEquityVal(latest.equities ? String(latest.equities) : "");
      setMmVal(latest.mmFund ? String(latest.mmFund) : "");
      setAthVal(latest.ath ? String(latest.ath) : "");
      if (latest.targetYearly) setTargetYearly(String(latest.targetYearly));
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
    () => computeInflationTracking(ledger, inflationPct),
    [ledger, inflationPct],
  );
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
  const nominaliseRequest = useCallback(
    (realAmount: number): number => {
      const idx = inflationTracking.currentIndex;
      const hasDrift = !!idx && Math.abs(idx - 1) > 0.0005;
      return hasDrift ? nominalFromReal(realAmount, idx) : realAmount;
    },
    [inflationTracking],
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
    };
    const next = editIndex > -1 ? ledger.map((e, i) => (i === editIndex ? entry : e)) : [entry, ...ledger];
    setLedger(next);
    saveLedger(next);
    setEditIndex(-1);
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
      preEditSlidersRef.current = { cashRealPct, inflationPct, legacyTarget, currency };
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
    setAge(latest.age || 55);
    setCappingAge(latest.cappingAge || 95);
    setDesiredRunwayMonths(latest.desiredMonths || 36);
    // Build 096 — Growth is now a per-row assumption (Build 095). New-entry
    // state must therefore show the CURRENT global growth rate (restored from
    // newEntryBaselineRef above), not the latest committed row's stored value.
    if (typeof latest.legacyTarget === "number") setLegacyTarget(latest.legacyTarget);
  };

  // Build 095 — Growth / Cash Real Return / Inflation are now stored PER ROW,
  // so Discard Changes and Exit Edit must NOT restore them from a pre-edit
  // global snapshot: editEntry() reloads them from the row itself (or 0 /
  // "not recorded" for legacy rows), and loadNewEntry() restores the global
  // baseline when leaving Edit. This helper now only covers the remaining
  // non-row settings (legacyTarget, currency).
  // No-op when no snapshot exists (e.g. Cancel in new-entry mode —
  // that path uses newEntryBaselineRef instead).
  const restorePreEditSliders = () => {
    const snap = preEditSlidersRef.current;
    if (!snap) return;
    setLegacyTarget(snap.legacyTarget);
    setCurrency(snap.currency);
    setCurrencySymbol(snap.currency);
  };

  const revertPane1 = () => {
    if (editIndex > -1) {
      editEntry(editIndex);
      restorePreEditSliders();
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
    if (latest.targetYearly) setTargetYearly(String(latest.targetYearly));
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
    if (ledger.length === 0) {
      alert("Ledger is empty — nothing to export.");
      return;
    }
    // Build 073 — sort by Period End Date ascending (real chronological order).
    // Event rows use `eventDate`; Normal rows use `periodEndDate`. Rows with
    // no date at all (unmigrated legacy) sink to the end but keep insertion
    // order. Age is deliberately NOT used as a sort proxy any more.
    const dateOf = (e: LedgerEntry): string => (e.isSpecialEvent ? e.eventDate : e.periodEndDate) || "";
    const chronological = ledger
      .map((e, idx) => ({ e, idx }))
      .sort((a, b) => {
        const da = dateOf(a.e);
        const db = dateOf(b.e);
        if (!da && !db) return a.idx - b.idx;
        if (!da) return 1;
        if (!db) return -1;
        if (da < db) return -1;
        if (da > db) return 1;
        return a.idx - b.idx;
      })
      .map((x) => x.e);

    const blank = "";
    const num = (n: number | undefined | null) => (typeof n === "number" && isFinite(n) ? n.toFixed(2) : blank);
    const pct = (n: number | undefined | null) => (typeof n === "number" && isFinite(n) ? n.toFixed(4) : blank);

    const kindOf = (d: LedgerEntry): "normal" | "special_withdrawal" | "windfall" => {
      if (d.entryKind) return d.entryKind;
      if (d.isInflowEvent) return "windfall";
      if (d.isSpecialEvent) return "special_withdrawal";
      return "normal";
    };

    // A row has "recorded" bucket-split data only when the Phase 1 fields are
    // actually present (Build 070+ Normal rows). Legacy Normal rows and event
    // rows must show blanks, not zeros.
    const hasSplit = (d: LedgerEntry) =>
      kindOf(d) === "normal" &&
      (typeof d.withdrawnFromEquities === "number" ||
        typeof d.withdrawnFromCash === "number" ||
        typeof d.rebalanceAmount === "number" ||
        d.rebalanceDirection !== undefined);

    const rebalLabel = (dir: LedgerEntry["rebalanceDirection"]) =>
      dir === "eq_to_cash"
        ? "Equities → Cash"
        : dir === "cash_to_eq"
          ? "Cash → Equities"
          : dir === "none"
            ? "None"
            : blank;

    const eventAmount = (d: LedgerEntry): string => {
      const kind = kindOf(d);
      if (kind === "windfall") return num(d.eventAmount);
      if (kind === "special_withdrawal") {
        const amt = typeof d.eventAmount === "number" ? d.eventAmount : (d.eventFromEq || 0) + (d.eventFromCash || 0);
        return amt ? num(amt) : blank;
      }
      return blank;
    };

    const targetWrPct = (d: LedgerEntry): string => {
      const tot = Number(d.totalCapital) || 0;
      const ty = Number(d.targetYearly) || 0;
      if (tot <= 0) return blank;
      return ((ty / tot) * 100).toFixed(4);
    };

    exportLedgerCSV<LedgerEntry>(
      chronological,
      [
        { header: "Reporting Period", value: (d) => d.label ?? "" },
        {
          header: "Period End Date",
          // Build 073 — real ISO date. Normal rows use periodEndDate; event
          // rows use eventDate. Blank for unmigrated legacy rows.
          value: (d) => (d.isSpecialEvent ? d.eventDate : d.periodEndDate) ?? "",
        },
        { header: "Age", value: (d) => (typeof d.age === "number" ? d.age : "") },
        {
          // Build 078 — per-row Horizon (capping) Age. The metadata header
          // shows the current live setting; this column preserves each row's
          // own stored cappingAge at commit time (may differ across rows).
          header: "Horizon Age",
          value: (d) => (typeof d.cappingAge === "number" && d.cappingAge > 0 ? d.cappingAge : ""),
        },

        { header: "Phase", value: (d) => d.phase ?? "" },
        { header: "Equities", value: (d) => num(d.equities) },
        { header: "Cash", value: (d) => num(d.mmFund) },
        { header: "Portfolio Total", value: (d) => num(d.totalCapital) },
        { header: "ATH", value: (d) => num(d.ath) },
        { header: "Drawdown from ATH (%)", value: (d) => pct(d.drawdownPct) },
        { header: "entryKind", value: (d) => kindOf(d) },
        {
          header: "Withdrawn from Equities",
          value: (d) => (hasSplit(d) ? num(d.withdrawnFromEquities) : blank),
        },
        {
          header: "Withdrawn from Cash",
          value: (d) => (hasSplit(d) ? num(d.withdrawnFromCash) : blank),
        },
        {
          header: "Withdrawal Total",
          value: (d) => (kindOf(d) === "normal" ? num(d.withdrawnAmount) : blank),
        },
        {
          header: "Rebalance Direction",
          value: (d) => (hasSplit(d) ? rebalLabel(d.rebalanceDirection) : blank),
        },
        {
          header: "Rebalance Amount",
          value: (d) => (hasSplit(d) ? num(d.rebalanceAmount) : blank),
        },
        { header: "Event Amount", value: (d) => eventAmount(d) },
        { header: "Target Withdrawal Rate (%)", value: (d) => targetWrPct(d) },
        // Build 079 — snapshot of Pane 2's Withdrawal Status + Guardrail State
        // (stored per-row at commit time). Positioned near Horizon Age so the
        // full Pane 2 context travels with the row into external tools.
        { header: "Withdrawal Status", value: (d) => d.guardrailStatus ?? "" },
        { header: "Guardrail State", value: (d) => d.rule ?? "" },
        { header: "Status/Directive", value: (d) => d.rule ?? "" },
      ],
      {
        "Row count": chronological.length,
        "Target Horizon Age": cappingAge,
        "Assumed Growth Rate (%)": Number(growthRate).toString(),
        "Cash Buffer Target (months)": desiredRunwayMonths,
        "Annual Target Withdrawal": cleanNum(targetYearly).toFixed(2),
        Currency: currency,
      },
      { filename: `sovereign-ledger_${localTimestamp()}.csv` },
    );
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
      {/* Disclaimer */}
      {showDisclaimer && (
        <div className="shd-overlay" role="dialog" aria-modal="true">
          <div className="shd-modal" style={{ width: 640, maxHeight: "90vh", overflowY: "auto" }}>
            <h2
              style={{
                fontSize: "1.4rem",
                fontWeight: 800,
                color: "var(--accent-red)",
                margin: "0 0 1rem 0",
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              ⚠️ Legal Notice, Disclaimer &amp; Limitation of Liability
            </h2>
            <div
              style={{
                fontSize: "0.85rem",
                lineHeight: 1.55,
                color: "var(--text-muted)",
                maxHeight: "42vh",
                overflowY: "auto",
                paddingRight: "0.5rem",
              }}
            >
              <p style={{ marginTop: 0 }}>
                <strong style={{ color: "var(--text-main)" }}>
                  PLEASE READ THIS NOTICE CAREFULLY BEFORE USING THE SOFTWARE.
                </strong>{" "}
                Sovereign Glidepath is provided as a recreational, educational and illustrative modeling tool only. It
                does not constitute financial, investment, tax or legal advice.
              </p>
              <p>
                All projections are hypothetical and bear no guaranteed relationship to future performance. You are
                solely responsible for any decisions you make and must consult a suitably qualified, regulated
                professional before acting on any output.
              </p>
              <p>
                The Software is provided "AS IS" without warranty of any kind. To the fullest extent permitted by law,
                the publisher accepts no liability for any loss of capital, income or pension funds arising from your
                use of, or inability to use, the Software.
              </p>
              <p style={{ marginBottom: 0 }}>
                If you do not accept these terms, close this dialog and discontinue use immediately.
              </p>
            </div>
            <div
              style={{
                background: "rgba(0,0,0,0.25)",
                padding: "1rem 1.2rem",
                borderRadius: "0.5rem",
                marginTop: "1rem",
                border: "1px solid rgba(239,68,68,0.3)",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  cursor: "pointer",
                  textTransform: "none",
                  fontSize: "0.9rem",
                  color: "var(--text-main)",
                  fontWeight: 600,
                }}
              >
                <input
                  type="checkbox"
                  checked={disclaimerAccepted}
                  onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                  style={{ width: "auto", marginTop: 3 }}
                />
                <span>
                  I have read, understood and accept the Legal Notice, Disclaimer and Limitation of Liability above, and
                  I waive any claim against the publisher arising from my use of this Software.
                </span>
              </label>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "1.5rem",
              }}
            >
              <button
                disabled={!disclaimerAccepted}
                onClick={() => {
                  if (disclaimerHide) {
                    try {
                      localStorage.setItem(DISCLAIMER_KEY, "true");
                    } catch {
                      /* ignore */
                    }
                  }
                  setShowDisclaimer(false);
                }}
              >
                Accept &amp; Enter Dashboard
              </button>
            </div>
            <div style={{ marginTop: "1rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  textTransform: "none",
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                }}
              >
                <input
                  type="checkbox"
                  checked={disclaimerHide}
                  onChange={(e) => setDisclaimerHide(e.target.checked)}
                  style={{ width: "auto" }}
                />{" "}
                Don't show this again on this device.
              </label>
            </div>
          </div>
        </div>
      )}

      {/* License modal */}
      {showLicense && !IS_STORE_BUILD && (
        <div className="shd-overlay" role="dialog" aria-modal="true">
          <div className="shd-modal">
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 800,
                margin: "0 0 0.5rem 0",
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              Activate License
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>
              Enter the registered name or email you supplied at purchase, then paste your license key. Activation is
              offline — the key is stored only in this browser.
            </p>
            <label style={{ display: "block", marginBottom: "0.75rem" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                Registered Name / Email
              </div>
              <input
                type="text"
                placeholder="e.g. alice@example.com"
                value={licenseNameInput}
                onChange={(e) => setLicenseNameInput(e.target.value)}
                autoFocus
              />
            </label>
            <label style={{ display: "block" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>License Key</div>
              <input
                type="text"
                placeholder="64-character key"
                value={licenseKeyInput}
                onChange={(e) => setLicenseKeyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitLicense();
                  if (e.key === "Escape") setShowLicense(false);
                }}
                spellCheck={false}
                autoCapitalize="none"
                autoComplete="off"
              />
            </label>
            {licenseError && (
              <div
                role="alert"
                style={{
                  color: "var(--accent-red)",
                  fontSize: "0.85rem",
                  marginTop: "0.75rem",
                  fontWeight: "bold",
                }}
              >
                {licenseError}
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: "1rem",
                marginTop: "1.5rem",
              }}
            >
              {license.licensed && (
                <button
                  className="secondary"
                  style={{ marginRight: "auto", color: "var(--accent-red)" }}
                  onClick={() => {
                    if (
                      !window.confirm(
                        "Deactivate this license on this device? You'll need to re-enter your name/email and license key to reactivate.",
                      )
                    ) {
                      return;
                    }
                    clearLicense();
                    setLicense({ licensed: false, name: null });
                    setLicenseNameInput("");
                    setLicenseKeyInput("");
                    setLicenseError("");
                    setShowLicense(false);
                    showToast("License deactivated on this device");
                  }}
                >
                  Deactivate License
                </button>
              )}
              <button className="secondary" onClick={() => setShowLicense(false)}>
                Cancel
              </button>
              <button onClick={submitLicense}>{license.licensed ? "Re-activate" : "Activate"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Commit-confirmation modal — final sanity check before writing to the ledger */}
      {showCommitConfirm &&
        (() => {
          const eqR = cleanNum(equityVal);
          const mmR = cleanNum(mmVal);
          const tot = eqR + mmR;
          const athCur = cleanNum(athVal);
          const athNew = Math.max(athCur, tot);
          const athRose = athNew > athCur + 0.005;
          const wr = tot > 0 ? (cleanNum(targetYearly) / tot) * 100 : 0;
          const dd = athNew > 0 ? ((athNew - tot) / athNew) * 100 : 0;
          const cell: React.CSSProperties = {
            padding: "0.3rem 0.5rem",
            borderBottom: "1px solid var(--border-color)",
            fontSize: "0.85rem",
          };
          const kcell: React.CSSProperties = { ...cell, color: "var(--text-muted)", width: "45%" };
          const vcell: React.CSSProperties = {
            ...cell,
            color: "var(--text-main)",
            fontWeight: 600,
            textAlign: "right",
          };
          return (
            <div className="shd-overlay" role="dialog" aria-modal="true">
              <div className="shd-modal" style={{ width: 520, maxHeight: "90vh", overflowY: "auto" }}>
                <h2
                  style={{
                    fontSize: "1.15rem",
                    fontWeight: 800,
                    margin: "0 0 0.35rem 0",
                    textTransform: "none",
                    letterSpacing: 0,
                  }}
                >
                  {editIndex > -1 ? "Confirm Ledger Update" : "Confirm Ledger Entry"}
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.85rem" }}>
                  Review the values below carefully. Once committed, this row will be written to your Historical
                  Timeline Ledger. Use <em>Cancel</em> to go back and fix any typos.
                </p>
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "0.75rem" }}>
                  <tbody>
                    <tr>
                      <td style={kcell}>Label</td>
                      <td style={vcell}>{(label || "Unlabeled").trim().slice(0, 40) || "Unlabeled"}</td>
                    </tr>
                    <tr>
                      <td style={kcell}>Period End Date</td>
                      <td style={vcell}>
                        {periodEndDate ? (
                          periodEndDate
                        ) : (
                          <span style={{ color: "var(--accent-amber)" }}>date not set</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td style={kcell}>Age / Phase</td>
                      <td style={vcell}>
                        {age} · {phaseFor(age)}
                      </td>
                    </tr>
                    <tr>
                      <td style={kcell}>Global Equities</td>
                      <td style={vcell}>{formatGBP(eqR)}</td>
                    </tr>
                    <tr>
                      <td style={kcell}>Cash Pot</td>
                      <td style={vcell}>{formatGBP(mmR)}</td>
                    </tr>
                    <tr>
                      <td style={kcell}>Total Capital</td>
                      <td style={vcell}>{formatGBP(tot)}</td>
                    </tr>
                    <tr>
                      <td style={kcell}>Stored ATH{athRose ? " (will be raised)" : ""}</td>
                      <td style={{ ...vcell, color: athRose ? "var(--accent-green)" : undefined }}>
                        {formatGBP(athNew)}
                        {athRose ? ` (was ${formatGBP(athCur)})` : ""}
                      </td>
                    </tr>
                    <tr>
                      <td style={kcell}>Drawdown vs ATH</td>
                      <td style={vcell}>{dd.toFixed(2)}%</td>
                    </tr>
                    <tr>
                      <td style={kcell}>Initial Annual Withdrawal (Frozen)</td>
                      <td style={vcell}>
                        {formatGBP(cleanNum(targetYearly))} ({wr.toFixed(2)}% WR)
                      </td>
                    </tr>
                    <tr>
                      <td style={kcell}>Legacy Target</td>
                      <td style={vcell}>{legacyTarget > 0 ? formatGBP(legacyTarget) : "—"}</td>
                    </tr>
                    <tr>
                      <td style={kcell}>Cash Buffer Target</td>
                      <td style={vcell}>{desiredRunwayMonths} months</td>
                    </tr>
                    <tr>
                      <td style={kcell}>Assumed Growth</td>
                      <td style={vcell}>{growthRate.toFixed(1)}%</td>
                    </tr>
                    <tr>
                      <td style={kcell}>Actual CPI Since Last Entry</td>
                      <td style={vcell}>
                        {actualCpiInput.trim() !== "" ? `${cleanNum(actualCpiInput).toFixed(2)}%` : "— (using assumed)"}
                      </td>
                    </tr>
                    {(() => {
                      const wdEq = cleanNum(wdEqStr);
                      const wdCash = cleanNum(wdCashStr);
                      const wdTotal = wdEq + wdCash;
                      // Build 125d — compare against the NOMINAL request (what the
                      // directive actually told the user to withdraw), or this would
                      // wrongly flag a mismatch for someone who correctly followed
                      // the directive's inflation-adjusted figure.
                      const req = nominaliseRequest(calc.guardrailAdjustedQuarterly);
                      const mismatch = wdTotal > 0 && Math.abs(wdTotal - req) > 0.005;
                      const rebAmt = rebalDir === "none" ? 0 : Math.max(0, cleanNum(rebalAmtStr));
                      const rebLabel =
                        rebalDir === "eq_to_cash"
                          ? "Equities → Cash"
                          : rebalDir === "cash_to_eq"
                            ? "Cash → Equities"
                            : "None";
                      return (
                        <>
                          <tr>
                            <td style={kcell}>Withdrawn from Equities</td>
                            <td style={vcell}>{wdEq > 0 ? formatGBP(wdEq) : "—"}</td>
                          </tr>
                          <tr>
                            <td style={kcell}>Withdrawn from Cash</td>
                            <td style={vcell}>{wdCash > 0 ? formatGBP(wdCash) : "—"}</td>
                          </tr>
                          <tr>
                            <td style={kcell}>Withdrawal Total</td>
                            <td style={vcell}>
                              {wdTotal > 0 ? formatGBP(wdTotal) : "—"}
                              {mismatch ? (
                                <span
                                  style={{
                                    color: "var(--accent-amber)",
                                    fontSize: "0.75rem",
                                    marginLeft: 6,
                                    fontWeight: 500,
                                  }}
                                >
                                  (Eq+Cash ≠ Request {formatGBP(req)})
                                </span>
                              ) : null}
                            </td>
                          </tr>
                          <tr>
                            <td style={kcell}>Rebalance Move</td>
                            <td style={vcell}>
                              {rebalDir === "none" || rebAmt <= 0 ? "None" : `${formatGBP(rebAmt)} ${rebLabel}`}
                            </td>
                          </tr>
                        </>
                      );
                    })()}
                    <tr>
                      <td style={{ ...kcell, borderBottom: 0 }}>Directive</td>
                      <td style={{ ...vcell, borderBottom: 0, color: directive.guardrailColor }}>
                        {directive.guardrailText}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                  <button className="secondary" onClick={() => setShowCommitConfirm(false)}>
                    Cancel
                  </button>
                  <button onClick={performCommit} style={{ fontWeight: 700 }}>
                    {editIndex > -1 ? "Update Entry" : "Commit to Ledger"}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Entry-limit lockout modal */}
      {showLockout && !IS_STORE_BUILD && (
        <div className="shd-overlay" role="dialog" aria-modal="true">
          <div className="shd-modal">
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 800,
                margin: "0 0 0.5rem 0",
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              Entry Limit Reached
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
              Maximum entry limit reached for evaluation copy. Please activate your license to unlock unlimited
              historical planning.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "1rem",
              }}
            >
              <button className="secondary" onClick={() => setShowLockout(false)}>
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLockout(false);
                  setLicenseError("");
                  setShowLicense(true);
                }}
              >
                Enter License Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup/restore modal */}
      {modal && (
        <div className="shd-overlay" role="dialog" aria-modal="true">
          <div className="shd-modal">
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 800,
                margin: "0 0 0.5rem 0",
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              {modal.title}
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>{modal.desc}</p>
            <input
              type="password"
              value={modalPw}
              autoFocus
              placeholder={modal.mode === "passphrase" ? "Current passphrase..." : undefined}
              onChange={(e) => setModalPw(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitModal();
                if (e.key === "Escape") closeModal();
              }}
            />
            {(modal.mode === "export" || modal.mode === "passphrase") && (
              <input
                type="password"
                placeholder={modal.mode === "passphrase" ? "New passphrase..." : "Confirm Password..."}
                style={{ marginTop: "1rem" }}
                value={modalConfirm}
                onChange={(e) => setModalConfirm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitModal();
                  if (e.key === "Escape") closeModal();
                }}
              />
            )}
            {modal.mode === "passphrase" && (
              <input
                type="password"
                placeholder="Confirm new passphrase..."
                style={{ marginTop: "1rem" }}
                value={modalExtra}
                onChange={(e) => setModalExtra(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitModal();
                  if (e.key === "Escape") closeModal();
                }}
              />
            )}
            {modalError && (
              <div
                role="alert"
                style={{
                  color: "var(--accent-red)",
                  fontSize: "0.85rem",
                  marginTop: "0.5rem",
                  fontWeight: "bold",
                }}
              >
                {modalError}
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "1rem",
                marginTop: "1.5rem",
              }}
            >
              <button className="secondary" onClick={closeModal}>
                Cancel
              </button>
              <button onClick={submitModal} disabled={modalBusy}>
                {modalBusy ? "Working…" : "Proceed"}
              </button>
            </div>
          </div>
        </div>
      )}

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
            {/* PANE 1 — Parameters */}
            <div className="shd-card">
              <h2 className="shd-h2">1. Parameters</h2>

              <div className="shd-cluster">
                <div
                  style={{
                    display: "flex",
                    gap: "1.5rem",
                    alignItems: "center",
                    marginBottom: "0.5rem",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <label htmlFor="cappingAge">Target Horizon Age</label>
                    <IntInput
                      id="cappingAge"
                      min={55}
                      max={120}
                      value={cappingAge}
                      fallback={95}
                      onChange={setCappingAge}
                    />
                  </div>
                  <div style={{ flex: 2 }}>
                    <label>Horizon</label>
                    <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-blue)" }}>
                      {calc.remainingYears} Years Remaining
                    </span>
                  </div>
                </div>
                <div style={{ marginTop: "1rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <label style={{ margin: 0 }}>
                      Age: <strong>{age}</strong>
                    </label>
                    <span className={`phase-badge ${phaseBadge}`}>{phase}</span>
                  </div>
                  <input
                    type="range"
                    min={55}
                    max={cappingAge}
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value) || 55)}
                  />
                </div>
              </div>

              <div className="shd-cluster">
                <label htmlFor="ledgerLabel">Reporting Period</label>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                  <input
                    id="ledgerLabel"
                    type="text"
                    maxLength={40}
                    placeholder="Q1 2024"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                  <button
                    className="secondary"
                    onClick={() => {
                      // Auto-Label also refreshes the real date to today so
                      // the two fields stay coherent by default. The user
                      // can still override the date manually for back-fills.
                      setLabel(autoQuarterLabel());
                      setPeriodEndDate(todayIso());
                    }}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    Auto-Label
                  </button>
                </div>
                {/* Build 073 — real date. Free-text label above is cosmetic;
                    this field is the single source of truth for chronological
                    ordering. Defaults to today; override for back-fills. */}
                <label htmlFor="periodEndDate" style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  Period End Date{" "}
                  <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(real date — used for sort order)</span>
                </label>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 15 }}>
                  <input
                    id="periodEndDate"
                    type="date"
                    value={periodEndDate}
                    onChange={(e) => setPeriodEndDate(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => setPeriodEndDate(todayIso())}
                    style={{ whiteSpace: "nowrap" }}
                    title="Reset to today"
                  >
                    Today
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label>Global Equities Pot ({currency})</label>
                    <MoneyInput
                      id="equityVal"
                      value={equityVal}
                      onChange={setEquityVal}
                      currency={currency}
                      nonNegative
                    />
                    <div style={{ marginTop: "0.5rem" }}>
                      <label
                        style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}
                        title="Moves only the dashed 'Assumed Rate' line. Does not change how fast Equities grow in the Fan Chart — only nudges when the simulation switches to spending from Cash."
                      >
                        Assumed Real Growth Rate{" "}
                        <strong style={{ color: "var(--accent-blue)" }}>{growthRate.toFixed(1)}%</strong>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={20}
                        step={0.1}
                        value={growthRate}
                        onChange={(e) => setGrowthRate(parseFloat(e.target.value) || 0)}
                        style={{ width: "100%" }}
                        aria-label="Assumed real growth rate on Global Equities"
                      />
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                        Real (after-inflation) growth assumed for the Global Equities Pot
                      </div>
                    </div>
                  </div>

                  <div>
                    <label>Cash Pot ({currency})</label>
                    <MoneyInput id="mmVal" value={mmVal} onChange={setMmVal} currency={currency} nonNegative />
                    <div style={{ marginTop: "0.5rem" }}>
                      <label style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        Cash Real Return{" "}
                        <strong style={{ color: "var(--accent-blue)" }}>{cashRealPct.toFixed(1)}%</strong>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={3}
                        step={0.1}
                        value={cashRealPct}
                        onChange={(e) => setCashRealPct(parseFloat(e.target.value) || 0)}
                        style={{ width: "100%" }}
                        aria-label="Cash Pot real return above inflation"
                      />
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                        Real (after-inflation) return assumed on the Cash Pot
                      </div>
                    </div>
                  </div>
                </div>
                {/* Build 095 — legacy row indicator. Rows committed before
                    Build 095 carry no stored assumption snapshot; Edit shows
                    0% for all three rather than fabricating today's globals. */}
                {editIndex > -1 && assumptionsNotRecorded && (
                  <div
                    style={{
                      marginTop: "0.6rem",
                      fontSize: "0.7rem",
                      color: "var(--accent-amber, #e0a33e)",
                      fontStyle: "italic",
                    }}
                  >
                    Assumptions not recorded on this row (committed before Build 095) — Growth, Cash Real Return and
                    Inflation / CPI show 0%. Set them and re-save the row to record what was actually assumed.
                  </div>
                )}
                {/* Build 082 — independent Pane 1 inflation assumption. The
                    Pane 3 directive's annualised-real deflation reads from
                    THIS slider, not the Risk Simulator's own Inflation slider.
                    First-load seed: shd_mc_v1 if present, else 2.5%; once
                    either slider moves, they diverge freely. */}
                <div style={{ marginTop: "0.85rem" }}>
                  <label style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    Inflation / CPI Assumption{" "}
                    <strong style={{ color: "var(--accent-blue)" }}>{inflationPct.toFixed(1)}%</strong>
                    <span style={{ marginLeft: 8, color: "var(--text-muted)", fontStyle: "italic" }}>
                      — used by the Pane 3 directive to deflate the annualised return.
                    </span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={8}
                    step={0.1}
                    value={inflationPct}
                    onChange={(e) => setInflationPct(parseFloat(e.target.value) || 0)}
                    style={{ width: "100%" }}
                    aria-label="Inflation / CPI assumption used by the ledger directive"
                  />
                </div>
              </div>

              <div className="shd-cluster">
                <div
                  style={{
                    marginTop: "1rem",
                    borderTop: "1px solid var(--border-color)",
                    paddingTop: "1rem",
                  }}
                >
                  <label style={{ color: "var(--accent-green)" }}>
                    Initial Annual Withdrawal — Frozen Baseline ({currency})
                  </label>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "-0.3rem", marginBottom: "0.5rem" }}>
                    Set your desired standard of living once. Inflation is applied automatically — only change this
                    for a genuine lifestyle change.
                  </div>
                  <MoneyInput id="targetYearly" value={targetYearly} onChange={setTargetYearly} currency={currency} />
                  {(() => {
                    // Build 125e — live nominal preview, updates as you type,
                    // before you commit anything. Answers "what does this
                    // actually mean in real pounds today?" on the spot, for
                    // both the figure as typed AND — since this is exactly
                    // the moment someone is most likely to be testing a
                    // lifestyle change — a quick multiplier reference so a
                    // "20% pay rise" is visibly just ×1.2 on the frozen
                    // baseline, with no inflation arithmetic required.
                    const idx = inflationTracking.currentIndex;
                    const hasDrift = !!idx && Math.abs(idx - 1) > 0.0005;
                    if (!hasDrift) return null;
                    const annualReal = cleanNum(targetYearly);
                    if (annualReal <= 0) return null;
                    const annualNominal = nominaliseRequest(annualReal);
                    const quarterlyNominal = annualNominal / 4;
                    return (
                      <div
                        style={{
                          marginTop: "0.5rem",
                          padding: "0.6rem 0.75rem",
                          background: "rgba(55,138,221,0.1)",
                          border: "1px solid rgba(55,138,221,0.3)",
                          borderRadius: "0.4rem",
                          fontSize: "0.78rem",
                        }}
                      >
                        <span style={{ color: "var(--text-muted)" }}>Live nominal preview — </span>
                        <strong style={{ color: "var(--accent-blue)" }}>{formatGBP(annualNominal)}/year</strong>
                        <span style={{ color: "var(--text-muted)" }}> ({formatGBP(quarterlyNominal)}/quarter) in actual pounds today</span>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                          Based on realised inflation since plan start (see Pane 2's Inflation Tracking). A genuine
                          lifestyle change is a straight multiplier on the frozen baseline above — e.g. a 20% rise is{" "}
                          {formatGBP(annualReal)} × 1.2 = {formatGBP(annualReal * 1.2)}, not a guess at a nominal figure.
                        </div>
                      </div>
                    );
                  })()}
                  {calc.pensionActive && (
                    <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", lineHeight: 1.5 }}>
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>Gross lifestyle target: </span>
                        <strong>{formatGBP(calc.grossTargetYearly)}</strong>
                        <span style={{ color: "var(--text-muted)" }}> / yr</span>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>Less pension in payment: </span>
                        <strong>−{formatGBP(calc.pensionIncome)}</strong>
                        <span style={{ color: "var(--text-muted)" }}>
                          {" "}
                          / yr (from age {pensionStartAge}
                          {pensionIncreasePct > 0 ? `, +${pensionIncreasePct.toFixed(1)}% real p.a.` : ""})
                        </span>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>Net drawn from pot: </span>
                        <strong style={{ color: "var(--accent-blue)" }}>{formatGBP(calc.netTargetYearly)}</strong>
                        <span style={{ color: "var(--text-muted)" }}> / yr — used for the guardrail calculation</span>
                      </div>
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: "0.5rem",
                    }}
                  >
                    <span className="shd-sub">Request: {formatGBP(calc.quarterlyRequest)}</span>
                    <span className="shd-sub">Shield Target: {formatGBP(calc.targetCashAmount)}</span>
                  </div>
                  <div className="shd-sub" style={{ marginTop: "0.35rem" }}>
                    {calc.pensionActive
                      ? "Pension is netted off automatically — the values below drive this pane and the Risk Simulator."
                      : pensionAmount > 0
                        ? `Pension of ${formatGBP(pensionAmount)}/yr starts at age ${pensionStartAge} — until then the full gross target is funded from the pot.`
                        : "No pension set. Add one below and it will be netted off this target automatically once it starts."}
                  </div>

                  {/* Build 099 — pension inputs live here (Pane 1) as the single
                      real, app-wide source. The Risk Simulator reads these live, or can run
                      its own hypothetical without ever writing back. */}
                  <div
                    style={{
                      marginTop: "0.85rem",
                      paddingTop: "0.75rem",
                      borderTop: "1px dashed var(--border-color)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "var(--text-main)",
                        marginBottom: "0.5rem",
                      }}
                    >
                      State / Other Pension
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "0.75rem",
                      }}
                    >
                      <div>
                        <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          Annual Pension ({currency}, today's {currency})
                        </label>
                        <MoneyInput
                          id="pension-amount"
                          currency={currency}
                          value={pensionAmountStr}
                          onChange={setPensionAmountStr}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Pension Start Age</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="67"
                          value={String(pensionStartAge)}
                          onChange={(e) => {
                            const n = Math.floor(Number(e.target.value.replace(/[^0-9]/g, "")) || 0);
                            setPensionStartAge(n);
                          }}
                          aria-label="Pension start age"
                        />
                      </div>
                    </div>
                    <label
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        display: "block",
                        marginTop: "0.6rem",
                      }}
                    >
                      Pension Real Increase %{" "}
                      <span style={{ color: "var(--text-main)", fontWeight: 700 }}>
                        {pensionIncreasePct.toFixed(1)}%
                      </span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={3}
                      step={0.1}
                      value={pensionIncreasePct}
                      onChange={(e) => setPensionIncreasePct(parseFloat(e.target.value) || 0)}
                      style={{ width: "100%" }}
                      aria-label="Pension real increase percent per year"
                    />
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-muted)",
                        marginTop: "0.15rem",
                        fontStyle: "italic",
                      }}
                    >
                      Growth above inflation (0% = tracks CPI exactly). These are your real figures — the Risk Simulator
                      reads them live unless you switch it to Hypothetical.
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.75fr", gap: "0.85rem" }}>
                  <div>
                    <label style={{ fontSize: "0.78rem", whiteSpace: "nowrap" }}>Cash Buffer Target (months)</label>
                    <IntInput
                      min={1}
                      max={120}
                      value={desiredRunwayMonths}
                      fallback={36}
                      onChange={setDesiredRunwayMonths}
                    />
                  </div>
                  <div>
                    <label htmlFor="legacyTargetTop" style={{ fontSize: "0.78rem", whiteSpace: "nowrap" }}>
                      Legacy Target ({currency})
                    </label>
                    <MoneyInput
                      id="legacyTargetTop"
                      value={legacyTarget ? String(legacyTarget) : ""}
                      onChange={(v) => setLegacyTarget(cleanNum(v))}
                      currency={currency}
                    />
                  </div>
                  <div>
                    <label htmlFor="currencySel" style={{ fontSize: "0.78rem", whiteSpace: "nowrap" }}>
                      Currency
                    </label>
                    <select
                      id="currencySel"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as CurrencySymbol)}
                      style={{
                        width: "100%",
                        background: "var(--bg-input, #0f172a)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-main)",
                        padding: "0.6rem",
                        borderRadius: "0.375rem",
                        fontSize: "0.95rem",
                      }}
                      aria-label="Display currency (cosmetic only — no FX conversion)"
                    >
                      <option value="£">£ GBP</option>
                      <option value="€">€ EUR</option>
                      <option value="$">$ USD</option>
                    </select>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--text-muted)",
                    marginTop: 6,
                    fontStyle: "italic",
                  }}
                >
                  Legacy Target: real-terms amount you want to leave behind (rises with inflation). Held aside from the
                  Fun Bucket and factored into every directive. Set to {currency}0 to draw the pot to zero. Currency
                  change is cosmetic only — no FX conversion.
                </div>

                <div
                  style={{
                    marginTop: "1rem",
                    borderTop: "1px solid var(--border-color)",
                    paddingTop: "1rem",
                  }}
                >
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.35rem" }}>
                    Withdrawal Recorded ({currency})
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                    <div>
                      <label htmlFor="wdEq" style={{ fontSize: "0.75rem" }}>
                        Withdrawn from Equities
                      </label>
                      <MoneyInput
                        id="wdEq"
                        value={wdEqStr}
                        onChange={(v) => {
                          setWdEqStr(v);
                          setWdSplitTouched(true);
                        }}
                        currency={currency}
                      />
                    </div>
                    <div>
                      <label htmlFor="wdCash" style={{ fontSize: "0.75rem" }}>
                        Withdrawn from Cash
                      </label>
                      <MoneyInput
                        id="wdCash"
                        value={wdCashStr}
                        onChange={(v) => {
                          setWdCashStr(v);
                          setWdSplitTouched(true);
                        }}
                        currency={currency}
                      />
                    </div>
                  </div>
                  {(() => {
                    const wdEq = cleanNum(wdEqStr);
                    const wdCash = cleanNum(wdCashStr);
                    const wdTotal = wdEq + wdCash;
                    // Build 125d — nominal request, matching the directive.
                    const req = nominaliseRequest(calc.guardrailAdjustedQuarterly);
                    const mismatch = wdTotal > 0 && Math.abs(wdTotal - req) > 0.005;
                    return (
                      <div
                        style={{
                          marginTop: "0.4rem",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "0.75rem",
                        }}
                      >
                        <span className="shd-sub" style={{ fontSize: "0.75rem" }}>
                          Total: <strong>{formatGBP(wdTotal)}</strong>
                          {mismatch ? (
                            <span style={{ color: "var(--accent-amber)", marginLeft: 6 }}>
                              ⚠ Eq + Cash ≠ Request {formatGBP(req)} — commit will still succeed.
                            </span>
                          ) : null}
                        </span>
                        <button
                          className="secondary"
                          type="button"
                          style={{ fontSize: "0.7rem", padding: "0.3rem 0.55rem", whiteSpace: "nowrap" }}
                          onClick={() => {
                            setWdSplitTouched(false);
                            // Build 125d — reset to the nominal request too.
                            const rq = nominaliseRequest(calc.guardrailAdjustedQuarterly);
                            setWdEqStr("0.00");
                            setWdCashStr(rq > 0 ? rq.toFixed(2) : "0.00");
                          }}
                          title="Reset to £0 Equities / full Request from Cash."
                        >
                          Reset split
                        </button>
                      </div>
                    );
                  })()}

                  <div style={{ marginTop: "0.75rem" }}>
                    <label htmlFor="rebalDir" style={{ fontSize: "0.75rem" }}>
                      Rebalance Move (optional)
                    </label>
                    <div
                      style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "0.6rem", alignItems: "center" }}
                    >
                      <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                        {(
                          [
                            ["none", "None"],
                            ["eq_to_cash", "Equities → Cash"],
                            ["cash_to_eq", "Cash → Equities"],
                          ] as [typeof rebalDir, string][]
                        ).map(([id, label]) => (
                          <button
                            key={id}
                            type="button"
                            className={rebalDir === id ? "" : "secondary"}
                            style={{ fontSize: "0.7rem", padding: "0.35rem 0.55rem", minHeight: "auto" }}
                            onClick={() => setRebalDir(id)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <MoneyInput id="rebalAmt" value={rebalAmtStr} onChange={setRebalAmtStr} currency={currency} />
                    </div>
                    <span className="shd-sub" style={{ fontSize: "0.7rem" }}>
                      Records an intra-bucket transfer that happened this quarter (separate from spending).
                    </span>
                  </div>
                  {/* Legacy hidden value — kept in sync with the total so any
                      remaining consumer of withdrawnStr still works. */}
                  <input type="hidden" value={withdrawnStr} readOnly />
                </div>
              </div>

              {/* Build 081 — State Test Presets moved to Pane 2 (hidden by
                  default, toggled via double-click on the Pane 2 header). */}

              {/* Build 083 — primary + contextual secondaries. In Edit mode we
                  show THREE buttons: Update Entry / Discard Changes / Exit
                  Edit → New Entry. Outside Edit mode: Commit / Cancel only.
                  All secondary buttons use the app's standard blue button
                  styling (no ghost/outline) so they read clearly as
                  clickable actions. */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: editIndex > -1 ? "3fr 1fr 1fr" : "3fr 1fr",
                  gap: "0.5rem",
                }}
              >
                <button
                  onClick={openCommitConfirm}
                  disabled={trialBlocked}
                  style={{ width: "100%", padding: "1rem", fontWeight: 800, borderRadius: "0.5rem" }}
                  title={trialBlocked ? "Entry limit reached — enter a license key to continue." : ""}
                >
                  {editIndex > -1
                    ? "Update Entry"
                    : trialBlocked
                      ? "Entry limit reached — License required"
                      : "Commit Entry to Ledger"}
                </button>
                <button
                  onClick={revertPane1}
                  style={{
                    width: "100%",
                    padding: "1rem",
                    fontWeight: 700,
                    borderRadius: "0.5rem",
                  }}
                  title={
                    editIndex > -1
                      ? "Reload this row's stored values, discarding any unsaved edits. Stays in Edit mode."
                      : "Reload the most recently committed Normal ledger entry, discarding any unsaved changes."
                  }
                >
                  {editIndex > -1 ? "Discard Changes" : "Cancel"}
                </button>
                {editIndex > -1 && (
                  <button
                    onClick={exitEditToNewEntry}
                    style={{
                      width: "100%",
                      padding: "1rem",
                      fontWeight: 700,
                      borderRadius: "0.5rem",
                    }}
                    title="Fully exit Edit mode and load Pane 1 with the fresh new-entry state (last committed Normal ledger entry)."
                  >
                    Exit Edit / New Entry
                  </button>
                )}
              </div>

              {/* Build 065 — Extraordinary Inflow relocated below "Can I Afford This?" */}
            </div>

            {/* PANE 2 — Diagnostics */}
            <div className="shd-card">
              <h2
                className="shd-h2"
                style={{ cursor: "pointer", userSelect: "none" }}
                onDoubleClick={() => {
                  setShowStatePresets((v) => {
                    // Build 083 — hiding the panel auto-reverts Pane 1 to the
                    // real committed state so leftover preset values can't
                    // silently contaminate a subsequent commit.
                    if (v) revertPane1();
                    return !v;
                  });
                }}
                title="Double-click to toggle State Test Presets (QA aid)"
              >
                2. Intelligence Diagnostics
              </h2>
              {showStatePresets && (
                <StateTestPresets
                  pinnedPeriodEndDate={presetPinnedPeriodEndDate}
                  currentValues={{
                    age,
                    cappingAge,
                    equityVal,
                    mmVal,
                    athVal,
                    targetYearly,
                    stressPct,
                    desiredRunwayMonths,
                    legacyTarget,
                    growthRate,
                    periodEndDate,
                  }}
                  apply={(v: PresetValues) => {
                    if (v.age != null) setAge(v.age);
                    if (v.cappingAge != null) setCappingAge(v.cappingAge);
                    if (v.equityVal != null) setEquityVal(v.equityVal);
                    if (v.mmVal != null) setMmVal(v.mmVal);
                    if (v.athVal != null) setAthVal(v.athVal);
                    if (v.targetYearly != null) setTargetYearly(v.targetYearly);
                    if (v.stressPct != null) setStressPct(v.stressPct);
                    if (v.desiredRunwayMonths != null) setDesiredRunwayMonths(v.desiredRunwayMonths);
                    if (v.legacyTarget != null) setLegacyTarget(v.legacyTarget);
                    if (v.growthRate != null) setGrowthRate(v.growthRate);
                    if (v.periodEndDate != null) setPeriodEndDate(v.periodEndDate);
                    setPresetBaselineTotal(
                      typeof v.baselineTotal === "number" && v.baselineTotal > 0 ? v.baselineTotal : null,
                    );
                    // Re-arm auto-seed so split fields reflect the new state.
                    setWdSplitTouched(false);
                    setWithdrawnTouched(false);
                  }}
                />
              )}
              <div>
                <label>Stored All-Time High Baseline ({currency})</label>
                <MoneyInput id="athVal" value={athVal} onChange={setAthVal} currency={currency} nonNegative />
              </div>
              <hr
                style={{
                  border: 0,
                  borderTop: "1px solid var(--border-color)",
                  margin: "1.5rem 0",
                }}
              />
              <div className="diagnostics-subgrid">
                <div>
                  <label>Total Capital</label>
                  <div className="shd-readout">{formatGBP(calc.total)}</div>
                </div>
                <div>
                  <label>Peak Drawdown</label>
                  <div className="shd-readout">{calc.drawdownPct.toFixed(2)}%</div>
                </div>
                <div>
                  <label>Fun Bucket Balance</label>
                  <div
                    className="shd-readout"
                    style={{
                      color: calc.surplus > 0 ? "var(--accent-purple)" : "var(--text-muted)",
                      fontWeight: 800,
                    }}
                  >
                    {formatGBP(Math.max(0, calc.surplus))}
                    {calc.runwayMonths < 3 && (
                      <div style={{ fontSize: "0.7rem", color: "var(--accent-red)", marginTop: 5 }}>
                        ⚠ Consuming Capital
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    gridColumn: "span 3",
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                    paddingTop: "1.25rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.85rem",
                      marginBottom: "1rem",
                    }}
                  >
                    <span>
                      Target Draw Rate:{" "}
                      <strong style={{ color: "var(--text-main)" }}>{calc.targetWR.toFixed(2)}%</strong>
                    </span>
                    <span>
                      Realized Draw Rate:{" "}
                      <strong style={{ color: "var(--text-main)" }}>{calc.currentWR.toFixed(2)}%</strong>
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div
                      style={{
                        padding: "0.75rem",
                        background: "rgba(0,0,0,0.15)",
                        borderRadius: "0.4rem",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--text-muted)",
                          fontWeight: 800,
                          textTransform: "uppercase",
                        }}
                      >
                        Withdrawal Status
                      </div>
                      <div style={{ fontWeight: 800, fontSize: "0.9rem", color: calc.guardrailColor }}>
                        {calc.guardrailStatus}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "0.75rem",
                        background: "rgba(0,0,0,0.15)",
                        borderRadius: "0.4rem",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--text-muted)",
                          fontWeight: 800,
                          textTransform: "uppercase",
                        }}
                      >
                        Guardrail State
                      </div>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: "0.9rem",
                          color: directive.guardrailColor,
                        }}
                      >
                        {directive.guardrailText}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    gridColumn: "span 3",
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                    paddingTop: "0.75rem",
                  }}
                >
                  <label>Actual Cash Shield Runway</label>
                  <div className="shd-readout" style={{ color: calc.runwayColor }}>
                    {calc.runwayMonths.toFixed(1)} Months
                  </div>
                </div>
                <div
                  style={{
                    gridColumn: "span 3",
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                    paddingTop: "0.75rem",
                  }}
                >
                  <label>Actuarial Amortization Matrix</label>
                  <div
                    style={{ fontSize: "0.95rem", fontWeight: 600 }}
                    dangerouslySetInnerHTML={{ __html: directive.actuarialHtml }}
                  />
                </div>
                <div
                  style={{
                    gridColumn: "span 3",
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                    paddingTop: "0.75rem",
                  }}
                >
                  <label>Market Momentum Vector</label>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: calc.trajectoryColor }}>
                    {calc.trajectoryLabel}
                  </div>
                </div>
              </div>

              {/* Build 125 — Inflation Tracking. Realised-inflation index built from
                  the ledger's actual/assumed CPI history, plus the optional per-quarter
                  actual-CPI entry. Kept out of Pane 1 (already busy) per Mark's steer —
                  this is a diagnostic, not a planning input. */}
              <div
                style={{
                  marginTop: "2rem",
                  padding: "1.25rem",
                  background: "rgba(55,138,221,0.05)",
                  border: "1px solid rgba(55,138,221,0.2)",
                  borderRadius: "0.5rem",
                }}
              >
                <label style={{ color: "var(--accent-blue)", fontWeight: 800, fontSize: "0.8rem" }}>
                  Inflation Tracking
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                    gap: "0.75rem",
                    marginTop: "0.85rem",
                  }}
                >
                  <div
                    style={{
                      padding: "0.75rem",
                      background: "rgba(0,0,0,0.15)",
                      borderRadius: "0.4rem",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase" }}>
                      Cumulative Index
                    </div>
                    <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>
                      {inflationTracking.currentIndex.toFixed(3)}×
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "0.75rem",
                      background: "rgba(0,0,0,0.15)",
                      borderRadius: "0.4rem",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase" }}>
                      Implied Average
                    </div>
                    <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>
                      {inflationTracking.impliedAverageAnnualPct.toFixed(1)}% p.a.
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "0.75rem",
                      background: "rgba(0,0,0,0.15)",
                      borderRadius: "0.4rem",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase" }}>
                      Since
                    </div>
                    <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>{inflationBaseYear ?? "—"}</div>
                  </div>
                </div>

                <div style={{ marginTop: "1rem" }}>
                  <label style={{ fontSize: "0.78rem" }}>Actual CPI since last entry (optional)</label>
                  <input
                    id="actualCpiInput"
                    type="text"
                    inputMode="decimal"
                    placeholder={`Leave blank to use assumed ${inflationPct.toFixed(1)}%`}
                    value={actualCpiInput}
                    onChange={(e) => setActualCpiInput(e.target.value)}
                    style={{ width: "100%" }}
                    aria-label="Actual CPI observed since the previous ledger entry"
                  />
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                    Look up the real inflation figure for this period if you want an accurate record; leaving it
                    blank falls back to the assumed CPI slider in Pane 1, pro-rated for the actual gap.
                  </div>
                </div>

                {inflationTracking.rows.length >= 2 && (
                  <button
                    type="button"
                    onClick={() => setShowInflationHistory((v) => !v)}
                    style={{ marginTop: "1rem", fontSize: "0.78rem" }}
                  >
                    {showInflationHistory ? "Hide" : "View"} realised-inflation history
                  </button>
                )}

                {showInflationHistory && inflationTracking.rows.length >= 2 && (
                  <div style={{ marginTop: "0.85rem", overflowX: "auto" }}>
                    <table style={{ width: "100%", fontSize: "0.78rem", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border-color)" }}>
                          <th style={{ padding: "0.35rem 0.5rem" }}>Period end</th>
                          <th style={{ padding: "0.35rem 0.5rem" }}>Rate applied</th>
                          <th style={{ padding: "0.35rem 0.5rem" }}>Source</th>
                          <th style={{ padding: "0.35rem 0.5rem" }}>Cumulative index</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inflationTracking.rows.map((r) => (
                          <tr key={r.ledgerIndex} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <td style={{ padding: "0.35rem 0.5rem" }}>{r.periodEndDate}</td>
                            <td style={{ padding: "0.35rem 0.5rem" }}>{r.rateAppliedPct.toFixed(2)}%</td>
                            <td style={{ padding: "0.35rem 0.5rem", color: r.isActual ? "var(--accent-blue)" : "var(--text-muted)" }}>
                              {r.isActual ? "Actual" : "Assumed"}
                            </td>
                            <td style={{ padding: "0.35rem 0.5rem" }}>{r.cumulativeIndex.toFixed(3)}×</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div
                style={{
                  marginTop: "2rem",
                  padding: "1.25rem",
                  background: "rgba(239,68,68,0.05)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: "0.5rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <label style={{ color: "var(--accent-red)", fontWeight: 800, fontSize: "0.8rem" }}>
                    🚨 Scenario Stress Test
                  </label>
                  {stressPct > 0 && (
                    <button
                      type="button"
                      onClick={() => setStressPct(0)}
                      style={{
                        fontSize: "0.72rem",
                        background: "transparent",
                        border: "1px solid var(--border-color)",
                        color: "var(--accent-blue)",
                        padding: "0.2rem 0.5rem",
                        borderRadius: "0.3rem",
                        cursor: "pointer",
                      }}
                      title="Snap the slider back to 0% and hide the hypothetical preview."
                    >
                      Return to baseline (0%)
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  Simulated Drop: <strong style={{ color: "var(--accent-red)" }}>{stressPct}%</strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={5}
                  value={stressPct}
                  onChange={(e) => setStressPct(parseFloat(e.target.value) || 0)}
                />
                {/* Build 084 — hypothetical preview now runs the SAME
                    pipeline (defensiveRec → bucketOverride → generateDirectives)
                    as the real Pane 3, so the narrative-state classification and
                    Fun Bucket figure are genuine re-evaluations under the
                    hypothetical inputs. All strictly local to this box — no
                    writeback to real state. */}

                {stressPreview &&
                  (() => {
                    const { hypEq, hypCalc, hypRec, hypDirective, hypBucket } = stressPreview;
                    const realState = directive.guardrailText;
                    const hypState = hypDirective.guardrailText;
                    const stateChanged = realState !== hypState;
                    const realBucketLabel = directiveBucket === "cash" ? "Cash Pot" : "Global Equities";
                    const hypBucketLabel = hypBucket === "cash" ? "Cash Pot" : "Global Equities";

                    return (
                      <div
                        style={{
                          marginTop: "0.75rem",
                          padding: "0.6rem 0.75rem",
                          background: "rgba(239,68,68,0.08)",
                          border: "1px dashed var(--accent-red)",
                          borderRadius: "0.4rem",
                          fontSize: "0.78rem",
                          lineHeight: 1.5,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            color: "var(--accent-red)",
                            marginBottom: "0.35rem",
                          }}
                        >
                          HYPOTHETICAL — {stressPct}% equities drop
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Stressed Equities:</span>
                          <strong>{formatGBP(hypEq)}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Stressed Total Capital:</span>
                          <strong>{formatGBP(hypCalc.total)}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Stressed Drawdown vs ATH:</span>
                          <strong>{hypCalc.drawdownPct.toFixed(1)}%</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Fun Bucket Balance:</span>
                          <strong
                            style={{
                              color: hypCalc.surplus > 0 ? "var(--accent-purple)" : "var(--text-muted)",
                            }}
                          >
                            <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                              {formatGBP(Math.max(0, calc.surplus))}
                            </span>{" "}
                            → {formatGBP(Math.max(0, hypCalc.surplus))}
                          </strong>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginTop: "0.35rem",
                          }}
                        >
                          <span>Directive State:</span>
                          <strong style={{ color: hypDirective.guardrailColor }}>{hypState}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Recommended Source ({defensiveMode}):</span>
                          <strong>{hypBucketLabel}</strong>
                        </div>
                        {stateChanged && (
                          <div
                            style={{
                              marginTop: "0.5rem",
                              padding: "0.5rem 0.65rem",
                              background: "rgba(0,0,0,0.15)",
                              border: "1px solid var(--border-color)",
                              borderRadius: 4,
                              fontSize: "0.72rem",
                              lineHeight: 1.5,
                            }}
                          >
                            <div style={{ fontWeight: 700 }}>
                              Directive would change:{" "}
                              <span style={{ color: "var(--accent-purple)" }}>
                                {realState} → {hypState}
                              </span>
                            </div>
                            <ul style={{ margin: "0.3rem 0 0", paddingLeft: "1.1rem" }}>
                              <li style={{ color: "var(--text-muted)" }}>
                                Source bucket: {realBucketLabel} → {hypBucketLabel}
                              </li>
                              <li style={{ color: "var(--text-muted)" }}>
                                Fun Bucket: {formatGBP(Math.max(0, calc.surplus))} →{" "}
                                {formatGBP(Math.max(0, hypCalc.surplus))}
                              </li>
                            </ul>
                          </div>
                        )}
                        <div
                          style={{
                            marginTop: "0.6rem",
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                            fontSize: "0.72rem",
                          }}
                        >
                          Preview only — Pane 1's real values, Pane 3's directive, and every committed calculation still
                          use the unstressed baseline.
                        </div>
                      </div>
                    );
                  })()}
              </div>

              {/* Build 118 — Companion Apps. A simple grid of launcher cards so
                  further spin-off tools can be dropped in without restructuring. */}
              <div
                style={{
                  marginTop: "2rem",
                  padding: "1.25rem",
                  background: "rgba(59,130,246,0.05)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "0.5rem",
                }}
              >
                <label>Companion Apps</label>
                <div
                  style={{
                    marginTop: "0.85rem",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: "0.85rem",
                  }}
                >
                  <div
                    style={{
                      padding: "0.9rem",
                      background: "var(--bg-main)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "0.5rem",
                    }}
                  >
                    <button
                      onClick={() => {
                        const isDesktop = typeof window !== "undefined" && window.location.protocol === "file:";
                        const params = new URLSearchParams({ currency });
                        const url = isDesktop
                          ? `#/accumulation-simulator?${params.toString()}`
                          : `/accumulation-simulator?${params.toString()}`;
                        window.open(url, "_blank", "noopener");
                      }}
                    >
                      📈 Accumulation Simulator
                    </button>
                    <div
                      style={{
                        marginTop: "0.55rem",
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        lineHeight: 1.45,
                      }}
                    >
                      Shows how a pot could grow from an early starting age to a chosen retirement age, across 10,000
                      possible market paths — a good one to share with younger family members starting out. Opens in its
                      own tab with its own sensible starting defaults, not your live Pane 1 figures.
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "0.9rem",
                      background: "var(--bg-main)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "0.5rem",
                    }}
                  >
                    <button
                      onClick={() => {
                        const params = new URLSearchParams({
                          eq: String(Math.round(cleanNum(equityVal))),
                          cash: String(Math.round(cleanNum(mmVal))),
                          age: String(age),
                          horizon: String(cappingAge - age),
                          withdrawal: String(Math.round(calc.grossTargetYearly)),
                          growth: String(growthRate),
                          cashReal: String(cashRealPct),
                          currency,
                        });
                        const pen = cleanNum(pensionAmountStr);
                        if (pen > 0) {
                          params.set("pensionAge", String(pensionStartAge));
                          params.set("pensionAmount", String(Math.round(pen)));
                        }
                        const isDesktop = typeof window !== "undefined" && window.location.protocol === "file:";
                        const url = isDesktop
                          ? `#/risk-simulator?${params.toString()}`
                          : `/risk-simulator?${params.toString()}`;
                        window.open(url, "_blank", "noopener");
                      }}
                    >
                      🎲 Risk Simulator (Monte Carlo)
                    </button>
                    <div
                      style={{
                        marginTop: "0.55rem",
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        lineHeight: 1.45,
                      }}
                    >
                      Stress-tests your plan across 10,000 possible market paths and plots the fan chart of outcomes.
                      Opens in its own tab as a sandbox, seeded from your live Pane 1 figures — nothing you change there
                      writes back.
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "0.9rem",
                      background: "var(--bg-main)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "0.5rem",
                    }}
                  >
                    <button
                      onClick={() => {
                        const isFile = typeof window !== "undefined" && window.location.protocol === "file:";
                        const params = new URLSearchParams({
                          eq: String(Math.round(cleanNum(equityVal))),
                          cash: String(Math.round(cleanNum(mmVal))),
                          age: String(age),
                          horizon: String(cappingAge - age),
                          withdrawal: String(Math.round(calc.grossTargetYearly)),
                          currency,
                        });
                        const pen = cleanNum(pensionAmountStr);
                        if (pen > 0) {
                          params.set("pensionAge", String(pensionStartAge));
                          params.set("pensionAmount", String(Math.round(pen)));
                        }
                        const base = isFile ? "./comparison-builder.html" : "/comparison-builder.html";
                        window.open(`${base}?${params.toString()}`, "_blank", "noopener");
                      }}
                    >
                      📊 Compare vs 4% Rule (Historical)
                    </button>
                    <div
                      style={{
                        marginTop: "0.55rem",
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        lineHeight: 1.45,
                      }}
                    >
                      Backtests your plan against every real rolling retirement since 1928, using the same engine as
                      this app. Opens with your live Pane 1 figures already filled in.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Directives */}
          <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
            <h2 className="shd-h2">3. Actionable Brokerage Desk Directives</h2>

            {/* Build 076 — Defensive-Draw Mode chooser + all-modes summary.
                Only affects the RECOMMENDED SOURCE for this quarter's
                withdrawal, not the Guyton-Klinger amount itself. */}
            <div
              style={{
                marginBottom: "1rem",
                padding: "0.7rem 0.85rem",
                background: "rgba(59,130,246,0.05)",
                border: "1px solid var(--border-color)",
                borderRadius: 8,
              }}
            >
              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Defensive Draw Mode{" "}
                <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                  — bucket recommendation for this quarter's withdrawal
                </span>
              </label>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.3rem" }}>
                {(
                  [
                    ["strict", "Strict", "Draw from cash only in real drawdowns below −5%"],
                    [
                      "standard",
                      "Standard",
                      "Draw from cash in flat or weak-positive real years (below ½ the expected hurdle)",
                    ],
                    [
                      "aggressive",
                      "Aggressive",
                      "Draw from cash unless real returns clearly clear the expected hurdle",
                    ],
                  ] as [ThresholdMode, string, string][]
                ).map(([id, lab, tip]) => (
                  <button
                    key={id}
                    type="button"
                    className={defensiveMode === id ? "" : "secondary"}
                    style={{ fontSize: "0.72rem", padding: "0.35rem 0.6rem" }}
                    onClick={() => {
                      setDefensiveMode(id);
                      // Re-enable auto-seed so the split fields re-populate
                      // from the newly-selected mode's recommendation.
                      setWdSplitTouched(false);
                    }}
                    title={tip}
                  >
                    {lab}
                  </button>
                ))}
              </div>

              <div style={{ fontSize: "0.78rem", marginTop: "0.55rem", lineHeight: 1.5 }}>
                {defensiveRec.isDefault ? (
                  defensiveRec.reason === "insufficient_elapsed" ? (
                    <span style={{ color: "var(--text-muted)" }}>
                      <strong style={{ color: "var(--text-main)" }}>All three modes:</strong> Draw from Equities —{" "}
                      <strong style={{ color: "var(--accent-amber)" }}>insufficient elapsed time to annualise</strong>{" "}
                      (only {Math.round(defensiveRec.elapsedDays ?? 0)} day
                      {Math.round(defensiveRec.elapsedDays ?? 0) === 1 ? "" : "s"} since the previous Normal row; at
                      least 14 days are needed before a return can be annualised meaningfully).
                    </span>
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>
                      <strong style={{ color: "var(--text-main)" }}>All three modes:</strong> Draw from Equities — no
                      prior quarter to compare against
                      {defensiveRec.reason === "prior_no_date"
                        ? " (set a Period End Date on this row to enable the comparison)."
                        : defensiveRec.reason === "non_positive_elapsed"
                          ? " (this row's date is on or before the previous Normal row)."
                          : defensiveRec.reason === "zero_prior_eq"
                            ? " (previous row's equities balance was zero)."
                            : "."}
                    </span>
                  )
                ) : (
                  <>
                    {(["strict", "standard", "aggressive"] as ThresholdMode[]).map((m, i) => {
                      const r = defensiveRec[m];
                      const selected = defensiveMode === m;
                      const label = m === "strict" ? "Strict" : m === "standard" ? "Standard" : "Aggressive";
                      const rec = r.bucket === "cash" ? "Draw from Cash" : "Draw from Equities";
                      const color = r.bucket === "cash" ? "var(--accent-amber)" : "var(--accent-green)";
                      // Build 087 — when a locking narrative overrides this
                      // mode's default bucket, strike the mode-line rec and
                      // flag it inline so a top-to-bottom reader can't miss
                      // that the actual instruction below differs.
                      const overridden = narrativeLockedBucket !== null && narrativeLockedBucket !== r.bucket;
                      return (
                        <span key={m}>
                          {i > 0 && <span style={{ color: "var(--text-muted)" }}> · </span>}
                          <span
                            style={{
                              fontWeight: selected ? 800 : 500,
                              textDecoration: selected ? "underline" : "none",
                            }}
                          >
                            {label}:{" "}
                            <span
                              style={{
                                color,
                                textDecoration: overridden ? "line-through" : undefined,
                                opacity: overridden ? 0.6 : 1,
                              }}
                            >
                              {rec}
                            </span>
                            {overridden && (
                              <span
                                style={{
                                  color: "var(--accent-amber)",
                                  fontWeight: 700,
                                  marginLeft: "0.35rem",
                                }}
                              >
                                (overridden — see narrative)
                              </span>
                            )}
                          </span>
                        </span>
                      );
                    })}
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-muted)",
                        marginTop: "0.35rem",
                      }}
                    >
                      Nominal equity return{" "}
                      <strong style={{ color: "var(--text-main)" }}>
                        {((defensiveRec.periodReturnNominal ?? 0) * 100).toFixed(2)}%
                      </strong>{" "}
                      this period · Annualised real{" "}
                      <strong style={{ color: "var(--text-main)" }}>
                        {((defensiveRec.annualisedReal ?? 0) * 100).toFixed(2)}%
                      </strong>{" "}
                      over{" "}
                      <strong style={{ color: "var(--text-main)" }}>
                        {Math.round(defensiveRec.elapsedDays ?? 0)} days
                      </strong>{" "}
                      since {defensiveRec.priorRow?.label || "prior row"} (inflation{" "}
                      {((defensiveRec.inflationUsed ?? 0) * 100).toFixed(1)}% from Pane 1's independent CPI assumption).
                      {defensiveRec.longGap && (
                        <span style={{ color: "var(--accent-amber)", fontWeight: 700 }}>
                          {" "}
                          ⚠ Gap &gt; 2 years — annualisation spans an unusually long period.
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Build 079 — Restored: always render the rich narrative banner
                (directive.html) so all 8 documented states surface here —
                Peak Refill, Recovery Wave, Reverse-Shielding, Comfortable
                Amortization, Normal Draw, G-K Preservation/Prosperity, No-Go
                Amortization, Shield Deficit/Exhaustion. This keeps Pane 3's
                banner in lock-step with Pane 2's "Guardrail State" readout
                (both derive from directive.guardrailText). The Defensive-Draw
                Mode selector still composes on top via the advisory below and
                the split-field auto-seed at commit time — it no longer
                replaces the narrative with a two-state banner. */}
            <div dangerouslySetInnerHTML={{ __html: directive.html }} />
            {!defensiveRec.isDefault &&
              (() => {
                const rec = defensiveRec[defensiveMode];
                const modeLabel =
                  defensiveMode === "strict" ? "Strict" : defensiveMode === "standard" ? "Standard" : "Aggressive";
                const bucket = rec.bucket === "cash" ? "Cash Pot" : "Global Equities";
                const color = rec.bucket === "cash" ? "var(--accent-amber)" : "var(--accent-green)";
                // Build 082 — locking-state list is derived from the same
                // NON_LOCKING_STATES table used to decide whether to override
                // the bucket. Only the states actually present in the engine
                // ever appear here.
                const currentIsLocking = isLockingState(directive.guardrailText);
                const lockingList = LOCKING_STATES.join(", ");
                // Build 088 — the Guyton-Klinger ±10% adjustment is an overlay
                // on top of the base state, not a state of its own. Name both
                // so the footnote and the banner describe the same thing.
                const gkOverlay =
                  calc.guardrailFactor < 1
                    ? "G-K Preservation overlay (−10%)"
                    : calc.guardrailFactor > 1
                      ? "G-K Prosperity overlay (+10%)"
                      : "";
                return (
                  <div
                    style={{
                      marginTop: "0.75rem",
                      padding: "0.6rem 0.85rem",
                      background: "rgba(59,130,246,0.05)",
                      border: "1px solid var(--border-color)",
                      borderLeft: `3px solid ${color}`,
                      borderRadius: 6,
                      fontSize: "0.78rem",
                      lineHeight: 1.5,
                    }}
                  >
                    <strong style={{ color: "var(--text-main)" }}>Selected Defensive-Draw Mode ({modeLabel}):</strong>{" "}
                    Recommends funding this period's withdrawal from <strong style={{ color }}>{bucket}</strong>.{" "}
                    <span style={{ color: "var(--text-muted)" }}>
                      Where the narrative above locks the source ({lockingList}) the narrative wins; otherwise use this
                      mode's bucket. The Commit form's split fields auto-seed from this recommendation.{" "}
                      <em>
                        Current state: <strong>{directive.guardrailText}</strong>
                        {gkOverlay ? (
                          <>
                            {" "}
                            + <strong>{gkOverlay}</strong>
                          </>
                        ) : null}{" "}
                        — {currentIsLocking ? "locked by narrative." : "mode recommendation applies."}
                      </em>
                    </span>
                  </div>
                );
              })()}
          </div>

          {/* Chart */}
          <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
                flexWrap: "wrap",
                gap: "0.75rem",
              }}
            >
              <h2 className="shd-h2" style={{ margin: 0 }}>
                4. Historical Trend Visualizer Matrix
              </h2>
              <div className="chart-legend">
                <div className="legend-item">
                  <div className="legend-line" style={{ backgroundColor: "var(--text-main)" }} />
                  Total Capital
                </div>
                <div className="legend-item">
                  <div className="legend-line" style={{ borderTop: "3px dashed var(--accent-amber)", height: 0 }} />
                  ATH Baseline
                </div>
                <div className="legend-item">
                  <div className="legend-line" style={{ backgroundColor: "var(--accent-green)" }} />
                  Equities
                </div>
                <div className="legend-item">
                  <div className="legend-line" style={{ backgroundColor: "var(--accent-blue)" }} />
                  Money Market
                </div>
              </div>
            </div>
            <div
              style={{
                fontSize: "0.7rem",
                color: "var(--text-muted)",
                marginBottom: 6,
                fontStyle: "italic",
              }}
            >
              Tip: hover (or touch) anywhere over the chart to reveal a crosshair and a tooltip with values for that
              year.
            </div>
            <div style={{ width: "100%", height: 320 }}>
              {ledger.length >= 2 ? (
                <TrendChart ledger={ledger} currency={currency} />
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    color: "var(--text-muted)",
                  }}
                >
                  Add 2 or more entries to render the trend chart.
                </div>
              )}
            </div>
          </div>

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

          {/* Ledger */}
          <div className="shd-card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <h2 className="shd-h2" style={{ margin: 0 }}>
                7. Historical Timeline Ledger
              </h2>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={{
                    fontSize: "0.8rem",
                    padding: "0.5rem 0.9rem",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                  onClick={exportLedgerCsv}
                  title="Download the full ledger as CSV (all rows, sorted chronologically)"
                >
                  <span aria-hidden="true" style={{ fontSize: "0.9rem", lineHeight: 1 }}>
                    ⬇
                  </span>
                  Download Ledger (CSV)
                </button>
                <button
                  className="secondary"
                  style={{
                    color: "var(--accent-red)",
                    fontSize: "0.8rem",
                    borderColor: "rgba(239,68,68,0.4)",
                  }}
                  onClick={clearLedger}
                >
                  Wipe Records
                </button>
              </div>
            </div>
            {dateHealth.missing > 0 && (
              <div
                style={{
                  fontSize: "0.78rem",
                  padding: "0.5rem 0.75rem",
                  marginBottom: "0.75rem",
                  borderRadius: "0.4rem",
                  border: "1px solid rgba(245,158,11,0.35)",
                  background: "rgba(245,158,11,0.08)",
                  color: "var(--text-main)",
                }}
                title={"Rows currently missing a Period End Date:\n" + dateHealth.missingLabels.join("\n")}
              >
                <strong>Period End Date:</strong>{" "}
                <span style={{ color: "var(--accent-amber)", fontWeight: 700 }}>
                  {dateHealth.missing} of {dateHealth.total} ledger row
                  {dateHealth.total === 1 ? "" : "s"} currently lack a Period End Date
                </span>{" "}
                (marked ⚠ in the Timeline column — click Edit to set the real date).
              </div>
            )}
            <div className="table-container">
              <table className="ledger-table-stacked">
                <thead>
                  <tr>
                    <th>Timeline</th>
                    <th className="text-right">Asset Pools</th>
                    <th className="text-right">Portfolio Total</th>
                    <th className="text-center">Drawdown from ATH</th>
                    <th className="text-right">Withdrawal Recorded</th>
                    <th>Status &amp; Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Build 073 — display order is chronological by real date
                      (newest first). Blank-date rows sink to the end but keep
                      insertion order. edit/delete still target the original
                      ledger index, not the sorted position. */}
                  {ledger
                    .map((d, i) => ({ d, i }))
                    .sort((a, b) => {
                      const da = (a.d.isSpecialEvent ? a.d.eventDate : a.d.periodEndDate) || "";
                      const db = (b.d.isSpecialEvent ? b.d.eventDate : b.d.periodEndDate) || "";
                      if (!da && !db) return a.i - b.i;
                      if (!da) return 1;
                      if (!db) return -1;
                      if (da > db) return -1;
                      if (da < db) return 1;
                      return a.i - b.i;
                    })
                    .map(({ d, i }) => {
                      const wPct =
                        Number(d.totalCapital) > 0 ? (Number(d.targetYearly || 0) / Number(d.totalCapital)) * 100 : 0;
                      return (
                        <tr
                          key={`${d.label}-${i}`}
                          className="ledger-row-stacked"
                          style={d.isSpecialEvent ? { background: "rgba(168,85,247,0.06)" } : undefined}
                        >
                          {/* Timeline */}
                          <td>
                            <div className="cell-primary">
                              {d.isSpecialEvent && (
                                <span
                                  style={{
                                    display: "inline-block",
                                    fontSize: "0.6rem",
                                    fontWeight: 800,
                                    color: "var(--accent-purple)",
                                    border: "1px solid var(--accent-purple)",
                                    padding: "1px 5px",
                                    borderRadius: 3,
                                    marginRight: 6,
                                    verticalAlign: "middle",
                                  }}
                                  title={
                                    d.isInflowEvent
                                      ? "Extraordinary inflow — one-off addition and ATH re-anchor"
                                      : "One-off special-event withdrawal recorded from Pane 5"
                                  }
                                >
                                  {d.isInflowEvent ? "★ Event: Inflow" : "★ Event: Outflow"}
                                </span>
                              )}
                              {d.isSpecialEvent
                                ? String(d.label || "")
                                    .replace(/^EVENT:\s*Windfall Inflow\s*[—-]\s*/i, "")
                                    .replace(/^EVENT:\s*/i, "")
                                    .replace(/^SPECIAL:\s*/i, "")
                                : d.label}
                            </div>
                            {!d.isSpecialEvent && (
                              <div className="cell-muted" style={{ whiteSpace: "nowrap" }}>
                                Age {d.age}
                                {typeof d.cappingAge === "number" && d.cappingAge > 0 && (
                                  <span title="Horizon / Capping Age in effect when this row was committed">
                                    {" · Horizon Age "}
                                    {d.cappingAge}
                                  </span>
                                )}
                              </div>
                            )}
                            <div
                              className="cell-muted"
                              style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}
                            >
                              <span className={`phase-badge ${phaseBadgeClass(d.phase || "")}`}>{d.phase}</span>
                              {!d.isSpecialEvent && d.guardrailStatus && (
                                <span
                                  style={{
                                    fontSize: "0.65rem",
                                    padding: "1px 5px",
                                    borderRadius: 3,
                                    border: "1px solid var(--border-color)",
                                    color: "var(--text-muted)",
                                  }}
                                  title="Withdrawal Status (Pane 2) in effect at commit time"
                                >
                                  {d.guardrailStatus}
                                </span>
                              )}
                            </div>
                            <div className="cell-muted" style={{ whiteSpace: "nowrap" }}>
                              {d.isSpecialEvent ? (
                                d.eventDate ? (
                                  <>Date committed: {d.eventDate}</>
                                ) : null
                              ) : d.periodEndDate ? (
                                <>Date committed: {d.periodEndDate}</>
                              ) : (
                                <span
                                  style={{ color: "var(--accent-amber)", fontWeight: 600 }}
                                  title="Period End Date not set — this legacy row could not be auto-migrated from its label. Click Edit to set a real date."
                                >
                                  ⚠ date not set
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Asset Pools */}
                          <td className="text-right">
                            <div className="cell-primary">
                              <span className="cell-label">Equities</span> {formatGBP(d.equities)}
                            </div>
                            <div className="cell-primary">
                              <span className="cell-label">Cash</span> {formatGBP(d.mmFund)}
                            </div>
                          </td>
                          {/* Portfolio Total */}
                          <td className="text-right">
                            <div className="cell-primary" style={{ fontWeight: 700 }}>
                              {formatGBP(d.totalCapital)}
                            </div>
                            <div className="cell-muted">ATH {formatGBP(d.ath)}</div>
                          </td>
                          {/* Drawdown from ATH */}
                          <td className="text-center">
                            <div
                              className="cell-primary"
                              style={{
                                color: drawdownColor(Number(d.drawdownPct) || 0),
                                fontWeight: 700,
                                fontSize: "1rem",
                              }}
                              title="Peak-to-trough decline from all-time high. 0% = at ATH."
                            >
                              {(Number(d.drawdownPct) || 0).toFixed(2)}%
                            </div>
                          </td>
                          {/* Drawdown Income (or Special-Event withdrawal) */}
                          <td className="text-right">
                            {d.isSpecialEvent ? (
                              <>
                                <div
                                  className="cell-primary"
                                  style={{ color: "var(--accent-purple)", fontWeight: 700 }}
                                  title={
                                    d.isInflowEvent
                                      ? "Extraordinary inflow — funds added, ATH re-anchored"
                                      : "Special-event withdrawal — one-off deduction from the pot"
                                  }
                                >
                                  {d.isInflowEvent ? "+" : "−"}
                                  {formatGBP(Number(d.eventAmount) || 0)}
                                </div>
                                <div className="cell-muted">
                                  {(() => {
                                    const eq = Number(d.eventFromEq) || 0;
                                    const ca = Number(d.eventFromCash) || 0;
                                    const sign = d.isInflowEvent ? "+" : "";
                                    const parts: string[] = [];
                                    if (eq > 0) parts.push(`Eq ${sign}${formatGBP(eq)}`);
                                    if (ca > 0) parts.push(`Cash ${sign}${formatGBP(ca)}`);
                                    return parts.join(" · ") || (d.isInflowEvent ? "Windfall inflow" : "Special event");
                                  })()}
                                  {d.isInflowEvent ? ` · ATH → ${formatGBP(Number(d.ath) || 0)}` : ""}
                                  {d.eventNote ? ` — ${d.eventNote}` : ""}
                                </div>
                              </>
                            ) : (
                              (() => {
                                const hasAmt = typeof d.withdrawnAmount === "number" && d.withdrawnAmount > 0;
                                const hasSplit =
                                  typeof d.withdrawnFromEquities === "number" ||
                                  typeof d.withdrawnFromCash === "number";
                                const eq = d.withdrawnFromEquities ?? 0;
                                const ca = d.withdrawnFromCash ?? 0;
                                const rebDir = d.rebalanceDirection ?? "none";
                                const rebAmt = d.rebalanceAmount ?? 0;
                                return (
                                  <>
                                    <div className="cell-primary">
                                      {hasAmt ? formatGBP(d.withdrawnAmount!) : formatGBP(Number(d.targetYearly) || 0)}
                                    </div>
                                    {hasAmt && hasSplit ? (
                                      <div className="cell-muted">
                                        Eq {formatGBP(eq)} / Cash {formatGBP(ca)}
                                      </div>
                                    ) : null}
                                    <div className="cell-muted">
                                      {hasAmt && !hasSplit
                                        ? `Withdrawn this quarter · source not recorded · WR ${wPct.toFixed(2)}%`
                                        : hasAmt
                                          ? `Withdrawn this quarter · WR ${wPct.toFixed(2)}%`
                                          : `WR ${wPct.toFixed(2)}%`}
                                    </div>
                                    {rebDir !== "none" && rebAmt > 0 ? (
                                      <div className="cell-muted" style={{ fontStyle: "italic" }}>
                                        Rebalance: {formatGBP(rebAmt)}{" "}
                                        {rebDir === "eq_to_cash" ? "Eq → Cash" : "Cash → Eq"}
                                      </div>
                                    ) : null}
                                  </>
                                );
                              })()
                            )}
                          </td>
                          {/* Status & Controls */}
                          <td>
                            <div className="cell-primary" style={{ fontSize: "0.8rem" }}>
                              {d.rule}
                            </div>
                            <div className="cell-muted" style={{ display: "flex", gap: 4, marginTop: 4 }}>
                              {/* Build 106 — event rows (Special Event withdrawal /
                                Windfall inflow) are Delete-only: Pane 1's generic
                                Normal-entry editor is the wrong shape for them and
                                corrupts the row on save. Re-commit to correct. */}
                              {!d.isSpecialEvent &&
                              !d.isInflowEvent &&
                              d.entryKind !== "special_withdrawal" &&
                              d.entryKind !== "windfall" ? (
                                <button className="edit-action" onClick={() => editEntry(i)}>
                                  Edit
                                </button>
                              ) : (
                                <button
                                  className="edit-action"
                                  aria-hidden="true"
                                  tabIndex={-1}
                                  style={{ visibility: "hidden" }}
                                >
                                  Edit
                                </button>
                              )}

                              <button className="danger-action" onClick={() => deleteEntry(i)}>
                                Del
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
