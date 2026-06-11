import { useState, useMemo, useEffect } from 'react';

const STORAGE_KEY = 'cpp-quote-builder:quotes';
import { PRICING_CONFIG, FREQUENCIES, STANDARD_FREQUENCIES, SCORP_FREQUENCIES, MODULE_SERVICES, ANCILLARY_PRICING, ANCILLARY_USAGE, formatMoney, formatDate } from '../constants/pricing';
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
  const [w2Count, setW2Count] = useState('');
  const [expenseUserCount, setExpenseUserCount] = useState('');
  const [frequency, setFrequency] = useState('biweekly');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [clientFacing, setClientFacing] = useState(true);

  const [showRepInfo, setShowRepInfo] = useState(false);
  const [repName, setRepName] = useState('');
  const [repPhone, setRepPhone] = useState('');
  const [repEmail, setRepEmail] = useState('');

  const [selectedModules, setSelectedModules] = useState({
    payroll: true,
    tlm: false,
    hcm: false,
    aca: false,
    fullService: false,
  });

  const [payrollBaseOverride, setPayrollBaseOverride] = useState(null);
  const [additionalJurisdictions, setAdditionalJurisdictions] = useState(0);

  // Ancillary rate overrides: { [id]: { pepm: number|null, minimum: number|null } }
  const [ancillaryRateOverrides, setAncillaryRateOverrides] = useState({});

  const [showAncillary, setShowAncillary] = useState(false);
  const [selectedAncillary, setSelectedAncillary] = useState(() => {
    const initial = {};
    Object.keys(ANCILLARY_PRICING).forEach(key => { initial[key] = false; });
    Object.keys(ANCILLARY_USAGE).forEach(key => { initial[key] = false; });
    return initial;
  });

  const [sCorpMode, setSCorpMode] = useState(false);
  const [sCorpSetup, setSCorpSetup] = useState({ included: true, amount: 750 });

  const [stateTaxId, setStateTaxId] = useState({ enabled: false, quantity: 1 });
  const stateTaxIdTotal = stateTaxId.enabled ? 250 * (parseInt(stateTaxId.quantity) || 0) : 0;

  const [pytd, setPytd] = useState({ enabled: false, hours: 0, statements: 0 });
  const pytdTotal = pytd.enabled
    ? (150 * (parseFloat(pytd.hours) || 0)) + (0.10 * (parseInt(pytd.statements) || 0))
    : 0;

  const [benefitEdi, setBenefitEdi] = useState({ enabled: false, feeds: 1, cobraBundle: false });
  const benefitEdiTotal = (() => {
    if (!benefitEdi.enabled) return 0;
    const feeds = parseInt(benefitEdi.feeds) || 0;
    if (feeds <= 0) return 0;
    return 1195 + (995 * (feeds - 1));
  })();
  const benefitEdiRecurring = (() => {
    if (!benefitEdi.enabled) return { perPayroll: 0, annual: 0, rate: 0, min: 0, isMinApplied: false, baseRate: 0 };
    const periods = FREQUENCIES[frequency].periods;
    const multiplier = 26 / periods;
    const baseRate = benefitEdi.cobraBundle ? 0.90 : 0.75;
    const rate = baseRate * multiplier;
    const min = 40 * multiplier;
    const rawCost = rate * employeeCount;
    const perPayroll = Math.max(rawCost, min);
    const isMinApplied = rawCost < min;
    const annual = perPayroll * periods;
    return { perPayroll, annual, rate, min, isMinApplied, baseRate };
  })();

  const [setupFees, setSetupFees] = useState(() => {
    const initial = {};
    Object.entries(PRICING_CONFIG).forEach(([key, config]) => {
      initial[key] = { included: config.defaultSetup > 0, amount: config.defaultSetup };
    });
    Object.entries(ANCILLARY_PRICING).forEach(([key, config]) => {
      initial[key] = { included: config.defaultSetup > 0, amount: config.defaultSetup };
    });
    return initial;
  });

  // Saved quotes (LocalStorage)
  const [savedQuotes, setSavedQuotes] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [quoteNameInput, setQuoteNameInput] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedQuotes));
    } catch {}
  }, [savedQuotes]);

  const saveCurrentQuote = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const snapshot = {
      clientName, quoteDate, employeeCount, w2Count, expenseUserCount,
      frequency, discountPercent,
      clientFacing, showRepInfo, repName, repPhone, repEmail,
      selectedModules, payrollBaseOverride, additionalJurisdictions,
      showAncillary, selectedAncillary, sCorpMode, sCorpSetup,
      stateTaxId, pytd, benefitEdi, ancillaryRateOverrides, setupFees,
      savedAt: new Date().toISOString(),
    };
    setSavedQuotes(prev => ({ ...prev, [trimmed]: snapshot }));
    setQuoteNameInput('');
    setShowSaveInput(false);
  };

  const loadQuote = (name) => {
    const s = savedQuotes[name];
    if (!s) return;
    if (s.clientName !== undefined) setClientName(s.clientName);
    if (s.quoteDate !== undefined) setQuoteDate(s.quoteDate);
    if (s.employeeCount !== undefined) setEmployeeCount(s.employeeCount);
    if (s.w2Count !== undefined) setW2Count(s.w2Count);
    if (s.expenseUserCount !== undefined) setExpenseUserCount(s.expenseUserCount);
    if (s.frequency !== undefined) setFrequency(s.frequency);
    if (s.discountPercent !== undefined) setDiscountPercent(s.discountPercent);
    if (s.clientFacing !== undefined) setClientFacing(s.clientFacing);
    if (s.showRepInfo !== undefined) setShowRepInfo(s.showRepInfo);
    if (s.repName !== undefined) setRepName(s.repName);
    if (s.repPhone !== undefined) setRepPhone(s.repPhone);
    if (s.repEmail !== undefined) setRepEmail(s.repEmail);
    if (s.selectedModules) setSelectedModules(s.selectedModules);
    if (s.payrollBaseOverride !== undefined) setPayrollBaseOverride(s.payrollBaseOverride);
    if (s.additionalJurisdictions !== undefined) setAdditionalJurisdictions(s.additionalJurisdictions);
    if (s.showAncillary !== undefined) setShowAncillary(s.showAncillary);
    if (s.selectedAncillary) setSelectedAncillary(s.selectedAncillary);
    if (s.sCorpMode !== undefined) setSCorpMode(s.sCorpMode);
    if (s.sCorpSetup) setSCorpSetup(s.sCorpSetup);
    if (s.stateTaxId) setStateTaxId(s.stateTaxId);
    if (s.pytd) setPytd(s.pytd);
    if (s.benefitEdi) setBenefitEdi(s.benefitEdi);
    if (s.ancillaryRateOverrides) setAncillaryRateOverrides(s.ancillaryRateOverrides);
    if (s.setupFees) setSetupFees(s.setupFees);
  };

  const deleteQuote = (name) => {
    setSavedQuotes(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  // S-Corp mode handler
  const toggleSCorpMode = () => {
    setSCorpMode(prev => {
      if (!prev) {
        // Entering S-Corp: default to 1 employee, monthly frequency
        setEmployeeCount(1);
        setFrequency('monthly');
        setDiscountPercent(0);
        setShowAncillary(false);
        setPayrollBaseOverride(null);
      } else {
        // Leaving S-Corp: restore defaults
        setEmployeeCount(15);
        setFrequency('biweekly');
      }
      return !prev;
    });
  };

  // S-Corp cost calculation
  const calculateSCorpCost = () => {
    const isQuarterlyBilling = frequency !== 'biweekly' && frequency !== 'weekly' && frequency !== 'semimonthly';
    let perPeriod, periodsPerYear, periodLabel;

    if (frequency === 'annual') {
      perPeriod = 1000;
      periodsPerYear = 1;
      periodLabel = 'year';
    } else if (isQuarterlyBilling) {
      perPeriod = 250;
      periodsPerYear = 4;
      periodLabel = 'quarter';
    } else {
      perPeriod = 48 * getMultiplier();
      periodsPerYear = FREQUENCIES[frequency].periods;
      periodLabel = 'payroll';
    }

    const jurisdictionFee = additionalJurisdictions > 0 ? additionalJurisdictions * 10 : 0;
    perPeriod += jurisdictionFee;
    const annual = perPeriod * periodsPerYear;
    const w2Headcount = (w2Count !== '' && parseInt(w2Count) > 0)
      ? parseInt(w2Count)
      : employeeCount;
    const yearEnd = 150 + (6.95 * w2Headcount);
    const setup = sCorpSetup.included ? parseFloat(sCorpSetup.amount || 0) : 0;

    return { perPeriod, annual, yearEnd, setup, periodLabel };
  };

  // --- Calculations ---
  const getMultiplier = () => {
    const basePeriods = FREQUENCIES.biweekly.periods; // 26
    const targetPeriods = FREQUENCIES[frequency].periods;
    return basePeriods / targetPeriods;
  };

  const calculateModuleCost = (moduleKey, configSource = PRICING_CONFIG) => {
    const config = configSource[moduleKey];
    const multiplier = getMultiplier();

    const adjBase = (moduleKey === 'payroll' && payrollBaseOverride !== null)
      ? payrollBaseOverride
      : config.baseFee * multiplier;

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

    // Expense Tracking uses a separate user count when provided
    const expenseUsers = (expenseUserCount !== '' && parseInt(expenseUserCount) > 0)
      ? parseInt(expenseUserCount)
      : employeeCount;
    const headcount = moduleKey === 'expense' ? expenseUsers : employeeCount;

    const rawCost = adjBase + (adjPepm * headcount);
    const basePer = Math.max(rawCost, adjMin);
    const isMinApplied = rawCost < adjMin;

    const jurisdictionFee = (moduleKey === 'payroll' && additionalJurisdictions > 0)
      ? additionalJurisdictions * 10
      : 0;
    const perPayroll = basePer + jurisdictionFee;

    // Year-end (W-2 / ACA forms) uses W-2 count override when provided
    const w2Headcount = (w2Count !== '' && parseInt(w2Count) > 0)
      ? parseInt(w2Count)
      : employeeCount;

    let yearEnd = 0;
    if (config.hasYearEnd) {
      yearEnd = config.yearEndBase + (config.yearEndPerItem * w2Headcount);
    }

    const annual = (perPayroll * FREQUENCIES[frequency].periods) + yearEnd;
    const setup = setupFees[moduleKey]?.included
      ? parseFloat(setupFees[moduleKey].amount || 0)
      : 0;

    return {
      perPayroll, annual, setup, yearEnd, isMinApplied,
      rates: { base: adjBase, pepm: adjPepm, min: adjMin },
    };
  };

  const totals = useMemo(() => {
    if (sCorpMode) {
      const sc = calculateSCorpCost();
      const subPP = sc.perPeriod + benefitEdiRecurring.perPayroll;
      const subAn = sc.annual + benefitEdiRecurring.annual;
      return {
        subtotalPerPayroll: subPP, subtotalAnnual: subAn,
        discountPerPayroll: 0, discountAnnual: 0,
        finalPerPayroll: subPP, finalAnnual: subAn,
        totalSetup: sc.setup + stateTaxIdTotal + pytdTotal + benefitEdiTotal, totalYearEnd: sc.yearEnd,
        sCorpPeriodLabel: sc.periodLabel,
      };
    }

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

    Object.keys(ANCILLARY_PRICING).forEach(key => {
      if (selectedAncillary[key]) {
        const c = calculateModuleCost(key, ANCILLARY_PRICING);
        subtotalPerPayroll += c.perPayroll;
        subtotalAnnual += c.annual;
        totalSetup += c.setup;
      }
    });

    // Benefit EDI recurring fees
    subtotalPerPayroll += benefitEdiRecurring.perPayroll;
    subtotalAnnual += benefitEdiRecurring.annual;

    const discountPerPayroll = subtotalPerPayroll * (discountPercent / 100);
    const finalPerPayroll = subtotalPerPayroll - discountPerPayroll;
    const discountAnnual = discountPerPayroll * FREQUENCIES[frequency].periods;
    const finalAnnual = subtotalAnnual - discountAnnual;

    return {
      subtotalPerPayroll, subtotalAnnual,
      discountPerPayroll, discountAnnual,
      finalPerPayroll, finalAnnual,
      totalSetup: totalSetup + stateTaxIdTotal + pytdTotal + benefitEdiTotal, totalYearEnd,
    };
  }, [selectedModules, selectedAncillary, employeeCount, w2Count, expenseUserCount, frequency, discountPercent, setupFees, payrollBaseOverride, sCorpMode, sCorpSetup, stateTaxId, additionalJurisdictions, ancillaryRateOverrides, pytd, benefitEdi]);

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

  const toggleAncillary = (key) =>
    setSelectedAncillary(prev => ({ ...prev, [key]: !prev[key] }));

  const activeAncillaryPricingCount = Object.keys(ANCILLARY_PRICING).filter(k => selectedAncillary[k]).length;
  const activeAncillaryUsageCount = Object.keys(ANCILLARY_USAGE).filter(k => selectedAncillary[k]).length;
  const activeAncillaryCount = activeAncillaryPricingCount + activeAncillaryUsageCount;

  // --- Render ---
  return (
    <div className="min-h-screen">

      {/* App Header */}
      <header className="bg-brand-navy text-white no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight font-display">Creative Planning Payroll</h1>
              <p className="text-white/60 text-xs tracking-wide uppercase">Quote Builder</p>
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
                  {/* Saved Quotes */}
                  <div className="bg-brand-navy/5 border border-brand-navy/10 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-brand-navy uppercase tracking-wider">Saved Quotes</label>
                      <button
                        onClick={() => setShowSaveInput(prev => !prev)}
                        className="text-[11px] font-semibold text-brand-navy hover:text-brand-gold transition-colors"
                      >
                        {showSaveInput ? 'Cancel' : '+ Save Current'}
                      </button>
                    </div>

                    {showSaveInput && (
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={quoteNameInput}
                          onChange={(e) => setQuoteNameInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveCurrentQuote(quoteNameInput); }}
                          placeholder="Quote name…"
                          autoFocus
                          className="flex-1 border border-stone-300 rounded-md px-2 py-1.5 text-xs focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy outline-none"
                        />
                        <button
                          onClick={() => saveCurrentQuote(quoteNameInput)}
                          disabled={!quoteNameInput.trim()}
                          className="bg-brand-navy text-white text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-brand-navy/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    )}

                    {Object.keys(savedQuotes).length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">No saved quotes yet.</p>
                    ) : (
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {Object.entries(savedQuotes)
                          .sort(([, a], [, b]) => (b.savedAt || '').localeCompare(a.savedAt || ''))
                          .map(([name, data]) => (
                            <div key={name} className="flex items-center justify-between bg-white border border-stone-200 rounded-md px-2 py-1.5">
                              <div className="flex-1 min-w-0 mr-2">
                                <div className="text-xs font-semibold text-slate-700 truncate">{name}</div>
                                {data.savedAt && (
                                  <div className="text-[9px] text-slate-400">
                                    {new Date(data.savedAt).toLocaleDateString()} {new Date(data.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => loadQuote(name)}
                                  className="text-[10px] font-semibold text-brand-navy hover:text-brand-gold transition-colors px-1.5 py-0.5"
                                >
                                  Load
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Delete saved quote "${name}"?`)) deleteQuote(name);
                                  }}
                                  className="text-[10px] font-semibold text-red-400 hover:text-red-600 transition-colors px-1.5 py-0.5"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  <hr className="border-stone-100" />

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
                        {(sCorpMode ? SCORP_FREQUENCIES : STANDARD_FREQUENCIES).map(key => (
                          <option key={key} value={key}>
                            {FREQUENCIES[key].label} ({FREQUENCIES[key].periods} periods/yr)
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

                  {/* Approximate W-2s (optional override) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Approximate W-2s <span className="text-[10px] normal-case font-normal text-slate-400">(optional)</span></label>
                    <input
                      type="number"
                      min="0"
                      value={w2Count}
                      onChange={(e) => setW2Count(e.target.value)}
                      placeholder={`Defaults to employee count (${employeeCount})`}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy outline-none transition"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Override for clients with high turnover. Used for W-2 and ACA year-end fees.</p>
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

                  <hr className="border-stone-100" />

                  {/* Sales Rep Contact Info */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rep Contact Info</label>
                      <Toggle
                        checked={showRepInfo}
                        onChange={() => setShowRepInfo(prev => !prev)}
                        label="Toggle rep contact info"
                      />
                    </div>
                    {showRepInfo && (
                      <div className="mt-3 space-y-2.5">
                        <input
                          type="text"
                          value={repName}
                          onChange={(e) => setRepName(e.target.value)}
                          placeholder="Name"
                          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy outline-none transition"
                        />
                        <input
                          type="tel"
                          value={repPhone}
                          onChange={(e) => setRepPhone(e.target.value)}
                          placeholder="Phone number"
                          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy outline-none transition"
                        />
                        <input
                          type="email"
                          value={repEmail}
                          onChange={(e) => setRepEmail(e.target.value)}
                          placeholder="Email address"
                          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy outline-none transition"
                        />
                      </div>
                    )}
                  </div>

                  <hr className="border-stone-100" />

                  {/* Ancillary Services Toggle (hidden in S-Corp mode) */}
                  {!sCorpMode && <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ancillary Services</label>
                      <Toggle
                        checked={showAncillary}
                        onChange={() => setShowAncillary(prev => !prev)}
                        label="Toggle ancillary services"
                      />
                    </div>
                    {showAncillary && (
                      <div className="mt-3 space-y-2">
                        {Object.values(ANCILLARY_PRICING).map((svc) => (
                          <div key={svc.id}>
                            <label className="flex items-start gap-2 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={selectedAncillary[svc.id]}
                                onChange={() => toggleAncillary(svc.id)}
                                className="w-4 h-4 rounded mt-0.5 cursor-pointer"
                              />
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-semibold text-slate-700 group-hover:text-brand-navy transition-colors">{svc.name}</span>
                                <span className="block text-[10px] text-slate-400">{svc.monthlyBilling ? `${formatMoney(svc.monthlyPerUser)}/user/month (billed monthly)` : `${formatMoney(svc.pepm)}/emp per payroll${svc.minimum > 0 ? ` (Min ${formatMoney(svc.minimum)})` : ''}`}</span>
                              </div>
                            </label>
                            {selectedAncillary[svc.id] && (
                              <>
                                <div className="ml-6 mt-1 flex items-center gap-2 text-[10px]">
                                  <label className="text-slate-400 font-semibold uppercase tracking-wider">Setup</label>
                                  <Toggle
                                    checked={setupFees[svc.id]?.included || false}
                                    onChange={() => toggleSetup(svc.id)}
                                    label={`Toggle setup fee for ${svc.name}`}
                                  />
                                  {setupFees[svc.id]?.included ? (
                                    <div className="flex items-center gap-0.5">
                                      <span className="text-slate-400">$</span>
                                      <input
                                        type="number"
                                        value={setupFees[svc.id]?.amount || 0}
                                        onChange={(e) => updateSetupAmount(svc.id, e.target.value)}
                                        className="w-16 text-right text-xs border-b border-stone-300 focus:border-brand-navy outline-none bg-transparent py-0.5"
                                      />
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic">Waived</span>
                                  )}
                                </div>
                                {svc.id === 'expense' && (
                                  <div className="ml-6 mt-1 flex items-center gap-2 text-[10px]">
                                    <label className="text-brand-navy/70 font-semibold uppercase tracking-wider">Users</label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={expenseUserCount}
                                      onChange={(e) => setExpenseUserCount(e.target.value)}
                                      placeholder={`${employeeCount}`}
                                      className="w-16 text-center text-xs border border-stone-300 rounded-md px-1.5 py-0.5 focus:ring-1 focus:ring-brand-navy/30 focus:border-brand-navy outline-none"
                                    />
                                    <span className="text-slate-400 italic">Defaults to employee count</span>
                                  </div>
                                )}
                                {(svc.id === 'retirement' || svc.id === 'onboarding') && (
                                  <div className="ml-6 mt-1 flex items-center gap-3 text-[10px]">
                                    <div className="flex items-center gap-1">
                                      <label className="text-amber-600 font-semibold uppercase tracking-wider">Rate $</label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.05"
                                        value={ancillaryRateOverrides[svc.id]?.pepm ?? svc.pepm}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value);
                                          setAncillaryRateOverrides(prev => ({
                                            ...prev,
                                            [svc.id]: { ...prev[svc.id], pepm: isNaN(val) ? null : val },
                                          }));
                                        }}
                                        className="w-14 text-right text-xs border-b border-amber-300 focus:border-amber-500 outline-none bg-transparent py-0.5"
                                      />
                                      <span className="text-slate-400">/emp</span>
                                    </div>
                                    {svc.minimum > 0 && (
                                      <div className="flex items-center gap-1">
                                        <label className="text-amber-600 font-semibold uppercase tracking-wider">Min $</label>
                                        <input
                                          type="number"
                                          min="0"
                                          step="1"
                                          value={ancillaryRateOverrides[svc.id]?.minimum ?? svc.minimum}
                                          onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            setAncillaryRateOverrides(prev => ({
                                              ...prev,
                                              [svc.id]: { ...prev[svc.id], minimum: isNaN(val) ? null : val },
                                            }));
                                          }}
                                          className="w-14 text-right text-xs border-b border-amber-300 focus:border-amber-500 outline-none bg-transparent py-0.5"
                                        />
                                      </div>
                                    )}
                                    {(ancillaryRateOverrides[svc.id]?.pepm != null || ancillaryRateOverrides[svc.id]?.minimum != null) && (
                                      <button
                                        onClick={() => setAncillaryRateOverrides(prev => {
                                          const next = { ...prev };
                                          delete next[svc.id];
                                          return next;
                                        })}
                                        className="text-[9px] text-amber-600 hover:text-amber-800 underline"
                                      >
                                        Reset
                                      </button>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                        <div className="pt-1 border-t border-stone-100">
                          <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold mb-1.5">Usage-Based (when incurred)</p>
                          {Object.values(ANCILLARY_USAGE).map((svc) => (
                            <label key={svc.id} className="flex items-start gap-2 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={selectedAncillary[svc.id]}
                                onChange={() => toggleAncillary(svc.id)}
                                className="w-4 h-4 rounded mt-0.5 cursor-pointer"
                              />
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-semibold text-slate-700 group-hover:text-brand-navy transition-colors">{svc.name}</span>
                                {svc.rates.map((r, i) => (
                                  <span key={i} className="block text-[10px] text-slate-400">{r}</span>
                                ))}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>}

                  <hr className="border-stone-100" />

                  {/* S-Corp Mode Toggle */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">S-Corp / Owner-Only</label>
                      <Toggle
                        checked={sCorpMode}
                        onChange={toggleSCorpMode}
                        label="Toggle S-Corp mode"
                      />
                    </div>
                    {sCorpMode && (
                      <div className="mt-3 space-y-2.5">
                        <p className="text-[10px] text-slate-400 italic">Owner-only payroll — simplified pricing at $250/quarter (or $48/pay period bi-weekly).</p>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Setup Fee</label>
                          <div className="mt-1 flex items-center gap-2">
                            <Toggle
                              checked={sCorpSetup.included}
                              onChange={() => setSCorpSetup(prev => ({ ...prev, included: !prev.included }))}
                              label="Toggle S-Corp setup fee"
                            />
                            {sCorpSetup.included ? (
                              <div className="flex items-center gap-0.5">
                                <span className="text-slate-400 text-sm">$</span>
                                <input
                                  type="number"
                                  value={sCorpSetup.amount}
                                  onChange={(e) => setSCorpSetup(prev => ({ ...prev, amount: e.target.value }))}
                                  className="w-20 text-right text-sm border-b border-stone-300 focus:border-brand-navy outline-none bg-transparent py-0.5"
                                />
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Waived</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
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
                  if (sCorpMode && module.id !== 'payroll') return null;
                  const isActive = sCorpMode ? true : selectedModules[module.id];
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
                            {sCorpMode ? (() => {
                              const sc = calculateSCorpCost();
                              return (
                                <>
                                  {/* S-Corp: simple flat rate banner */}
                                  <div className="flex items-center justify-between bg-brand-navy/5 border border-brand-navy/10 rounded-lg px-3 py-2">
                                    <span className="text-sm font-bold text-brand-navy">
                                      {formatMoney(sc.perPeriod)}
                                      <span className="text-xs font-normal text-brand-navy/60 ml-1">/ {sc.periodLabel}</span>
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {formatMoney(sc.annual)} / year
                                    </span>
                                  </div>

                                  {/* Year-end W-2 */}
                                  <div className="mt-2 flex justify-between items-center text-[11px] text-brand-navy/70 bg-blue-50 rounded-lg px-3 py-1.5 border border-blue-100">
                                    <span>+ Annual W-2 Processing (billed in Jan)</span>
                                    <span className="font-bold text-brand-navy">{formatMoney(sc.yearEnd)}</span>
                                  </div>
                                </>
                              );
                            })() : (
                              <>
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

                                {/* Payroll Base Rate Override */}
                                {module.id === 'payroll' && (
                                  <div className="mt-2 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                    <span className="text-[11px] text-amber-700 font-medium">Override Base Rate (per payroll)</span>
                                    <div className="flex items-center gap-2">
                                      {payrollBaseOverride !== null && (
                                        <button
                                          onClick={() => setPayrollBaseOverride(null)}
                                          className="text-[10px] text-amber-600 hover:text-amber-800 underline"
                                        >
                                          Reset
                                        </button>
                                      )}
                                      <div className="flex items-center gap-1">
                                        <span className="text-amber-600 text-sm">$</span>
                                        <input
                                          type="number"
                                          min="0"
                                          step="1"
                                          value={payrollBaseOverride !== null ? payrollBaseOverride : (PRICING_CONFIG.payroll.baseFee * getMultiplier())}
                                          onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            setPayrollBaseOverride(isNaN(val) ? null : val);
                                          }}
                                          className="w-20 text-right text-sm border-b border-amber-300 focus:border-amber-500 outline-none bg-transparent py-0.5"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Additional Tax Jurisdictions */}
                                {module.id === 'payroll' && (
                                  <div className="mt-2 flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                    <span className="text-[11px] text-slate-600 font-medium">Additional Tax Jurisdictions ($10/ea per payroll)</span>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        min="0"
                                        value={additionalJurisdictions}
                                        onChange={(e) => setAdditionalJurisdictions(parseInt(e.target.value) || 0)}
                                        className="w-16 text-center text-sm border border-stone-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy outline-none"
                                      />
                                      {additionalJurisdictions > 0 && (
                                        <span className="text-xs font-semibold text-slate-600">+{formatMoney(additionalJurisdictions * 10)}</span>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Year-end line item */}
                                {module.hasYearEnd && (
                                  <div className="mt-2 flex justify-between items-center text-[11px] text-brand-navy/70 bg-blue-50 rounded-lg px-3 py-1.5 border border-blue-100">
                                    <span>+ {module.yearEndName}</span>
                                    <span className="font-bold text-brand-navy">{formatMoney(costs.yearEnd)}</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* State Tax ID Application (Per Agency) Card */}
                <div className={`rounded-2xl border transition-all duration-200 ${
                  stateTaxId.enabled
                    ? 'border-brand-navy/40 bg-white shadow-md ring-1 ring-brand-navy/10'
                    : 'border-stone-200 bg-white hover:border-stone-300 shadow-sm'
                }`}>
                  <div className="p-5 flex justify-between items-start">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="pt-0.5">
                        <input
                          type="checkbox"
                          checked={stateTaxId.enabled}
                          onChange={() => setStateTaxId(prev => ({ ...prev, enabled: !prev.enabled }))}
                          className="w-5 h-5 rounded cursor-pointer"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-brand-navy">State Tax ID Application (Per Agency)</h3>
                        <p className="text-xs text-slate-400 mt-0.5">State tax ID registration on behalf of client — $250 per ID</p>
                      </div>
                    </div>
                  </div>

                  {stateTaxId.enabled && (
                    <div className="px-5 pb-5 animate-fade-up">
                      <div className="ml-8">
                        <div className="flex items-center justify-between bg-brand-navy/5 border border-brand-navy/10 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-brand-navy/70 font-medium">Number of IDs</span>
                            <input
                              type="number"
                              min="1"
                              value={stateTaxId.quantity}
                              onChange={(e) => setStateTaxId(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                              className="w-16 text-center text-sm border border-stone-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy outline-none"
                            />
                          </div>
                          <span className="text-sm font-bold text-brand-navy">
                            {formatMoney(stateTaxIdTotal)}
                            <span className="text-xs font-normal text-brand-navy/60 ml-1">one-time</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payroll Year-to-Date Loading (PYTD) Card */}
                <div className={`rounded-2xl border transition-all duration-200 ${
                  pytd.enabled
                    ? 'border-brand-navy/40 bg-white shadow-md ring-1 ring-brand-navy/10'
                    : 'border-stone-200 bg-white hover:border-stone-300 shadow-sm'
                }`}>
                  <div className="p-5 flex justify-between items-start">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="pt-0.5">
                        <input
                          type="checkbox"
                          checked={pytd.enabled}
                          onChange={() => setPytd(prev => ({ ...prev, enabled: !prev.enabled }))}
                          className="w-5 h-5 rounded cursor-pointer"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-brand-navy">Payroll Year-to-Date Loading (PYTD)</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Historical YTD load — $150/hr + $0.10 per pay statement</p>
                      </div>
                    </div>
                  </div>

                  {pytd.enabled && (
                    <div className="px-5 pb-5 animate-fade-up">
                      <div className="ml-8 space-y-2">
                        <div className="flex items-center justify-between bg-brand-navy/5 border border-brand-navy/10 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-brand-navy/70 font-medium">Estimated Hours ($150/hr)</span>
                            <input
                              type="number"
                              min="0"
                              step="0.25"
                              value={pytd.hours}
                              onChange={(e) => setPytd(prev => ({ ...prev, hours: parseFloat(e.target.value) || 0 }))}
                              className="w-20 text-center text-sm border border-stone-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy outline-none"
                            />
                          </div>
                          <span className="text-xs font-semibold text-brand-navy">
                            {formatMoney(150 * (parseFloat(pytd.hours) || 0))}
                          </span>
                        </div>
                        <div className="flex items-center justify-between bg-brand-navy/5 border border-brand-navy/10 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-brand-navy/70 font-medium">Pay Statements ($0.10 ea)</span>
                            <input
                              type="number"
                              min="0"
                              value={pytd.statements}
                              onChange={(e) => setPytd(prev => ({ ...prev, statements: parseInt(e.target.value) || 0 }))}
                              className="w-20 text-center text-sm border border-stone-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy outline-none"
                            />
                          </div>
                          <span className="text-xs font-semibold text-brand-navy">
                            {formatMoney(0.10 * (parseInt(pytd.statements) || 0))}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-stone-200 pt-2 px-3">
                          <span className="text-xs font-bold text-brand-navy uppercase tracking-wider">Total</span>
                          <span className="text-sm font-bold text-brand-navy">
                            {formatMoney(pytdTotal)}
                            <span className="text-xs font-normal text-brand-navy/60 ml-1">one-time</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Benefit Integration (EDI) Card */}
                <div className={`rounded-2xl border transition-all duration-200 ${
                  benefitEdi.enabled
                    ? 'border-brand-navy/40 bg-white shadow-md ring-1 ring-brand-navy/10'
                    : 'border-stone-200 bg-white hover:border-stone-300 shadow-sm'
                }`}>
                  <div className="p-5 flex justify-between items-start">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="pt-0.5">
                        <input
                          type="checkbox"
                          checked={benefitEdi.enabled}
                          onChange={() => setBenefitEdi(prev => ({ ...prev, enabled: !prev.enabled }))}
                          className="w-5 h-5 rounded cursor-pointer"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-brand-navy">Benefit Integration (EDI)</h3>
                        <p className="text-xs text-slate-400 mt-0.5">$0.75/emp per payroll ($40 min) + $1,195 first feed / $995 each additional</p>
                      </div>
                    </div>
                  </div>

                  {benefitEdi.enabled && (
                    <div className="px-5 pb-5 animate-fade-up">
                      <div className="ml-8 space-y-2">
                        {/* COBRA Bundle Toggle */}
                        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          <span className="text-[11px] text-amber-700 font-medium">Bundle with COBRA ($0.90/emp)</span>
                          <Toggle
                            checked={benefitEdi.cobraBundle}
                            onChange={() => setBenefitEdi(prev => ({ ...prev, cobraBundle: !prev.cobraBundle }))}
                            label="Toggle COBRA bundle for Benefit EDI"
                          />
                        </div>

                        {/* Recurring per-payroll preview */}
                        <div className="flex items-center justify-between bg-brand-navy/5 border border-brand-navy/10 rounded-lg px-3 py-2">
                          <span className="text-[11px] text-brand-navy/70 font-medium">
                            Recurring: {formatMoney(benefitEdiRecurring.baseRate)}/emp (Min {formatMoney(40)})
                          </span>
                          <span className="text-sm font-bold text-brand-navy">
                            {formatMoney(benefitEdiRecurring.perPayroll)}
                            <span className="text-xs font-normal text-brand-navy/60 ml-1">/ payroll</span>
                            {benefitEdiRecurring.isMinApplied && (
                              <span className="ml-2 text-[9px] bg-brand-gold/20 text-brand-goldDark px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Min</span>
                            )}
                          </span>
                        </div>

                        {/* Implementation (one-time) */}
                        <div className="flex items-center justify-between bg-brand-navy/5 border border-brand-navy/10 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-brand-navy/70 font-medium">Number of Feeds</span>
                            <input
                              type="number"
                              min="1"
                              value={benefitEdi.feeds}
                              onChange={(e) => setBenefitEdi(prev => ({ ...prev, feeds: parseInt(e.target.value) || 0 }))}
                              className="w-16 text-center text-sm border border-stone-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy outline-none"
                            />
                          </div>
                          <span className="text-sm font-bold text-brand-navy">
                            {formatMoney(benefitEdiTotal)}
                            <span className="text-xs font-normal text-brand-navy/60 ml-1">one-time</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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
                  <th className="pb-3 text-right">{sCorpMode ? (totals.sCorpPeriodLabel === 'quarter' ? 'Per Quarter' : totals.sCorpPeriodLabel === 'year' ? 'Annual' : 'Per Payroll') : 'Per Payroll'}</th>
                  {!clientFacing &&<th className="pb-3 text-right">Annual Est.</th>}
                  <th className="pb-3 text-right pr-2">Setup Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {/* S-Corp mode: single row */}
                {sCorpMode ? (() => {
                  const sc = calculateSCorpCost();
                  return (
                    <tr className="text-sm">
                      <td className="py-4 pl-2">
                        <div className="font-bold text-slate-800">Owner-Only S-Corp Payroll</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {sc.periodLabel === 'quarter'
                            ? `Flat rate: ${formatMoney(sc.perPeriod)}/quarter`
                            : `Base: ${formatMoney(sc.perPeriod)}/payroll`
                          }
                        </div>
                        <div className="text-[10px] text-brand-navy/60 font-medium mt-0.5">
                          + Annual W-2 Processing (billed in Jan): {formatMoney(150)} base + {formatMoney(6.95)}/W-2 (Total: {formatMoney(sc.yearEnd)})
                        </div>
                      </td>
                      <td className="py-4 text-right font-semibold text-slate-700">
                        {formatMoney(sc.perPeriod)}
                      </td>
                      {!clientFacing && (
                        <td className="py-4 text-right text-slate-600">
                          {formatMoney(sc.annual)}
                        </td>
                      )}
                      <td className="py-4 text-right text-slate-600 pr-2">
                        {sc.setup > 0 ? formatMoney(sc.setup) : '\u2014'}
                      </td>
                    </tr>
                  );
                })() : (
                <>
                {/* Standard mode: all modules */}
                {Object.values(PRICING_CONFIG).map((module) => {
                  if (!selectedModules[module.id]) return null;
                  const costs = calculateModuleCost(module.id);

                  return (
                    <tr key={module.id} className="text-sm">
                      <td className="py-4 pl-2">
                        <div className="font-bold text-slate-800">{module.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {costs.rates.base > 0
                            ? `Rates: Base ${formatMoney(costs.rates.base)} + ${formatMoney(costs.rates.pepm)}/emp (Min ${formatMoney(costs.rates.min)})`
                            : `Rate: ${formatMoney(costs.rates.pepm)}/emp (Min ${formatMoney(costs.rates.min)})`
                          }
                        </div>
                        {module.id === 'payroll' && !sCorpMode && (
                          <div className="text-[10px] text-brand-navy/60 font-medium mt-0.5">
                            + New Hire Reporting: $3/New Hire
                          </div>
                        )}
                        {module.id === 'payroll' && additionalJurisdictions > 0 && (
                          <div className="text-[10px] text-brand-navy/60 font-medium mt-0.5">
                            + Additional Tax Jurisdictions: {additionalJurisdictions} × $10 = {formatMoney(additionalJurisdictions * 10)}/payroll
                          </div>
                        )}
                        {module.hasYearEnd && (
                          <div className="text-[10px] text-brand-navy/60 font-medium mt-0.5">
                            + {module.yearEndName}: {formatMoney(module.yearEndBase)} base + {formatMoney(module.yearEndPerItem)}/W-2 (Total: {formatMoney(costs.yearEnd)})
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

                {/* Ancillary per-payroll services (included in totals, hidden in S-Corp) */}
                {!sCorpMode && activeAncillaryPricingCount > 0 && (
                  <tr>
                    <td colSpan={clientFacing ? 3 : 4} className="pt-4 pb-1 pl-2">
                      <span className="text-[9px] font-bold text-brand-navy/60 uppercase tracking-widest">Ancillary Services</span>
                    </td>
                  </tr>
                )}
                {!sCorpMode && Object.values(ANCILLARY_PRICING).map((svc) => {
                  if (!selectedAncillary[svc.id]) return null;
                  const costs = calculateModuleCost(svc.id, ANCILLARY_PRICING);
                  return (
                    <tr key={svc.id} className="text-sm">
                      <td className="py-3 pl-2">
                        <div className="font-bold text-slate-800">{svc.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {`Rate: ${formatMoney(costs.rates.pepm)}/${svc.monthlyBilling ? 'user' : 'emp'}`}{costs.rates.min > 0 ? ` (Min ${formatMoney(costs.rates.min)})` : ''}{svc.monthlyBilling ? ' · Billed monthly' : ''}
                        </div>
                        {costs.isMinApplied && (
                          <span className="inline-block mt-1 text-[9px] text-brand-gold font-bold uppercase tracking-wider">
                            ★ Minimum Applied
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right font-semibold text-slate-700">
                        {formatMoney(costs.perPayroll)}
                      </td>
                      {!clientFacing && (
                        <td className="py-3 text-right text-slate-600">
                          {formatMoney(costs.annual)}
                        </td>
                      )}
                      <td className="py-3 text-right text-slate-600 pr-2">
                        {costs.setup > 0 ? formatMoney(costs.setup) : '\u2014'}
                      </td>
                    </tr>
                  );
                })}
                </>)}

                {/* State Tax ID Application (Per Agency) */}
                {stateTaxId.enabled && (
                  <tr className="text-sm border-t border-stone-100">
                    <td className="py-3 pl-2">
                      <div className="font-bold text-slate-800">State Tax ID Application (Per Agency)</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {stateTaxId.quantity} {parseInt(stateTaxId.quantity) === 1 ? 'ID' : 'IDs'} × $250
                      </div>
                    </td>
                    <td className="py-3 text-right text-slate-300">{'\u2014'}</td>
                    {!clientFacing && <td className="py-3 text-right text-slate-300">{'\u2014'}</td>}
                    <td className="py-3 text-right font-semibold text-slate-700 pr-2">
                      {formatMoney(stateTaxIdTotal)}
                    </td>
                  </tr>
                )}

                {/* Payroll Year-to-Date Loading (PYTD) */}
                {pytd.enabled && pytdTotal > 0 && (
                  <tr className="text-sm border-t border-stone-100">
                    <td className="py-3 pl-2">
                      <div className="font-bold text-slate-800">Payroll Year-to-Date Loading (PYTD)</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {(parseFloat(pytd.hours) || 0) > 0 && `${pytd.hours} hr × $150`}
                        {(parseFloat(pytd.hours) || 0) > 0 && (parseInt(pytd.statements) || 0) > 0 && ' + '}
                        {(parseInt(pytd.statements) || 0) > 0 && `${pytd.statements} statements × $0.10`}
                      </div>
                    </td>
                    <td className="py-3 text-right text-slate-300">{'—'}</td>
                    {!clientFacing && <td className="py-3 text-right text-slate-300">{'—'}</td>}
                    <td className="py-3 text-right font-semibold text-slate-700 pr-2">
                      {formatMoney(pytdTotal)}
                    </td>
                  </tr>
                )}

                {/* Benefit Integration (EDI) */}
                {benefitEdi.enabled && (
                  <tr className="text-sm border-t border-stone-100">
                    <td className="py-3 pl-2">
                      <div className="font-bold text-slate-800">Benefit Integration (EDI){benefitEdi.cobraBundle ? ' + COBRA Bundle' : ''}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {`Rate: ${formatMoney(benefitEdiRecurring.baseRate)}/emp (Min ${formatMoney(40)})`}
                      </div>
                      {benefitEdiTotal > 0 && (
                        <div className="text-[10px] text-brand-navy/60 font-medium mt-0.5">
                          + Implementation: {(parseInt(benefitEdi.feeds) || 0) === 1
                            ? `1 feed × $1,195`
                            : `1st feed $1,195 + ${(parseInt(benefitEdi.feeds) || 0) - 1} additional × $995`}
                        </div>
                      )}
                      {benefitEdiRecurring.isMinApplied && (
                        <span className="inline-block mt-1 text-[9px] text-brand-gold font-bold uppercase tracking-wider">
                          ★ Minimum Applied
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right font-semibold text-slate-700">
                      {formatMoney(benefitEdiRecurring.perPayroll)}
                    </td>
                    {!clientFacing && (
                      <td className="py-3 text-right text-slate-600">
                        {formatMoney(benefitEdiRecurring.annual)}
                      </td>
                    )}
                    <td className="py-3 text-right font-semibold text-slate-700 pr-2">
                      {benefitEdiTotal > 0 ? formatMoney(benefitEdiTotal) : '—'}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="border-t-2 border-brand-navy">
                {/* Discount rows (not in S-Corp mode) */}
                {!sCorpMode && discountPercent > 0 && (
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

            {/* S-Corp: inline services on same page (print only merges, screen shows separately) */}
            {sCorpMode && clientFacing && (
              <div className="hidden print-scorp-services mt-4 pt-4 border-t border-stone-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 bg-brand-gold rounded-full"></div>
                  <h3 className="text-xs font-bold text-brand-navy uppercase tracking-widest">Services Included</h3>
                </div>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1 ml-3">
                  {MODULE_SERVICES.scorp.services.map((service, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-[10px] text-slate-600">
                      <span className="text-brand-gold mt-0.5 flex-shrink-0">
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      <span className="leading-snug">{service}</span>
                    </li>
                  ))}
                </ul>
                {showRepInfo && (repName || repPhone || repEmail) && (
                  <div className="mt-3 pt-3 border-t border-stone-100 text-center">
                    <p className="text-[10px] text-slate-500 mb-1">Contact your Creative Planning Payroll representative to get started.</p>
                    {repName && <p className="text-xs font-bold text-brand-gold">{repName}</p>}
                    {repPhone && <p className="text-[10px] font-semibold text-brand-gold">{repPhone}</p>}
                    {repEmail && <p className="text-[10px] font-semibold text-brand-gold">{repEmail}</p>}
                  </div>
                )}
              </div>
            )}

            {/* Usage-based, T&C, and footer kept together in print */}
            <div className="print-keep-together">
              {/* Usage-Based Services (informational only, hidden in S-Corp) */}
              {!sCorpMode && activeAncillaryUsageCount > 0 && (
                <div className="mt-6 pt-4 border-t border-stone-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Additional Usage-Based Services</p>
                  <p className="text-[9px] text-slate-400 mb-2 italic">Fees incurred when utilized — not included in totals above.</p>
                  <table className="w-full">
                    <tbody className="divide-y divide-stone-50">
                      {Object.values(ANCILLARY_USAGE).map((svc) => {
                        if (!selectedAncillary[svc.id]) return null;
                        return (
                          <tr key={svc.id} className="text-xs">
                            <td className="py-2 pl-2">
                              <div className="font-semibold text-slate-700">{svc.name}</div>
                            </td>
                            <td className="py-2 text-right text-slate-600 pr-2" colSpan={2}>
                              {svc.rates.map((r, i) => (
                                <div key={i} className="whitespace-nowrap">{r}</div>
                              ))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Terms & Conditions */}
              <div className="mt-6 pt-4 border-t border-stone-100 text-xs text-slate-400 print-tc">
                <p className="mb-1.5 font-bold text-brand-navy text-[11px] uppercase tracking-wider">Pricing Terms &amp; Conditions</p>
                <p className="leading-relaxed">
                  This estimate is based on <span className="font-bold text-slate-600">{employeeCount} employees</span> processed <span className="font-bold text-slate-600">{FREQUENCIES[frequency].label.toLowerCase()}</span>.
                  Actual billing may vary based on fluctuations in employee count. Setup fees are one-time charges billed at onboarding.
                  Year-end processing fees (W-2, 1094-C/1095-C) are billed separately during their respective filing periods.
                  Prices are subject to change with 30 days written notice. This quote is valid for 30 days from the date of issue.
                </p>
                <p className="leading-relaxed mt-2">
                  <span className="font-bold text-slate-600">Employee Pricing Notice:</span> Per-employee fees per payroll are based on all active employees in the payroll platform, which may differ from the number of employees paid in a given pay period. Active employees who are on leave, have $0 payrolls, or are otherwise not included in a specific payroll run may still be counted toward per-employee billing.
                </p>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-stone-100 flex justify-between items-center text-[10px] text-slate-300 print-footer">
                <span>Creative Planning Payroll &bull; Confidential</span>
                <span>Generated {formatDate(quoteDate)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Page 2: Services Included (Client Facing Only, separate page in print — hidden for S-Corp print) */}
        {clientFacing && (
          <section className={`bg-white shadow-xl border border-stone-200 rounded-2xl overflow-hidden max-w-4xl mx-auto mt-10 print-container print-page-break print-services-compact ${sCorpMode ? 'print-scorp-hide' : ''}`}>

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
                  const isSelected = sCorpMode ? (key === 'scorp') : (selectedModules[key] || selectedAncillary[key]);
                  if (!isSelected) return null;
                  const activeServiceModules = sCorpMode
                    ? ['scorp']
                    : Object.keys(MODULE_SERVICES).filter(k => selectedModules[k] || selectedAncillary[k]);
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

              {/* Contact + Footer kept together */}
              <div className="print-keep-together">
                <div className="mt-8 bg-brand-navy/5 border border-brand-navy/10 rounded-xl p-6 services-contact">
                  <div className="text-center">
                    <p className="text-sm font-bold text-brand-navy font-display">Ready to get started?</p>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-md mx-auto">
                      Contact your Creative Planning Payroll representative to discuss your customized solution and begin onboarding.
                    </p>
                    {showRepInfo && (repName || repPhone || repEmail) && (
                      <div className="mt-3 space-y-0.5">
                        {repName && <p className="text-sm font-bold text-brand-gold">{repName}</p>}
                        {repPhone && <p className="text-xs font-semibold text-brand-gold">{repPhone}</p>}
                        {repEmail && <p className="text-xs font-semibold text-brand-gold">{repEmail}</p>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-3 border-t border-stone-100 flex justify-between items-center text-[10px] text-slate-300 services-footer">
                  <span>Creative Planning Payroll &bull; Confidential</span>
                  <span>Generated {formatDate(quoteDate)}</span>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
