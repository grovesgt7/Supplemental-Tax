import { useState } from 'react';
import MoneyInput from '../components/MoneyInput';
import Callout from '../components/Callout';
import {
  estimateSupplementalTax,
  supplementalDueDates,
  checkBillAmount,
  formatCurrency,
  formatISODate,
  parseDollars,
  type Installment,
  type BillCheckResult,
} from '../lib/tax';

interface CheckOutcome {
  check: BillCheckResult;
  installments: Installment[];
  billedAmount: number;
}

export default function BillChecker() {
  const [eventDate, setEventDate] = useState('');
  const [mailDate, setMailDate] = useState('');
  const [priorValue, setPriorValue] = useState('');
  const [newValue, setNewValue] = useState('');
  const [rate, setRate] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [whichBill, setWhichBill] = useState<'1' | '2'>('1');
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<CheckOutcome | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOutcome(null);

    const prior = parseDollars(priorValue);
    const next = parseDollars(newValue);
    const taxRate = Number(rate);
    const billed = parseDollars(billAmount);

    if (!eventDate) return setError('Please enter the event date shown on the bill.');
    if (!mailDate) return setError('Please enter the date the bill was mailed (printed on the bill).');
    if (Number.isNaN(prior) || prior < 0) return setError('Please enter the prior assessed value from the bill.');
    if (Number.isNaN(next) || next <= 0) return setError('Please enter the new assessed value from the bill.');
    if (Number.isNaN(taxRate) || taxRate <= 0 || taxRate > 5)
      return setError('Please enter the tax rate printed on the bill (for example, 1.18).');
    if (Number.isNaN(billed) || billed <= 0) return setError('Please enter the total amount on the bill.');

    const estimate = estimateSupplementalTax({
      eventDate,
      priorAssessedValue: prior,
      newValue: next,
      taxRate,
    });

    const billIndex = whichBill === '2' && estimate.bills.length > 1 ? 1 : 0;
    const expected = estimate.bills[billIndex].amount;

    setOutcome({
      check: checkBillAmount(expected, billed),
      installments: supplementalDueDates(mailDate, billed),
      billedAmount: billed,
    });
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Check a supplemental bill</h1>
        <p className="text-gray-600 leading-relaxed">
          Grab the bill you received and copy a few numbers from it. We'll verify the county's math and show you
          exactly when each installment is due — and what it costs to be late.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="card sm:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="eventDate" className="input-label">
              Event / ownership change date
            </label>
            <input
              type="date"
              id="eventDate"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="input"
              required
            />
            <p className="input-help">Often labeled "date of event" or "date of transfer" on the bill.</p>
          </div>
          <div>
            <label htmlFor="mailDate" className="input-label">
              Bill mailing date
            </label>
            <input
              type="date"
              id="mailDate"
              value={mailDate}
              onChange={(e) => setMailDate(e.target.value)}
              className="input"
              required
            />
            <p className="input-help">Your payment deadlines depend on this date.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MoneyInput
            id="priorValue"
            label="Prior assessed value"
            value={priorValue}
            onChange={setPriorValue}
            placeholder="425,000"
            required
          />
          <MoneyInput
            id="newValue"
            label="New assessed value"
            value={newValue}
            onChange={setNewValue}
            placeholder="850,000"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="rate" className="input-label">
              Tax rate on the bill (%)
            </label>
            <input
              type="text"
              inputMode="decimal"
              id="rate"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="input"
              placeholder="1.18"
              required
            />
          </div>
          <MoneyInput
            id="billAmount"
            label="Total amount on the bill"
            value={billAmount}
            onChange={setBillAmount}
            placeholder="3,200"
            required
          />
        </div>

        <div>
          <span className="input-label">Which supplemental bill is this?</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <RadioCard
              checked={whichBill === '1'}
              onChange={() => setWhichBill('1')}
              title="First (or only) bill"
              subtitle="Covers the rest of the tax year you bought in"
            />
            <RadioCard
              checked={whichBill === '2'}
              onChange={() => setWhichBill('2')}
              title="Second bill"
              subtitle="Full following tax year (only if you bought Jan–May)"
            />
          </div>
        </div>

        {error && (
          <Callout variant="danger">
            <p>{error}</p>
          </Callout>
        )}

        <button type="submit" className="btn-primary w-full sm:w-auto">
          Verify my bill
        </button>
      </form>

      {outcome && <Outcome outcome={outcome} />}
    </div>
  );
}

