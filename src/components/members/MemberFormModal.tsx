import React, { useEffect, useState } from 'react';
import { Member, Payment } from '../../types';
import { DataService } from '../../services/dataService';
import { addMonthsToDate, getTodayIsoDate } from '../../lib/dateUtils';
import { X, Save, Upload, User, AlertCircle, CheckCircle2, Receipt } from 'lucide-react';

interface MemberFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (member: Member, payment?: Payment) => void;
  initialMember?: Member | null;
}

export const MemberFormModal: React.FC<MemberFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialMember,
}) => {
  const isEdit = Boolean(initialMember);

  const [fullName, setFullName] = useState<string>('');
  const [memberNo, setMemberNo] = useState<string>('');
  const [bmdcNo, setBmdcNo] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [joinedOn, setJoinedOn] = useState<string>(getTodayIsoDate());
  const [expiresOn, setExpiresOn] = useState<string>(addMonthsToDate(12));
  const [isActive, setIsActive] = useState<boolean>(true);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Fee & Payment Details
  const [monthlyFee, setMonthlyFee] = useState<number>(2000);
  const [durationMonths, setDurationMonths] = useState<number>(12);
  const [initialPaymentAmount, setInitialPaymentAmount] = useState<string>('2000');
  const [paymentDate, setPaymentDate] = useState<string>(getTodayIsoDate());
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank' | 'Mobile Banking' | 'Other'>('Cash');
  const [paymentReference, setPaymentReference] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Live Calculations
  const calculatedTotalPayable = monthlyFee * durationMonths;
  const numericInitialPaid = parseFloat(initialPaymentAmount) || 0;
  const calculatedRemainingDue = Math.max(0, calculatedTotalPayable - numericInitialPaid);


  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccessMsg('');

      if (initialMember) {
        setFullName(initialMember.full_name);
        setMemberNo(initialMember.member_no);
        setBmdcNo(initialMember.bmdc_no || '');
        setPhone(initialMember.phone || '');
        setJoinedOn(initialMember.joined_on);
        setExpiresOn(initialMember.expires_on);
        setIsActive(initialMember.is_active);
        setPhotoUrl(initialMember.photo_url || '');
        setNotes(initialMember.notes || '');
        setMonthlyFee(initialMember.monthly_fee || 2000);
        setDurationMonths(initialMember.membership_months || 12);
        setInitialPaymentAmount('0');
      } else {
        // Create mode: fetch next available ID
        setFullName('');
        setBmdcNo('');
        setPhone('');
        setJoinedOn(getTodayIsoDate());
        setExpiresOn(addMonthsToDate(12));
        setIsActive(true);
        setPhotoUrl('');
        setNotes('');
        setMonthlyFee(2000);
        setDurationMonths(12);
        setInitialPaymentAmount('2000');
        setPaymentDate(getTodayIsoDate());
        setPaymentMethod('Cash');
        setPaymentReference('');

        DataService.getNextMemberId().then((nextId) => {
          setMemberNo(nextId);
        });
      }
    }
  }, [isOpen, initialMember]);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Photo size exceeds 2MB limit. Please choose a smaller photo.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQuickDuration = (months: number) => {
    setDurationMonths(months);
    setExpiresOn(addMonthsToDate(months, joinedOn));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError("Doctor's full name is required (e.g. Dr. Mohammad Rafiq).");
      return;
    }
    if (!memberNo.trim()) {
      setError('Member ID is required (e.g. CPR-0001).');
      return;
    }
    if (!expiresOn) {
      setError('Membership expiry date is required.');
      return;
    }

    setLoading(true);

    try {
      if (isEdit && initialMember) {
        const res = await DataService.updateMember(initialMember.id, {
          full_name: fullName,
          member_no: memberNo,
          bmdc_no: bmdcNo,
          phone,
          joined_on: joinedOn,
          expires_on: expiresOn,
          is_active: isActive,
          photo_url: photoUrl,
          notes,
          monthly_fee: monthlyFee,
          membership_months: durationMonths,
          total_payable: calculatedTotalPayable,
        });

        if (!res.success || !res.data) {
          setError(res.error || 'Failed to update member.');
          setLoading(false);
          return;
        }

        setSuccessMsg('Member updated successfully!');
        setTimeout(() => {
          onSaved(res.data!);
          onClose();
        }, 600);
      } else {
        const res = await DataService.createMember({
          full_name: fullName,
          member_no: memberNo,
          bmdc_no: bmdcNo,
          phone,
          joined_on: joinedOn,
          expires_on: expiresOn,
          is_active: isActive,
          photo_url: photoUrl,
          notes,
          monthly_fee: monthlyFee,
          membership_months: durationMonths,
          total_payable: calculatedTotalPayable,
          initial_payment_amount: numericInitialPaid > 0 ? numericInitialPaid : undefined,
          initial_payment_method: paymentMethod,
          initial_payment_reference: paymentReference,
        });

        if (!res.success || !res.data) {
          setError(res.error || 'Failed to register member.');
          setLoading(false);
          return;
        }

        setSuccessMsg(
          `Doctor registered successfully with Member ID ${res.data.member_no}!${
            res.payment ? ' Money receipt generated.' : ''
          }`
        );
        setTimeout(() => {
          onSaved(res.data!, res.payment);
          onClose();
        }, 700);
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-950 text-white flex items-center justify-between border-b border-emerald-900">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">
              {isEdit ? 'Edit Doctor Membership' : 'Manual Doctor Registration'}
            </h2>
            <p className="text-xs text-amber-300 font-medium mt-0.5">
              CPR Reading Library · Chattogram Medical Wing
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Top Row: Photo & Basic Info */}
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {/* Photo Preview & Upload */}
            <div className="flex flex-col items-center gap-2 shrink-0 self-center sm:self-start">
              <div className="w-24 h-24 rounded-lg bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative group">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Doctor profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-2 text-slate-400">
                    <User className="w-8 h-8 mx-auto text-slate-300" />
                    <span className="text-[10px] block mt-1">Photo (Optional)</span>
                  </div>
                )}
              </div>
              <label className="cursor-pointer text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1">
                <Upload className="w-3 h-3" />
                <span>{photoUrl ? 'Change Photo' : 'Upload Photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
              {photoUrl && (
                <button
                  type="button"
                  onClick={() => setPhotoUrl('')}
                  className="text-[10px] text-red-600 hover:underline"
                >
                  Remove photo
                </button>
              )}
            </div>

            {/* Core Name & Member ID */}
            <div className="flex-1 space-y-3 w-full">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Mohammad Rafiqul Islam"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Member ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={memberNo}
                    onChange={(e) => setMemberNo(e.target.value.toUpperCase())}
                    placeholder="CPR-0001"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-mono font-bold tracking-wider"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Unique identifier on library card
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    BMDC Registration No.
                  </label>
                  <input
                    type="text"
                    value={bmdcNo}
                    onChange={(e) => setBmdcNo(e.target.value)}
                    placeholder="e.g. A-42190"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Bangladesh Medical & Dental Council
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact & Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+880 1819-000000"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Private admin record; never shown on public QR
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Membership Status
              </label>
              <div className="flex items-center gap-4 mt-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={isActive}
                    onChange={() => setIsActive(true)}
                    className="text-emerald-700 focus:ring-emerald-700"
                  />
                  <span className="text-emerald-800 font-semibold">Active (Enabled)</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={!isActive}
                    onChange={() => setIsActive(false)}
                    className="text-slate-600 focus:ring-slate-600"
                  />
                  <span className="text-slate-600">Inactive (Suspended)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Dates Section */}
          <div className="pt-2 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Admission Date
                </label>
                <input
                  type="date"
                  required
                  value={joinedOn}
                  onChange={(e) => setJoinedOn(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Membership Expiry Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={expiresOn}
                  onChange={(e) => setExpiresOn(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-mono"
                />
                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-slate-400">Presets:</span>
                  <button
                    type="button"
                    onClick={() => handleQuickDuration(6)}
                    className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    +6 Mo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDuration(12)}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                  >
                    +1 Yr
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDuration(24)}
                    className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    +2 Yrs
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Fee & Payment Details Section */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-800" />
                <span>Membership Fee & Payment Details</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-medium">
                Standard: ৳2,000 / month
              </span>
            </div>

            {/* Calculations Banner */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Monthly Fee</span>
                <span className="font-mono font-bold text-slate-800">৳{monthlyFee.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Duration</span>
                <span className="font-mono font-bold text-slate-800">{durationMonths} Months</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Payable</span>
                <span className="font-mono font-bold text-slate-900">৳{calculatedTotalPayable.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-amber-800 uppercase font-semibold block">Remaining Due</span>
                <span className="font-mono font-bold text-amber-900">৳{calculatedRemainingDue.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Monthly Fee (BDT)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">৳</span>
                  <input
                    type="number"
                    value={monthlyFee}
                    onChange={(e) => setMonthlyFee(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full pl-7 pr-3 py-2 text-xs rounded-lg border border-slate-300 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Duration (Months)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={durationMonths}
                  onChange={(e) => {
                    const m = Math.max(1, parseInt(e.target.value) || 1);
                    setDurationMonths(m);
                    setExpiresOn(addMonthsToDate(m, joinedOn));
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Payment Received
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">৳</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={initialPaymentAmount}
                    onChange={(e) => setInitialPaymentAmount(e.target.value)}
                    placeholder="2000"
                    className="w-full pl-7 pr-3 py-2 text-xs rounded-lg border border-slate-300 font-mono font-bold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                  />
                </div>
              </div>
            </div>

            {/* Payment Details if initial payment > 0 */}
            {numericInitialPaid > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                  >
                    <option value="Cash">Cash Counter</option>
                    <option value="Mobile Banking">Mobile Banking (bKash / Nagad / Rocket)</option>
                    <option value="Bank">Bank Deposit / Transfer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transaction Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="e.g. bKash TrxID, Bank slip no, Desk receipt"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Internal Notes (Private) */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Internal Notes <span className="text-slate-400 font-normal">(Private Administrator Record)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Specialty, hospital department, reference book requests, locker number..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-900 text-amber-300 hover:bg-emerald-800 transition-colors shadow-xs disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 text-amber-300" />
              <span>{loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Register Doctor'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
