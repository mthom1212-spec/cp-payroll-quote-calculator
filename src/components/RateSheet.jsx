import {
  PRICING_CONFIG, ANCILLARY_PRICING, ANCILLARY_USAGE, ISOLVED_ADDONS,
  USAGE_RATE_SHEET, SHIPPING_RATE_SHEET,
  STATE_TAX_ID_PER_ID, PYTD_HOURLY, PYTD_PER_STATEMENT,
  BENEFIT_EDI_FIRST_FEED, BENEFIT_EDI_ADDL_FEED, BENEFIT_EDI_MIN,
  BENEFIT_EDI_RATE_STD, BENEFIT_EDI_RATE_BUNDLE,
  JURISDICTION_FEE_PER_LOCATION,
  SCORP_YEAR_END_BASE, SCORP_YEAR_END_PER_FORM,
  SCORP_ANNUAL_FLAT, SCORP_QUARTERLY_FLAT, SCORP_BIWEEKLY_BASE,
  formatMoney, formatDate,
} from '../constants/pricing';
import { BrandMark } from './Icons';

// ------------------------------------------------------------------
// Rate Sheet — a reference-only rate card showing all current pricing
// at a glance. No selections needed. Prints cleanly on Letter.
// Every number here is pulled from constants/pricing.js, so the rate
// sheet stays in sync automatically as pricing evolves.
// ------------------------------------------------------------------

const money = (n) => formatMoney(n);
const dash = <span className="text-slate-300">—</span>;

