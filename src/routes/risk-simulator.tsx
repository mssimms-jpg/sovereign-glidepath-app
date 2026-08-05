import { createFileRoute } from "@tanstack/react-router";
import { MonteCarloPanel } from "@/components/sovereign/MonteCarloPanel";
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

function RiskSimulatorPage() {
  // Build 120 — the simulator is a standalone sandbox page. It opens with a
  // fresh snapshot of the live plan, handed over on the query string using the
  // same param scheme as the Comparison Builder launcher, plus growth/cashReal.
  const sp = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);

  const equities = Math.max(0, numParam(sp, "eq", 0));
  const cash = Math.max(0, numParam(sp, "cash", 0));
  const age = Math.max(0, Math.floor(numParam(sp, "age", 0)));
  const horizon = Math.max(1, Math.floor(numParam(sp, "horizon", 30)));
  const withdrawal = Math.max(0, numParam(sp, "withdrawal", 0));
  const growth = numParam(sp, "growth", 4);
  const cashReal = numParam(sp, "cashReal", 1);
  const pensionAmount = Math.max(0, numParam(sp, "pensionAmount", 0));
  const pensionAge = Math.max(0, Math.floor(numParam(sp, "pensionAge", 67)));

  return (
    <div className="shd-root" style={{ padding: "1.5rem", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ marginBottom: "1rem" }}>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.close();
          }}
          style={{ fontSize: "0.85rem" }}
        >
          ← Back to Sovereign Glidepath
        </a>
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
        currency="£"
      />
    </div>
  );
}
