// Sovereign Glidepath — build-time feature flags.
//
// IS_STORE_BUILD: when true, bypass the local 30-day evaluation clock and
// 5-entry post-expiry cap, and hide the License entry UI entirely. Reserved
// for the future Windows Store build where entitlement comes from the OS.
export const IS_STORE_BUILD = false;
