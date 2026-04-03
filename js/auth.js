// ============================================================
// QAcademy Nurses Hub — Auth Utilities
// js/auth.js
//
// Shared helpers for authentication: hashing, device
// fingerprinting, and event ID generation.
// Used by login.html and future login method pages.
// ============================================================

/**
 * Hashes a string with SHA-256 and returns the first 32 hex chars.
 * Returns null if hashing fails (e.g. insecure context).
 */
async function sha256Hex(input) {
  try {
    const encoded = new TextEncoder().encode(input);
    const hashBuf = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('').slice(0, 32);
  } catch (_) {
    return null;
  }
}

/**
 * Builds a device fingerprint hash from screen, timezone, language,
 * and platform. Not as strong as an IP address, but gives us a
 * second tracking bucket for rate limiting.
 * Returns a 32-char hex string, or null on error.
 */
async function buildFpHash() {
  try {
    const parts = [
      screen.width,
      screen.height,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.language,
      navigator.platform
    ].join('|');
    return await sha256Hex(parts);
  } catch (_) {
    return null;
  }
}

/**
 * Generates a unique auth event ID: EVT_ + 16 random hex chars.
 */
function makeEventId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return 'EVT_' + hex;
}
