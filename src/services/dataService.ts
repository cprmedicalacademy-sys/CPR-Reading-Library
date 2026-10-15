import { getDaysRemaining, calculateMembershipStatus, getTodayIsoDate } from '../lib/dateUtils';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import {
  DashboardStats,
  Member,
  MembershipRenewal,
  MembershipStatus,
  PublicMemberVerification,
} from '../types';

const STORAGE_KEY_MEMBERS = 'cpr_library_members_data';
const STORAGE_KEY_RENEWALS = 'cpr_library_renewals_data';

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

// Helper to access LocalStorage cache
function getLocalMembers(): Member[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MEMBERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(INITIAL_MEMBERS_SEED));
      return INITIAL_MEMBERS_SEED;
    }
    return JSON.parse(raw);
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

    // Fallback calculation from members list
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
          members = data as Member[];
        } else {
          console.warn('Error fetching members from Supabase, using local cache:', error);
          members = getLocalMembers();
        }
      } catch (err) {
        console.warn('Supabase query error, using local cache:', err);
        members = getLocalMembers();
      }
    } else {
      members = getLocalMembers();
    }

    // Apply filtering in memory
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

        if (!error && data) return data as Member;
      } catch (err) {
        console.warn('Error fetching member by id from Supabase:', err);
      }
    }

    const local = getLocalMembers();
    return local.find((m) => m.id === id) || null;
  }

  /**
   * Create a new member
   */
  static async createMember(
    member: Omit<Member, 'id' | 'created_at' | 'updated_at'> & { id?: string }
  ): Promise<{ success: boolean; data?: Member; error?: string }> {
    // 1. Validation
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

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
        // Also keep local synced
        const local = getLocalMembers();
        saveLocalMembers([data as Member, ...local]);
        return { success: true, data: data as Member };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to insert member to Supabase.' };
      }
    }

    // Local storage path
    const local = getLocalMembers();
    saveLocalMembers([newRecord, ...local]);
    return { success: true, data: newRecord };
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
        // Sync local
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

    // Local storage path
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
    adminEmail?: string
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

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        // 1. Update member
        const { error: updateError } = await client
          .from('members')
          .update({
            expires_on: newExpiryDate,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', memberId);

        if (updateError) {
          return { success: false, error: updateError.message };
        }

        // 2. Insert renewal log
        const { error: renewalError } = await client
          .from('membership_renewals')
          .insert({
            id: renewalRecord.id,
            member_id: memberId,
            previous_expiry_date: previousExpiry,
            new_expiry_date: newExpiryDate,
            renewed_at: renewalRecord.renewed_at,
            renewed_by_email: renewalRecord.renewed_by_email,
          });

        if (renewalError) {
          console.warn('Failed to insert renewal record in Supabase:', renewalError);
        }

        // Sync local
        const localMembers = getLocalMembers();
        const mIndex = localMembers.findIndex((m) => m.id === memberId);
        if (mIndex !== -1) {
          localMembers[mIndex].expires_on = newExpiryDate;
          localMembers[mIndex].is_active = true;
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

    // Local storage path
    const localMembers = getLocalMembers();
    const mIndex = localMembers.findIndex((m) => m.id === memberId);
    if (mIndex !== -1) {
      localMembers[mIndex].expires_on = newExpiryDate;
      localMembers[mIndex].is_active = true;
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

    return { success: true };
  }

  /**
   * Toggle active state (deactivate / reactivate)
   */
  static async toggleMemberActive(id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
    return this.updateMember(id, { is_active: isActive });
  }

  /**
   * Public QR Verification Query.
   * STRICT SECURITY & PRIVACY REQUIREMENT:
   * Returns ONLY public metadata (institution, member_no, full_name, photo, joined_on, expires_on, status, is_valid).
   * NEVER exposes phone, BMDC number, or internal notes!
   */
  static async getPublicVerification(memberUuid: string): Promise<PublicMemberVerification | null> {
    const client = getSupabaseClient();

    if (client && isSupabaseConfigured()) {
      try {
        // Secure RPC call defined in migration
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

    // Local / fallback evaluation (always sanitized)
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
   * Dashboard statistics summary
   */
  static async getDashboardStats(): Promise<DashboardStats> {
    const members = await this.getAllMembers();
    const renewals = await this.getAllRenewals();

    let active = 0;
    let expired = 0;
    let inactive = 0;
    let expiring30 = 0;

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
    }

    const currentYearMonth = getTodayIsoDate().substring(0, 7);
    const renewalsThisMonth = renewals.filter((r) =>
      r.renewed_at.startsWith(currentYearMonth)
    ).length;

    return {
      totalMembers: members.length,
      activeMembers: active,
      expiredMembers: expired,
      inactiveMembers: inactive,
      expiringIn30Days: expiring30,
      renewalsThisMonth,
    };
  }

  /**
   * Reset local database to default seed (useful for testing)
   */
  static resetLocalData(): void {
    localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(INITIAL_MEMBERS_SEED));
    localStorage.setItem(STORAGE_KEY_RENEWALS, JSON.stringify(INITIAL_RENEWALS_SEED));
  }
}
