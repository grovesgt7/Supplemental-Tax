import { describe, it, expect } from 'vitest';
import {
  estimateSupplementalTax,
  supplementalDueDates,
  analyzeAnnualBill,
  checkBillAmount,
  fiscalYearFor,
  parseDollars,
} from './tax';

describe('fiscalYearFor', () => {
  it('puts September in the FY starting that July', () => {
    expect(fiscalYearFor(2025, 9)).toMatchObject({ start: '2025-07-01', end: '2026-06-30' });
  });
  it('puts March in the FY that started the prior July', () => {
    expect(fiscalYearFor(2026, 3)).toMatchObject({ start: '2025-07-01', end: '2026-06-30' });
  });
});

describe('estimateSupplementalTax', () => {
  const base = { priorAssessedValue: 400_000, newValue: 800_000, taxRate: 1.2 };
  // supplemental assessment = 400,000; full-year tax = 4,800

  it('September event: one bill, 9/12 factor (official .7500)', () => {
    const r = estimateSupplementalTax({ ...base, eventDate: '2025-09-15' });
    expect(r.supplementalAssessment).toBe(400_000);
    expect(r.effectiveDate).toBe('2025-10-01');
    expect(r.bills).toHaveLength(1);
    expect(r.bills[0].prorationMonths).toBe(9);
    expect(r.bills[0].prorationFactor).toBe(0.75);
    expect(r.bills[0].amount).toBe(3600);
    expect(r.bills[0].fiscalYear.start).toBe('2025-07-01');
    expect(r.totalAmount).toBe(3600);
  });

  it('July event uses the official .9167 factor', () => {
    const r = estimateSupplementalTax({ ...base, eventDate: '2025-07-10' });
    expect(r.bills).toHaveLength(1);
    expect(r.bills[0].prorationMonths).toBe(11);
    expect(r.bills[0].prorationFactor).toBe(0.9167);
  });

  it('December event: one bill at .50, effective Jan 1 of next year', () => {
    const r = estimateSupplementalTax({ ...base, eventDate: '2025-12-20' });
    expect(r.effectiveDate).toBe('2026-01-01');
    expect(r.bills).toHaveLength(1);
    expect(r.bills[0].prorationFactor).toBe(0.5);
    expect(r.bills[0].amount).toBe(2400);
  });

  it('February event: TWO bills (Jan–May rule)', () => {
    const r = estimateSupplementalTax({ ...base, eventDate: '2026-02-10' });
    expect(r.bills).toHaveLength(2);
    expect(r.bills[0].prorationMonths).toBe(4);
    expect(r.bills[0].prorationFactor).toBe(0.3333);
    expect(r.bills[0].amount).toBe(1600);
    expect(r.bills[0].fiscalYear.start).toBe('2025-07-01');
    expect(r.bills[1].prorationFactor).toBe(1);
    expect(r.bills[1].amount).toBe(4800);
    expect(r.bills[1].fiscalYear.start).toBe('2026-07-01');
    expect(r.totalAmount).toBe(6400);
  });

  it('June event: single full-year bill against the NEXT fiscal year', () => {
    const r = estimateSupplementalTax({ ...base, eventDate: '2026-06-15' });
    expect(r.effectiveDate).toBe('2026-07-01');
    expect(r.bills).toHaveLength(1);
    expect(r.bills[0].prorationFactor).toBe(1);
    expect(r.bills[0].amount).toBe(4800);
    expect(r.bills[0].fiscalYear.start).toBe('2026-07-01');
  });

  it('flags a refund when the new value is lower', () => {
    const r = estimateSupplementalTax({
      eventDate: '2025-09-15',
      priorAssessedValue: 800_000,
      newValue: 700_000,
      taxRate: 1.0,
    });
    expect(r.isRefund).toBe(true);
    expect(r.supplementalAssessment).toBe(-100_000);
    expect(r.bills[0].amount).toBe(750); // |−100k| × 1% × 9/12
  });
});

describe('supplementalDueDates', () => {
  it('mailed in August follows the annual schedule (Dec 10 / Apr 10)', () => {
    const [first, second] = supplementalDueDates('2025-08-15', 1000);
    expect(first.delinquentDate).toBe('2025-12-10');
    expect(second.delinquentDate).toBe('2026-04-10');
    expect(first.amount + second.amount).toBe(1000);
  });

  it('mailed in November: delinquent Dec 31 and Apr 30', () => {
    const [first, second] = supplementalDueDates('2025-11-05', 2500);
    expect(first.delinquentDate).toBe('2025-12-31');
    expect(second.delinquentDate).toBe('2026-04-30');
  });

  it('mailed in January: delinquent last day of Feb (leap-aware) and Jun 30', () => {
    const [first, second] = supplementalDueDates('2028-01-15', 2000);
    expect(first.delinquentDate).toBe('2028-02-29');
    expect(second.delinquentDate).toBe('2028-06-30');
  });

  it('mailed in December: rolls into the next year correctly', () => {
    const [first, second] = supplementalDueDates('2025-12-10', 2000);
    expect(first.delinquentDate).toBe('2026-01-31');
    expect(second.delinquentDate).toBe('2026-05-31');
  });
});

describe('analyzeAnnualBill', () => {
  it('breaks the bill into base 1%, voter-approved, and direct charges', () => {
    const r = analyzeAnnualBill({
      assessedValue: 707_000,
      hasHomeownersExemption: true,
      taxRate: 1.2,
      directAssessments: 350,
    });
    expect(r.netTaxableValue).toBe(700_000);
    expect(r.baseTax).toBe(7000);
    expect(r.voterApprovedTax).toBe(1400);
    expect(r.totalTax).toBe(8750);
    expect(r.installments[0].amount + r.installments[1].amount).toBe(8750);
  });

  it('flags assessed-value growth above the Prop 13 2% cap', () => {
    const r = analyzeAnnualBill({
      assessedValue: 530_000,
      hasHomeownersExemption: false,
      taxRate: 1.1,
      directAssessments: 0,
      priorYearAssessedValue: 500_000,
    });
    expect(r.prop13.checked).toBe(true);
    expect(r.prop13.exceedsCap).toBe(true);
  });

  it('does not flag growth at or below 2%, or after an ownership change', () => {
    const ok = analyzeAnnualBill({
      assessedValue: 510_000,
      hasHomeownersExemption: false,
      taxRate: 1.1,
      directAssessments: 0,
      priorYearAssessedValue: 500_000,
    });
    expect(ok.prop13.exceedsCap).toBe(false);

    const sold = analyzeAnnualBill({
      assessedValue: 900_000,
      hasHomeownersExemption: false,
      taxRate: 1.1,
      directAssessments: 0,
      priorYearAssessedValue: 500_000,
      ownershipChangedThisYear: true,
    });
    expect(sold.prop13.exceedsCap).toBe(false);
  });
});

describe('checkBillAmount', () => {
  it('classifies match / close / mismatch', () => {
    expect(checkBillAmount(1000, 1000.5).verdict).toBe('match');
    expect(checkBillAmount(1000, 1030).verdict).toBe('close');
    expect(checkBillAmount(1000, 1300).verdict).toBe('mismatch');
  });
});

describe('parseDollars', () => {
  it('handles $, commas and whitespace', () => {
    expect(parseDollars('$750,000')).toBe(750_000);
    expect(parseDollars(' 1,234.56 ')).toBe(1234.56);
    expect(Number.isNaN(parseDollars('abc'))).toBe(true);
    expect(Number.isNaN(parseDollars(''))).toBe(true);
  });
});
