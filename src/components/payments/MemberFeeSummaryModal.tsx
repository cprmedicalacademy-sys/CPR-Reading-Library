import React, { useEffect, useState } from 'react';
import { Member, MemberFeeSummary, Payment } from '../../types';
import { DataService } from '../../services/dataService';
import { formatBdDate } from '../../lib/dateUtils';
import { formatTaka } from '../../lib/numberWords';
import {
  X,
  PlusCircle,
  Printer,
  Receipt,
  Calendar,
  CheckCircle2,
  ClockAlert,
  AlertCircle,
  Hash,
  Download,
} from 'lucide-react';

interface MemberFeeSummaryModalProps {
  isOpen: boolean;
  member: Member | null;
  onClose: () => void;
  onOpenRecordPayment: (member: Member) => void;
  onViewReceipt: (payment: Payment) => void;
}

export const MemberFeeSummaryModal: React.FC<MemberFeeSummaryModalProps> = ({
  isOpen,
  member,
  onClose,
  onOpenRecordPayment,
  onViewReceipt,
}) => {
  const [summary, setSummary] = useState<MemberFeeSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen && member) {
      setLoading(true);
      DataService.getMemberFeeSummary(member.id).then((res) => {
        setSummary(res);
        setLoading(false);
      });
    }
  }, [isOpen, member]);

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-950 text-white flex items-center justify-between border-b border-emerald-900">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                Fee & Payment Profile
              </h2>
              {summary && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    summary.payment_status === 'PAID'
                      ? 'bg-emerald-100 text-emerald-900'
                      : summary.payment_status === 'PARTIAL'
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-red-100 text-red-900'
                  }`}
                >
                  {summary.payment_status}
                </span>
              )}
            </div>
            <p className="text-xs text-amber-300 font-medium mt-0.5">
              {member.full_name} · <span className="font-mono">{member.member_no}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-xs">
          {loading || !summary ? (
            <div className="py-12 text-center text-slate-400">
              Loading member billing profile...
            </div>
          ) : (
            <>
              {/* Financial KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                    Monthly Fee
                  </span>
                  <div className="text-sm font-bold font-mono text-slate-900 mt-1">
                    {formatTaka(summary.monthly_fee)}
                  </div>
                  <span className="text-[10px] text-slate-400">Per doctor / month</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                    Total Payable
                  </span>
                  <div className="text-sm font-bold font-mono text-slate-900 mt-1">
                    {formatTaka(summary.total_payable)}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {summary.membership_months} Months Term
                  </span>
                </div>

                <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-200/80">
                  <span className="text-[10px] uppercase font-semibold text-emerald-900 block">
                    Total Paid
                  </span>
                  <div className="text-sm font-black font-mono text-emerald-950 mt-1">
                    {formatTaka(summary.total_paid)}
                  </div>
                  <span className="text-[10px] text-emerald-700 font-mono">
                    {summary.payments.length} Payments Confirmed
                  </span>
                </div>

                <div
                  className={`p-3 rounded-lg border ${
                    summary.remaining_due > 0
                      ? 'bg-amber-50/80 border-amber-200/90 text-amber-950'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="text-[10px] uppercase font-semibold block">
                    Remaining Due
                  </span>
                  <div className="text-sm font-black font-mono mt-1">
                    {formatTaka(summary.remaining_due)}
                  </div>
                  <span className="text-[10px] opacity-80">
                    {summary.remaining_due === 0 ? 'Fully Cleared' : 'Payment Outstanding'}
                  </span>
                </div>
              </div>

              {/* Billing Period Context */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-800 shrink-0" />
                  <span>
                    Membership Coverage: <strong>{formatBdDate(summary.membership_start_date, 'long')}</strong> to <strong>{formatBdDate(summary.membership_end_date, 'long')}</strong>
                  </span>
                </div>
                {summary.last_payment_date && (
                  <div className="text-[11px] font-mono text-slate-500">
                    Last Payment: {formatBdDate(summary.last_payment_date, 'short')}
                  </div>
                )}
              </div>

              {/* Payment History List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-emerald-800" />
                    <span>Payment History & Money Receipts</span>
                  </h3>

                  <button
                    onClick={() => {
                      onClose();
                      onOpenRecordPayment(member);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-md bg-emerald-900 text-amber-300 hover:bg-emerald-800 transition-colors shadow-2xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-amber-300" />
                    <span>Record Payment</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  {summary.payments.length === 0 ? (
                    <div className="py-8 text-center bg-white text-slate-400">
                      No payments recorded yet for this member.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                          <th className="py-2.5 px-3">Receipt No</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Method / Ref</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {summary.payments.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                              {p.receipt_no}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">
                              {formatBdDate(p.payment_date, 'numeric')}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-slate-800">
                                {p.payment_method}
                              </span>
                              {p.transaction_reference && (
                                <span className="block text-[10px] font-mono text-slate-400">
                                  {p.transaction_reference}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-950 text-right">
                              {formatTaka(p.amount)}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => onViewReceipt(p)}
                                title="Print / View Official Money Receipt"
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
                              >
                                <Printer className="w-3 h-3 text-slate-600" />
                                <span>Receipt</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Footer Note */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
            <div className="text-center sm:text-left">
              <span className="font-semibold text-slate-700">CPR Reading Library</span> · মতি টাওয়ার (৫ম তলা), চকবাজার · 📞 01898-938981, 01898-938982
            </div>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-100 border border-slate-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
