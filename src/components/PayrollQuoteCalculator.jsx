import { useState, useMemo, useEffect } from 'react';
import {
  PRICING_CONFIG, FREQUENCIES, STANDARD_FREQUENCIES, SCORP_FREQUENCIES,
  MODULE_SERVICES, ANCILLARY_PRICING, ANCILLARY_USAGE,
  USAGE_RATE_SHEET, SHIPPING_RATE_SHEET,
  BENEFIT_EDI_MIN, JURISDICTION_FEE_PER_LOCATION,
  formatMoney, formatDate,
} from '../constants/pricing';
import * as pricingCalc from '../lib/pricing-calc';
import { Icon, ModuleIcon } from './Icons';
import Toggle from './Toggle';
import Toast from './Toast';
import QuoteStudio from './studio/QuoteStudio';
import QuoteDocuments from './QuoteDocuments';
import Tooltip from './Tooltip';


// Rep guide is a static HTML file in /public served alongside the app.
// import.meta.env.BASE_URL resolves to the deployed base path (main or preview).
const REP_GUIDE_URL = `${import.meta.env.BASE_URL}guide.html`;

export default function PayrollQuoteCalculator({ preview = false }) {
  const storageKey = preview ? 'cpp-quote-builder:studio:quotes:v2' : 'cpp-quote-builder:quotes';
  // --- State ---
  const [clientName, setClientName] = useState('');
  const [quoteDate, setQuoteDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [employeeCount, setEmployeeCount] = useState(15);
  const [w2Count, setW2Count] = useState('');
  const [count1099, setCount1099] = useState('');
  const [payrollYearEndRateOverride, setPayrollYearEndRateOverride] = useState(null);
  const [annualFormsOverride, setAnnualFormsOverride] = useState('');
  const [expenseUserCount, setExpenseUserCount] = useState('');
  const [frequency, setFrequency] = useState('biweekly');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountOptOut, setDiscountOptOut] = useState({});
  // The single output-mode switch:
  //   clientFacing = true  → client-friendly pricing quote
  //   clientFacing = false → internal Sales Summary (revenue breakdown + CSV)
  const [clientFacing, setClientFacing] = useState(true);

  // Right-column tab: 'modules' | 'addons' | 'overrides'
  const [activeTab, setActiveTab] = useState('modules');

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
  const stateTaxIdTotal = pricingCalc.calculateStateTaxIdTotal(stateTaxId);

  const [pytd, setPytd] = useState({ enabled: false, hours: 0, statements: 0 });
  const pytdTotal = pricingCalc.calculatePytdTotal(pytd);

  const [benefitEdi, setBenefitEdi] = useState({ enabled: false, feeds: 1, cobraBundle: false });
  const benefitEdiTotal = pricingCalc.calculateBenefitEdiOneTime(benefitEdi);
  const benefitEdiRecurring = pricingCalc.calculateBenefitEdiRecurring({
    benefitEdi, employeeCount, frequency,
  });

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
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  });
  const [quoteNameInput, setQuoteNameInput] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (message, kind = 'success') => setToast({ message, kind, id: Date.now() });

  useEffect(() => {
    try {
      if (!preview) localStorage.setItem(storageKey, JSON.stringify(savedQuotes));
    } catch {}
  }, [savedQuotes, storageKey, preview]);

  const saveCurrentQuote = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const snapshot = {
      clientName, quoteDate, employeeCount, w2Count, count1099,
      payrollYearEndRateOverride, annualFormsOverride,
      expenseUserCount, frequency, discountPercent, discountOptOut,
      clientFacing, showRepInfo, repName, repPhone, repEmail,
      selectedModules, payrollBaseOverride, additionalJurisdictions,
      showAncillary, selectedAncillary, sCorpMode, sCorpSetup,
      stateTaxId, pytd, benefitEdi, ancillaryRateOverrides, setupFees,
      savedAt: new Date().toISOString(),
    };
    const isUpdate = Object.hasOwn(savedQuotes, trimmed);
    const next = { ...savedQuotes, [trimmed]: snapshot };
    if (preview) {
      try { localStorage.setItem(storageKey, JSON.stringify(next)); }
      catch { showToast('Unable to save. Browser storage is unavailable or full. Export a PDF before closing.', 'destructive'); return false; }
    }
    setSavedQuotes(next);
    setQuoteNameInput('');
    setShowSaveInput(false);
    showToast(isUpdate ? `Updated "${trimmed}"` : `Saved "${trimmed}"`);
  };

  const loadQuote = (name) => {
    const s = savedQuotes[name];
    if (!s) return;
    if (s.clientName !== undefined) setClientName(s.clientName);
    if (s.quoteDate !== undefined) setQuoteDate(s.quoteDate);
    if (s.employeeCount !== undefined) setEmployeeCount(s.employeeCount);
    if (s.w2Count !== undefined) setW2Count(s.w2Count);
    if (s.count1099 !== undefined) setCount1099(s.count1099);
    if (s.payrollYearEndRateOverride !== undefined) setPayrollYearEndRateOverride(s.payrollYearEndRateOverride);
    if (s.annualFormsOverride !== undefined) setAnnualFormsOverride(s.annualFormsOverride);
    if (s.expenseUserCount !== undefined) setExpenseUserCount(s.expenseUserCount);
    if (s.frequency !== undefined) setFrequency(s.frequency);
    if (s.discountPercent !== undefined) setDiscountPercent(s.discountPercent);
    if (s.discountOptOut !== undefined) setDiscountOptOut(s.discountOptOut);
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
    showToast(`Loaded "${name}"`, 'info');
  };

  const deleteQuote = (name) => {
    const next = { ...savedQuotes };
    delete next[name];
    if (preview) {
      try { localStorage.setItem(storageKey, JSON.stringify(next)); }
      catch { showToast('Unable to delete from browser storage.', 'destructive'); return; }
    }
    setSavedQuotes(next);
    showToast(`Deleted "${name}"`, 'destructive');
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

  // Bundle current state for pricing-calc functions
  const calcState = () => ({
    employeeCount, w2Count, count1099, frequency,
    payrollBaseOverride, payrollYearEndRateOverride, annualFormsOverride,
    additionalJurisdictions, expenseUserCount,
    ancillaryRateOverrides, setupFees,
    selectedModules, selectedAncillary,
    discountPercent, discountOptOut,
    benefitEdi, stateTaxId, pytd,
    sCorpMode, sCorpSetup,
  });

  const getMultiplier = () => pricingCalc.getMultiplier(frequency);
  const calculateSCorpCost = () => pricingCalc.calculateSCorpCost(calcState());
  const calculateModuleCost = (moduleKey, configSource = PRICING_CONFIG, customEmpCount = null) =>
    pricingCalc.calculateModuleCost(moduleKey, configSource, { ...calcState(), customEmpCount });

  const totals = useMemo(
    () => pricingCalc.calculateTotals(calcState()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      selectedModules, selectedAncillary, employeeCount, w2Count, count1099,
      payrollYearEndRateOverride, annualFormsOverride, expenseUserCount,
      frequency, discountPercent, discountOptOut, setupFees, payrollBaseOverride,
      sCorpMode, sCorpSetup, stateTaxId, additionalJurisdictions,
      ancillaryRateOverrides, pytd, benefitEdi,
    ],
  );

  const totalPerPayrollAt = (empCount) => pricingCalc.totalPerPayrollAt(empCount, calcState());

  const perEmployeeDelta = {
    up: totalPerPayrollAt(employeeCount + 1) - totals.finalPerPayroll,
    down: employeeCount > 0 ? totals.finalPerPayroll - totalPerPayrollAt(employeeCount - 1) : 0,
  };

  // Identify selected modules currently sitting at their minimum floor.
  // For each, compute the employee-count threshold where they'd unlock:
  //   raw cost = base + pepm × emp = min  →  emp = ceil((min - base) / pepm)
  const modulesAtMinimum = (() => {
    if (sCorpMode) return [];
    const flagged = [];
    Object.values(PRICING_CONFIG).forEach(m => {
      if (!selectedModules[m.id]) return;
      const c = calculateModuleCost(m.id);
      if (c.isMinApplied && c.rates.pepm > 0) {
        const unlockEmp = Math.ceil((c.rates.min - c.rates.base) / c.rates.pepm);
        flagged.push({ name: m.name, unlockAt: unlockEmp });
      }
    });
    Object.values(ANCILLARY_PRICING).forEach(svc => {
      if (!selectedAncillary[svc.id]) return;
      const c = calculateModuleCost(svc.id, ANCILLARY_PRICING);
      if (c.isMinApplied && c.rates.pepm > 0) {
        const unlockEmp = Math.ceil((c.rates.min - c.rates.base) / c.rates.pepm);
        flagged.push({ name: svc.name, unlockAt: unlockEmp });
      }
    });
    return flagged;
  })();

  // Small green asterisk shown next to per-payroll amounts on the quote for
  // modules being discounted (only when a discount % is set and the module
  // hasn't been opted out).
  // Format the headcount breakdown for display in a module's rate line.
  // e.g. "× 18 (15 emp + 3 1099s)" or "× 200 W-2s" or "× 25 users".
  const formatHeadcount = (costs) => {
    if (!costs.headcount || costs.headcount <= 0) return '';
    const b = costs.headcountBreakdown || {};
    if (b.w2Employees > 0) return ` × ${b.w2Employees} W-2s`;
    if (b.users > 0) return ` × ${b.users} users`;
    if (b.contractors > 0) {
      return ` × ${costs.headcount} (${b.employees} emp + ${b.contractors} 1099s)`;
    }
    return ` × ${costs.headcount} employees`;
  };

  // Collect annual (year-end) fees for display below the quote total
  const annualFees = (() => {
    const items = [];
    const overrideActive = annualFormsOverride !== '' && annualFormsOverride !== null;
    const overrideCount = parseInt(annualFormsOverride) || 0;
    if (sCorpMode) {
      const sc = calculateSCorpCost();
      if (sc.yearEnd > 0) {
        const w2Head = (w2Count !== '' && parseInt(w2Count) > 0) ? parseInt(w2Count) : employeeCount;
        const forms1099 = parseInt(count1099) || 0;
        const rate = payrollYearEndRateOverride !== null ? payrollYearEndRateOverride : PRICING_CONFIG.payroll.yearEndPerItem;
        items.push({
          label: (overrideActive || forms1099 > 0)
            ? 'Annual W-2/1099 Processing (billed in Jan)'
            : 'Annual W-2 Processing (billed in Jan)',
          detail: overrideActive
            ? `${formatMoney(150)} base + ${formatMoney(rate)}/form (${overrideCount} annual forms, override)`
            : `${formatMoney(150)} base + ${formatMoney(rate)}/form` + (forms1099 > 0
              ? ` (${w2Head} W-2s + ${forms1099} 1099s)`
              : ` (${w2Head} W-2s)`),
          total: sc.yearEnd,
        });
      }
    } else {
      Object.values(PRICING_CONFIG).forEach(module => {
        if (selectedModules[module.id] && module.hasYearEnd) {
          const c = calculateModuleCost(module.id);
          if (module.id === 'payroll') {
            const w2Head = (w2Count !== '' && parseInt(w2Count) > 0) ? parseInt(w2Count) : employeeCount;
            const forms1099 = parseInt(count1099) || 0;
            const rate = payrollYearEndRateOverride !== null ? payrollYearEndRateOverride : module.yearEndPerItem;
            items.push({
              label: (overrideActive || forms1099 > 0)
                ? 'Annual W-2/1099 Processing (billed in Jan)'
                : 'Annual W-2 Processing (billed in Jan)',
              detail: overrideActive
                ? `${formatMoney(module.yearEndBase)} base + ${formatMoney(rate)}/form (${overrideCount} annual forms, override)`
                : `${formatMoney(module.yearEndBase)} base + ${formatMoney(rate)}/form` + (forms1099 > 0
                  ? ` (${w2Head} W-2s + ${forms1099} 1099s)`
                  : ` (${w2Head} W-2s)`),
              total: c.yearEnd,
            });
          } else {
            items.push({
              label: module.yearEndName,
              detail: `${formatMoney(module.yearEndBase)} base + ${formatMoney(module.yearEndPerItem)}/employee`,
              total: c.yearEnd,
            });
          }
        }
      });
    }
    const grandTotal = items.reduce((sum, item) => sum + item.total, 0);
    return { items, grandTotal };
  })();

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

  const quoteDocuments = <QuoteDocuments {...{ clientName, quoteDate, employeeCount, frequency, sCorpMode, totals, clientFacing, activeModuleCount, benefitEdi, stateTaxId, pytd, selectedAncillary, calculateSCorpCost, selectedModules, calculateModuleCost, formatHeadcount, additionalJurisdictions, activeAncillaryPricingCount, stateTaxIdTotal, pytdTotal, benefitEdiRecurring, benefitEdiTotal, discountPercent, perEmployeeDelta, modulesAtMinimum, annualFees, showRepInfo, repName, repPhone, repEmail, activeAncillaryUsageCount, discountOptOut }} />;

  if (preview) {
    const setters = { clientName: setClientName, quoteDate: setQuoteDate, employeeCount: setEmployeeCount, w2Count: setW2Count, count1099: setCount1099, payrollYearEndRateOverride: setPayrollYearEndRateOverride, annualFormsOverride: setAnnualFormsOverride, expenseUserCount: setExpenseUserCount, frequency: setFrequency, discountPercent: setDiscountPercent, discountOptOut: setDiscountOptOut, clientFacing: setClientFacing, showRepInfo: setShowRepInfo, repName: setRepName, repPhone: setRepPhone, repEmail: setRepEmail, selectedModules: setSelectedModules, payrollBaseOverride: setPayrollBaseOverride, additionalJurisdictions: setAdditionalJurisdictions, ancillaryRateOverrides: setAncillaryRateOverrides, selectedAncillary: setSelectedAncillary, sCorpMode: setSCorpMode, sCorpSetup: setSCorpSetup, stateTaxId: setStateTaxId, pytd: setPytd, benefitEdi: setBenefitEdi, setupFees: setSetupFees };
    return <QuoteStudio
      state={{ clientName, quoteDate, employeeCount, w2Count, count1099, payrollYearEndRateOverride, annualFormsOverride, expenseUserCount, frequency, discountPercent, discountOptOut, clientFacing, showRepInfo, repName, repPhone, repEmail, selectedModules, payrollBaseOverride, additionalJurisdictions, ancillaryRateOverrides, selectedAncillary, sCorpMode, sCorpSetup, stateTaxId, pytd, benefitEdi, setupFees }}
      change={(key, value) => setters[key](value)}
      totals={totals} documents={quoteDocuments} savedQuotes={savedQuotes}
      onSave={saveCurrentQuote} onLoad={loadQuote} onDelete={deleteQuote}
      toast={<Toast toast={toast} onDismiss={() => setToast(null)} />}
    />;
  }

  // --- Render ---
  return (
    <div className="min-h-screen">

      {/* App Header — gradient + crest + segmented output view + split print */}
      <header className="header-gradient text-white no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            {/* Crest ornament — small serif "C" mark */}
            <div
              aria-hidden="true"
              className="w-9 h-9 rounded-lg grid place-items-center bg-white/10 border border-white/15 font-display font-bold text-brand-gold text-lg"
            >
              C
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight font-display leading-tight">Creative Planning Payroll</h1>
              <p className="text-white/60 text-[10px] tracking-[0.16em] uppercase font-semibold mt-0.5">Quote Builder</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={REP_GUIDE_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Open the rep guide"
              aria-label="Open the rep guide in a new tab"
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <Icon.Help className="w-5 h-5" />
            </a>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-brand-gold hover:bg-brand-goldDark text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors shadow-sm"
            >
              <Icon.Printer />
              Print Quote
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Configuration Panel */}
        <section className="no-print mb-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left: sidebar (Hero Total sticky, Quote Settings scrolls with page) */}
            <div className="lg:col-span-4 space-y-4">

              {/* Hero Total — dark navy card at top of sidebar */}
              <div className="relative overflow-hidden rounded-2xl shadow-warm-md text-white"
                   style={{ background: 'linear-gradient(180deg, #004F71 0%, #003950 100%)', borderLeft: '3px solid #C49A6C' }}>
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(120% 80% at 100% 0%, rgba(196,154,108,0.28), transparent 55%)' }} aria-hidden="true"></div>
                <div className="relative p-5">
                  <div className="text-[9px] font-bold uppercase tracking-[0.18em] mb-1" style={{ color: 'rgba(255,255,255,0.65)' }}>
                    {sCorpMode
                      ? (totals.sCorpPeriodLabel === 'quarter' ? 'Total per Quarter' : totals.sCorpPeriodLabel === 'year' ? 'Total Annual' : 'Total per Payroll')
                      : 'Total per Payroll'}
                  </div>
                  <div className="font-display font-bold leading-none tabular-nums text-white" style={{ fontSize: '2.5rem', letterSpacing: '-0.02em' }}>
                    {formatMoney(totals.finalPerPayroll)}
                  </div>
                  <div className="mt-2 h-[2px] w-10 rounded-sm" style={{ background: '#C49A6C' }}></div>

                  <div className="mt-4 pt-3 grid grid-cols-3 gap-2 text-[10px]" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                    <div>
                      <div className="uppercase tracking-wider font-semibold" style={{ color: 'rgba(255,255,255,0.65)' }}>Modules</div>
                      <div className="font-semibold text-white tabular-nums text-sm mt-0.5">{activeModuleCount}</div>
                    </div>
                    {!clientFacing ? (
                      <div>
                        <div className="uppercase tracking-wider font-semibold" style={{ color: 'rgba(255,255,255,0.65)' }}>Annual Est.</div>
                        <div className="font-semibold text-white tabular-nums text-sm mt-0.5">{formatMoney(totals.finalAnnual)}</div>
                      </div>
                    ) : (
                      <div>
                        <div className="uppercase tracking-wider font-semibold" style={{ color: 'rgba(255,255,255,0.65)' }}>Discount</div>
                        <div className="font-semibold text-white tabular-nums text-sm mt-0.5">{discountPercent > 0 ? `${discountPercent}%` : '—'}</div>
                      </div>
                    )}
                    <div className="text-right">
                      <div className="uppercase tracking-wider font-semibold" style={{ color: 'rgba(255,255,255,0.65)' }}>Setup</div>
                      <div className="font-semibold text-white tabular-nums text-sm mt-0.5">{formatMoney(totals.totalSetup)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-warm-sm border border-stone-200 p-6">
                <h2 className="text-base font-bold text-brand-navy flex items-center gap-2 mb-2">
                  <Icon.Settings className="w-5 h-5" />
                  Quote Settings
                </h2>
                <div className="gold-hairline mb-5"></div>

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

                  {/* Recurring Discount (pricing decision — kept alongside Client Details) */}
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
                    <p className="text-[11px] text-slate-400 mt-1">Applies to recurring per-payroll fees only. Excluded modules show no <span className="text-emerald-600 font-bold">*</span> on the quote.</p>
                  </div>

                  {/* Advanced overrides moved to the Overrides tab (right column) */}

                  <hr className="border-stone-100" />

                  {/* Client Facing toggle — controls whether Annual Est. column appears in the quote table */}
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Client Facing</label>
                    <Toggle
                      checked={clientFacing}
                      onChange={() => setClientFacing(prev => !prev)}
                      label="Toggle client facing mode"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 -mt-2">
                    {clientFacing
                      ? 'On: standard client-facing quote (no annual column).'
                      : 'Off: shows Annual Est. column inline for internal review.'}
                  </p>

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

                  {/* S-Corp Setup Fee — only shown when S-Corp mode is active (toggle is in Overrides tab) */}
                  {sCorpMode && (
                    <div className="bg-brand-gold/5 border-l-2 border-brand-gold rounded-r px-3 py-2.5">
                      <p className="text-[10px] font-semibold text-brand-goldDark uppercase tracking-wider">S-Corp Setup Fee</p>
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
                  )}
                </div>
              </div>
            </div>

            {/* Right: Module Selector Cards */}
            <div className="lg:col-span-8">
              {/* Tab bar */}
              {!sCorpMode ? (
                <div className="mb-4">
                  <div className="flex items-end gap-1 border-b border-stone-200" role="tablist" aria-label="Quote configuration tabs">
                    {[
                      { id: 'modules', label: 'Service Modules', count: activeModuleCount, total: Object.keys(PRICING_CONFIG).length },
                      { id: 'addons', label: 'Add-ons & Extras', count: activeAncillaryCount + (stateTaxId.enabled ? 1 : 0) + (pytd.enabled ? 1 : 0) + (benefitEdi.enabled ? 1 : 0) },
                      { id: 'overrides', label: 'Overrides', count: (w2Count !== '' ? 1 : 0) + (count1099 !== '' ? 1 : 0) + (payrollYearEndRateOverride !== null ? 1 : 0) + (annualFormsOverride !== '' ? 1 : 0) },
                    ].map(tab => {
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          role="tab"
                          aria-selected={isActive}
                          onClick={() => setActiveTab(tab.id)}
                          className={`relative px-4 py-2.5 text-sm font-semibold transition-colors -mb-px border-b-2 ${
                            isActive
                              ? 'text-brand-navy border-brand-gold'
                              : 'text-slate-500 hover:text-brand-navy border-transparent'
                          }`}
                        >
                          <span>{tab.label}</span>
                          {tab.count > 0 && (
                            <span className={`ml-2 inline-flex items-center justify-center min-w-[20px] h-5 rounded-full text-[10px] font-bold px-1.5 ${
                              isActive
                                ? 'bg-brand-navy text-white'
                                : 'bg-stone-200 text-slate-600'
                            }`}>
                              {tab.total ? `${tab.count}/${tab.total}` : tab.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-[11px] font-bold text-brand-navy uppercase tracking-[0.14em]">Owner-Only S-Corp Payroll</h2>
                  </div>
                  <div className="gold-hairline"></div>
                </div>
              )}

              {/* Tab: Service Modules (also shown in S-Corp mode as the only module) */}
              {(sCorpMode || activeTab === 'modules') && (
              <div className="space-y-4">
                {Object.values(PRICING_CONFIG).map((module) => {
                  if (sCorpMode && module.id !== 'payroll') return null;
                  const isActive = sCorpMode ? true : selectedModules[module.id];
                  const costs = calculateModuleCost(module.id);

                  return (
                    <div
                      key={module.id}
                      className={`module-card rounded-2xl border bg-white ${
                        isActive
                          ? 'module-card--selected border-brand-navy/40 shadow-md ring-2 ring-brand-navy/15'
                          : 'border-stone-200 shadow-sm'
                      }`}
                    >
                      {/* Module Header */}
                      <div className="p-5 flex justify-between items-start">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="pt-0.5">
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={() => toggleModule(module.id)}
                              className="w-5 h-5 rounded cursor-pointer"
                            />
                          </div>
                          <div className={`w-10 h-10 flex-shrink-0 rounded-xl grid place-items-center transition-colors ${
                            isActive ? 'bg-brand-navy/10 text-brand-navy' : 'bg-stone-100 text-slate-500'
                          }`} aria-hidden="true">
                            <ModuleIcon moduleId={module.id} className="w-5 h-5" />
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
                                    <span className="text-[11px] text-slate-600 font-medium">Additional Tax Jurisdictions ({formatMoney(JURISDICTION_FEE_PER_LOCATION)}/ea per payroll)</span>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        min="0"
                                        value={additionalJurisdictions}
                                        onChange={(e) => setAdditionalJurisdictions(parseInt(e.target.value) || 0)}
                                        className="w-16 text-center text-sm border border-stone-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy outline-none"
                                      />
                                      {additionalJurisdictions > 0 && (
                                        <span className="text-xs font-semibold text-slate-600">+{formatMoney(additionalJurisdictions * JURISDICTION_FEE_PER_LOCATION)}</span>
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
              </div>
              )}

              {/* Tab: Add-ons & Extras — recurring ancillary + usage-based + one-time specialty fees */}
              {!sCorpMode && activeTab === 'addons' && (
              <div className="space-y-6">

                {/* Recurring Add-ons (ancillary per-payroll services) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[11px] font-bold text-brand-navy uppercase tracking-[0.14em]">Recurring Add-ons</h3>
                    <span className="text-[10px] text-slate-400">Per-payroll services beyond core modules</span>
                  </div>
                  <div className="gold-hairline"></div>

                  <div className="mt-3 grid sm:grid-cols-2 gap-3">
                    {Object.values(ANCILLARY_PRICING).map((svc) => (
                      <div key={svc.id} className={`rounded-xl border transition-all p-3 ${
                        selectedAncillary[svc.id]
                          ? 'border-brand-navy/40 bg-white ring-2 ring-brand-navy/10 shadow-warm-sm'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}>
                        <label className="flex items-start gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={selectedAncillary[svc.id]}
                            onChange={() => toggleAncillary(svc.id)}
                            className="w-4 h-4 rounded mt-0.5 cursor-pointer flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-semibold text-slate-800 group-hover:text-brand-navy transition-colors">{svc.name}</span>
                            <span className="block text-[11px] text-slate-500 mt-0.5">{
                              svc.monthlyBilling
                                ? (svc.monthlyFlat !== undefined
                                    ? `${formatMoney(svc.monthlyFlat)}/month · flat · billed monthly`
                                    : `${formatMoney(svc.monthlyPerUser)}/user/month · billed monthly`)
                                : `${formatMoney(svc.pepm)}/emp per payroll${svc.minimum > 0 ? ` (Min ${formatMoney(svc.minimum)})` : ''}`
                            }</span>
                          </div>
                        </label>
                        {selectedAncillary[svc.id] && (
                          <div className="mt-3 pt-2.5 border-t border-dashed border-stone-200 space-y-2">
                            <div className="flex items-center gap-2 text-[10px]">
                              <label className="text-slate-500 font-semibold uppercase tracking-wider">Setup</label>
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
                              <div className="flex items-center gap-2 text-[10px]">
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
                              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[10px]">
                                <div className="flex items-center gap-1">
                                  <label className="text-amber-600 font-semibold uppercase tracking-wider">Rate $</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.05"
                                    value={ancillaryRateOverrides[svc.id]?.pepm ?? svc.pepm}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      setAncillaryRateOverrides(prev => ({ ...prev, [svc.id]: { ...prev[svc.id], pepm: isNaN(val) ? null : val } }));
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
                                        setAncillaryRateOverrides(prev => ({ ...prev, [svc.id]: { ...prev[svc.id], minimum: isNaN(val) ? null : val } }));
                                      }}
                                      className="w-14 text-right text-xs border-b border-amber-300 focus:border-amber-500 outline-none bg-transparent py-0.5"
                                    />
                                  </div>
                                )}
                                {(ancillaryRateOverrides[svc.id]?.pepm != null || ancillaryRateOverrides[svc.id]?.minimum != null) && (
                                  <button
                                    onClick={() => setAncillaryRateOverrides(prev => { const next = { ...prev }; delete next[svc.id]; return next; })}
                                    className="text-[9px] text-amber-600 hover:text-amber-800 underline"
                                  >Reset</button>
                                )}
                              </div>
                            )}
                            {svc.id === 'retirement' && (
                              <label className="flex items-center gap-2 text-[10px] cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!discountOptOut.retirement}
                                  onChange={() => setDiscountOptOut(prev => ({ ...prev, retirement: !prev.retirement }))}
                                  className="w-3.5 h-3.5 rounded cursor-pointer"
                                />
                                <span className="text-slate-600 font-medium">Do Not Apply Discount</span>
                              </label>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Usage-based ancillary — informational only */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[11px] font-bold text-brand-navy uppercase tracking-[0.14em]">Usage-Based (When Incurred)</h3>
                    <span className="text-[10px] text-slate-400">Informational rates — not in totals</span>
                  </div>
                  <div className="gold-hairline"></div>
                  <div className="mt-3 grid sm:grid-cols-2 gap-2">
                    {Object.values(ANCILLARY_USAGE).map((svc) => (
                      <label key={svc.id} className="flex items-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-stone-50 border border-transparent hover:border-stone-200">
                        <input
                          type="checkbox"
                          checked={selectedAncillary[svc.id]}
                          onChange={() => toggleAncillary(svc.id)}
                          className="w-4 h-4 rounded mt-0.5 cursor-pointer flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-semibold text-slate-700">{svc.name}</span>
                          {svc.rates.map((r, i) => (
                            <span key={i} className="block text-[10px] text-slate-400">{r}</span>
                          ))}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* One-Time & Specialty Fees section header */}
                <div className="pt-1 mb-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[11px] font-bold text-brand-navy uppercase tracking-[0.14em]">One-Time &amp; Specialty Fees</h3>
                    <span className="text-[10px] text-slate-400">Billed at onboarding</span>
                  </div>
                  <div className="gold-hairline"></div>
                </div>

                {/* State Tax ID Application (Per Agency) Card */}
                <div className={`module-card rounded-2xl border bg-white ${
                  stateTaxId.enabled
                    ? 'module-card--selected border-brand-navy/40 shadow-md ring-2 ring-brand-navy/15'
                    : 'border-stone-200 shadow-sm'
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
                <div className={`module-card rounded-2xl border bg-white ${
                  pytd.enabled
                    ? 'module-card--selected border-brand-navy/40 shadow-md ring-2 ring-brand-navy/15'
                    : 'border-stone-200 shadow-sm'
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
                <div className={`module-card rounded-2xl border bg-white ${
                  benefitEdi.enabled
                    ? 'module-card--selected border-brand-navy/40 shadow-md ring-2 ring-brand-navy/15'
                    : 'border-stone-200 shadow-sm'
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
                            Recurring: {formatMoney(benefitEdiRecurring.baseRate)}/emp (Min {formatMoney(BENEFIT_EDI_MIN)})
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
              )}

              {/* Tab: Overrides — advanced fields for turnover / competitive quotes / S-Corp */}
              {!sCorpMode && activeTab === 'overrides' && (
              <div className="space-y-6">

                {/* Employee & Form Counts */}
                <div className="bg-white border border-stone-200 rounded-xl p-4">
                  <h3 className="text-[11px] font-bold text-brand-navy uppercase tracking-[0.14em] mb-1">Employee &amp; Form Counts</h3>
                  <p className="text-[11px] text-slate-400 mb-3">Override the default headcount used in billing.</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Approximate W-2s
                        <Tooltip>Use when the client's annual W-2 count exceeds current headcount — high-turnover shops, restaurants, seasonal. Feeds W-2, 1099, ACA, and 360° 401(k) fees.</Tooltip>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={w2Count}
                        onChange={(e) => setW2Count(e.target.value)}
                        placeholder={`Defaults to ${employeeCount}`}
                        className="w-full border border-stone-300 rounded-md px-2.5 py-2 text-sm bg-white focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="flex items-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Approximate 1099s
                        <Tooltip>1099 contractors add to per-payroll fees for Payroll, TLM, HCM, and Full Service. Combined with W-2s at year-end. Does not affect ACA or 401(k).</Tooltip>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={count1099}
                        onChange={(e) => setCount1099(e.target.value)}
                        placeholder="Defaults to 0"
                        className="w-full border border-stone-300 rounded-md px-2.5 py-2 text-sm bg-white focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy outline-none transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Year-End Rate & Form Count */}
                <div className="bg-white border border-stone-200 rounded-xl p-4">
                  <h3 className="text-[11px] font-bold text-brand-navy uppercase tracking-[0.14em] mb-1">Year-End Rate &amp; Forms</h3>
                  <p className="text-[11px] text-slate-400 mb-3">Adjust the W-2/1099 processing rate or total form count.</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        W-2/1099 Rate <span className="normal-case font-normal text-slate-400 ml-1">(per form)</span>
                        <Tooltip>Default {formatMoney(PRICING_CONFIG.payroll.yearEndPerItem)}/form. Lower it to discount the year-end W-2/1099 rate for a competitive quote.</Tooltip>
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-sm">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.05"
                          value={payrollYearEndRateOverride !== null ? payrollYearEndRateOverride : PRICING_CONFIG.payroll.yearEndPerItem}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setPayrollYearEndRateOverride(isNaN(val) ? null : val);
                          }}
                          className="flex-1 border border-stone-300 rounded-md px-2.5 py-2 text-sm bg-white focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy outline-none transition"
                        />
                        {payrollYearEndRateOverride !== null && (
                          <button
                            onClick={() => setPayrollYearEndRateOverride(null)}
                            className="text-[11px] text-brand-navy hover:text-brand-gold font-semibold"
                          >Reset</button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="flex items-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Annual W-2/1099 Forms
                        <Tooltip>Set when the client's total annual form count exceeds per-payroll headcount (heavy turnover). Applies to W-2, 1099, and ACA year-end fees.</Tooltip>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={annualFormsOverride}
                          onChange={(e) => setAnnualFormsOverride(e.target.value)}
                          placeholder="Blank = use W-2 + 1099"
                          className="flex-1 border border-stone-300 rounded-md px-2.5 py-2 text-sm bg-white focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy outline-none transition"
                        />
                        {annualFormsOverride !== '' && (
                          <button
                            onClick={() => setAnnualFormsOverride('')}
                            className="text-[11px] text-brand-navy hover:text-brand-gold font-semibold"
                          >Reset</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quote Type — S-Corp switch */}
                <div className="bg-white border border-stone-200 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-[11px] font-bold text-brand-navy uppercase tracking-[0.14em] flex items-center">
                        Quote Type
                        <Tooltip>Standard = multi-module quotes for most clients. S-Corp Owner-Only = flat-rate mode for solo-owner S-Corps that only need December payroll.</Tooltip>
                      </h3>
                      <p className="text-sm text-brand-navy font-semibold mt-1">
                        {sCorpMode ? 'S-Corp Owner-Only' : 'Standard'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={toggleSCorpMode}
                      className="text-xs font-semibold text-brand-goldDark hover:text-brand-gold transition-colors underline decoration-dotted underline-offset-2"
                    >
                      Switch to {sCorpMode ? 'Standard' : 'S-Corp Owner-Only'}
                    </button>
                  </div>
                </div>

              </div>
              )}

            </div>
          </div>
        </section>

        {quoteDocuments}

      </main>

      {/* Toast notifications */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
