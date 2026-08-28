import { describe, it, expect } from 'vitest';
import { PRICING_CONFIG, ANCILLARY_PRICING, FREQUENCIES } from '../constants/pricing';
import {
  getMultiplier,
  getW2Headcount,
  getExpenseUserCount,
  getCount1099,
  calculateModuleCost,
  calculateSCorpCost,
  calculateBenefitEdiOneTime,
  calculateBenefitEdiRecurring,
  calculateStateTaxIdTotal,
  calculatePytdTotal,
  calculateTotals,
  totalPerPayrollAt,
  STATE_TAX_ID_PER_ID,
  BENEFIT_EDI_FIRST_FEED,
  BENEFIT_EDI_ADDL_FEED,
} from './pricing-calc';

// ---- Helper to build a minimally-populated state object ----
const baseState = (overrides = {}) => ({
  employeeCount: 15,
  w2Count: '',
  count1099: '',
  frequency: 'biweekly',
  payrollBaseOverride: null,
  payrollYearEndRateOverride: null,
  annualFormsOverride: '',
  additionalJurisdictions: 0,
  expenseUserCount: '',
  ancillaryRateOverrides: {},
  setupFees: {},
  selectedModules: {},
  selectedAncillary: {},
  discountPercent: 0,
  discountOptOut: {},
  benefitEdi: { enabled: false, feeds: 1, cobraBundle: false },
  stateTaxId: { enabled: false, quantity: 1 },
  pytd: { enabled: false, hours: 0, statements: 0 },
  sCorpMode: false,
  sCorpSetup: { included: true, amount: 750 },
  ...overrides,
});

// helper: close to N decimal places (avoid FP noise)
const near = (a, b, precision = 2) => expect(a).toBeCloseTo(b, precision);

// =============================================================
// Frequency helpers
// =============================================================
describe('getMultiplier', () => {
  it('returns 1 for bi-weekly (baseline)', () => {
    expect(getMultiplier('biweekly')).toBe(1);
  });
  it('returns 0.5 for weekly (26/52)', () => {
    expect(getMultiplier('weekly')).toBe(0.5);
  });
  it('returns 26/24 for semi-monthly', () => {
    near(getMultiplier('semimonthly'), 26 / 24);
  });
  it('returns 26/12 for monthly', () => {
    near(getMultiplier('monthly'), 26 / 12);
  });
  it('returns 26/4 for quarterly', () => {
    expect(getMultiplier('quarterly')).toBe(6.5);
  });
  it('returns 26 for annual', () => {
    expect(getMultiplier('annual')).toBe(26);
  });
});

// =============================================================
// Headcount helpers
// =============================================================
describe('getW2Headcount', () => {
  it('defaults to employeeCount when w2Count is empty', () => {
    expect(getW2Headcount({ w2Count: '', employeeCount: 15 })).toBe(15);
  });
  it('uses w2Count when set to a positive number', () => {
    expect(getW2Headcount({ w2Count: '25', employeeCount: 15 })).toBe(25);
  });
  it('falls back to employeeCount when w2Count is zero', () => {
    expect(getW2Headcount({ w2Count: '0', employeeCount: 15 })).toBe(15);
  });
});

describe('getCount1099', () => {
  it('is 0 when not set', () => {
    expect(getCount1099({ count1099: '' })).toBe(0);
  });
  it('parses integer input', () => {
    expect(getCount1099({ count1099: '5' })).toBe(5);
  });
});

describe('getExpenseUserCount', () => {
  it('defaults to employeeCount', () => {
    expect(getExpenseUserCount({ expenseUserCount: '', employeeCount: 20 })).toBe(20);
  });
  it('uses expenseUserCount when set', () => {
    expect(getExpenseUserCount({ expenseUserCount: '30', employeeCount: 20 })).toBe(30);
  });
});

