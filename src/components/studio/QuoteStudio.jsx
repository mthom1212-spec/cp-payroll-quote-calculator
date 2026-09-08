import { useEffect, useRef, useState } from 'react';
import { Icon, ModuleIcon } from '../Icons';
import { Field } from '../workspace/Fields';
import { FREQUENCIES, STANDARD_FREQUENCIES, SCORP_FREQUENCIES, formatMoney } from '../../constants/pricing';
import { catalogFor, recurringAnnual, toggleService } from '../../lib/studio-model';
import { calculateTotals } from '../../lib/pricing-calc';
import Drawer from './Drawer';
import { ClientEditor, PricingEditor, ServiceEditor, HelpContent } from './Editors';
import './studio.css';

function Glyph({ name, size = 20 }) {
  const paths = { grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    file: 'M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6 M9 16h6',
    search: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    arrow: 'M4 12h16 M14 6l6 6-6 6', save: 'M4 3h14l3 3v15H3V3z M7 3v6h10V3 M7 21v-8h10v8',
    layers: 'M12 3 2 8l10 5 10-5-10-5z M2 12l10 5 10-5 M2 16l10 5 10-5',
    sliders: 'M3 6h4 M11 6h10 M3 12h10 M17 12h4 M3 18h4 M11 18h10 M7 3v6 M13 9v6 M7 15v6',
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.layers} /></svg>;
}

const categories = [['core', 'Core modules'], ['addons', 'Recurring add-ons'], ['special', 'Specialty services'], ['usage', 'Usage-based']];

function CatalogCard({ item, state, onToggle, onEdit }) {
  const sc = state.sCorpMode && item.id === 'payroll';
  return <article className={'qs-card ' + (item.selected ? 'is-selected ' : '') + (item.id === 'payroll' ? 'qs-featured' : '')} data-service={item.id}>
    <div className="qs-card-top"><span className={'qs-product-icon tone-' + item.category}>
      {item.category === 'core' ? <ModuleIcon moduleId={item.id} className="qs-module-icon" /> : <Glyph name={item.category === 'special' ? 'sliders' : item.category === 'usage' ? 'file' : 'layers'} size={23} />}
    </span><button className={'qs-add ' + (item.selected ? 'is-added' : '')} aria-label={(item.selected ? 'Remove ' : 'Add ') + item.name}
      aria-pressed={item.selected} disabled={sc} onClick={onToggle}>{item.selected ? <><Icon.Check /> Added</> : <><span>+</span> Add</>}</button></div>
    <div className="qs-card-copy"><h3>{item.name}</h3><p>{item.description}</p></div>
    {item.period === 'usage' ? <div className="qs-usage-rates">{item.rates.map(rate => <span key={rate}>{rate}</span>)}</div>
      : <div className="qs-card-amount"><strong>{formatMoney(item.amount)}</strong><span> / {item.period === 'one-time' ? 'one-time' : item.period}</span>
        {item.selected && item.discount && <small>{state.discountPercent}% off</small>}</div>}
    <div className="qs-card-meta">{item.category === 'usage' ? 'Reference rates · Excluded from totals' : <>{item.countLabel}
      {item.costs?.isMinApplied && <span className="qs-minimum">Minimum applied</span>}{item.custom && <span className="qs-custom">Custom rate</span>}</>}</div>
    {item.billingNote && <p className="qs-billing-note">{item.billingNote} · billed monthly</p>}
    <div className="qs-card-footer"><span>{item.included?.length ? item.included.length + ' services included' : item.period === 'usage' ? 'Pay only when used' : item.rate || 'Configure to fit your client'}</span>
      <button onClick={onEdit} aria-label={'Details and pricing for ' + item.name}>Details & pricing <span aria-hidden="true">↗</span></button></div>
  </article>;
}

