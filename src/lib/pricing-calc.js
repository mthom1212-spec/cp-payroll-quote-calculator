// Pure pricing calculation functions extracted from the component.
// All functions are pure — they take explicit inputs and return the same
// output for the same inputs. This makes them trivially testable.
//
// The `state` object convention: pass in a plain object containing whatever
// state fields a given function needs. Any function that reads state should
// only touch fields it declares.

import { PRICING_CONFIG, FREQUENCIES, ANCILLARY_PRICING } from '../constants/pricing';

// ---------- Constants used by inline (non-config) fees ----------

export const STATE_TAX_ID_PER_ID = 250;
export const PYTD_HOURLY = 150;
export const PYTD_PER_STATEMENT = 0.10;
export const BENEFIT_EDI_FIRST_FEED = 1195;
export const BENEFIT_EDI_ADDL_FEED = 995;
export const BENEFIT_EDI_MIN = 40;
export const BENEFIT_EDI_RATE_STD = 0.75;
export const BENEFIT_EDI_RATE_BUNDLE = 0.90;
export const JURISDICTION_FEE_PER_LOCATION = 10;
export const SCORP_YEAR_END_BASE = 150;
export const SCORP_YEAR_END_PER_FORM = 6.95;
export const SCORP_ANNUAL_FLAT = 1000;
export const SCORP_QUARTERLY_FLAT = 250;
export const SCORP_BIWEEKLY_BASE = 48;

// ---------- Core helpers ----------

/** Bi-weekly frequency multiplier: 26 / periodsPerYear */
export const getMultiplier = (frequency) =>
  FREQUENCIES.biweekly.periods / FREQUENCIES[frequency].periods;

/** Given the optional w2Count string state and employeeCount, return the
 *  effective W-2 form count for year-end fees and 401(k) headcount. */
export const getW2Headcount = ({ w2Count, employeeCount }) =>
  (w2Count !== '' && w2Count != null && parseInt(w2Count) > 0)
    ? parseInt(w2Count)
    : employeeCount;

/** Effective expense-tracking user count. */
export const getExpenseUserCount = ({ expenseUserCount, employeeCount }) =>
  (expenseUserCount !== '' && expenseUserCount != null && parseInt(expenseUserCount) > 0)
    ? parseInt(expenseUserCount)
    : employeeCount;

/** Effective 1099 count (defaults to 0). */
export const getCount1099 = ({ count1099 }) => parseInt(count1099) || 0;

// ---------- Module / ancillary cost ----------

/**
 * Compute the per-payroll, annual, setup, and year-end cost for a single
 * module or ancillary service. Mirrors the logic embedded in the component,
 * but is a pure function.
 *
 * @param {string} moduleKey    e.g. 'payroll', 'retirement', 'expense'
 * @param {object} configSource PRICING_CONFIG or ANCILLARY_PRICING
 * @param {object} state        { employeeCount, w2Count, count1099, frequency,
 *                                payrollBaseOverride, payrollYearEndRateOverride,
 *                                additionalJurisdictions, expenseUserCount,
 *                                ancillaryRateOverrides, setupFees,
 *                                customEmpCount? }
 */
