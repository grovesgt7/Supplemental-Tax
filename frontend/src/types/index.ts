export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  created_at: string;
  propertyCount?: number;
}

export interface Property {
  id: string;
  client_id: string;
  address: string;
  city: string;
  county: string;
  zip: string;
  apn: string;
}

export interface Bill {
  id: string;
  property_id: string;
  bill_type: 'first_supplemental' | 'second_supplemental';
  event_type: 'change_of_ownership' | 'new_construction';
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
  status: 'pending' | 'paid' | 'overdue' | 'disputed';
  paid_date: string | null;
  paid_amount: number | null;
  penalty_amount: number;
  notes: string;
  property_address?: string;
  client_name?: string;
}

export interface EscrowAccount {
  id: string;
  property_id: string;
  escrow_company: string;
  monthly_escrow_amount: number;
  current_balance: number;
  annual_tax_budget: number;
  expected_supplemental: number;
  shortage_amount: number;
  shortage_detected: boolean;
}

export interface SupplementalTaxResult {
  supplementalValue: number;
  isIncrease: boolean;
  firstBill: {
    fiscalYearStart: string;
    fiscalYearEnd: string;
    prorationFactor: number;
    prorationMonths: number;
    annualTaxAmount: number;
    proratedTaxAmount: number;
  };
  secondBill: {
    fiscalYearStart: string;
    fiscalYearEnd: string;
    prorationFactor: number;
    prorationMonths: number;
    annualTaxAmount: number;
    proratedTaxAmount: number;
  } | null;
  totalEstimatedTax: number;
}

export interface EscrowShortageResult {
  projectedBalance: number;
  totalTaxDue: number;
  shortageAmount: number;
  isShortage: boolean;
  monthlyAdjustment: number;
}

export interface DashboardStats {
  totalBills: number;
  totalAmount: number;
  pendingCount: number;
  paidCount: number;
  overdueCount: number;
  disputedCount: number;
  pendingAmount: number;
  paidAmount: number;
  overdueAmount: number;
}