// =============================================================
// Core module: Payroll Processing
// =============================================================
describe('calculateModuleCost - payroll', () => {
  it('bi-weekly baseline (15 emp): $48 base + $2.70 × 15 = $88.50', () => {
    const c = calculateModuleCost('payroll', PRICING_CONFIG, baseState());
    near(c.perPayroll, 48 + 2.70 * 15); // 88.50
    expect(c.isMinApplied).toBe(false);
  });

  it('applies $75 minimum when raw cost is lower (5 emp: $48 + $13.50 = $61.50 → $75)', () => {
    const c = calculateModuleCost('payroll', PRICING_CONFIG, baseState({ employeeCount: 5 }));
    near(c.perPayroll, 75);
    expect(c.isMinApplied).toBe(true);
  });

  it('honors payrollBaseOverride (per-payroll fixed rate, no frequency adjustment)', () => {
    const c = calculateModuleCost('payroll', PRICING_CONFIG, baseState({
      payrollBaseOverride: 100,
    }));
    near(c.perPayroll, 100 + 2.70 * 15); // 140.50
  });

  it('adds jurisdiction fees ($10/ea) to per-payroll', () => {
    const c = calculateModuleCost('payroll', PRICING_CONFIG, baseState({
      additionalJurisdictions: 3,
    }));
    near(c.perPayroll, 88.50 + 30);
  });

  it('scales rates by frequency multiplier (monthly = ×26/12)', () => {
    const c = calculateModuleCost('payroll', PRICING_CONFIG, baseState({ frequency: 'monthly' }));
    const m = 26 / 12;
    near(c.perPayroll, (48 * m) + (2.70 * m * 15));
  });

  it('computes year-end: $150 base + $6.95 × 15 W-2s = $254.25', () => {
    const c = calculateModuleCost('payroll', PRICING_CONFIG, baseState());
    near(c.yearEnd, 150 + 6.95 * 15);
  });

  it('combines W-2s + 1099s for year-end fee', () => {
    const c = calculateModuleCost('payroll', PRICING_CONFIG, baseState({
      w2Count: '20',
      count1099: '5',
    }));
    near(c.yearEnd, 150 + 6.95 * 25);
  });

  it('honors payrollYearEndRateOverride', () => {
    const c = calculateModuleCost('payroll', PRICING_CONFIG, baseState({
      w2Count: '20',
      count1099: '5',
      payrollYearEndRateOverride: 5.00,
    }));
    near(c.yearEnd, 150 + 5.00 * 25);
  });

  it('annual = perPayroll × periods + yearEnd', () => {
    const c = calculateModuleCost('payroll', PRICING_CONFIG, baseState());
    near(c.annual, 88.50 * 26 + (150 + 6.95 * 15));
  });
});

// =============================================================
// 1099 contractors count toward per-payroll headcount
// (payroll, TLM, HCM, Full Service — excluded: ACA, retirement, expense)
// =============================================================
describe('1099s in per-payroll headcount', () => {
  it('payroll: 15 emp + 5 1099s = 20 headcount → $48 + $2.70×20 = $102', () => {
    const c = calculateModuleCost('payroll', PRICING_CONFIG, baseState({
      count1099: '5',
    }));
    near(c.perPayroll, 48 + 2.70 * 20);
  });

  it('TLM: 25 emp + 10 1099s = 35 headcount → $2.70×35 = $94.50', () => {
    const c = calculateModuleCost('tlm', PRICING_CONFIG, baseState({
      employeeCount: 25,
      count1099: '10',
    }));
    near(c.perPayroll, 2.70 * 35);
  });

  it('HCM: 30 emp + 5 1099s = 35 headcount → $2.70×35 = $94.50', () => {
    const c = calculateModuleCost('hcm', PRICING_CONFIG, baseState({
      employeeCount: 30,
      count1099: '5',
    }));
    near(c.perPayroll, 2.70 * 35);
  });

  it('Full Service: 20 emp + 5 1099s = 25 → $4.50×25 = $112.50', () => {
    const c = calculateModuleCost('fullService', PRICING_CONFIG, baseState({
      employeeCount: 20,
      count1099: '5',
    }));
    near(c.perPayroll, 4.50 * 25);
  });

  it('ACA (excluded): 1099s do NOT count in per-payroll', () => {
    const c = calculateModuleCost('aca', PRICING_CONFIG, baseState({
      count1099: '5', // ignored for ACA
    }));
    near(c.perPayroll, 0.60 * 15); // employees only
  });

  it('Retirement (excluded): 1099s do NOT count — still uses W-2 head', () => {
    const c = calculateModuleCost('retirement', ANCILLARY_PRICING, baseState({
      employeeCount: 100,
      count1099: '20', // ignored for retirement
    }));
    near(c.perPayroll, 0.75 * 100); // W-2 head = 100 (well above $40 min)
  });

  it('Expense (excluded): 1099s do NOT count — uses expenseUserCount', () => {
    const c = calculateModuleCost('expense', ANCILLARY_PRICING, baseState({
      employeeCount: 10,
      count1099: '5', // ignored for expense
      frequency: 'monthly',
    }));
    near(c.perPayroll, 3 * 10); // expense users only
  });
});

