// Build 117 — app-lock / data-at-rest vault for Sovereign Glidepath.
//
// What it does
//   • Holds the app-lock metadata (KDF name + salt + an encrypted verifier) in
//     localStorage under `sgp_lock_v1`. The salt is not secret; the passphrase
//     and derived key are NEVER persisted in any form.
//   • Persists the three sensitive keys — ledger, settings, license — as
//     AES-256-GCM blobs (`SGPENC1:<base64 iv|tag|ct>`) under their existing
//     localStorage keys, so nothing else in the app has to move.
//   • Keeps a decrypted in-memory cache, hydrated once by AppLockGate BEFORE
//     SovereignGlidepath mounts. That lets the existing synchronous
//     load/save call sites stay synchronous; writes encrypt in the background
//     through a serialised queue so ordering is preserved.
//   • Migrates pre-117 plain-text installs exactly once, crash-safely, via a
//     temporary staging key that is only removed after every value has been
//     re-written encrypted.
//
// There is no standing plain-text fallback: after setup/migration, a value
// that is not an `SGPENC1:` blob is treated as absent (except during the
// one-time migration path below).

import {
  ENC_PREFIX,
  decryptString,
  deriveKey,
  deriveKeyWithKdf,
  encryptString,
  randomB64,
  usingNativeCrypto,
  type KdfName,
  type KeyHandle,
} from "./appCrypto";

const META_KEY = "sgp_lock_v1";
const STAGING_KEY = "sgp_lock_migration_v1";
const VERIFIER_PLAINTEXT = "SGP_VERIFY_OK";

export const LEDGER_STORAGE_KEY = "shd_ledger_v4";
export const SETTINGS_STORAGE_KEY = "shd_settings_v1";
export const LICENSE_STORAGE_KEY = "sgp_license_v2";
// Build 135 — CPI Index Reference Table (raw ONS CPI INDEX values keyed by
// period-end date). Lives in the encrypted vault like the ledger/settings
// so Back-Up/Restore carries it along automatically.
export const CPI_REFERENCE_STORAGE_KEY = "shd_cpi_reference_v1";

/** Every key held inside the encrypted vault. */
export const VAULT_KEYS = [
  LEDGER_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  LICENSE_STORAGE_KEY,
  CPI_REFERENCE_STORAGE_KEY,
] as const;

export const MIN_PASSPHRASE_LENGTH = 8;

interface LockMeta {
  v: 1;
  kdf: KdfName;
  salt: string;
  verifier: string;
}

let key: KeyHandle | null = null;
const cache = new Map<string, string | null>();
let writeChain: Promise<unknown> = Promise.resolve();

// ---------- localStorage helpers (never throw) ----------

function lsGet(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}

function lsSet(k: string, v: string): void {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* storage disabled */
  }
}

function lsRemove(k: string): void {
  try {
    localStorage.removeItem(k);
  } catch {
    /* storage disabled */
  }
}

function readMeta(): LockMeta | null {
  const raw = lsGet(META_KEY);
  if (!raw) return null;
  try {
    const m = JSON.parse(raw) as LockMeta;
    if (m?.v === 1 && typeof m.salt === "string" && typeof m.verifier === "string") return m;
  } catch {
    /* corrupt meta */
  }
  return null;
}

// ---------- public state ----------

/** True once a passphrase has been set up on this device. */
export function isLockConfigured(): boolean {
  return readMeta() !== null;
}

export function isUnlocked(): boolean {
  return key !== null;
}

/**
 * True when pre-117 plain-text values are still sitting in localStorage (or a
 * migration was interrupted). Used to word the setup screen appropriately.
 */
export function hasLegacyPlaintext(): boolean {
  if (lsGet(STAGING_KEY)) return true;
  return VAULT_KEYS.some((k) => {
    const raw = lsGet(k);
    return !!raw && !raw.startsWith(ENC_PREFIX);
  });
}

// ---------- read / write ----------

/** Synchronous read of a decrypted value from the in-memory cache. */
export function secureRead(k: string): string | null {
  if (!key) return null;
  return cache.get(k) ?? null;
}

/** Cache immediately, then encrypt + persist in the background (ordered). */
export function secureWrite(k: string, value: string): void {
  cache.set(k, value);
  if (!key) return;
  const k0 = key;
  writeChain = writeChain
    .then(async () => {
      const blob = await encryptString(value, k0);
      lsSet(k, ENC_PREFIX + blob);
    })
    .catch(() => {
      /* keep the chain alive; a failed write leaves the previous blob intact */
    });
}

export function secureRemove(k: string): void {
  cache.set(k, null);
  writeChain = writeChain.then(() => lsRemove(k)).catch(() => {});
}

/** Resolves once every queued encrypted write has hit localStorage. */
export function flushWrites(): Promise<void> {
  return writeChain.then(
    () => undefined,
    () => undefined,
  );
}

// ---------- setup / unlock ----------

function stageLegacyPlaintext(): Record<string, string> {
  // Resume an interrupted migration if staging already exists.
  const existing = lsGet(STAGING_KEY);
  if (existing) {
    try {
      const parsed = JSON.parse(existing) as Record<string, string>;
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      /* fall through and re-stage */
    }
  }
  const staged: Record<string, string> = {};
  for (const k of VAULT_KEYS) {
    const raw = lsGet(k);
    if (raw && !raw.startsWith(ENC_PREFIX)) staged[k] = raw;
  }
  if (Object.keys(staged).length > 0) lsSet(STAGING_KEY, JSON.stringify(staged));
  return staged;
}

