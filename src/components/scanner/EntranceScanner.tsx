import React, { useState } from 'react';
import { DataService } from '../../services/dataService';
import { PublicMemberVerification } from '../../types';
import { formatBdDate } from '../../lib/dateUtils';
import {
  QrCode,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Camera,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface EntranceScannerProps {
  onOpenCard?: (memberId: string) => void;
  onRenewMember?: (memberId: string) => void;
}

export const EntranceScanner: React.FC<EntranceScannerProps> = ({
  onOpenCard,
  onRenewMember,
}) => {
  const [inputVal, setInputVal] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<PublicMemberVerification | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Parse input: extracts UUID or looks up member by Member No
  const handleVerify = async (query?: string) => {
    const raw = (query !== undefined ? query : inputVal).trim();
    if (!raw) return;

    setLoading(true);
    setErrorMsg('');
    setResult(null);
    setHasSearched(true);

    try {
      let targetUuid = '';

      // Check if it's a URL like https://.../verify/UUID
      const urlMatch = raw.match(/\/verify\/([a-zA-Z0-9-]+)/);
      if (urlMatch && urlMatch[1]) {
        targetUuid = urlMatch[1];
      } else if (raw.match(/^[0-9a-fA-F-]{36}$/)) {
        // Direct UUID
        targetUuid = raw;
      } else {
        // Assume member_no like CPR-0001
        const all = await DataService.getAllMembers();
        const found = all.find((m) => m.member_no.toUpperCase() === raw.toUpperCase());
        if (found) {
          targetUuid = found.id;
        } else {
          setErrorMsg(`No member found matching "${raw}".`);
          setLoading(false);
          return;
        }
      }

      const res = await DataService.getPublicVerification(targetUuid);
      if (!res) {
        setErrorMsg('Invalid QR Code — Member record not found in CPR Reading Library database.');
      } else {
        setResult(res);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error occurred while verifying membership.');
    } finally {
      setLoading(false);
    }
  };

  const handlePresetTest = (code: string) => {
    setInputVal(code);
    handleVerify(code);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-900 text-amber-300 flex items-center justify-center shrink-0">
            <QrCode className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900">
              Entrance Desk Verification Scanner
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live gate check for doctors entering CPR Reading Library, Chattogram. Scan QR code or type Member ID.
            </p>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-600 mt-1.5 pt-1.5 border-t border-slate-100">
              <span className="font-medium text-slate-800">মতি টাওয়ার (৫ম তলা), গুলজার মোড়, চকবাজার</span>
              <span className="text-[10px] text-slate-500">(EBL ব্যাংকের ATM বুথের পাশে লিফট-৪)</span>
              <span className="text-slate-300">·</span>
              <span className="font-mono font-bold text-emerald-900">📞 01898-938981, 01898-938982</span>
            </div>
          </div>
        </div>
      </div>

      {/* Input Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerify();
          }}
          className="flex flex-col sm:flex-row items-stretch gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Scan/paste QR verification URL, UUID, or enter Member ID (e.g. CPR-0001)..."
              className="w-full pl-9 pr-3 py-2.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-mono font-medium"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !inputVal.trim()}
            className="px-5 py-2.5 text-xs font-bold rounded-lg bg-emerald-900 text-amber-300 hover:bg-emerald-800 transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
          >
            <ShieldCheck className="w-4 h-4 text-amber-300" />
            <span>{loading ? 'Verifying...' : 'Verify Entry'}</span>
          </button>
        </form>

        {/* Quick Simulation Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] text-slate-400 font-medium">Quick Simulators:</span>
          <button
            type="button"
            onClick={() => handlePresetTest('CPR-0001')}
            className="text-[11px] font-mono px-2 py-1 rounded bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
          >
            CPR-0001 (Active)
          </button>
          <button
            type="button"
            onClick={() => handlePresetTest('CPR-0002')}
            className="text-[11px] font-mono px-2 py-1 rounded bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
          >
            CPR-0002 (Expiring Soon)
          </button>
          <button
            type="button"
            onClick={() => handlePresetTest('CPR-0003')}
            className="text-[11px] font-mono px-2 py-1 rounded bg-red-50 text-red-800 hover:bg-red-100 border border-red-200"
          >
            CPR-0003 (Expired)
          </button>
          <button
            type="button"
            onClick={() => handlePresetTest('CPR-0004')}
            className="text-[11px] font-mono px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            CPR-0004 (Inactive)
          </button>
          <button
            type="button"
            onClick={() => handlePresetTest('INVALID-QR-999')}
            className="text-[11px] font-mono px-2 py-1 rounded bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            Test Invalid QR
          </button>
        </div>
      </div>

      {/* Result Display */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-8 h-8 border-3 border-emerald-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-600 font-semibold">Validating credentials...</p>
        </div>
      ) : errorMsg ? (
        <div className="bg-white rounded-xl border-2 border-red-300 p-8 text-center shadow-md animate-in fade-in space-y-3">
          <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-base font-bold text-red-900">
              ENTRY REJECTED — INVALID QR
            </h2>
            <p className="text-xs text-slate-600 mt-1">{errorMsg}</p>
          </div>
        </div>
      ) : result ? (
        <div
          className={`bg-white rounded-xl border-2 shadow-lg overflow-hidden animate-in fade-in ${
            result.status === 'ACTIVE'
              ? 'border-emerald-500'
              : result.status === 'EXPIRED'
              ? 'border-amber-500'
              : 'border-slate-400'
          }`}
        >
          {/* Header Verdict Bar */}
          <div
            className={`p-4 text-white flex items-center justify-between ${
              result.status === 'ACTIVE'
                ? 'bg-emerald-900'
                : result.status === 'EXPIRED'
                ? 'bg-amber-800'
                : 'bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              {result.status === 'ACTIVE' && (
                <CheckCircle2 className="w-7 h-7 text-emerald-300 shrink-0" />
              )}
              {result.status === 'EXPIRED' && (
                <AlertTriangle className="w-7 h-7 text-amber-300 shrink-0" />
              )}
              {result.status === 'INACTIVE' && (
                <XCircle className="w-7 h-7 text-slate-300 shrink-0" />
              )}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  Entrance Gate Decision
                </div>
                <div className="text-base sm:text-lg font-black tracking-wide">
                  {result.status === 'ACTIVE' && 'ENTRY ALLOWED — ACTIVE MEMBER'}
                  {result.status === 'EXPIRED' && 'ENTRY BLOCKED — MEMBERSHIP EXPIRED'}
                  {result.status === 'INACTIVE' && 'ENTRY SUSPENDED — INACTIVE ACCOUNT'}
                </div>
              </div>
            </div>

            <div className="text-right font-mono text-xs font-bold text-amber-300">
              {result.member_no}
            </div>
          </div>

          {/* Member Details */}
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Doctor Name</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {result.full_name}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Member ID</div>
              <div className="text-base font-mono font-bold text-slate-900 mt-0.5">
                {result.member_no}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Admission Date</div>
              <div className="text-xs font-mono font-semibold text-slate-700 mt-0.5">
                {formatBdDate(result.joined_on, 'long')}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Membership Expiry</div>
              <div className="text-xs font-mono font-bold text-emerald-950 mt-0.5">
                {formatBdDate(result.expires_on, 'long')}
              </div>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-mono">
              CPR Reading Library · Chattogram Desk
            </span>

            <div className="flex items-center gap-2">
              {onRenewMember && result.status !== 'ACTIVE' && (
                <button
                  onClick={() => onRenewMember(result.id)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-900 text-amber-300 hover:bg-emerald-800 transition-colors shadow-2xs"
                >
                  Renew Membership Now
                </button>
              )}
              {onOpenCard && (
                <button
                  onClick={() => onOpenCard(result.id)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition-colors"
                >
                  View Physical Card
                </button>
              )}
            </div>
          </div>
        </div>
      ) : !hasSearched ? (
        <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500 space-y-2">
          <Camera className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-xs font-medium text-slate-700">
            Awaiting QR Scan or Member ID Input
          </p>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            Scan physical doctor card using an attached barcode/2D QR scanner, paste verification link, or click a quick simulator above.
          </p>
        </div>
      ) : null}
    </div>
  );
};