// =============================================================
// Annual W-2/1099 form count override (for high-turnover clients)
// =============================================================
describe('annualFormsOverride (annual form count)', () => {
  it('overrides the combined form count used in year-end calculation', () => {
    // 250 annual forms × $6.95 + $150 base = $1,887.50
    const c = calculateModuleCost('payroll', PRICING_CONFIG, baseState({
      w2Count: '200',
      count1099: '50', // ignored for year-end when override set
      annualFormsOverride: 250,
    }));
    near(c.yearEnd, 150 + 6.95 * 250);
  });

  it('override count is billed at the (also-overridable) rate', () => {
    const c = calculateModuleCost('payroll', PRICING_CONFIG, baseState({
      annualFormsOverride: 100,
      payrollYearEndRateOverride: 5.00,
    }));
    near(c.yearEnd, 150 + 5.00 * 100);
  });

  it('empty string / null falls back to w2Head + forms1099', () => {
    const cEmpty = calculateModuleCost('payroll', PRICING_CONFIG, baseState({
      annualFormsOverride: '',
    }));
    near(cEmpty.yearEnd, 150 + 6.95 * 15); // 15 W-2s + 0 1099s
    const cNull = calculateModuleCost('payroll', PRICING_CONFIG, baseState({
      annualFormsOverride: null,
    }));
    near(cNull.yearEnd, 150 + 6.95 * 15);
  });

  it('S-Corp: annual form count override replaces the count', () => {
    // 5 annual forms × $6.95 + $150 = $184.75
    const sc = calculateSCorpCost(baseState({
      sCorpMode: true,
      employeeCount: 1,
      annualFormsOverride: 5,
    }));
    near(sc.yearEnd, 150 + 6.95 * 5);
  });

  it('does not affect per-payroll or per-payroll annual', () => {
    const c = calculateModuleCost('payroll', PRICING_CONFIG, baseState({
      annualFormsOverride: 500,
    }));
    // per-payroll unchanged
    near(c.perPayroll, 48 + 2.70 * 15);
    // annual = perPayroll × periods + overridden yearEnd
    const expectedYearEnd = 150 + 6.95 * 500;
    near(c.annual, (48 + 2.70 * 15) * 26 + expectedYearEnd);
  });
});

