import React, { useEffect, useState } from 'react';
import { Member } from '../../types';
import { formatBdDate, calculateMembershipStatus } from '../../lib/dateUtils';
import { generateQrDataUrl, getVerificationUrl } from '../../lib/qrUtils';
import { BookOpen, Stethoscope, ShieldCheck } from 'lucide-react';

interface MembershipCardProps {
  member: Member;
  side?: 'front' | 'back' | 'both';
  printableOnly?: boolean;
}

export const MembershipCard: React.FC<MembershipCardProps> = ({
  member,
  side = 'front',
  printableOnly = false,
}) => {
  const [qrUrl, setQrUrl] = useState<string>('');
  const status = calculateMembershipStatus(member.expires_on, member.is_active);
  const verifyLink = getVerificationUrl(member.id);

  useEffect(() => {
    generateQrDataUrl(verifyLink, {
      width: 240,
      darkColor: '#064e3b',
      lightColor: '#ffffff',
    })
      .then((data) => setQrUrl(data))
      .catch((e) => console.error(e));
  }, [verifyLink]);

  return (
    <div className={`cpr-card-wrapper ${printableOnly ? 'print-only' : ''} flex flex-col sm:flex-row items-center justify-center gap-6 print:gap-4 print:m-0`}>
      {/* FRONT SIDE */}
      {(side === 'front' || side === 'both') && (
        <div
          id={`card-front-${member.id}`}
          className="cpr-card relative w-[340px] h-[214px] sm:w-[380px] sm:h-[240px] rounded-xl bg-white text-slate-900 border border-slate-300 shadow-md overflow-hidden flex flex-col justify-between shrink-0 select-none print:shadow-none print:border-slate-400 print:w-[85.6mm] print:h-[53.98mm] print:rounded-lg print:break-inside-avoid"
        >
          {/* Top Brand Banner */}
          <div className="bg-emerald-950 text-white px-3.5 py-2.5 flex items-center justify-between border-b-2 border-amber-400">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-emerald-800 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-600">
                <BookOpen className="w-3.5 h-3.5 text-amber-300" />
              </div>
              <div>
                <div className="text-[12px] sm:text-[13px] font-black tracking-wide text-white uppercase leading-none font-sans">
                  CPR READING LIBRARY
                </div>
                <div className="text-[9px] text-amber-300 font-semibold tracking-wider uppercase mt-0.5">
                  Chattogram · Medical Division
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[9px] font-semibold tracking-widest text-slate-300 uppercase block">
                MEMBER PASS
              </span>
              <span className="text-[10px] font-mono font-bold text-amber-400 tracking-wider">
                {member.member_no}
              </span>
            </div>
          </div>

          {/* Card Body Grid */}
          <div className="px-3.5 py-2 flex items-center justify-between gap-3 flex-1">
            {/* Left: Doctor Photo */}
            <div className="flex flex-col items-center shrink-0">
              <div className="w-20 h-24 sm:w-22 sm:h-26 rounded-md bg-slate-100 border border-slate-300 overflow-hidden shadow-2xs relative flex items-center justify-center">
                {member.photo_url ? (
                  <img
                    src={member.photo_url}
                    alt={member.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-2 text-slate-400 flex flex-col items-center">
                    <Stethoscope className="w-8 h-8 text-emerald-900/60" />
                    <span className="text-[9px] font-semibold text-slate-500 mt-1 uppercase">
                      DOCTOR
                    </span>
                  </div>
                )}
              </div>
              <span className="text-[8px] font-semibold text-slate-500 uppercase mt-1 tracking-wider">
                CPR ID CARD
              </span>
            </div>

            {/* Middle: Doctor Details */}
            <div className="flex-1 min-w-0 pr-1 space-y-1">
              <div>
                <div className="text-[9px] text-slate-400 uppercase font-semibold">Doctor Name</div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 leading-tight truncate">
                  {member.full_name}
                </div>
              </div>

              {member.bmdc_no && (
                <div>
                  <div className="text-[8px] text-slate-400 uppercase font-semibold">BMDC Reg No</div>
                  <div className="text-[11px] font-mono font-bold text-slate-800">
                    {member.bmdc_no}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div>
                  <div className="text-[8px] text-slate-400 uppercase font-semibold">Issued</div>
                  <div className="text-[10px] font-mono font-semibold text-slate-700">
                    {formatBdDate(member.joined_on, 'short')}
                  </div>
                </div>

                <div>
                  <div className="text-[8px] text-slate-400 uppercase font-semibold">Expires</div>
                  <div className="text-[10px] font-mono font-bold text-emerald-950">
                    {formatBdDate(member.expires_on, 'short')}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Embedded QR Code */}
            <div className="flex flex-col items-center shrink-0">
              <div className="w-18 h-18 sm:w-20 sm:h-20 bg-white p-1 rounded-md border border-slate-300 shadow-2xs flex items-center justify-center">
                {qrUrl ? (
                  <img
                    src={qrUrl}
                    alt="Scan to verify"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-[8px] text-slate-400">QR...</div>
                )}
              </div>
              <div className="text-[8px] font-mono font-bold text-emerald-900 mt-0.5 tracking-tighter">
                SCAN TO VERIFY
              </div>
            </div>
          </div>

          {/* Bottom Security Hologram Footer */}
          <div className="bg-slate-100 px-3.5 py-1 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-600 font-mono">
            <div className="flex items-center gap-1 text-emerald-900 font-semibold">
              <ShieldCheck className="w-3 h-3 text-emerald-700" />
              <span>OFFICIAL LIBRARY PASS</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[8px] text-slate-500">STATUS:</span>
              <span
                className={`font-bold px-1.5 py-0.2 rounded text-[9px] ${
                  status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* BACK SIDE */}
      {(side === 'back' || side === 'both') && (
        <div
          id={`card-back-${member.id}`}
          className="cpr-card relative w-[340px] h-[214px] sm:w-[380px] sm:h-[240px] rounded-xl bg-slate-50 text-slate-900 border border-slate-300 shadow-md overflow-hidden flex flex-col justify-between shrink-0 select-none print:shadow-none print:border-slate-400 print:w-[85.6mm] print:h-[53.98mm] print:rounded-lg print:break-inside-avoid"
        >
          {/* Magnetic Stripe Bar */}
          <div className="w-full h-7 bg-slate-800 mt-3" />

          {/* Rules & Terms */}
          <div className="px-4 py-1 text-[9px] text-slate-600 space-y-1">
            <div className="font-bold text-[10px] text-slate-800 uppercase tracking-wide">
              Terms of Use & Library Regulations
            </div>
            <ul className="list-disc pl-3 space-y-0.5 text-[8.5px] leading-tight text-slate-600">
              <li>This card is non-transferable and remains property of CPR Reading Library.</li>
              <li>Must be presented or scanned at the entrance desk before hall access.</li>
              <li>Report lost or damaged membership cards to the administration office immediately.</li>
              <li>Scan the front QR code for authentic real-time validity status.</li>
            </ul>
          </div>

          {/* Signature & Contact Footer */}
          <div className="px-4 pb-2.5 pt-1 border-t border-slate-200 flex items-end justify-between text-[8px] text-slate-500">
            <div>
              <div className="font-bold text-slate-700">CPR Reading Library</div>
              <div>Medical Academy Campus, Chattogram, Bangladesh</div>
              <div>Helpline: +880 1819-000000 · library@cprreading.org</div>
            </div>

            <div className="text-center shrink-0">
              <div className="w-24 border-b border-slate-400 pb-0.5 font-serif italic text-[9px] text-slate-700">
                Authorised Sign
              </div>
              <div className="text-[7.5px] text-slate-400 uppercase tracking-wider mt-0.5">
                Chief Librarian
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
