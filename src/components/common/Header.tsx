import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, LogOut, QrCode, ShieldCheck, User } from 'lucide-react';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenScanner?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate, onOpenScanner }) => {
  const { user, signOut, isSupabaseAuth } = useAuth();

  const getTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return 'Overview';
      case 'members':
        return 'Member Directory';
      case 'add_member':
        return 'Doctor Registration';
      case 'cards':
        return 'Membership Cards';
      case 'expiring':
        return 'Expiring Memberships';
      case 'renewals':
        return 'Renewal Audit History';
      case 'scanner':
        return 'Entrance Desk Verifier';
      case 'settings':
        return 'System & Supabase Settings';
      default:
        return 'CPR Library';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-6 shrink-0 z-20">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-lg bg-emerald-900 text-amber-400 flex items-center justify-center font-bold shadow-xs">
          <BookOpen className="w-5 h-5 text-amber-300" />
        </div>
        <div>
          <button
            onClick={() => onNavigate('dashboard')}
            className="text-left font-bold text-slate-900 tracking-tight text-base sm:text-lg flex items-center gap-2 hover:text-emerald-900 transition-colors"
          >
            <span>CPR Reading Library</span>
          </button>
          <div className="text-[11px] text-slate-500 font-medium -mt-0.5 hidden sm:block">
            Chattogram, Bangladesh <span className="text-slate-300">·</span> Member Portal
          </div>
        </div>
      </div>

      {/* Zone 2: Contextual Breadcrumb & Quick Actions */}
      <div className="hidden md:flex items-center gap-2 text-sm text-slate-600">
        <span className="text-slate-400">Library Admin</span>
        <span className="text-slate-300">/</span>
        <span className="font-semibold text-slate-900">{getTitle()}</span>
      </div>

      {/* Zone 3: Single primary action & Admin profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {onOpenScanner && (
          <button
            onClick={onOpenScanner}
            title="Open Entrance Desk QR Scanner"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-emerald-900/20 text-emerald-950 bg-emerald-50 hover:bg-emerald-100 transition-colors whitespace-nowrap shrink-0"
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-800" />
            <span className="hidden sm:inline">Desk Verifier</span>
          </button>
        )}

        {user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="hidden lg:block text-right">
              <div className="text-xs font-semibold text-slate-800 truncate max-w-[150px]">
                {user.email}
              </div>
              <div className="text-[10px] text-emerald-700 font-medium flex items-center justify-end gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>{isSupabaseAuth ? 'Supabase Admin' : 'Authorized Admin'}</span>
              </div>
            </div>

            <button
              onClick={() => signOut()}
              title="Sign Out"
              className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-md border border-slate-200 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            <span>Public Access</span>
          </div>
        )}
      </div>
    </header>
  );
};
