import React, { useState, useEffect } from 'react';
import { Member, Payment } from '../../types';
import { formatBdDate } from '../../lib/dateUtils';
import { amountInWords, formatTaka } from '../../lib/numberWords';
import { Printer, Download, X, Scissors, Check, Copy } from 'lucide-react';

import { LIBRARY_CONFIG, getLibraryConfig, LibraryConfig } from '../../lib/constants';

interface MoneyReceiptPrintProps {
  payment: Payment;
  member: Member;
  allMemberPayments?: Payment[];
  onClose: () => void;
}

export const MoneyReceiptPrint: React.FC<MoneyReceiptPrintProps> = ({
  payment,
  member,
  allMemberPayments = [],
  onClose,
}) => {
  const [libraryConfig, setLibraryConfig] = useState<LibraryConfig>(getLibraryConfig());
  const [printCopyMode, setPrintCopyMode] = useState<'both' | 'student' | 'office'>('both');
  const [copiedNo, setCopiedNo] = useState<boolean>(false);

  useEffect(() => {
    const handleUpdate = () => setLibraryConfig(getLibraryConfig());
    window.addEventListener('cpr-library-config-updated', handleUpdate);
    return () => window.removeEventListener('cpr-library-config-updated', handleUpdate);
  }, []);

  // Financial calculations for this payment snapshot
  const monthlyFee = member.monthly_fee || 2000;
  const membershipMonths = member.membership_months || 12;
  const totalPayable = member.total_payable || monthlyFee * membershipMonths;

  // Payments made before this one
  const priorPayments = allMemberPayments.filter(
    (p) =>
      p.id !== payment.id &&
      (p.payment_date < payment.payment_date ||
        (p.payment_date === payment.payment_date && p.created_at < payment.created_at))
  );
  const previousPaid = priorPayments.reduce((sum, p) => sum + p.amount, 0);
  const currentPaid = payment.amount;
  const totalPaidAfter = previousPaid + currentPaid;
  const remainingDue = Math.max(0, totalPayable - totalPaidAfter);

  const periodFrom = formatBdDate(member.membership_start_date || member.joined_on, 'short');
  const periodTo = formatBdDate(member.membership_end_date || member.expires_on, 'short');

  const handlePrint = (mode: 'both' | 'student' | 'office') => {
    setPrintCopyMode(mode);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleCopyReceiptNo = () => {
    navigator.clipboard.writeText(payment.receipt_no);
    setCopiedNo(true);
    setTimeout(() => setCopiedNo(false), 2000);
  };

  // Reusable Single Copy Voucher layout strictly in Black and White (minimal ink, zero color/gradients)
  const renderReceiptVoucher = (copyTitle: "STUDENT'S COPY" | "OFFICE COPY") => (
    <div className="receipt-voucher bg-white text-black p-5 sm:p-6 border border-black rounded-none text-xs font-sans leading-tight relative">
      {/* Top Header */}
      <div className="flex items-start justify-between border-b-2 border-black pb-3">
        <div className="max-w-[70%]">
          <h1 className="text-base sm:text-lg font-black tracking-wider uppercase font-serif text-black leading-tight">
            CPR READING LIBRARY
          </h1>
          <p className="text-[10px] text-gray-800 font-serif italic mt-0.5">
            Doctors Study & Reference Facility · Chattogram
          </p>
          <p className="text-[11px] font-bold tracking-tight text-black mt-1">
            {libraryConfig.addressBangla}
          </p>
          <p className="text-[10px] text-gray-900 font-medium">
            ({libraryConfig.addressDetailBangla})
          </p>
          <p className="text-[10.5px] font-mono text-black mt-1 font-bold">
            মোবাইল / WhatsApp: {libraryConfig.phone1}, {libraryConfig.phone2}
          </p>
          <p className="text-[9.5px] font-mono text-gray-700">
            Email: {libraryConfig.email}
          </p>
        </div>

        <div className="text-right">
          <div className="border border-black px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase inline-block mb-1">
            {copyTitle}
          </div>
          <div className="text-sm font-black tracking-wide uppercase block text-black">
            MONEY RECEIPT
          </div>
          <div className="text-[11px] font-mono font-bold text-black mt-0.5">
            Receipt No: <strong>{payment.receipt_no}</strong>
          </div>
          <div className="text-[10px] font-mono text-black">
            Date: {formatBdDate(payment.payment_date, 'numeric')}
          </div>
        </div>
      </div>

      {/* Member & Purpose Information Table */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 py-3 border-b border-black text-[11px]">
        <div>
          <span className="text-[10px] uppercase font-bold text-black">Received From: </span>
          <span className="font-bold text-black text-xs">{member.full_name}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-black">Member ID: </span>
          <span className="font-mono font-bold text-black">{member.member_no}</span>
          {member.bmdc_no && (
            <span className="text-[10px] text-black ml-2 font-mono">(BMDC: {member.bmdc_no})</span>
          )}
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-black">Receipt For: </span>
          <span className="font-medium text-black">Library Membership Fee</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-black">Monthly Fee: </span>
          <span className="font-mono font-bold text-black">{formatTaka(monthlyFee)}</span>
        </div>

        <div className="col-span-2">
          <span className="text-[10px] uppercase font-bold text-black">Membership Period: </span>
          <span className="font-mono font-semibold text-black">
            From {periodFrom} To {periodTo} ({membershipMonths} Months)
          </span>
        </div>
      </div>

      {/* Financial Breakdown Table */}
      <div className="py-2.5 border-b border-black">
        <table className="w-full text-left text-[11px] border-collapse">
          <thead>
            <tr className="border-b border-black text-[10px] uppercase font-bold">
              <th className="py-1">Description / Billing Item</th>
              <th className="py-1 text-right">Amount (BDT)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300 font-mono">
            <tr>
              <td className="py-1">Total Payable Amount for {membershipMonths} Months</td>
              <td className="py-1 text-right font-medium">{formatTaka(totalPayable)}</td>
            </tr>
            <tr>
              <td className="py-1">Previous Paid Amount</td>
              <td className="py-1 text-right">{formatTaka(previousPaid)}</td>
            </tr>
            <tr className="font-bold border-t border-black">
              <td className="py-1 text-black font-sans uppercase">Current Payment Received</td>
              <td className="py-1 text-right text-black font-bold text-xs">
                {formatTaka(currentPaid)}
              </td>
            </tr>
            <tr>
              <td className="py-1 text-gray-800">Total Paid After This Payment</td>
              <td className="py-1 text-right font-semibold">{formatTaka(totalPaidAfter)}</td>
            </tr>
            <tr className="font-bold border-t border-black">
              <td className="py-1 text-black font-sans uppercase">Remaining Due Amount</td>
              <td className="py-1 text-right text-black font-bold text-xs">
                {formatTaka(remainingDue)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payment Method & Amount in Words */}
      <div className="py-2.5 border-b border-black text-[11px] space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-bold uppercase text-[10px]">Payment Method: </span>
            <span className="font-semibold">{payment.payment_method}</span>
            {payment.transaction_reference && (
              <span className="font-mono ml-2">
                (Ref: {payment.transaction_reference})
              </span>
            )}
          </div>
          <div className="text-[10px] font-mono">
            Received By: {payment.recorded_by_email || 'Desk Officer'}
          </div>
        </div>

        <div>
          <span className="font-bold uppercase text-[10px]">Amount in Words: </span>
          <span className="font-serif italic font-semibold">{amountInWords(currentPaid)}</span>
        </div>
      </div>

      {/* Signature Lines */}
      <div className="pt-8 pb-1 flex items-end justify-between text-[10px]">
        <div className="text-center w-36">
          <div className="border-t border-black pt-1 font-medium">Member Signature</div>
        </div>

        <div className="text-center max-w-[280px]">
          <div className="text-[8.5px] font-bold text-black uppercase tracking-wider">
            CPR Reading Library
          </div>
          <div className="text-[8px] text-gray-800 leading-tight">
            {libraryConfig.addressBangla}
          </div>
          <div className="text-[7.5px] text-gray-700">
            ({libraryConfig.addressDetailBangla})
          </div>
          <div className="text-[8px] font-mono font-bold text-black mt-0.5">
            মোবাইল: {libraryConfig.phone1}, {libraryConfig.phone2}
          </div>
        </div>

        <div className="text-center w-36">
          <div className="border-t border-black pt-1 font-bold">Authorized Signature</div>
          <div className="text-[8px] text-gray-600">CPR Reading Library</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-4xl my-6 overflow-hidden print:border-none print:shadow-none print:m-0 print:w-full print:max-w-none">
        {/* Screen Controls Header (Hidden in Print) */}
        <div className="print:hidden px-5 py-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white tracking-wide">
              Official Money Receipt · {payment.receipt_no}
            </h2>
            <button
              onClick={handleCopyReceiptNo}
              title="Copy receipt number"
              className="p-1 text-slate-400 hover:text-white rounded"
            >
              {copiedNo ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handlePrint('both')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md bg-emerald-700 text-white hover:bg-emerald-600 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Both Copies (A4)</span>
            </button>

            <button
              onClick={() => handlePrint('student')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <span>Student Copy</span>
            </button>

            <button
              onClick={() => handlePrint('office')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <span>Office Copy</span>
            </button>

            <button
              onClick={() => handlePrint('both')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save as PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div className="p-4 sm:p-8 bg-slate-100 max-h-[82vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0 print:bg-white">
          <div
            id="receipt-print-target"
            className="a4-sheet bg-white max-w-[210mm] mx-auto p-4 sm:p-8 shadow-md border border-slate-300 space-y-4 print:shadow-none print:border-none print:p-0 print:space-y-4"
          >
            {/* TOP VOUCHER: STUDENT'S COPY */}
            {(printCopyMode === 'both' || printCopyMode === 'student') &&
              renderReceiptVoucher("STUDENT'S COPY")}

            {/* CUTTING DIVIDER LINE (Visible when printing both copies) */}
            {printCopyMode === 'both' && (
              <div className="relative py-2 flex items-center justify-center">
                <div className="w-full border-t border-dashed border-black" />
                <div className="absolute px-3 bg-white text-[9px] font-mono text-black uppercase flex items-center gap-1 tracking-wider">
                  <Scissors className="w-3 h-3 text-black" />
                  <span>CUT HERE · FOLD OR DETACH</span>
                </div>
              </div>
            )}

            {/* BOTTOM VOUCHER: OFFICE COPY */}
            {(printCopyMode === 'both' || printCopyMode === 'office') &&
              renderReceiptVoucher("OFFICE COPY")}
          </div>
        </div>
      </div>
    </div>
  );
};
