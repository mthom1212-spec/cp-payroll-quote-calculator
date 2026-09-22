// ---------------------------------------------------------------------------
// Shared passcode for the Quote Builder
// ---------------------------------------------------------------------------
// This is the ONLY file you edit to add, rotate, or remove a passcode.
//
// Passcodes are stored as SHA-256 hashes, not plain text, so the code itself
// isn't sitting in the published JavaScript. To get a hash for a new passcode,
// open the helper page at  /passcode.html  on the live site (or run
// `node -e "console.log(require('crypto').createHash('sha256').update('yourcode'.toLowerCase().trim()).digest('hex'))"`)
// and paste the result below with a comment saying what it is.
//
//   Add a code    → add a line to the array (both old and new codes work)
//   Rotate a code → add the new line, delete the old one
//   Revoke a code → delete its line (anyone remembered on that code is
//                    re-prompted the next time they load the tool)
//
// Entry is case-insensitive and ignores surrounding spaces.
//
// NOTE: this is a deterrent, not real security. The site is a static page, so
// there is no server to check the passcode against — a determined person could
// read the published bundle and get around it. It keeps casual visitors out;
// it does not protect anything you'd consider confidential.
export const ACCESS_CODE_HASHES = [
  // "CPPQuote2026" — shared team code, added 2026-09-22
  'd23959d565a1723e6eba60b13b465527aaa608ae4d89a9907211ca9596747002',
];

// Where the "remember this browser" flag lives. Bump the suffix to force every
// rep to re-enter a passcode on their next load.
export const ACCESS_STORAGE_KEY = 'cpp-quote-builder:access-v1';

/** SHA-256 hex digest of the normalized passcode. */
export const hashPasscode = async (raw) => {
  const normalized = String(raw || '').trim().toLowerCase();
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};
