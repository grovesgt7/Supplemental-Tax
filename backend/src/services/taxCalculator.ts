export interface SupplementalTaxInput {
  eventDate: string; // ISO date string, e.g. "2024-09-15"
  oldAssessedValue: number;
  newAssessedValue: number;
  taxRate: number; // e.g., 1.25 for 1.25%
}

export interface FiscalYearBill {
  fiscalYearStart: string;
  fiscalYearEnd: string;
  prorationFactor: number;
  prorationMonths: number;
  annualTaxAmount: number;
  proratedTaxAmount: number;
}

export interface SupplementalTaxResult {
  supplementalValue: number;
  isIncrease: boolean;
  firstBill: FiscalYearBill;
  secondBill: FiscalYearBill | null;
  totalEstimatedTax: number;
}

export interface EscrowShortageResult {
  projectedBalance: number;
  totalTaxDue: number;
  shortageAmount: number;
  isShortage: boolean;
  monthlyAdjustment: number;
}

/**
 * Returns the CA fiscal year (July 1 - June 30) that contains the given date.
 * For example:
 *   - 2024-09-15 -> { start: "2024-07-01", end: "2025-06-30" }
 *   - 2025-03-10 -> { start: "2024-07-01", end: "2025-06-30" }
 */
export function getFiscalYear(date: Date): { start: string; end: string } {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12

  if (month >= 7) {
    // July-December: fiscal year starts this calendar year
    return {
      start: `${year}-07-01`,
      end: `${year + 1}-06-30`,
    };
  } else {
    // January-June: fiscal year started previous calendar year
    return {
      start: `${year - 1}-07-01`,
      end: `${year}-06-30`,
    };
  }
}

/**
 * Returns the next fiscal year after the one containing the given date.
 */
function getNextFiscalYear(date: Date): { start: string; end: string } {
  const currentFY = getFiscalYear(date);
  const startYear = parseInt(currentFY.start.substring(0, 4), 10);
  return {
    start: `${startYear + 1}-07-01`,
    end: `${startYear + 2}-06-30`,
  };
}

/**
 * Calculate the number of full months remaining in the fiscal year from the event month.
 *
 * CA fiscal year runs July (month 7) to June (month 6).
 * - Event in July (7): 12 months remaining
 * - Event in August (8): 11 months remaining
 * - ...
 * - Event in June (6): 1 month remaining
 *
 * Formula:
 *   if month >= 7: remaining = 19 - month
 *   if month <= 6: remaining = 7 - month
 */
function getProrationMonths(eventMonth: number): number {
  if (eventMonth >= 7) {
    return 19 - eventMonth;
  }
  return 7 - eventMonth;
}

/**
 * Calculate CA supplemental property tax.
 *
 * Rules:
 * - Supplemental value = new assessed value - old assessed value
 * - If positive: taxpayer owes additional tax
 * - If negative: taxpayer receives a refund
 * - First supplemental bill: prorated from event date to end of current fiscal year
 * - Second supplemental bill: covers the next full fiscal year at 100%
 */
export function calculateSupplementalTax(input: SupplementalTaxInput): SupplementalTaxResult {
  const eventDate = new Date(input.eventDate);
  const eventMonth = eventDate.getMonth() + 1; // 1-12

  const supplementalValue = input.newAssessedValue - input.oldAssessedValue;
  const isIncrease = supplementalValue > 0;

  const annualTaxOnSupplemental = Math.abs(supplementalValue) * (input.taxRate / 100);

  // First supplemental bill - prorated for current fiscal year
  const firstFY = getFiscalYear(eventDate);
  const prorationMonths = getProrationMonths(eventMonth);
  const prorationFactor = prorationMonths / 12;
  const firstProratedAmount = annualTaxOnSupplemental * prorationFactor;

  const firstBill: FiscalYearBill = {
    fiscalYearStart: firstFY.start,
    fiscalYearEnd: firstFY.end,
    prorationFactor: Math.round(prorationFactor * 10000) / 10000,
    prorationMonths,
    annualTaxAmount: Math.round(annualTaxOnSupplemental * 100) / 100,
    proratedTaxAmount: Math.round(firstProratedAmount * 100) / 100,
  };

  // Second supplemental bill - full next fiscal year
  const secondFY = getNextFiscalYear(eventDate);
  const secondBill: FiscalYearBill = {
    fiscalYearStart: secondFY.start,
    fiscalYearEnd: secondFY.end,
    prorationFactor: 1.0,
    prorationMonths: 12,
    annualTaxAmount: Math.round(annualTaxOnSupplemental * 100) / 100,
    proratedTaxAmount: Math.round(annualTaxOnSupplemental * 100) / 100,
  };

  const totalEstimatedTax = firstBill.proratedTaxAmount + secondBill.proratedTaxAmount;

  return {
    supplementalValue,
    isIncrease,
    firstBill,
    secondBill,
    totalEstimatedTax: Math.round(totalEstimatedTax * 100) / 100,
  };
}

