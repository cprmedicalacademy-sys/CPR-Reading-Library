import React, { useEffect, useState } from 'react';
import { Member } from '../../types';
import { generateQrDataUrl, downloadQrCode, getVerificationUrl } from '../../lib/qrUtils';
import { calculateMembershipStatus } from '../../lib/dateUtils';
import { X, Download, Copy, ExternalLink, Check, QrCode as QrIcon, ShieldCheck } from 'lucide-react';

interface QrCodeModalProps {
  isOpen: boolean;
  member: Member | null;
  onClose: () => void;
  onOpenPublicVerification?: (memberId: string) => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  isOpen,
  member,
  onClose,
  onOpenPublicVerification,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const verificationUrl = member ? getVerificationUrl(member.id) : '';

  useEffect(() => {
    if (isOpen && member) {
      setLoading(true);
      generateQrDataUrl(verificationUrl, { width: 360, darkColor: '#064e3b' })
        .then((url) => {
          setQrDataUrl(url);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [isOpen, member, verificationUrl]);

  if (!isOpen || !member) return null;

  const status = calculateMembershipStatus(member.expires_on, member.is_active);

  const handleCopy = () => {
    navigator.clipboard.writeText(verificationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (qrDataUrl) {
      downloadQrCode(qrDataUrl, member.member_no);
    }
  };

  const handleTestLink = () => {
    if (onOpenPublicVerification) {
      onOpenPublicVerification(member.id);
      onClose();
    } else {
      window.open(verificationUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-emerald-950 text-white flex items-center justify-between border-b border-emerald-900">
          <div className="flex items-center gap-2">
            <QrIcon className="w-4 h-4 text-amber-300" />
            <h2 className="text-sm font-bold text-white tracking-wide">
              Official Verification QR Code
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 text-center space-y-4">
          <div>
            <div className="text-xs font-semibold text-emerald-800">
              CPR Reading Library · Chattogram
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              {member.full_name}
            </h3>
            <div className="text-xs text-slate-500 font-mono mt-0.5 flex items-center justify-center gap-2">
              <span className="font-semibold text-slate-800">{member.member_no}</span>
              <span>·</span>
              <span className={status === 'ACTIVE' ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
                {status}
              </span>
            </div>
          </div>

          {/* QR Canvas Box */}
          <div className="inline-block p-4 bg-white rounded-xl border border-slate-200 shadow-xs relative">
            {loading ? (
              <div className="w-56 h-56 flex items-center justify-center text-xs text-slate-400">
                Generating QR code...
              </div>
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code for ${member.member_no}`}
                className="w-56 h-56 object-contain mx-auto"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-xs text-red-500">
                Error generating QR code
              </div>
            )}
            <div className="text-[10px] text-slate-400 font-mono mt-2 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Encodes member UUID only (Privacy Protected)</span>
            </div>
          </div>

          {/* Verification URL container */}
          <div className="text-left bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
            <span className="text-[10px] font-semibold text-slate-500 block mb-1">
              Destination Verification Link:
            </span>
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-700 bg-white p-1.5 rounded border border-slate-200 overflow-x-auto">
              <span className="truncate flex-1">{verificationUrl}</span>
              <button
                type="button"
                onClick={handleCopy}
                title="Copy URL"
                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded shrink-0"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2 justify-center">
            <button
              onClick={handleDownload}
              disabled={!qrDataUrl || loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-900 text-amber-300 hover:bg-emerald-800 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-amber-300" />
              <span>Download PNG</span>
            </button>
            <button
              onClick={handleTestLink}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>Preview Public Page</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
