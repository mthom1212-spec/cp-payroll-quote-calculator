import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CPP_PLAYWRIGHT_PACKAGE || 'playwright');
const base = process.env.CPP_PREVIEW_URL || 'http://127.0.0.1:4174/cp-payroll-quote-calculator/';
const output = 'tmp/codex-qa';
fs.mkdirSync(output, { recursive: true });
const key = 'cpp-quote-builder:codex-preview:quotes:v1';
const classicKey = 'cpp-quote-builder:quotes';
const browser = await chromium.launch({ channel: process.env.CPP_BROWSER || 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const amount = async expected => {
  await page.waitForFunction(value => document.querySelector('.qw-estimate-amount')?.textContent === value, expected);
};
const nav = name => page.getByRole('navigation', { name: 'Quote workflow' }).getByRole('button', { name }).click();
const openDetails = async name => {
  const summary = page.locator('summary').filter({ hasText: name }).first();
  if (!(await summary.evaluate(el => el.parentElement.open))) await summary.click();
};
const screenshot = name => page.screenshot({ path: output + '/' + name + '.png', fullPage: true });
const reports = [];
try {
  await page.goto(base);
  await amount('$88.50');
  await page.evaluate(k => localStorage.setItem(k, JSON.stringify({ sentinel: { clientName: 'Original protected' } })), classicKey);
  await page.getByLabel('Company name', { exact: true }).fill('Northstar Studio');
  await page.getByLabel('Quote date', { exact: true }).fill('2026-09-07');
  await page.getByRole('button', { name: 'Saved quotes', exact: true }).click();
  await page.getByLabel('Quote name', { exact: true }).fill('Baseline');
  await page.getByRole('button', { name: 'Save current quote', exact: true }).click();
  await page.getByRole('button', { name: 'Close saved quotes' }).click();
  const baseline = await page.evaluate(k => JSON.parse(localStorage.getItem(k)).Baseline, key);
  await screenshot('configure');

  await page.getByLabel('Active employees', { exact: true }).fill('25');
  await page.getByLabel('Recurring discount (%)', { exact: true }).fill('10');
  await amount('$103.95');
  await nav('Services Build');
  for (const id of ['tlm', 'hcm', 'aca']) await page.locator('[data-service="' + id + '"]').getByRole('checkbox', { name: 'Add', exact: true }).check();
  await amount('$238.95');
  await screenshot('services');
  await page.getByRole('button', { name: 'Recurring add-ons', exact: true }).click();
  await page.getByLabel('Search services in this category').fill('expense');
  const expense = page.locator('[data-service="expense"]');
  await expense.getByRole('checkbox', { name: 'Add', exact: true }).check();
  await expense.getByLabel('Expense tracking users').fill('12');
  await amount('$253.90');
  await page.getByLabel('Search services in this category').fill('retirement-no-match');
  assert.match(await page.locator('.qw-empty').innerText(), /No matching/);
  await page.getByLabel('Search services in this category').fill('401');
  const retirement = page.locator('[data-service="retirement"]');
  await retirement.getByRole('checkbox', { name: 'Add', exact: true }).check();
  await retirement.locator('summary').filter({ hasText: 'Rate & discount' }).click();
  await retirement.getByLabel('Do not apply recurring discount').check();
  await retirement.getByLabel('Rate per employee ($)', { exact: true }).fill('1');
  await retirement.getByLabel('Minimum per payroll ($)', { exact: true }).fill('20');
  await amount('$278.90');

  await nav('Configure');
  await openDetails('Different W-2');
  await page.getByLabel('Approximate W-2s', { exact: true }).fill('40');
  await page.getByLabel('Approximate 1099s', { exact: true }).fill('5');
  await amount('$330.35');
  await openDetails('Annual processing adjustments');
  await page.getByLabel('Annual forms count override').fill('60');
  await page.getByLabel('W-2 / 1099 rate per form ($)', { exact: true }).fill('8.25');
  await page.getByLabel('Include representative contact information').check();
  await page.getByLabel('Representative name', { exact: true }).fill('Alex Morgan');
  await page.getByLabel('Phone number', { exact: true }).fill('555-010-0123');

  await nav('Services Build');
  const payroll = page.locator('[data-service="payroll"]');
  await payroll.locator('summary').filter({ hasText: 'Rate & discount' }).click();
  await payroll.getByLabel('Override payroll base rate', { exact: true }).check();
  await payroll.getByLabel('Base rate per payroll ($)', { exact: true }).fill('150');
  await amount('$422.15');
  await nav('Configure');
  await page.getByLabel('Pay frequency', { exact: true }).selectOption('monthly');
  await nav('Services Build');
  await payroll.locator('summary').filter({ hasText: 'Rate & discount' }).click();
  assert.equal(await payroll.getByLabel('Base rate per payroll ($)', { exact: true }).inputValue(), '150');
  await nav('Configure');
  await page.getByLabel('Pay frequency', { exact: true }).selectOption('biweekly');
  await amount('$422.15');

  await page.getByRole('button', { name: 'Saved quotes', exact: true }).click();
  await page.getByLabel('Quote name', { exact: true }).fill('Adjusted');
  await page.getByRole('button', { name: 'Save current quote', exact: true }).click();
  const adjusted = await page.evaluate(k => JSON.parse(localStorage.getItem(k)).Adjusted, key);
  assert.equal(adjusted.expenseUserCount, 12);
  assert.equal(adjusted.annualFormsOverride, 60);
  assert.equal(adjusted.discountOptOut.retirement, true);
  assert.equal(adjusted.payrollBaseOverride, 150);
  assert.equal(await page.evaluate(k => JSON.parse(localStorage.getItem(k)).sentinel.clientName, classicKey), 'Original protected');
  await page.reload();
  await page.getByRole('button', { name: 'Saved quotes', exact: true }).click();
  await page.locator('.qw-draft-list>div').filter({ hasText: 'Adjusted' }).getByRole('button', { name: 'Load', exact: true }).click();
  await amount('$422.15');
  reports.push('Interactive arithmetic: headcounts, discount exclusion, user counts, base/rate/minimum overrides, frequency change, save/reload and storage isolation');

  // Load complete snapshots into an isolated browser; each matches a named saved quote.
  const seeded = async (snapshot, classic = false) => {
    await page.goto(base + (classic ? '?experience=classic' : ''));
    await page.evaluate(({ storageKey, snapshot }) => localStorage.setItem(storageKey, JSON.stringify({ Sample: snapshot })),
      { storageKey: classic ? classicKey : key, snapshot });
    await page.reload();
    if (classic) await page.getByRole('button', { name: 'Load', exact: true }).click();
    else {
      await page.getByRole('button', { name: 'Saved quotes', exact: true }).click();
      await page.getByRole('button', { name: 'Load', exact: true }).click();
      await nav('Review & export');
    }
  };
  const all = structuredClone(baseline);
  all.selectedModules = Object.fromEntries(Object.keys(all.selectedModules).map(k => [k, true]));
  all.selectedAncillary = Object.fromEntries(Object.keys(all.selectedAncillary).map(k => [k, true]));
  all.benefitEdi = { enabled: true, feeds: 2, cobraBundle: true };
  all.stateTaxId = { enabled: true, quantity: 2 };
  all.pytd = { enabled: true, hours: 2.5, statements: 500 };
  all.discountPercent = 5;
  all.discountOptOut = { retirement: true };
  all.showRepInfo = true;
  all.repName = 'Alex Morgan';
  all.repPhone = '555-010-0123';
  const scorp = { ...baseline, sCorpMode: true, employeeCount: 1, frequency: 'annual' };
  const scenarios = { simple: baseline, adjusted, 'all-services': all, scorp };
  for (const [name, snapshot] of Object.entries(scenarios)) {
    await seeded(snapshot);
    const previewText = await page.locator('.qw-documents').innerText();
    assert.ok(previewText.includes('Northstar Studio'));
    await page.pdf({ path: output + '/' + name + '.pdf', format: 'Letter', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false });
    if (name === 'simple') await screenshot('review');
    await seeded(snapshot, true);
    const originalText = (await page.locator('.print-container').allInnerTexts()).join('\n');
    assert.equal(previewText.replace(/\s+/g, ' ').trim(), originalText.replace(/\s+/g, ' ').trim(), 'Document parity: ' + name);
    reports.push('Document parity and PDF: ' + name);
  }

  await seeded(scorp);
  await nav('Configure');
  assert.equal(await page.getByLabel('Owner-only S-Corp payroll', { exact: true }).isChecked(), true);
  await page.getByLabel('Owner-only S-Corp payroll', { exact: true }).uncheck();
  await amount('$88.50');
  await page.getByLabel('Active employees', { exact: true }).fill('27');
  await openDetails('Special payroll scenario');
  await page.getByLabel('Owner-only S-Corp payroll', { exact: true }).check();
  await amount('$250.00');
  await page.getByLabel('Pay frequency', { exact: true }).selectOption('annual');
  await amount('$1,000.00');
  await nav('Services Build');
  assert.equal(await page.locator('[data-service]').count(), 1);
  await page.getByRole('button', { name: 'Specialty services', exact: true }).click();
  await page.locator('.qw-service').filter({ hasText: 'State Tax ID Application' }).getByRole('checkbox').check();
  await nav('Review & export');
  await nav('Configure');
  await page.getByLabel('Owner-only S-Corp payroll', { exact: true }).uncheck();
  assert.equal(await page.getByLabel('Active employees', { exact: true }).inputValue(), '27');
  reports.push('S-Corp enter/exit, annual billing, specialty service access and standard configuration restore');

  // Keyboard labels, laptop overflow, output controls and print visibility.
  await seeded(baseline);
  assert.equal(await page.getByRole('button', { name: 'Client facing', exact: true }).getAttribute('aria-pressed'), 'true');
  await page.getByRole('button', { name: 'Internal sales', exact: true }).click();
  assert.match(await page.locator('.qw-documents').innerText(), /Annual Est/i);
  await page.getByRole('button', { name: 'Client facing', exact: true }).click();
  assert.equal(await page.locator('.qw-documents>.print-container').count(), 3);
  for (const width of [1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await nav('Configure');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, 'Laptop overflow: ' + width);
  }
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('.qw-header').isVisible(), false);
  assert.equal(await page.locator('.qw-documents').isVisible(), true);
  reports.push('Client/internal view, three laptop widths and print visibility from configuration');
  assert.deepEqual(errors, []);
  fs.writeFileSync(output + '/report.json', JSON.stringify({ passed: reports, browserErrors: errors }, null, 2));
  console.log(JSON.stringify({ passed: reports, browserErrors: errors }, null, 2));
} finally {
  await browser.close();
}
