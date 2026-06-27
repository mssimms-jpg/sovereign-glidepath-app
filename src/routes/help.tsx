import { createFileRoute } from "@tanstack/react-router";
import { HelpContent } from "@/components/sovereign/HelpContent";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help — Sovereign Glidepath" },
      {
        name: "description",
        content:
          "User manual for the Sovereign Glidepath: phases, Guyton-Klinger guardrails, shield runway, ledger commits, backup and licensing.",
      },
    ],
  }),
  component: HelpContent,
  ssr: false,
});
