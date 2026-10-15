export type MembershipStatus = 'ACTIVE' | 'EXPIRED' | 'INACTIVE';

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
  created_at: string;
  updated_at: string;
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
}
