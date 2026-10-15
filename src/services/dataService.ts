import { getDaysRemaining, calculateMembershipStatus, getTodayIsoDate } from '../lib/dateUtils';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import {
  DashboardStats,
  Member,
  MemberFeeSummary,
  MembershipRenewal,
  MembershipStatus,
  Payment,
  PaymentStatus,
  PublicMemberVerification,
} from '../types';

const STORAGE_KEY_MEMBERS = 'cpr_library_members_data';
const STORAGE_KEY_RENEWALS = 'cpr_library_renewals_data';
const STORAGE_KEY_PAYMENTS = 'cpr_library_payments_data';

// Realistic initial demo seed for CPR Reading Library, Chattogram
const INITIAL_MEMBERS_SEED: Member[] = [
  {
    id: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
    member_no: 'CPR-0001',
    full_name: 'Dr. Tariqul Islam',
    bmdc_no: 'A-42190',
    phone: '+880 1819-234567',
    joined_on: '2025-01-15',
    expires_on: '2027-06-30',
    is_active: true,
    photo_url: '',
    notes: 'Assistant Professor, Department of Cardiology, CMCH. Regular journal reader.',
    monthly_fee: 2000,
    membership_months: 18,
    total_payable: 36000,
    membership_start_date: '2025-01-15',
    membership_end_date: '2027-06-30',
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: 'b2c3d4e5-f6a1-4b2c-9d3e-4f5a6b7c8d9e',
    member_no: 'CPR-0002',
    full_name: 'Dr. Nusrat Jahan',
    bmdc_no: 'A-56230',
    phone: '+880 1712-987654',
    joined_on: '2025-04-10',
    // Expiring in ~18 days from today for testing the "Expiring Soon" alert
    expires_on: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 18);
      return d.toISOString().split('T')[0];
    })(),
    is_active: true,
    photo_url: '',
    notes: 'Registrar, Department of Pediatrics. Requested textbook reservation access.',
    monthly_fee: 2000,
    membership_months: 6,
    total_payable: 12000,
    membership_start_date: '2025-04-10',
    created_at: '2025-04-10T11:30:00Z',
    updated_at: '2025-04-10T11:30:00Z',
  },
  {
    id: 'c3d4e5f6-a1b2-4c3d-8e4f-5a6b7c8d9e0f',
    member_no: 'CPR-0003',
    full_name: 'Dr. Mahmudul Hasan',
    bmdc_no: 'A-38741',
    phone: '+880 1911-345678',
    joined_on: '2024-06-01',
    // Expired 25 days ago
    expires_on: (() => {
      const d = new Date();
      d.setDate(d.getDate() - 25);
      return d.toISOString().split('T')[0];
    })(),
    is_active: true,
    photo_url: '',
    notes: 'FCPS Part-II candidate in Internal Medicine. Pending renewal notification.',
    monthly_fee: 2000,
    membership_months: 6,
    total_payable: 12000,
    membership_start_date: '2024-06-01',
    created_at: '2024-06-01T09:15:00Z',
    updated_at: '2024-06-01T09:15:00Z',
  },
  {
    id: 'd4e5f6a1-b2c3-4d4e-9f5a-6b7c8d9e0f1a',
    member_no: 'CPR-0004',
    full_name: 'Dr. Shahnaz Parvin',
    bmdc_no: 'A-61294',
    phone: '+880 1845-678901',
    joined_on: '2025-02-01',
    expires_on: '2026-12-31',
    is_active: false,
    photo_url: '',
    notes: 'Currently on clinical fellowship in Singapore; membership suspended temporarily at member request.',
    monthly_fee: 2000,
    membership_months: 12,
    total_payable: 24000,
    membership_start_date: '2025-02-01',
    created_at: '2025-02-01T14:00:00Z',
    updated_at: '2025-08-10T10:00:00Z',
  },
  {
    id: 'e5f6a1b2-c3d4-4e5f-aa6b-7c8d9e0f1a2b',
    member_no: 'CPR-0005',
    full_name: 'Dr. Ariful Hoque',
    bmdc_no: 'A-49302',
    phone: '+880 1610-123456',
    joined_on: '2025-08-20',
    expires_on: '2027-08-20',
    is_active: true,
    photo_url: '',
    notes: 'Medical Officer, Emergency Wing. Study cubicle access approved.',
    monthly_fee: 2000,
    membership_months: 24,
    total_payable: 48000,
    membership_start_date: '2025-08-20',
    created_at: '2025-08-20T16:20:00Z',
    updated_at: '2025-08-20T16:20:00Z',
  },
];

