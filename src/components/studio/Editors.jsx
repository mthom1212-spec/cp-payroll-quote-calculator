import { Field, Check } from '../workspace/Fields';
import { ServiceCard } from '../workspace/ServiceCatalog';
import { PRICING_CONFIG, FREQUENCIES, STANDARD_FREQUENCIES, SCORP_FREQUENCIES, formatMoney } from '../../constants/pricing';
import * as calc from '../../lib/pricing-calc';
import { toggleService } from '../../lib/studio-model';

export function ClientEditor({ state, change, onModeChange }) {
  return <div className="qs-editor-stack">
    <section><h3>The client</h3><div className="qs-fields">
      <Field label="Company name" type="text" value={state.clientName} onChange={v => change('clientName', v)} />
      <Field label="Quote date" type="date" value={state.quoteDate} onChange={v => change('quoteDate', v)} />
      <Field label="Active employees" min={1} value={state.employeeCount} onChange={v => change('employeeCount', v)} />
      <label className="qs-select-label">Pay frequency<select aria-label="Pay frequency" value={state.frequency} onChange={e => change('frequency', e.target.value)}>
        {(state.sCorpMode ? SCORP_FREQUENCIES : STANDARD_FREQUENCIES).map(k => <option key={k} value={k}>{FREQUENCIES[k].label}</option>)}
      </select></label>
    </div></section>
    <section><h3>When counts differ</h3><p className="qs-muted">Optional. Leave blank to use the defaults shown.</p><div className="qs-fields">
      <Field label="Approximate W-2s" optional min={1} value={state.w2Count} placeholder={'Defaults to ' + state.employeeCount}
        hint="Used for W-2 fees, ACA forms and the recurring 401(k) integration count." onChange={v => change('w2Count', v)} />
      <Field label="Approximate 1099s" optional value={state.count1099} placeholder="Defaults to 0"
        hint="Adds to Payroll, TLM, HCM and Full Service counts, plus annual payroll forms." onChange={v => change('count1099', v)} />
    </div></section>
    <section><h3>A personal point of contact</h3><Check label="Include my contact information" checked={state.showRepInfo} onChange={() => change('showRepInfo', !state.showRepInfo)} />
      {state.showRepInfo && <div className="qs-fields qs-mt">
        <Field label="Representative name" type="text" value={state.repName} onChange={v => change('repName', v)} />
        <Field label="Phone number" type="tel" value={state.repPhone} onChange={v => change('repPhone', v)} />
        <Field label="Email address" type="email" value={state.repEmail} onChange={v => change('repEmail', v)} />
        <p className="qs-muted">Blank fields stay off the quote.</p>
      </div>}
    </section>
    <section className="qs-scenario"><h3>Special payroll scenario</h3>
      <Check label="Owner-only S-Corp payroll" checked={state.sCorpMode} onChange={onModeChange} />
      <p className="qs-muted">A flat-fee payroll option. Other core modules and recurring add-ons are excluded while this mode is active. Specialty services remain available.</p>
    </section>
  </div>;
}

export function PricingEditor({ state, change }) {
  return <div className="qs-editor-stack">
    <section><h3>Recurring discount</h3>{state.sCorpMode ? <p className="qs-muted">Discounts do not apply to the owner-only payroll schedule.</p>
      : <Field label="Discount (%)" value={state.discountPercent} max={100} step={0.5} onChange={v => change('discountPercent', v)}
        hint="Applied only to eligible recurring fees. Individual services can be excluded in their pricing settings." />}</section>
    <section><h3>Annual processing</h3><p className="qs-muted">These adjustments affect year-end processing, not the recurring employee count.</p>
      <Field label="Annual forms count override" optional value={state.annualFormsOverride} placeholder="Use calculated count"
        hint="Affects payroll and ACA annual forms. Zero means zero forms; the base fee still applies." onChange={v => change('annualFormsOverride', v)} />
      <Field label="W-2 / 1099 rate per form ($)" optional step={0.01} value={state.payrollYearEndRateOverride ?? ''}
        placeholder={String(PRICING_CONFIG.payroll.yearEndPerItem)} hint="Leave blank for the standard rate. ACA's per-form rate is unchanged."
        onChange={v => change('payrollYearEndRateOverride', v === '' ? null : v)} />
    </section>
    <div className="qs-note"><strong>Looking for a module override?</strong><p>Choose “Details & pricing” on the service card to change its setup fee, available rate overrides, or discount eligibility.</p></div>
  </div>;
}

