import { useEffect } from "react";
import { MonteCarloPanel } from "@/components/sovereign/MonteCarloPanel";
import { setCurrencySymbol } from "@/lib/sovereign/engine";
import "@/components/sovereign/desk.css";

function numParam(sp: URLSearchParams, key: string, fallback: number): number {
  const raw = sp.get(key);
  if (raw === null) return fallback;
  const n = Number(raw.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

const CURRENCY_SYMBOLS = ["£", "€", "$"] as const;
type CurrencySymbol = (typeof CURRENCY_SYMBOLS)[number];

function currencyParam(sp: URLSearchParams, key: string, fallback: CurrencySymbol): CurrencySymbol {
  const raw = sp.get(key);
  if (raw && (CURRENCY_SYMBOLS as readonly string[]).includes(raw)) return raw as CurrencySymbol;
  return fallback;
}

function getQueryParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  // Desktop app is hash-routed (file:// + no server) -- query params travel
  // inside the hash, e.g. "#/risk-simulator?eq=...". Web app is real-path
  // routed -- params are in window.location.search as normal.
  const hash = window.location.hash;
  const qIndex = hash.indexOf("?");
  if (qIndex !== -1) return new URLSearchParams(hash.slice(qIndex + 1));
  return new URLSearchParams(window.location.search);
}

// Build 123 — moved out of src/routes/risk-simulator.tsx into its own file,
// mirroring HelpContent.tsx / ChangelogContent.tsx's pattern exactly. The
// route file previously exported this component directly (as well as
// registering the route), which TanStack Router's Vite plugin warned
// prevents proper code-splitting -- and in a real production build (verified
// against the same nitro/Cloudflare target this project uses) this route
// silently got NO server or client chunk generated at all, causing a hard
// 404 on Lovable Publish (and very likely Cloudflare too) despite working
// fine in the dev server. desktop/main.tsx's hash-router also imports this
// component directly for the Electron build -- update that import to this
// file's path, not the route file, when touching this again.
export function RiskSimulatorPage() {
  // Build 120 — the simulator is a standalone sandbox page. It opens with a
  // fresh snapshot of the live plan, handed over on the query string using the
  // same param scheme as the Comparison Builder launcher, plus growth/cashReal.
  const sp = getQueryParams();

  // Build 139 — cold-start defaults. Previously every param defaulted to 0
  // (or a token fallback like horizon=30), so a user who opened this page
  // directly — no ledger entry recorded, and not handed a real snapshot via
  // "from=accumulation-simulator" — saw "Add a ledger entry with capital to
  // run the simulation" and a dead page. Some people only ever want the
  // Accumulation or Risk Simulator sandboxes and never touch the ledger at
  // all, so the simulator should be usable standing entirely on its own.
  // These defaults are a representative worked example (age 60, £400k/£100k
  // equities/cash, £35,000/yr withdrawal, £12,500 state pension from 68,
  // horizon 90) — NOT a recommendation, just something sensible to land on
  // and edit from.
  // Only used when a param is genuinely ABSENT from the query string
  // (numParam only falls back on sp.get()===null) — a real handoff that
  // explicitly passes eq=0&cash=0 (a genuine zero-capital plan) is left
  // exactly as sent, never silently overridden.
  const equities = Math.max(0, numParam(sp, "eq", 400000));
  const cash = Math.max(0, numParam(sp, "cash", 100000));
  const age = Math.max(0, Math.floor(numParam(sp, "age", 60)));
  const horizon = Math.max(1, Math.floor(numParam(sp, "horizon", 30)));
  const withdrawal = Math.max(0, numParam(sp, "withdrawal", 35000));
  const growth = numParam(sp, "growth", 5);
  const cashReal = numParam(sp, "cashReal", 1);
  const pensionAmount = Math.max(0, numParam(sp, "pensionAmount", 12500));
  const pensionAge = Math.max(0, Math.floor(numParam(sp, "pensionAge", 68)));
  const currency = currencyParam(sp, "currency", "£");
  // Build 123 — Horizon Age, seed only, same rules as age. Falls back to
  // age + horizon (reconstructing an age from the old fixed year-count) for
  // links generated before this param existed.
  const horizonAge = Math.max(1, Math.floor(numParam(sp, "horizonAge", age + horizon)));
  // Build 124 — where this tab was opened from, purely for the "Back to..."
  // label below. window.close() already correctly returns to whichever tab
  // spawned this one regardless -- this only fixes what the link SAYS, not
  // what it does. Any value other than "accumulation-simulator" falls back
  // to the original Sovereign Glidepath label, so old links without this
  // param (or a typo'd value) degrade to the previous, always-correct-for-SG
  // behaviour rather than showing something wrong.
  const from = sp.get("from") === "accumulation-simulator" ? "accumulation-simulator" : "sg";
  const backLabel =
    from === "accumulation-simulator" ? "← Back to Accumulation Simulator" : "← Back to Sovereign Glidepath";

  // Keep the engine's currency symbol in sync, same as SovereignGlidepath.tsx.
  // formatGBP() (used throughout MonteCarloPanel for the actual field values,
  // "Reset to actual" text, etc.) reads this module-level symbol rather than
  // a prop -- without this call it silently stays on the £ default even
  // though the labels (which read the `currency` prop directly) show the
  // right symbol. Done synchronously during render, not in useEffect, so it
  // takes effect before MonteCarloPanel's own render reads it.
  setCurrencySymbol(currency);

  // Build 123 — strip the query string from the visible URL and browser
  // history once it's been read, so the plan figures handed over at launch
  // (pot values, withdrawal, pension amount, etc.) don't sit in plaintext
  // browser history or get accidentally shared/bookmarked. Runs in an effect
  // (after commit), not during render, since this is a genuine browser side
  // effect rather than idempotent module-state sync. Desktop's hash-based
  // routing keeps its params inside the hash fragment, not the real query
  // string, so window.location.search is already empty there -- this check
  // naturally excludes desktop without needing a separate protocol check.
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  return (
    <div className="shd-root" style={{ padding: "1.5rem", maxWidth: 1400, margin: "0 auto" }}>
      <div
        style={{
          borderBottom: "1px solid var(--border-color)",
          paddingBottom: "1.25rem",
          marginBottom: "1.75rem",
        }}
      >
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.close();
          }}
          style={{ color: "var(--text-muted)", fontSize: "0.85rem", textDecoration: "none" }}
        >
          {backLabel}
        </a>
        <h1 style={{ fontSize: "1.5rem", margin: "0.5rem 0 0.25rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
          Risk Simulator — Monte Carlo Fan Chart
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>
          Runs 10,000 possible retirement paths against your live plan to show the shape of sequence-of-returns risk —
          not a single-line forecast, but the full spread of outcomes.
        </p>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "1rem" }}>
          <button
            type="button"
            onClick={() => {
              const isFile = typeof window !== "undefined" && window.location.protocol === "file:";
              window.open(
                isFile ? "./sovereign-glidepath-simulator-guide.html" : "/sovereign-glidepath-simulator-guide.html",
                "_blank",
                "noopener",
              );
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}
          >
            📖 User Guide
          </button>
        </div>
      </div>
      <MonteCarloPanel
        equitiesCapital={equities}
        cashCapital={cash}
        years={horizon}
        deterministicRatePct={growth}
        cashRealPct={cashReal}
        pensionAmount={pensionAmount}
        pensionStartAge={pensionAge}
        annualWithdrawal={withdrawal}
        currentAge={age}
        horizonAge={horizonAge}
        currency={currency}
      />
    </div>
  );
}
