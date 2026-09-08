import { useState } from 'react';
import {
  PRICING_CONFIG, ANCILLARY_PRICING, ANCILLARY_USAGE, MODULE_SERVICES,
  STATE_TAX_ID_PER_ID, PYTD_HOURLY, PYTD_PER_STATEMENT,
  BENEFIT_EDI_FIRST_FEED, BENEFIT_EDI_ADDL_FEED, JURISDICTION_FEE_PER_LOCATION,
  formatMoney,
} from '../../constants/pricing';
import * as calc from '../../lib/pricing-calc';
import { ModuleIcon } from '../Icons';
import { Check, Field } from './Fields';

const notes = {
  perfMgmt: 'Reviews, goals, feedback and talent development.',
  ats: 'A connected recruiting and hiring experience.',
  cobra: 'Administration for continuation of health coverage.',
  retirement: 'Connected retirement plan and payroll data.',
  lms: 'Employee learning and training management.',
  onboarding: 'Bring new employees into your organization.',
  expense: 'Expense management, billed monthly by user.',
  digitalLaborPoster: 'Digital compliance access for a flat monthly fee.',
};

function Setup({ serviceId, state, change }) {
  const fee = state.setupFees[serviceId] || { included: false, amount: 0 };
  const update = patch => change('setupFees', { ...state.setupFees, [serviceId]: { ...fee, ...patch } });
  return <div className="qw-setup">
    <Check label="Include one-time setup" checked={fee.included} onChange={() => update({ included: !fee.included })} />
    {fee.included ? <Field label="Setup fee ($)" value={fee.amount} step={0.01} onChange={amount => update({ amount })} />
      : <span className="qw-muted">Setup waived</span>}
  </div>;
}

