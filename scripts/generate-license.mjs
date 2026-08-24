#!/usr/bin/env node
// Sovereign Glidepath — offline license key generator (CLI).
//
// Usage:
//   node scripts/generate-license.mjs "alice@example.com"
//   node scripts/generate-license.mjs "Jane Doe"
//
// Prints a 64-char lowercase hex license key bound to the given name/email.
// The SALT MUST match src/lib/sovereign/license.ts exactly, or keys won't verify.

import { webcrypto } from "node:crypto";

const SALT = "SOVEREIGN_GLIDEPATH_SECURE_SALT_2026";

async function sha256Hex(input) {
  const buf = new TextEncoder().encode(input);
  const hash = await webcrypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const name = process.argv.slice(2).join(" ").trim();
if (!name) {
  console.error('Usage: node scripts/generate-license.mjs "<name-or-email>"');
  process.exit(1);
}

const key = await sha256Hex(name + SALT);
console.log("Registered Name/Email :", name);
console.log("License Key           :", key);