// =============================================================
// Core module: TLM, HCM, ACA, Full Service
// =============================================================
describe('calculateModuleCost - other core modules', () => {
  it('TLM: bi-weekly 15 emp → $2.70 × 15 = $40.50, min $50 applied', () => {
    const c = calculateModuleCost('tlm', PRICING_CONFIG, baseState());
    near(c.perPayroll, 50); // minimum kicks in
    expect(c.isMinApplied).toBe(true);
  });

  it('TLM: 25 emp = $67.50, above min', () => {
    const c = calculateModuleCost('tlm', PRICING_CONFIG, baseState({ employeeCount: 25 }));
    near(c.perPayroll, 2.70 * 25);
    expect(c.isMinApplied).toBe(false);
  });

  it('HCM: bi-weekly 15 emp → $40.50 raw, min $60 applied', () => {
    const c = calculateModuleCost('hcm', PRICING_CONFIG, baseState());
    near(c.perPayroll, 60);
    expect(c.isMinApplied).toBe(true);
  });

  it('ACA: no minimum, no base, just $0.60/emp = $9.00 for 15 emp', () => {
    const c = calculateModuleCost('aca', PRICING_CONFIG, baseState());
    near(c.perPayroll, 9);
    expect(c.isMinApplied).toBe(false);
  });

  it('ACA year-end uses W-2 count (not 1099 combined)', () => {
    const c = calculateModuleCost('aca', PRICING_CONFIG, baseState({
      w2Count: '30',
      count1099: '10', // shouldn't affect ACA
    }));
    near(c.yearEnd, 150 + 6.95 * 30);
  });

  it('Full Service: $4.50/emp × 15 = $67.50, above $50 min', () => {
    const c = calculateModuleCost('fullService', PRICING_CONFIG, baseState());
    near(c.perPayroll, 4.50 * 15);
  });
});

// =============================================================
// 360 401(k) retirement: uses W-2 headcount
// =============================================================
describe('calculateModuleCost - retirement (360 401k) uses W-2 count', () => {
  it('defaults to employeeCount when W-2s blank', () => {
    const c = calculateModuleCost('retirement', ANCILLARY_PRICING, baseState({ employeeCount: 100 }));
    near(c.perPayroll, 0.75 * 100);
  });

  it('uses W-2 count when set (bills against higher turnover count)', () => {
    const c = calculateModuleCost('retirement', ANCILLARY_PRICING, baseState({
      employeeCount: 50,
      w2Count: '120',
    }));
    near(c.perPayroll, 0.75 * 120);
  });

  it('respects rate override', () => {
    const c = calculateModuleCost('retirement', ANCILLARY_PRICING, baseState({
      employeeCount: 100,
      ancillaryRateOverrides: { retirement: { pepm: 1.00, minimum: null } },
    }));
    near(c.perPayroll, 1.00 * 100);
  });

  it('applies $40 minimum for tiny headcounts', () => {
    const c = calculateModuleCost('retirement', ANCILLARY_PRICING, baseState({
      employeeCount: 5,
    }));
    near(c.perPayroll, 40);
    expect(c.isMinApplied).toBe(true);
  });
});

// =============================================================
// Expense Tracking (monthly billing → converted to per-period)
// =============================================================
describe('calculateModuleCost - Expense Tracking (monthly billed)', () => {
  it('semi-monthly: $3/user/month × 12 / 24 = $1.50/user; 10 users = $15/period', () => {
    const c = calculateModuleCost('expense', ANCILLARY_PRICING, baseState({
      frequency: 'semimonthly',
      employeeCount: 10,
    }));
    near(c.perPayroll, 15);
  });

  it('bi-weekly: $3 × 12 / 26 ≈ $1.385/user; 10 users ≈ $13.85', () => {
    const c = calculateModuleCost('expense', ANCILLARY_PRICING, baseState({
      employeeCount: 10,
    }));
    near(c.perPayroll, 3 * 12 / 26 * 10);
  });

  it('uses separate expense user count when set', () => {
    const c = calculateModuleCost('expense', ANCILLARY_PRICING, baseState({
      employeeCount: 10,
      expenseUserCount: '25',
      frequency: 'monthly',
    }));
    near(c.perPayroll, 3 * 25);
  });

  it('annual x users x 12 = pure monthly billed total × 12', () => {
    const c = calculateModuleCost('expense', ANCILLARY_PRICING, baseState({
      employeeCount: 10,
    }));
    near(c.annual, 3 * 12 * 10); // $360/yr regardless of frequency
  });
});

