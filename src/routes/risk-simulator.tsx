import { createFileRoute } from "@tanstack/react-router";
import { MonteCarloPanel } from "@/components/sovereign/MonteCarloPanel";
import { setCurrencySymbol } from "@/lib/sovereign/engine";
import "@/components/sovereign/desk.css";

export const Route = createFileRoute("/risk-simulator")({
  head: () => ({
    meta: [
      { title: "Risk Simulator — Sovereign Glidepath" },
      {
        name: "description",
        content:
          "Monte Carlo fan chart for the Sovereign Glidepath: stress-test a withdrawal plan across 10,000 possible market paths.",
      },
      { property: "og:title", content: "Risk Simulator — Sovereign Glidepath" },
      {
        property: "og:description",
        content: "Monte Carlo fan chart: stress-test a retirement withdrawal plan across 10,000 possible market paths.",
      },
    ],
  }),
  component: RiskSimulatorPage,
  ssr: false,
});

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

export function RiskSimulatorPage() {
  // Build 120 — the simulator is a standalone sandbox page. It opens with a
  // fresh snapshot of the live plan, handed over on the query string using the
  // same param scheme as the Comparison Builder launcher, plus growth/cashReal.
  const sp = getQueryParams();

  const equities = Math.max(0, numParam(sp, "eq", 0));
  const cash = Math.max(0, numParam(sp, "cash", 0));
  const age = Math.max(0, Math.floor(numParam(sp, "age", 0)));
  const horizon = Math.max(1, Math.floor(numParam(sp, "horizon", 30)));
  const withdrawal = Math.max(0, numParam(sp, "withdrawal", 0));
  const growth = numParam(sp, "growth", 4);
  const cashReal = numParam(sp, "cashReal", 1);
  const pensionAmount = Math.max(0, numParam(sp, "pensionAmount", 0));
  const pensionAge = Math.max(0, Math.floor(numParam(sp, "pensionAge", 67)));
  const currency = currencyParam(sp, "currency", "£");

  // Keep the engine's currency symbol in sync, same as SovereignGlidepath.tsx.
  // formatGBP() (used throughout MonteCarloPanel for the actual field values,
  // "Reset to actual" text, etc.) reads this module-level symbol rather than
  // a prop -- without this call it silently stays on the £ default even
  // though the labels (which read the `currency` prop directly) show the
  // right symbol. Done synchronously during render, not in useEffect, so it
  // takes effect before MonteCarloPanel's own render reads it.
  setCurrencySymbol(currency);

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
          ← Back to Sovereign Glidepath
        </a>
        <h1 style={{ fontSize: "1.5rem", margin: "0.5rem 0 0.25rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
          Risk Simulator — Monte Carlo Fan Chart
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>
          Runs 10,000 possible retirement paths against your live plan to show the shape of sequence-of-returns
          risk — not a single-line forecast, but the full spread of outcomes.
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
        currency={currency}
      />
    </div>
  );
}
