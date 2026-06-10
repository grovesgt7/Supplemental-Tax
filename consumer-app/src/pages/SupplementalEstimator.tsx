import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import MoneyInput from '../components/MoneyInput';
import CountyRatePicker from '../components/CountyRatePicker';
import AddressLookup from '../components/AddressLookup';
import ReportButton from '../components/ReportButton';
import Callout from '../components/Callout';
import {
  estimateSupplementalTax,
  formatCurrency,
  formatISODate,
  parseDollars,
  parseISODate,
  type SupplementalEstimate,
} from '../lib/tax';
import type { ReportData } from '../lib/report';

interface InputSnapshot {
  eventDate: string;
  price: number;
  prior: number;
  county: string;
  taxRate: number;
  address: string;
}

export default function SupplementalEstimator() {
  const [eventDate, setEventDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [priorValue, setPriorValue] = useState('');
  const [county, setCounty] = useState('');
  const [rate, setRate] = useState('1.10');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SupplementalEstimate | null>(null);
  const [snapshot, setSnapshot] = useState<InputSnapshot | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const price = parseDollars(purchasePrice);
    const prior = parseDollars(priorValue);
    const taxRate = Number(rate);

    if (!eventDate) return setError('Please enter your closing date.');
    if (Number.isNaN(price) || price <= 0) return setError('Please enter a valid purchase price.');
    if (Number.isNaN(prior) || prior < 0)
      return setError("Please enter the seller's previous assessed value (it's okay to estimate).");
    if (Number.isNaN(taxRate) || taxRate <= 0 || taxRate > 5)
      return setError('Please enter a valid tax rate (for example, 1.10).');

    setSnapshot({ eventDate, price, prior, county, taxRate, address });
    setResult(
      estimateSupplementalTax({
        eventDate,
        priorAssessedValue: prior,
        newValue: price,
        taxRate,
      })
    );
  }

  const monthsUntilTypicalArrival = 4; // counties commonly take 3–6 months to mail
  const savingsPerMonth = useMemo(() => {
    if (!result || result.isRefund || result.totalAmount <= 0) return 0;
    return Math.ceil(result.totalAmount / monthsUntilTypicalArrival / 10) * 10;
  }, [result]);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Supplemental tax estimator</h1>
        <p className="text-gray-600 leading-relaxed">
          Answer four quick questions and we'll estimate the supplemental bill(s) you should expect, which fiscal
          years they cover, and how much to set aside.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="card sm:p-8 space-y-6">
        <AddressLookup
          onResolved={(foundCounty, matchedAddress) => {
            setCounty(foundCounty);
            setAddress(matchedAddress);
          }}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="eventDate" className="input-label">
              When did (or will) you close?
            </label>
            <input
              type="date"
              id="eventDate"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="input"
              required
            />
            <p className="input-help">The recording date of your purchase, or completion date for new construction.</p>
          </div>
          <MoneyInput
            id="purchasePrice"
            label="What did you pay for the home?"
            value={purchasePrice}
            onChange={setPurchasePrice}
            placeholder="850,000"
            help="The county will typically reassess at your purchase price."
            required
          />
        </div>

        <MoneyInput
          id="priorValue"
          label="Seller's previous assessed value"
          value={priorValue}
          onChange={setPriorValue}
          placeholder="425,000"
          help="Find this on the seller's last tax bill, your title/escrow papers, or your county assessor's website (search the property address). A rough estimate still gives a useful answer."
          required
        />

        <CountyRatePicker county={county} onCountyChange={setCounty} rate={rate} onRateChange={setRate} />

        {error && (
          <Callout variant="danger">
            <p>{error}</p>
          </Callout>
        )}

        <button type="submit" className="btn-primary w-full sm:w-auto">
          Show me what to expect
        </button>
      </form>

      {result && snapshot && (
        <Results result={result} snapshot={snapshot} savingsPerMonth={savingsPerMonth} />
      )}
    </div>
  );
}

