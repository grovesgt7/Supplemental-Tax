/**
 * California property tax calculations for homeowners.
 *
 * Key rules implemented here (Revenue & Taxation Code §§ 75–75.80):
 *
 * - A supplemental assessment is triggered by a change of ownership or
 *   completed new construction, and takes effect on the FIRST DAY OF THE
 *   MONTH FOLLOWING the event.
 * - Events from June 1 – Dec 31 produce ONE supplemental bill.
 *   (A June event is effective July 1, so its single bill covers the
 *   entire upcoming fiscal year at a 1.00 factor.)
 * - Events from Jan 1 – May 31 produce TWO supplemental bills: the next
 *   fiscal year's regular roll was already set on the Jan 1 lien date
 *   using the OLD value, so a second supplemental bill corrects the full
 *   upcoming year.
 * - The CA fiscal year runs July 1 – June 30. Proration factor =
 *   (full months remaining in the fiscal year after the event) / 12.
 *
 * Official monthly proration factors this reproduces:
 *   Jul .9167  Aug .8333  Sep .7500  Oct .6667  Nov .5833  Dec .5000
 *   Jan .4167  Feb .3333  Mar .2500  Apr .1667  May .0833  Jun 1.0000
 */

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface FiscalYear {
  start: string; // ISO date, July 1
  end: string; // ISO date, June 30
  label: string; // e.g. "2025–2026"
}

export interface SupplementalBill {
  /** 1 = prorated current-year bill, 2 = full following-year bill */
  billNumber: 1 | 2;
  fiscalYear: FiscalYear;
  prorationFactor: number; // 0–1
  prorationMonths: number; // 0–12
  /** Tax on the supplemental assessment for a full year, before proration */
  fullYearTax: number;
  /** What this bill will actually ask for (always positive; see isRefund) */
  amount: number;
}

export interface SupplementalEstimate {
  /** newValue − priorValue. Negative means the county owes a refund. */
  supplementalAssessment: number;
  isRefund: boolean;
  effectiveDate: string; // first day of month after event
  bills: SupplementalBill[];
  totalAmount: number;
}

export interface Installment {
  label: string;
  amount: number;
  dueDate: string | null; // ISO date, null when it depends on mailing date
  delinquentDate: string | null;
}

// ---------------------------------------------------------------------------
// Date helpers (all date-only math; avoids timezone pitfalls of `new Date(str)`)
// ---------------------------------------------------------------------------

export function parseISODate(iso: string): { year: number; month: number; day: number } {
  const [y, m, d] = iso.split('-').map((s) => parseInt(s, 10));
  return { year: y, month: m, day: d };
}

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Fiscal year (Jul 1 – Jun 30) containing the given date. */
export function fiscalYearFor(year: number, month: number): FiscalYear {
  const startYear = month >= 7 ? year : year - 1;
  return {
    start: iso(startYear, 7, 1),
    end: iso(startYear + 1, 6, 30),
    label: `${startYear}–${startYear + 1}`,
  };
}

function nextFiscalYear(fy: FiscalYear): FiscalYear {
  const startYear = parseISODate(fy.start).year + 1;
  return {
    start: iso(startYear, 7, 1),
    end: iso(startYear + 1, 6, 30),
    label: `${startYear}–${startYear + 1}`,
  };
}

