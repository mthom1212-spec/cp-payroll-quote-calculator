# Adding a new module or service

Quick reference for extending the quote builder. All prices live in
`src/constants/pricing.js`; all math lives in `src/lib/pricing-calc.js`
(fully tested — 89 tests today).

---

## Add a new core service module

Example: adding a "Compliance Reporting" module.

1. **Add to `PRICING_CONFIG` in `src/constants/pricing.js`.**
   Use the existing keys — the shape is documented by the other entries.
   ```js
   compliance: {
     id: 'compliance',
     name: 'Compliance Reporting',
     description: 'Federal, state, and local compliance report generation',
     baseFee: 0.00,
     pepm: 1.25,
     minimum: 45.00,
     defaultSetup: 500.00,
     hasYearEnd: false,
   },
   ```
   Add `hasYearEnd: true`, `yearEndBase`, `yearEndPerItem`, `yearEndName` if the
   module has a year-end fee.

2. **Add default selection.** In `PayrollQuoteCalculator.jsx`, the `selectedModules`
   initial `useState` sets each core module to `false` by default. Add your key.

3. **Add an icon.** In `src/components/Icons.jsx`, add a case to the `ModuleIcon`
   component's `map` object with a stroked SVG. Keep it visually similar to the
   other module icons (24×24 viewBox, 1.75 stroke width).

4. **Add services list (optional).** If you want a "Services Included" page for
   client-facing quotes, add an entry to `MODULE_SERVICES` in
   `src/constants/pricing.js`.

5. **Should 1099s count toward this module's per-payroll fee?** Yes for most
   payroll-adjacent modules — add the module id to the `MODULES_WITH_1099` array
   at the top of `calculateModuleCost` in `pricing-calc.js`. Skip for benefit-
   only or compliance-only modules.

That's it. All of these get for free:
- Renders on the module selector card grid
- Included in totals + discount logic
- Appears on the client quote table
- Appears on the Sales Summary revenue breakdown + CSV
- Selectable per-employee delta calculation

**Add a test** in `pricing-calc.test.js` verifying the per-payroll math for
your new module.

---

## Add a new ancillary service

Same steps, but use `ANCILLARY_PRICING` instead of `PRICING_CONFIG`.
Ancillary services auto-render as checkboxes in the "Ancillary Services"
disclosure in Quote Settings.

Ancillary-specific options:
- `monthlyBilling: true, monthlyPerUser: <rate>` — for services billed monthly
  (like Expense Tracking). The calc converts to per-payroll automatically.
- To enable "Rate override" UI, add the module id to the retirement/onboarding
  block in `PayrollQuoteCalculator.jsx` (search for `svc.id === 'retirement'`).

---

## Add a new one-time / specialty fee

Current examples: State Tax ID Application, PYTD Loading, Benefit EDI.

**Caveat:** These are structured differently — each has its own `useState`,
JSX card, calc function, snapshot field, and CSV row. If you add a 4th or 5th
of these, refactor first: pull the pattern into a `SPECIAL_FEES` array in
`constants/pricing.js` and a generic `<SpecialFeeCard>` component. See the
Bigger Lifts section of the audit doc for details.

For a single addition today:
1. Add pricing constants to `constants/pricing.js`.
2. Add a `useState` slot in `PayrollQuoteCalculator.jsx`.
3. Add a card block near the existing State Tax ID / PYTD cards.
4. Add the fee to the totals (both S-Corp and standard paths).
5. Add a row to the client quote table.
6. Add a line item to the Sales Summary (`SalesSummary.jsx`) and CSV.
7. Add fields to `saveCurrentQuote` snapshot + `loadQuote` restoration.
8. Add a test in `pricing-calc.test.js`.

---

## Pricing changes

Any dollar amount you see on the page comes from one of these files:
- `src/constants/pricing.js` — all module rates, ancillary rates, one-time
  fee constants (State Tax ID, PYTD, EDI, S-Corp, etc.)
- Nothing else. Any change to a rate is a single-file edit.

After changing a price, run `npm test` to confirm none of the pricing-math
tests broke (some tests use literal numbers — update those alongside the price).

---

## Deploy workflow

- `main` branch → production URL
- `staging` branch → `/preview/` URL for testing
- Every push to either branch triggers a build + test. If tests fail on main,
  deploy is blocked.

To ship a change to production: push to `staging`, verify at preview URL,
then merge `staging` → `main`.