function buildReport(
  result: SupplementalEstimate,
  snapshot: InputSnapshot,
  savingsPerMonth: number
): ReportData {
  const sections: ReportData['sections'] = [
    {
      title: 'Your details',
      rows: [
        ['Closing / event date', formatISODate(snapshot.eventDate)],
        ['Purchase price (new value)', formatCurrency(snapshot.price)],
        ["Seller's previous assessed value", formatCurrency(snapshot.prior)],
        ['County', snapshot.county || '—'],
        ['Tax rate used', `${snapshot.taxRate.toFixed(2)}%`],
      ],
    },
  ];

  if (result.isRefund) {
    sections.push({
      title: 'What to expect',
      paragraphs: [
        `You paid less than the previous assessed value, so the county should issue a negative supplemental assessment of ${formatCurrency(Math.abs(result.supplementalAssessment))}. Instead of a bill, expect a refund of roughly ${formatCurrency(result.totalAmount)}. Refunds are processed automatically but can take several months — contact your county tax collector if nothing arrives.`,
      ],
    });
  } else {
    sections.push({
      title: 'What to expect',
      highlights: [
        { label: 'Supplemental bills', value: String(result.bills.length) },
        { label: 'Estimated total', value: formatCurrency(result.totalAmount) },
        { label: 'Suggested set-aside', value: `${formatCurrency(savingsPerMonth)}/mo` },
      ],
      paragraphs: [
        `Your assessed value increases by ${formatCurrency(result.supplementalAssessment)}, effective ${formatISODate(result.effectiveDate)} (the first of the month after your purchase). Counties usually mail supplemental bills 3–6 months after closing.`,
      ],
    });

    for (const bill of result.bills) {
      sections.push({
        title:
          result.bills.length === 2
            ? `Bill ${bill.billNumber} of 2 — tax year ${bill.fiscalYear.label}`
            : `Supplemental bill — tax year ${bill.fiscalYear.label}`,
        rows: [
          ['Estimated amount', formatCurrency(bill.amount)],
          ['Full-year tax on the increase', formatCurrency(bill.fullYearTax)],
          ['Portion of year billed', `${bill.prorationMonths} of 12 months (${(bill.prorationFactor * 100).toFixed(0)}%)`],
          ['Paid in', '2 installments'],
        ],
      });
    }

    sections.push({
      title: 'Your action checklist',
      list: [
        `Set aside about ${formatCurrency(savingsPerMonth)}/month starting now so the bill is covered when it arrives.`,
        'Do not assume your mortgage escrow will pay supplemental bills — they are mailed to you and are your responsibility. Call your lender if you want them to handle it.',
        "File the free homeowner's exemption with your county assessor if this is your primary residence ($7,000 off your assessed value every year).",
        'When the bill arrives, verify the amounts and note the delinquent dates — a late installment adds a 10% penalty.',
      ],
    });
  }

  return {
    title: 'Supplemental Tax Estimate',
    subtitle: 'What to expect after your purchase',
    address: snapshot.address || undefined,
    sections,
  };
}