/**
 * Calculate potential escrow shortage given a supplemental tax event.
 *
 * @param currentBalance - Current escrow account balance
 * @param annualTaxBudget - Budgeted annual property tax in escrow
 * @param monthlyEscrowAmount - Current monthly escrow payment
 * @param monthsRemaining - Months remaining in the escrow analysis period (usually 12)
 * @param expectedSupplementalTax - Total expected supplemental tax amount
 */
export function calculateEscrowShortage(
  currentBalance: number,
  annualTaxBudget: number,
  monthlyEscrowAmount: number,
  monthsRemaining: number,
  expectedSupplementalTax: number
): EscrowShortageResult {
  // Project balance forward with current monthly deposits
  const projectedDeposits = monthlyEscrowAmount * monthsRemaining;
  const projectedBalance = currentBalance + projectedDeposits;

  // Total tax due includes budgeted annual tax plus the supplemental tax
  const totalTaxDue = annualTaxBudget + expectedSupplementalTax;

  // Shortage is how much the projected balance falls short of total tax due
  const shortageAmount = Math.max(0, totalTaxDue - projectedBalance);
  const isShortage = shortageAmount > 0;

  // Monthly adjustment needed to cover the shortage over the remaining months
  const monthlyAdjustment = monthsRemaining > 0
    ? Math.round((shortageAmount / monthsRemaining) * 100) / 100
    : shortageAmount;

  return {
    projectedBalance: Math.round(projectedBalance * 100) / 100,
    totalTaxDue: Math.round(totalTaxDue * 100) / 100,
    shortageAmount: Math.round(shortageAmount * 100) / 100,
    isShortage,
    monthlyAdjustment,
  };
}

/**
 * Returns a typical base tax rate for common CA counties.
 * Note: Actual rates vary by tax rate area within counties. These are approximate base rates.
 * The CA base rate is 1% plus local voter-approved bonds/assessments.
 */
export function getDefaultTaxRate(county: string): number {
  const rates: Record<string, number> = {
    'los angeles': 1.16,
    'san francisco': 1.18,
    'san diego': 1.13,
    'orange': 1.09,
    'riverside': 1.17,
    'san bernardino': 1.16,
    'santa clara': 1.21,
    'alameda': 1.24,
    'sacramento': 1.18,
    'contra costa': 1.20,
    'fresno': 1.15,
    'san mateo': 1.11,
    'kern': 1.16,
    'ventura': 1.13,
    'san joaquin': 1.19,
    'stanislaus': 1.14,
    'sonoma': 1.17,
    'tulare': 1.14,
    'santa barbara': 1.12,
    'solano': 1.18,
    'monterey': 1.13,
    'placer': 1.11,
    'san luis obispo': 1.10,
    'santa cruz': 1.14,
    'marin': 1.14,
    'merced': 1.15,
    'butte': 1.11,
    'yolo': 1.17,
    'el dorado': 1.10,
    'imperial': 1.13,
    'shasta': 1.10,
    'madera': 1.13,
    'kings': 1.15,
    'napa': 1.16,
    'humboldt': 1.10,
    'nevada': 1.09,
    'sutter': 1.12,
    'mendocino': 1.10,
    'yuba': 1.14,
    'lake': 1.10,
    'tehama': 1.09,
  };

  const normalized = county.toLowerCase().trim();
  return rates[normalized] ?? 1.10; // Default to 1.10% if county not found
}
