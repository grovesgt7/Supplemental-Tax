import { useState } from 'react';
import type { EscrowShortageResult } from '../types';
import { calculateEscrowShortage } from '../api/client';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

export default function EscrowAnalyzer() {
  const [currentBalance, setCurrentBalance] = useState('');
  const [annualTaxBudget, setAnnualTaxBudget] = useState('');
  const [monthlyEscrowAmount, setMonthlyEscrowAmount] = useState('');
  const [monthsRemaining, setMonthsRemaining] = useState('');
  const [expectedSupplementalTax, setExpectedSupplementalTax] = useState('');

  const [result, setResult] = useState<EscrowShortageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const balance = parseFloat(currentBalance.replace(/,/g, ''));
    const budget = parseFloat(annualTaxBudget.replace(/,/g, ''));
    const monthly = parseFloat(monthlyEscrowAmount.replace(/,/g, ''));
    const months = parseInt(monthsRemaining, 10);
    const supplemental = parseFloat(expectedSupplementalTax.replace(/,/g, ''));

    if (isNaN(balance) || balance < 0) {
      setError('Please enter a valid current escrow balance.');
      return;
    }
    if (isNaN(budget) || budget <= 0) {
      setError('Please enter a valid annual tax budget.');
      return;
    }
    if (isNaN(monthly) || monthly <= 0) {
      setError('Please enter a valid monthly escrow payment.');
      return;
    }
    if (isNaN(months) || months < 1 || months > 12) {
      setError('Months remaining must be between 1 and 12.');
      return;
    }
    if (isNaN(supplemental) || supplemental < 0) {
      setError('Please enter a valid expected supplemental tax amount.');
      return;
    }

    setLoading(true);
    try {
      const data = await calculateEscrowShortage({
        currentBalance: balance,
        annualTaxBudget: budget,
        monthlyEscrowAmount: monthly,
        monthsRemaining: months,
        expectedSupplementalTax: supplemental,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Input Form */}
      <div className="card">
        <h3 className="text-base font-semibold text-gray-800 mb-1">Escrow Shortage Detection</h3>
        <p className="text-sm text-gray-500 mb-6">
          Determine if a supplemental tax bill will cause an escrow shortage and calculate the recommended monthly adjustment.
        </p>

        <form onSubmit={handleAnalyze} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="currentBalance" className="input-label">Current Escrow Balance ($)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 text-sm">$</span>
                <input
                  type="text"
                  id="currentBalance"
                  value={currentBalance}
                  onChange={(e) => setCurrentBalance(e.target.value)}
                  className="input pl-7"
                  placeholder="5,000"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="annualTaxBudget" className="input-label">Annual Tax Budget ($)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 text-sm">$</span>
                <input
                  type="text"
                  id="annualTaxBudget"
                  value={annualTaxBudget}
                  onChange={(e) => setAnnualTaxBudget(e.target.value)}
                  className="input pl-7"
                  placeholder="8,000"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="monthlyEscrow" className="input-label">Monthly Escrow Payment ($)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 text-sm">$</span>
                <input
                  type="text"
                  id="monthlyEscrow"
                  value={monthlyEscrowAmount}
                  onChange={(e) => setMonthlyEscrowAmount(e.target.value)}
                  className="input pl-7"
                  placeholder="700"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="monthsRemaining" className="input-label">Months Remaining in Escrow Year</label>
              <input
                type="number"
                id="monthsRemaining"
                value={monthsRemaining}
                onChange={(e) => setMonthsRemaining(e.target.value)}
                className="input"
                placeholder="6"
                min="1"
                max="12"
                required
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-2">
              <label htmlFor="expectedSupp" className="input-label">Expected Supplemental Tax ($)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 text-sm">$</span>
                <input
                  type="text"
                  id="expectedSupp"
                  value={expectedSupplementalTax}
                  onChange={(e) => setExpectedSupplementalTax(e.target.value)}
                  className="input pl-7"
                  placeholder="3,500"
                  required
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Use the Bill Calculator to estimate this amount
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? (
                <>
                  <div className="spinner w-4 h-4" />
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  Analyze
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setError(null);
                setCurrentBalance('');
                setAnnualTaxBudget('');
                setMonthlyEscrowAmount('');
                setMonthsRemaining('');
                setExpectedSupplementalTax('');
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
          {/* Shortage Warning */}
          {result.isShortage && (
            <div className="rounded-xl border-2 border-red-200 bg-red-50 p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-base font-semibold text-red-800">Escrow Shortage Detected</h4>
                  <p className="text-sm text-red-700 mt-1">
                    The escrow account is projected to be short by <strong>{formatCurrency(Math.abs(result.shortageAmount))}</strong>.
                    This means the lender will likely require an escrow analysis and increase the monthly payment.
                    If not addressed, the borrower may receive a lump-sum shortage bill.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Results Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card">
              <span className="stat-label">Projected Balance</span>
              <span className={`stat-value ${result.projectedBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(result.projectedBalance)}
              </span>
              <span className="text-xs text-gray-400">At end of escrow year</span>
            </div>

            <div className="stat-card">
              <span className="stat-label">Total Tax Due</span>
              <span className="stat-value">{formatCurrency(result.totalTaxDue)}</span>
              <span className="text-xs text-gray-400">Regular + supplemental</span>
            </div>

            <div className="stat-card">
              <span className="stat-label">
                {result.isShortage ? 'Shortage Amount' : 'Surplus Amount'}
              </span>
              <span className={`stat-value ${result.isShortage ? 'text-red-600' : 'text-emerald-600'}`}>
                {formatCurrency(Math.abs(result.shortageAmount))}
              </span>
              <span className="text-xs text-gray-400">
                {result.isShortage ? 'Escrow will be short' : 'Escrow has surplus'}
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-label">Monthly Adjustment</span>
              <span className={`stat-value ${result.monthlyAdjustment > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {result.monthlyAdjustment > 0 ? '+' : ''}{formatCurrency(result.monthlyAdjustment)}
              </span>
              <span className="text-xs text-gray-400">Recommended change per month</span>
            </div>
          </div>

          {/* Surplus confirmation */}
          {!result.isShortage && (
            <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-base font-semibold text-emerald-800">Escrow Is Sufficient</h4>
                  <p className="text-sm text-emerald-700 mt-1">
                    The current escrow balance and monthly payments are projected to cover the total tax due, including the supplemental tax.
                    No immediate action is required.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tips Section */}
      <div className="card bg-slate-50 border-slate-200">
        <h3 className="text-base font-semibold text-gray-800 mb-3">
          How Supplemental Bills Affect Escrow
        </h3>
        <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">1</span>
            <p>
              <strong>Supplemental bills are separate from regular tax bills.</strong> They arise when property ownership changes or new construction occurs, causing a reassessment of the property value.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">2</span>
            <p>
              <strong>Escrow accounts typically do not account for supplemental bills.</strong> The lender budgets for the regular annual tax amount, but supplemental bills are an additional cost that can create a shortage.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">3</span>
            <p>
              <strong>A shortage means higher monthly payments.</strong> When the escrow company detects a shortage during their annual analysis, they will typically increase the monthly escrow payment to cover the deficit over the next 12 months.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">4</span>
            <p>
              <strong>Proactive management saves money.</strong> By anticipating the supplemental tax bill and adjusting escrow payments early, homeowners can avoid surprise lump-sum payments and penalty fees.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
