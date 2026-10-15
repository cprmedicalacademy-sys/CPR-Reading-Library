import React, { useState } from 'react';
import { Member, Payment, PaymentMethod } from '../../types';
import { DataService } from '../../services/dataService';
import { getTodayIsoDate } from '../../lib/dateUtils';
import { formatTaka } from '../../lib/numberWords';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  member: Member | null;
  currentPaid: number;
  totalPayable: number;
  onClose: () => void;
  onPaymentSuccess: (payment: Payment) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  member,
  currentPaid,
  totalPayable,
  onClose,
  onPaymentSuccess,
}) => {
  const { user } = useAuth();

  const remainingDue = Math.max(0, totalPayable - currentPaid);

  const [amount, setAmount] = useState<string>(remainingDue > 0 ? String(remainingDue) : '2000');
  const [paymentDate, setPaymentDate] = useState<string>(getTodayIsoDate());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [allowOverpayment, setAllowOverpayment] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  if (!isOpen || !member) return null;

  const numericAmount = parseFloat(amount) || 0;
  const isOverpayment = remainingDue > 0 && numericAmount > remainingDue;
  const overpaymentDiff = numericAmount - remainingDue;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (numericAmount <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (isOverpayment && !allowOverpayment) {
      setError(
        `Payment amount (${formatTaka(numericAmount)}) exceeds the remaining due (${formatTaka(
          remainingDue
        )}) by ${formatTaka(overpaymentDiff)}. Please check the box below to approve overpayment.`
      );
      return;
    }

    setLoading(true);

    try {
      const res = await DataService.createPayment({
        member_id: member.id,
        amount: numericAmount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        transaction_reference: transactionRef,
        notes,
        recorded_by_email: user?.email || 'Administrator',
      });

      if (!res.success || !res.data) {
        setError(res.error || 'Failed to record payment.');
        setLoading(false);
        return;
      }

      onPaymentSuccess(res.data);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error occurred while saving payment.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPreset = (presetAmount: number) => {
    setAmount(String(presetAmount));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-emerald-950 text-white flex items-center justify-between border-b border-emerald-900">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-300" />
            <h2 className="text-sm font-bold text-white tracking-wide">
              Receive Membership Payment
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Member Account Summary Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 text-sm">{member.full_name}</span>
              <span className="text-[11px] font-mono text-slate-500 ml-2">({member.member_no})</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Remaining Due:</span>
              <div className="text-sm font-mono font-black text-amber-800">
                {formatTaka(remainingDue)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200/80 font-mono text-[11px]">
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-sans font-semibold">Total Payable</span>
              <span className="font-semibold text-slate-800">{formatTaka(totalPayable)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-sans font-semibold">Already Paid</span>
              <span className="font-semibold text-emerald-800">{formatTaka(currentPaid)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-sans font-semibold">Monthly Rate</span>
              <span className="text-slate-700">{formatTaka(member.monthly_fee || 2000)}/mo</span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Payment Amount (BDT ৳) <span className="text-red-500">*</span>
              </label>
              {remainingDue > 0 && (
                <button
                  type="button"
                  onClick={() => handleQuickPreset(remainingDue)}
                  className="text-[11px] text-emerald-800 hover:underline font-semibold"
                >
                  Pay Full Due ({formatTaka(remainingDue)})
                </button>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                ৳
              </span>
              <input
                type="number"
                step="100"
                min="100"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="2000"
                className="w-full pl-8 pr-3 py-2 text-sm font-mono font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] text-slate-400">Quick:</span>
              <button
                type="button"
                onClick={() => handleQuickPreset(2000)}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                ৳2,000 (1 Mo)
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset(6000)}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                ৳6,000 (3 Mo)
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset(12000)}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                ৳12,000 (6 Mo)
              </button>
            </div>
          </div>

          {/* Overpayment Warning */}
          {isOverpayment && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Overpayment Notice: </span>
                  This amount exceeds the current outstanding balance by{' '}
                  <strong className="font-mono">{formatTaka(overpaymentDiff)}</strong>.
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-amber-200/80">
                <input
                  type="checkbox"
                  checked={allowOverpayment}
                  onChange={(e) => setAllowOverpayment(e.target.checked)}
                  className="rounded text-amber-700 focus:ring-amber-700"
                />
                <span className="font-semibold text-amber-950">
                  I confirm and approve recording this overpayment.
                </span>
              </label>
            </div>
          )}

          {/* Payment Date & Method Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-medium"
              >
                <option value="Cash">Cash Counter</option>
                <option value="Mobile Banking">Mobile Banking (bKash / Nagad / Rocket)</option>
                <option value="Bank">Bank Deposit / Online Transfer</option>
                <option value="Other">Other / Cheque</option>
              </select>
            </div>
          </div>

          {/* Transaction Reference & Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Transaction Reference / Slip No. <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="e.g. bKash TrxID, Bank voucher no, Desk Cash slip"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Private Payment Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid for months of Nov-Dec, approved installment"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-emerald-900 text-amber-300 hover:bg-emerald-800 transition-colors shadow-xs disabled:opacity-50"
            >
              <Receipt className="w-3.5 h-3.5 text-amber-300" />
              <span>{loading ? 'Processing...' : 'Save & Generate Receipt'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
