import { useRef, useState } from 'react';
import { PRICING_CONFIG, ANCILLARY_PRICING, ANCILLARY_USAGE, STANDARD_FREQUENCIES, SCORP_FREQUENCIES, FREQUENCIES, formatMoney } from '../../constants/pricing';
import * as calc from '../../lib/pricing-calc';
import { Icon } from '../Icons';
import ServiceCatalog from './ServiceCatalog';
import { Check, Field, Panel } from './Fields';
import './workspace.css';

const steps = [['configure', 'Configure', 'Client & payroll details'], ['services', 'Services', 'Build the right solution'], ['review', 'Review & export', 'Prepare your quote']];

function Drafts({ savedQuotes, onSave, onLoad, onDelete, clientName, onClose }) {
  const [name, setName] = useState(clientName);
  const [overwriteName, setOverwriteName] = useState('');
  const save = () => {
    if (!name.trim()) return;
    if (Object.hasOwn(savedQuotes, name.trim()) && overwriteName !== name.trim()) {
      setOverwriteName(name.trim());
      return;
    }
    if (onSave(name) !== false) { setOverwriteName(''); setName(''); }
  };
  return <Panel title="Saved quotes" subtitle="Preview drafts are stored in this browser on this computer." className="qw-drafts">
    <button className="qw-close" onClick={onClose} aria-label="Close saved quotes"><Icon.X /></button>
    <div className="qw-draft-save">
      <Field label="Quote name" type="text" value={name} onChange={value => { setName(value); setOverwriteName(''); }}
        placeholder="Client name — proposal version" onKeyDown={e => { if (e.key === 'Enter') save(); }} />
      <button className="qw-button qw-primary" onClick={save} disabled={!name.trim()}>{overwriteName ? 'Replace saved quote' : 'Save current quote'}</button>
    </div>
    {overwriteName && <p className="qw-footnote">A quote with this name exists. Choose “Replace saved quote” to update it, or use a different name.</p>}
    {Object.keys(savedQuotes).length === 0 ? <p className="qw-muted">No preview drafts yet. Save a named version to pick up later.</p>
      : <div className="qw-draft-list">{Object.entries(savedQuotes).sort(([, a], [, b]) => (b.savedAt || '').localeCompare(a.savedAt || '')).map(([key, data]) =>
        <div key={key}><div><strong>{key}</strong><small>{data.clientName || 'Unnamed client'} · {data.employeeCount} employees</small></div>
          <button className="qw-text-button" onClick={() => onLoad(key)}>Load</button>
          <button className="qw-text-button" onClick={() => { if (window.confirm('Delete preview quote “' + key + '”?')) onDelete(key); }}>Delete</button>
        </div>)}</div>}
    <p className="qw-footnote">Save before closing this tab. Clearing browser data removes saved quotes. Export a PDF for a permanent copy.</p>
  </Panel>;
}