function QuoteTray({ state, totals, items, onEdit, onReview, onClient, onPricing, lastAction, onUndo }) {
  const selected = items.filter(item => item.selected);
  const recurring = selected.filter(item => !['usage', 'one-time'].includes(item.period));
  const minimumCount = recurring.filter(item => item.costs?.isMinApplied).length;
  const mixed = state.sCorpMode && state.benefitEdi.enabled && totals.sCorpPeriodLabel !== 'payroll';
  return <aside className="qs-tray">
    <div className="qs-tray-title"><div><span className="qs-eyebrow">LIVE ESTIMATE</span><h2>Your quote, at a glance.</h2></div><span className="qs-live-dot" aria-label="Live calculation" /></div>
    <div className="qs-tray-client"><span>{state.clientName || 'Your client'}</span><button onClick={onClient}>Edit</button></div>
    {!mixed ? <div className="qs-tray-price"><strong>{formatMoney(totals.finalPerPayroll)}</strong><span>per {totals.sCorpPeriodLabel || 'payroll'}</span></div>
      : <div className="qs-mixed"><strong>Two billing schedules</strong>{recurring.map(item => <p key={item.id}>{formatMoney(item.amount)} / {item.period}<span>{item.name}</span></p>)}</div>}
    <p className="qs-tray-caption">{state.employeeCount} employees · {FREQUENCIES[state.frequency].label}{state.discountPercent > 0 && !state.sCorpMode ? ' · after discounts' : ''}</p>
    <div className="qs-tray-items"><div className="qs-small-heading"><span>RECURRING SERVICES</span><b>{recurring.length}</b></div>
      {recurring.length ? recurring.map(item => <button key={item.id} onClick={() => onEdit(item.id)}><span>{item.name}{item.discount && <b className="qs-discount-star"> *</b>}</span><strong>{formatMoney(item.amount)}</strong></button>)
        : <p className="qs-muted">Add your first service to build the recurring estimate.</p>}
      <button className="qs-discount-link" onClick={onPricing}><Glyph name="sliders" size={15} />{state.discountPercent ? state.discountPercent + '% recurring discount' : 'Add a discount or adjust annual fees'}<span>↗</span></button>
    </div>
    <dl className="qs-tray-totals"><div><dt>One-time fees <small>Implementation & specialty services</small></dt><dd>{formatMoney(totals.totalSetup)}</dd></div>
      <div><dt>Annual processing <small>Year-end fees, billed separately</small></dt><dd>{formatMoney(totals.totalYearEnd)}</dd></div>
      <div className="qs-annual-line"><dt>Annual recurring <small>After applicable discounts</small></dt><dd>{formatMoney(recurringAnnual(state, totals))}</dd></div></dl>
    {minimumCount > 0 && <div className="qs-minimum-note"><Icon.AlertCircle /><p>{minimumCount} {minimumCount === 1 ? 'service is' : 'services are'} at a minimum. Employee changes may not change every fee.</p></div>}
    <p className="qs-tray-footnote">Usage charges are excluded. Annual recurring excludes one-time and annual processing fees.</p>
    {lastAction && <div className="qs-undo" role="status"><span>{lastAction.label}</span><button onClick={onUndo}>Undo</button></div>}
    <button className="qs-button qs-primary qs-full" onClick={onReview} disabled={!selected.some(item => item.period !== 'usage')}>Preview your quote <Glyph name="arrow" size={17} /></button>
    <span className="qs-tray-bottom">Review before you share.</span>
  </aside>;
}

