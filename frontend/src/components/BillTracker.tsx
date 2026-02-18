import { useEffect, useState, useCallback, Fragment } from 'react';
import type { Bill } from '../types';
import { fetchBills, updateBill, deleteBill, createBill } from '../api/client';

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

interface BillFormData {
  property_id: string;
  bill_type: Bill['bill_type'];
  event_type: Bill['event_type'];
  event_date: string;
  old_assessed_value: number;
  new_assessed_value: number;
  supplemental_value: number;
  tax_rate: number;
  annual_tax_amount: number;
  prorated_tax_amount: number;
  proration_factor: number;
  fiscal_year_start: string;
  fiscal_year_end: string;
  due_date: string;
  status: Bill['status'];
  paid_date: string | null;
  paid_amount: number | null;
  penalty_amount: number;
  notes: string;
}

const emptyBillForm: BillFormData = {
  property_id: '',
  bill_type: 'first_supplemental',
  event_type: 'change_of_ownership',
  event_date: '',
  old_assessed_value: 0,
  new_assessed_value: 0,
  supplemental_value: 0,
  tax_rate: 1.1,
  annual_tax_amount: 0,
  prorated_tax_amount: 0,
  proration_factor: 0,
  fiscal_year_start: '',
  fiscal_year_end: '',
  due_date: '',
  status: 'pending',
  paid_date: null,
  paid_amount: null,
  penalty_amount: 0,
  notes: '',
};