function RadioCard({
  checked,
  onChange,
  title,
  subtitle,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <label
      className={`rounded-xl border px-4 py-3 cursor-pointer transition ${
        checked ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100' : 'border-gray-300 bg-white hover:bg-gray-50'
      }`}
    >
      <input type="radio" checked={checked} onChange={onChange} className="sr-only" />
      <span className="block text-sm font-semibold">{title}</span>
      <span className="block text-xs text-gray-500 mt-0.5">{subtitle}</span>
    </label>
  );
}

function Outcome({ outcome }: { outcome: CheckOutcome }) {
  const { check, installments } = outcome;

  return (
    <section className="space-y-5">
      {check.verdict === 'match' && (
        <Callout variant="success" title="The math checks out.">
          <p>
            Based on the values you entered, we'd expect this bill to be about{' '}
            <strong>{formatCurrency(check.expectedAmount)}</strong> — and your bill says{' '}
            <strong>{formatCurrency(check.billedAmount)}</strong>. That's a match.
          </p>
        </Callout>
      )}
      {check.verdict === 'close' && (
        <Callout variant="info" title="Close enough — small differences are normal.">
          <p>
            We estimated <strong>{formatCurrency(check.expectedAmount)}</strong> and your bill says{' '}
            <strong>{formatCurrency(check.billedAmount)}</strong> (a difference of{' '}
            {formatCurrency(Math.abs(check.difference))}). Counties often add small fixed charges or use a slightly
            different rate for your specific tax rate area, so a gap under ~5% is usually nothing to worry about.
          </p>
        </Callout>
      )}
      {check.verdict === 'mismatch' && (
        <Callout variant="warning" title="This bill differs noticeably from what we'd expect.">
          <p className="mb-2">
            We estimated <strong>{formatCurrency(check.expectedAmount)}</strong>, but your bill says{' '}
            <strong>{formatCurrency(check.billedAmount)}</strong> — a difference of{' '}
            {formatCurrency(Math.abs(check.difference))} ({(check.differencePct * 100).toFixed(0)}%).
          </p>
          <p>
            Double-check the values you copied from the bill. If they're right, call your county assessor's office and
            ask them to walk through the calculation. If you believe the assessed value itself is too high, you can
            file an assessment appeal — there's a deadline, so don't sit on it.
          </p>
        </Callout>
      )}

      <div className="card sm:p-8">
        <h3 className="text-lg font-bold mb-1">Your payment deadlines</h3>
        <p className="text-sm text-gray-500 mb-5">
          Based on the mailing date you entered. Pay <em>on or before</em> the delinquent date to avoid penalties.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {installments.map((inst) => (
            <div key={inst.label} className="rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{inst.label}</p>
              <p className="text-2xl font-extrabold mb-2">{formatCurrency(inst.amount, 2)}</p>
              {inst.delinquentDate && (
                <p className="text-sm text-gray-600">
                  Late after <strong className="text-red-600">{formatISODate(inst.delinquentDate)}</strong>
                </p>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-4 leading-relaxed">
          Late payments incur a <strong>10% penalty</strong> on that installment (plus a small fee on the second).
          If a delinquent date falls on a weekend or holiday, you have until the next business day. You can pay both
          installments at once — many homeowners do, to avoid forgetting the second one.
        </p>
      </div>
    </section>
  );
}