const INITIAL_RENEWALS_SEED: MembershipRenewal[] = [
  {
    id: 'r1-2c3d4e5-f6a1-4b2c-9d3e-4f5a6b7c8d9e',
    member_id: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
    previous_expiry_date: '2026-01-15',
    new_expiry_date: '2027-06-30',
    renewed_at: '2026-01-10T09:30:00Z',
    renewed_by_email: 'cprmedicalacademy@gmail.com',
    member_name: 'Dr. Tariqul Islam',
    member_no: 'CPR-0001',
  },
];

const INITIAL_PAYMENTS_SEED: Payment[] = [
  {
    id: 'p1-a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
    receipt_no: 'CPR-RCP-000001',
    member_id: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
    amount: 24000,
    payment_date: '2025-01-15',
    payment_method: 'Bank',
    transaction_reference: 'IBBL-TRX-94821',
    notes: 'Initial 12 months membership payment at admission.',
    recorded_by_email: 'cprmedicalacademy@gmail.com',
    member_name: 'Dr. Tariqul Islam',
    member_no: 'CPR-0001',
    created_at: '2025-01-15T10:15:00Z',
  },
  {
    id: 'p2-a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
    receipt_no: 'CPR-RCP-000002',
    member_id: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
    amount: 12000,
    payment_date: '2026-01-10',
    payment_method: 'Mobile Banking',
    transaction_reference: 'bKash: 9K8A27M01',
    notes: 'Membership renewal payment for 6 additional months.',
    recorded_by_email: 'cprmedicalacademy@gmail.com',
    member_name: 'Dr. Tariqul Islam',
    member_no: 'CPR-0001',
    created_at: '2026-01-10T09:35:00Z',
  },
  {
    id: 'p3-b2c3d4e5-f6a1-4b2c-9d3e-4f5a6b7c8d9e',
    receipt_no: 'CPR-RCP-000003',
    member_id: 'b2c3d4e5-f6a1-4b2c-9d3e-4f5a6b7c8d9e',
    amount: 5000,
    payment_date: '2025-04-10',
    payment_method: 'Cash',
    transaction_reference: 'Counter Cash Desk #1',
    notes: 'Partial payment on registration. Remaining due: ৳7,000.',
    recorded_by_email: 'cprmedicalacademy@gmail.com',
    member_name: 'Dr. Nusrat Jahan',
    member_no: 'CPR-0002',
    created_at: '2025-04-10T11:45:00Z',
  },
  {
    id: 'p4-c3d4e5f6-a1b2-4c3d-8e4f-5a6b7c8d9e0f',
    receipt_no: 'CPR-RCP-000004',
    member_id: 'c3d4e5f6-a1b2-4c3d-8e4f-5a6b7c8d9e0f',
    amount: 12000,
    payment_date: '2024-06-01',
    payment_method: 'Mobile Banking',
    transaction_reference: 'Nagad: 01811345678',
    notes: 'Paid in full for 6 months term.',
    recorded_by_email: 'cprmedicalacademy@gmail.com',
    member_name: 'Dr. Mahmudul Hasan',
    member_no: 'CPR-0003',
    created_at: '2024-06-01T09:30:00Z',
  },
  {
    id: 'p5-e5f6a1b2-c3d4-4e5f-aa6b-7c8d9e0f1a2b',
    receipt_no: 'CPR-RCP-000005',
    member_id: 'e5f6a1b2-c3d4-4e5f-aa6b-7c8d9e0f1a2b',
    amount: 24000,
    payment_date: getTodayIsoDate(),
    payment_method: 'Cash',
    transaction_reference: 'Desk Receipt #882',
    notes: 'First installment of 24 months membership term.',
    recorded_by_email: 'cprmedicalacademy@gmail.com',
    member_name: 'Dr. Ariful Hoque',
    member_no: 'CPR-0005',
    created_at: new Date().toISOString(),
  },
];

