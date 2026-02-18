import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SupplementalTaxResult } from '../types';
import { calculateSupplementalTax } from '../api/client';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

const countyTaxRates: Record<string, number> = {
  '': 1.1,
  'Los Angeles': 1.16,
  'San Francisco': 1.18,
  'San Diego': 1.08,
  'Orange': 1.09,
  'Santa Clara': 1.24,
  'Alameda': 1.22,
  'Riverside': 1.12,
  'San Bernardino': 1.13,
  'Sacramento': 1.1,
  'Contra Costa': 1.2,
  'Fresno': 1.14,
  'San Mateo': 1.11,
  'Kern': 1.16,
  'Ventura': 1.08,
  'Santa Barbara': 1.07,
  'Marin': 1.09,
  'Sonoma': 1.15,
  'San Joaquin': 1.18,
  'Stanislaus': 1.12,
  'Monterey': 1.06,
};

export default function BillCalculator() {
  const navigate = useNavigate();

  const [county, setCounty] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState<'change_of_ownership' | 'new_construction'>('change_of_ownership');
  const [oldAssessedValue, setOldAssessedValue] = useState('');
  const [newAssessedValue, setNewAssessedValue] = useState('');
  const [taxRate, setTaxRate] = useState('1.10');

  const [result, setResult] = useState<SupplementalTaxResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleCountyChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setCounty(val);
    const rate = countyTaxRates[val];
    if (rate !== undefined) {
      setTaxRate(rate.toFixed(2));
    }
  }

  async function handleCalculate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const oldVal = parseFloat(oldAssessedValue.replace(/,/g, ''));
    const newVal = parseFloat(newAssessedValue.replace(/,/g, ''));
    const rate = parseFloat(taxRate);

    if (!eventDate) {
      setError('Please enter an event date.');
      return;
    }
    if (isNaN(oldVal) || oldVal < 0) {
      setError('Please enter a valid old assessed value.');
      return;
    }
    if (isNaN(newVal) || newVal < 0) {
      setError('Please enter a valid new assessed value.');
      return;
    }
    if (isNaN(rate) || rate <= 0) {
      setError('Please enter a valid tax rate.');
      return;
    }

    setLoading(true);
    try {
      const data = await calculateSupplementalTax({
        eventDate,
        oldAssessedValue: oldVal,
        newAssessedValue: newVal,
        taxRate: rate,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
    } finally {
      setLoading(false);
    }
  }

  function handleSaveAsBill() {
    // Navigate to bills page -- a more complete implementation would pass state
    navigate('/bills');
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Calculator Form */}
      <div className="card">
        <h3 className="text-base font-semibold text-gray-800 mb-1">Supplemental Tax Calculation</h3>
        <p className="text-sm text-gray-500 mb-6">
          Estimate supplemental property tax bills resulting from a change of ownership or new construction.
        </p>

        <form onSubmit={handleCalculate} className="space-y-6">
          {/* Row 1: County + Event Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="county" className="input-label">County</label>
              <select
                id="county"
                value={county}
                onChange={handleCountyChange}
                className="select"
              >
                <option value="">-- Select County (optional) --</option>
                {Object.keys(countyTaxRates)
                  .filter((c) => c !== '')
                  .sort()
                  .map((c) => (
                    <option key={c} value={c}>
                      {c} County ({countyTaxRates[c].toFixed(2)}%)
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label htmlFor="eventType" className="input-label">Event Type</label>
              <select
                id="eventType"
                value={eventType}
                onChange={(e) =>
                  setEventType(e.target.value as 'change_of_ownership' | 'new_construction')
                }
                className="select"
              >
                <option value="change_of_ownership">Change of Ownership</option>
                <option value="new_construction">New Construction</option>
              </select>
            </div>
          </div>

          {/* Row 2: Event Date + Tax Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="eventDate" className="input-label">Event Date</label>
              <input
                type="date"
                id="eventDate"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="input"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Date of ownership change or construction completion
              </p>
            </div>

            <div>
              <label htmlFor="taxRate" className="input-label">Tax Rate (%)</label>
              <input
                type="text"
                id="taxRate"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="input"
                placeholder="1.10"
              />
              <p className="text-xs text-gray-400 mt-1">
                Effective tax rate for the property location
              </p>
            </div>
          </div>

          {/* Row 3: Assessed Values */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="oldValue" className="input-label">Old Assessed Value ($)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 text-sm">$</span>
                <input
                  type="text"
                  id="oldValue"
                  value={oldAssessedValue}
                  onChange={(e) => setOldAssessedValue(e.target.value)}
                  className="input pl-7"
                  placeholder="500,000"
                  required
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Assessed value before the event</p>
            </div>

            <div>
              <label htmlFor="newValue" className="input-label">New Assessed Value ($)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 text-sm">$</span>
                <input
                  type="text"
                  id="newValue"
                  value={newAssessedValue}
                  onChange={(e) => setNewAssessedValue(e.target.value)}
                  className="input pl-7"
                  placeholder="800,000"
                  required
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">New assessed value after the event</p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? (
                <>
                  <div className="spinner w-4 h-4" />
                  Calculating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
                  </svg>
                  Calculate
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setError(null);
                setOldAssessedValue('');
                setNewAssessedValue('');
                setEventDate('');
                setCounty('');
                setTaxRate('1.10');
                setEventType('change_of_ownership');
              }}
              className="btn-secondary"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary Card */}
          <div className={`card border-l-4 ${result.isIncrease ? 'border-l-red-500' : 'border-l-emerald-500'}`}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-800 mb-1">Calculation Results</h3>
                <p className="text-sm text-gray-500">
                  {result.isIncrease
                    ? 'The new assessment is higher -- additional tax is owed.'
                    : 'The new assessment is lower -- a refund may be issued.'}
                </p>
              </div>
              <span
                className={`badge ${
                  result.isIncrease ? 'badge-red' : 'badge-green'
                } text-sm`}
              >
                {result.isIncrease ? 'Tax Increase' : 'Refund'}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Supplemental Assessment</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(Math.abs(result.supplementalValue))}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Total Estimated Tax</p>
                <p className={`text-xl font-bold ${result.isIncrease ? 'text-red-600' : 'text-emerald-600'}`}>
                  {formatCurrency(Math.abs(result.totalEstimatedTax))}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Direction</p>
                <p className={`text-xl font-bold ${result.isIncrease ? 'text-red-600' : 'text-emerald-600'}`}>
                  {result.isIncrease ? 'Owed' : 'Refund'}
                </p>
              </div>
            </div>
          </div>

          {/* Bill Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* First Bill */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">1</div>
                <h4 className="font-semibold text-gray-800">First Supplemental Bill</h4>
              </div>
              <dl className="space-y-3">
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">Fiscal Year</dt>
                  <dd className="font-medium text-gray-900">
                    {result.firstBill.fiscalYearStart} - {result.firstBill.fiscalYearEnd}
                  </dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">Proration Factor</dt>
                  <dd className="font-medium text-gray-900">
                    {formatPercent(result.firstBill.prorationFactor * 100)}
                  </dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">Proration Months</dt>
                  <dd className="font-medium text-gray-900">
                    {result.firstBill.prorationMonths} month{result.firstBill.prorationMonths !== 1 ? 's' : ''}
                  </dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">Annual Tax Amount</dt>
                  <dd className="font-medium text-gray-900">
                    {formatCurrency(result.firstBill.annualTaxAmount)}
                  </dd>
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between text-sm">
                  <dt className="font-semibold text-gray-700">Prorated Tax Amount</dt>
                  <dd className={`font-bold text-base ${result.isIncrease ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatCurrency(Math.abs(result.firstBill.proratedTaxAmount))}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Second Bill */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm">2</div>
                <h4 className="font-semibold text-gray-800">Second Supplemental Bill</h4>
              </div>

              {result.secondBill ? (
                <dl className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Fiscal Year</dt>
                    <dd className="font-medium text-gray-900">
                      {result.secondBill.fiscalYearStart} - {result.secondBill.fiscalYearEnd}
                    </dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Proration Factor</dt>
                    <dd className="font-medium text-gray-900">
                      {formatPercent(result.secondBill.prorationFactor * 100)}
                    </dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Proration Months</dt>
                    <dd className="font-medium text-gray-900">
                      {result.secondBill.prorationMonths} month{result.secondBill.prorationMonths !== 1 ? 's' : ''}
                    </dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Annual Tax Amount</dt>
                    <dd className="font-medium text-gray-900">
                      {formatCurrency(result.secondBill.annualTaxAmount)}
                    </dd>
                  </div>
                  <div className="border-t border-gray-100 pt-3 flex justify-between text-sm">
                    <dt className="font-semibold text-gray-700">Prorated Tax Amount</dt>
                    <dd className={`font-bold text-base ${result.isIncrease ? 'text-red-600' : 'text-emerald-600'}`}>
                      {formatCurrency(Math.abs(result.secondBill.proratedTaxAmount))}
                    </dd>
                  </div>
                </dl>
              ) : (
                <div className="flex items-center justify-center h-32 text-sm text-gray-400">
                  <p>No second supplemental bill for this event date and fiscal year.</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button onClick={handleSaveAsBill} className="btn-success">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Save as Bill
            </button>
            <button
              onClick={() => {
                setResult(null);
              }}
              className="btn-secondary"
            >
              New Calculation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
