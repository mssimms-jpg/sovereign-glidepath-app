import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { SovereignGlidepath } from "@/components/sovereign/SovereignGlidepath";
import { HelpContent } from "@/components/sovereign/HelpContent";
import { ChangelogContent } from "@/components/sovereign/ChangelogContent";
import { AppLockGate } from "@/components/sovereign/AppLockGate";
import { RiskSimulatorPage } from "@/components/sovereign/RiskSimulatorPage";
import { AccumulationSimulatorPage } from "@/components/sovereign/AccumulationSimulatorPage";

function currentPath(): string {
  // Hash-based routing so file:// URLs work in Electron.
  const h = window.location.hash || "";
  return h.replace(/^#/, "") || "/";
}

function App() {
  const [path, setPath] = useState<string>(currentPath());
  useEffect(() => {
    const onHash = () => setPath(currentPath());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (path === "/help") return <HelpContent />;
  if (path === "/changelog") return <ChangelogContent />;
  if (path.startsWith("/risk-simulator")) return <RiskSimulatorPage />;
  if (path.startsWith("/accumulation-simulator")) return <AccumulationSimulatorPage />;
  // Build 117 — the dashboard only mounts once the encrypted vault is open.
  return (
    <AppLockGate>
      <SovereignGlidepath />
    </AppLockGate>
  );
}

const el = document.getElementById("root")!;
createRoot(el).render(<App />);
