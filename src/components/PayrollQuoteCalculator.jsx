import { useState, useMemo } from 'react';
import { PRICING_CONFIG, FREQUENCIES, MODULE_SERVICES, formatMoney, formatDate } from '../constants/pricing';
import { Icon } from './Icons';
import Toggle from './Toggle';

export default function PayrollQuoteCalculator() {
  // --- State ---
  const [clientName, setClientName] = useState('');
  const [quoteDate, setQuoteDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [employeeCount, setEmployeeCount] = useState(15);
  const [frequency, setFrequency] = useState('biweekly');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [clientFacing, setClientFacing] = useState(true);

  const [selectedModules, setSelectedModules] = useState({
    payroll: true,
    tlm: false,
    hcm: false,
    aca: false,
    fullService: false,
  });

  const [setupFees, setSetupFees] = useState(() => {
    const initial = {};
    Object.entries(PRICING_CONFIG).forEach(([key, config]) => {
      initial[key] = { included: config.defaultSetup > 0, amount: config.defaultSetup };
    });
    return initial;
  });

  // --- Calculations ---
  const getMultiplier = () => {
    const basePeriods = FREQUENCIES.biweekly.periods; // 26
    const targetPeriods = FREQUENCIES[frequency].periods;
    return basePeriods / targetPeriods;
  };

  const calculateModuleCost = (moduleKey) => {
    const config = PRICING_CONFIG[moduleKey];
    const multiplier = getMultiplier();

    const adjBase = config.baseFee * multiplier;
    const adjPepm = config.pepm * multiplier;
    const adjMin = config.minimum * multiplier;

    const rawCost = adjBase + (adjPepm * employeeCount);
    const perPayroll = Math.max(rawCost, adjMin);
    const isMinApplied = rawCost < adjMin;

    let yearEnd = 0;
    if (config.hasYearEnd) {
      yearEnd = config.yearEndBase + (config.yearEndPerItem * employeeCount);
    }

    const annual = (perPayroll * FREQUENCIES[frequency].periods) + yearEnd;
    const setup = setupFees[moduleKey].included
      ? parseFloat(setupFees[moduleKey].amount || 0)
      : 0;

    return {
      perPayroll, annual, setup, yearEnd, isMinApplied,
      rates: { base: adjBase, pepm: adjPepm, min: adjMin },
    };
  };

  const totals = useMemo(() => {
    let subtotalPerPayroll = 0;
    let subtotalAnnual = 0;
    let totalSetup = 0;
    let totalYearEnd = 0;

    Object.keys(PRICING_CONFIG).forEach(key => {
      if (selectedModules[key]) {
        const c = calculateModuleCost(key);
        subtotalPerPayroll += c.perPayroll;
        subtotalAnnual += c.annual;
        totalSetup += c.setup;
        totalYearEnd += c.yearEnd;
      }
    });

    const discountPerPayroll = subtotalPerPayroll * (discountPercent / 100);
    const finalPerPayroll = subtotalPerPayroll - discountPerPayroll;
    const discountAnnual = discountPerPayroll * FREQUENCIES[frequency].periods;
    const finalAnnual = subtotalAnnual - discountAnnual;

    return {
      subtotalPerPayroll, subtotalAnnual,
      discountPerPayroll, discountAnnual,
      finalPerPayroll, finalAnnual,
      totalSetup, totalYearEnd,
    };
  }, [selectedModules, employeeCount, frequency, discountPercent, setupFees]);

  const activeModuleCount = Object.values(selectedModules).filter(Boolean).length;

  // --- Handlers ---
  const toggleModule = (key) =>
    setSelectedModules(prev => ({ ...prev, [key]: !prev[key] }));

  const toggleSetup = (key) =>
    setSetupFees(prev => ({
      ...prev,
      [key]: { ...prev[key], included: !prev[key].included },
    }));

  const updateSetupAmount = (key, val) =>
    setSetupFees(prev => ({
      ...prev,
      [key]: { ...prev[key], amount: val },
    }));

  // --- Render ---
  return (
    <div className="min-h-screen">

      {/* App Header */}
      <header className="bg-brand-navy text-white no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight font-display">Creative Planning Payroll</h1>
              <p className="text-white/60 text-xs tracking-wide uppercase">Quote Calculator</p>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-brand-gold hover:bg-brand-goldDark text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors shadow-sm"
          >
            <Icon.Printer />
            Print Quote
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Configuration Panel */}
        <section className="no-print mb-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left: Quote Settings */}
            <div className="lg:col-span-4">
              <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sticky top-6">
                <h2 className="text-base font-bold text-brand-navy flex items-center gap-2 mb-5">
                  <Icon.Settings className="w-5 h-5" />
                  Quote Settings
                </h2>

                <div className="space-y-4">
                  {/* Client Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Client Name</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Enter company name…"
                      className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy outline-none transition"
                    />
                  </div>

                  {/* Quote Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Quote Date</label>
                    <input
                      type="date"
                      value={quoteDate}
                      onChange={(e) => setQuoteDate(e.target.value)}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy outline-none transition"
                    />
                  </div>

                  <hr className="border-stone-100" />

                  {/* Pay Frequency */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Pay Frequency</label>
                    <div className="relative">
                      <select
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                        className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm appearance-none bg-white focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy outline-none transition pr-10"
                      >
                        {Object.entries(FREQUENCIES).map(([key, data]) => (
                          <option key={key} value={key}>
                            {data.label} ({data.periods} periods/yr)
                          </option>
                        ))}
                      </select>
                      <Icon.ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Employees */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Total Employees</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        value={employeeCount}
                        onChange={(e) => setEmployeeCount(parseInt(e.target.value) || 0)}
                        className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy outline-none transition"
                      />
                      <Icon.Users className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Discount */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Recurring Discount (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy outline-none transition"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Applies to recurring per-payroll fees only, not setup.</p>
                  </div>

                  <hr className="border-stone-100" />

                  {/* Client Facing Toggle */}
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Client Facing</label>
                    <Toggle
                      checked={clientFacing}
                      onChange={() => setClientFacing(prev => !prev)}
                      label="Toggle client facing mode"
                    />
                  </div>
                </div>

                {/* Quick Summary Card */}
                <div className="mt-6 bg-brand-navy/5 rounded-xl p-4 border border-brand-navy/10">
                  <div className="text-[11px] font-bold text-brand-navy uppercase tracking-wider mb-2">Quick Summary</div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Modules selected</span>
                      <span className="font-semibold text-brand-navy">{activeModuleCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Per payroll</span>
                      <span className="font-semibold text-brand-navy">{formatMoney(totals.finalPerPayroll)}</span>
                    </div>
                    {!clientFacing && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Annual estimate</span>
                        <span className="font-semibold text-brand-navy">{formatMoney(totals.finalAnnual)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">One-time setup</span>
                      <span className="font-semibold text-brand-navy">{formatMoney(totals.totalSetup)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Module Selector Cards */}
            <div className="lg:col-span-8">
              <div className="space-y-4">
                {Object.values(PRICING_CONFIG).map((module) => {
                  const isActive = selectedModules[module.id];
                  const costs = calculateModuleCost(module.id);

                  return (
                    <div
                      key={module.id}
                      className={`rounded-2xl border transition-all duration-200 ${
                        isActive
                          ? 'border-brand-navy/40 bg-white shadow-md ring-1 ring-brand-navy/10'
                          : 'border-stone-200 bg-white hover:border-stone-300 shadow-sm'
                      }`}
                    >
                      {/* Module Header */}
                      <div className="p-5 flex justify-between items-start">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="pt-0.5">
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={() => toggleModule(module.id)}
                              className="w-5 h-5 rounded cursor-pointer"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-brand-navy flex items-center gap-2 flex-wrap">
                              {module.name}
                              {module.isAddon && (
                                <span className="text-[10px] bg-brand-gold text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                  Add-on
                                </span>
                              )}
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">{module.description}</p>
                          </div>
                        </div>

                        {/* Setup Fee Controls */}
                        {isActive && (
                          <div className="text-right pl-4 flex-shrink-0">
                            <div className="flex items-center gap-2 justify-end mb-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Setup</label>
                              <Toggle
                                checked={setupFees[module.id].included}
                                onChange={() => toggleSetup(module.id)}
                                label={`Toggle setup fee for ${module.name}`}
                              />
                            </div>
                            {setupFees[module.id].included ? (
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-slate-400 text-sm">$</span>
                                <input
                                  type="number"
                                  value={setupFees[module.id].amount}
                                  onChange={(e) => updateSetupAmount(module.id, e.target.value)}
                                  className="w-24 text-right text-sm border-b border-stone-300 focus:border-brand-navy outline-none bg-transparent py-0.5"
                                />
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Waived</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Expanded Cost Details */}
                      {isActive && (
                        <div className="px-5 pb-5 animate-fade-up">
                          <div className="ml-8">
                            {/* Cost per payroll banner */}
                            <div className="flex items-center justify-between bg-brand-navy/5 border border-brand-navy/10 rounded-t-lg px-3 py-2">
                              <span className="text-sm font-bold text-brand-navy">
                                {formatMoney(costs.perPayroll)}
                                <span className="text-xs font-normal text-brand-navy/60 ml-1">/ payroll</span>
                              </span>
                              {costs.isMinApplied && (
                                <span className="text-[9px] bg-brand-gold/20 text-brand-goldDark px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                                  <Icon.AlertCircle className="w-3 h-3" />
                                  Minimum Applied
                                </span>
                              )}
                            </div>

                            {/* Rate breakdown */}
                            <div className="grid grid-cols-3 text-center text-xs border border-t-0 border-stone-200 rounded-b-lg divide-x divide-stone-200 bg-white">
                              <div className="py-2 px-2">
                                <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Base Fee</div>
                                <div className="font-semibold text-slate-700">{formatMoney(costs.rates.base)}</div>
                              </div>
                              <div className="py-2 px-2">
                                <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Per Employee</div>
                                <div className="font-semibold text-slate-700">{formatMoney(costs.rates.pepm)}</div>
                              </div>
                              <div className="py-2 px-2">
                                <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Minimum</div>
                                <div className="font-semibold text-slate-700">{formatMoney(costs.rates.min)}</div>
                              </div>
                            </div>

                            {/* Year-end line item */}
                            {module.hasYearEnd && (
                              <div className="mt-2 flex justify-between items-center text-[11px] text-brand-navy/70 bg-blue-50 rounded-lg px-3 py-1.5 border border-blue-100">
                                <span>+ {module.yearEndName}</span>
                                <span className="font-bold text-brand-navy">{formatMoney(costs.yearEnd)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Quote Preview / Print Sheet */}
        <section className="bg-white shadow-xl border border-stone-200 rounded-2xl overflow-hidden max-w-4xl mx-auto print-container print-page-fill">

          {/* Quote Header */}
          <div className="bg-brand-navy text-white p-6 quote-header">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <h1 className="text-xl font-bold font-display tracking-tight">Creative Planning Payroll</h1>
                <div className="w-10 h-0.5 bg-brand-gold mt-1.5 mb-3"></div>
                <p className="opacity-70 text-[10px] uppercase tracking-widest">Quote Prepared For</p>
                <h2 className="text-lg font-bold mt-0.5 font-display">
                  {clientName || <span className="opacity-40 italic">[Client Name]</span>}
                </h2>
              </div>
              <div className="text-right flex items-start gap-6">
                <div>
                  <div className="text-[10px] opacity-70 uppercase tracking-wider">Date Issued</div>
                  <div className="font-semibold mt-0.5">{formatDate(quoteDate)}</div>
                </div>
                <div className="bg-[#00617f] px-4 py-3 rounded-lg text-left">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="flex items-center gap-1.5 mb-0.5 justify-center">
                        <Icon.Users className="w-3 h-3 text-white/70" />
                        <span className="text-[9px] uppercase tracking-wider text-white/70">Employees</span>
                      </div>
                      <div className="text-lg font-bold">{employeeCount}</div>
                    </div>
                    <div className="w-px h-8 bg-white/30"></div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Icon.Calendar className="w-3 h-3 text-white/70" />
                        <span className="text-[9px] uppercase tracking-wider text-white/70">Frequency</span>
                      </div>
                      <div className="text-sm font-semibold">{FREQUENCIES[frequency].label}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quote Body */}
          <div className="p-8 flex flex-col quote-body">
            <div className="flex-1">
            <table className="w-full mb-8">
              <thead>
                <tr className="border-b-2 border-brand-navy text-left text-[10px] font-bold text-brand-navy uppercase tracking-widest">
                  <th className="pb-3 pl-2">Service Module</th>
                  <th className="pb-3 text-right">Per Payroll</th>
                  {!clientFacing &&<th className="pb-3 text-right">Annual Est.</th>}
                  <th className="pb-3 text-right pr-2">Setup Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {Object.values(PRICING_CONFIG).map((module) => {
                  if (!selectedModules[module.id]) return null;
                  const costs = calculateModuleCost(module.id);

                  return (
                    <tr key={module.id} className="text-sm">
                      <td className="py-4 pl-2">
                        <div className="font-bold text-slate-800">{module.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Rates: Base {formatMoney(costs.rates.base)} + {formatMoney(costs.rates.pepm)}/emp (Min {formatMoney(costs.rates.min)})
                        </div>
                        {module.id === 'payroll' && (
                          <div className="text-[10px] text-brand-navy/60 font-medium mt-0.5">
                            + New Hire Reporting: $3/New Hire
                          </div>
                        )}
                        {module.hasYearEnd && (
                          <div className="text-[10px] text-brand-navy/60 font-medium mt-0.5">
                            + {module.yearEndName}: {formatMoney(costs.yearEnd)}
                          </div>
                        )}
                        {costs.isMinApplied && (
                          <span className="inline-block mt-1 text-[9px] text-brand-gold font-bold uppercase tracking-wider">
                            ★ Minimum Applied
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-right font-semibold text-slate-700">
                        {formatMoney(costs.perPayroll)}
                      </td>
                      {!clientFacing &&(
                        <td className="py-4 text-right text-slate-600">
                          {formatMoney(costs.annual)}
                        </td>
                      )}
                      <td className="py-4 text-right text-slate-600 pr-2">
                        {costs.setup > 0 ? formatMoney(costs.setup) : '\u2014'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-brand-navy">
                {/* Discount rows */}
                {discountPercent > 0 && (
                  <>
                    <tr>
                      <td className="pt-4 pl-2 font-semibold text-slate-400 text-sm">Subtotal</td>
                      <td className="pt-4 text-right font-semibold text-slate-400 text-sm">
                        {formatMoney(totals.subtotalPerPayroll)}
                      </td>
                      {!clientFacing &&(
                        <td className="pt-4 text-right font-semibold text-slate-400 text-sm">
                          {formatMoney(totals.subtotalAnnual)}
                        </td>
                      )}
                      <td className="pt-4 pr-2 text-right text-slate-300 text-sm">{'\u2014'}</td>
                    </tr>
                    <tr className="border-b border-stone-200">
                      <td className="py-2 pl-2 font-semibold text-emerald-600 text-sm">
                        Discount ({discountPercent}%)
                        <span className="text-[10px] font-normal text-emerald-500/70 italic ml-1">(Recurring Only)</span>
                      </td>
                      <td className="py-2 text-right font-semibold text-emerald-600 text-sm">
                        &minus; {formatMoney(totals.discountPerPayroll)}
                      </td>
                      {!clientFacing &&(
                        <td className="py-2 text-right font-semibold text-emerald-600 text-sm">
                          &minus; {formatMoney(totals.discountAnnual)}
                        </td>
                      )}
                      <td className="py-2 pr-2 text-right text-slate-300 text-sm">{'\u2014'}</td>
                    </tr>
                  </>
                )}

                {/* Total row */}
                <tr>
                  <td className="pt-4 pb-4 pl-2 font-bold text-brand-navy">TOTAL ESTIMATE</td>
                  <td className="pt-4 pb-4 text-right font-bold text-brand-navy text-lg">
                    {formatMoney(totals.finalPerPayroll)}
                  </td>
                  {!clientFacing &&(
                    <td className="pt-4 pb-4 text-right font-bold text-brand-navy">
                      {formatMoney(totals.finalAnnual)}
                    </td>
                  )}
                  <td className="pt-4 pb-4 pr-2 text-right font-bold text-brand-navy">
                    {formatMoney(totals.totalSetup)}
                  </td>
                </tr>
              </tfoot>
            </table>
            </div>

            {/* Terms & Conditions */}
            <div className="mt-10 pt-6 border-t border-stone-100 text-xs text-slate-400">
              <p className="mb-2 font-bold text-brand-navy text-[11px] uppercase tracking-wider">Pricing Terms &amp; Conditions</p>
              <p className="leading-relaxed">
                This estimate is based on <span className="font-bold text-slate-600">{employeeCount} employees</span> processed <span className="font-bold text-slate-600">{FREQUENCIES[frequency].label.toLowerCase()}</span>.
                Actual billing may vary based on fluctuations in employee count. Setup fees are one-time charges billed at onboarding.
                Year-end processing fees (W-2, 1094-C/1095-C) are billed separately during their respective filing periods.
                Prices are subject to change with 30 days written notice. This quote is valid for 30 days from the date of issue.
              </p>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-stone-100 flex justify-between items-center text-[10px] text-slate-300">
              <span>Creative Planning Payroll &bull; Confidential</span>
              <span>Generated {formatDate(quoteDate)}</span>
            </div>
          </div>
        </section>

        {/* Page 2: Services Included (Client Facing Only) */}
        {clientFacing && (
          <section className="bg-white shadow-xl border border-stone-200 rounded-2xl overflow-hidden max-w-4xl mx-auto mt-10 print-container print-page-break print-services-compact">

            {/* Services Header */}
            <div className="bg-brand-navy text-white p-8 services-header">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold font-display tracking-tight">Creative Planning Payroll</h1>
                  <div className="w-12 h-0.5 bg-brand-gold mt-2 mb-4"></div>
                  <p className="opacity-70 text-xs uppercase tracking-widest">Services Included For</p>
                  <h2 className="text-xl font-bold mt-1 font-display">
                    {clientName || <span className="opacity-40 italic">[Client Name]</span>}
                  </h2>
                </div>
                <div className="text-right">
                  <div className="text-xs opacity-70 uppercase tracking-wider">Date Issued</div>
                  <div className="font-semibold text-lg mt-0.5">{formatDate(quoteDate)}</div>
                </div>
              </div>
            </div>

            {/* Services Body */}
            <div className="p-8 print-services-compact">
              <div className="space-y-6">
                {Object.entries(MODULE_SERVICES).map(([key, moduleData]) => {
                  if (!selectedModules[key]) return null;
                  const activeServiceModules = Object.keys(MODULE_SERVICES).filter(k => selectedModules[k]);
                  const useColumns = activeServiceModules.length === 1;

                  return (
                    <div key={key} className="services-module-group">
                      <div className="flex items-center gap-3 mb-3 services-module-title">
                        <div className="w-1 h-5 bg-brand-gold rounded-full services-accent-bar"></div>
                        <div>
                          <h3 className="text-base font-bold text-brand-navy font-display">{moduleData.name}</h3>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mt-0.5">Services Included</p>
                        </div>
                      </div>
                      <div className="ml-4">
                        <ul className={`grid gap-1.5 services-list ${useColumns ? 'grid-cols-2' : 'grid-cols-1'}`}>
                          {moduleData.services.map((service, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-[13px] text-slate-700">
                              <span className="text-brand-gold mt-0.5 flex-shrink-0">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </span>
                              <span className="leading-snug">{service}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="mt-4 border-b border-stone-100 services-divider"></div>
                    </div>
                  );
                })}
              </div>

              {/* Contact / Next Steps */}
              <div className="mt-8 bg-brand-navy/5 border border-brand-navy/10 rounded-xl p-6 services-contact">
                <div className="text-center">
                  <p className="text-sm font-bold text-brand-navy font-display">Ready to get started?</p>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-md mx-auto">
                    Contact your Creative Planning Payroll representative to discuss your customized solution and begin onboarding.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 pt-3 border-t border-stone-100 flex justify-between items-center text-[10px] text-slate-300 services-footer">
                <span>Creative Planning Payroll &bull; Confidential</span>
                <span>Generated {formatDate(quoteDate)}</span>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