// =============================================================
// S-Corp owner-only payroll
// =============================================================
describe('calculateSCorpCost', () => {
  it('bi-weekly: $48 per payroll', () => {
    const c = calculateSCorpCost(baseState({ sCorpMode: true }));
    near(c.perPeriod, 48);
    expect(c.periodLabel).toBe('payroll');
  });

  it('monthly: flat $250/quarter treated as quarterly billing (label = quarter)', () => {
    const c = calculateSCorpCost(baseState({ sCorpMode: true, frequency: 'monthly' }));
    near(c.perPeriod, 250);
    expect(c.periodLabel).toBe('quarter');
  });

  it('quarterly: $250/quarter', () => {
    const c = calculateSCorpCost(baseState({ sCorpMode: true, frequency: 'quarterly' }));
    near(c.perPeriod, 250);
    expect(c.periodLabel).toBe('quarter');
  });

  it('annual: $1000 flat', () => {
    const c = calculateSCorpCost(baseState({ sCorpMode: true, frequency: 'annual' }));
    near(c.perPeriod, 1000);
    near(c.annual, 1000);
    expect(c.periodLabel).toBe('year');
  });

  it('year-end: $150 base + $6.95 × 1 = $156.95', () => {
    const c = calculateSCorpCost(baseState({ sCorpMode: true, employeeCount: 1 }));
    near(c.yearEnd, 150 + 6.95);
  });

  it('year-end combines W-2s and 1099s', () => {
    const c = calculateSCorpCost(baseState({
      sCorpMode: true,
      employeeCount: 1,
      count1099: '2',
    }));
    near(c.yearEnd, 150 + 6.95 * 3);
  });

  it('year-end honors rate override', () => {
    const c = calculateSCorpCost(baseState({
      sCorpMode: true,
      employeeCount: 1,
      payrollYearEndRateOverride: 5.00,
    }));
    near(c.yearEnd, 150 + 5.00);
  });

  it('includes jurisdiction fees in perPeriod', () => {
    const c = calculateSCorpCost(baseState({
      sCorpMode: true,
      additionalJurisdictions: 2,
    }));
    near(c.perPeriod, 48 + 20);
  });
});

// =============================================================
// Benefit EDI
// =============================================================
describe('calculateBenefitEdiOneTime', () => {
  it('returns 0 when disabled', () => {
    expect(calculateBenefitEdiOneTime({ enabled: false, feeds: 5 })).toBe(0);
  });
  it('1 feed = $1,195', () => {
    expect(calculateBenefitEdiOneTime({ enabled: true, feeds: 1 })).toBe(BENEFIT_EDI_FIRST_FEED);
  });
  it('3 feeds = $1,195 + 2 × $995 = $3,185', () => {
    expect(calculateBenefitEdiOneTime({ enabled: true, feeds: 3 }))
      .toBe(BENEFIT_EDI_FIRST_FEED + 2 * BENEFIT_EDI_ADDL_FEED);
  });
  it('handles 0 feeds gracefully', () => {
    expect(calculateBenefitEdiOneTime({ enabled: true, feeds: 0 })).toBe(0);
  });
});

describe('calculateBenefitEdiRecurring', () => {
  it('returns zeros when disabled', () => {
    const r = calculateBenefitEdiRecurring({
      benefitEdi: { enabled: false },
      employeeCount: 100,
      frequency: 'biweekly',
    });
    expect(r.perPayroll).toBe(0);
  });

  it('bi-weekly standard: $0.75 × 100 = $75 (above $40 min)', () => {
    const r = calculateBenefitEdiRecurring({
      benefitEdi: { enabled: true, cobraBundle: false },
      employeeCount: 100,
      frequency: 'biweekly',
    });
    near(r.perPayroll, 75);
    expect(r.isMinApplied).toBe(false);
  });

  it('bi-weekly with COBRA bundle: $0.90 × 100 = $90', () => {
    const r = calculateBenefitEdiRecurring({
      benefitEdi: { enabled: true, cobraBundle: true },
      employeeCount: 100,
      frequency: 'biweekly',
    });
    near(r.perPayroll, 90);
  });

  it('applies $40 minimum for tiny headcounts', () => {
    const r = calculateBenefitEdiRecurring({
      benefitEdi: { enabled: true, cobraBundle: false },
      employeeCount: 10,
      frequency: 'biweekly',
    });
    near(r.perPayroll, 40);
    expect(r.isMinApplied).toBe(true);
  });

  it('annual = perPayroll × periods (bi-weekly)', () => {
    const r = calculateBenefitEdiRecurring({
      benefitEdi: { enabled: true, cobraBundle: false },
      employeeCount: 100,
      frequency: 'biweekly',
    });
    near(r.annual, 75 * 26);
  });
});