export const calculateModuleCost = (moduleKey, configSource, state) => {
  const {
    frequency,
    employeeCount,
    payrollBaseOverride,
    payrollYearEndRateOverride,
    additionalJurisdictions = 0,
    ancillaryRateOverrides = {},
    setupFees = {},
    customEmpCount = null,
  } = state;

  const config = configSource[moduleKey];
  const multiplier = getMultiplier(frequency);
  const empCount = customEmpCount !== null ? customEmpCount : employeeCount;

  // --- Base fee (payroll can be overridden) ---
  const adjBase = (moduleKey === 'payroll' && payrollBaseOverride !== null && payrollBaseOverride !== undefined)
    ? payrollBaseOverride
    : config.baseFee * multiplier;

  // --- Per-employee rate (monthly billing / overrides / default) ---
  const overrides = ancillaryRateOverrides[moduleKey];
  let adjPepm;
  if (config.monthlyBilling) {
    adjPepm = (config.monthlyPerUser * 12) / FREQUENCIES[frequency].periods;
  } else if (overrides?.pepm !== null && overrides?.pepm !== undefined) {
    adjPepm = overrides.pepm * multiplier;
  } else {
    adjPepm = config.pepm * multiplier;
  }
  const adjMin = (overrides?.minimum !== null && overrides?.minimum !== undefined)
    ? overrides.minimum * multiplier
    : config.minimum * multiplier;

  // --- Headcount routing ---
  const w2Head = getW2Headcount({ w2Count: state.w2Count, employeeCount: empCount });
  const forms1099Current = getCount1099({ count1099: state.count1099 });
  const expenseUsers = getExpenseUserCount({
    expenseUserCount: state.expenseUserCount,
    employeeCount: empCount,
  });
  // Modules where per-payroll headcount includes 1099 contractors being paid.
  // Excluded: ACA (W-2 employees only), retirement (uses W-2 count),
  // expense (its own user count).
  const MODULES_WITH_1099 = ['payroll', 'tlm', 'hcm', 'fullService'];
  let headcount;
  if (moduleKey === 'expense') headcount = expenseUsers;
  else if (moduleKey === 'retirement') headcount = w2Head;
  else if (MODULES_WITH_1099.includes(moduleKey)) headcount = empCount + forms1099Current;
  else headcount = empCount;

  const rawCost = adjBase + (adjPepm * headcount);
  const basePer = Math.max(rawCost, adjMin);
  const isMinApplied = rawCost < adjMin;

  const jurisdictionFee = (moduleKey === 'payroll' && additionalJurisdictions > 0)
    ? additionalJurisdictions * JURISDICTION_FEE_PER_LOCATION
    : 0;
  const perPayroll = basePer + jurisdictionFee;

  // --- Year-end ---
  let yearEnd = 0;
  if (config.hasYearEnd) {
    if (moduleKey === 'payroll') {
      // Annual form count: use override when set (high-turnover clients whose
      // annual count exceeds per-payroll headcount), else W-2 + 1099 counts.
      const override = state.annualFormsOverride;
      const combined =
        (override !== null && override !== undefined && override !== '')
          ? (parseInt(override) || 0)
          : (w2Head + forms1099Current);
      const rate = (payrollYearEndRateOverride !== null && payrollYearEndRateOverride !== undefined)
        ? payrollYearEndRateOverride
        : config.yearEndPerItem;
      yearEnd = config.yearEndBase + (rate * combined);
    } else {
      yearEnd = config.yearEndBase + (config.yearEndPerItem * w2Head);
    }
  }

  const annual = (perPayroll * FREQUENCIES[frequency].periods) + yearEnd;
  const setup = setupFees[moduleKey]?.included
    ? parseFloat(setupFees[moduleKey].amount || 0)
    : 0;

  return {
    perPayroll, annual, setup, yearEnd, isMinApplied,
    rates: { base: adjBase, pepm: adjPepm, min: adjMin },
    headcount,
    // Breakdown used by the UI to explain the count when it differs from
    // employeeCount (retirement uses W-2s, expense uses user count, and
    // payroll/tlm/hcm/fullService add 1099 contractors)
    headcountBreakdown: {
      employees: (moduleKey === 'expense' || moduleKey === 'retirement') ? 0 : empCount,
      contractors: MODULES_WITH_1099.includes(moduleKey) ? forms1099Current : 0,
      w2Employees: moduleKey === 'retirement' ? w2Head : 0,
      users: moduleKey === 'expense' ? expenseUsers : 0,
    },
  };
};

// ---------- S-Corp owner-only ----------

export const calculateSCorpCost = (state) => {
  const {
    frequency,
    employeeCount,
    payrollYearEndRateOverride,
    additionalJurisdictions = 0,
    sCorpSetup = { included: true, amount: 750 },
  } = state;

  const isQuarterlyBilling =
    frequency !== 'biweekly' && frequency !== 'weekly' && frequency !== 'semimonthly';

  let perPeriod, periodsPerYear, periodLabel;
  if (frequency === 'annual') {
    perPeriod = SCORP_ANNUAL_FLAT;
    periodsPerYear = 1;
    periodLabel = 'year';
  } else if (isQuarterlyBilling) {
    perPeriod = SCORP_QUARTERLY_FLAT;
    periodsPerYear = 4;
    periodLabel = 'quarter';
  } else {
    perPeriod = SCORP_BIWEEKLY_BASE * getMultiplier(frequency);
    periodsPerYear = FREQUENCIES[frequency].periods;
    periodLabel = 'payroll';
  }

  const jurisdictionFee = additionalJurisdictions > 0
    ? additionalJurisdictions * JURISDICTION_FEE_PER_LOCATION
    : 0;
  perPeriod += jurisdictionFee;
  const annual = perPeriod * periodsPerYear;

  const w2Head = getW2Headcount({ w2Count: state.w2Count, employeeCount });
  const forms1099 = getCount1099({ count1099: state.count1099 });
  const rate = (payrollYearEndRateOverride !== null && payrollYearEndRateOverride !== undefined)
    ? payrollYearEndRateOverride
    : SCORP_YEAR_END_PER_FORM;
  const override = state.annualFormsOverride;
  const combined =
    (override !== null && override !== undefined && override !== '')
      ? (parseInt(override) || 0)
      : (w2Head + forms1099);
  const yearEnd = SCORP_YEAR_END_BASE + (rate * combined);

  const setup = sCorpSetup.included ? parseFloat(sCorpSetup.amount || 0) : 0;

  return { perPeriod, annual, yearEnd, setup, periodLabel };
};