function Configuration({ state, change, previousStandardRef }) {
  const switchMode = enabled => {
    if (enabled) {
      previousStandardRef.current = { employeeCount: state.employeeCount, frequency: state.frequency,
        discountPercent: state.discountPercent, payrollBaseOverride: state.payrollBaseOverride };
      Object.entries({ sCorpMode: true, employeeCount: 1, frequency: 'monthly', discountPercent: 0, payrollBaseOverride: null })
        .forEach(([key, value]) => change(key, value));
    } else {
      Object.entries({ sCorpMode: false, employeeCount: 15, frequency: 'biweekly', discountPercent: 0, payrollBaseOverride: null,
        ...previousStandardRef.current }).forEach(([key, value]) => change(key, value));
    }
  };
  return <div className="qw-stack">
    <Panel title="Start with the client" subtitle="A few details establish the pricing foundation.">
      <div className="qw-fields">
        <Field label="Company name" type="text" value={state.clientName} placeholder="e.g. Northstar Studio"
          onChange={value => change('clientName', value)} autoComplete="organization" />
        <Field label="Quote date" type="date" value={state.quoteDate} onChange={value => change('quoteDate', value)} />
        <Field label="Active employees" value={state.employeeCount} min={1}
          hint="The default count for employee-based services." onChange={value => change('employeeCount', value)} />
        <div className="qw-field"><label htmlFor="qw-frequency">Pay frequency</label>
          <select id="qw-frequency" value={state.frequency} onChange={e => change('frequency', e.target.value)}>
            {(state.sCorpMode ? SCORP_FREQUENCIES : STANDARD_FREQUENCIES).map(key =>
              <option key={key} value={key}>{FREQUENCIES[key].label} · {FREQUENCIES[key].periods} payrolls/year</option>)}
          </select><small>{state.sCorpMode ? 'Billing follows the owner-only payroll schedule.' : 'Standard rates adjust automatically with frequency.'}</small>
        </div>
      </div>
      <details className="qw-disclosure">
        <summary>Different W-2 or contractor counts? {(state.w2Count !== '' || state.count1099 !== '') && <span className="qw-badge qw-badge-gold">Adjusted</span>}</summary>
        <div className="qw-fields qw-adjustments">
          <Field label="Approximate W-2s" value={state.w2Count} optional min={1} placeholder={'Defaults to ' + state.employeeCount}
            hint="Used for annual W-2 fees, ACA forms and the recurring 401(k) integration count."
            onChange={value => change('w2Count', value)} />
          <Field label="Approximate 1099s" value={state.count1099} optional placeholder="Defaults to 0"
            hint="Adds to Payroll, TLM, HCM and Full Service counts, plus annual payroll forms."
            onChange={value => change('count1099', value)} />
        </div>
      </details>
    </Panel>
    <Panel title="Pricing preferences" subtitle="Fine-tune the proposal without changing your standard rates.">
      {!state.sCorpMode && <Field label="Recurring discount (%)" value={state.discountPercent} max={100} step={0.5}
        hint="Applies to eligible recurring fees. Exclude individual services inside their cards."
        onChange={value => change('discountPercent', value)} />}
      <details className="qw-disclosure">
        <summary>Annual processing adjustments {(state.annualFormsOverride !== '' || state.payrollYearEndRateOverride !== null) && <span className="qw-badge qw-badge-gold">Adjusted</span>}</summary>
        <div className="qw-fields qw-adjustments">
          <Field label="Annual forms count override" value={state.annualFormsOverride} optional
            placeholder="Use calculated form count" hint="Overrides the count for payroll and ACA annual processing. Enter 0 for zero forms; the base fee still applies."
            onChange={value => change('annualFormsOverride', value)} />
          <Field label="W-2 / 1099 rate per form ($)" value={state.payrollYearEndRateOverride ?? ''} optional step={0.01}
            placeholder={String(PRICING_CONFIG.payroll.yearEndPerItem)} hint="Blank uses the standard per-form rate. ACA's standard rate is unchanged."
            onChange={value => change('payrollYearEndRateOverride', value === '' ? null : value)} />
        </div>
      </details>
      <details className="qw-disclosure" open={state.sCorpMode || undefined}>
        <summary>Special payroll scenario {state.sCorpMode && <span className="qw-badge qw-badge-gold">S-Corp active</span>}</summary>
        <div className="qw-adjustments">
          <Check label="Owner-only S-Corp payroll" checked={state.sCorpMode} onChange={() => switchMode(!state.sCorpMode)} />
          <p className="qw-muted">Uses the owner-only flat fee schedule. Core add-ons are excluded while this mode is active; specialty services remain available.</p>
        </div>
      </details>
    </Panel>
    <Panel title="Make it personal" subtitle="Optionally include your details in the client contact section.">
      <Check label="Include representative contact information" checked={state.showRepInfo} onChange={() => change('showRepInfo', !state.showRepInfo)} />
      {state.showRepInfo && <div className="qw-fields qw-adjustments">
        <Field label="Representative name" type="text" value={state.repName} onChange={value => change('repName', value)} />
        <Field label="Phone number" type="tel" value={state.repPhone} onChange={value => change('repPhone', value)} />
        <Field label="Email address" type="email" value={state.repEmail} onChange={value => change('repEmail', value)} />
        <p className="qw-muted">Only completed fields appear on your quote.</p>
      </div>}
    </Panel>
  </div>;
}

