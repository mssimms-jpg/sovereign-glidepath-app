import { createFileRoute } from "@tanstack/react-router";
import { SovereignGlidepath } from "@/components/sovereign/SovereignGlidepath";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sovereign Glidepath" },
      {
        name: "description",
        content:
          "Sovereign Glidepath — a recreational retirement-withdrawal modeling dashboard built on the Guyton-Klinger guardrail method.",
      },
      { property: "og:title", content: "Sovereign Glidepath" },
      {
        property: "og:description",
        content:
          "A recreational retirement-withdrawal modeling dashboard built on the Guyton-Klinger guardrail method.",
      },
    ],
  }),
  component: Index,
  ssr: false,
});

function Index() {
  return <SovereignGlidepath />;
}
