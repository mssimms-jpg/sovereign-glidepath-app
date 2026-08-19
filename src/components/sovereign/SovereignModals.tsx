// Sovereign Glidepath — standalone overlay modals (Build 126 file-size cleanup, Stage 3a).
//
// Extracted from SovereignGlidepath.tsx as pure presentational components —
// state ownership stays exactly where it was (the parent), matching the
// safe extraction pattern used for CSV export and the Scenario Test Runner:
// nothing here changes WHO owns a piece of state, only WHERE the JSX that
// renders it lives. The Disclaimer modal is the one exception — its own
// "accepted"/"hide" checkboxes were never read anywhere outside this modal,
// so they safely moved to being genuinely local state.
//
// The Commit-confirmation modal deliberately stays in SovereignGlidepath.tsx
// for now — it reviews a large slice of live Pane 1 state and is a
// materially bigger, more entangled extraction, better done as its own
// dedicated pass rather than folded into this batch.

import { useState } from "react";
import type { LicenseState } from "@/lib/sovereign/license";

const DISCLAIMER_KEY = "shd_v7_disclaimer";

// ---------------------------------------------------------------------------
// Disclaimer
// ---------------------------------------------------------------------------

export interface DisclaimerModalProps {
  visible: boolean;
  onClose: () => void;
}

export function DisclaimerModal({ visible, onClose }: DisclaimerModalProps) {
  const [accepted, setAccepted] = useState(false);
  const [hide, setHide] = useState(false);

  if (!visible) return null;

  return (
    <div className="shd-overlay" role="dialog" aria-modal="true">
      <div className="shd-modal" style={{ width: 640, maxHeight: "90vh", overflowY: "auto" }}>
        <h2
          style={{
            fontSize: "1.4rem",
            fontWeight: 800,
            color: "var(--accent-red)",
            margin: "0 0 1rem 0",
            textTransform: "none",
            letterSpacing: 0,
          }}
        >
          ⚠️ Legal Notice, Disclaimer &amp; Limitation of Liability
        </h2>
        <div
          style={{
            fontSize: "0.85rem",
            lineHeight: 1.55,
            color: "var(--text-muted)",
            maxHeight: "42vh",
            overflowY: "auto",
            paddingRight: "0.5rem",
          }}
        >
          <p style={{ marginTop: 0 }}>
            <strong style={{ color: "var(--text-main)" }}>
              PLEASE READ THIS NOTICE CAREFULLY BEFORE USING THE SOFTWARE.
            </strong>{" "}
            Sovereign Glidepath is provided as a recreational, educational and illustrative modeling tool only. It
            does not constitute financial, investment, tax or legal advice.
          </p>
          <p>
            All projections are hypothetical and bear no guaranteed relationship to future performance. You are
            solely responsible for any decisions you make and must consult a suitably qualified, regulated
            professional before acting on any output.
          </p>
          <p>
            The Software is provided "AS IS" without warranty of any kind. To the fullest extent permitted by law,
            the publisher accepts no liability for any loss of capital, income or pension funds arising from your
            use of, or inability to use, the Software.
          </p>
          <p style={{ marginBottom: 0 }}>
            If you do not accept these terms, close this dialog and discontinue use immediately.
          </p>
        </div>
        <div
          style={{
            background: "rgba(0,0,0,0.25)",
            padding: "1rem 1.2rem",
            borderRadius: "0.5rem",
            marginTop: "1rem",
            border: "1px solid rgba(239,68,68,0.3)",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              cursor: "pointer",
              textTransform: "none",
              fontSize: "0.9rem",
              color: "var(--text-main)",
              fontWeight: 600,
            }}
          >
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              style={{ width: "auto", marginTop: 3 }}
            />
            <span>
              I have read, understood and accept the Legal Notice, Disclaimer and Limitation of Liability above, and
              I waive any claim against the publisher arising from my use of this Software.
            </span>
          </label>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "1.5rem",
          }}
        >
          <button
            disabled={!accepted}
            onClick={() => {
              if (hide) {
                try {
                  localStorage.setItem(DISCLAIMER_KEY, "true");
                } catch {
                  /* ignore */
                }
              }
              onClose();
            }}
          >
            Accept &amp; Enter Dashboard
          </button>
        </div>
        <div style={{ marginTop: "1rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              textTransform: "none",
              fontSize: "0.8rem",
              color: "var(--text-muted)",
            }}
          >
            <input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} style={{ width: "auto" }} />{" "}
            Don't show this again on this device.
          </label>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// License
// ---------------------------------------------------------------------------

export interface LicenseModalProps {
  visible: boolean;
  license: LicenseState;
  setLicense: (v: LicenseState) => void;
  clearLicense: () => void;
  licenseNameInput: string;
  setLicenseNameInput: (v: string) => void;
  licenseKeyInput: string;
  setLicenseKeyInput: (v: string) => void;
  licenseError: string;
  setLicenseError: (v: string) => void;
  submitLicense: () => void;
  onClose: () => void;
  showToast: (message: string) => void;
}