// ---------- Benefit EDI ----------

export const calculateBenefitEdiOneTime = (benefitEdi) => {
  if (!benefitEdi?.enabled) return 0;
  const feeds = parseInt(benefitEdi.feeds) || 0;
  if (feeds <= 0) return 0;
  return BENEFIT_EDI_FIRST_FEED + (BENEFIT_EDI_ADDL_FEED * (feeds - 1));
};

export const calculateBenefitEdiRecurring = ({ benefitEdi, employeeCount, frequency }) => {
  const empty = { perPayroll: 0, annual: 0, rate: 0, min: 0, isMinApplied: false, baseRate: 0 };
  if (!benefitEdi?.enabled) return empty;
  const periods = FREQUENCIES[frequency].periods;
  const multiplier = 26 / periods;
  const baseRate = benefitEdi.cobraBundle ? BENEFIT_EDI_RATE_BUNDLE : BENEFIT_EDI_RATE_STD;
  const rate = baseRate * multiplier;
  const min = BENEFIT_EDI_MIN * multiplier;
  const rawCost = rate * employeeCount;
  const perPayroll = Math.max(rawCost, min);
  const isMinApplied = rawCost < min;
  const annual = perPayroll * periods;
  return { perPayroll, annual, rate, min, isMinApplied, baseRate };
};

// ---------- One-time fee helpers ----------

export const calculateStateTaxIdTotal = (stateTaxId) =>
  stateTaxId?.enabled ? STATE_TAX_ID_PER_ID * (parseInt(stateTaxId.quantity) || 0) : 0;

export const calculatePytdTotal = (pytd) =>
  pytd?.enabled
    ? (PYTD_HOURLY * (parseFloat(pytd.hours) || 0)) + (PYTD_PER_STATEMENT * (parseInt(pytd.statements) || 0))
    : 0;

// ---------- Aggregate totals ----------

/**
 * Full aggregation used by the quote total display. Returns everything
 * needed to render the totals block.
 */
