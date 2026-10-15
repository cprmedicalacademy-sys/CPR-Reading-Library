import React, { useEffect, useState, useMemo } from 'react';
import { Payment } from '../../types';
import { DataService } from '../../services/dataService';
import { formatBdDate } from '../../lib/dateUtils';
import { formatTaka } from '../../lib/numberWords';
import {
  Receipt,
  Search,
  Printer,
  Download,
  RefreshCw,
  CreditCard,
  Building,
  User,
  Filter,
} from 'lucide-react';

interface PaymentHistoryViewProps {
  onPrintReceipt: (payment: Payment) => void;
  onOpenMemberProfile?: (memberId: string) => void;
}

export const PaymentHistoryView: React.FC<PaymentHistoryViewProps> = ({
  onPrintReceipt,
  onOpenMemberProfile,
}) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await DataService.getAllPayments();
      setPayments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    let result = [...payments];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.receipt_no.toLowerCase().includes(q) ||
          (p.member_name && p.member_name.toLowerCase().includes(q)) ||
          (p.member_no && p.member_no.toLowerCase().includes(q)) ||
          p.payment_date.includes(q) ||
          (p.transaction_reference && p.transaction_reference.toLowerCase().includes(q))
      );
    }

    if (methodFilter !== 'ALL') {
      result = result.filter((p) => p.payment_method === methodFilter);
    }

    return result;
  }, [payments, search, methodFilter]);

  const totalAmountFiltered = filtered.reduce((sum, p) => sum + p.amount, 0);

  const handleExportCsv = () => {
    const headers = [
      'Receipt No',
      'Member Name',
      'Member ID',
      'Payment Date',
      'Amount (BDT)',
      'Payment Method',
      'Transaction Reference',
      'Recorded By',
    ];
    const rows = filtered.map((p) => [
      p.receipt_no,
      `"${(p.member_name || '').replace(/"/g, '""')}"`,
      p.member_no || '',
      p.payment_date,
      p.amount,
      p.payment_method,
      `"${(p.transaction_reference || '').replace(/"/g, '""')}"`,
      p.recorded_by_email || 'Admin',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const a = document.createElement('a');
    a.href = encoded;
    a.download = `cpr_receipts_ledger_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900">
              Payment History & Money Receipts
            </h1>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {payments.length} Receipts
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete transaction ledger of all doctor membership payments and official A4 dual-copy money receipts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Filtered:</span>
            <span className="text-sm font-bold font-mono text-emerald-950">
              {formatTaka(totalAmountFiltered)}
            </span>
          </div>

          <button
            onClick={loadData}
            title="Refresh payments"
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Doctor Name, Member ID, Receipt No (CPR-RCP-000001), or Date..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-medium"
          />
        </div>

        {/* Method Filter Segmented Control */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs shrink-0">
          {[
            { id: 'ALL', label: 'All Methods' },
            { id: 'Cash', label: 'Cash' },
            { id: 'Mobile Banking', label: 'Mobile Banking' },
            { id: 'Bank', label: 'Bank' },
            { id: 'Other', label: 'Other' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setMethodFilter(item.id)}
              className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                methodFilter === item.id
                  ? 'bg-white text-emerald-950 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                <th className="py-3 px-4">Receipt No</th>
                <th className="py-3 px-3">Doctor Member</th>
                <th className="py-3 px-3">Member ID</th>
                <th className="py-3 px-3">Payment Date</th>
                <th className="py-3 px-3">Method & Reference</th>
                <th className="py-3 px-3 text-right">Amount (BDT)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading payments ledger...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No payment records found matching the search criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    {/* Receipt No */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {p.receipt_no}
                    </td>

                    {/* Member Name */}
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {onOpenMemberProfile ? (
                        <button
                          onClick={() => onOpenMemberProfile(p.member_id)}
                          className="hover:text-emerald-900 hover:underline text-left"
                        >
                          {p.member_name}
                        </button>
                      ) : (
                        p.member_name
                      )}
                    </td>

                    {/* Member ID */}
                    <td className="py-3 px-3 font-mono font-semibold text-slate-700">
                      {p.member_no}
                    </td>

                    {/* Payment Date */}
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {formatBdDate(p.payment_date, 'numeric')}
                    </td>

                    {/* Method & Ref */}
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-800">{p.payment_method}</span>
                      {p.transaction_reference && (
                        <span className="block text-[10px] font-mono text-slate-400">
                          {p.transaction_reference}
                        </span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-950 text-sm">
                      {formatTaka(p.amount)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onPrintReceipt(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-900 text-amber-300 hover:bg-emerald-800 transition-colors shadow-2xs"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-300" />
                        <span>Print Receipt</span>
                      </button>
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
