// Build 117 — app-lock gate.
//
// Renders the Setup (first launch / migration) or Unlock screen and only
// mounts its children once the vault is genuinely open: key derived, verifier
// decrypted, and every vault value hydrated into memory. This is a real gate,
// not an overlay — SovereignGlidepath does not mount (and therefore never
// reads or renders ledger data) until unlock succeeds.
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  MIN_PASSPHRASE_LENGTH,
  hasLegacyPlaintext,
  isLockConfigured,
  setupLock,
  unlock,
} from "@/lib/sovereign/secureStore";
import sgLogoUrl from "@/assets/sg-logo.svg?url";
import "./desk.css";

type Phase = "checking" | "setup" | "unlock" | "open";

export function AppLockGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("checking");
  const [migrating, setMigrating] = useState(false);
  const [pass, setPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [ack, setAck] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    if (isLockConfigured()) {
      setPhase("unlock");
    } else {
      setMigrating(hasLegacyPlaintext());
      setPhase("setup");
    }
  }, []);

  const doSetup = async () => {
    setError("");
    if (pass.length < MIN_PASSPHRASE_LENGTH) {
      setError(`Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters.`);
      return;
    }
    if (pass !== confirmPass) {
      setError("The two passphrases do not match.");
      return;
    }
    if (!ack) {
      setError("Please confirm you understand that this passphrase cannot be recovered.");
      return;
    }
    setBusy(true);
    try {
      await setupLock(pass);
      setPass("");
      setConfirmPass("");
      setPhase("open");
    } catch (ex) {
      setError((ex as Error)?.message || "Could not set up app-lock.");
    } finally {
      setBusy(false);
    }
  };

  const doUnlock = async () => {
    setError("");
    setBusy(true);
    try {
      const ok = await unlock(pass);
      if (!ok) {
        // Non-punitive deterrent: brief pause, no lockout. Personal single-user app.
        await new Promise((r) => setTimeout(r, 500));
        setError("Incorrect passphrase. Try again.");
        return;
      }
      setPass("");
      setPhase("open");
    } catch (ex) {
      setError((ex as Error)?.message || "Could not unlock.");
    } finally {
      setBusy(false);
    }
  };

  if (phase === "open") return <>{children}</>;

  if (phase === "checking") return null;

  const isSetup = phase === "setup";

  return (
    <div className="applock-screen">
      <div className="applock-card">
        <img src={sgLogoUrl} alt="" width={44} height={44} style={{ marginBottom: "0.75rem" }} />
        <h1 className="applock-title">{isSetup ? "Set up app-lock" : "Unlock Sovereign Glidepath"}</h1>
        <p className="applock-sub">
          {isSetup
            ? migrating
              ? "Your ledger is currently stored unencrypted on this device. Choose a passphrase and it will be encrypted in place — nothing has to be re-entered."
              : "Choose a passphrase. Your ledger, settings and licence details are encrypted on this device with AES-256-GCM and can only be read with it."
            : "Enter your passphrase to decrypt your ledger for this session."}
        </p>

        <label className="applock-label">
          {isSetup ? "Passphrase" : "Passphrase"}
          <input
            type="password"
            className="applock-input"
            autoFocus
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isSetup) doUnlock();
            }}
            spellCheck={false}
            autoComplete={isSetup ? "new-password" : "current-password"}
          />
        </label>

        {isSetup && (
          <>
            <label className="applock-label">
              Confirm passphrase
              <input
                type="password"
                className="applock-input"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") doSetup();
                }}
                spellCheck={false}
                autoComplete="new-password"
              />
            </label>
            <div className="applock-hint">
              Minimum {MIN_PASSPHRASE_LENGTH} characters. No symbol or number rules — length beats
              complexity. A short sentence you will not forget works well.
            </div>
            <div className="applock-warning" role="alert">
              <strong>This passphrase cannot be recovered if forgotten.</strong> If it is lost, your
              ledger data cannot be decrypted — by you, by us, or by anyone. There is no reset and no
              backdoor.
              <label className="applock-ack">
                <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
                <span>I understand my data is unrecoverable without this passphrase.</span>
              </label>
            </div>
          </>
        )}

        {error && (
          <div className="applock-error" role="alert">
            {error}
          </div>
        )}

        <button
          className="applock-submit"
          disabled={busy}
          onClick={isSetup ? doSetup : doUnlock}
        >
          {busy
            ? isSetup
              ? "Encrypting…"
              : "Unlocking…"
            : isSetup
              ? migrating
                ? "Encrypt my data & continue"
                : "Set passphrase & continue"
              : "Unlock"}
        </button>
      </div>
    </div>
  );
}