export const calculateTotals = (state) => {
  const {
    sCorpMode,
    selectedModules = {},
    selectedAncillary = {},
    frequency,
    discountPercent = 0,
    discountOptOut = {},
    benefitEdi = { enabled: false },
    stateTaxId,
    pytd,
  } = state;

  const benefitEdiOneTime = calculateBenefitEdiOneTime(benefitEdi);
  const benefitEdiRec = calculateBenefitEdiRecurring({
    benefitEdi,
    employeeCount: state.employeeCount,
    frequency,
  });
  const stateTaxIdTotal = calculateStateTaxIdTotal(stateTaxId);
  const pytdTotal = calculatePytdTotal(pytd);

  if (sCorpMode) {
    const sc = calculateSCorpCost(state);
    const subPP = sc.perPeriod + benefitEdiRec.perPayroll;
    const subAn = sc.annual + benefitEdiRec.annual;
    return {
      subtotalPerPayroll: subPP,
      subtotalAnnual: subAn,
      discountPerPayroll: 0,
      discountAnnual: 0,
      finalPerPayroll: subPP,
      finalAnnual: subAn,
      totalSetup: sc.setup + stateTaxIdTotal + pytdTotal + benefitEdiOneTime,
      totalYearEnd: sc.yearEnd,
      sCorpPeriodLabel: sc.periodLabel,
    };
  }

  let discountablePP = 0;
  let nonDiscountablePP = 0;
  let discountableAn = 0;
  let nonDiscountableAn = 0;
  let totalSetup = 0;
  let totalYearEnd = 0;

  Object.keys(PRICING_CONFIG).forEach(key => {
    if (selectedModules[key]) {
      const c = calculateModuleCost(key, PRICING_CONFIG, state);
      if (discountOptOut[key]) {
        nonDiscountablePP += c.perPayroll;
        nonDiscountableAn += c.annual;
      } else {
        discountablePP += c.perPayroll;
        discountableAn += c.annual;
      }
      totalSetup += c.setup;
      totalYearEnd += c.yearEnd;
    }
  });

  Object.keys(ANCILLARY_PRICING).forEach(key => {
    if (selectedAncillary[key]) {
      const c = calculateModuleCost(key, ANCILLARY_PRICING, state);
      if (discountOptOut[key]) {
        nonDiscountablePP += c.perPayroll;
        nonDiscountableAn += c.annual;
      } else {
        discountablePP += c.perPayroll;
        discountableAn += c.annual;
      }
      totalSetup += c.setup;
    }
  });

  if (discountOptOut.benefitEdi) {
    nonDiscountablePP += benefitEdiRec.perPayroll;
    nonDiscountableAn += benefitEdiRec.annual;
  } else {
    discountablePP += benefitEdiRec.perPayroll;
    discountableAn += benefitEdiRec.annual;
  }

  const subtotalPerPayroll = discountablePP + nonDiscountablePP;
  const subtotalAnnual = discountableAn + nonDiscountableAn;
  const discountPerPayroll = discountablePP * (discountPercent / 100);
  const finalPerPayroll = subtotalPerPayroll - discountPerPayroll;
  const discountAnnual = discountPerPayroll * FREQUENCIES[frequency].periods;
  const finalAnnual = subtotalAnnual - discountAnnual;

  return {
    subtotalPerPayroll, subtotalAnnual,
    discountPerPayroll, discountAnnual,
    finalPerPayroll, finalAnnual,
    totalSetup: totalSetup + stateTaxIdTotal + pytdTotal + benefitEdiOneTime,
    totalYearEnd,
  };
};

/**
 * The per-payroll total at an arbitrary employee count. Used to compute the
 * "±1 employee" delta shown on the quote.
 */
export const totalPerPayrollAt = (empCount, state) => {
  const {
    sCorpMode,
    frequency,
    additionalJurisdictions = 0,
    selectedModules = {},
    selectedAncillary = {},
    benefitEdi = { enabled: false },
    discountOptOut = {},
    discountPercent = 0,
  } = state;

  let discountable = 0;
  let nonDiscountable = 0;

  if (sCorpMode) {
    const isQuarterlyBilling =
      frequency !== 'biweekly' && frequency !== 'weekly' && frequency !== 'semimonthly';
    let perPeriod;
    if (frequency === 'annual') perPeriod = SCORP_ANNUAL_FLAT;
    else if (isQuarterlyBilling) perPeriod = SCORP_QUARTERLY_FLAT;
    else perPeriod = SCORP_BIWEEKLY_BASE * (26 / FREQUENCIES[frequency].periods);
    nonDiscountable +=
      perPeriod +
      (additionalJurisdictions > 0 ? additionalJurisdictions * JURISDICTION_FEE_PER_LOCATION : 0);
  } else {
    Object.keys(PRICING_CONFIG).forEach(key => {
      if (selectedModules[key]) {
        const pp = calculateModuleCost(key, PRICING_CONFIG, { ...state, customEmpCount: empCount }).perPayroll;
        if (discountOptOut[key]) nonDiscountable += pp;
        else discountable += pp;
      }
    });
    Object.keys(ANCILLARY_PRICING).forEach(key => {
      if (selectedAncillary[key]) {
        const pp = calculateModuleCost(key, ANCILLARY_PRICING, { ...state, customEmpCount: empCount }).perPayroll;
        if (discountOptOut[key]) nonDiscountable += pp;
        else discountable += pp;
      }
    });
  }

  if (benefitEdi.enabled) {
    const rec = calculateBenefitEdiRecurring({ benefitEdi, employeeCount: empCount, frequency });
    if (discountOptOut.benefitEdi) nonDiscountable += rec.perPayroll;
    else discountable += rec.perPayroll;
  }

  const discountApplied = sCorpMode ? 0 : discountable * (discountPercent / 100);
  return discountable + nonDiscountable - discountApplied;
};