function DraftLibrary({ drafts, onLoad, onDelete, onSave, onBuild }) {
  const [query, setQuery] = useState('');
  const rows = Object.entries(drafts).filter(([name, data]) => (name + ' ' + data.clientName).toLowerCase().includes(query.toLowerCase()))
    .sort(([, a], [, b]) => (b.savedAt || '').localeCompare(a.savedAt || ''));
  return <section className="qs-draft-library"><div className="qs-library-toolbar"><label className="qs-search"><Glyph name="search" size={17} /><input placeholder="Find a saved quote…" aria-label="Search saved quotes" value={query} onChange={e => setQuery(e.target.value)} /></label><button className="qs-button qs-primary" onClick={onSave}><Glyph name="save" size={17} /> Save current quote</button></div>
    {rows.length ? <table><thead><tr><th>Quote</th><th>Client</th><th>Last saved</th><th>Recurring estimate</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map(([name, data]) => {
      let estimate = '—';
      try { const totals = calculateTotals(data); estimate = data.sCorpMode && data.benefitEdi?.enabled && totals.sCorpPeriodLabel !== 'payroll' ? 'Mixed schedules' : formatMoney(totals.finalPerPayroll) + '/' + (totals.sCorpPeriodLabel || 'payroll'); } catch { /* Older incomplete drafts remain loadable. */ }
      return <tr key={name}><td><Glyph name="file" size={18} /><strong>{name}</strong></td><td>{data.clientName || 'Unnamed client'}<small>{data.employeeCount} employees</small></td><td>{data.savedAt ? new Date(data.savedAt).toLocaleDateString() : '—'}</td><td>{estimate}</td><td><button onClick={() => onLoad(name)}>Open <span>↗</span></button><button className="qs-delete" aria-label={'Delete ' + name} onClick={() => onDelete(name)}><Icon.X /></button></td></tr>;
    })}</tbody></table> : <div className="qs-empty"><div className="qs-paper-stack" aria-hidden="true"><Glyph name="file" size={38} /></div><h2>{query ? 'No matching quotes.' : 'Good work deserves a saved draft.'}</h2><p>{query ? 'Try a different client or quote name.' : 'Save a named version to return to it on this browser and computer.'}</p><button className="qs-button qs-secondary" onClick={onBuild}>Back to your quote <Glyph name="arrow" size={17} /></button></div>}
    <div className="qs-library-note"><Icon.AlertCircle /><p>Drafts are stored on this computer, in this browser. They are separate from both earlier Quote Builder versions. Export a PDF for a permanent copy.</p></div>
  </section>;
}

