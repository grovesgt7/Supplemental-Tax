import { useEffect, useState, useCallback } from 'react';
import type { Client, Bill } from '../types';
import { fetchClients, createClient, updateClient, deleteClient, fetchBills } from '../api/client';

function formatDate(dateStr: string): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'badge-yellow' },
  paid: { label: 'Paid', className: 'badge-green' },
  overdue: { label: 'Overdue', className: 'badge-red' },
  disputed: { label: 'Disputed', className: 'badge-orange' },
};

const emptyClientForm = {
  name: '',
  email: '',
  phone: '',
  company: '',
};

export default function ClientManager() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Selected client
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [clientBills, setClientBills] = useState<Bill[]>([]);
  const [loadingBills, setLoadingBills] = useState(false);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyClientForm);
  const [saving, setSaving] = useState(false);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchClients();
      setClients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  async function handleSelectClient(id: string) {
    if (selectedId === id) {
      setSelectedId(null);
      setClientBills([]);
      return;
    }
    setSelectedId(id);
    setLoadingBills(true);
    try {
      const bills = await fetchBills({ client: id });
      setClientBills(bills);
    } catch {
      setClientBills([]);
    } finally {
      setLoadingBills(false);
    }
  }

  function openAddForm() {
    setEditId(null);
    setForm(emptyClientForm);
    setShowForm(true);
  }

  function openEditForm(client: Client) {
    setEditId(client.id);
    setForm({
      name: client.name,
      email: client.email,
      phone: client.phone,
      company: client.company,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Client name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editId) {
        const updated = await updateClient(editId, form);
        setClients((prev) =>
          prev.map((c) => (c.id === editId ? { ...c, ...updated } : c))
        );
      } else {
        const created = await createClient(form);
        setClients((prev) => [created, ...prev]);
      }
      setShowForm(false);
      setForm(emptyClientForm);
      setEditId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save client');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteClient(id);
      setClients((prev) => prev.filter((c) => c.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setClientBills([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete client');
    }
  }

  // Filter clients
  const filteredClients = clients.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.phone.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Search + Add */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 w-full">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9"
              placeholder="Search clients by name, email, company, or phone..."
            />
          </div>
        </div>
        <button onClick={openAddForm} className="btn-primary whitespace-nowrap">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Client
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

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="spinner w-8 h-8" />
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          <p className="text-sm text-gray-500">
            {search ? 'No clients found matching your search.' : 'No clients yet. Add your first client to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredClients.map((client) => {
            const isSelected = selectedId === client.id;
            return (
              <div key={client.id} className={`card-hover ${isSelected ? 'ring-2 ring-primary-500 shadow-md' : ''}`}>
                {/* Client Header */}
                <div className="flex items-start justify-between">
                  <div
                    className="flex items-start gap-3 cursor-pointer flex-1"
                    onClick={() => handleSelectClient(client.id)}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-700 font-semibold text-sm">
                        {client.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">{client.name}</h4>
                      {client.company && (
                        <p className="text-xs text-gray-500">{client.company}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => openEditForm(client)}
                      className="text-gray-400 hover:text-primary-600 p-1.5 rounded-lg hover:bg-gray-100"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(client.id)}
                      className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Contact Details */}
                <div className="mt-3 space-y-1.5">
                  {client.email && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                      <span>{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                      </svg>
                      <span>{client.phone}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="badge-blue">
                      {client.propertyCount ?? 0} {(client.propertyCount ?? 0) === 1 ? 'property' : 'properties'}
                    </span>
                    <span className="text-xs text-gray-400">Added {formatDate(client.created_at)}</span>
                  </div>
                  <button
                    onClick={() => handleSelectClient(client.id)}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    {isSelected ? 'Hide Details' : 'View Details'}
                  </button>
                </div>

                {/* Expanded: Client Bills */}
                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h5 className="text-sm font-semibold text-gray-700 mb-3">Bills</h5>
                    {loadingBills ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="spinner w-5 h-5" />
                      </div>
                    ) : clientBills.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">No bills found for this client.</p>
                    ) : (
                      <div className="space-y-2">
                        {clientBills.map((bill) => {
                          const sc = statusConfig[bill.status] || statusConfig.pending;
                          return (
                            <div
                              key={bill.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 text-xs"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-gray-800">
                                  {bill.property_address || 'Property ' + bill.property_id}
                                </p>
                                <p className="text-gray-500 mt-0.5">
                                  {bill.bill_type === 'first_supplemental' ? '1st Supplemental' : '2nd Supplemental'} &middot; {formatDate(bill.event_date)}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-gray-800">{formatCurrency(bill.prorated_tax_amount)}</span>
                                <span className={sc.className}>{sc.label}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Client Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {editId ? 'Edit Client' : 'Add New Client'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="input-label">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder="Full name"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="input-label">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="input-label">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="input-label">Company</label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="input"
                  placeholder="Company name"
                />
              </div>

              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditId(null);
                    setForm(emptyClientForm);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? (
                    <>
                      <div className="spinner w-4 h-4" />
                      Saving...
                    </>
                  ) : editId ? (
                    'Update Client'
                  ) : (
                    'Create Client'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
