// Sovereign Glidepath — shared Monte Carlo internals.
//
// Build 128 — split out of MonteCarloPanel.tsx and accumulationEngine.ts,
// which had each independently defined byte-for-byte identical copies of
// mulberry32() and gaussian(), plus a functionally-identical (but
// differently-written) quantile(), and duplicate literal copies of the
// Parametric-mode mean/stdev defaults. Two copies of the same constant is
// exactly the kind of thing that goes quietly stale — which is the same
// class of bug this build's GLOBAL_ANNUAL data fix was about, just in the
// "someone updates one copy and forgets the other" direction rather than
// "the one copy was wrong to begin with." GLOBAL_ANNUAL itself (in
// MonteCarloPanel.tsx) was already correctly shared this way — this file
// extends the same pattern to the rest of the sim internals both
// simulators need.

/** Seeded PRNG (mulberry32). Deterministic: same seed -> same sequence. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller transform — standard normal draw from a uniform RNG. */
export function gaussian(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/** Linear-interpolated percentile of an already-sorted array. */
export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const lo = sorted[base] ?? 0;
  const hi = sorted[base + 1];
  return hi !== undefined ? lo + rest * (hi - lo) : lo;
}

// Parametric-mode default mean/stdev — the REAL MSCI World (GBP) full-period
// (1970-2024) arithmetic mean/stdev, computed directly from the same series
// GLOBAL_ANNUAL holds. Single source of truth for both simulators' defaults;
// see MonteCarloPanel.tsx and AccumulationSimulatorPage.tsx for where these
// are consumed.
export const PARAMETRIC_DEFAULT_MEAN_PCT = 11.85;
export const PARAMETRIC_DEFAULT_STDEV_PCT = 17.8;
