// All baseline pricing is for Bi-Weekly (26 periods).
// Rates are adjusted mathematically for other frequencies.
export const PRICING_CONFIG = {
  payroll: {
    id: 'payroll',
    name: 'Payroll Processing',
    description: 'Core payroll calculation, direct deposit, tax filing & compliance',
    baseFee: 48.00,
    pepm: 2.70,
    minimum: 75.00,
    defaultSetup: 1000.00,
    hasYearEnd: true,
    yearEndName: 'Annual W-2 Processing (billed in Jan)',
    yearEndBase: 150.00,
    yearEndPerItem: 6.95,
  },
  tlm: {
    id: 'tlm',
    name: 'TLM (Timekeeping)',
    description: 'Time & labor management, scheduling, attendance tracking',
    baseFee: 0.00,
    pepm: 2.70,
    minimum: 50.00,
    defaultSetup: 250.00,
    hasYearEnd: false,
  },
  hcm: {
    id: 'hcm',
    name: 'HCM Core',
    description: 'Human capital management, employee records, onboarding',
    baseFee: 0.00,
    pepm: 2.70,
    minimum: 60.00,
    defaultSetup: 500.00,
    hasYearEnd: false,
  },
  aca: {
    id: 'aca',
    name: 'ACA Reporting',
    description: 'Affordable Care Act compliance & reporting',
    baseFee: 0.00,
    pepm: 0.60,
    minimum: 0.00,
    defaultSetup: 0.00,
    hasYearEnd: true,
    yearEndName: 'Annual 1094-C/1095-C Processing (billed in Mar)',
    yearEndBase: 150.00,
    yearEndPerItem: 6.95,
  },
  fullService: {
    id: 'fullService',
    name: 'Full Service Add-on',
    description: 'Dedicated payroll specialist, full-service processing',
    baseFee: 0.00,
    pepm: 4.50,
    minimum: 50.00,
    defaultSetup: 0.00,
    isAddon: true,
    hasYearEnd: false,
  },
};

export const FREQUENCIES = {
  weekly:      { label: 'Weekly',       periods: 52 },
  biweekly:    { label: 'Bi-Weekly',    periods: 26 },
  semimonthly: { label: 'Semi-Monthly', periods: 24 },
  monthly:     { label: 'Monthly',      periods: 12 },
};

export const formatMoney = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

export const formatDate = (dateString) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
};
