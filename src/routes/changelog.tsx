import { createFileRoute } from "@tanstack/react-router";
import { ChangelogContent } from "@/components/sovereign/ChangelogContent";

export const Route = createFileRoute("/changelog")({
  head: () => ({
    meta: [
      { title: "Changelog — Sovereign Glidepath" },
      {
        name: "description",
        content: "Running record of updates, improvements and bug fixes for Sovereign Glidepath.",
      },
    ],
  }),
  component: ChangelogContent,
  ssr: false,
});
