import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DashboardStats, Bill } from '../types';
import { fetchBillStats, fetchBills } from '../api/client';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'badge-yellow' },
  paid: { label: 'Paid', className: 'badge-green' },
  overdue: { label: 'Overdue', className: 'badge-red' },
  disputed: { label: 'Disputed', className: 'badge-orange' },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [statsData, billsData] = await Promise.all([
          fetchBillStats(),
          fetchBills(),
        ]);
        setStats(statsData);
        setRecentBills(billsData.slice(0, 10));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card border-red-200 bg-red-50">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-800">Failed to load dashboard</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const safeStats = stats || {
    totalBills: 0,
    totalAmount: 0,
    pendingCount: 0,
    paidCount: 0,
    overdueCount: 0,
    disputedCount: 0,
    pendingAmount: 0,
    paidAmount: 0,
    overdueAmount: 0,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Total Bills</span>
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
          </div>
          <span className="stat-value">{safeStats.totalBills}</span>
          <span className="text-xs text-gray-400">
            {formatCurrency(safeStats.totalAmount)} total value
          </span>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Pending Amount</span>
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <span className="stat-value text-amber-600">{formatCurrency(safeStats.pendingAmount)}</span>
          <span className="text-xs text-gray-400">
            {safeStats.pendingCount} bill{safeStats.pendingCount !== 1 ? 's' : ''} pending
          </span>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Overdue Amount</span>
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
          </div>
          <span className="stat-value text-red-600">{formatCurrency(safeStats.overdueAmount)}</span>
          <span className="text-xs text-gray-400">
            {safeStats.overdueCount} bill{safeStats.overdueCount !== 1 ? 's' : ''} overdue
          </span>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="stat-label">Paid Amount</span>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <span className="stat-value text-emerald-600">{formatCurrency(safeStats.paidAmount)}</span>
          <span className="text-xs text-gray-400">
            {safeStats.paidCount} bill{safeStats.paidCount !== 1 ? 's' : ''} paid
          </span>
        </div>
      </div>

      {/* Status Breakdown & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Breakdown */}
        <div className="card">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Status Breakdown</h3>
          <div className="space-y-3">
            {[
              { label: 'Pending', count: safeStats.pendingCount, color: 'bg-amber-400', total: safeStats.totalBills },
              { label: 'Paid', count: safeStats.paidCount, color: 'bg-emerald-500', total: safeStats.totalBills },
              { label: 'Overdue', count: safeStats.overdueCount, color: 'bg-red-500', total: safeStats.totalBills },
              { label: 'Disputed', count: safeStats.disputedCount, color: 'bg-orange-400', total: safeStats.totalBills },
            ].map((item) => {
              const pct = item.total > 0 ? (item.count / item.total) * 100 : 0;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-medium text-gray-800">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`${item.color} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card lg:col-span-2">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/calculator')}
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Calculate Tax</p>
                <p className="text-xs text-gray-500">Estimate supplemental tax bills</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/escrow')}
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Analyze Escrow</p>
                <p className="text-xs text-gray-500">Detect escrow shortages</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/upload')}
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center group-hover:bg-violet-200 transition-colors">
                <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Upload Documents</p>
                <p className="text-xs text-gray-500">Import PDFs or spreadsheets</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/clients')}
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center group-hover:bg-sky-200 transition-colors">
                <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Add Client</p>
                <p className="text-xs text-gray-500">Manage clients and properties</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Bills */}
      <div className="card p-0">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-800">Recent Bills</h3>
            <button
              onClick={() => navigate('/bills')}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View All
            </button>
          </div>
        </div>

        {recentBills.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p className="text-sm text-gray-500">No bills yet. Use the calculator or upload a document to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="table-header">Client</th>
                  <th className="table-header">Property</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Event Date</th>
                  <th className="table-header text-right">Prorated Tax</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {recentBills.map((bill) => {
                  const statusCfg = statusConfig[bill.status] || statusConfig.pending;
                  return (
                    <tr key={bill.id} className="table-row">
                      <td className="table-cell font-medium text-gray-900">
                        {bill.client_name || '--'}
                      </td>
                      <td className="table-cell">
                        {bill.property_address || '--'}
                      </td>
                      <td className="table-cell">
                        <span className="badge-blue">
                          {bill.bill_type === 'first_supplemental' ? '1st Supp' : '2nd Supp'}
                        </span>
                      </td>
                      <td className="table-cell">{formatDate(bill.event_date)}</td>
                      <td className="table-cell text-right font-medium">
                        {formatCurrency(bill.prorated_tax_amount)}
                      </td>
                      <td className="table-cell">
                        <span className={statusCfg.className}>{statusCfg.label}</span>
                      </td>
                      <td className="table-cell">{formatDate(bill.due_date)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