// Section wrapper with a gold accent bar + serif title + subtitle line.
function Section({ title, subtitle, children, className = '' }) {
  return (
    <section className={`rate-section ${className}`}>
      <div className="flex items-end justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-brand-gold rounded-sm"></div>
          <div>
            <h2 className="text-lg font-bold text-brand-navy font-display leading-tight">{title}</h2>
            {subtitle && <p className="text-[10px] text-slate-400 uppercase tracking-[0.14em] font-semibold mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

// Compact, print-friendly table with right-aligned numeric columns.
function Table({ cols, rows, footnote }) {
  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden bg-white">
      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr className="bg-brand-navy/5 border-b-2 border-brand-navy text-[9px] uppercase tracking-[0.12em] font-bold text-brand-navy">
            {cols.map((c, i) => (
              <th key={i} className={`px-3 py-2 ${c.align === 'right' ? 'text-right' : 'text-left'} ${c.w || ''}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((r, ri) => (
            <tr key={ri} className={r.highlight ? 'bg-brand-gold/5' : ''}>
              {r.cells.map((cell, ci) => (
                <td
                  key={ci}
                  className={`px-3 py-1.5 align-top ${cols[ci]?.align === 'right' ? 'text-right whitespace-nowrap' : ''} ${
                    ci === 0 ? 'font-medium text-slate-800' : 'text-slate-700'
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {footnote && (
        <div className="px-3 py-1.5 text-[10px] text-slate-400 italic border-t border-stone-100 bg-stone-50">
          {footnote}
        </div>
      )}
    </div>
  );
}

const sub = (t) => <span className="block text-[10px] text-slate-400 font-normal italic leading-tight mt-0.5">{t}</span>;

export default function RateSheet({ onPrint }) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // ---- Core modules ----
  const coreRows = Object.values(PRICING_CONFIG).map(m => ({
    cells: [
      <>
        {m.name}
        {m.isAddon && <span className="ml-1.5 text-[8px] bg-brand-gold text-white px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider align-middle">Add-on</span>}
        {sub(m.description)}
      </>,
      m.baseFee > 0 ? money(m.baseFee) : dash,
      money(m.pepm),
      m.minimum > 0 ? money(m.minimum) : dash,
      m.defaultSetup > 0 ? money(m.defaultSetup) : dash,
      m.hasYearEnd
        ? <>{money(m.yearEndBase)} <span className="text-slate-400">+</span> {money(m.yearEndPerItem)}<span className="text-slate-400">/form</span></>
        : dash,
    ],
  }));

  // ---- Recurring add-ons ----
  const addonRows = Object.values(ANCILLARY_PRICING).map(s => {
    let rate;
    if (s.monthlyBilling && s.monthlyFlat !== undefined) {
      rate = <>{money(s.monthlyFlat)}<span className="text-slate-400">/month · flat</span></>;
    } else if (s.monthlyBilling) {
      rate = <>{money(s.monthlyPerUser)}<span className="text-slate-400">/user/month</span></>;
    } else {
      rate = <>{money(s.pepm)}<span className="text-slate-400">/emp per payroll</span></>;
    }
    return {
      cells: [
        s.name,
        rate,
        s.minimum > 0 ? money(s.minimum) : dash,
        s.defaultSetup > 0 ? money(s.defaultSetup) : dash,
      ],
    };
  });

  // ---- isolved add-ons ----
  const isolvedRows = Object.values(ISOLVED_ADDONS).map(cfg => {
    let rate;
    if (cfg.pricingType === 'tieredMonthly') {
      rate = (
        <div className="space-y-0.5">
          {cfg.tiers.map((t, i) => {
            const lower = i === 0 ? 1 : cfg.tiers[i - 1].upTo + 1;
            const label = t.upTo === Infinity ? `${lower}+` : `${lower}–${t.upTo}`;
            return (
              <div key={i} className="flex justify-between gap-3">
                <span className="text-slate-400">{label} emp</span>
                <span className="font-semibold text-brand-navy">{money(t.monthly)}<span className="text-slate-400 font-normal">/mo</span></span>
              </div>
            );
          })}
        </div>
      );
    } else if (cfg.pricingType === 'pepm') {
      rate = <>{money(cfg.pepm)}<span className="text-slate-400">/emp per payroll</span></>;
    } else {
      rate = <span className="text-emerald-600 font-semibold">Included</span>;
    }
    return {
      cells: [
        <>{cfg.name}{sub(cfg.description)}</>,
        rate,
        cfg.defaultSetup > 0 ? money(cfg.defaultSetup) : dash,
        <span className="text-slate-500">TLM</span>,
      ],
    };
  });

  // ---- One-time & specialty ----
  const specialtyRows = [
    { cells: ['State Tax ID Application', <>{money(STATE_TAX_ID_PER_ID)}<span className="text-slate-400"> per agency</span></>, dash] },
    { cells: [<>Payroll Year-to-Date Loading (PYTD){sub('Historical payroll data load')}</>, <>{money(PYTD_HOURLY)}<span className="text-slate-400">/hr</span> + {money(PYTD_PER_STATEMENT)}<span className="text-slate-400">/statement</span></>, dash] },
    {
      cells: [
        <>Benefit Integration (EDI){sub('Recurring per-emp + one-time implementation')}</>,
        <>
          {money(BENEFIT_EDI_RATE_STD)}<span className="text-slate-400">/emp</span> · {money(BENEFIT_EDI_RATE_BUNDLE)}<span className="text-slate-400">/emp w/ COBRA</span>
          {sub(`Min ${money(BENEFIT_EDI_MIN)} per payroll`)}
        </>,
        <>{money(BENEFIT_EDI_FIRST_FEED)}<span className="text-slate-400"> first feed</span>{sub(`${money(BENEFIT_EDI_ADDL_FEED)} each additional`)}</>,
      ],
    },
  ];

  // ---- Usage-based opt-ins ----
  const usageRows = Object.values(ANCILLARY_USAGE).map(s => ({
    cells: [s.name, <div className="space-y-0.5">{s.rates.map((r, i) => <div key={i}>{r}</div>)}</div>],
  }));

  // ---- Ancillary rate sheet (as-used) ----
  const ancRows = [];
  ['Compliance', 'Payments & Levies'].forEach(cat => {
    USAGE_RATE_SHEET.filter(it => it.category === cat).forEach(it => {
      ancRows.push({
        cells: [
          <>{it.name}{it.note && sub(it.note)}</>,
          <span className="text-slate-500">{cat}</span>,
          <>{it.rate}<span className="text-slate-400 ml-1">{it.unit}</span></>,
        ],
      });
    });
    if (cat === 'Compliance') {
      ancRows.push({
        cells: [
          <>Digital Labor Law Poster{sub('Opt-in add-on')}</>,
          <span className="text-slate-500">Compliance</span>,
          <>{money(10)}<span className="text-slate-400 ml-1">per month · flat</span></>,
        ],
      });
    }
  });
  SHIPPING_RATE_SHEET.forEach(s => {
    ancRows.push({
      cells: [
        s.method,
        <span className="text-slate-500">Shipping · per package</span>,
        s.base === null
          ? <>{money(s.perItem)}<span className="text-slate-400 ml-1">per item mailed</span></>
          : <>{money(s.base)}<span className="text-slate-400 ml-1">base + {money(s.perItem)}/item</span></>,
      ],
    });
  });

  return (
    <div className="rate-sheet-page max-w-4xl mx-auto">

      {/* ---- Header ---- */}
      <div className="rounded-2xl overflow-hidden shadow-warm-md print-container border border-stone-200 bg-white">
        <div className="header-gradient text-white p-8 rate-sheet-header">
          <div className="flex justify-between items-start gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <BrandMark className="w-10 h-10" />
                <div>
                  <h1 className="text-2xl font-bold font-display tracking-tight leading-tight">Creative Planning Payroll</h1>
                  <p className="text-white/60 text-[10px] tracking-[0.18em] uppercase font-semibold">Rate Sheet</p>
                </div>
              </div>
              <div className="w-14 h-0.5 bg-brand-gold mb-4"></div>
              <p className="text-white/80 text-sm max-w-xl leading-relaxed">
                Current pricing for all Creative Planning Payroll modules, add-ons, and services.
                All recurring rates are billed per pay period and stay flat regardless of pay frequency.
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[10px] text-white/60 uppercase tracking-wider">Effective</div>
              <div className="font-semibold text-base mt-0.5">{formatDate(todayStr)}</div>
              {onPrint && (
                <button
                  onClick={onPrint}
                  className="no-print mt-4 inline-flex items-center gap-2 bg-brand-gold hover:bg-brand-goldDark text-white px-4 py-2 rounded-lg font-semibold text-xs transition-colors shadow-sm"
                >
                  Print Rate Sheet
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8 rate-sheet-body">

          <Section title="Core Service Modules" subtitle="Per pay period · recurring">
            <Table
              cols={[
                { label: 'Module' },
                { label: 'Base / Payroll', align: 'right' },
                { label: 'Per Employee', align: 'right' },
                { label: 'Minimum', align: 'right' },
                { label: 'Setup', align: 'right' },
                { label: 'Year-End', align: 'right' },
              ]}
              rows={coreRows}
              footnote={`Additional tax jurisdictions: ${money(JURISDICTION_FEE_PER_LOCATION)} each per payroll (first state included). New-hire reporting: $3 per new hire. 1099 contractors count toward per-employee headcount on Payroll, TLM, HCM, and Full Service.`}
            />
          </Section>

          <Section title="Recurring Add-ons" subtitle="Ancillary services · per pay period">
            <Table
              cols={[
                { label: 'Service' },
                { label: 'Rate', align: 'right' },
                { label: 'Minimum', align: 'right' },
                { label: 'Setup', align: 'right' },
              ]}
              rows={addonRows}
              footnote="360° 401(k) bills against annual W-2 count. Expense Tracking bills per user and is invoiced monthly. Digital Labor Law Poster is a flat monthly fee."
            />
          </Section>

          <Section title="isolved Add-ons" subtitle="isolved platform only · require TLM">
            <Table
              cols={[
                { label: 'Service' },
                { label: 'Rate', align: 'right' },
                { label: 'Setup', align: 'right' },
                { label: 'Requires', align: 'right' },
              ]}
              rows={isolvedRows}
              footnote="Virtual Clock is a flat monthly fee tiered by employee count and invoiced monthly."
            />
          </Section>

          <Section title="One-Time & Specialty Fees" subtitle="Billed at onboarding or as used">
            <Table
              cols={[
                { label: 'Service' },
                { label: 'Rate', align: 'right' },
                { label: 'Implementation', align: 'right' },
              ]}
              rows={specialtyRows}
            />
          </Section>

          <div className="grid md:grid-cols-2 gap-6">
            <Section title="Usage-Based Opt-Ins" subtitle="Client enrolls · billed as used">
              <Table
                cols={[{ label: 'Service' }, { label: 'Rate', align: 'right' }]}
                rows={usageRows}
              />
            </Section>

            <Section title="S-Corp Owner-Only" subtitle="Simplified single-owner payroll">
              <Table
                cols={[{ label: 'Frequency' }, { label: 'Rate', align: 'right' }]}
                rows={[
                  { cells: ['Weekly / Bi-Weekly / Semi-Monthly', <>{money(SCORP_BIWEEKLY_BASE)}<span className="text-slate-400">/payroll</span></>] },
                  { cells: ['Monthly / Quarterly', <>{money(SCORP_QUARTERLY_FLAT)}<span className="text-slate-400">/quarter</span></>] },
                  { cells: ['Annual', <>{money(SCORP_ANNUAL_FLAT)}<span className="text-slate-400">/year</span></>] },
                  { cells: [<>Year-End W-2/1099{sub('Billed in January')}</>, <>{money(SCORP_YEAR_END_BASE)} + {money(SCORP_YEAR_END_PER_FORM)}<span className="text-slate-400">/form</span></>] },
                  { cells: ['Implementation', <>{money(750)}<span className="text-slate-400"> (adjustable)</span></>] },
                ]}
              />
            </Section>
          </div>

          <Section title="Ancillary Rate Sheet" subtitle="As-used services · any payroll client">
            <Table
              cols={[
                { label: 'Service' },
                { label: 'Category', align: 'left', w: 'w-[22%]' },
                { label: 'Rate', align: 'right' },
              ]}
              rows={ancRows}
              footnote="Ancillary rates apply as services are used and are billed on the payroll invoice for the corresponding period. Base shipping fee applies once per package plus the item fee. Rates subject to change."
            />
          </Section>

          <div className="pt-4 border-t border-stone-100 flex justify-between items-center text-[10px] text-slate-300">
            <span>Creative Planning Payroll · Rate Sheet · Confidential</span>
            <span>Effective {formatDate(todayStr)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
