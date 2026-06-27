// Sovereign Glidepath — offline licensing v2.
//
// Scheme: license key = SHA-256(registeredNameOrEmail + INTERNAL_SALT), 64-char
// lowercase hex. Verification is fully offline. The salt ships in the client
// bundle, so a determined user can derive keys — that is an accepted trade-off
// for the v1 trial gate. Durable revocation arrives with online activation.
//
// 30-day evaluation clock + 5-entry post-expiry ledger cap. See build-flags.ts
// for the Windows Store bypass.

const LICENSE_STORAGE = "sgp_license_v2";
const INSTALL_DATE_STORAGE = "sgp_installation_date";

// Internal salt — phase-1 only. Rotate when online activation ships.
const SALT = "SOVEREIGN_GLIDEPATH_SECURE_SALT_2026";

export const TRIAL_DAYS = 30;
export const POST_TRIAL_ENTRY_LIMIT = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface LicenseRecord {
  name: string;
  key: string;
}

export interface LicenseState {
  licensed: boolean;
  name: string | null;
}

export interface TrialState {
  installedAt: number;
  daysRemaining: number;
  expired: boolean;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normaliseName(name: string): string {
  return name.trim();
}

function normaliseKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, "");
}

/** Compute the canonical license key for a given registered name/email. */
export async function deriveKey(nameOrEmail: string): Promise<string> {
  return sha256Hex(normaliseName(nameOrEmail) + SALT);
}

/**
 * Verify that the pasted license key matches the registered name/email.
 * Returns the canonical normalised name on success.
 */
export async function verifyLicense(
  nameOrEmail: string,
  key: string,
): Promise<{ ok: true; name: string } | { ok: false }> {
  const name = normaliseName(nameOrEmail);
  if (!name) return { ok: false };
  const candidate = normaliseKey(key);
  if (candidate.length !== 64 || !/^[0-9a-f]{64}$/.test(candidate)) {
    return { ok: false };
  }
  const expected = await deriveKey(name);
  // Constant-time compare on equal-length lowercase hex.
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ candidate.charCodeAt(i);
  }
  return diff === 0 ? { ok: true, name } : { ok: false };
}

export async function loadLicense(): Promise<LicenseState> {
  try {
    const raw = localStorage.getItem(LICENSE_STORAGE);
    if (!raw) return { licensed: false, name: null };
    const rec = JSON.parse(raw) as LicenseRecord;
    if (!rec?.name || !rec?.key) return { licensed: false, name: null };
    const v = await verifyLicense(rec.name, rec.key);
    if (!v.ok) return { licensed: false, name: null };
    return { licensed: true, name: v.name };
  } catch {
    return { licensed: false, name: null };
  }
}

export function saveLicense(record: LicenseRecord): void {
  try {
    localStorage.setItem(LICENSE_STORAGE, JSON.stringify(record));
  } catch {
    /* storage disabled */
  }
}

export function clearLicense(): void {
  try {
    localStorage.removeItem(LICENSE_STORAGE);
  } catch {
    /* ignore */
  }
}

/**
 * Returns the install timestamp, stamping it on first call. Idempotent.
 */
export function getInstallationDate(): number {
  try {
    const existing = localStorage.getItem(INSTALL_DATE_STORAGE);
    if (existing) {
      const n = Number(existing);
      if (Number.isFinite(n) && n > 0) return n;
    }
    const now = Date.now();
    localStorage.setItem(INSTALL_DATE_STORAGE, String(now));
    return now;
  } catch {
    return Date.now();
  }
}

export function getTrialState(now: number = Date.now()): TrialState {
  const installedAt = getInstallationDate();
  const elapsedDays = Math.floor((now - installedAt) / DAY_MS);
  const daysRemaining = Math.max(0, TRIAL_DAYS - elapsedDays);
  return {
    installedAt,
    daysRemaining,
    expired: daysRemaining <= 0,
  };
}
