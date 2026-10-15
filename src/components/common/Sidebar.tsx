import React from 'react';
import {
  LayoutDashboard,
  UserPlus,
  Users,
  CreditCard,
  ClockAlert,
  History,
  QrCode,
  Settings,
  LogOut,
  Building2,
  Receipt,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  expiringCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
  expiringCount = 0,
}) => {
  const { signOut, user } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'add_member', label: 'Add New Member', icon: UserPlus },
    { id: 'members', label: 'All Members', icon: Users },
    { id: 'payments', label: 'Receipts & Fees', icon: Receipt },
    { id: 'cards', label: 'Membership Cards', icon: CreditCard },
    {
      id: 'expiring',
      label: 'Expiring Soon',
      icon: ClockAlert,
      badge: expiringCount > 0 ? expiringCount : undefined,
    },
    { id: 'renewals', label: 'Renewal History', icon: History },
    { id: 'scanner', label: 'Desk Verifier', icon: QrCode },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleSelect = (id: string) => {
    onNavigate(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden backdrop-blur-xs"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 w-64 bg-slate-900 text-slate-200 z-40 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Banner */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800 bg-slate-950/60">
          <div className="w-8 h-8 rounded-md bg-emerald-800 text-amber-300 flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-700/50">
            CPR
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white tracking-wide truncate">
              CPR READING LIBRARY
            </h2>
            <p className="text-[11px] text-emerald-400/80 font-medium truncate">
              Chattogram, Bangladesh
            </p>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
          <div className="px-3 pb-2 text-[10px] font-semibold text-slate-300 tracking-wider">
            ADMINISTRATION
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-900/70 text-white font-semibold shadow-xs border border-emerald-700/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-amber-400' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Location & Academic Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400 space-y-2">
          <div className="flex items-start gap-2 text-slate-400 px-1">
            <Building2 className="w-3.5 h-3.5 mt-0.5 text-emerald-500 shrink-0" />
            <div className="leading-tight">
              <span className="font-medium text-slate-300 block">Medical Wing Facility</span>
              <span className="text-[10px] text-slate-300">Doctors Study & Resource Center</span>
            </div>
          </div>

          {user && (
            <button
              onClick={() => signOut()}
              className="w-full mt-2 flex items-center gap-2 px-3 py-2 rounded-md text-xs text-red-300 hover:text-red-100 hover:bg-red-950/40 transition-colors border border-red-900/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out Admin</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