// =============================================================
// One-time fees
// =============================================================
describe('calculateStateTaxIdTotal', () => {
  it('returns 0 when disabled', () => {
    expect(calculateStateTaxIdTotal({ enabled: false, quantity: 3 })).toBe(0);
  });
  it('$250 × quantity', () => {
    expect(calculateStateTaxIdTotal({ enabled: true, quantity: 3 }))
      .toBe(STATE_TAX_ID_PER_ID * 3);
  });
});

describe('calculatePytdTotal', () => {
  it('returns 0 when disabled', () => {
    expect(calculatePytdTotal({ enabled: false, hours: 10, statements: 100 })).toBe(0);
  });
  it('$150/hr × 4 = $600', () => {
    expect(calculatePytdTotal({ enabled: true, hours: 4, statements: 0 })).toBe(600);
  });
  it('$0.10/statement × 500 = $50', () => {
    expect(calculatePytdTotal({ enabled: true, hours: 0, statements: 500 })).toBe(50);
  });
  it('combines hours + statements', () => {
    near(calculatePytdTotal({ enabled: true, hours: 4, statements: 500 }), 650);
  });
});

// =============================================================
// Aggregate totals with discount opt-out
// =============================================================
describe('calculateTotals - discount handling', () => {
  it('no discount, no opt-out: subtotal == final', () => {
    const t = calculateTotals(baseState({
      selectedModules: { payroll: true },
    }));
    near(t.finalPerPayroll, t.subtotalPerPayroll);
    expect(t.discountPerPayroll).toBe(0);
  });

  it('10% discount applies to all when nothing opted out', () => {
    const t = calculateTotals(baseState({
      selectedModules: { payroll: true },
      discountPercent: 10,
    }));
    near(t.discountPerPayroll, t.subtotalPerPayroll * 0.10);
    near(t.finalPerPayroll, t.subtotalPerPayroll * 0.90);
  });

  it('10% discount excludes opted-out modules from discount calculation', () => {
    // Payroll (discountable) 15 emp = 88.50
    // Retirement (opted out) 100 emp = 75 → but we'll use 15 emp for this test = min $40
    const state = baseState({
      selectedModules: { payroll: true },
      selectedAncillary: { retirement: true },
      discountPercent: 10,
      discountOptOut: { retirement: true },
    });
    const t = calculateTotals(state);
    const payrollPP = 88.50;
    const retirementPP = 40; // min applies at 15 emp
    const expectedDiscount = payrollPP * 0.10; // only payroll gets discount
    near(t.discountPerPayroll, expectedDiscount);
    near(t.finalPerPayroll, (payrollPP + retirementPP) - expectedDiscount);
  });

  it('Benefit EDI can be opted out of discount', () => {
    const state = baseState({
      benefitEdi: { enabled: true, feeds: 1, cobraBundle: false },
      discountPercent: 10,
      discountOptOut: { benefitEdi: true },
    });
    const t = calculateTotals(state);
    // benefit EDI @ 15 emp = min $40; nothing else selected; discount only from discountable = 0
    expect(t.discountPerPayroll).toBe(0);
    near(t.finalPerPayroll, 40);
  });

  it('setup total includes State Tax ID, PYTD, Benefit EDI one-time', () => {
    const state = baseState({
      selectedModules: { payroll: true }, // setupFees empty → payroll setup = 0
      stateTaxId: { enabled: true, quantity: 2 },
      pytd: { enabled: true, hours: 2, statements: 100 },
      benefitEdi: { enabled: true, feeds: 2, cobraBundle: false },
    });
    const t = calculateTotals(state);
    const expectedSetup = (STATE_TAX_ID_PER_ID * 2) + (150 * 2 + 0.10 * 100) + (BENEFIT_EDI_FIRST_FEED + BENEFIT_EDI_ADDL_FEED);
    near(t.totalSetup, expectedSetup);
  });

  it('S-Corp mode: perPeriod not discounted', () => {
    const t = calculateTotals(baseState({
      sCorpMode: true,
      discountPercent: 50, // should be ignored in S-Corp
    }));
    expect(t.discountPerPayroll).toBe(0);
    near(t.finalPerPayroll, 48);
  });

  it('S-Corp with benefit EDI: benefit EDI recurring adds to perPayroll', () => {
    const t = calculateTotals(baseState({
      sCorpMode: true,
      employeeCount: 1,
      benefitEdi: { enabled: true, feeds: 1, cobraBundle: false },
    }));
    // 48 (biweekly base) + benefit EDI min 40 = 88
    near(t.finalPerPayroll, 48 + 40);
  });
});