function Estimate({ state, totals, onReview, onServices }) {
  const core = state.sCorpMode ? [{ id: 'payroll', name: 'Owner-only payroll', amount: calc.calculateSCorpCost(state).perPeriod }]
    : Object.values(PRICING_CONFIG).filter(s => state.selectedModules[s.id]).map(s => ({
      id: s.id, name: s.name, amount: calc.calculateModuleCost(s.id, PRICING_CONFIG, state).perPayroll,
    }));
  const addons = state.sCorpMode ? [] : Object.values(ANCILLARY_PRICING).filter(s => state.selectedAncillary[s.id]).map(s => ({
    id: s.id, name: s.name, amount: calc.calculateModuleCost(s.id, ANCILLARY_PRICING, state).perPayroll,
  }));
  const rows = [...core, ...addons];
  if (state.benefitEdi.enabled) rows.push({ id: 'benefitEdi', name: 'Benefit Integration (EDI)', amount: calc.calculateBenefitEdiRecurring(state).perPayroll });
  const annualRecurring = state.sCorpMode ? totals.finalAnnual : totals.finalAnnual - totals.totalYearEnd;
  const unit = totals.sCorpPeriodLabel || 'payroll';
  const hasServices = rows.length > 0 || state.stateTaxId.enabled || state.pytd.enabled;
  return <aside className="qw-estimate">
    <div className="qw-estimate-top">
      <span className="qw-eyebrow">YOUR WORKING ESTIMATE</span>
      <h2>{state.clientName || 'Your next great partnership'}</h2>
      <p>{state.employeeCount} employees <span>·</span> {FREQUENCIES[state.frequency].label}</p>
      <div className="qw-estimate-amount">{formatMoney(totals.finalPerPayroll)}</div>
      <span className="qw-estimate-period">per {unit}{state.discountPercent > 0 && !state.sCorpMode ? ' · after applicable discounts' : ''}</span>
    </div>
    <div className="qw-estimate-body">
      <div className="qw-estimate-label"><h3>Selected services</h3><button onClick={onServices}>Edit</button></div>
      {rows.length === 0 && <p className="qw-muted">Add a module to start building the recurring estimate.</p>}
      <ul>{rows.map(row => <li key={row.id}><span>{row.name}{!state.sCorpMode && state.discountPercent > 0 && !state.discountOptOut[row.id] && <b className="qw-discount"> *</b>}</span>
        <strong>{formatMoney(row.amount * (state.sCorpMode || state.discountOptOut[row.id] ? 1 : 1 - state.discountPercent / 100))}</strong></li>)}</ul>
      <dl className="qw-estimate-extras">
        <div><dt>One-time setup & services</dt><dd>{formatMoney(totals.totalSetup)}</dd></div>
        <div><dt>Annual processing fees</dt><dd>{formatMoney(totals.totalYearEnd)}</dd></div>
        <div><dt>Annual recurring estimate</dt><dd>{formatMoney(annualRecurring)}</dd></div>
      </dl>
      <p className="qw-footnote">Annual recurring excludes setup, annual processing and usage-based charges.</p>
      {state.sCorpMode && state.benefitEdi.enabled && <p className="qw-footnote">EDI is billed each payroll; owner-only payroll may follow a different billing schedule. Review the individual charges.</p>}
      <button className="qw-button qw-primary qw-full" onClick={onReview} disabled={!hasServices}>Review quote <span aria-hidden="true">↗</span></button>
      <p className="qw-estimate-reassurance">Your estimate updates as you build.</p>
    </div>
  </aside>;
}

