import { createFileRoute } from "@tanstack/react-router";
import { AccumulationSimulatorPage } from "@/components/sovereign/AccumulationSimulatorPage";

export const Route = createFileRoute("/accumulation-simulator")({
  head: () => ({
    meta: [
      { title: "Accumulation Simulator — Sovereign Glidepath" },
      {
        name: "description",
        content:
          "Accumulation Simulator for the Sovereign Glidepath: project 10,000 possible saving-up paths from your current age to your chosen retirement age.",
      },
      { property: "og:title", content: "Accumulation Simulator — Sovereign Glidepath" },
      {
        property: "og:description",
        content: "Project 10,000 possible saving-up paths from today's contributions to your retirement pot.",
      },
    ],
  }),
  component: AccumulationSimulatorPage,
  ssr: false,
});
