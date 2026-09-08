import { describe, expect, it } from 'vitest';
import { catalogFor, recurringAnnual, toggleService } from './studio-model';
import { calculateTotals } from './pricing-calc';
import { PRICING_CONFIG, ANCILLARY_PRICING, ANCILLARY_USAGE } from '../constants/pricing';

const state = (patch = {}) => ({
  employeeCount: 15, w2Count: '', count1099: '', expenseUserCount: '', frequency: 'biweekly',
  discountPercent: 0, discountOptOut: {}, selectedModules: { payroll: true }, selectedAncillary: {},
  setupFees: {}, ancillaryRateOverrides: {}, payrollBaseOverride: null, payrollYearEndRateOverride: null,
  annualFormsOverride: '', additionalJurisdictions: 0, sCorpMode: false,
  sCorpSetup: { included: true, amount: 750 }, benefitEdi: { enabled: false, feeds: 1, cobraBundle: false },
  stateTaxId: { enabled: false, quantity: 1 }, pytd: { enabled: false, hours: 0, statements: 0 }, ...patch,
});

describe('Studio presentation uses the existing pricing foundation', () => {
  it('exposes every existing option without replacing the pricing configuration', () => {
    const ids = catalogFor(state()).map(item => item.id);
    expect(ids).toEqual(expect.arrayContaining([...Object.keys(PRICING_CONFIG), ...Object.keys(ANCILLARY_PRICING), ...Object.keys(ANCILLARY_USAGE), 'benefitEdi', 'stateTaxId', 'pytd']));
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('shows current flat payroll rates but converts monthly services across frequencies', () => {
    const weekly = catalogFor(state({ frequency: 'weekly' }));
    const monthly = catalogFor(state({ frequency: 'monthly' }));
    expect(weekly.find(i => i.id === 'payroll').amount).toBe(monthly.find(i => i.id === 'payroll').amount);
    expect(weekly.find(i => i.id === 'expense').amount * 52).toBeCloseTo(monthly.find(i => i.id === 'expense').amount * 12);
  });
  it('reflects custom counts and discount exclusions in card amounts', () => {
    const items = catalogFor(state({ employeeCount: 25, w2Count: 60, count1099: 5, discountPercent: 10, discountOptOut: { retirement: true }, expenseUserCount: 12 }));
    expect(items.find(i => i.id === 'payroll').countLabel).toBe('25 employees + 5 contractors');
    expect(items.find(i => i.id === 'payroll').amount).toBeCloseTo(116.1);
    expect(items.find(i => i.id === 'retirement').amount).toBe(45);
    expect(items.find(i => i.id === 'expense').countLabel).toBe('12 users');
  });
  it('restricts S-Corp to payroll and specialty services, keeping distinct billing periods', () => {
    const items = catalogFor(state({ sCorpMode: true, frequency: 'annual', benefitEdi: { enabled: true, feeds: 1 } }));
    expect(items.map(i => i.id)).toEqual(['payroll', 'stateTaxId', 'pytd', 'benefitEdi']);
    expect(items.find(i => i.id === 'payroll')).toMatchObject({ amount: 1000, period: 'year' });
    expect(items.find(i => i.id === 'benefitEdi')).toMatchObject({ amount: 40, period: 'payroll' });
  });
  it('keeps annual recurring separate from annual processing', () => {
    const quote = state();
    const totals = calculateTotals(quote);
    expect(recurringAnnual(quote, totals)).toBe(88.5 * 26);
    expect(totals.totalYearEnd).toBe(254.25);
  });
  it('toggles only the relevant selection without altering rates', () => {
    const quote = state();
    const writes = [];
    toggleService('tlm', quote, (key, value) => writes.push([key, value]));
    expect(writes).toEqual([['selectedModules', { payroll: true, tlm: true }]]);
    const scWrites = [];
    toggleService('payroll', state({ sCorpMode: true }), (...args) => scWrites.push(args));
    expect(scWrites).toEqual([]);
  });
});
