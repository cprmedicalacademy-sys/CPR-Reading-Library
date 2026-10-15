import React, { useState } from 'react';
import { Member } from '../../types';
import { DataService } from '../../services/dataService';
import { addMonthsToDate, formatBdDate } from '../../lib/dateUtils';
import { useAuth } from '../../context/AuthContext';
import { X, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface RenewModalProps {
  isOpen: boolean;
  member: Member | null;
  onClose: () => void;
  onRenewed: () => void;
}

export const RenewModal: React.FC<RenewModalProps> = ({
  isOpen,
  member,
  onClose,
  onRenewed,
}) => {
  const { user } = useAuth();
  const [newExpiry, setNewExpiry] = useState<string>(() => {
    // Default to +1 year from today or from existing expiry if in future
    const baseDate = member && member.expires_on > new Date().toISOString()
      ? member.expires_on
      : undefined;
    return addMonthsToDate(12, baseDate);
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  if (!isOpen || !member) return null;

  const handlePreset = (months: number) => {
    const base = member.expires_on > new Date().toISOString()
      ? member.expires_on
      : undefined;
    setNewExpiry(addMonthsToDate(months, base));
  };

  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newExpiry) {
      setError('Please choose a valid new expiry date.');
      return;
    }

    if (newExpiry <= member.expires_on) {
      setError('New expiry date must be later than the current expiry date.');
      return;
    }

    setLoading(true);

    try {
      const res = await DataService.renewMembership(
        member.id,
        newExpiry,
        user?.email || 'Administrator'
      );

      if (!res.success) {
        setError(res.error || 'Failed to renew membership.');
        setLoading(false);
        return;
      }

      setSuccess('Membership renewed successfully! Expiry updated.');
      setTimeout(() => {
        onRenewed();
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Error occurred during renewal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-emerald-950 text-white flex items-center justify-between border-b border-emerald-900">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-amber-300" />
            <h2 className="text-sm font-bold text-white tracking-wide">
              Renew Doctor Membership
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleRenew} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Member Card Summary */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-xs font-bold text-slate-900">{member.full_name}</div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              <span>Member ID: </span>
              <strong className="text-slate-800">{member.member_no}</strong>
              {member.bmdc_no && <span> · BMDC: {member.bmdc_no}</span>}
            </div>
            <div className="text-[11px] text-slate-600 mt-2 pt-2 border-t border-slate-200/80 flex items-center justify-between">
              <span>Current Expiration:</span>
              <span className="font-mono font-semibold text-slate-800">
                {formatBdDate(member.expires_on, 'long')}
              </span>
            </div>
          </div>

          {/* New Expiration Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select New Expiry Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={newExpiry}
              onChange={(e) => setNewExpiry(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-mono"
            />
            {/* Quick Extension Buttons */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-slate-400">Quick Extend:</span>
              <button
                type="button"
                onClick={() => handlePreset(6)}
                className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                +6 Months
              </button>
              <button
                type="button"
                onClick={() => handlePreset(12)}
                className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors"
              >
                +1 Year (Recommended)
              </button>
              <button
                type="button"
                onClick={() => handlePreset(24)}
                className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                +2 Years
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200/60">
            <p className="font-medium text-emerald-950">Security & Integrity Guarantee:</p>
            <p className="mt-0.5 text-emerald-800">
              The Member ID (<span className="font-mono">{member.member_no}</span>) and existing physical QR code remain identical. Renewal takes effect immediately on the live verification page.
            </p>
          </div>

          {/* Action buttons */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-900 text-amber-300 hover:bg-emerald-800 transition-colors shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-300 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Renewing...' : 'Confirm Renewal'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