export function LicenseModal({
  visible,
  license,
  setLicense,
  clearLicense,
  licenseNameInput,
  setLicenseNameInput,
  licenseKeyInput,
  setLicenseKeyInput,
  licenseError,
  setLicenseError,
  submitLicense,
  onClose,
  showToast,
}: LicenseModalProps) {
  if (!visible) return null;

  return (
    <div className="shd-overlay" role="dialog" aria-modal="true">
      <div className="shd-modal">
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: 800,
            margin: "0 0 0.5rem 0",
            textTransform: "none",
            letterSpacing: 0,
          }}
        >
          Activate License
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>
          Enter the registered name or email you supplied at purchase, then paste your license key. Activation is
          offline — the key is stored only in this browser.
        </p>
        <label style={{ display: "block", marginBottom: "0.75rem" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
            Registered Name / Email
          </div>
          <input
            type="text"
            placeholder="e.g. alice@example.com"
            value={licenseNameInput}
            onChange={(e) => setLicenseNameInput(e.target.value)}
            autoFocus
          />
        </label>
        <label style={{ display: "block" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>License Key</div>
          <input
            type="text"
            placeholder="64-character key"
            value={licenseKeyInput}
            onChange={(e) => setLicenseKeyInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitLicense();
              if (e.key === "Escape") onClose();
            }}
            spellCheck={false}
            autoCapitalize="none"
            autoComplete="off"
          />
        </label>
        {licenseError && (
          <div
            role="alert"
            style={{
              color: "var(--accent-red)",
              fontSize: "0.85rem",
              marginTop: "0.75rem",
              fontWeight: "bold",
            }}
          >
            {licenseError}
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "1rem",
            marginTop: "1.5rem",
          }}
        >
          {license.licensed && (
            <button
              className="secondary"
              style={{ marginRight: "auto", color: "var(--accent-red)" }}
              onClick={() => {
                if (
                  !window.confirm(
                    "Deactivate this license on this device? You'll need to re-enter your name/email and license key to reactivate.",
                  )
                ) {
                  return;
                }
                clearLicense();
                setLicense({ licensed: false, name: null });
                setLicenseNameInput("");
                setLicenseKeyInput("");
                setLicenseError("");
                onClose();
                showToast("License deactivated on this device");
              }}
            >
              Deactivate License
            </button>
          )}
          <button className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button onClick={submitLicense}>{license.licensed ? "Re-activate" : "Activate"}</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Entry-limit lockout
// ---------------------------------------------------------------------------

export interface EntryLimitLockoutModalProps {
  visible: boolean;
  onCancel: () => void;
  onEnterLicenseKey: () => void;
}

export function EntryLimitLockoutModal({ visible, onCancel, onEnterLicenseKey }: EntryLimitLockoutModalProps) {
  if (!visible) return null;

  return (
    <div className="shd-overlay" role="dialog" aria-modal="true">
      <div className="shd-modal">
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: 800,
            margin: "0 0 0.5rem 0",
            textTransform: "none",
            letterSpacing: 0,
          }}
        >
          Entry Limit Reached
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
          Maximum entry limit reached for evaluation copy. Please activate your license to unlock unlimited
          historical planning.
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "1rem",
          }}
        >
          <button className="secondary" onClick={onCancel}>
            Cancel
          </button>
          <button onClick={onEnterLicenseKey}>Enter License Key</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Backup / Restore
// ---------------------------------------------------------------------------

export interface BackupRestoreModalState {
  title: string;
  desc: string;
  mode: "export" | "import" | "passphrase";
  onSubmit: (pw: string, confirm: string, extra: string) => string | null | Promise<string | null>;
}

export interface BackupRestoreModalProps {
  modal: BackupRestoreModalState | null;
  modalPw: string;
  setModalPw: (v: string) => void;
  modalConfirm: string;
  setModalConfirm: (v: string) => void;
  modalExtra: string;
  setModalExtra: (v: string) => void;
  modalError: string;
  modalBusy: boolean;
  submitModal: () => void;
  closeModal: () => void;
}

export function BackupRestoreModal({
  modal,
  modalPw,
  setModalPw,
  modalConfirm,
  setModalConfirm,
  modalExtra,
  setModalExtra,
  modalError,
  modalBusy,
  submitModal,
  closeModal,
}: BackupRestoreModalProps) {
  if (!modal) return null;

  return (
    <div className="shd-overlay" role="dialog" aria-modal="true">
      <div className="shd-modal">
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: 800,
            margin: "0 0 0.5rem 0",
            textTransform: "none",
            letterSpacing: 0,
          }}
        >
          {modal.title}
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>{modal.desc}</p>
        <input
          type="password"
          value={modalPw}
          autoFocus
          placeholder={modal.mode === "passphrase" ? "Current passphrase..." : undefined}
          onChange={(e) => setModalPw(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitModal();
            if (e.key === "Escape") closeModal();
          }}
        />
        {(modal.mode === "export" || modal.mode === "passphrase") && (
          <input
            type="password"
            placeholder={modal.mode === "passphrase" ? "New passphrase..." : "Confirm Password..."}
            style={{ marginTop: "1rem" }}
            value={modalConfirm}
            onChange={(e) => setModalConfirm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitModal();
              if (e.key === "Escape") closeModal();
            }}
          />
        )}
        {modal.mode === "passphrase" && (
          <input
            type="password"
            placeholder="Confirm new passphrase..."
            style={{ marginTop: "1rem" }}
            value={modalExtra}
            onChange={(e) => setModalExtra(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitModal();
              if (e.key === "Escape") closeModal();
            }}
          />
        )}
        {modalError && (
          <div
            role="alert"
            style={{
              color: "var(--accent-red)",
              fontSize: "0.85rem",
              marginTop: "0.5rem",
              fontWeight: "bold",
            }}
          >
            {modalError}
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "1rem",
            marginTop: "1.5rem",
          }}
        >
          <button className="secondary" onClick={closeModal}>
            Cancel
          </button>
          <button onClick={submitModal} disabled={modalBusy}>
            {modalBusy ? "Working…" : "Proceed"}
          </button>
        </div>
      </div>
    </div>
  );
}

