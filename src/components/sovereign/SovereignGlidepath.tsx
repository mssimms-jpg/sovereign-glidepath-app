import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  calculate,
  cleanNum,
  formatGBP,
  generateDirectives,
  phaseFor,
  setCurrencySymbol,
  xorDecode,
  xorEncode,
  type LedgerEntry,
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
import sgLogoUrl from "@/assets/sg-logo.svg?url";
import "./desk.css";
import { MonteCarloPanel } from "./MonteCarloPanel";
import { AffordCalculator } from "./AffordCalculator";

const LEDGER_KEY = "shd_ledger_v4";
const DISCLAIMER_KEY = "shd_v7_disclaimer";
const SETTINGS_KEY = "shd_settings_v1";
const APP_VERSION = "1.0";
const APP_BUILD = "048";

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
};

function loadSettings(): PersistedSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSettings(s: PersistedSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* storage disabled */
  }
}

function loadLedger(): LedgerEntry[] {
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLedger(entries: LedgerEntry[]) {
  try {
    localStorage.setItem(LEDGER_KEY, JSON.stringify(entries));
  } catch {
    /* storage disabled */
  }
}

function autoQuarterLabel(): string {
  const n = new Date();
  return `Q${Math.floor(n.getMonth() / 3) + 1} ${n.getFullYear()}`;
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
}

function MoneyInput({
  value,
  onChange,
  placeholder,
  id,
  currency = "£",
}: MoneyInputProps & { currency?: CurrencySymbol }) {
  const [focused, setFocused] = useState(false);
  const display = focused ? value : value ? formatGBP(cleanNum(value)) : "";
  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      placeholder={placeholder ?? `${currency}0.00`}
      value={display}
      onFocus={(e) => {
        const n = cleanNum(e.currentTarget.value);
        onChange(n !== 0 ? n.toFixed(2) : "");
        setFocused(true);
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => onChange(e.target.value)}
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
    val >= 1_000_000
      ? `${currency}${(val / 1_000_000).toFixed(2)}M`
      : `${currency}${(val / 1000).toFixed(1)}k`;

  const gridLines: React.ReactElement[] = [];
  for (let i = 0; i <= 5; i++) {
    const val = (maxV / 5) * i;
    const y = getY(val);
    const lab =
      val >= 1_000_000
        ? `${currency}${(val / 1_000_000).toFixed(1)}M`
        : `${currency}${(val / 1000).toFixed(0)}k`;
    gridLines.push(
      <g key={`g${i}`}>
        <line
          x1={pL}
          y1={y}
          x2={w - pR}
          y2={y}
          stroke="var(--border-color)"
          strokeWidth={1}
          opacity={0.3}
        />
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
        <line
          x1={x}
          y1={axisY}
          x2={x}
          y2={axisY + 5}
          stroke="var(--text-muted)"
          strokeWidth={1}
          opacity={0.6}
        />
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

  const pts = (sel: (d: LedgerEntry) => number) =>
    t.map((d, i) => `${getX(i)},${getY(sel(d))}`).join(" ");

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
        <line
          x1={pL}
          y1={axisY}
          x2={w - pR}
          y2={axisY}
          stroke="var(--border-color)"
          strokeWidth={1}
          opacity={0.6}
        />
        <polyline
          points={pts((d) => d.mmFund)}
          fill="none"
          stroke="var(--accent-blue)"
          strokeWidth={2.5}
        />
        <polyline
          points={pts((d) => d.equities)}
          fill="none"
          stroke="var(--accent-green)"
          strokeWidth={2.5}
        />
        <polyline
          points={pts((d) => d.ath)}
          fill="none"
          stroke="var(--accent-amber)"
          strokeWidth={1.5}
          strokeDasharray="5,5"
          opacity={0.8}
        />
        <polyline
          points={pts((d) => d.totalCapital)}
          fill="none"
          stroke="var(--text-main)"
          strokeWidth={3.5}
        />
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
                <span style={{ fontVariantNumeric: "tabular-nums", color: s.color, fontWeight: 600 }}>
                  {fmt(val)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



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
  const [age, setAge] = useState(64);
  const [label, setLabel] = useState(autoQuarterLabel());
  const [equityVal, setEquityVal] = useState("");
  const [mmVal, setMmVal] = useState("");
  const [athVal, setAthVal] = useState("");
  const [targetYearly, setTargetYearly] = useState("");
  const [growthRate, setGrowthRate] = useState(2.5);
  const [desiredRunwayMonths, setDesiredRunwayMonths] = useState(36);
  const [stressPct, setStressPct] = useState(0);
  const [currency, setCurrency] = useState<CurrencySymbol>("£");
  const [editIndex, setEditIndex] = useState(-1);

  // --- Ledger ---
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [settingsReady, setSettingsReady] = useState(false);
  const bootstrapped = useRef(false);
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const s = loadSettings();
    const savedLedger = loadLedger();
    const latest = savedLedger[0];

    setLedger(savedLedger);
    setCappingAge(typeof s.cappingAge === "number" ? s.cappingAge : latest?.cappingAge || 95);
    setDesiredRunwayMonths(
      typeof s.desiredRunwayMonths === "number"
        ? s.desiredRunwayMonths
        : latest?.desiredMonths || 36,
    );
    setGrowthRate(
      typeof s.growthRate === "number"
        ? s.growthRate
        : typeof latest?.growthRate === "number" && !isNaN(latest.growthRate)
          ? latest.growthRate
          : 2.5,
    );
    if (s.currency === "£" || s.currency === "€" || s.currency === "$") {
      setCurrency(s.currency);
      setCurrencySymbol(s.currency);
    }

    if (latest) {
      setAge(latest.age || 64);
      setEquityVal(latest.equities ? String(latest.equities) : "");
      setMmVal(latest.mmFund ? String(latest.mmFund) : "");
      setAthVal(latest.ath ? String(latest.ath) : "");
      if (latest.targetYearly) setTargetYearly(String(latest.targetYearly));
    }

    setSettingsReady(true);
  }, []);

  // Persist standalone settings whenever they change (after hydration)
  useEffect(() => {
    if (!settingsReady) return;
    saveSettings({ cappingAge, growthRate, desiredRunwayMonths, currency });
  }, [cappingAge, growthRate, desiredRunwayMonths, currency, settingsReady]);

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
        stressPct,
        growthRatePct: growthRate,
        desiredRunwayMonths,
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
    stressPct,
    growthRate,
    desiredRunwayMonths,
    ledger,
  ]);

  const directive = useMemo(
    () =>
      generateDirectives(calc, {
        currentAge: age,
        cappingAge,
        rawEquities: cleanNum(equityVal),
        mmFund: cleanNum(mmVal),
        ath: cleanNum(athVal),
        targetYearly: cleanNum(targetYearly),
        stressPct,
        growthRatePct: growthRate,
        desiredRunwayMonths,
      }),
    [
      calc,
      age,
      cappingAge,
      equityVal,
      mmVal,
      athVal,
      targetYearly,
      stressPct,
      growthRate,
      desiredRunwayMonths,
    ],
  );

  // --- Toast ---
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((m: string) => {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  }, []);

  // --- Backup modal ---
  const [modal, setModal] = useState<null | {
    mode: "export" | "import";
    title: string;
    desc: string;
    onSubmit: (pw: string, confirm: string) => string | null;
  }>(null);
  const [modalPw, setModalPw] = useState("");
  const [modalConfirm, setModalConfirm] = useState("");
  const [modalError, setModalError] = useState("");

  const closeModal = () => {
    setModal(null);
    setModalPw("");
    setModalConfirm("");
    setModalError("");
  };

  const submitModal = () => {
    if (!modal) return;
    const err = modal.onSubmit(modalPw, modalConfirm);
    if (err) setModalError(err);
    else closeModal();
  };

  // --- Commit / entry-cap ---
  // Post-expiry cap: once the 30-day eval is over and not licensed, ledger
  // is capped at POST_TRIAL_ENTRY_LIMIT entries. During the trial, unlimited.
  const entryCapActive = !IS_STORE_BUILD && !license.licensed && trial.expired;
  const trialBlocked = entryCapActive && editIndex < 0 && ledger.length >= POST_TRIAL_ENTRY_LIMIT;

  const commit = () => {
    if (stressPct > 0) {
      alert("Reset Stress Test to 0 before committing.");
      return;
    }
    if (trialBlocked) {
      setShowLockout(true);
      return;
    }

    const trimmedLabel = (label || "Unlabeled").trim().slice(0, 40) || "Unlabeled";
    const eqR = cleanNum(equityVal);
    const mmR = cleanNum(mmVal);
    const tot = eqR + mmR;
    let a = cleanNum(athVal);
    if (tot > a) {
      a = tot;
      setAthVal(String(a));
    }
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
      phase: phaseFor(age),
    };
    const next =
      editIndex > -1 ? ledger.map((e, i) => (i === editIndex ? entry : e)) : [entry, ...ledger];
    setLedger(next);
    saveLedger(next);
    setEditIndex(-1);
    showToast("Entry Committed");
  };

  const editEntry = (i: number) => {
    const d = ledger[i];
    if (!d) return;
    setLabel(d.label || "");
    setCappingAge(d.cappingAge || 95);
    setAge(d.age || 64);
    setEquityVal(String(d.equities ?? ""));
    setMmVal(String(d.mmFund ?? ""));
    setAthVal(String(d.ath ?? ""));
    setTargetYearly(String(d.targetYearly ?? ""));
    setDesiredRunwayMonths(d.desiredMonths || 36);
    if (typeof d.growthRate === "number" && !isNaN(d.growthRate)) setGrowthRate(d.growthRate);
    setEditIndex(i);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteEntry = (i: number) => {
    if (!confirm("Delete this entry?")) return;
    const next = ledger.filter((_, idx) => idx !== i);
    setLedger(next);
    saveLedger(next);
  };

  const clearLedger = () => {
    if (!confirm("Wipe all ledger records? This cannot be undone.")) return;
    setLedger([]);
    saveLedger([]);
  };

  // --- Backup / restore ---
  const exportData = () => {
    if (ledger.length === 0) {
      alert("Ledger is empty — nothing to export.");
      return;
    }
    setModal({
      mode: "export",
      title: "Export Backup",
      desc: "Set a password to obfuscate the backup file.",
      onSubmit: (pw, confirm) => {
        if (!pw) return "Password cannot be empty.";
        if (pw !== confirm) return "Passwords do not match.";
        const filename = `Backup_${new Date().toISOString().split("T")[0]}.shd`;
        const data = xorEncode(JSON.stringify(ledger, null, 2), pw);
        // Async save — try the modern picker first (remembers last folder),
        // fall back to a plain download.
        (async () => {
          try {
            const saved = await saveBackupViaPicker(data, filename);
            if (!saved) downloadBackupFallback(data, filename);
            showToast("Backup exported");
          } catch (ex) {
            const e = ex as { name?: string; message?: string };
            if (e?.name === "AbortError") return; // user cancelled
            alert("Export failed: " + (e?.message || String(ex)));
          }
        })();
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
      const trimmed = c.trim();
      const apply = (jsonStr: string): string | null => {
        try {
          const parsed = JSON.parse(jsonStr);
          if (!Array.isArray(parsed)) return "File does not contain a ledger array.";
          setLedger(parsed);
          saveLedger(parsed);
          showToast("Ledger restored");
          return null;
        } catch {
          return "File is not valid JSON.";
        }
      };
      if (trimmed[0] !== "[") {
        setModal({
          mode: "import",
          title: "Decrypt Backup",
          desc: "Enter the password used when exporting:",
          onSubmit: (pw) => {
            try {
              const decoded = xorDecode(c, pw);
              return apply(decoded);
            } catch {
              return "Could not decrypt or parse file. Check the password.";
            }
          },
        });
      } else {
        const err = apply(c);
        if (err) alert(err);
      }
    };
    r.onerror = () => alert("Could not read file.");
    r.readAsText(file);
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
                Sovereign Glidepath is provided as a recreational, educational and illustrative
                modeling tool only. It does not constitute financial, investment, tax or legal
                advice.
              </p>
              <p>
                All projections are hypothetical and bear no guaranteed relationship to future
                performance. You are solely responsible for any decisions you make and must consult
                a suitably qualified, regulated professional before acting on any output.
              </p>
              <p>
                The Software is provided "AS IS" without warranty of any kind. To the fullest extent
                permitted by law, the publisher accepts no liability for any loss of capital, income
                or pension funds arising from your use of, or inability to use, the Software.
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
                  I have read, understood and accept the Legal Notice, Disclaimer and Limitation of
                  Liability above, and I waive any claim against the publisher arising from my use
                  of this Software.
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
              Enter the registered name or email you supplied at purchase, then paste your license
              key. Activation is offline — the key is stored only in this browser.
            </p>
            <label style={{ display: "block", marginBottom: "0.75rem" }}>
              <div
                style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}
              >
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
              <div
                style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}
              >
                License Key
              </div>
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
              <button onClick={submitLicense}>
                {license.licensed ? "Re-activate" : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}

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
              Maximum entry limit reached for evaluation copy. Please activate your license to
              unlock unlimited historical planning.
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
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>
              {modal.desc}
            </p>
            <input
              type="password"
              value={modalPw}
              autoFocus
              onChange={(e) => setModalPw(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitModal();
                if (e.key === "Escape") closeModal();
              }}
            />
            {modal.mode === "export" && (
              <input
                type="password"
                placeholder="Confirm Password..."
                style={{ marginTop: "1rem" }}
                value={modalConfirm}
                onChange={(e) => setModalConfirm(e.target.value)}
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
              <button onClick={submitModal}>Proceed</button>
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
            <h1 style={{ fontSize: "2.4rem", margin: 0, letterSpacing: "-0.01em" }}>
              Sovereign Glidepath
            </h1>
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


          <div
            style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}
          >
            <button
              className="secondary"
              onClick={() => {
                const isFile =
                  typeof window !== "undefined" && window.location.protocol === "file:";
                window.open(isFile ? "#/help" : "/help", "_blank", "noopener");
              }}
            >
              ❓ Quick Start
            </button>
            <button
              className="secondary"
              onClick={() => {
                const isFile =
                  typeof window !== "undefined" && window.location.protocol === "file:";
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
            <button
              className="secondary"
              onClick={(e) => {
                if (e.shiftKey) {
                  const isFile =
                    typeof window !== "undefined" && window.location.protocol === "file:";
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
                    {Math.min(ledger.length, POST_TRIAL_ENTRY_LIMIT)}/{POST_TRIAL_ENTRY_LIMIT}{" "}
                    used). Enter your license key to unlock unlimited entries.
                  </span>
                  <button onClick={() => setShowLicense(true)}>Enter License Key</button>
                </div>
              );
            }
            if (bannerDismissed) return null;
            return (
              <div className="shd-trial-banner dismissible">
                <span>
                  Evaluation Copy: {trial.daysRemaining} day{trial.daysRemaining === 1 ? "" : "s"}{" "}
                  remaining in your {TRIAL_DAYS}-day trial. Enter your license key to remove entry
                  limits.
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
                    <span
                      style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-blue)" }}
                    >
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
                    onChange={(e) => setAge(parseInt(e.target.value) || 64)}
                  />
                </div>
              </div>

              <div className="shd-cluster">
                <label htmlFor="ledgerLabel">Reporting Period</label>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 15 }}>
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
                    onClick={() => setLabel(autoQuarterLabel())}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    Auto-Label
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.6fr", gap: "1rem" }}>
                  <div>
                    <label>Global Equities ({currency})</label>
                    <MoneyInput
                      id="equityVal"
                      value={equityVal}
                      onChange={setEquityVal}
                      currency={currency}
                    />
                  </div>
                  <div>
                    <label>Cash Pot ({currency})</label>
                    <MoneyInput id="mmVal" value={mmVal} onChange={setMmVal} currency={currency} />
                  </div>
                  <div>
                    <label htmlFor="currencySel">Currency</label>
                    <select
                      id="currencySel"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as CurrencySymbol)}
                      style={{
                        width: "100%",
                        background: "var(--bg-input, #0f172a)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-main)",
                        padding: "0.75rem",
                        borderRadius: "0.375rem",
                        fontSize: "1rem",
                      }}
                      aria-label="Display currency (cosmetic only — no FX conversion)"
                    >
                      <option value="£">£ GBP</option>
                      <option value="€">€ EUR</option>
                      <option value="$">$ USD</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="shd-cluster">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label>Assumed Growth Rate</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input
                        type="range"
                        min={0}
                        max={10}
                        step={0.1}
                        value={growthRate}
                        onChange={(e) => setGrowthRate(parseFloat(e.target.value) || 0)}
                      />
                      <strong style={{ color: "var(--accent-blue)", minWidth: 45 }}>
                        {growthRate.toFixed(1)}%
                      </strong>
                    </div>
                  </div>
                  <div>
                    <label>Desired Shield Runway (months)</label>
                    <IntInput
                      min={1}
                      max={120}
                      value={desiredRunwayMonths}
                      fallback={36}
                      onChange={setDesiredRunwayMonths}
                    />
                  </div>
                </div>
                <div
                  style={{
                    marginTop: "1rem",
                    borderTop: "1px solid var(--border-color)",
                    paddingTop: "1rem",
                  }}
                >
                  <label>Target Annual Base Withdrawal ({currency})</label>
                  <MoneyInput
                    id="targetYearly"
                    value={targetYearly}
                    onChange={setTargetYearly}
                    currency={currency}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: "0.5rem",
                    }}
                  >
                    <span className="shd-sub">Request: {formatGBP(calc.quarterlyRequest)}</span>
                    <span className="shd-sub">
                      Shield Target: {formatGBP(calc.targetCashAmount)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={commit}
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
            </div>

            {/* PANE 2 — Diagnostics */}
            <div className="shd-card">
              <h2 className="shd-h2">2. Intelligence Diagnostics</h2>
              <div>
                <label>Stored All-Time High Baseline ({currency})</label>
                <MoneyInput id="athVal" value={athVal} onChange={setAthVal} currency={currency} />
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
                      <strong style={{ color: "var(--text-main)" }}>
                        {calc.targetWR.toFixed(2)}%
                      </strong>
                    </span>
                    <span>
                      Realized Draw Rate:{" "}
                      <strong style={{ color: "var(--text-main)" }}>
                        {calc.currentWR.toFixed(2)}%
                      </strong>
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
                      <div
                        style={{ fontWeight: 800, fontSize: "0.9rem", color: calc.guardrailColor }}
                      >
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
                  <div
                    style={{ fontSize: "0.95rem", fontWeight: 700, color: calc.trajectoryColor }}
                  >
                    {calc.trajectoryLabel}
                  </div>
                </div>
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
                <label style={{ color: "var(--accent-red)", fontWeight: 800, fontSize: "0.8rem" }}>
                  🚨 Scenario Stress Test
                </label>
                <div
                  style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}
                >
                  Simulated Drop:{" "}
                  <strong style={{ color: "var(--accent-red)" }}>{stressPct}%</strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={5}
                  value={stressPct}
                  onChange={(e) => setStressPct(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Directives */}
          <div className="shd-card" style={{ marginBottom: "1.5rem" }}>
            <h2 className="shd-h2">3. Actionable Brokerage Desk Directives</h2>
            <div dangerouslySetInnerHTML={{ __html: directive.html }} />
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
                  <div
                    className="legend-line"
                    style={{ borderTop: "3px dashed var(--accent-amber)", height: 0 }}
                  />
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
              Tip: hover (or touch) anywhere over the chart to reveal a crosshair and a tooltip
              with values for that year.
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

          {/* Monte Carlo Risk Simulator */}
          <MonteCarloPanel
            startingCapital={Number(ledger[0]?.totalCapital) || 0}
            years={Math.max(1, cappingAge - age)}
            deterministicRatePct={growthRate}
            annualWithdrawal={cleanNum(targetYearly)}
            currentAge={age}
            currency={currency}
          />

          {/* Can I Afford This? — Instant Impact Calculator */}
          <AffordCalculator
            equityVal={equityVal}
            mmVal={mmVal}
            athVal={athVal}
            targetYearly={targetYearly}
            growthRate={growthRate}
            age={age}
            cappingAge={cappingAge}
            stressPct={stressPct}
            desiredRunwayMonths={desiredRunwayMonths}
            currency={currency}
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
            <div className="table-container">
              <table className="ledger-table-stacked">
                <thead>
                  <tr>
                    <th>Timeline</th>
                    <th className="text-right">Asset Pools</th>
                    <th className="text-right">Portfolio Total</th>
                    <th className="text-center">Drawdown from ATH</th>
                    <th className="text-right">Drawdown Income</th>
                    <th>Status &amp; Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((d, i) => {
                    const wPct =
                      Number(d.totalCapital) > 0
                        ? (Number(d.targetYearly || 0) / Number(d.totalCapital)) * 100
                        : 0;
                    return (
                      <tr key={`${d.label}-${i}`} className="ledger-row-stacked">
                        {/* Timeline */}
                        <td>
                          <div className="cell-primary">{d.label}</div>
                          <div className="cell-muted">
                            Age {d.age}{" "}
                            <span className={`phase-badge ${phaseBadgeClass(d.phase || "")}`}>
                              {d.phase}
                            </span>
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
                        {/* Drawdown Income */}
                        <td className="text-right">
                          <div className="cell-primary">
                            {formatGBP(Number(d.targetYearly) || 0)}
                          </div>
                          <div className="cell-muted">WR {wPct.toFixed(2)}%</div>
                        </td>
                        {/* Status & Controls */}
                        <td>
                          <div className="cell-primary" style={{ fontSize: "0.8rem" }}>
                            {d.rule}
                          </div>
                          <div
                            className="cell-muted"
                            style={{ display: "flex", gap: 4, marginTop: 4 }}
                          >
                            <button className="edit-action" onClick={() => editEntry(i)}>
                              Edit
                            </button>
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
