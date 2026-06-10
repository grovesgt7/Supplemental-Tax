import { useState } from 'react';
import MoneyInput from '../components/MoneyInput';
import CountyRatePicker from '../components/CountyRatePicker';
import AddressAutocomplete from '../components/AddressAutocomplete';
import ReportButton from '../components/ReportButton';
import Callout from '../components/Callout';
import { useProperty } from '../context/PropertyContext';
import {
  analyzeAnnualBill,
  formatCurrency,
  formatISODate,
  formatPercent,
  parseDollars,
  HOMEOWNERS_EXEMPTION,
  COUNTY_RATES,
  type AnnualBillAnalysis,
} from '../lib/tax';
import type { ReportData } from '../lib/report';

export default function AnnualAnalyzer() {
  const { property, setProperty } = useProperty();
  const initialCounty = property.county in COUNTY_RATES ? property.county : '';

  const [assessedValue, setAssessedValue] = useState('');
  const [priorValue, setPriorValue] = useState('');
  const [county, setCounty] = useState(initialCounty);
  const [rate, setRate] = useState(
    initialCounty ? COUNTY_RATES[initialCounty].toFixed(2) : '1.10'
  );
  const [directCharges, setDirectCharges] = useState('');
  const [hasExemption, setHasExemption] = useState<'yes' | 'no' | 'unsure'>('unsure');
  const [changedHands, setChangedHands] = useState(false);
  const [address, setAddress] = useState(property.address);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnnualBillAnalysis | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAnalysis(null);

    const assessed = parseDollars(assessedValue);
    const prior = priorValue.trim() === '' ? undefined : parseDollars(priorValue);
    const direct = directCharges.trim() === '' ? 0 : parseDollars(directCharges);
    const taxRate = Number(rate);

    if (Number.isNaN(assessed) || assessed <= 0) return setError("Please enter this year's assessed value.");
    if (prior !== undefined && (Number.isNaN(prior) || prior < 0))
      return setError("Last year's assessed value doesn't look right — leave it blank if you don't know it.");
    if (Number.isNaN(direct) || direct < 0) return setError('Direct assessments should be a dollar amount (or blank).');
    if (Number.isNaN(taxRate) || taxRate <= 0 || taxRate > 5)
      return setError('Please enter a valid tax rate (for example, 1.10).');

    setAnalysis(
      analyzeAnnualBill({
        assessedValue: assessed,
        hasHomeownersExemption: hasExemption === 'yes',
        taxRate,
        directAssessments: direct,
        priorYearAssessedValue: prior,
        ownershipChangedThisYear: changedHands,
      })
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Annual tax bill analyzer</h1>
        <p className="text-gray-600 leading-relaxed">
          Copy a few numbers from your regular (secured) property tax bill and we'll break it down in plain English,
          sanity-check it against Prop 13, and flag savings you might be missing.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="card sm:p-8 space-y-6">
        <div>
          <label className="input-label">
            Your address <span className="font-normal text-gray-500">(optional)</span>
          </label>
          <AddressAutocomplete
            initialValue={property.address}
            initialCounty={property.county}
            onSelect={(matchedAddress, foundCounty) => {
              setAddress(matchedAddress);
              setProperty({ address: matchedAddress, county: foundCounty });
              if (foundCounty in COUNTY_RATES) {
                setCounty(foundCounty);
                setRate(COUNTY_RATES[foundCounty].toFixed(2));
              }
            }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MoneyInput
            id="assessed"
            label="Assessed value (this year)"
            value={assessedValue}
            onChange={setAssessedValue}
            placeholder="650,000"
            help='Labeled "total assessed value" or "net taxable value" on the bill — land plus improvements.'
            required
          />
          <MoneyInput
            id="prior"
            label="Assessed value last year (optional)"
            value={priorValue}
            onChange={setPriorValue}
            placeholder="637,000"
            help="Lets us check the Prop 13 rule: it shouldn't grow more than 2% per year."
          />
        </div>

        <CountyRatePicker county={county} onCountyChange={setCounty} rate={rate} onRateChange={setRate} />

        <MoneyInput
          id="direct"
          label="Direct assessments / special charges (optional)"
          value={directCharges}
          onChange={setDirectCharges}
          placeholder="420"
          help="Fixed charges listed on the bill: Mello-Roos (CFD), sewer, school parcel taxes, vector control, etc."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="input-label">Do you have the homeowner's exemption?</span>
            <div className="flex gap-2">
              {(['yes', 'no', 'unsure'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setHasExemption(opt)}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold capitalize transition ${
                    hasExemption === opt
                      ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-100'
                      : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {opt === 'unsure' ? 'Not sure' : opt}
                </button>
              ))}
            </div>
            <p className="input-help">
              Look for a {formatCurrency(HOMEOWNERS_EXEMPTION)} "homeowner's exemption" line on the bill.
            </p>
          </div>
          <div>
            <span className="input-label">Did you buy or remodel this past year?</span>
            <label className="flex items-center gap-3 rounded-xl border border-gray-300 px-4 py-3 cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={changedHands}
                onChange={(e) => setChangedHands(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-300"
              />
              <span className="text-sm text-gray-700">Yes — ownership changed or construction was completed</span>
            </label>
            <p className="input-help">Reassessment after a sale or remodel can legitimately exceed the 2% cap.</p>
          </div>
        </div>

        {error && (
          <Callout variant="danger">
            <p>{error}</p>
          </Callout>
        )}

        <button type="submit" className="btn-primary w-full sm:w-auto">
          Break down my bill
        </button>
      </form>

      {analysis && (
        <Results analysis={analysis} hasExemption={hasExemption} county={county} address={address} />
      )}
    </div>
  );
}

const SEGMENT_COLORS = ['bg-brand-600', 'bg-brand-400', 'bg-amber-400'];

function buildReport(
  analysis: AnnualBillAnalysis,
  hasExemption: 'yes' | 'no' | 'unsure',
  county: string,
  address: string
): ReportData {
  const sections: ReportData['sections'] = [
    {
      title: 'Your bill, decoded',
      highlights: [
        { label: 'Total per year', value: formatCurrency(analysis.totalTax) },
        { label: 'Per month', value: formatCurrency(analysis.monthlyCost) },
        { label: 'Effective rate', value: formatPercent(analysis.effectiveRate) },
      ],
      rows: [
        ['Base 1% tax (Prop 13)', formatCurrency(analysis.baseTax)],
        ['Voter-approved debt', formatCurrency(analysis.voterApprovedTax)],
        ['Direct assessments / special charges', formatCurrency(analysis.directAssessments)],
        ['County', county || '—'],
      ],
    },
    {
      title: 'Payment deadlines',
      rows: analysis.installments.map((inst) => [
        `${inst.label} — ${formatCurrency(inst.amount, 2)}`,
        inst.delinquentDate ? `Due ${inst.dueDate ? formatISODate(inst.dueDate) : ''}; late after ${formatISODate(inst.delinquentDate)}` : '',
      ]),
      paragraphs: ['Each late installment adds a 10% penalty.'],
    },
  ];

  if (analysis.prop13.checked) {
    sections.push({
      title: 'Prop 13 check',
      paragraphs: [
        analysis.prop13.exceedsCap
          ? `Your assessed value rose ${formatPercent((analysis.prop13.increasePct ?? 0) * 100, 1)} year-over-year, above the normal 2% cap. Unless the property changed hands, construction was completed, or a prior temporary (Prop 8) reduction is being restored, contact your county assessor and consider an assessment appeal before your county's deadline.`
          : `Your assessed value changed ${formatPercent((analysis.prop13.increasePct ?? 0) * 100, 1)} year-over-year, within the 2% annual Prop 13 limit. Nothing unusual.`,
      ],
    });
  }

  if (hasExemption !== 'yes') {
    sections.push({
      title: 'Possible savings',
      paragraphs: [
        `If this home is your primary residence, the free homeowner's exemption removes ${formatCurrency(HOMEOWNERS_EXEMPTION)} from your assessed value — worth about ${formatCurrency(analysis.exemptionSavings)} per year at your tax rate. File once with your county assessor (ignore mailers that charge a fee for this).`,
      ],
    });
  }

  return {
    title: 'Annual Tax Bill Analysis',
    subtitle: 'Your property tax bill in plain English',
    address: address || undefined,
    sections,
  };
}

function Results({
  analysis,
  hasExemption,
  county,
  address,
}: {
  analysis: AnnualBillAnalysis;
  hasExemption: 'yes' | 'no' | 'unsure';
  county: string;
  address: string;
}) {
  const segments = [
    { label: 'Base 1% tax (Prop 13)', amount: analysis.baseTax },
    { label: 'Voter-approved debt', amount: analysis.voterApprovedTax },
    { label: 'Direct assessments', amount: analysis.directAssessments },
  ].filter((s) => s.amount > 0);

  return (
    <section className="space-y-5">
      {/* Headline + breakdown bar */}
      <div className="card sm:p-8">
        <p className="text-sm font-semibold text-brand-700 uppercase tracking-wide mb-1">Your bill, decoded</p>
        <h2 className="text-2xl font-extrabold mb-1">
          {formatCurrency(analysis.totalTax)} per year{' '}
          <span className="text-base font-semibold text-gray-500">
            (≈ {formatCurrency(analysis.monthlyCost)} / month)
          </span>
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          That's an effective rate of {formatPercent(analysis.effectiveRate)} of your assessed value.
        </p>

        <div className="flex h-5 w-full overflow-hidden rounded-full bg-gray-100 mb-4">
          {segments.map((seg, i) => (
            <div
              key={seg.label}
              className={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
              style={{ width: `${(seg.amount / analysis.totalTax) * 100}%` }}
              title={`${seg.label}: ${formatCurrency(seg.amount)}`}
            />
          ))}
        </div>

        <dl className="space-y-2.5">
          {segments.map((seg, i) => (
            <div key={seg.label} className="flex items-center justify-between text-sm">
              <dt className="flex items-center gap-2 text-gray-600">
                <span className={`w-3 h-3 rounded-sm ${SEGMENT_COLORS[i % SEGMENT_COLORS.length]}`} />
                {seg.label}
              </dt>
              <dd className="font-semibold">{formatCurrency(seg.amount)}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-2.5">
            <dt className="font-bold text-gray-900">Total</dt>
            <dd className="font-bold">{formatCurrency(analysis.totalTax)}</dd>
          </div>
        </dl>
      </div>

      {/* Prop 13 check */}
      {analysis.prop13.checked &&
        (analysis.prop13.exceedsCap ? (
          <Callout variant="warning" title="Your assessed value grew faster than the Prop 13 cap.">
            <p>
              Your assessed value rose {formatPercent((analysis.prop13.increasePct ?? 0) * 100, 1)} since last year.
              Under Prop 13, it normally can't grow more than <strong>2% per year</strong> unless the property
              changed hands, you completed construction, or a prior temporary reduction (Prop 8) is being restored.
              If none of those apply, call your county assessor — and consider filing an assessment appeal before
              your county's deadline.
            </p>
          </Callout>
        ) : (
          <Callout variant="success" title="Your assessed value growth is within the Prop 13 limit.">
            <p>
              It changed {formatPercent((analysis.prop13.increasePct ?? 0) * 100, 1)} year-over-year, which is at or
              under the 2% annual cap. Nothing unusual here.
            </p>
          </Callout>
        ))}

      {/* Exemption nudge */}
      {hasExemption !== 'yes' && (
        <Callout variant="info" title={`Possible savings: ${formatCurrency(analysis.exemptionSavings)} per year`}>
          <p>
            {hasExemption === 'unsure'
              ? "We didn't include the homeowner's exemption. If you live in this home as your primary residence, check your bill for a "
              : 'If you live in this home as your primary residence, you qualify for the '}
            {formatCurrency(HOMEOWNERS_EXEMPTION)} homeowner's exemption — worth about{' '}
            {formatCurrency(analysis.exemptionSavings)} per year at your tax rate. Filing with your county assessor
            is free and one-time. (Ignore mailers that charge a fee for this.)
          </p>
        </Callout>
      )}

      {/* Installments */}
      <div className="card sm:p-8">
        <h3 className="text-lg font-bold mb-1">When it's due</h3>
        <p className="text-sm text-gray-500 mb-5">
          Annual bills are paid in two installments. Remember: <em>"No Darn Fooling Around"</em> — due{' '}
          <strong>N</strong>ovember 1, late after <strong>D</strong>ecember 10, due <strong>F</strong>ebruary 1, late
          after <strong>A</strong>pril 10.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {analysis.installments.map((inst) => (
            <div key={inst.label} className="rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{inst.label}</p>
              <p className="text-2xl font-extrabold mb-2">{formatCurrency(inst.amount, 2)}</p>
              <p className="text-sm text-gray-600">
                Due {inst.dueDate && formatISODate(inst.dueDate)} · late after{' '}
                <strong className="text-red-600">{inst.delinquentDate && formatISODate(inst.delinquentDate)}</strong>
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Each late installment adds a 10% penalty. Dates shown are for the current tax year.
        </p>
      </div>

      <ReportButton report={buildReport(analysis, hasExemption, county, address)} />
    </section>
  );
}
