import { PRICING_CONFIG, ANCILLARY_PRICING, FREQUENCIES, formatMoney, formatDate } from '../constants/pricing';
import * as pricingCalc from '../lib/pricing-calc';
import { Icon } from './Icons';

// ------------------------------------------------------------------
// Rep-facing sales summary. Renders on-screen, prints on Print Quote
// (when this view is active), and can be exported as a CSV via the
// button up top for pasting into Salesforce.
// ------------------------------------------------------------------

const buildLineItems = (state) => {
  const periods = FREQUENCIES[state.frequency].periods;
  const items = [];

  if (state.sCorpMode) {
    const sc = pricingCalc.calculateSCorpCost(state);
    const rec = pricingCalc.calculateBenefitEdiRecurring({
      benefitEdi: state.benefitEdi,
      employeeCount: state.employeeCount,
      frequency: state.frequency,
    });
    const scPeriodsPerYear = sc.periodLabel === 'quarter' ? 4 : sc.periodLabel === 'year' ? 1 : FREQUENCIES[state.frequency].periods;

    items.push({
      key: 'scorp',
      name: 'Owner-Only S-Corp Payroll',
      perPayroll: sc.perPeriod,
      periodLabel: sc.periodLabel,
      perMonth: (sc.perPeriod * scPeriodsPerYear) / 12,
      annualRecurring: sc.perPeriod * scPeriodsPerYear,
      yearEnd: sc.yearEnd,
      setup: sc.setup,
      year1Revenue: sc.perPeriod * scPeriodsPerYear + sc.yearEnd + sc.setup,
    });

    if (state.benefitEdi?.enabled) {
      const oneTime = pricingCalc.calculateBenefitEdiOneTime(state.benefitEdi);
      items.push({
        key: 'benefitEdi',
        name: `Benefit Integration (EDI)${state.benefitEdi.cobraBundle ? ' + COBRA' : ''}`,
        perPayroll: rec.perPayroll,
        periodLabel: 'payroll',
        perMonth: rec.annual / 12,
        annualRecurring: rec.annual,
        yearEnd: 0,
        setup: oneTime,
        year1Revenue: rec.annual + oneTime,
      });
    }
  } else {
    Object.values(PRICING_CONFIG).forEach((module) => {
      if (!state.selectedModules[module.id]) return;
      const c = pricingCalc.calculateModuleCost(module.id, PRICING_CONFIG, state);
      const annualRecurring = c.perPayroll * periods;
      items.push({
        key: module.id,
        name: module.name,
        perPayroll: c.perPayroll,
        periodLabel: 'payroll',
        perMonth: annualRecurring / 12,
        annualRecurring,
        yearEnd: c.yearEnd,
        setup: c.setup,
        year1Revenue: annualRecurring + c.yearEnd + c.setup,
      });
    });

    Object.values(ANCILLARY_PRICING).forEach((svc) => {
      if (!state.selectedAncillary[svc.id]) return;
      const c = pricingCalc.calculateModuleCost(svc.id, ANCILLARY_PRICING, state);
      const annualRecurring = c.perPayroll * periods;
      items.push({
        key: svc.id,
        name: svc.name,
        perPayroll: c.perPayroll,
        periodLabel: 'payroll',
        perMonth: annualRecurring / 12,
        annualRecurring,
        yearEnd: c.yearEnd,
        setup: c.setup,
        year1Revenue: annualRecurring + c.setup,
        note: svc.monthlyBilling ? 'Billed monthly' : undefined,
      });
    });

    if (state.benefitEdi?.enabled) {
      const rec = pricingCalc.calculateBenefitEdiRecurring({
        benefitEdi: state.benefitEdi,
        employeeCount: state.employeeCount,
        frequency: state.frequency,
      });
      const oneTime = pricingCalc.calculateBenefitEdiOneTime(state.benefitEdi);
      items.push({
        key: 'benefitEdi',
        name: `Benefit Integration (EDI)${state.benefitEdi.cobraBundle ? ' + COBRA' : ''}`,
        perPayroll: rec.perPayroll,
        periodLabel: 'payroll',
        perMonth: rec.annual / 12,
        annualRecurring: rec.annual,
        yearEnd: 0,
        setup: oneTime,
        year1Revenue: rec.annual + oneTime,
      });
    }
  }

  // One-time-only items
  const stateTaxIdTotal = pricingCalc.calculateStateTaxIdTotal(state.stateTaxId);
  if (stateTaxIdTotal > 0) {
    items.push({
      key: 'stateTaxId',
      name: `State Tax ID Application (${state.stateTaxId.quantity} agencies)`,
      perPayroll: 0,
      periodLabel: 'one-time',
      perMonth: 0,
      annualRecurring: 0,
      yearEnd: 0,
      setup: stateTaxIdTotal,
      year1Revenue: stateTaxIdTotal,
    });
  }

  const pytdTotal = pricingCalc.calculatePytdTotal(state.pytd);
  if (pytdTotal > 0) {
    items.push({
      key: 'pytd',
      name: 'Payroll YTD Loading (PYTD)',
      perPayroll: 0,
      periodLabel: 'one-time',
      perMonth: 0,
      annualRecurring: 0,
      yearEnd: 0,
      setup: pytdTotal,
      year1Revenue: pytdTotal,
    });
  }

  return items;
};