function Results({
  result,
  snapshot,
  savingsPerMonth,
}: {
  result: SupplementalEstimate;
  snapshot: InputSnapshot;
  savingsPerMonth: number;
}) {
  const report = buildReport(result, snapshot, savingsPerMonth);

  if (result.isRefund) {
    return (
      <section className="space-y-4">
        <Callout variant="success" title="Good news — you may be owed a refund, not a bill.">
          <p>
            You paid less than the previous assessed value, so the county should issue a <em>negative</em>{' '}
            supplemental assessment of {formatCurrency(Math.abs(result.supplementalAssessment))}. Instead of a bill,
            you'd receive a refund of roughly <strong>{formatCurrency(result.totalAmount)}</strong>. Refunds are
            processed automatically, but they can take several months — contact your county tax collector if nothing
            arrives.
          </p>
        </Callout>
        <ReportButton report={report} />
      </section>
    );
  }

  const billCount = result.bills.length;
  const eventMonth = parseISODate(result.effectiveDate).month; // month after event

  return (
    <section className="space-y-5">
      {/* Headline */}
      <div className="card sm:p-8 border-l-4 border-l-brand-600">
        <p className="text-sm font-semibold text-brand-700 uppercase tracking-wide mb-1">Your estimate</p>
        <h2 className="text-2xl font-extrabold mb-2">
          Expect {billCount === 1 ? 'one supplemental bill' : 'two supplemental bills'} totaling about{' '}
          <span className="text-brand-700">{formatCurrency(result.totalAmount)}</span>
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Your home's assessed value increases by {formatCurrency(result.supplementalAssessment)}, effective{' '}
          {formatISODate(result.effectiveDate)} (the first of the month after your purchase).{' '}
          {billCount === 2 ? (
            <>
              Because you bought between January and May, the county's roll for the upcoming tax year was already set
              using the old value — so you'll get a second bill correcting the full upcoming year too.
            </>
          ) : eventMonth === 7 ? (
            <>
              Because your purchase is effective July 1, one bill covers the entire upcoming tax year.
            </>
          ) : (
            <>One bill covers the rest of the current tax year; after that, your regular annual bill catches up.</>
          )}
        </p>
      </div>

      {/* Bill timeline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {result.bills.map((bill) => (
          <div key={bill.billNumber} className="card">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
                {bill.billNumber}
              </span>
              <div>
                <p className="font-bold text-sm">
                  {bill.billNumber === 1 && result.bills.length === 2
                    ? 'First supplemental bill'
                    : bill.billNumber === 2
                      ? 'Second supplemental bill'
                      : 'Supplemental bill'}
                </p>
                <p className="text-xs text-gray-500">Tax year {bill.fiscalYear.label} (Jul–Jun)</p>
              </div>
            </div>
            <p className="text-3xl font-extrabold mb-3">{formatCurrency(bill.amount)}</p>
            <dl className="text-sm space-y-1.5 text-gray-600">
              <div className="flex justify-between">
                <dt>Full-year tax on increase</dt>
                <dd className="font-medium text-gray-900">{formatCurrency(bill.fullYearTax)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Portion of year you're billed</dt>
                <dd className="font-medium text-gray-900">
                  {bill.prorationMonths} of 12 months ({(bill.prorationFactor * 100).toFixed(0)}%)
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Paid in</dt>
                <dd className="font-medium text-gray-900">2 installments</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      {/* What to do now */}
      <div className="card sm:p-8">
        <h3 className="text-lg font-bold mb-4">What to do now</h3>
        <ol className="space-y-4">
          <li className="flex gap-3.5">
            <StepDot n={1} />
            <div className="text-sm text-gray-600 leading-relaxed">
              <p className="font-semibold text-gray-900">Start setting money aside today</p>
              <p>
                Counties usually mail supplemental bills <strong>3–6 months after closing</strong>. Setting aside
                about <strong>{formatCurrency(savingsPerMonth)}/month</strong> for the next 4 months means the bill
                won't sting when it lands.
              </p>
            </div>
          </li>
          <li className="flex gap-3.5">
            <StepDot n={2} />
            <div className="text-sm text-gray-600 leading-relaxed">
              <p className="font-semibold text-gray-900">Don't assume your lender will pay it</p>
              <p>
                Even with an escrow/impound account, supplemental bills are normally mailed directly to you and are
                your responsibility. If you want your lender to pay it, call them — some will, but only if you ask.
              </p>
            </div>
          </li>
          <li className="flex gap-3.5">
            <StepDot n={3} />
            <div className="text-sm text-gray-600 leading-relaxed">
              <p className="font-semibold text-gray-900">File for the homeowner's exemption</p>
              <p>
                If this is your primary residence, file the (free) homeowner's exemption with your county assessor —
                it knocks $7,000 off your assessed value every year. Beware of mailers charging a fee to "file" it for
                you.
              </p>
            </div>
          </li>
          <li className="flex gap-3.5">
            <StepDot n={4} />
            <div className="text-sm text-gray-600 leading-relaxed">
              <p className="font-semibold text-gray-900">When the bill arrives, verify it</p>
              <p>
                Bring it back here and{' '}
                <Link to="/check-bill" className="btn-link">
                  check the bill
                </Link>{' '}
                — we'll confirm the math and show your exact payment deadlines.
              </p>
            </div>
          </li>
        </ol>
      </div>

      <Callout variant="warning" title="Heads up: this is on top of your regular tax bill.">
        <p>
          You'll still receive (and owe) the regular annual property tax bill. The supplemental bill only covers the
          difference between the old and new assessed values for the period shown.
        </p>
      </Callout>

      <ReportButton report={report} />
    </section>
  );
}

function StepDot({ n }: { n: number }) {
  return (
    <span className="w-7 h-7 mt-0.5 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
      {n}
    </span>
  );
}