// =============================================================
// Per-employee delta helper
// =============================================================
describe('totalPerPayrollAt', () => {
  it('scales linearly with employee count (above minimum)', () => {
    const state = baseState({
      employeeCount: 25,
      selectedModules: { payroll: true },
    });
    const at25 = totalPerPayrollAt(25, state);
    const at26 = totalPerPayrollAt(26, state);
    near(at26 - at25, 2.70); // payroll pepm at bi-weekly
  });

  it('returns same value when adding one employee below minimum threshold (no change)', () => {
    // TLM at bi-weekly, 5 employees: raw $13.50, min $50 applies
    // 6 employees: raw $16.20, still under $50 min
    const state = baseState({
      employeeCount: 5,
      selectedModules: { tlm: true },
    });
    const at5 = totalPerPayrollAt(5, state);
    const at6 = totalPerPayrollAt(6, state);
    expect(at5).toBe(at6); // both hit minimum
    near(at5, 50);
  });

  it('respects discount opt-out in delta calculation', () => {
    const state = baseState({
      employeeCount: 100,
      selectedAncillary: { retirement: true },
      discountPercent: 10,
      discountOptOut: { retirement: true },
    });
    const t = totalPerPayrollAt(100, state);
    near(t, 0.75 * 100); // no discount applied
  });
});

// =============================================================
// End-to-end scenario: realistic mid-size quote
// =============================================================
describe('end-to-end mid-size company scenario', () => {
  it('50 employees, payroll + TLM + HCM, bi-weekly, 5% discount', () => {
    const state = baseState({
      employeeCount: 50,
      frequency: 'biweekly',
      selectedModules: { payroll: true, tlm: true, hcm: true },
      discountPercent: 5,
    });

    const payroll = 48 + 2.70 * 50; // 183
    const tlm = 2.70 * 50;           // 135
    const hcm = 2.70 * 50;           // 135
    const subtotal = payroll + tlm + hcm; // 453
    const discount = subtotal * 0.05;      // 22.65
    const final = subtotal - discount;     // 430.35

    const t = calculateTotals(state);
    near(t.subtotalPerPayroll, subtotal);
    near(t.discountPerPayroll, discount);
    near(t.finalPerPayroll, final);
  });

  it('S-Corp annually + State Tax ID + PYTD', () => {
    const state = baseState({
      sCorpMode: true,
      employeeCount: 1,
      frequency: 'annual',
      stateTaxId: { enabled: true, quantity: 1 },
      pytd: { enabled: true, hours: 3, statements: 26 },
    });

    const t = calculateTotals(state);
    near(t.finalPerPayroll, 1000);
    near(t.finalAnnual, 1000);
    near(t.totalYearEnd, 150 + 6.95);
    const expectedSetup = 750 + 250 + (150 * 3 + 0.10 * 26);
    near(t.totalSetup, expectedSetup);
  });
});