export function formatISODate(isoStr: string): string {
  const { year, month, day } = parseISODate(isoStr);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Supplemental tax estimate
// ---------------------------------------------------------------------------

export interface SupplementalInput {
  eventDate: string; // ISO date of closing / construction completion
  priorAssessedValue: number; // seller's assessed value on the old roll
  newValue: number; // purchase price or new assessed value
  taxRate: number; // total rate as a percent, e.g. 1.18
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function estimateSupplementalTax(input: SupplementalInput): SupplementalEstimate {
  const { year, month } = parseISODate(input.eventDate);

  const supplementalAssessment = input.newValue - input.priorAssessedValue;
  const isRefund = supplementalAssessment < 0;
  const fullYearTax = round2(Math.abs(supplementalAssessment) * (input.taxRate / 100));

  // Effective on the first day of the following month
  const effYear = month === 12 ? year + 1 : year;
  const effMonth = month === 12 ? 1 : month + 1;
  const effectiveDate = iso(effYear, effMonth, 1);

  const eventFY = fiscalYearFor(year, month);
  const bills: SupplementalBill[] = [];

  if (month === 6) {
    // Effective July 1: one bill covering the entire upcoming fiscal year.
    bills.push({
      billNumber: 1,
      fiscalYear: nextFiscalYear(eventFY),
      prorationFactor: 1,
      prorationMonths: 12,
      fullYearTax,
      amount: fullYearTax,
    });
  } else {
    // Months remaining in the event's fiscal year, counting from the
    // effective date (month after the event) through June.
    const monthsRemaining = month >= 7 ? 18 - month : 6 - month;
    const factor = monthsRemaining / 12;
    bills.push({
      billNumber: 1,
      fiscalYear: eventFY,
      prorationFactor: Math.round(factor * 10000) / 10000,
      prorationMonths: monthsRemaining,
      fullYearTax,
      amount: round2(fullYearTax * factor),
    });

    // Jan–May: the upcoming year's roll (set on the Jan 1 lien date) still
    // shows the old value, so a second, full-year supplemental bill issues.
    if (month <= 5) {
      bills.push({
        billNumber: 2,
        fiscalYear: nextFiscalYear(eventFY),
        prorationFactor: 1,
        prorationMonths: 12,
        fullYearTax,
        amount: fullYearTax,
      });
    }
  }

  return {
    supplementalAssessment,
    isRefund,
    effectiveDate,
    bills,
    totalAmount: round2(bills.reduce((sum, b) => sum + b.amount, 0)),
  };
}

// ---------------------------------------------------------------------------
// Supplemental bill due dates (depend on when the county MAILS the bill)
// ---------------------------------------------------------------------------

/**
 * R&T Code § 75.52:
 * - Mailed July–October: installments are delinquent Dec 10 and Apr 10
 *   (same schedule as the annual bill).
 * - Mailed November–June: 1st installment is delinquent on the last day of
 *   the month FOLLOWING the mailing month; 2nd installment is delinquent on
 *   the last day of the FOURTH month after the 1st delinquency date.
 */
export function supplementalDueDates(mailingDate: string, totalAmount: number): Installment[] {
  const { year, month } = parseISODate(mailingDate);
  const half = round2(totalAmount / 2);
  const secondHalf = round2(totalAmount - half);

  if (month >= 7 && month <= 10) {
    return [
      {
        label: '1st installment',
        amount: half,
        dueDate: iso(year, 11, 1),
        delinquentDate: iso(year, 12, 10),
      },
      {
        label: '2nd installment',
        amount: secondHalf,
        dueDate: iso(year + 1, 2, 1),
        delinquentDate: iso(year + 1, 4, 10),
      },
    ];
  }

  // First delinquency: last day of the month after mailing
  let d1Year = year;
  let d1Month = month + 1;
  if (d1Month > 12) {
    d1Month -= 12;
    d1Year += 1;
  }
  // Second delinquency: last day of the 4th month after the first
  let d2Year = d1Year;
  let d2Month = d1Month + 4;
  if (d2Month > 12) {
    d2Month -= 12;
    d2Year += 1;
  }

  return [
    {
      label: '1st installment',
      amount: half,
      dueDate: mailingDate,
      delinquentDate: iso(d1Year, d1Month, lastDayOfMonth(d1Year, d1Month)),
    },
    {
      label: '2nd installment',
      amount: secondHalf,
      dueDate: mailingDate,
      delinquentDate: iso(d2Year, d2Month, lastDayOfMonth(d2Year, d2Month)),
    },
  ];
}

// ---------------------------------------------------------------------------
// Annual (secured) tax bill analysis
// ---------------------------------------------------------------------------

export const HOMEOWNERS_EXEMPTION = 7000;
export const PROP13_CAP = 0.02;

export interface AnnualBillInput {
  assessedValue: number;
  hasHomeownersExemption: boolean;
  /** Total ad valorem rate as a percent, e.g. 1.18 (the 1% base + voter-approved debt) */
  taxRate: number;
  /** Fixed-dollar direct assessments / special charges (Mello-Roos, sewer, etc.) */
  directAssessments: number;
  /** Prior year assessed value, for the Prop 13 2% cap check (optional) */
  priorYearAssessedValue?: number;
  /** Whether the property changed hands / had new construction this year */
  ownershipChangedThisYear?: boolean;
}

export interface AnnualBillAnalysis {
  netTaxableValue: number;
  exemptionSavings: number; // what the homeowners exemption saves (or would save)
  baseTax: number; // the 1% Prop 13 levy
  voterApprovedTax: number; // (rate − 1%) portion
  directAssessments: number;
  totalTax: number;
  effectiveRate: number; // totalTax / assessedValue, as a percent
  monthlyCost: number;
  installments: Installment[];
  prop13: {
    checked: boolean;
    increasePct: number | null;
    exceedsCap: boolean;
  };
}

export function analyzeAnnualBill(input: AnnualBillInput): AnnualBillAnalysis {
  const exemption = input.hasHomeownersExemption ? HOMEOWNERS_EXEMPTION : 0;
  const netTaxableValue = Math.max(0, input.assessedValue - exemption);

  const baseTax = round2(netTaxableValue * 0.01);
  const extraRate = Math.max(0, input.taxRate - 1) / 100;
  const voterApprovedTax = round2(netTaxableValue * extraRate);
  const totalTax = round2(baseTax + voterApprovedTax + input.directAssessments);

  // What the $7,000 exemption is worth at this property's rate
  const exemptionSavings = round2(HOMEOWNERS_EXEMPTION * (input.taxRate / 100));

  const half = round2(totalTax / 2);
  const secondHalf = round2(totalTax - half);
  // Annual secured bills follow the fiscal year that starts in July of the
  // current calendar year if we're past July, otherwise the one in progress.
  const now = new Date();
  const fy = fiscalYearFor(now.getFullYear(), now.getMonth() + 1);
  const fyStartYear = parseISODate(fy.start).year;

  const installments: Installment[] = [
    {
      label: '1st installment',
      amount: half,
      dueDate: iso(fyStartYear, 11, 1),
      delinquentDate: iso(fyStartYear, 12, 10),
    },
    {
      label: '2nd installment',
      amount: secondHalf,
      dueDate: iso(fyStartYear + 1, 2, 1),
      delinquentDate: iso(fyStartYear + 1, 4, 10),
    },
  ];

  let increasePct: number | null = null;
  let exceedsCap = false;
  const checked = input.priorYearAssessedValue != null && input.priorYearAssessedValue > 0;
  if (checked) {
    increasePct = (input.assessedValue - input.priorYearAssessedValue!) / input.priorYearAssessedValue!;
    exceedsCap = !input.ownershipChangedThisYear && increasePct > PROP13_CAP + 1e-9;
  }

  return {
    netTaxableValue,
    exemptionSavings,
    baseTax,
    voterApprovedTax,
    directAssessments: round2(input.directAssessments),
    totalTax,
    effectiveRate: input.assessedValue > 0 ? (totalTax / input.assessedValue) * 100 : 0,
    monthlyCost: round2(totalTax / 12),
    installments,
    prop13: { checked, increasePct, exceedsCap },
  };
}

// ---------------------------------------------------------------------------
// Bill verification (compare a received supplemental bill to the estimate)
// ---------------------------------------------------------------------------

export interface BillCheckResult {
  expectedAmount: number;
  billedAmount: number;
  difference: number; // billed − expected
  differencePct: number;
  verdict: 'match' | 'close' | 'mismatch';
}

export function checkBillAmount(expectedAmount: number, billedAmount: number): BillCheckResult {
  const difference = round2(billedAmount - expectedAmount);
  const differencePct = expectedAmount > 0 ? Math.abs(difference) / expectedAmount : 0;
  let verdict: BillCheckResult['verdict'] = 'mismatch';
  if (Math.abs(difference) <= 1) verdict = 'match';
  else if (differencePct <= 0.05) verdict = 'close';
  return { expectedAmount, billedAmount, difference, differencePct, verdict };
}

// ---------------------------------------------------------------------------
// County tax rates (typical total rates; actual rates vary by tax rate area)
// ---------------------------------------------------------------------------

export const COUNTY_RATES: Record<string, number> = {
  Alameda: 1.24,
  Butte: 1.11,
  'Contra Costa': 1.2,
  'El Dorado': 1.1,
  Fresno: 1.15,
  Humboldt: 1.1,
  Imperial: 1.13,
  Kern: 1.16,
  Kings: 1.15,
  Lake: 1.1,
  'Los Angeles': 1.16,
  Madera: 1.13,
  Marin: 1.14,
  Mendocino: 1.1,
  Merced: 1.15,
  Monterey: 1.13,
  Napa: 1.16,
  Nevada: 1.09,
  Orange: 1.09,
  Placer: 1.11,
  Riverside: 1.17,
  Sacramento: 1.18,
  'San Bernardino': 1.16,
  'San Diego': 1.13,
  'San Francisco': 1.18,
  'San Joaquin': 1.19,
  'San Luis Obispo': 1.1,
  'San Mateo': 1.11,
  'Santa Barbara': 1.12,
  'Santa Clara': 1.21,
  'Santa Cruz': 1.14,
  Shasta: 1.1,
  Solano: 1.18,
  Sonoma: 1.17,
  Stanislaus: 1.14,
  Sutter: 1.12,
  Tehama: 1.09,
  Tulare: 1.14,
  Ventura: 1.13,
  Yolo: 1.17,
  Yuba: 1.14,
};

export const DEFAULT_TAX_RATE = 1.1;

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function formatCurrency(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits === 0 ? 0 : fractionDigits,
  }).format(value);
}

export function formatPercent(value: number, fractionDigits = 2): string {
  return `${value.toFixed(fractionDigits)}%`;
}

/** Parse a user-typed dollar amount: strips $, commas, spaces. NaN if invalid. */
export function parseDollars(raw: string): number {
  const cleaned = raw.replace(/[$,\s]/g, '');
  if (cleaned === '') return NaN;
  return Number(cleaned);
}
