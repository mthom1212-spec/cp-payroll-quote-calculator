# Quote Studio preview

A separate redesign on `codex/quote-studio`. Production remains on `main`; this branch is not a deployment. The earlier preview is preserved on `codex/quote-builder-workspace`.

## Try it

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 4175 --strictPort
```

Open http://127.0.0.1:4175/cp-payroll-quote-calculator/.

- **Build quote:** enter the client, employee count and frequency, then add services from the four catalog tabs. Search spans all categories; Ctrl+K focuses search.
- **Details & pricing:** open a service's side panel for included services, setup fees, counts and supported overrides. Client details contains W-2/1099 counts, representative information and the owner-only S-Corp option.
- **Live estimate:** review recurring, one-time, annual processing and annual recurring amounts separately. The discount link opens quote-wide pricing adjustments.
- **Document preview:** choose Client proposal or Internal sales, review the document, then print or save a PDF. Turn off the browser's headers and footers to omit its URL and date.
- **Save draft / Saved quotes:** save by name, reopen or delete. Overwriting requires confirmation. Drafts are stored only in this browser on this device; there is no account, backend or team synchronization. Changes are not autosaved.
- **A quick tour:** opens a short guide within the app.

Preview drafts use `cpp-quote-builder:studio:quotes:v2`, separate from the production and earlier-preview keys. Different browser ports also have separate storage. Export any document you need to retain outside this browser.

## Pricing preservation

This branch merges production commit `481efa8`. `src/lib/pricing-calc.js` and `src/constants/pricing.js` match that commit. In particular, core and ancillary per-payroll rates remain flat across frequencies. Monthly services retain their existing conversion to a per-payroll equivalent. Count routing, discounts, exclusions, overrides, minimums and annual processing formulas are unchanged.

The new catalog uses the existing calculation functions through `src/lib/studio-model.js`. The original-interface comparison at `?experience=classic` uses the same state and document renderer. The separate earlier preview on port 4174 is a visual reference and predates the latest flat-rate production change.

For owner-only S-Corp quotes with EDI, the document labels each billing schedule separately instead of presenting a combined per-quarter/per-payroll amount. Calculated fees remain unchanged.

## Design and files

The navy sidebar, searchable service catalog, side-panel editors, live estimate and document workspace are in `src/components/studio/`. Styles are scoped to that workspace. DM Sans and Source Serif 4 are served locally with their OFL licenses; the preview does not depend on a Google Fonts connection. Decorative treatments use CSS and SVG; Blender is not connected or required.

## Validation — September 8, 2026

- 105 tests passed: 99 existing pricing tests and six catalog/presentation-model tests.
- Vite production build passed. ESLint passed for the new Studio components, model, tests and browser-check script.
- `scripts/verify-studio.mjs` passed in an isolated Edge context: pricing interactions, frequency behavior, separate user/W-2/1099 counts, discounts and exclusions, save/load, storage isolation, S-Corp entry/exit, client/internal outputs, search, modal keyboard behavior and laptop widths 1280/1440/1920.
- Complete document text matched the original-interface comparison for five scenarios: simple, adjusted, all services, S-Corp and mixed billing schedules. No browser application errors were observed.
- Five PDF samples generated and inspected for pagination. Simple: 3 pages; adjusted: 4; all services: 5; S-Corp: 1; mixed: 1. Long estimates continue normally before the annual recap/rate sheet and included-services sections. No empty trailing pages or overlapping sections in these samples.

To repeat browser checks, provide Playwright (with Edge installed), start the preview and run:

```sh
node scripts/verify-studio.mjs
```

Optional environment variables: `CPP_PLAYWRIGHT_PACKAGE` (installed package path), `CPP_PREVIEW_URL`, and `CPP_BROWSER` (defaults to `msedge`). Screenshots, PDFs and the report go to ignored `tmp/studio-qa/`. The earlier `verify-codex-preview.mjs` script targets the first preview branch, not this interface.

## Returning to the previous version

Production is unchanged. Keep this branch to retain the redesign, and use `main` for production or `codex/quote-builder-workspace` for the earlier preview. Preserve uncommitted edits before switching branches; no reset or force-push is necessary. Local preview servers must be restarted after a reboot.