export default function QuoteStudio({ state, change, totals, documents, savedQuotes, onSave, onLoad, onDelete, toast }) {
  const [view, setView] = useState('build');
  const [category, setCategory] = useState('core');
  const [search, setSearch] = useState('');
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [drawer, setDrawer] = useState(null);
  const [saveName, setSaveName] = useState('');
  const [overwrite, setOverwrite] = useState(false);
  const [savedSignature, setSavedSignature] = useState(null);
  const [lastAction, setLastAction] = useState(null);
  const searchRef = useRef(null);
  const titleRef = useRef(null);
  const documentsRef = useRef(null);
  const standardRef = useRef(null);
  const items = catalogFor(state);
  const selected = items.filter(item => item.selected);
  const valid = selected.some(item => item.period !== 'usage') && state.employeeCount > 0;
  const signature = snapshot => JSON.stringify(Object.keys(state).map(key => [key, snapshot[key]]));
  const isSaved = savedSignature === signature(state);
  const filtered = items.filter(item => (!search.trim() ? item.category === category : (item.name + ' ' + item.description).toLowerCase().includes(search.toLowerCase().trim())) && (!selectedOnly || item.selected));
  const editedItem = items.find(item => item.id === drawer);
  const navigate = target => { setView(target); window.scrollTo({ top: 0, behavior: 'instant' }); requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true })); };
  const openSave = () => { setSaveName(state.clientName); setOverwrite(false); setDrawer('save'); };
  const save = () => {
    if (!saveName.trim()) return;
    if (Object.hasOwn(savedQuotes, saveName.trim()) && !overwrite) { setOverwrite(true); return; }
    if (onSave(saveName) !== false) { setSavedSignature(signature(state)); setDrawer(null); }
  };
  const load = name => { onLoad(name); setSavedSignature(signature(savedQuotes[name])); standardRef.current = null; setLastAction(null); setCategory('core'); setSearch(''); navigate('build'); };
  const select = item => {
    const key = ['stateTaxId', 'pytd', 'benefitEdi'].includes(item.id) ? item.id : item.source && item.category === 'core' ? 'selectedModules' : 'selectedAncillary';
    const previous = state[key];
    toggleService(item.id, state, change);
    setLastAction({ key, previous, label: (item.selected ? 'Removed ' : 'Added ') + item.name });
  };
  const modeChange = () => {
    if (!state.sCorpMode) {
      standardRef.current = { employeeCount: state.employeeCount, frequency: state.frequency, discountPercent: state.discountPercent, payrollBaseOverride: state.payrollBaseOverride };
      Object.entries({ sCorpMode: true, employeeCount: 1, frequency: 'monthly', discountPercent: 0, payrollBaseOverride: null }).forEach(([key, value]) => change(key, value));
    } else Object.entries({ sCorpMode: false, employeeCount: 15, frequency: 'biweekly', discountPercent: 0, payrollBaseOverride: null, ...standardRef.current }).forEach(([key, value]) => change(key, value));
    setCategory('core'); setSearch(''); setLastAction(null);
  };
  useEffect(() => {
    const keydown = event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && view === 'build' && !drawer) { event.preventDefault(); searchRef.current?.focus(); } };
    window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown);
  }, [view, drawer]);
  return <div className="qs-root">
    <aside className="qs-sidebar no-print">
      <a className="qs-brand" href="#" onClick={e => { e.preventDefault(); navigate('build'); }}><span className="qs-brand-mark">C<span>✦</span></span><strong>Creative Planning<span>PAYROLL</span></strong></a>
      <div className="qs-sidebar-label">YOUR WORKSPACE</div>
      <nav aria-label="Workspace navigation">{[['build', 'Build quote', 'grid'], ['review', 'Document preview', 'file'], ['drafts', 'Saved quotes', 'save']].map(([id, label, icon]) => <button key={id} aria-label={label} aria-current={view === id ? 'page' : undefined} onClick={() => navigate(id)}><Glyph name={icon} /><span>{label}</span>{id === 'drafts' && Object.keys(savedQuotes).length > 0 && <b>{Object.keys(savedQuotes).length}</b>}</button>)}</nav>
      <div className="qs-sidebar-bottom"><div className="qs-sidebar-card"><span className="qs-mini-star">✧</span><strong>Less administration.<br />More conversation.</strong><p>A clear proposal starts with a clear picture.</p></div>
        <button className="qs-sidebar-help" onClick={() => setDrawer('help')}><Icon.Help /> A quick tour <span>↗</span></button>
        <a className="qs-old-preview" href="http://127.0.0.1:4174/cp-payroll-quote-calculator/" target="_blank" rel="noreferrer">Earlier preview ↗</a>
        <div className="qs-preview-tag"><span /> DESIGN PREVIEW · V2</div>
      </div>
    </aside>
    <div className="qs-workspace">
      <header className="qs-topbar no-print"><div><span>Quote Builder</span><b>/</b><strong>{view === 'drafts' ? 'Your library' : state.clientName || 'New quote'}</strong></div><div className="qs-topbar-actions"><span className={'qs-save-state ' + (isSaved ? 'is-saved' : '')}><i />{isSaved ? 'Draft saved' : 'Unsaved draft'}</span><button className="qs-button qs-secondary" onClick={openSave}><Glyph name="save" size={16} /> Save draft</button><button className="qs-avatar" onClick={() => setDrawer('client')} aria-label="Client and representative details">{state.showRepInfo && state.repName ? state.repName.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase() : 'CP'}</button></div></header>
      <main className="qs-main">
        <div className="no-print">
          <div className="qs-heading"><div><div className="qs-eyebrow">{view === 'build' ? 'THOUGHTFULLY BUILT. CLEARLY PRICED.' : view === 'review' ? 'THE FINISHING TOUCH' : 'READY WHEN YOU ARE'}</div><h1 ref={titleRef} tabIndex="-1">{view === 'build' ? <>A better beginning<span>.</span></> : view === 'review' ? <>Ready to make an impression<span>?</span></> : <>Your work, ready to return to<span>.</span></>}</h1><p>{view === 'build' ? 'The right services. A clear estimate. A confident next conversation.' : view === 'review' ? 'Give the details one last look, then put a polished proposal in their hands.' : 'Pick up a conversation where you left it.'}</p></div>{view === 'build' && <span className="qs-heading-note"><span>01</span> Build your client’s solution</span>}</div>
          {view === 'build' && <>
            <section className="qs-brief" aria-label="Client brief"><span className="qs-brief-icon"><Icon.Users /></span><Field label="Client / company" type="text" placeholder="Who are we building for?" value={state.clientName} onChange={v => change('clientName', v)} />
              <Field label="Active employees" min={1} value={state.employeeCount} onChange={v => change('employeeCount', v)} />
              <label className="qs-select-label">Pay frequency<select aria-label="Pay frequency" value={state.frequency} onChange={e => change('frequency', e.target.value)}>{(state.sCorpMode ? SCORP_FREQUENCIES : STANDARD_FREQUENCIES).map(k => <option key={k} value={k}>{FREQUENCIES[k].label}</option>)}</select></label>
              <button className="qs-brief-more" onClick={() => setDrawer('client')}><Glyph name="sliders" size={17} /> Client details <span>↗</span>{state.sCorpMode && <small>S-Corp mode</small>}</button>
            </section>
            <div className="qs-build-layout"><section className="qs-catalog" aria-label="Service catalog">
              <div className="qs-catalog-title"><h2>Build their solution <span>{selected.length} selected</span></h2><label className="qs-search"><Glyph name="search" size={16} /><input ref={searchRef} aria-label="Search all services" placeholder="Find a service…" value={search} onChange={e => setSearch(e.target.value)} /><kbd>Ctrl K</kbd></label></div>
              <div className="qs-catalog-tabs" aria-label="Service categories">{categories.filter(([id]) => !state.sCorpMode || ['core', 'special'].includes(id)).map(([id, label]) => <button key={id} aria-pressed={!search && category === id} onClick={() => { setCategory(id); setSearch(''); }}>{label}{items.filter(i => i.category === id && i.selected).length > 0 && <b>{items.filter(i => i.category === id && i.selected).length}</b>}</button>)}</div>
              <div className="qs-catalog-context"><p>{search ? 'Results across all available services' : category === 'core' ? 'Start with the essentials. Everything else builds from here.' : category === 'addons' ? 'A little more capability, right where your client needs it.' : category === 'special' ? 'Implementation services and connected benefit feeds.' : 'Transparent rates for services your client may use.'}</p><label><input type="checkbox" checked={selectedOnly} onChange={() => setSelectedOnly(!selectedOnly)} />Selected only</label></div>
              <div className="qs-card-grid">{filtered.map(item => <CatalogCard key={item.id} item={item} state={state} onToggle={() => select(item)} onEdit={() => setDrawer(item.id)} />)}</div>
              {!filtered.length && <div className="qs-empty"><Glyph name="search" size={28} /><h2>No services found.</h2><p>Try another search or turn off Selected only.</p><button className="qs-button qs-secondary" onClick={() => { setSearch(''); setSelectedOnly(false); }}>Clear filters</button></div>}
              <div className="qs-catalog-bottom"><Icon.Help /><p>Choose <strong>Details & pricing</strong> for included services, setup fees and available overrides.</p></div>
            </section><QuoteTray state={state} totals={totals} items={items} onEdit={setDrawer} onReview={() => navigate('review')} onClient={() => setDrawer('client')} onPricing={() => setDrawer('pricing')} lastAction={lastAction} onUndo={() => { change(lastAction.key, lastAction.previous); setLastAction(null); }} /></div>
          </>}
          {view === 'drafts' && <DraftLibrary drafts={savedQuotes} onLoad={load} onDelete={name => { if (window.confirm('Delete saved quote “' + name + '”?')) onDelete(name); }} onSave={openSave} onBuild={() => navigate('build')} />}
          {view === 'review' && <div className="qs-review-toolbar"><div className="qs-output-switch" aria-label="Output audience"><button aria-pressed={state.clientFacing} onClick={() => change('clientFacing', true)}>Client proposal</button><button aria-pressed={!state.clientFacing} onClick={() => change('clientFacing', false)}>Internal sales</button></div><p>{state.clientFacing ? 'Pricing · Annual recap & rates · Included services' : 'Includes annual estimates alongside each module'}</p><button className="qs-button qs-primary" disabled={!valid} onClick={() => window.print()}><Icon.Printer /> Print / Save PDF</button></div>}
          {view === 'review' && !valid && <div className="qs-empty"><h2>A few services would help.</h2><p>Add at least one priced service to prepare your quote.</p><button className="qs-button qs-primary" onClick={() => navigate('build')}>Build your quote</button></div>}
        </div>
        <div className={'qs-document-layout ' + (view === 'review' && valid ? '' : 'qs-document-hidden')}>
          <aside className="qs-document-nav no-print"><span className="qs-eyebrow">IN THIS DOCUMENT</span>{(state.clientFacing ? ['Your investment', ...(state.sCorpMode ? [] : ['Annual recap & rates']), 'Included services'] : ['Internal estimate']).map((name, i) => <button key={name} onClick={() => documentsRef.current?.querySelectorAll(':scope > section')[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><span>{String(i + 1).padStart(2, '0')}</span>{name}</button>)}
            <div className="qs-note"><strong>Before you share</strong><p>{state.clientName ? 'Check the company details, counts and selected services.' : 'Add a company name before sharing.'}</p><button onClick={() => setDrawer('client')}>Edit client details ↗</button></div><p className="qs-print-note">For a clean PDF, turn off “Headers and footers” in your browser’s print dialog. Save your editable draft separately.</p>
          </aside>
          <div className="qs-documents" ref={documentsRef}>{documents}</div>
        </div>
        <footer className="qs-footer no-print"><span>Creative Planning Payroll</span><span>Designed for a more confident conversation.</span></footer>
      </main>
    </div>
    {drawer && <Drawer key={drawer} title={editedItem?.name || ({ client: 'The client behind the quote.', pricing: 'Fine-tune the numbers.', help: 'A little guidance goes a long way.', save: 'Pick up here next time.' })[drawer]} subtitle={editedItem ? 'Understand the service. Make it fit.' : undefined} onClose={() => setDrawer(null)}>
      {drawer === 'client' && <ClientEditor state={state} change={change} onModeChange={modeChange} />}
      {drawer === 'pricing' && <PricingEditor state={state} change={change} />}
      {drawer === 'help' && <HelpContent />}
      {editedItem && <ServiceEditor item={editedItem} state={state} change={change} />}
      {drawer === 'save' && <div className="qs-editor-stack"><Field label="Quote name" type="text" placeholder="Company name — proposal version" value={saveName} onChange={v => { setSaveName(v); setOverwrite(false); }} onKeyDown={e => { if (e.key === 'Enter') save(); }} />
        {overwrite && <div className="qs-note">A draft with this name already exists. Replace it, or choose another name.</div>}
        <button className="qs-button qs-primary" disabled={!saveName.trim()} onClick={save}>{overwrite ? 'Replace saved quote' : 'Save quote'} <Glyph name="save" size={17} /></button><p className="qs-muted">Stored in this browser on this computer. Original and earlier preview drafts remain separate.</p></div>}
    </Drawer>}
    {toast}
  </div>;
}
