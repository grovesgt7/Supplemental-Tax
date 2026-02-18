import type {
  Client,
  Bill,
  DashboardStats,
  SupplementalTaxResult,
  EscrowShortageResult,
} from '../types';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      if (body.error) message = body.error;
      else if (body.message) message = body.message;
    } catch {
      // use default message
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ── Clients ──────────────────────────────────────────────────────────────────

export async function fetchClients(): Promise<Client[]> {
  return request<Client[]>('/api/clients');
}

export async function fetchClient(id: string): Promise<Client> {
  return request<Client>(`/api/clients/${id}`);
}

export async function createClient(
  data: Omit<Client, 'id' | 'created_at' | 'propertyCount'>
): Promise<Client> {
  return request<Client>('/api/clients', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateClient(
  id: string,
  data: Partial<Omit<Client, 'id' | 'created_at'>>
): Promise<Client> {
  return request<Client>(`/api/clients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteClient(id: string): Promise<void> {
  return request<void>(`/api/clients/${id}`, { method: 'DELETE' });
}

// ── Bills ────────────────────────────────────────────────────────────────────

export interface BillFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  client?: string;
  property_id?: string;
}

export async function fetchBills(filters?: BillFilters): Promise<Bill[]> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
  }
  const query = params.toString();
  return request<Bill[]>(`/api/bills${query ? `?${query}` : ''}`);
}

export async function fetchBill(id: string): Promise<Bill> {
  return request<Bill>(`/api/bills/${id}`);
}

export async function createBill(
  data: Omit<Bill, 'id'>
): Promise<Bill> {
  return request<Bill>('/api/bills', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateBill(
  id: string,
  data: Partial<Omit<Bill, 'id'>>
): Promise<Bill> {
  return request<Bill>(`/api/bills/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteBill(id: string): Promise<void> {
  return request<void>(`/api/bills/${id}`, { method: 'DELETE' });
}

export async function fetchBillStats(): Promise<DashboardStats> {
  return request<DashboardStats>('/api/bills/summary/stats');
}

// ── Calculator ───────────────────────────────────────────────────────────────

export interface SupplementalTaxInput {
  eventDate: string;
  oldAssessedValue: number;
  newAssessedValue: number;
  taxRate: number;
}

export async function calculateSupplementalTax(
  data: SupplementalTaxInput
): Promise<SupplementalTaxResult> {
  return request<SupplementalTaxResult>('/api/calculator/supplemental', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface EscrowShortageInput {
  currentBalance: number;
  annualTaxBudget: number;
  monthlyEscrowAmount: number;
  monthsRemaining: number;
  expectedSupplementalTax: number;
}

export async function calculateEscrowShortage(
  data: EscrowShortageInput
): Promise<EscrowShortageResult> {
  return request<EscrowShortageResult>('/api/calculator/escrow-shortage', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Upload / Import ──────────────────────────────────────────────────────────

export async function uploadPdf(file: File): Promise<Record<string, unknown>> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/upload/pdf', {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    let message = 'PDF upload failed';
    try {
      const body = await response.json();
      if (body.error) message = body.error;
    } catch {
      // use default message
    }
    throw new ApiError(message, response.status);
  }
  return response.json();
}

export async function uploadSpreadsheet(
  file: File
): Promise<Record<string, unknown>> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/upload/spreadsheet', {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    let message = 'Spreadsheet upload failed';
    try {
      const body = await response.json();
      if (body.error) message = body.error;
    } catch {
      // use default message
    }
    throw new ApiError(message, response.status);
  }
  return response.json();
}

export async function importData(
  data: Record<string, unknown>[],
  type: 'clients' | 'properties' | 'bills'
): Promise<{ imported: number }> {
  return request<{ imported: number }>('/api/upload/import', {
    method: 'POST',
    body: JSON.stringify({ data, type }),
  });
}
