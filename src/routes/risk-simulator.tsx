import { createFileRoute } from "@tanstack/react-router";
import { RiskSimulatorPage } from "@/components/sovereign/RiskSimulatorPage";

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