// Helper to access LocalStorage cache
function getLocalMembers(): Member[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MEMBERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(INITIAL_MEMBERS_SEED));
      return INITIAL_MEMBERS_SEED;
    }
    const parsed = JSON.parse(raw);
    // Ensure fee fields exist on legacy records
    return parsed.map((m: any) => ({
      ...m,
      monthly_fee: m.monthly_fee ?? 2000,
      membership_months: m.membership_months ?? 12,
      total_payable: m.total_payable ?? (m.monthly_fee ?? 2000) * (m.membership_months ?? 12),
    }));
  } catch {
    return INITIAL_MEMBERS_SEED;
  }
}

function saveLocalMembers(members: Member[]): void {
  localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(members));
}

function getLocalRenewals(): MembershipRenewal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RENEWALS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_RENEWALS, JSON.stringify(INITIAL_RENEWALS_SEED));
      return INITIAL_RENEWALS_SEED;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_RENEWALS_SEED;
  }
}

function saveLocalRenewals(renewals: MembershipRenewal[]): void {
  localStorage.setItem(STORAGE_KEY_RENEWALS, JSON.stringify(renewals));
}

function getLocalPayments(): Payment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PAYMENTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_PAYMENTS, JSON.stringify(INITIAL_PAYMENTS_SEED));
      return INITIAL_PAYMENTS_SEED;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_PAYMENTS_SEED;
  }
}

function saveLocalPayments(payments: Payment[]): void {
  localStorage.setItem(STORAGE_KEY_PAYMENTS, JSON.stringify(payments));
}