function ServiceCard({ service, source, state, change }) {
  const isCore = source === PRICING_CONFIG;
  const key = isCore ? 'selectedModules' : 'selectedAncillary';
  const selected = state.sCorpMode && service.id === 'payroll' || state[key][service.id];
  const costs = calc.calculateModuleCost(service.id, source, state);
  const scorp = state.sCorpMode && service.id === 'payroll' ? calc.calculateSCorpCost(state) : null;
  const excluded = !!state.discountOptOut[service.id];
  const afterDiscount = (scorp ? scorp.perPeriod : costs.perPayroll) * (excluded || scorp ? 1 : 1 - state.discountPercent / 100);
  const unit = service.id === 'expense' ? 'user' : service.id === 'retirement' ? 'W-2 employee' : 'employee';
  const countLabel = costs.headcountBreakdown?.contractors > 0
    ? costs.headcountBreakdown.employees + ' employees + ' + costs.headcountBreakdown.contractors + ' contractors'
    : costs.headcount + ' ' + unit + (costs.headcount === 1 ? '' : 's');
  const toggle = () => change(key, { ...state[key], [service.id]: !selected });
  const overrides = state.ancillaryRateOverrides[service.id] || {};
  const override = patch => change('ancillaryRateOverrides', {
    ...state.ancillaryRateOverrides, [service.id]: { ...overrides, ...patch },
  });
  const hasOverride = service.id === 'payroll' && state.payrollBaseOverride !== null ||
    overrides.pepm != null || overrides.minimum != null;
  return <article className={'qw-service ' + (selected ? 'is-selected' : '')} data-service={service.id}>
    <div className="qw-service-top">
      <span className="qw-service-icon"><ModuleIcon moduleId={service.id} className="w-6 h-6" /></span>
      <div className="qw-service-copy">
        <h3>{scorp ? 'Owner-only payroll' : service.name}</h3>
        <p>{scorp ? 'A focused payroll service for owner-only S-Corps.' : service.description || notes[service.id]}</p>
        {hasOverride && selected && <span className="qw-badge qw-badge-gold">Custom rate</span>}
      </div>
      <Check label={selected ? 'Included' : 'Add'} checked={selected} disabled={!!scorp} onChange={toggle} />
    </div>
    <div className="qw-service-price">
      <div><strong>{formatMoney(afterDiscount)}</strong><span> / {scorp?.periodLabel || 'payroll'}</span>
        {selected && state.discountPercent > 0 && !excluded && !scorp && <span className="qw-discount"> {state.discountPercent}% off</span>}
      </div>
      <span>{scorp ? 'Flat fee' : service.monthlyFlat !== undefined ? formatMoney(service.monthlyFlat) + '/month, flat'
        : countLabel + (costs.isMinApplied ? ' · Minimum applies' : '')}</span>
    </div>
    {selected && <div className="qw-service-details">
      {!scorp && <p className="qw-rate-detail">
        {costs.rates.base > 0 && formatMoney(costs.rates.base) + ' base'}
        {costs.rates.base > 0 && costs.rates.pepm > 0 && ' + '}
        {costs.rates.pepm > 0 && formatMoney(costs.rates.pepm) + '/' + unit + ' per payroll'}
        {costs.isMinApplied && ' · ' + formatMoney(costs.rates.min) + ' minimum'}
        {service.monthlyBilling && ' · Billed monthly'}
      </p>}
      {scorp ? <div className="qw-setup">
        <Check label="Include one-time setup" checked={state.sCorpSetup.included}
          onChange={() => change('sCorpSetup', { ...state.sCorpSetup, included: !state.sCorpSetup.included })} />
        {state.sCorpSetup.included && <Field label="Setup fee ($)" value={state.sCorpSetup.amount} step={0.01}
          onChange={amount => change('sCorpSetup', { ...state.sCorpSetup, amount })} />}
      </div> : <Setup serviceId={service.id} state={state} change={change} />}
      {service.id === 'expense' && <Field label="Expense tracking users" value={state.expenseUserCount}
        optional min={1} placeholder={'Defaults to ' + state.employeeCount}
        hint="Uses its own user count. $3 per user per month, shown as a per-payroll equivalent."
        onChange={value => change('expenseUserCount', value)} />}
      {service.id === 'payroll' && <Field label="Additional tax jurisdictions" value={state.additionalJurisdictions}
        hint={'First state included. ' + formatMoney(JURISDICTION_FEE_PER_LOCATION) + ' per additional jurisdiction per billing period.'}
        onChange={value => change('additionalJurisdictions', value)} />}
      {!scorp && <details className="qw-disclosure">
        <summary>Rate & discount adjustments {hasOverride && <span className="qw-badge qw-badge-gold">Custom</span>}</summary>
        <div className="qw-adjustments">
          {service.id === 'payroll' && <>
            <Check label="Override payroll base rate" checked={state.payrollBaseOverride !== null}
              onChange={() => change('payrollBaseOverride', state.payrollBaseOverride === null ? costs.rates.base : null)} />
            {state.payrollBaseOverride !== null && <Field label="Base rate per payroll ($)" value={state.payrollBaseOverride} step={0.01}
              hint="This amount stays fixed when pay frequency changes. Turn the override off to restore frequency-based pricing."
              onChange={value => change('payrollBaseOverride', value)} />}
          </>}
          {['retirement', 'onboarding'].includes(service.id) && <>
            <p className="qw-muted">These are biweekly baseline rates. Other pay frequencies scale automatically.</p>
            <div className="qw-fields">
              <Field label="Rate per employee ($)" value={overrides.pepm ?? service.pepm} step={0.01}
                onChange={pepm => override({ pepm })} />
              {service.minimum > 0 && <Field label="Minimum per payroll ($)" value={overrides.minimum ?? service.minimum}
                step={0.01} onChange={minimum => override({ minimum })} />}
            </div>
            {hasOverride && <button className="qw-text-button" onClick={() => {
              const next = { ...state.ancillaryRateOverrides }; delete next[service.id]; change('ancillaryRateOverrides', next);
            }}>Reset to standard rates</button>}
          </>}
          <Check label="Do not apply recurring discount" checked={excluded}
            onChange={() => change('discountOptOut', { ...state.discountOptOut, [service.id]: !excluded })} />
        </div>
      </details>}
      {MODULE_SERVICES[service.id] && <details className="qw-disclosure">
        <summary>{(scorp ? MODULE_SERVICES.scorp : MODULE_SERVICES[service.id]).services.length} included services</summary>
        <ul className="qw-included">{(scorp ? MODULE_SERVICES.scorp : MODULE_SERVICES[service.id]).services.map(item => <li key={item}>{item}</li>)}</ul>
      </details>}
    </div>}
  </article>;
}

