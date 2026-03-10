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

// Services included with each module (for client-facing quotes)
export const MODULE_SERVICES = {
  payroll: {
    name: 'Payroll Processing',
    services: [
      'Dedicated Payroll Specialist with support via phone, email or virtual meeting',
      'Web-based/Mobile Software Access',
      'Direct Deposit / ACH Management',
      'Payroll Processing, Calculations for Earnings & Deductions',
      'Federal & State Payroll Tax Collection & Remittance',
      'Federal & State Payroll Tax Quarterly Filings (First state included, additional jurisdictions $10/ea per payroll)',
      'Employee Self-Service (i.e. Access to pay statements, W2s, update withholding status)',
      'Employee Documentation & Communication',
      'Labor Law E-Update Poster Service (First location county & city notices)',
      'Tax Tables Updates & Applied Jurisdiction Identification',
      'Time Off Accrual Tracking',
      'Automatic Email Notifications',
      'Reports Module (Real-time reporting, customizable)',
      'Email Report Generator',
      'Personalized Dashboard with targeted tools',
    ],
  },
  hcm: {
    name: 'HCM Core',
    services: [
      'Paperless New Hire Onboarding',
      'Employee Acknowledgements / Agreements',
      'Custom Forms & Workflows',
      'Degree Types, Credentials & Skills (i.e. Driver\'s License, Passport)',
      'Checklists for Task Assignment',
      'Training Tracking including Courses & Certification Management',
      'Assigned Asset & Vehicle Tracking',
      'HR Actions',
      'Employee Documentation & Communication',
      'Position & Job Management with Job Change Reason Codes',
      'Benefits Administration (i.e. Online Self Enrollment, Life Change Events)',
      'Compliance Support via Action Lists (i.e. Pay Change Reasons, Termination Reasons, etc)',
      'Employee Directory / Organization Chart',
      'Incident Tracking for Customized Events (i.e. Corrective actions, customer feedback, etc)',
      'Pay Grades',
      'Workers\' Claims',
      'Paperless Employee Offboarding',
    ],
  },
  tlm: {
    name: 'Timekeeping',
    services: [
      'Attestation Module (i.e. Points, Attendance, etc.)',
      'Job Costing & Labor Distribution',
      'Employee Timecard Self-Service',
      'Manager Timecard Self-Service',
      'Basic Scheduling',
      'Online Time Off Requests & Approvals',
      'Custom Workflows (i.e. Time Off Requests, Timesheet Approvals, Timesheet Change Requests, Standard Overtime Requests, etc.)',
      'Sick/Vacation Time Off Accrual Tracking',
      'Auto-Populated Holidays',
      'Custom Analytics',
    ],
  },
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
