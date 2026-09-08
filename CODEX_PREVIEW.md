# Codex Quote Builder preview

This branch is a separate interface experiment based on production commit `6badd15`.
Production and the GitHub Pages deployment workflow have not been changed.

## Run and compare

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 4174 --strictPort
```

- New workspace: `http://127.0.0.1:4174/cp-payroll-quote-calculator/`
- Original interface: the same URL with `?experience=classic`.
- The header's **Compare original** link opens the original interface in a new tab.
- The header's **?** opens a short guide specifically for this preview.

To return to the baseline, first commit or otherwise preserve any preview edits, then switch to `main`. Do not reset or force-push. `main` remains the production version.

## What changed

- Configure, Services, and Review & export workflow, with a live estimate beside the controls.
- Grouped, searchable core modules, recurring add-ons, specialty services, and usage rates.
- Per-service setup, rate overrides, count inputs, and discount exclusions.
- Accessible labels, keyboard focus indicators, and quieter navy/gold styling.
- Named browser drafts, overwrite confirmation, and explicit storage-error messages.
- Shared quote document renderer, with preview-scoped print fixes for long estimates.
- S-Corp exit remains accessible; switching back restores the standard settings from the same editing session.
- Corrected annual S-Corp row description to say per year.

## Architecture and data

- `src/lib/pricing-calc.js` and `src/constants/pricing.js` are unchanged.
- `PayrollQuoteCalculator.jsx` retains quote state and supplies both interfaces.
- `QuoteDocuments.jsx` is the single shared client/internal document renderer.
- `workspace/QuoteWorkspace.jsx` owns navigation and the live working estimate.
- `workspace/ServiceCatalog.jsx` renders configuration-driven service cards.
- `workspace/Fields.jsx` provides labeled and bounded inputs.
- `workspace/workspace.css` is scoped to the preview; print fixes are scoped to `.qw-documents`.

Preview storage key: `cpp-quote-builder:codex-preview:quotes:v1`.
Original storage key: `cpp-quote-builder:quotes`.
The preview does not read, migrate, or overwrite original saved quotes. Drafts contain the existing full quote snapshot. Unsaved work is not autosaved. Browser storage is local to the browser/origin and is not a backup or shared database.

The comparison interface is retained to support evaluation. Once a design is approved, the obsolete configuration JSX can be retired without changing the shared pricing engine or document renderer.

## Verification

```sh
npm test
npm run build
node node_modules/eslint/bin/eslint.js src/components/workspace src/components/QuoteDocuments.jsx src/App.jsx
```

The browser verification script uses Playwright and Microsoft Edge. With the local server running:

```powershell
# If Playwright is already installed in the environment, point to its package.
$env:CPP_PLAYWRIGHT_PACKAGE = 'path/to/node_modules/playwright'
node scripts/verify-codex-preview.mjs
```

The script uses an isolated browser context, checks arithmetic interactions, storage isolation, reload, S-Corp, output parity, and laptop overflow. It writes a report, screenshots, and four PDF samples into ignored `tmp/codex-qa/`. `CPP_PREVIEW_URL` and `CPP_BROWSER` can override the URL and Chromium browser channel.

Verified with 98 pricing tests and an Edge browser run. Sample PDF lengths after the preview print corrections: simple payroll 3 pages; adjusted multi-module 4; all services 5; annual owner-only S-Corp 1. Actual pagination varies with content, fonts, paper size, and printer settings. The all-services sample keeps the annual recap and ancillary rate sheet together and has no footer-only page.

## Inherited rules to review before a broad rollout

This preview preserves the existing billing rules. In particular, the optional W-2 count also drives recurring 401(k) integration, and the annual forms count override affects ACA as well as payroll. These relationships are described beside the inputs.

The existing S-Corp + benefit EDI total can mix quarterly/annual payroll billing with per-payroll EDI billing. The preview flags that mixed schedule in the working estimate; the underlying aggregation is unchanged. That edge case needs a business-rule decision before using that combination for a client agreement.

The original guide and original comparison interface remain unchanged. No production deployment is triggered by this branch.
