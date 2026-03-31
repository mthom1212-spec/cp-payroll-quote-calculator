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
    defaultSetup: 1500.00,
    hasYearEnd: false,
  },
  hcm: {
    id: 'hcm',
    name: 'HCM Core',
    description: 'Human capital management, employee records, onboarding',
    baseFee: 0.00,
    pepm: 2.70,
    minimum: 60.00,
    defaultSetup: 3500.00,
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
  quarterly:   { label: 'Quarterly',    periods: 4 },
  annual:      { label: 'Annually',     periods: 1 },
};

// Frequencies available in each mode
export const STANDARD_FREQUENCIES = ['weekly', 'biweekly', 'semimonthly', 'monthly'];
export const SCORP_FREQUENCIES = ['biweekly', 'monthly', 'quarterly', 'annual'];

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
      'Job Costing and/or Labor Distribution Allocations',
      'General Ledger Report (Generic/Custom)',
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
  perfMgmt: {
    name: 'Performance Management & Development',
    services: [
      'Custom performance reviews, ratings, and feedback forms',
      'Goal, competency, and core value libraries',
      'Peer and continuous feedback',
      'Focal, annual, and 30/60/90-day reviews',
      'Unlimited nine-box matrices, succession slates, and talent pools',
      'Gap analysis and scenario planning',
      'Flexible workflows and approvals',
      'Multiple manager reviews',
      'Real-time reporting and analytics',
    ],
  },
  scorp: {
    name: 'Owner-Only S-Corp Payroll',
    services: [
      'Dedicated Payroll Specialist with support via phone, email, or virtual meeting',
      'Web-based/Mobile Software Access',
      'Payroll Processing, Calculations for Earnings & Deductions',
      'Year-End Fringe Benefits Reporting',
      'Direct Deposit / ACH Management',
      'Tax Table Updates & Applied Jurisdiction Identification',
      'Federal & State Payroll Tax Collection & Remittance',
      'Automatic Email Notifications',
      'Quarterly State & Federal Payroll Tax Filing (first state included)',
    ],
  },
  ats: {
    name: 'Recruiting / Applicant Tracking System',
    services: [
      'Employer Branded Career site',
      'Centralized recruiting workspace for common activities',
      'Job requisition tool for building internal and external listings',
      'Connections to popular job boards like Indeed',
      'Flexible online application forms',
      'Pre-screening and knockout questions to filter applicants',
      'Quick apply options for high-volume or high-turnover roles',
      'Resume parsing',
      'Rehire options for returning employees',
      'Applicant tracking, notifications, and hiring team organization tools',
      'Built-in communication tools configurable to your brand',
      'Applicant Self-Service (i.e. tracking application completion, applying for multiple positions, and status updates on any device)',
      'Sentiment analysis options to understand interviewer feedback',
      'Recruiting Insights (i.e. common locations applied from, cost and time to hire metrics, top recruiting channels, and turnover rates)',
      'Applicant Two-way Text Messaging Capability (additional fees apply)',
      'Background screening and WOTC integrations (additional fees apply)',
    ],
  },
};

// Ancillary services — per-employee/per-payroll (calculable like core modules)
// Baseline pricing is Bi-Weekly (26 periods), adjusted for frequency.
export const ANCILLARY_PRICING = {
  perfMgmt: {
    id: 'perfMgmt',
    name: 'Performance Management & Development',
    baseFee: 0.00,
    pepm: 1.00,
    minimum: 0.00,
    defaultSetup: 2500.00,
    hasYearEnd: false,
  },
  ats: {
    id: 'ats',
    name: 'Recruiting / Applicant Tracking System (ATS)',
    baseFee: 0.00,
    pepm: 1.00,
    minimum: 0.00,
    defaultSetup: 2500.00,
    hasYearEnd: false,
  },
  cobra: {
    id: 'cobra',
    name: 'COBRA Administration',
    baseFee: 0.00,
    pepm: 0.50,
    minimum: 40.00,
    defaultSetup: 1195.00,
    hasYearEnd: false,
  },
  retirement: {
    id: 'retirement',
    name: '360\u00b0 Integration \u2013 401(k)',
    baseFee: 0.00,
    pepm: 0.75,
    minimum: 40.00,
    defaultSetup: 1500.00,
    hasYearEnd: false,
  },
  lms: {
    id: 'lms',
    name: 'Integrated LMS Portal',
    baseFee: 0.00,
    pepm: 2.00,
    minimum: 0.00,
    defaultSetup: 250.00,
    hasYearEnd: false,
  },
};

// Ancillary services — usage-based (informational only, not in totals)
export const ANCILLARY_USAGE = {
  atsJobPosting: {
    id: 'atsJobPosting',
    name: 'Recruiting Job Board Posting',
    rates: [
      '$10 per open job posting per month',
      '$16 one-time per job requisition posted for job board integration',
    ],
  },
  eVerify: {
    id: 'eVerify',
    name: 'E-Verify',
    rates: [
      '$3.50 per new hire',
      '$200 one-time setup fee',
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