const totalsFromItems = (items, state) => {
  const t = items.reduce((acc, item) => ({
    perPayroll: acc.perPayroll + item.perPayroll,
    perMonth: acc.perMonth + item.perMonth,
    annualRecurring: acc.annualRecurring + item.annualRecurring,
    yearEnd: acc.yearEnd + item.yearEnd,
    setup: acc.setup + item.setup,
    year1Revenue: acc.year1Revenue + item.year1Revenue,
  }), { perPayroll: 0, perMonth: 0, annualRecurring: 0, yearEnd: 0, setup: 0, year1Revenue: 0 });

  // Apply discount to recurring-only totals (setup + year-end stay untouched)
  if (!state.sCorpMode && state.discountPercent > 0) {
    // We need to only discount the discountable portion; recompute via calculateTotals
    const totals = pricingCalc.calculateTotals(state);
    t.discountPerPayroll = totals.discountPerPayroll;
    t.discountAnnualRecurring = totals.discountAnnual;
    t.perPayroll = totals.finalPerPayroll;
    // Adjust monthly + annualRecurring proportionally
    const periods = FREQUENCIES[state.frequency].periods;
    t.perMonth = (totals.finalPerPayroll * periods) / 12;
    t.annualRecurring = totals.finalPerPayroll * periods;
    t.year1Revenue = t.annualRecurring + t.yearEnd + t.setup;
  } else {
    t.discountPerPayroll = 0;
    t.discountAnnualRecurring = 0;
  }
  return t;
};

