// Build 117 — Sovereign Glidepath data-at-rest cryptography adapter.
//
// One tiny surface, two backends:
//   • Electron desktop  → window.sgCrypto (see electron/preload.cjs): Node
//     crypto, scrypt key derivation + AES-256-GCM.
//   • Browser / web demo → WebCrypto: PBKDF2-SHA256 (250k) + AES-256-GCM.
//
// Both backends are authenticated (GCM), use a fresh random 12-byte IV per
// write, and never persist the passphrase or the derived key anywhere. The
// derived key lives in module memory for the lifetime of the process only.
//
// Deliberately NOT a general-purpose crypto API: derive / encrypt / decrypt
// with a 32-byte key and nothing else.

export type KdfName = "scrypt" | "pbkdf2";

export interface KeyHandle {
  readonly kdf: KdfName;
  /** base64 of the 32-byte derived key. Never written to disk. */
  readonly raw: string;
}

/** Marker prefix on every encrypted value we persist. */
export const ENC_PREFIX = "SGPENC1:";

const PBKDF2_ITERATIONS = 250_000;

type SgCrypto = {
  kdf?: string;
  randomBytesB64: (n: number) => string;
  deriveKey: (passphrase: string, saltB64: string) => Promise<string>;
  encrypt: (plaintext: string, keyB64: string) => Promise<string>;
  decrypt: (payloadB64: string, keyB64: string) => Promise<string>;
};

function native(): SgCrypto | null {
  const w = globalThis as unknown as { sgCrypto?: SgCrypto };
  const c = w.sgCrypto;
  if (c && typeof c.deriveKey === "function" && typeof c.encrypt === "function") return c;
  return null;
}

/** True when running inside Electron with the native (scrypt) backend. */
export function usingNativeCrypto(): boolean {
  return native() !== null;
}

// ---------- base64 helpers (browser path) ----------

function bytesToB64(b: Uint8Array): string {
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s);
}

function b64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

// ---------- public API ----------

/** Cryptographically random bytes, base64. Used for salts and nothing else. */
export function randomB64(len = 16): string {
  const n = native();
  if (n) return n.randomBytesB64(len);
  const b = new Uint8Array(len);
  crypto.getRandomValues(b);
  return bytesToB64(b);
}

export async function deriveKey(passphrase: string, saltB64: string): Promise<KeyHandle> {
  const n = native();
  if (n) {
    const raw = await n.deriveKey(passphrase, saltB64);
    return { kdf: "scrypt", raw };
  }
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: b64ToBytes(saltB64) as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    base,
    256,
  );
  return { kdf: "pbkdf2", raw: bytesToB64(new Uint8Array(bits)) };
}

/**
 * Re-derive a key using the KDF recorded when the data was written, so a
 * vault created on the desktop build still opens with the same passphrase.
 */
export async function deriveKeyWithKdf(
  passphrase: string,
  saltB64: string,
  kdf: KdfName,
): Promise<KeyHandle> {
  const n = native();
  if (kdf === "scrypt") {
    if (!n) throw new Error("This data was encrypted by the desktop app and needs the desktop app to open.");
    return { kdf: "scrypt", raw: await n.deriveKey(passphrase, saltB64) };
  }
  // pbkdf2 is always available (WebCrypto exists in Electron's renderer too).
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: b64ToBytes(saltB64) as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    base,
    256,
  );
  return { kdf: "pbkdf2", raw: bytesToB64(new Uint8Array(bits)) };
}

/** AES-256-GCM encrypt. Returns base64 of iv(12) | tag(16) | ciphertext. */
export async function encryptString(plaintext: string, key: KeyHandle): Promise<string> {
  const n = native();
  if (n && key.kdf === "scrypt") return n.encrypt(plaintext, key.raw);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const ck = await crypto.subtle.importKey("raw", b64ToBytes(key.raw) as unknown as BufferSource, "AES-GCM", false, [
    "encrypt",
  ]);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as unknown as BufferSource, tagLength: 128 },
      ck,
      new TextEncoder().encode(plaintext) as unknown as BufferSource,
    ),
  );
  // WebCrypto appends the tag; move it in front so both backends share a layout.
  const tag = ct.subarray(ct.length - 16);
  const body = ct.subarray(0, ct.length - 16);
  const out = new Uint8Array(12 + 16 + body.length);
  out.set(iv, 0);
  out.set(tag, 12);
  out.set(body, 28);
  return bytesToB64(out);
}

/** AES-256-GCM decrypt. Throws if the passphrase is wrong or data was tampered with. */
export async function decryptString(payloadB64: string, key: KeyHandle): Promise<string> {
  const n = native();
  if (n && key.kdf === "scrypt") return n.decrypt(payloadB64, key.raw);
  const buf = b64ToBytes(payloadB64);
  if (buf.length < 29) throw new Error("Ciphertext too short");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const body = buf.subarray(28);
  const joined = new Uint8Array(body.length + 16);
  joined.set(body, 0);
  joined.set(tag, body.length);
  const ck = await crypto.subtle.importKey("raw", b64ToBytes(key.raw) as unknown as BufferSource, "AES-GCM", false, [
    "decrypt",
  ]);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource, tagLength: 128 },
    ck,
    joined as unknown as BufferSource,
  );
  return new TextDecoder().decode(pt);
}