export default function QuoteWorkspace({ state, change, totals, documents, savedQuotes, onSave, onLoad, onDelete, toast }) {
  const [step, setStep] = useState('configure');
  const [showDrafts, setShowDrafts] = useState(false);
  const titleRef = useRef(null);
  const previousStandardRef = useRef(null);
  const navigate = next => {
    setStep(next);
    requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true }));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const count = (state.sCorpMode ? 1 : Object.values(state.selectedModules).filter(Boolean).length +
    Object.keys(ANCILLARY_PRICING).filter(key => state.selectedAncillary[key]).length) +
    [state.stateTaxId, state.pytd, state.benefitEdi].filter(s => s.enabled).length;
  const usageCount = state.sCorpMode ? 0 : Object.keys(ANCILLARY_USAGE).filter(key => state.selectedAncillary[key]).length;
  const valid = state.employeeCount >= 1 && count > 0;
  return <div className="qw-root">
    <header className="qw-header no-print">
      <div className="qw-brand"><span className="qw-crest" aria-hidden="true">C</span><div><strong>Creative Planning</strong><span>PAYROLL · QUOTE BUILDER</span></div></div>
      <div className="qw-header-actions">
        <span className="qw-preview-label"><span /> CODEX PREVIEW</span>
        <a href="?experience=classic" target="_blank" rel="noreferrer" className="qw-text-button">Compare original <span aria-hidden="true">↗</span></a>
        <a href={import.meta.env.BASE_URL + 'codex-guide.html'} target="_blank" rel="noreferrer" className="qw-help" aria-label="Open rep guide"><Icon.Help /></a>
        <button className="qw-button qw-secondary" onClick={() => setShowDrafts(!showDrafts)} aria-expanded={showDrafts}>Saved quotes</button>
      </div>
    </header>
    <main className="qw-main">
      <div className="no-print">
        <div className="qw-intro">
          <div><p className="qw-eyebrow">A CLEARER PATH FROM CONVERSATION TO QUOTE</p>
            <h1 tabIndex="-1" ref={titleRef}>{step === 'configure' ? 'Great partnerships start here.' : step === 'services' ? 'The right fit. Clearly priced.' : 'A proposal worth sharing.'}</h1>
            <p>{step === 'configure' ? 'Shape a thoughtful proposal around your client’s needs.'
              : step === 'services' ? 'Choose what matters. We’ll keep the details and the numbers together.'
              : 'Review the details, choose your audience, and make it official.'}</p>
          </div>
          <div className="qw-session-label"><span className="qw-session-dot" />{state.sCorpMode ? 'Owner-only S-Corp' : 'Standard payroll'}<small>Save a draft to return later</small></div>
        </div>
        <nav className="qw-steps" aria-label="Quote workflow">
          {steps.map(([id, label, subtitle], index) => <button key={id} aria-current={step === id ? 'step' : undefined} onClick={() => navigate(id)}>
            <span className="qw-step-number">{String(index + 1).padStart(2, '0')}</span><span><strong>{label}</strong><small>{subtitle}</small></span>
            {id === 'services' && count > 0 && <span className="qw-step-count">{count}</span>}
          </button>)}
        </nav>
        {showDrafts && <Drafts savedQuotes={savedQuotes} onSave={onSave} onLoad={name => { onLoad(name); setShowDrafts(false); }}
          onDelete={onDelete} clientName={state.clientName} onClose={() => setShowDrafts(false)} />}
        {step !== 'review' ? <div className="qw-layout">
          <div>
            <div hidden={step !== 'configure'}><Configuration state={state} change={change} previousStandardRef={previousStandardRef} /></div>
            {step === 'services' && <ServiceCatalog key={state.sCorpMode ? 'scorp' : 'standard'} state={state} change={change} />}
            <div className="qw-next">
              <p>{step === 'configure' ? 'Next, choose the services your client needs.' : count + ' services selected' + (usageCount ? ' · ' + usageCount + ' usage-based rate selections' : '')}</p>
              <button className="qw-button qw-primary" onClick={() => navigate(step === 'configure' ? 'services' : 'review')}>
                {step === 'configure' ? 'Choose services' : 'Review & export'} <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
          <Estimate state={state} totals={totals} onReview={() => navigate('review')} onServices={() => navigate('services')} />
        </div> : <>
          <div className="qw-review-toolbar">
            <div><strong>Document preview</strong><p>{state.clientFacing ? 'Client pricing, annual recap, rate sheet and included services.' : 'Annual estimates appear alongside each module for internal review.'}</p></div>
            <div className="qw-segment" aria-label="Quote audience">
              <button aria-pressed={state.clientFacing} onClick={() => change('clientFacing', true)}>Client facing</button>
              <button aria-pressed={!state.clientFacing} onClick={() => change('clientFacing', false)}>Internal sales</button>
            </div>
            <button className="qw-button qw-primary" disabled={!valid} onClick={() => window.print()}><Icon.Printer /> Print / Save PDF</button>
          </div>
          <p className="qw-print-tip">{!state.clientName && 'Add a company name before sharing. '}
            For a clean PDF, turn off “Headers and footers” in the print dialog. Save your editable draft separately.</p>
          {!valid && <div className="qw-empty"><h3>Build your quote first</h3><p>Select at least one service to prepare an estimate.</p>
            <button className="qw-button qw-primary" onClick={() => navigate('services')}>Choose services</button></div>}
        </>}
      </div>
      <div className={'qw-documents ' + (step === 'review' && valid ? '' : 'qw-documents-hidden')}>{documents}</div>
      <footer className="qw-app-footer no-print"><span>Creative Planning Payroll</span><span>Codex preview · Local drafts · Existing pricing foundation</span></footer>
    </main>
    {toast}
  </div>;
}