export default function BillTracker() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clientSearch, setClientSearch] = useState('');

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payBillId, setPayBillId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');

  // New bill form
  const [newBill, setNewBill] = useState(emptyBillForm);

  const loadBills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBills({
        status: statusFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        client: clientSearch || undefined,
      });
      setBills(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bills');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, startDate, endDate, clientSearch]);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  async function handleStatusChange(billId: string, newStatus: Bill['status']) {
    try {
      await updateBill(billId, { status: newStatus });
      setBills((prev) =>
        prev.map((b) => (b.id === billId ? { ...b, status: newStatus } : b))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  async function handleDelete(billId: string) {
    if (!window.confirm('Are you sure you want to delete this bill?')) return;
    try {
      await deleteBill(billId);
      setBills((prev) => prev.filter((b) => b.id !== billId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bill');
    }
  }

  function openPayModal(billId: string) {
    setPayBillId(billId);
    const bill = bills.find((b) => b.id === billId);
    setPayAmount(bill ? bill.prorated_tax_amount.toString() : '');
    setShowPayModal(true);
  }

  async function handlePay() {
    if (!payBillId) return;
    const amount = parseFloat(payAmount.replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) return;

    try {
      await updateBill(payBillId, {
        status: 'paid',
        paid_date: new Date().toISOString().split('T')[0],
        paid_amount: amount,
      });
      setBills((prev) =>
        prev.map((b) =>
          b.id === payBillId
            ? {
                ...b,
                status: 'paid',
                paid_date: new Date().toISOString().split('T')[0],
                paid_amount: amount,
              }
            : b
        )
      );
      setShowPayModal(false);
      setPayBillId(null);
      setPayAmount('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as paid');
    }
  }

  async function handleAddBill(e: React.FormEvent) {
    e.preventDefault();
    try {
      const created = await createBill(newBill as Omit<Bill, 'id'>);
      setBills((prev) => [created, ...prev]);
      setShowAddModal(false);
      setNewBill(emptyBillForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bill');
    }
  }

  // Filtered bills (client-side search on top of server filters)
  const filteredBills = bills;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[160px]">
            <label className="input-label">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="disputed">Disputed</option>
            </select>
          </div>

          <div className="min-w-[140px]">
            <label className="input-label">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
            />
          </div>

          <div className="min-w-[140px]">
            <label className="input-label">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input"
            />
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="input-label">Search Client</label>
            <input
              type="text"
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="input"
              placeholder="Search by client name..."
            />
          </div>

          <div className="flex gap-2">
            <button onClick={loadBills} className="btn-primary btn-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              Filter
            </button>
            <button
              onClick={() => {
                setStatusFilter('');
                setStartDate('');
                setEndDate('');
                setClientSearch('');
              }}
              className="btn-secondary btn-sm"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {filteredBills.length} bill{filteredBills.length !== 1 ? 's' : ''} found
        </p>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add New Bill
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="spinner w-8 h-8" />
        </div>
      ) : filteredBills.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="text-sm text-gray-500">No bills found matching your filters.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="table-header w-8"></th>
                <th className="table-header">Client</th>
                <th className="table-header">Property Address</th>
                <th className="table-header">Bill Type</th>
                <th className="table-header">Event Date</th>
                <th className="table-header text-right">Suppl. Value</th>
                <th className="table-header text-right">Prorated Tax</th>
                <th className="table-header">Status</th>
                <th className="table-header">Due Date</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map((bill) => {
                const statusCfg = statusConfig[bill.status] || statusConfig.pending;
                const isExpanded = expandedId === bill.id;

                return (
                  <Fragment key={bill.id}>
                    <tr className={`table-row cursor-pointer ${isExpanded ? 'bg-primary-50/30' : ''}`}>
                      <td className="table-cell">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : bill.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <svg
                            className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </button>
                      </td>
                      <td className="table-cell font-medium text-gray-900">{bill.client_name || '--'}</td>
                      <td className="table-cell">{bill.property_address || '--'}</td>
                      <td className="table-cell">
                        <span className="badge-blue">
                          {bill.bill_type === 'first_supplemental' ? '1st Supp' : '2nd Supp'}
                        </span>
                      </td>
                      <td className="table-cell">{formatDate(bill.event_date)}</td>
                      <td className="table-cell text-right font-medium">
                        {formatCurrency(bill.supplemental_value)}
                      </td>
                      <td className="table-cell text-right font-medium">
                        {formatCurrency(bill.prorated_tax_amount)}
                      </td>
                      <td className="table-cell">
                        <select
                          value={bill.status}
                          onChange={(e) => handleStatusChange(bill.id, e.target.value as Bill['status'])}
                          className={`text-xs font-medium rounded-full px-2.5 py-1 border-0 cursor-pointer focus:ring-2 focus:ring-primary-500 ${
                            bill.status === 'pending'
                              ? 'bg-amber-50 text-amber-700'
                              : bill.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700'
                              : bill.status === 'overdue'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-orange-50 text-orange-700'
                          }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="overdue">Overdue</option>
                          <option value="disputed">Disputed</option>
                        </select>
                      </td>
                      <td className="table-cell">{formatDate(bill.due_date)}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          {bill.status !== 'paid' && (
                            <button
                              onClick={() => openPayModal(bill.id)}
                              className="text-emerald-600 hover:text-emerald-800 p-1 rounded hover:bg-emerald-50"
                              title="Mark as Paid"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(bill.id)}
                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                            title="Delete Bill"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <tr className="bg-gray-50/50">
                        <td colSpan={10} className="px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500 text-xs mb-0.5">Event Type</p>
                              <p className="font-medium text-gray-800">
                                {bill.event_type === 'change_of_ownership' ? 'Change of Ownership' : 'New Construction'}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs mb-0.5">Old Assessed Value</p>
                              <p className="font-medium text-gray-800">{formatCurrency(bill.old_assessed_value)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs mb-0.5">New Assessed Value</p>
                              <p className="font-medium text-gray-800">{formatCurrency(bill.new_assessed_value)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs mb-0.5">Tax Rate</p>
                              <p className="font-medium text-gray-800">{bill.tax_rate}%</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs mb-0.5">Annual Tax Amount</p>
                              <p className="font-medium text-gray-800">{formatCurrency(bill.annual_tax_amount)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs mb-0.5">Proration Factor</p>
                              <p className="font-medium text-gray-800">{(bill.proration_factor * 100).toFixed(2)}%</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs mb-0.5">Fiscal Year</p>
                              <p className="font-medium text-gray-800">
                                {bill.fiscal_year_start} - {bill.fiscal_year_end}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs mb-0.5">Penalty Amount</p>
                              <p className="font-medium text-gray-800">{formatCurrency(bill.penalty_amount)}</p>
                            </div>
                            {bill.paid_date && (
                              <div>
                                <p className="text-gray-500 text-xs mb-0.5">Paid Date</p>
                                <p className="font-medium text-gray-800">{formatDate(bill.paid_date)}</p>
                              </div>
                            )}
                            {bill.paid_amount != null && (
                              <div>
                                <p className="text-gray-500 text-xs mb-0.5">Paid Amount</p>
                                <p className="font-medium text-emerald-700">{formatCurrency(bill.paid_amount)}</p>
                              </div>
                            )}
                            {bill.notes && (
                              <div className="col-span-2 md:col-span-4">
                                <p className="text-gray-500 text-xs mb-0.5">Notes</p>
                                <p className="font-medium text-gray-800">{bill.notes}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Mark Bill as Paid</h3>
            <div className="mb-4">
              <label className="input-label">Paid Amount ($)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 text-sm">$</span>
                <input
                  type="text"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="input pl-7"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => {
                  setShowPayModal(false);
                  setPayBillId(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button onClick={handlePay} className="btn-success">
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Bill Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Bill</h3>
            <form onSubmit={handleAddBill} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Property ID</label>
                  <input
                    type="text"
                    value={newBill.property_id}
                    onChange={(e) => setNewBill({ ...newBill, property_id: e.target.value })}
                    className="input"
                    placeholder="Enter property ID"
                    required
                  />
                </div>
                <div>
                  <label className="input-label">Bill Type</label>
                  <select
                    value={newBill.bill_type}
                    onChange={(e) =>
                      setNewBill({
                        ...newBill,
                        bill_type: e.target.value as Bill['bill_type'],
                      })
                    }
                    className="select"
                  >
                    <option value="first_supplemental">First Supplemental</option>
                    <option value="second_supplemental">Second Supplemental</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Event Type</label>
                  <select
                    value={newBill.event_type}
                    onChange={(e) =>
                      setNewBill({
                        ...newBill,
                        event_type: e.target.value as Bill['event_type'],
                      })
                    }
                    className="select"
                  >
                    <option value="change_of_ownership">Change of Ownership</option>
                    <option value="new_construction">New Construction</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Event Date</label>
                  <input
                    type="date"
                    value={newBill.event_date}
                    onChange={(e) => setNewBill({ ...newBill, event_date: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="input-label">Old Assessed Value ($)</label>
                  <input
                    type="number"
                    value={newBill.old_assessed_value || ''}
                    onChange={(e) =>
                      setNewBill({ ...newBill, old_assessed_value: parseFloat(e.target.value) || 0 })
                    }
                    className="input"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="input-label">New Assessed Value ($)</label>
                  <input
                    type="number"
                    value={newBill.new_assessed_value || ''}
                    onChange={(e) =>
                      setNewBill({ ...newBill, new_assessed_value: parseFloat(e.target.value) || 0 })
                    }
                    className="input"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="input-label">Tax Rate (%)</label>
                  <input
                    type="number"
                    value={newBill.tax_rate || ''}
                    onChange={(e) =>
                      setNewBill({ ...newBill, tax_rate: parseFloat(e.target.value) || 0 })
                    }
                    className="input"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="input-label">Supplemental Value ($)</label>
                  <input
                    type="number"
                    value={newBill.supplemental_value || ''}
                    onChange={(e) =>
                      setNewBill({ ...newBill, supplemental_value: parseFloat(e.target.value) || 0 })
                    }
                    className="input"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="input-label">Annual Tax Amount ($)</label>
                  <input
                    type="number"
                    value={newBill.annual_tax_amount || ''}
                    onChange={(e) =>
                      setNewBill({ ...newBill, annual_tax_amount: parseFloat(e.target.value) || 0 })
                    }
                    className="input"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="input-label">Prorated Tax Amount ($)</label>
                  <input
                    type="number"
                    value={newBill.prorated_tax_amount || ''}
                    onChange={(e) =>
                      setNewBill({ ...newBill, prorated_tax_amount: parseFloat(e.target.value) || 0 })
                    }
                    className="input"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="input-label">Proration Factor</label>
                  <input
                    type="number"
                    value={newBill.proration_factor || ''}
                    onChange={(e) =>
                      setNewBill({ ...newBill, proration_factor: parseFloat(e.target.value) || 0 })
                    }
                    className="input"
                    step="0.0001"
                    min="0"
                    max="1"
                  />
                </div>
                <div>
                  <label className="input-label">Due Date</label>
                  <input
                    type="date"
                    value={newBill.due_date}
                    onChange={(e) => setNewBill({ ...newBill, due_date: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="input-label">Fiscal Year Start</label>
                  <input
                    type="text"
                    value={newBill.fiscal_year_start}
                    onChange={(e) => setNewBill({ ...newBill, fiscal_year_start: e.target.value })}
                    className="input"
                    placeholder="2024-07-01"
                  />
                </div>
                <div>
                  <label className="input-label">Fiscal Year End</label>
                  <input
                    type="text"
                    value={newBill.fiscal_year_end}
                    onChange={(e) => setNewBill({ ...newBill, fiscal_year_end: e.target.value })}
                    className="input"
                    placeholder="2025-06-30"
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Notes</label>
                <textarea
                  value={newBill.notes}
                  onChange={(e) => setNewBill({ ...newBill, notes: e.target.value })}
                  className="input"
                  rows={3}
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewBill(emptyBillForm);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
