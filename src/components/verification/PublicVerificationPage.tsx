import React, { useEffect, useState } from 'react';
import { PublicMemberVerification } from '../../types';
import { DataService } from '../../services/dataService';
import { formatBdDate, formatBdDateTime } from '../../lib/dateUtils';
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  User,
  Hash,
  ArrowLeft,
  Building,
} from 'lucide-react';

interface PublicVerificationPageProps {
  memberId: string;
  onGoHome?: () => void;
}

export const PublicVerificationPage: React.FC<PublicVerificationPageProps> = ({
  memberId,
  onGoHome,
}) => {
  const [data, setData] = useState<PublicMemberVerification | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);

    DataService.getPublicVerification(memberId)
      .then((res) => {
        if (!active) return;
        if (!res) {
          setNotFound(true);
        } else {
          setData(res);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error('Verification error:', err);
        setNotFound(true);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [memberId]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between py-8 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto space-y-4">
        {/* Top Header Card */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-xl bg-emerald-950 text-amber-300 flex items-center justify-center mx-auto shadow-md border-2 border-emerald-800">
            <BookOpen className="w-6 h-6 text-amber-300" />
          </div>
          <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase">
            CPR Reading Library
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Chattogram, Bangladesh · Official Membership Verification
          </p>
        </div>

        {/* Verification Container */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-10 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-emerald-900 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-600">
                Contacting CPR Library registry...
              </p>
              <p className="text-[11px] text-slate-400">
                Verifying digital cryptographic signature
              </p>
            </div>
          ) : notFound || !data ? (
            /* INVALID OR NOT FOUND STATE */
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10" />
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">
                  Verification Failed
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1">
                  Invalid QR Code — Member Not Found
                </h2>
                <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed">
                  This QR code does not correspond to an authentic CPR Reading Library membership record. Please verify the physical card or contact the library administration desk.
                </p>
              </div>

              <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-[11px] text-red-800 font-mono">
                Scanned Token: {memberId.substring(0, 16)}...
              </div>

              {onGoHome && (
                <button
                  onClick={onGoHome}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Library Desk</span>
                </button>
              )}
            </div>
          ) : (
            /* VALID RECORD FOUND */
            <div>
              {/* Verdict Banner */}
              {data.status === 'ACTIVE' && (
                <div className="bg-emerald-900 text-white p-5 text-center border-b-4 border-emerald-500">
                  <div className="w-12 h-12 rounded-full bg-emerald-800/90 text-emerald-200 flex items-center justify-center mx-auto mb-2 border border-emerald-600 shadow-sm">
                    <CheckCircle2 className="w-7 h-7 text-emerald-300" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
                    OFFICIAL AUTHENTICATION
                  </span>
                  <h2 className="text-xl font-black tracking-tight text-white mt-0.5">
                    VERIFIED ACTIVE MEMBER
                  </h2>
                  <p className="text-xs text-emerald-100/90 mt-1">
                    Clearance granted for CPR Reading Library facilities.
                  </p>
                </div>
              )}

              {data.status === 'EXPIRED' && (
                <div className="bg-amber-800 text-white p-5 text-center border-b-4 border-amber-500">
                  <div className="w-12 h-12 rounded-full bg-amber-900 text-amber-200 flex items-center justify-center mx-auto mb-2 border border-amber-600 shadow-sm">
                    <AlertTriangle className="w-7 h-7 text-amber-300" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-200">
                    MEMBERSHIP OVERDUE
                  </span>
                  <h2 className="text-xl font-black tracking-tight text-white mt-0.5">
                    MEMBERSHIP EXPIRED
                  </h2>
                  <p className="text-xs text-amber-100 mt-1">
                    This membership has passed its expiration date. Please renew at the admin desk.
                  </p>
                </div>
              )}

              {data.status === 'INACTIVE' && (
                <div className="bg-slate-800 text-white p-5 text-center border-b-4 border-slate-500">
                  <div className="w-12 h-12 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center mx-auto mb-2 border border-slate-600 shadow-sm">
                    <ShieldAlert className="w-7 h-7 text-slate-300" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                    ADMINISTRATIVE HOLD
                  </span>
                  <h2 className="text-xl font-black tracking-tight text-white mt-0.5">
                    MEMBERSHIP INACTIVE
                  </h2>
                  <p className="text-xs text-slate-300 mt-1">
                    Membership is temporarily suspended or disabled by administration.
                  </p>
                </div>
              )}

              {/* Doctor Details (STRICTLY SANITIZED - ZERO PRIVATE DATA) */}
              <div className="p-6 space-y-4">
                {/* Photo & Name */}
                <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-300 overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
                    {data.photo_url ? (
                      <img
                        src={data.photo_url}
                        alt={data.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase">
                      Registered Doctor
                    </div>
                    <div className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                      {data.full_name}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span>{data.institution} ({data.branch})</span>
                    </div>
                  </div>
                </div>

                {/* Spec Sheet Table */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-150">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Hash className="w-4 h-4 text-emerald-800" />
                      <span className="font-medium">Member ID</span>
                    </div>
                    <div className="font-mono font-bold text-slate-900 text-sm">
                      {data.member_no}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-150">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="w-4 h-4 text-emerald-800" />
                      <span className="font-medium">Admission Date</span>
                    </div>
                    <div className="font-mono font-semibold text-slate-800">
                      {formatBdDate(data.joined_on, 'long')}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-150">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="w-4 h-4 text-emerald-800" />
                      <span className="font-medium">Membership Expiry</span>
                    </div>
                    <div className="font-mono font-bold text-slate-900 text-sm">
                      {formatBdDate(data.expires_on, 'long')}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-150">
                    <div className="flex items-center gap-2 text-slate-500">
                      <ShieldCheck className="w-4 h-4 text-emerald-800" />
                      <span className="font-medium">Current Status</span>
                    </div>
                    <div>
                      {data.status === 'ACTIVE' && (
                        <span className="font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full text-xs">
                          ACTIVE
                        </span>
                      )}
                      {data.status === 'EXPIRED' && (
                        <span className="font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full text-xs">
                          EXPIRED
                        </span>
                      )}
                      {data.status === 'INACTIVE' && (
                        <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full text-xs">
                          INACTIVE
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Privacy & Anti-Tamper Stamp */}
                <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 space-y-1 text-center">
                  <div className="flex items-center justify-center gap-1 font-mono text-slate-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Cryptographic Verification · CPR Reading Library</span>
                  </div>
                  <div>Timestamp: {formatBdDateTime(data.verified_at)}</div>
                  <div className="text-[9px] text-slate-400 italic">
                    Private doctor credentials (phone, BMDC registration, notes) are protected and not transmitted publicly.
                  </div>
                </div>

                {onGoHome && (
                  <div className="pt-2">
                    <button
                      onClick={onGoHome}
                      className="w-full py-2.5 rounded-lg bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Library Home</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-500">
          CPR Reading Library · Medical Division · Chattogram, Bangladesh
        </div>
      </div>
    </div>
  );
};