export function ServiceEditor({ item, state, change }) {
  if (item.source) return <ServiceCard service={item} source={item.source} state={state} change={change} />;
  const patch = update => change(item.id, { ...state[item.id], ...update });
  const edi = calc.calculateBenefitEdiRecurring(state);
  return <div className="qs-editor-stack">
    <div className="qs-note"><p>{item.description}</p><Check label="Include this service" checked={item.selected} onChange={() => toggleService(item.id, state, change)} /></div>
    {item.category === 'usage' ? <section><h3>Charges when used</h3>{item.rates.map(rate => <p key={rate} className="qs-fee-line">{rate}</p>)}<p className="qs-muted">These are reference rates only. They are excluded from the quote total.</p></section>
      : item.selected && <>
        {item.id === 'stateTaxId' && <Field label="Estimated number of IDs" min={1} value={state.stateTaxId.quantity} hint="One-time fee, per agency." onChange={quantity => patch({ quantity })} />}
        {item.id === 'pytd' && <div className="qs-fields"><Field label="Estimated hours" step={0.25} value={state.pytd.hours} onChange={hours => patch({ hours })} />
          <Field label="Pay statements" value={state.pytd.statements} onChange={statements => patch({ statements })} /></div>}
        {item.id === 'benefitEdi' && <>
          <Field label="Number of feeds" min={1} value={state.benefitEdi.feeds} hint={item.rate} onChange={feeds => patch({ feeds })} />
          <Check label="Bundle benefit EDI with COBRA" checked={state.benefitEdi.cobraBundle} onChange={() => patch({ cobraBundle: !state.benefitEdi.cobraBundle })} />
          {!state.sCorpMode && <Check label="Do not apply recurring discount" checked={state.discountOptOut.benefitEdi}
            onChange={() => change('discountOptOut', { ...state.discountOptOut, benefitEdi: !state.discountOptOut.benefitEdi })} />}
          <div className="qs-note"><strong>{formatMoney(edi.rate)} / employee / payroll</strong><p>{state.employeeCount} employees · {formatMoney(edi.min)} minimum per payroll.</p><p>Implementation: {formatMoney(calc.calculateBenefitEdiOneTime(state.benefitEdi))} one-time.</p></div>
        </>}
        <div className="qs-editor-total"><span>Estimated {item.period === 'one-time' ? 'one-time fee' : 'recurring fee'}</span><strong>{formatMoney(item.amount)}</strong></div>
      </>}
  </div>;
}

export function HelpContent() {
  return <div className="qs-editor-stack qs-help-content">
    <section><span className="qs-help-number">01</span><h3>A few details. A solid start.</h3><p>Enter your client, employee count and frequency in the brief at the top. Open Client details for W-2 / 1099 counts, your contact information, or owner-only S-Corp mode.</p></section>
    <section><span className="qs-help-number">02</span><h3>Add what the client needs.</h3><p>Use the category tabs to explore services. Search finds services across all categories. Add a service with one click; open Details & pricing for setup fees, rate overrides, and discount exclusions.</p></section>
    <section><span className="qs-help-number">03</span><h3>Make the numbers clear.</h3><p>The quote tray separates recurring, one-time and annual processing fees. Minimums may limit how much an employee change affects the total. Monthly-billed services are shown as a per-payroll equivalent.</p><p>Standard per-payroll rates remain flat when frequency changes. Frequency changes annual spend. Expense Tracking and the Digital Labor Law Poster keep their monthly billing rules.</p></section>
    <section><span className="qs-help-number">04</span><h3>Review, save, share.</h3><p>Preview the document for the client or internal sales. Internal sales adds annual totals alongside each module. The client document includes a separate annual recap and rate sheet.</p><p>Print / Save PDF creates the shareable copy. Turn off browser Headers and footers for a clean document. Save a named draft separately to keep editing later.</p></section>
    <div className="qs-note"><strong>Your drafts are local.</strong><p>Use the same browser and computer to load them. Clearing browser data removes drafts. This redesign uses separate storage from both earlier versions.</p></div>
  </div>;
}
