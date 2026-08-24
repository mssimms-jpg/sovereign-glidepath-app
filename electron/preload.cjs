// Electron preload script (contextIsolation bridge).
//
// Build 117 — exposes the minimal cryptography surface the renderer needs for
// data-at-rest encryption (app-lock). Node's crypto is available here but not
// in the renderer, so the real work happens in this process and the renderer's
// safe webPreferences stay unchanged.
//
// Deliberately minimal: random bytes (salts), scrypt key derivation, and
// AES-256-GCM encrypt/decrypt with a 32-byte key. Nothing else is exposed —
// no filesystem, no shell, no general Node access.
const { contextBridge } = require("electron");
const crypto = require("node:crypto");

const KEY_LEN = 32; // AES-256
const IV_LEN = 12; // GCM standard nonce
const TAG_LEN = 16;
const SCRYPT_PARAMS = { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function keyFromB64(keyB64) {
  if (typeof keyB64 !== "string") throw new Error("Bad key");
  const key = Buffer.from(keyB64, "base64");
  if (key.length !== KEY_LEN) throw new Error("Bad key length");
  return key;
}

const sgCrypto = {
  kdf: "scrypt",

  /** Random bytes as base64. Salts only — clamped to a sane range. */
  randomBytesB64(n) {
    const len = Math.min(64, Math.max(16, Number(n) || 16));
    return crypto.randomBytes(len).toString("base64");
  },

  /** scrypt(passphrase, salt) -> 32-byte key, base64. */
  deriveKey(passphrase, saltB64) {
    return new Promise((resolve, reject) => {
      if (typeof passphrase !== "string" || !passphrase) return reject(new Error("Passphrase required"));
      const salt = Buffer.from(String(saltB64 || ""), "base64");
      if (salt.length < 16) return reject(new Error("Salt too short"));
      crypto.scrypt(passphrase, salt, KEY_LEN, SCRYPT_PARAMS, (err, dk) => {
        if (err) reject(err);
        else resolve(dk.toString("base64"));
      });
    });
  },

  /** AES-256-GCM. Returns base64 of iv(12) | tag(16) | ciphertext. */
  async encrypt(plaintext, keyB64) {
    if (typeof plaintext !== "string") throw new Error("Plaintext must be a string");
    const key = keyFromB64(keyB64);
    const iv = crypto.randomBytes(IV_LEN);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
  },

  /** Inverse of encrypt(). Throws on wrong key or tampered data. */
  async decrypt(payloadB64, keyB64) {
    const key = keyFromB64(keyB64);
    const buf = Buffer.from(String(payloadB64 || ""), "base64");
    if (buf.length < IV_LEN + TAG_LEN + 1) throw new Error("Ciphertext too short");
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const ct = buf.subarray(IV_LEN + TAG_LEN);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  },
};

contextBridge.exposeInMainWorld("sgCrypto", sgCrypto);