async function commitStaged(staged: Record<string, string>, k0: KeyHandle): Promise<void> {
  for (const [k, v] of Object.entries(staged)) {
    cache.set(k, v);
    lsSet(k, ENC_PREFIX + (await encryptString(v, k0)));
  }
  // Only now is it safe to drop the plain-text staging copy. A crash before
  // this line leaves staging in place, and the next unlock replays it.
  lsRemove(STAGING_KEY);
}

/**
 * First-run setup (also the migration entry point). Creates a fresh salt,
 * derives the key, re-encrypts any existing plain-text values in place, and
 * leaves the vault unlocked.
 */
export async function setupLock(passphrase: string): Promise<void> {
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
    throw new Error(`Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters.`);
  }
  // Stage first, so a crash between here and the final write is recoverable.
  const staged = stageLegacyPlaintext();

  const salt = randomB64(16);
  const k0 = await deriveKey(passphrase, salt);
  const meta: LockMeta = {
    v: 1,
    kdf: k0.kdf,
    salt,
    verifier: await encryptString(VERIFIER_PLAINTEXT, k0),
  };
  lsSet(META_KEY, JSON.stringify(meta));

  key = k0;
  cache.clear();
  for (const k of VAULT_KEYS) cache.set(k, null);
  await commitStaged(staged, k0);
}

/**
 * Unlock with an existing passphrase. Returns false for a wrong passphrase;
 * throws only on genuinely broken state.
 */
export async function unlock(passphrase: string): Promise<boolean> {
  const meta = readMeta();
  if (!meta) return false;
  const k0 = await deriveKeyWithKdf(passphrase, meta.salt, meta.kdf ?? "pbkdf2");
  try {
    const probe = await decryptString(meta.verifier, k0);
    if (probe !== VERIFIER_PLAINTEXT) return false;
  } catch {
    return false;
  }

  key = k0;
  cache.clear();
  for (const k of VAULT_KEYS) {
    const raw = lsGet(k);
    if (raw && raw.startsWith(ENC_PREFIX)) {
      try {
        cache.set(k, await decryptString(raw.slice(ENC_PREFIX.length), k0));
      } catch {
        // Authenticated decryption failed → corrupt/tampered. Treat as empty
        // rather than silently falling back to any plain-text value.
        cache.set(k, null);
      }
    } else {
      cache.set(k, null);
    }
  }

  // Replay an interrupted migration, if any.
  const staging = lsGet(STAGING_KEY);
  if (staging) {
    try {
      await commitStaged(JSON.parse(staging) as Record<string, string>, k0);
    } catch {
      /* leave staging for the next attempt */
    }
  }
  return true;
}

/**
 * Change the app-lock passphrase: verifies the current one, derives a brand
 * new key from a brand new salt, and re-encrypts every vault value with it.
 * The old key stops opening the data because both salt and verifier change.
 */
export async function changePassphrase(current: string, next: string): Promise<boolean> {
  if (next.length < MIN_PASSPHRASE_LENGTH) {
    throw new Error(`Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters.`);
  }
  const meta = readMeta();
  if (!meta) return false;
  const oldKey = await deriveKeyWithKdf(current, meta.salt, meta.kdf ?? "pbkdf2");
  try {
    if ((await decryptString(meta.verifier, oldKey)) !== VERIFIER_PLAINTEXT) return false;
  } catch {
    return false;
  }

  await flushWrites();
  const salt = randomB64(16);
  const newKey = await deriveKey(next, salt);
  const snapshot = new Map(cache);
  for (const [k, v] of snapshot) {
    if (typeof v === "string") lsSet(k, ENC_PREFIX + (await encryptString(v, newKey)));
  }
  const nextMeta: LockMeta = {
    v: 1,
    kdf: newKey.kdf,
    salt,
    verifier: await encryptString(VERIFIER_PLAINTEXT, newKey),
  };
  lsSet(META_KEY, JSON.stringify(nextMeta));
  key = newKey;
  return true;
}

// ---------- backup files (Change 5) ----------

export const BACKUP_FORMAT = "SGP-BACKUP-AES-GCM-1";

/**
 * Real encryption for backup files: scrypt/PBKDF2 + AES-256-GCM, wrapped in a
 * self-describing envelope so restore never has to guess the format.
 */
export async function encryptBackup(plaintext: string, password: string): Promise<string> {
  if (!password) throw new Error("Password required");
  const salt = randomB64(16);
  const k0 = await deriveKey(password, salt);
  const data = await encryptString(plaintext, k0);
  return JSON.stringify({ format: BACKUP_FORMAT, kdf: k0.kdf, salt, data }, null, 2);
}

export type BackupKind = "plain" | "aes" | "legacy-xor";

/** Sniff a backup file's format from its contents. */
export function detectBackupKind(fileText: string): BackupKind {
  const t = fileText.trim();
  if (t.startsWith("[")) return "plain";
  if (t.startsWith("{")) {
    try {
      const env = JSON.parse(t) as { format?: string };
      if (env?.format === BACKUP_FORMAT) return "aes";
    } catch {
      /* not an envelope */
    }
  }
  return "legacy-xor";
}

/** Decrypt a new-format (AES-GCM) backup file. Throws on wrong password. */
export async function decryptBackup(fileText: string, password: string): Promise<string> {
  if (!password) throw new Error("Password required");
  const env = JSON.parse(fileText.trim()) as {
    format?: string;
    kdf?: KdfName;
    salt?: string;
    data?: string;
  };
  if (env?.format !== BACKUP_FORMAT || !env.salt || !env.data) {
    throw new Error("Unrecognised backup format");
  }
  const k0 = await deriveKeyWithKdf(password, env.salt, env.kdf ?? (usingNativeCrypto() ? "scrypt" : "pbkdf2"));
  return decryptString(env.data, k0);
}
