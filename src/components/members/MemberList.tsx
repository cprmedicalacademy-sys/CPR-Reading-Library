import React, { useEffect, useState, useMemo } from 'react';
import { Member } from '../../types';
import { DataService } from '../../services/dataService';
import { formatBdDate, calculateMembershipStatus, getDaysRemaining } from '../../lib/dateUtils';
import {
  Search,
  UserPlus,
  CreditCard,
  QrCode,
  Edit2,
  RefreshCw,
  Trash2,
  Power,
  ChevronLeft,
  ChevronRight,
  Download,
  AlertTriangle,
} from 'lucide-react';

interface MemberListProps {
  initialSearch?: string;
  initialFilter?: 'ALL' | 'ACTIVE' | 'EXPIRED' | 'INACTIVE' | 'EXPIRING_30';
  onAddMember: () => void;
  onEditMember: (member: Member) => void;
  onRenewMember: (member: Member) => void;
  onViewCard: (member: Member) => void;
  onViewQr: (member: Member) => void;
}

export const MemberList: React.FC<MemberListProps> = ({
  initialSearch = '',
  initialFilter = 'ALL',
  onAddMember,
  onEditMember,
  onRenewMember,
  onViewCard,
  onViewQr,
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>(initialSearch);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'INACTIVE' | 'EXPIRING_30'>(initialFilter);
  const [page, setPage] = useState<number>(1);
  const pageSize = 8;

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const data = await DataService.getAllMembers();
      setMembers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    if (initialFilter) setStatusFilter(initialFilter);
  }, [initialFilter]);

  // Client-side filtering & search
  const filteredMembers = useMemo(() => {
    let result = [...members];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (m) =>
          m.full_name.toLowerCase().includes(q) ||
          m.member_no.toLowerCase().includes(q) ||
          (m.bmdc_no && m.bmdc_no.toLowerCase().includes(q)) ||
          (m.phone && m.phone.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== 'ALL') {
      result = result.filter((m) => {
        const s = calculateMembershipStatus(m.expires_on, m.is_active);
        if (statusFilter === 'EXPIRING_30') {
          return s === 'ACTIVE' && getDaysRemaining(m.expires_on) >= 0 && getDaysRemaining(m.expires_on) <= 30;
        }
        return s === statusFilter;
      });
    }

    return result;
  }, [members, search, statusFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredMembers.length / pageSize) || 1;
  const paginatedMembers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredMembers.slice(start, start + pageSize);
  }, [filteredMembers, page, pageSize]);

  // Handle member toggle active
  const handleToggleActive = async (member: Member) => {
    const updatedState = !member.is_active;
    const res = await DataService.toggleMemberActive(member.id, updatedState);
    if (res.success) {
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, is_active: updatedState } : m))
      );
    }
  };

  // Handle Delete Confirmation
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await DataService.deleteMember(deleteTarget.id);
    if (res.success) {
      setMembers((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
    } else {
      alert(res.error || 'Failed to delete member.');
    }
    setDeleting(false);
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['Member ID', 'Full Name', 'BMDC Reg', 'Mobile', 'Joined Date', 'Expiry Date', 'Status', 'Notes'];
    const rows = filteredMembers.map((m) => [
      m.member_no,
      `"${m.full_name.replace(/"/g, '""')}"`,
      m.bmdc_no || '',
      m.phone || '',
      m.joined_on,
      m.expires_on,
      calculateMembershipStatus(m.expires_on, m.is_active),
      `"${(m.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cpr_library_members_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Registered Doctors Directory
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Full registry of {members.length} members with BMDC records, membership validity & physical cards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            title="Export filtered table to CSV"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={onAddMember}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-900 text-amber-300 hover:bg-emerald-800 transition-colors shadow-xs"
          >
            <UserPlus className="w-4 h-4 text-amber-300" />
            <span>Add Doctor</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by Doctor Name, Member ID (CPR-0001), BMDC No, or Mobile..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-medium"
          />
        </div>

        {/* Filter Segmented Controls */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs shrink-0">
          {[
            { id: 'ALL', label: 'All Members' },
            { id: 'ACTIVE', label: 'Active' },
            { id: 'EXPIRING_30', label: 'Expiring ≤30d' },
            { id: 'EXPIRED', label: 'Expired' },
            { id: 'INACTIVE', label: 'Inactive' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id as any);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-white text-emerald-950 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Doctor Member</th>
                <th className="py-3 px-3">Member ID</th>
                <th className="py-3 px-3">BMDC Reg</th>
                <th className="py-3 px-3">Mobile (Private)</th>
                <th className="py-3 px-3">Admission</th>
                <th className="py-3 px-3">Expiry Date</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading member directory...
                  </td>
                </tr>
              ) : paginatedMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No doctor records match the selected criteria.
                  </td>
                </tr>
              ) : (
                paginatedMembers.map((member) => {
                  const status = calculateMembershipStatus(member.expires_on, member.is_active);
                  const days = getDaysRemaining(member.expires_on);

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Name & Photo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-950 text-amber-300 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-800 overflow-hidden">
                            {member.photo_url ? (
                              <img
                                src={member.photo_url}
                                alt={member.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>
                                {member.full_name.replace('Dr.', '').trim().substring(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 group-hover:text-emerald-900">
                              {member.full_name}
                            </div>
                            {member.notes && (
                              <div className="text-[10px] text-slate-400 truncate max-w-xs">
                                {member.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Member ID */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        {member.member_no}
                      </td>

                      {/* BMDC No */}
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {member.bmdc_no || <span className="text-slate-300">—</span>}
                      </td>

                      {/* Mobile */}
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {member.phone || <span className="text-slate-300">—</span>}
                      </td>

                      {/* Admission */}
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {formatBdDate(member.joined_on, 'short')}
                      </td>

                      {/* Expiry */}
                      <td className="py-3 px-3">
                        <div className="font-mono text-slate-800 font-semibold">
                          {formatBdDate(member.expires_on, 'short')}
                        </div>
                        {status === 'ACTIVE' && days <= 30 && (
                          <div className="text-[10px] font-mono text-amber-700 font-medium">
                            {days === 0 ? 'Expires today' : `${days} days left`}
                          </div>
                        )}
                        {status === 'EXPIRED' && (
                          <div className="text-[10px] font-mono text-red-600 font-medium">
                            Expired {-days}d ago
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        {status === 'ACTIVE' && (
                          <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ACTIVE
                          </span>
                        )}
                        {status === 'EXPIRED' && (
                          <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                            EXPIRED
                          </span>
                        )}
                        {status === 'INACTIVE' && (
                          <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            INACTIVE
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onViewCard(member)}
                            title="View Printable Card"
                            className="p-1.5 text-slate-500 hover:text-emerald-900 hover:bg-emerald-50 rounded-md transition-colors"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onViewQr(member)}
                            title="View Verification QR Code"
                            className="p-1.5 text-slate-500 hover:text-emerald-900 hover:bg-emerald-50 rounded-md transition-colors"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onRenewMember(member)}
                            title="Renew Membership"
                            className="p-1.5 text-slate-500 hover:text-amber-800 hover:bg-amber-50 rounded-md transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditMember(member)}
                            title="Edit Details"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(member)}
                            title={member.is_active ? 'Deactivate Member' : 'Activate Member'}
                            className={`p-1.5 rounded-md transition-colors ${
                              member.is_active
                                ? 'text-slate-400 hover:text-amber-700 hover:bg-amber-50'
                                : 'text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(member)}
                            title="Delete Member"
                            className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing{' '}
            <strong className="text-slate-800">
              {filteredMembers.length === 0 ? 0 : (page - 1) * pageSize + 1}
            </strong>{' '}
            to{' '}
            <strong className="text-slate-800">
              {Math.min(page * pageSize, filteredMembers.length)}
            </strong>{' '}
            of <strong className="text-slate-800">{filteredMembers.length}</strong> records
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm p-5 space-y-3">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-slate-900">
                Confirm Member Removal
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently delete{' '}
                <strong className="text-slate-800">{deleteTarget.full_name}</strong> (
                <span className="font-mono">{deleteTarget.member_no}</span>)?
              </p>
              <p className="text-[11px] text-red-600 mt-1">
                This will invalidate their physical QR code and remove all renewal logs.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shadow-xs"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
