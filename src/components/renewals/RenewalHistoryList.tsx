import React, { useEffect, useState } from 'react';
import { MembershipRenewal } from '../../types';
import { DataService } from '../../services/dataService';
import { formatBdDate, formatBdDateTime } from '../../lib/dateUtils';
import { History, Search, Download, RefreshCw, Calendar, ArrowRight } from 'lucide-react';

export const RenewalHistoryList: React.FC = () => {
  const [renewals, setRenewals] = useState<MembershipRenewal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await DataService.getAllRenewals();
      setRenewals(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = renewals.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.member_name && r.member_name.toLowerCase().includes(q)) ||
      (r.member_no && r.member_no.toLowerCase().includes(q)) ||
      (r.renewed_by_email && r.renewed_by_email.toLowerCase().includes(q))
    );
  });

  const handleExportCsv = () => {
    const headers = ['Member Name', 'Member ID', 'Previous Expiry', 'New Expiry', 'Renewed Date & Time', 'Authorized By'];
    const rows = filtered.map((r) => [
      `"${(r.member_name || '').replace(/"/g, '""')}"`,
      r.member_no || '',
      r.previous_expiry_date,
      r.new_expiry_date,
      r.renewed_at,
      r.renewed_by_email || 'Admin',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const a = document.createElement('a');
    a.href = encoded;
    a.download = `cpr_renewals_audit_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Membership Renewal Audit History
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographic and timestamped audit logs of all membership extensions performed by administrators.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            title="Refresh"
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Audit Log</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter renewal records by Doctor name, Member ID, or admin email..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Doctor Member</th>
                <th className="py-3 px-3">Member ID</th>
                <th className="py-3 px-3">Previous Expiry</th>
                <th className="py-3 px-3">New Expiry Date</th>
                <th className="py-3 px-3">Renewed On</th>
                <th className="py-3 px-4 text-right">Authorized Administrator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading renewal logs...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No renewal audit records found.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {item.member_name || 'Doctor Member'}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-800">
                      {item.member_no || 'CPR-XXXX'}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 line-through">
                      {formatBdDate(item.previous_expiry_date, 'short')}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 font-mono font-bold text-emerald-950">
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{formatBdDate(item.new_expiry_date, 'short')}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {formatBdDateTime(item.renewed_at)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-600">
                      {item.renewed_by_email || 'Administrator'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