export class DataService {
  /**
   * Determine the next available Member ID (e.g., CPR-0006)
   */
  static async getNextMemberId(): Promise<string> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client.rpc('get_next_member_no');
        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn('Supabase get_next_member_no rpc failed, falling back:', err);
      }
    }

    const members = await this.getAllMembers();
    let maxId = 0;
    for (const m of members) {
      const match = m.member_no.match(/CPR-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxId) maxId = num;
      }
    }
    const nextNum = maxId + 1;
    return `CPR-${String(nextNum).padStart(4, '0')}`;
  }

  /**
   * Determine the next sequential Receipt Number (e.g. CPR-RCP-000006)
   */
  static async getNextReceiptNo(): Promise<string> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client.rpc('get_next_receipt_no');
        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn('Supabase get_next_receipt_no rpc failed, falling back:', err);
      }
    }

    const payments = getLocalPayments();
    let maxNum = 0;
    for (const p of payments) {
      const match = p.receipt_no.match(/CPR-RCP-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    const nextNum = maxNum + 1;
    return `CPR-RCP-${String(nextNum).padStart(6, '0')}`;
  }

  /**
   * Fetch all members with optional search and filters
   */
  static async getAllMembers(params?: {
    search?: string;
    statusFilter?: 'ALL' | 'ACTIVE' | 'EXPIRED' | 'INACTIVE' | 'EXPIRING_30';
  }): Promise<Member[]> {
    let members: Member[] = [];
    const client = getSupabaseClient();

    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client
          .from('members')
          .select('*')
          .order('member_no', { ascending: true });

        if (!error && data) {
          members = (data as any[]).map((m) => ({
            ...m,
            monthly_fee: Number(m.monthly_fee ?? 2000),
            membership_months: Number(m.membership_months ?? 12),
            total_payable: Number(m.total_payable ?? (Number(m.monthly_fee ?? 2000) * Number(m.membership_months ?? 12))),
          })) as Member[];
        } else {
          members = getLocalMembers();
        }
      } catch (err) {
        console.warn('Supabase query error, using local cache:', err);
        members = getLocalMembers();
      }
    } else {
      members = getLocalMembers();
    }

    let filtered = [...members];

    if (params?.search) {
      const query = params.search.toLowerCase().trim();
      filtered = filtered.filter(
        (m) =>
          m.full_name.toLowerCase().includes(query) ||
          m.member_no.toLowerCase().includes(query) ||
          (m.bmdc_no && m.bmdc_no.toLowerCase().includes(query)) ||
          (m.phone && m.phone.toLowerCase().includes(query))
      );
    }

    if (params?.statusFilter && params.statusFilter !== 'ALL') {
      filtered = filtered.filter((m) => {
        const status = calculateMembershipStatus(m.expires_on, m.is_active);
        if (params.statusFilter === 'EXPIRING_30') {
          return status === 'ACTIVE' && getDaysRemaining(m.expires_on) >= 0 && getDaysRemaining(m.expires_on) <= 30;
        }
        return status === params.statusFilter;
      });
    }

    return filtered;
  }

  /**
   * Get single member by ID
   */
  static async getMemberById(id: string): Promise<Member | null> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client
          .from('members')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) {
          return {
            ...data,
            monthly_fee: Number(data.monthly_fee ?? 2000),
            membership_months: Number(data.membership_months ?? 12),
            total_payable: Number(data.total_payable ?? (Number(data.monthly_fee ?? 2000) * Number(data.membership_months ?? 12))),
          } as Member;
        }
      } catch (err) {
        console.warn('Error fetching member by id from Supabase:', err);
      }
    }

    const local = getLocalMembers();
    return local.find((m) => m.id === id) || null;
  }

  /**
   * Create a new member with optional initial fee payment
   */
  static async createMember(
    member: Omit<Member, 'id' | 'created_at' | 'updated_at'> & {
      id?: string;
      initial_payment_amount?: number;
      initial_payment_method?: string;
      initial_payment_reference?: string;
      admin_email?: string;
    }
  ): Promise<{ success: boolean; data?: Member; payment?: Payment; error?: string }> {
    if (!member.full_name?.trim()) {
      return { success: false, error: 'Full name is required.' };
    }
    if (!member.member_no?.trim()) {
      return { success: false, error: 'Member ID is required.' };
    }
    if (!member.expires_on) {
      return { success: false, error: 'Expiry date is required.' };
    }

    const allMembers = await this.getAllMembers();
    const existing = allMembers.find(
      (m) => m.member_no.trim().toLowerCase() === member.member_no.trim().toLowerCase()
    );
    if (existing) {
      return {
        success: false,
        error: `Member ID "${member.member_no}" already exists in the system. Please use a unique ID.`,
      };
    }

    const monthlyFee = Number(member.monthly_fee) || 2000;
    const durationMonths = Number(member.membership_months) || 12;
    const totalPayable = Number(member.total_payable) || monthlyFee * durationMonths;

    const newRecord: Member = {
      id: member.id || crypto.randomUUID(),
      member_no: member.member_no.trim().toUpperCase(),
      full_name: member.full_name.trim(),
      photo_url: member.photo_url || '',
      bmdc_no: member.bmdc_no?.trim() || '',
      phone: member.phone?.trim() || '',
      joined_on: member.joined_on || getTodayIsoDate(),
      expires_on: member.expires_on,
      is_active: member.is_active ?? true,
      notes: member.notes?.trim() || '',
      monthly_fee: monthlyFee,
      membership_months: durationMonths,
      total_payable: totalPayable,
      membership_start_date: member.joined_on || getTodayIsoDate(),
      membership_end_date: member.expires_on,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let initialPaymentRecord: Payment | undefined;

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client
          .from('members')
          .insert(newRecord)
          .select()
          .single();

        if (error) {
          return { success: false, error: error.message };
        }

        const createdMember = data as Member;
        const local = getLocalMembers();
        saveLocalMembers([createdMember, ...local]);

        // If an initial payment amount was provided
        if (member.initial_payment_amount && member.initial_payment_amount > 0) {
          const receiptNo = await this.getNextReceiptNo();
          const payRes = await this.createPayment({
            member_id: createdMember.id,
            amount: member.initial_payment_amount,
            payment_date: member.joined_on || getTodayIsoDate(),
            payment_method: (member.initial_payment_method as any) || 'Cash',
            transaction_reference: member.initial_payment_reference,
            notes: 'Initial registration payment',
            recorded_by_email: member.admin_email || 'Administrator',
          });
          if (payRes.success) {
            initialPaymentRecord = payRes.data;
          }
        }

        return { success: true, data: createdMember, payment: initialPaymentRecord };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to insert member to Supabase.' };
      }
    }

    // Local storage path
    const local = getLocalMembers();
    saveLocalMembers([newRecord, ...local]);

    if (member.initial_payment_amount && member.initial_payment_amount > 0) {
      const receiptNo = await this.getNextReceiptNo();
      const payRes = await this.createPayment({
        member_id: newRecord.id,
        amount: member.initial_payment_amount,
        payment_date: newRecord.joined_on,
        payment_method: (member.initial_payment_method as any) || 'Cash',
        transaction_reference: member.initial_payment_reference,
        notes: 'Initial registration payment',
        recorded_by_email: member.admin_email || 'Administrator',
      });
      if (payRes.success) {
        initialPaymentRecord = payRes.data;
      }
    }

    return { success: true, data: newRecord, payment: initialPaymentRecord };
  }

  /**
   * Update an existing member
   */
  static async updateMember(
    id: string,
    updates: Partial<Omit<Member, 'id' | 'created_at'>>
  ): Promise<{ success: boolean; data?: Member; error?: string }> {
    const client = getSupabaseClient();
    const nowIso = new Date().toISOString();

    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client
          .from('members')
          .update({
            ...updates,
            updated_at: nowIso,
          })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          return { success: false, error: error.message };
        }
        const local = getLocalMembers();
        const index = local.findIndex((m) => m.id === id);
        if (index !== -1) {
          local[index] = data as Member;
          saveLocalMembers(local);
        }
        return { success: true, data: data as Member };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to update member in Supabase.' };
      }
    }

    const local = getLocalMembers();
    const index = local.findIndex((m) => m.id === id);
    if (index === -1) {
      return { success: false, error: 'Member not found.' };
    }

    local[index] = {
      ...local[index],
      ...updates,
      updated_at: nowIso,
    };
    saveLocalMembers(local);
    return { success: true, data: local[index] };
  }

  /**
   * Renew a membership with audit log
   */
  static async renewMembership(
    memberId: string,
    newExpiryDate: string,
    adminEmail?: string,
    additionalMonths?: number
  ): Promise<{ success: boolean; error?: string }> {
    const member = await this.getMemberById(memberId);
    if (!member) {
      return { success: false, error: 'Member not found.' };
    }

    const previousExpiry = member.expires_on;
    const renewalRecord: MembershipRenewal = {
      id: crypto.randomUUID(),
      member_id: memberId,
      previous_expiry_date: previousExpiry,
      new_expiry_date: newExpiryDate,
      renewed_at: new Date().toISOString(),
      renewed_by_email: adminEmail || 'Administrator',
      member_name: member.full_name,
      member_no: member.member_no,
    };

    // Update billing total_payable if additional months added
    const addMonths = additionalMonths || 12;
    const updatedMonths = (member.membership_months || 0) + addMonths;
    const updatedTotalPayable = (member.total_payable || 0) + (member.monthly_fee || 2000) * addMonths;

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { error: updateError } = await client
          .from('members')
          .update({
            expires_on: newExpiryDate,
            is_active: true,
            membership_months: updatedMonths,
            total_payable: updatedTotalPayable,
            updated_at: new Date().toISOString(),
          })
          .eq('id', memberId);

        if (updateError) {
          return { success: false, error: updateError.message };
        }

        await client.from('membership_renewals').insert({
          id: renewalRecord.id,
          member_id: memberId,
          previous_expiry_date: previousExpiry,
          new_expiry_date: newExpiryDate,
          renewed_at: renewalRecord.renewed_at,
          renewed_by_email: renewalRecord.renewed_by_email,
        });

        const localMembers = getLocalMembers();
        const mIndex = localMembers.findIndex((m) => m.id === memberId);
        if (mIndex !== -1) {
          localMembers[mIndex].expires_on = newExpiryDate;
          localMembers[mIndex].is_active = true;
          localMembers[mIndex].membership_months = updatedMonths;
          localMembers[mIndex].total_payable = updatedTotalPayable;
          localMembers[mIndex].updated_at = new Date().toISOString();
          saveLocalMembers(localMembers);
        }

        const localRenewals = getLocalRenewals();
        saveLocalRenewals([renewalRecord, ...localRenewals]);

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to renew membership in Supabase.' };
      }
    }

    const localMembers = getLocalMembers();
    const mIndex = localMembers.findIndex((m) => m.id === memberId);
    if (mIndex !== -1) {
      localMembers[mIndex].expires_on = newExpiryDate;
      localMembers[mIndex].is_active = true;
      localMembers[mIndex].membership_months = updatedMonths;
      localMembers[mIndex].total_payable = updatedTotalPayable;
      localMembers[mIndex].updated_at = new Date().toISOString();
      saveLocalMembers(localMembers);
    }

    const localRenewals = getLocalRenewals();
    saveLocalRenewals([renewalRecord, ...localRenewals]);

    return { success: true };
  }

  /**
   * Delete member with confirmation
   */
  static async deleteMember(id: string): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { error } = await client.from('members').delete().eq('id', id);
        if (error) {
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to delete member in Supabase.' };
      }
    }

    const local = getLocalMembers().filter((m) => m.id !== id);
    saveLocalMembers(local);

    const renewals = getLocalRenewals().filter((r) => r.member_id !== id);
    saveLocalRenewals(renewals);

    const payments = getLocalPayments().filter((p) => p.member_id !== id);
    saveLocalPayments(payments);

    return { success: true };
  }

  /**
   * Toggle active state
   */
  static async toggleMemberActive(id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
    return this.updateMember(id, { is_active: isActive });
  }

  /**
   * ==========================================
   * PAYMENT & MONEY RECEIPT SYSTEM
   * ==========================================
   */

  /**
   * Record a new payment for a member and generate an official Money Receipt
   */
  static async createPayment(params: {
    member_id: string;
    amount: number;
    payment_date: string;
    payment_method: 'Cash' | 'Bank' | 'Mobile Banking' | 'Other';
    transaction_reference?: string;
    notes?: string;
    recorded_by_email?: string;
  }): Promise<{ success: boolean; data?: Payment; error?: string }> {
    if (!params.amount || params.amount <= 0) {
      return { success: false, error: 'Payment amount must be greater than zero.' };
    }

    const member = await this.getMemberById(params.member_id);
    if (!member) {
      return { success: false, error: 'Member not found.' };
    }

    const receiptNo = await this.getNextReceiptNo();

    const paymentRecord: Payment = {
      id: crypto.randomUUID(),
      receipt_no: receiptNo,
      member_id: params.member_id,
      amount: Number(params.amount),
      payment_date: params.payment_date || getTodayIsoDate(),
      payment_method: params.payment_method || 'Cash',
      transaction_reference: params.transaction_reference?.trim() || '',
      notes: params.notes?.trim() || '',
      recorded_by_email: params.recorded_by_email || 'Administrator',
      member_name: member.full_name,
      member_no: member.member_no,
      created_at: new Date().toISOString(),
    };

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client
          .from('payments')
          .insert({
            id: paymentRecord.id,
            receipt_no: paymentRecord.receipt_no,
            member_id: paymentRecord.member_id,
            amount: paymentRecord.amount,
            payment_date: paymentRecord.payment_date,
            payment_method: paymentRecord.payment_method,
            transaction_reference: paymentRecord.transaction_reference,
            notes: paymentRecord.notes,
            recorded_by_email: paymentRecord.recorded_by_email,
          })
          .select()
          .single();

        if (error) {
          return { success: false, error: error.message };
        }

        const local = getLocalPayments();
        saveLocalPayments([paymentRecord, ...local]);

        return { success: true, data: paymentRecord };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to record payment in Supabase.' };
      }
    }

    // Local storage path
    const local = getLocalPayments();
    saveLocalPayments([paymentRecord, ...local]);
    return { success: true, data: paymentRecord };
  }

  /**
   * Get all payments made by a specific member
   */
  static async getPaymentsByMemberId(memberId: string): Promise<Payment[]> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client
          .from('payments')
          .select('*, members(full_name, member_no)')
          .eq('member_id', memberId)
          .order('payment_date', { ascending: false });

        if (!error && data) {
          return data.map((p: any) => ({
            id: p.id,
            receipt_no: p.receipt_no,
            member_id: p.member_id,
            amount: Number(p.amount),
            payment_date: p.payment_date,
            payment_method: p.payment_method,
            transaction_reference: p.transaction_reference,
            notes: p.notes,
            recorded_by_email: p.recorded_by_email,
            created_at: p.created_at,
            member_name: p.members?.full_name,
            member_no: p.members?.member_no,
          }));
        }
      } catch (err) {
        console.warn('Supabase payments query failed:', err);
      }
    }

    const local = getLocalPayments();
    return local
      .filter((p) => p.member_id === memberId)
      .sort((a, b) => b.payment_date.localeCompare(a.payment_date));
  }

  /**
   * Get all payments across the entire library with optional filters
   */
  static async getAllPayments(params?: {
    search?: string;
    method?: string;
  }): Promise<Payment[]> {
    let payments: Payment[] = [];
    const client = getSupabaseClient();

    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client
          .from('payments')
          .select('*, members(full_name, member_no)')
          .order('created_at', { ascending: false });

        if (!error && data) {
          payments = data.map((p: any) => ({
            id: p.id,
            receipt_no: p.receipt_no,
            member_id: p.member_id,
            amount: Number(p.amount),
            payment_date: p.payment_date,
            payment_method: p.payment_method,
            transaction_reference: p.transaction_reference,
            notes: p.notes,
            recorded_by_email: p.recorded_by_email,
            created_at: p.created_at,
            member_name: p.members?.full_name || 'Member',
            member_no: p.members?.member_no || 'CPR-XXXX',
          }));
        } else {
          payments = getLocalPayments();
        }
      } catch (err) {
        console.warn('Supabase getAllPayments error:', err);
        payments = getLocalPayments();
      }
    } else {
      payments = getLocalPayments();
    }

    // Attach latest member details if missing
    const allMembers = await this.getAllMembers();
    const memberMap = new Map(allMembers.map((m) => [m.id, m]));

    const enriched = payments.map((p) => {
      const m = memberMap.get(p.member_id);
      return {
        ...p,
        member_name: p.member_name || m?.full_name || 'Doctor Member',
        member_no: p.member_no || m?.member_no || 'CPR-XXXX',
      };
    });

    let filtered = [...enriched];

    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.receipt_no.toLowerCase().includes(q) ||
          (p.member_name && p.member_name.toLowerCase().includes(q)) ||
          (p.member_no && p.member_no.toLowerCase().includes(q)) ||
          p.payment_date.includes(q) ||
          (p.transaction_reference && p.transaction_reference.toLowerCase().includes(q))
      );
    }

    if (params?.method && params.method !== 'ALL') {
      filtered = filtered.filter((p) => p.payment_method === params.method);
    }

    return filtered;
  }

  /**
   * Get fee summary and breakdown for a member
   */
  static async getMemberFeeSummary(memberId: string): Promise<MemberFeeSummary | null> {
    const member = await this.getMemberById(memberId);
    if (!member) return null;

    const payments = await this.getPaymentsByMemberId(memberId);
    const monthlyFee = member.monthly_fee || 2000;
    const months = member.membership_months || 12;
    const totalPayable = member.total_payable || monthlyFee * months;

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remainingDue = Math.max(0, totalPayable - totalPaid);

    let status: PaymentStatus = 'DUE';
    if (totalPaid >= totalPayable) {
      status = 'PAID';
    } else if (totalPaid > 0) {
      status = 'PARTIAL';
    }

    return {
      member_id: member.id,
      member_no: member.member_no,
      full_name: member.full_name,
      monthly_fee: monthlyFee,
      membership_months: months,
      total_payable: totalPayable,
      total_paid: totalPaid,
      remaining_due: remainingDue,
      payment_status: status,
      last_payment_date: payments.length > 0 ? payments[0].payment_date : undefined,
      membership_start_date: member.joined_on,
      membership_end_date: member.expires_on,
      payments,
    };
  }

  /**
   * Public QR Verification Query.
   * STRICT SECURITY & PRIVACY REQUIREMENT:
   * Returns ONLY public metadata (institution, member_no, full_name, photo, joined_on, expires_on, status, is_valid).
   * NEVER exposes phone, BMDC number, internal notes, fees, payments, or dues!
   */
  static async getPublicVerification(memberUuid: string): Promise<PublicMemberVerification | null> {
    const client = getSupabaseClient();

    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client.rpc('get_public_member_verification', {
          member_uuid: memberUuid,
        });

        if (!error && data && data.length > 0) {
          const row = data[0];
          return {
            id: row.id,
            member_no: row.member_no,
            full_name: row.full_name,
            photo_url: row.photo_url || '',
            joined_on: row.joined_on,
            expires_on: row.expires_on,
            is_active: Boolean(row.is_active),
            status: row.status as MembershipStatus,
            is_valid: Boolean(row.is_valid),
            institution: 'CPR Reading Library',
            branch: 'Chattogram, Bangladesh',
            verified_at: row.verified_at || new Date().toISOString(),
          };
        }
      } catch (err) {
        console.warn('RPC call failed, checking fallback:', err);
      }
    }

    const local = getLocalMembers();
    const found = local.find((m) => m.id === memberUuid);
    if (!found) {
      return null;
    }

    const status = calculateMembershipStatus(found.expires_on, found.is_active);
    const isValid = status === 'ACTIVE';

    return {
      id: found.id,
      member_no: found.member_no,
      full_name: found.full_name,
      photo_url: found.photo_url || '',
      joined_on: found.joined_on,
      expires_on: found.expires_on,
      is_active: found.is_active,
      status,
      is_valid: isValid,
      institution: 'CPR Reading Library',
      branch: 'Chattogram, Bangladesh',
      verified_at: new Date().toISOString(),
    };
  }

  /**
   * Get audit history of all renewals
   */
  static async getAllRenewals(): Promise<MembershipRenewal[]> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client
          .from('membership_renewals')
          .select('*, members(full_name, member_no)')
          .order('renewed_at', { ascending: false });

        if (!error && data) {
          return data.map((r: any) => ({
            id: r.id,
            member_id: r.member_id,
            previous_expiry_date: r.previous_expiry_date,
            new_expiry_date: r.new_expiry_date,
            renewed_at: r.renewed_at,
            renewed_by_email: r.renewed_by_email || 'Administrator',
            member_name: r.members?.full_name || 'Member',
            member_no: r.members?.member_no || 'CPR-XXXX',
          }));
        }
      } catch (err) {
        console.warn('Supabase renewals query failed:', err);
      }
    }

    return getLocalRenewals();
  }

  /**
   * Dashboard statistics summary with Financial Metrics
   */
  static async getDashboardStats(): Promise<DashboardStats> {
    const members = await this.getAllMembers();
    const renewals = await this.getAllRenewals();
    const payments = await this.getAllPayments();

    let active = 0;
    let expired = 0;
    let inactive = 0;
    let expiring30 = 0;
    let totalExpectedFees = 0;

    for (const m of members) {
      const status = calculateMembershipStatus(m.expires_on, m.is_active);
      if (status === 'INACTIVE') {
        inactive++;
      } else if (status === 'EXPIRED') {
        expired++;
      } else {
        active++;
        const days = getDaysRemaining(m.expires_on);
        if (days >= 0 && days <= 30) {
          expiring30++;
        }
      }

      const payable = m.total_payable || (m.monthly_fee || 2000) * (m.membership_months || 12);
      totalExpectedFees += payable;
    }

    const currentYearMonth = getTodayIsoDate().substring(0, 7);
    const renewalsThisMonth = renewals.filter((r) =>
      r.renewed_at.startsWith(currentYearMonth)
    ).length;

    // Financial Metrics
    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalOutstandingDues = Math.max(0, totalExpectedFees - totalCollected);

    const todayStr = getTodayIsoDate();
    const paymentsReceivedToday = payments
      .filter((p) => p.payment_date === todayStr)
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      totalMembers: members.length,
      activeMembers: active,
      expiredMembers: expired,
      inactiveMembers: inactive,
      expiringIn30Days: expiring30,
      renewalsThisMonth,
      totalExpectedFees,
      totalCollected,
      totalOutstandingDues,
      paymentsReceivedToday,
    };
  }

  /**
   * Reset local database to default seed
   */
  static resetLocalData(): void {
    localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(INITIAL_MEMBERS_SEED));
    localStorage.setItem(STORAGE_KEY_RENEWALS, JSON.stringify(INITIAL_RENEWALS_SEED));
    localStorage.setItem(STORAGE_KEY_PAYMENTS, JSON.stringify(INITIAL_PAYMENTS_SEED));
  }
}
