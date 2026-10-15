import React, { useEffect, useState } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  ClockAlert,
  UserPlus,
  QrCode,
  CreditCard,
  ArrowRight,
  RefreshCw,
  Search,
} from 'lucide-react';
import { DashboardStats, Member } from '../../types';
import { DataService } from '../../services/dataService';
import { formatBdDate, getDaysRemaining } from '../../lib/dateUtils';

interface DashboardViewProps {
  onNavigate: (view: string) => void;
  onRenewMember: (member: Member) => void;
  onSelectMember: (member: Member) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onRenewMember,
  onSelectMember,
}) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeMembers: 0,
    expiredMembers: 0,
    inactiveMembers: 0,
    expiringIn30Days: 0,
    renewalsThisMonth: 0,
    totalExpectedFees: 0,
    totalCollected: 0,
    totalOutstandingDues: 0,
    paymentsReceivedToday: 0,
  });
  const [expiringMembers, setExpiringMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [quickQuery, setQuickQuery] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const dashboardStats = await DataService.getDashboardStats();
      const expiring = await DataService.getAllMembers({ statusFilter: 'EXPIRING_30' });
      setStats(dashboardStats);
      setExpiringMembers(expiring.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickQuery.trim()) {
      onNavigate(`members?search=${encodeURIComponent(quickQuery.trim())}`);
    } else {
      onNavigate('members');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
            CPR Reading Library · Chattogram Medical Community
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Library Administrator Portal
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Manage registered doctors, issue verified membership cards, and handle QR entrance validation.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:self-center shrink-0">
          <button
            onClick={() => onNavigate('add_member')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-900 text-amber-300 hover:bg-emerald-800 font-semibold text-xs transition-colors shadow-xs"
          >
            <UserPlus className="w-4 h-4 text-amber-300" />
            <span>Register Doctor</span>
          </button>
          <button
            onClick={() => onNavigate('scanner')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-100 text-slate-800 hover:bg-slate-200 font-semibold text-xs transition-colors"
          >
            <QrCode className="w-4 h-4 text-slate-700" />
            <span>Desk Scanner</span>
          </button>
          <button
            onClick={loadData}
            title="Refresh statistics"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* FINANCIAL & MEMBERSHIP KPI CARDS GRID */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Financial & Fee Collections
          </div>
          <button
            onClick={() => onNavigate('payments')}
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
          >
            <span>View All Money Receipts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Expected Fees */}
          <div
            onClick={() => onNavigate('payments')}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Expected Fees</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                ৳
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold font-mono text-slate-900 tabular-nums">
              ৳{stats.totalExpectedFees.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              <span>All active doctor membership terms</span>
            </div>
          </div>

          {/* Total Money Collected */}
          <div
            onClick={() => onNavigate('payments')}
            className="bg-white p-5 rounded-xl border border-emerald-200/90 shadow-xs hover:border-emerald-300 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-900">Total Money Collected</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                ৳
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold font-mono text-emerald-950 tabular-nums">
              ৳{stats.totalCollected.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-emerald-700">
              <span>Sum of confirmed payments</span>
            </div>
          </div>

          {/* Total Outstanding Dues */}
          <div
            onClick={() => onNavigate('members')}
            className="bg-white p-5 rounded-xl border border-amber-200/90 shadow-xs hover:border-amber-300 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-900">Outstanding Dues</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
                ৳
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold font-mono text-amber-950 tabular-nums">
              ৳{stats.totalOutstandingDues.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-amber-700">
              <span>Receivables pending collection</span>
            </div>
          </div>

          {/* Payments Received Today */}
          <div
            onClick={() => onNavigate('payments')}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Received Today</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                ৳
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold font-mono text-slate-900 tabular-nums">
              ৳{stats.paymentsReceivedToday.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              <span>Desk receipts issued today</span>
            </div>
          </div>
        </div>
      </div>

      {/* MEMBERSHIP STATUS SUMMARY STRIP */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          Doctor Registry Overview
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Members */}
          <div
            onClick={() => onNavigate('members')}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Registered</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-slate-900 tabular-nums">
              {stats.totalMembers}
            </div>
            <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">
              <span>Doctor records on file</span>
            </div>
          </div>

          {/* Active Members */}
          <div
            onClick={() => onNavigate('members')}
            className="bg-white p-5 rounded-xl border border-emerald-200/80 shadow-xs hover:border-emerald-300 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-800">Active Members</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-emerald-950 tabular-nums">
              {stats.activeMembers}
            </div>
            <div className="mt-1 text-xs text-emerald-700">
              <span>Valid entry clearance</span>
            </div>
          </div>

          {/* Expiring Soon */}
          <div
            onClick={() => onNavigate('expiring')}
            className="bg-white p-5 rounded-xl border border-amber-200/90 shadow-xs hover:border-amber-300 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-800">Expiring in ≤ 30 Days</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <ClockAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-amber-950 tabular-nums">
              {stats.expiringIn30Days}
            </div>
            <div className="mt-1 text-xs text-amber-700">
              <span>Requires renewal reminder</span>
            </div>
          </div>

          {/* Expired / Inactive */}
          <div
            onClick={() => onNavigate('members')}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Expired & Inactive</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                <UserX className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-slate-800 tabular-nums">
              {stats.expiredMembers + stats.inactiveMembers}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              <span>{stats.expiredMembers} expired · {stats.inactiveMembers} inactive</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Search & Main Operations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Expiring Memberships Action List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ClockAlert className="w-4 h-4 text-amber-600" />
                <span>Urgent: Memberships Expiring Soon</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Doctors approaching end of library membership term within 30 days
              </p>
            </div>
            <button
              onClick={() => onNavigate('expiring')}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading records...</div>
            ) : expiringMembers.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <p className="text-xs font-medium text-slate-600">
                  No memberships expiring within the next 30 days.
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  All active member accounts are currently valid for more than a month.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {expiringMembers.map((member) => {
                  const days = getDaysRemaining(member.expires_on);
                  return (
                    <div
                      key={member.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 rounded-lg px-2 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-emerald-950 text-amber-300 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-800">
                          {member.full_name.replace('Dr.', '').trim().substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <button
                            onClick={() => onSelectMember(member)}
                            className="text-xs font-bold text-slate-900 hover:text-emerald-800 truncate block text-left"
                          >
                            {member.full_name}
                          </button>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 font-mono">
                            <span className="font-semibold text-slate-700">{member.member_no}</span>
                            <span>·</span>
                            <span>Exp: {formatBdDate(member.expires_on, 'short')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                          {days === 0 ? 'Expires today' : `${days} days left`}
                        </span>
                        <button
                          onClick={() => onRenewMember(member)}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-900 text-amber-300 hover:bg-emerald-800 transition-colors shadow-2xs"
                        >
                          Renew
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Quick Search & Admin Shortcuts */}
        <div className="space-y-4">
          {/* Quick Lookup Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Quick Member Lookup
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Instant search by Name, ID (CPR-XXXX), BMDC Reg, or Phone
            </p>
            <form onSubmit={handleQuickSearch} className="mt-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={quickQuery}
                  onChange={(e) => setQuickQuery(e.target.value)}
                  placeholder="e.g. CPR-0001 or Dr. Tariqul"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                />
              </div>
              <button
                type="submit"
                className="w-full mt-2 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
              >
                Search Directory
              </button>
            </form>
          </div>

          {/* Quick Nav Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Desk Tools
            </h3>

            <button
              onClick={() => onNavigate('cards')}
              className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-emerald-800" />
                <div>
                  <div className="text-xs font-semibold text-slate-900">Print Membership Cards</div>
                  <div className="text-[10px] text-slate-500">CR80 physical ID format & PDF save</div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              onClick={() => onNavigate('scanner')}
              className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <QrCode className="w-4 h-4 text-emerald-800" />
                <div>
                  <div className="text-xs font-semibold text-slate-900">Live Entrance Verifier</div>
                  <div className="text-[10px] text-slate-500">Camera or barcode scan at reception</div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
