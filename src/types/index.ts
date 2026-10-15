export type MembershipStatus = 'ACTIVE' | 'EXPIRED' | 'INACTIVE';
export type PaymentStatus = 'PAID' | 'PARTIAL' | 'DUE';
export type PaymentMethod = 'Cash' | 'Bank' | 'Mobile Banking' | 'Other';

export interface Payment {
  id: string; // UUID
  receipt_no: string; // e.g. CPR-RCP-000001
  member_id: string; // references Member(id)
  amount: number; // in BDT (৳)
  payment_date: string; // YYYY-MM-DD
  payment_method: PaymentMethod;
  transaction_reference?: string;
  notes?: string;
  recorded_by?: string;
  recorded_by_email?: string;
  created_at: string;
  // Denormalized / joined for receipts
  member_name?: string;
  member_no?: string;
}

export interface Member {
  id: string; // UUID
  member_no: string; // e.g., CPR-0001
  full_name: string;
  photo_url?: string;
  bmdc_no?: string; // BMDC Reg No (Private)
  phone?: string; // Mobile (Private)
  joined_on: string; // YYYY-MM-DD
  expires_on: string; // YYYY-MM-DD
  is_active: boolean;
  notes?: string; // Internal admin notes (Private)
  
  // Billing & Fee Management Fields
  monthly_fee: number; // default 2000 BDT
  membership_months: number; // e.g. 6, 12, 24
  total_payable: number; // monthly_fee * membership_months
  membership_start_date?: string;
  membership_end_date?: string;

  created_at: string;
  updated_at: string;
}

export interface MemberFeeSummary {
  member_id: string;
  member_no: string;
  full_name: string;
  monthly_fee: number;
  membership_months: number;
  total_payable: number;
  total_paid: number;
  remaining_due: number;
  payment_status: PaymentStatus;
  last_payment_date?: string;
  membership_start_date: string;
  membership_end_date: string;
  payments: Payment[];
}

export interface MembershipRenewal {
  id: string;
  member_id: string;
  previous_expiry_date: string;
  new_expiry_date: string;
  renewed_at: string;
  renewed_by?: string;
  renewed_by_email?: string;
  member_name?: string;
  member_no?: string;
}

export interface PublicMemberVerification {
  id: string;
  member_no: string;
  full_name: string;
  photo_url?: string;
  joined_on: string;
  expires_on: string;
  is_active: boolean;
  status: MembershipStatus;
  is_valid: boolean;
  institution: string;
  branch: string;
  verified_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'librarian' | 'superadmin';
  last_login?: string;
}

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  expiredMembers: number;
  inactiveMembers: number;
  expiringIn30Days: number;
  renewalsThisMonth: number;
  // Financial KPI Metrics
  totalExpectedFees: number;
  totalCollected: number;
  totalOutstandingDues: number;
  paymentsReceivedToday: number;
}

