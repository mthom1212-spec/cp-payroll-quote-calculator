import {
  PRICING_CONFIG, ANCILLARY_PRICING, ANCILLARY_USAGE, MODULE_SERVICES,
  STATE_TAX_ID_PER_ID, PYTD_HOURLY, PYTD_PER_STATEMENT, BENEFIT_EDI_FIRST_FEED,
  BENEFIT_EDI_ADDL_FEED, formatMoney,
} from '../constants/pricing';
import * as calc from './pricing-calc';

const descriptions = {
  perfMgmt: 'Build stronger teams with reviews, goals and ongoing feedback.',
  ats: 'From the first application to the next great hire.',
  cobra: 'Keep continuation-of-coverage administration organized.',
  retirement: 'Connect payroll with your client’s retirement plan.',
  lms: 'Give employee learning and development a home.',
  onboarding: 'Make the first day feel like a head start.',
  expense: 'Simpler expense management, priced by the users who need it.',
  digitalLaborPoster: 'Digital labor law compliance for a flat monthly fee.',
};

export function catalogFor(state) {
  const discounted = (id, amount) => amount * (state.sCorpMode || state.discountOptOut[id] ? 1 : 1 - state.discountPercent / 100);
  const items = [];
  for (const [source, category, selection] of [[PRICING_CONFIG, 'core', state.selectedModules], [ANCILLARY_PRICING, 'addons', state.selectedAncillary]]) {
    for (const service of Object.values(source)) {
      if (state.sCorpMode && (category !== 'core' || service.id !== 'payroll')) continue;
      const sc = state.sCorpMode ? calc.calculateSCorpCost(state) : null;
      const costs = calc.calculateModuleCost(service.id, source, state);
      const selected = !!sc || !!selection[service.id];
      const head = costs.headcountBreakdown;
      const countLabel = service.monthlyFlat !== undefined ? 'Flat monthly fee' : sc ? 'Flat owner-only fee'
        : head.contractors ? head.employees + ' employees + ' + head.contractors + ' contractors'
        : costs.headcount + (service.id === 'expense' ? ' users' : service.id === 'retirement' ? ' W-2 employees' : ' employees');
      const included = MODULE_SERVICES[sc ? 'scorp' : service.id]?.services || [];
      items.push({
        ...service, category, source, selected, costs, countLabel, included,
        name: sc ? 'Owner-only payroll' : service.name,
        description: sc ? 'A focused payroll service for owner-only S-Corps.' : service.description || descriptions[service.id],
        amount: discounted(service.id, sc ? sc.perPeriod : costs.perPayroll),
        annual: discounted(service.id, sc ? sc.annual : costs.annual - costs.yearEnd),
        period: sc?.periodLabel || 'payroll', setup: sc ? sc.setup : costs.setup,
        custom: service.id === 'payroll' && state.payrollBaseOverride !== null ||
          state.ancillaryRateOverrides[service.id]?.pepm != null || state.ancillaryRateOverrides[service.id]?.minimum != null,
        discount: !sc && !state.discountOptOut[service.id] && state.discountPercent > 0,
        billingNote: service.monthlyBilling ? (service.monthlyFlat !== undefined ? formatMoney(service.monthlyFlat) + '/month, flat' : formatMoney(service.monthlyPerUser) + '/user/month') : null,
      });
    }
  }
  const edi = calc.calculateBenefitEdiRecurring(state);
  items.push(
    { id: 'stateTaxId', name: 'State tax ID application', category: 'special', description: 'State tax registration, handled on your client’s behalf.', selected: state.stateTaxId.enabled, amount: calc.calculateStateTaxIdTotal({ ...state.stateTaxId, enabled: true }), period: 'one-time', countLabel: state.stateTaxId.quantity + ' agencies', rate: formatMoney(STATE_TAX_ID_PER_ID) + ' per ID / agency' },
    { id: 'pytd', name: 'Payroll year-to-date loading', category: 'special', description: 'Bring historical payroll into the new platform.', selected: state.pytd.enabled, amount: calc.calculatePytdTotal({ ...state.pytd, enabled: true }), period: 'one-time', countLabel: state.pytd.hours + ' hours · ' + state.pytd.statements + ' statements', rate: formatMoney(PYTD_HOURLY) + '/hour + ' + formatMoney(PYTD_PER_STATEMENT) + '/statement' },
    { id: 'benefitEdi', name: 'Benefit integration (EDI)', category: 'special', description: 'Connect benefit carriers, with an optional COBRA bundle.', selected: state.benefitEdi.enabled, amount: discounted('benefitEdi', calc.calculateBenefitEdiRecurring({ ...state, benefitEdi: { ...state.benefitEdi, enabled: true } }).perPayroll), annual: discounted('benefitEdi', edi.annual), period: 'payroll', countLabel: state.employeeCount + ' employees', setup: calc.calculateBenefitEdiOneTime(state.benefitEdi), rate: formatMoney(BENEFIT_EDI_FIRST_FEED) + ' first feed · ' + formatMoney(BENEFIT_EDI_ADDL_FEED) + ' each additional', costs: edi, discount: !state.sCorpMode && !state.discountOptOut.benefitEdi && state.discountPercent > 0 },
  );
  if (!state.sCorpMode) for (const service of Object.values(ANCILLARY_USAGE)) items.push({ ...service, description: 'Additional charges apply only when this service is used.', category: 'usage', selected: !!state.selectedAncillary[service.id], period: 'usage' });
  return items;
}

export function toggleService(id, state, change) {
  if (['stateTaxId', 'pytd', 'benefitEdi'].includes(id)) return change(id, { ...state[id], enabled: !state[id].enabled });
  if (state.sCorpMode && id === 'payroll') return;
  const key = PRICING_CONFIG[id] ? 'selectedModules' : 'selectedAncillary';
  change(key, { ...state[key], [id]: !state[key][id] });
}

export function recurringAnnual(state, totals) {
  return state.sCorpMode ? totals.finalAnnual : totals.finalAnnual - totals.totalYearEnd;
}