function SpecialCard({ title, subtitle, enabled, toggle, price, children }) {
  return <article className={'qw-service ' + (enabled ? 'is-selected' : '')}>
    <div className="qw-service-top">
      <div className="qw-service-copy"><h3>{title}</h3><p>{subtitle}</p></div>
      <Check label={enabled ? 'Included' : 'Add'} checked={enabled} onChange={toggle} />
    </div>
    {enabled && <div className="qw-service-details">{children}<p className="qw-special-total">{price}</p></div>}
  </article>;
}

export default function ServiceCatalog({ state, change }) {
  const [category, setCategory] = useState('core');
  const [query, setQuery] = useState('');
  const [selectedOnly, setSelectedOnly] = useState(false);
  const matches = name => name.toLowerCase().includes(query.trim().toLowerCase());
  const source = category === 'core' ? PRICING_CONFIG : ANCILLARY_PRICING;
  const key = category === 'core' ? 'selectedModules' : 'selectedAncillary';
  const modules = Object.values(source).filter(service => (!state.sCorpMode || category === 'core' && service.id === 'payroll')
    && matches(service.name) && (!selectedOnly || state[key][service.id] || state.sCorpMode));
  const special = category === 'special';
  const visibleSpecial = [
    ['State Tax ID Application (Per Agency)', state.stateTaxId.enabled],
    ['Payroll Year-to-Date Loading (PYTD)', state.pytd.enabled],
    ['Benefit Integration (EDI)', state.benefitEdi.enabled],
  ].filter(([name, enabled]) => matches(name) && (!selectedOnly || enabled));
  const patchSpecial = (name, patch) => change(name, { ...state[name], ...patch });
  const ediRec = calc.calculateBenefitEdiRecurring(state);
  const usage = Object.values(ANCILLARY_USAGE).filter(service => matches(service.name) && (!selectedOnly || state.selectedAncillary[service.id]));
  const empty = category === 'usage' ? usage.length === 0 : special ? visibleSpecial.length === 0 : modules.length === 0;
  return <div>
    <div className="qw-catalog-tools">
      <label className="qw-search"><span aria-hidden="true">⌕</span>
        <input aria-label="Search services in this category" placeholder="Find a service in this category…" value={query} onChange={e => setQuery(e.target.value)} />
      </label>
      <Check label="Selected only" checked={selectedOnly} onChange={() => setSelectedOnly(!selectedOnly)} />
    </div>
    <div className="qw-categories" aria-label="Service categories">
      {[['core', 'Core modules'], ['addons', 'Recurring add-ons'], ['special', 'Specialty services'], ['usage', 'Usage-based rates']]
        .filter(([id]) => !state.sCorpMode || ['core', 'special'].includes(id))
        .map(([id, name]) => <button key={id} aria-pressed={category === id}
          onClick={() => { setCategory(id); setQuery(''); }}>{name}</button>)}
    </div>
    <p className="qw-category-note">{category === 'core' ? 'The foundation of your client’s payroll solution.'
      : category === 'addons' ? 'Extend the solution. Recurring add-ons are included in the estimate.'
      : category === 'special' ? 'One-time implementation services and benefit integrations.'
      : 'Include these rates for reference. Charges apply when used and are excluded from totals.'}</p>
    {empty && <div className="qw-empty"><h3>No matching services</h3><p>Try a different search or turn off “Selected only.”</p></div>}
    <div className="qw-service-grid">
      {!special && category !== 'usage' && modules.map(service => <ServiceCard key={service.id} service={service} source={source} state={state} change={change} />)}
      {special && visibleSpecial.some(([name]) => name.startsWith('State')) && <SpecialCard title="State Tax ID Application (Per Agency)"
        subtitle={formatMoney(STATE_TAX_ID_PER_ID) + ' per ID · One-time'}
        enabled={state.stateTaxId.enabled} toggle={() => patchSpecial('stateTaxId', { enabled: !state.stateTaxId.enabled })}
        price={formatMoney(calc.calculateStateTaxIdTotal(state.stateTaxId)) + ' one-time'}>
        <Field label="Estimated number of IDs" min={1} value={state.stateTaxId.quantity} onChange={quantity => patchSpecial('stateTaxId', { quantity })} />
      </SpecialCard>}
      {special && visibleSpecial.some(([name]) => name.startsWith('Payroll')) && <SpecialCard title="Payroll Year-to-Date Loading (PYTD)"
        subtitle={formatMoney(PYTD_HOURLY) + '/hour + ' + formatMoney(PYTD_PER_STATEMENT) + '/pay statement'}
        enabled={state.pytd.enabled} toggle={() => patchSpecial('pytd', { enabled: !state.pytd.enabled })}
        price={formatMoney(calc.calculatePytdTotal(state.pytd)) + ' one-time'}>
        <div className="qw-fields">
          <Field label="Estimated hours" value={state.pytd.hours} step={0.25} onChange={hours => patchSpecial('pytd', { hours })} />
          <Field label="Pay statements" value={state.pytd.statements} onChange={statements => patchSpecial('pytd', { statements })} />
        </div>
      </SpecialCard>}
      {special && visibleSpecial.some(([name]) => name.startsWith('Benefit')) && <SpecialCard title="Benefit Integration (EDI)"
        subtitle={formatMoney(BENEFIT_EDI_FIRST_FEED) + ' first feed · ' + formatMoney(BENEFIT_EDI_ADDL_FEED) + ' each additional feed'}
        enabled={state.benefitEdi.enabled} toggle={() => patchSpecial('benefitEdi', { enabled: !state.benefitEdi.enabled })}
        price={formatMoney(calc.calculateBenefitEdiOneTime(state.benefitEdi)) + ' one-time'}>
        <Field label="Number of feeds" min={1} value={state.benefitEdi.feeds} onChange={feeds => patchSpecial('benefitEdi', { feeds })} />
        <Check label="Bundle benefit EDI with COBRA" checked={state.benefitEdi.cobraBundle}
          onChange={() => patchSpecial('benefitEdi', { cobraBundle: !state.benefitEdi.cobraBundle })} />
        <p className="qw-rate-detail">{state.employeeCount} employees × {formatMoney(ediRec.rate)} per payroll
          {ediRec.isMinApplied && ' · ' + formatMoney(ediRec.min) + ' minimum'} = {formatMoney(ediRec.perPayroll)} before discount</p>
        {!state.sCorpMode && <Check label="Do not apply recurring discount" checked={state.discountOptOut.benefitEdi}
          onChange={() => change('discountOptOut', { ...state.discountOptOut, benefitEdi: !state.discountOptOut.benefitEdi })} />}
      </SpecialCard>}
      {category === 'usage' && usage.map(service => <SpecialCard key={service.id} title={service.name}
        subtitle={service.rates.join(' · ')} enabled={state.selectedAncillary[service.id]}
        toggle={() => change('selectedAncillary', { ...state.selectedAncillary, [service.id]: !state.selectedAncillary[service.id] })}
        price="Rates only · Excluded from totals">
        {service.rates.map(rate => <p key={rate} className="qw-rate-detail">{rate}</p>)}
      </SpecialCard>)}
    </div>
    {category === 'usage' && <p className="qw-footnote">The client document also includes the standard ancillary rate sheet for compliance, payments and shipping.</p>}
  </div>;
}
