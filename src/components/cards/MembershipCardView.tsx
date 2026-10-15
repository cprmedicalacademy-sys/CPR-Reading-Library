import React, { useState } from 'react';
import { Member } from '../../types';
import { MembershipCard } from './MembershipCard';
import { Printer, Download, ChevronLeft, ChevronRight, Layers, UserCheck } from 'lucide-react';

interface MembershipCardViewProps {
  members: Member[];
  initialSelectedMemberId?: string;
  onRenewMember: (member: Member) => void;
}

export const MembershipCardView: React.FC<MembershipCardViewProps> = ({
  members,
  initialSelectedMemberId,
  onRenewMember,
}) => {
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (initialSelectedMemberId) return initialSelectedMemberId;
    return members.length > 0 ? members[0].id : '';
  });
  const [side, setSide] = useState<'front' | 'back' | 'both'>('both');
  const [batchMode, setBatchMode] = useState<boolean>(false);

  const selectedMember = members.find((m) => m.id === selectedId) || members[0];
  const currentIndex = members.findIndex((m) => m.id === (selectedMember?.id || ''));

  const handlePrev = () => {
    if (currentIndex > 0) {
      setSelectedId(members[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (currentIndex < members.length - 1) {
      setSelectedId(members[currentIndex + 1].id);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!members || members.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-xl mx-auto shadow-xs">
        <Layers className="w-10 h-10 text-slate-300 mx-auto" />
        <h3 className="text-sm font-bold text-slate-800 mt-3">No Member Cards Available</h3>
        <p className="text-xs text-slate-500 mt-1">
          Register doctors in the Member Management directory to generate physical cards.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Controls Header (Hidden during Print) */}
      <div className="print:hidden bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Printable Library Membership Cards
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            CR80 standard physical card dimensions with dynamic QR code & anti-counterfeit details.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Side Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setSide('front')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                side === 'front'
                  ? 'bg-white text-emerald-950 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Front
            </button>
            <button
              onClick={() => setSide('back')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                side === 'back'
                  ? 'bg-white text-emerald-950 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Back
            </button>
            <button
              onClick={() => setSide('both')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                side === 'both'
                  ? 'bg-white text-emerald-950 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dual (Both)
            </button>
          </div>

          {/* Batch Print Toggle */}
          <button
            onClick={() => setBatchMode(!batchMode)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              batchMode
                ? 'bg-emerald-900 text-amber-300 border-emerald-950'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {batchMode ? 'Viewing Batch Sheet' : 'Batch Print Mode'}
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-900 text-amber-300 hover:bg-emerald-800 transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4 text-amber-300" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {batchMode ? (
        /* BATCH PRINT SHEET VIEW */
        <div className="space-y-4">
          <div className="print:hidden bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-900 flex items-center justify-between">
            <span>
              Showing all <strong>{members.length}</strong> member cards in sheet format. Click <strong>Print / Save as PDF</strong> to print cards on standard cardstock.
            </span>
            <button
              onClick={() => setBatchMode(false)}
              className="text-xs font-bold text-amber-950 underline"
            >
              Exit Batch Mode
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4 print:p-0">
            {members.map((m) => (
              <div
                key={m.id}
                className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col items-center justify-center print:border-none print:shadow-none print:p-0 print:m-0"
              >
                <MembershipCard member={m} side={side} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* SINGLE CARD PREVIEW WORKSPACE */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Member Picker List (Left Column) */}
          <div className="print:hidden bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Select Member ({members.length})
            </div>
            <div className="max-h-[500px] overflow-y-auto space-y-1 pr-1">
              {members.map((m) => {
                const isSelected = m.id === selectedMember?.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedId(m.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs text-left transition-colors ${
                      isSelected
                        ? 'bg-emerald-900 text-white font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold truncate">{m.full_name}</div>
                      <div
                        className={`text-[10px] font-mono mt-0.5 ${
                          isSelected ? 'text-amber-300' : 'text-slate-400'
                        }`}
                      >
                        {m.member_no}
                      </div>
                    </div>
                    {isSelected && <UserCheck className="w-4 h-4 text-amber-300 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card Presentation Display (Right 2 Columns) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-100 rounded-xl border border-slate-200 p-8 shadow-xs flex flex-col items-center justify-center min-h-[380px] print:bg-white print:border-none print:shadow-none print:p-0">
              {selectedMember && (
                <div id="printable-card-target" className="print:m-0">
                  <MembershipCard member={selectedMember} side={side} />
                </div>
              )}
            </div>

            {/* Stepper & Details bar */}
            {selectedMember && (
              <div className="print:hidden bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrev}
                    disabled={currentIndex <= 0}
                    className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-slate-500 font-mono">
                    {currentIndex + 1} of {members.length}
                  </span>
                  <button
                    onClick={handleNext}
                    disabled={currentIndex >= members.length - 1}
                    className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onRenewMember(selectedMember)}
                    className="text-xs font-semibold text-emerald-800 hover:underline"
                  >
                    Renew Membership
                  </button>
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-900 text-amber-300 hover:bg-emerald-800 shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-300" />
                    <span>Print Card</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