// CSV escape
const csvEscape = (val) => {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const downloadCsv = (state, items, totals) => {
  const rows = [];

  // Header block
  rows.push(['SALES SUMMARY']);
  rows.push(['Generated', new Date().toISOString()]);
  rows.push([]);
  rows.push(['Client', state.clientName || '(unnamed)']);
  rows.push(['Quote Date', state.quoteDate]);
  rows.push(['Pay Frequency', FREQUENCIES[state.frequency].label]);
  rows.push(['Employees', state.employeeCount]);
  const w2Head = (state.w2Count !== '' && parseInt(state.w2Count) > 0) ? parseInt(state.w2Count) : state.employeeCount;
  rows.push(['Annual W-2s', w2Head]);
  rows.push(['1099 Contractors', parseInt(state.count1099) || 0]);
  if (state.expenseUserCount !== '' && parseInt(state.expenseUserCount) > 0) {
    rows.push(['Expense Users', parseInt(state.expenseUserCount)]);
  }
  if (state.showRepInfo && state.repName) rows.push(['Sales Rep', state.repName]);
  if (state.discountPercent > 0) rows.push(['Recurring Discount', `${state.discountPercent}%`]);
  rows.push(['Mode', state.sCorpMode ? 'S-Corp Owner-Only' : 'Standard']);
  rows.push([]);

  // Line items
  rows.push(['LINE ITEMS']);
  rows.push(['Module', 'Per Payroll', 'Per Month', 'Annual Recurring', 'Year-End Fees', 'One-Time Setup', 'Year 1 Revenue', 'Note']);
  items.forEach(item => {
    rows.push([
      item.name,
      item.perPayroll.toFixed(2),
      item.perMonth.toFixed(2),
      item.annualRecurring.toFixed(2),
      item.yearEnd.toFixed(2),
      item.setup.toFixed(2),
      item.year1Revenue.toFixed(2),
      item.note || '',
    ]);
  });
  rows.push([]);

  // Totals
  rows.push(['TOTALS']);
  if (totals.discountPerPayroll > 0) {
    rows.push(['Discount Applied (per payroll)', totals.discountPerPayroll.toFixed(2)]);
    rows.push(['Discount Applied (annual)', totals.discountAnnualRecurring.toFixed(2)]);
  }
  rows.push(['Total Per Payroll (after discount)', totals.perPayroll.toFixed(2)]);
  rows.push(['Total Per Month', totals.perMonth.toFixed(2)]);
  rows.push(['Total Annual Recurring', totals.annualRecurring.toFixed(2)]);
  rows.push(['Total Year-End Fees', totals.yearEnd.toFixed(2)]);
  rows.push(['Total One-Time Setup', totals.setup.toFixed(2)]);
  rows.push(['TOTAL YEAR 1 REVENUE', totals.year1Revenue.toFixed(2)]);

  const csv = rows.map(r => r.map(csvEscape).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (state.clientName || 'sales-summary').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  a.download = `${safeName}-sales-summary-${state.quoteDate}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default function SalesSummary({ state, onNotify }) {
  const items = buildLineItems(state);
  const totals = totalsFromItems(items, state);
  const w2Head = (state.w2Count !== '' && parseInt(state.w2Count) > 0) ? parseInt(state.w2Count) : state.employeeCount;
  const has1099 = (parseInt(state.count1099) || 0) > 0;
  const annualForms = state.annualFormsOverride !== '' && state.annualFormsOverride !== null
    ? parseInt(state.annualFormsOverride) || 0
    : null;

  const handleCsv = () => {
    downloadCsv(state, items, totals);
    if (onNotify) onNotify('Sales summary CSV downloaded');
  };

  return (
    <section className="bg-white shadow-xl border border-stone-200 rounded-2xl overflow-hidden max-w-4xl mx-auto print-container print-page-fill sales-summary">
      {/* Header — internal badge stays visible when printed */}
      <div className="bg-slate-800 text-white p-6 sales-header">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold tracking-widest uppercase bg-brand-gold/90 text-white px-2 py-0.5 rounded-full">Internal</span>
              <span className="text-[10px] font-bold tracking-widest uppercase opacity-70">Sales Summary</span>
            </div>
            <h1 className="text-xl font-bold font-display tracking-tight">
              {state.clientName || <span className="opacity-50 italic">[Client Name]</span>}
            </h1>
            <p className="text-xs opacity-70 mt-1">Quote {formatDate(state.quoteDate)} · Not for client distribution</p>
          </div>
          <div className="text-right no-print">
            <button
              onClick={handleCsv}
              className="inline-flex items-center gap-2 bg-brand-gold hover:bg-brand-goldDark text-white px-4 py-2 rounded-lg font-semibold text-xs transition-colors shadow-sm"
            >
              <Icon.Download className="w-4 h-4" />
              Download CSV
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 flex flex-col quote-body">
        <div className="flex-1">

          {/* Client / quote fact sheet */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 pb-6 border-b border-stone-200">
            <FactCell label="Employees" value={state.employeeCount} />
            <FactCell label="Annual W-2s" value={w2Head} note={annualForms !== null ? `Override: ${annualForms} annual forms` : undefined} />
            <FactCell label="1099s" value={parseInt(state.count1099) || 0} />
            <FactCell label="Frequency" value={FREQUENCIES[state.frequency].label} />
            {state.discountPercent > 0 && (
              <FactCell label="Recurring Discount" value={`${state.discountPercent}%`} accent />
            )}
            {state.showRepInfo && state.repName && (
              <FactCell label="Rep" value={state.repName} />
            )}
            {state.sCorpMode && (
              <FactCell label="Mode" value="S-Corp Owner-Only" accent />
            )}
          </div>

          {/* Line items table */}
          <div className="mb-6">
            <h2 className="text-[11px] font-bold text-brand-navy uppercase tracking-widest mb-2">Per-Module Revenue Breakdown</h2>
            <div className="gold-hairline mb-4"></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-stone-200">
                    <th className="pb-2 pl-1">Module</th>
                    <th className="pb-2 text-right whitespace-nowrap">Per Payroll</th>
                    <th className="pb-2 text-right whitespace-nowrap">Per Month</th>
                    <th className="pb-2 text-right whitespace-nowrap">Annual Recurring</th>
                    <th className="pb-2 text-right whitespace-nowrap">Year-End</th>
                    <th className="pb-2 text-right whitespace-nowrap">Setup</th>
                    <th className="pb-2 text-right whitespace-nowrap pr-1">Year 1 Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                        No modules selected. Choose modules to generate a sales summary.
                      </td>
                    </tr>
                  ) : items.map(item => (
                    <tr key={item.key} className="tabular-nums">
                      <td className="py-2.5 pl-1">
                        <div className="font-semibold text-slate-800">{item.name}</div>
                        {item.note && <div className="text-[10px] text-slate-400">{item.note}</div>}
                      </td>
                      <td className="py-2.5 text-right text-slate-700">
                        {item.perPayroll > 0 ? formatMoney(item.perPayroll) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2.5 text-right text-slate-700">
                        {item.perMonth > 0 ? formatMoney(item.perMonth) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2.5 text-right text-slate-700">
                        {item.annualRecurring > 0 ? formatMoney(item.annualRecurring) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2.5 text-right text-slate-700">
                        {item.yearEnd > 0 ? formatMoney(item.yearEnd) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2.5 text-right text-slate-700">
                        {item.setup > 0 ? formatMoney(item.setup) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-brand-navy pr-1">
                        {formatMoney(item.year1Revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grand totals */}
          <div className="mb-6">
            <h2 className="text-[11px] font-bold text-brand-navy uppercase tracking-widest mb-2">Forecast Totals</h2>
            <div className="gold-hairline mb-4"></div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <TotalCell label="Per Payroll" value={formatMoney(totals.perPayroll)} sub={totals.discountPerPayroll > 0 ? `after ${state.discountPercent}% discount` : undefined} />
              <TotalCell label="Per Month" value={formatMoney(totals.perMonth)} />
              <TotalCell label="Annual Recurring" value={formatMoney(totals.annualRecurring)} sub={totals.discountAnnualRecurring > 0 ? `after ${formatMoney(totals.discountAnnualRecurring)} discount` : undefined} />
              <TotalCell label="Year-End Fees" value={formatMoney(totals.yearEnd)} sub={has1099 || annualForms !== null ? 'W-2 + 1099 combined' : undefined} />
              <TotalCell label="One-Time Setup" value={formatMoney(totals.setup)} sub="Billed at onboarding" />
              <TotalCell label="Total Year 1 Revenue" value={formatMoney(totals.year1Revenue)} hero />
            </div>
          </div>
        </div>

        {/* Internal note */}
        <div className="mt-6 pt-4 border-t border-stone-100 text-[11px] text-slate-400">
          <p className="font-bold text-slate-500 uppercase tracking-wider mb-1">Internal Reference</p>
          <p>
            Year 1 revenue = annual recurring (after discount) + year-end fees + one-time setup.
            Recurring discount applies to per-payroll fees for participating modules only.
            All amounts are estimates based on quote inputs at time of generation.
          </p>
        </div>

        <div className="mt-4 flex justify-between items-center text-[10px] text-slate-300">
          <span>Creative Planning Payroll · Internal Sales Summary · Confidential</span>
          <span>Generated {formatDate(state.quoteDate)}</span>
        </div>
      </div>
    </section>
  );
}

function FactCell({ label, value, note, accent }) {
  return (
    <div>
      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</div>
      <div className={`text-sm font-bold tabular-nums ${accent ? 'text-brand-gold' : 'text-brand-navy'}`}>{value}</div>
      {note && <div className="text-[9px] text-slate-400 italic mt-0.5">{note}</div>}
    </div>
  );
}

function TotalCell({ label, value, sub, hero }) {
  return (
    <div className={`rounded-xl p-4 border ${hero ? 'bg-brand-navy text-white border-brand-navy shadow-md' : 'bg-brand-navy/5 border-brand-navy/10'}`}>
      <div className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${hero ? 'text-white/70' : 'text-slate-500'}`}>{label}</div>
      <div className={`font-display font-bold tabular-nums ${hero ? 'text-white text-2xl' : 'text-brand-navy text-lg'}`} style={{ letterSpacing: '-0.01em' }}>{value}</div>
      {sub && <div className={`text-[10px] mt-0.5 ${hero ? 'text-white/60' : 'text-slate-400'}`}>{sub}</div>}
    </div>
  );
}
