import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { MemberList } from './components/members/MemberList';
import { MemberFormModal } from './components/members/MemberFormModal';
import { RenewModal } from './components/members/RenewModal';
import { QrCodeModal } from './components/members/QrCodeModal';
import { MembershipCardView } from './components/cards/MembershipCardView';
import { RenewalHistoryList } from './components/renewals/RenewalHistoryList';
import { EntranceScanner } from './components/scanner/EntranceScanner';
import { SettingsView } from './components/settings/SettingsView';
import { PublicVerificationPage } from './components/verification/PublicVerificationPage';
import { LoginPage } from './components/auth/LoginPage';
import { Member } from './types';
import { DataService } from './services/dataService';
import { Menu, QrCode } from 'lucide-react';

function MainApp() {
  const { user, loading: authLoading } = useAuth();

  // Navigation state
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState<boolean>(false);
  const [publicVerifyId, setPublicVerifyId] = useState<string | null>(null);

  // Data cache
  const [members, setMembers] = useState<Member[]>([]);
  const [expiringCount, setExpiringCount] = useState<number>(0);

  // Modals state
  const [isMemberModalOpen, setIsMemberModalOpen] = useState<boolean>(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [renewingMember, setRenewingMember] = useState<Member | null>(null);
  const [qrModalMember, setQrModalMember] = useState<Member | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [searchParam, setSearchParam] = useState<string>('');

  // 1. Initial URL routing check for Public Verification (/verify/UUID or ?verify=UUID)
  useEffect(() => {
    const handleLocation = () => {
      const path = window.location.pathname;
      const search = window.location.search;
      const hash = window.location.hash;

      // Match /verify/:uuid
      const pathMatch = path.match(/\/verify\/([a-zA-Z0-9-]+)/);
      if (pathMatch && pathMatch[1]) {
        setPublicVerifyId(pathMatch[1]);
        return;
      }

      // Match ?verify=uuid
      const params = new URLSearchParams(search);
      const verifyParam = params.get('verify');
      if (verifyParam) {
        setPublicVerifyId(verifyParam);
        return;
      }

      // Match #verify-uuid
      if (hash.startsWith('#verify-')) {
        setPublicVerifyId(hash.replace('#verify-', ''));
        return;
      }

      setPublicVerifyId(null);
    };

    handleLocation();
    window.addEventListener('popstate', handleLocation);
    return () => window.removeEventListener('popstate', handleLocation);
  }, []);

  // 2. Fetch members & statistics count
  const refreshData = async () => {
    try {
      const all = await DataService.getAllMembers();
      setMembers(all);
      const stats = await DataService.getDashboardStats();
      setExpiringCount(stats.expiringIn30Days);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user]);

  // Handle navigate
  const handleNavigate = (view: string) => {
    if (view.startsWith('members?search=')) {
      const query = decodeURIComponent(view.replace('members?search=', ''));
      setSearchParam(query);
      setCurrentView('members');
      return;
    }
    if (view === 'add_member') {
      setEditingMember(null);
      setIsMemberModalOpen(true);
      return;
    }
    setCurrentView(view);
  };

  // If visiting public verification route directly
  if (publicVerifyId) {
    return (
      <PublicVerificationPage
        memberId={publicVerifyId}
        onGoHome={() => {
          // Reset URL and return to dashboard
          window.history.pushState({}, '', '/');
          setPublicVerifyId(null);
        }}
      />
    );
  }

  // If auth still checking
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-emerald-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-700">
            Connecting to CPR Reading Library System...
          </p>
        </div>
      </div>
    );
  }

  // If not logged in, show administrator login
  if (!user) {
    return (
      <LoginPage
        onOpenPublicScanner={() => {
          // Open public preview with the first active member
          const first = members[0];
          if (first) {
            setPublicVerifyId(first.id);
          } else {
            setCurrentView('scanner');
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenScanner={() => setCurrentView('scanner')}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={handleNavigate}
          isOpenMobile={sidebarOpenMobile}
          onCloseMobile={() => setSidebarOpenMobile(false)}
          expiringCount={expiringCount}
        />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* Mobile Sidebar Trigger & Breadcrumb */}
          <div className="lg:hidden flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
            <button
              onClick={() => setSidebarOpenMobile(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-2xs"
            >
              <Menu className="w-4 h-4" />
              <span>Navigation Menu</span>
            </button>

            <button
              onClick={() => setCurrentView('scanner')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-900 text-amber-300 text-xs font-bold shadow-2xs"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Desk Scanner</span>
            </button>
          </div>

          {/* Views Routing */}
          {currentView === 'dashboard' && (
            <DashboardView
              onNavigate={handleNavigate}
              onRenewMember={(m) => setRenewingMember(m)}
              onSelectMember={(m) => {
                setSelectedCardId(m.id);
                setCurrentView('cards');
              }}
            />
          )}

          {currentView === 'members' && (
            <MemberList
              initialSearch={searchParam}
              initialFilter="ALL"
              onAddMember={() => {
                setEditingMember(null);
                setIsMemberModalOpen(true);
              }}
              onEditMember={(m) => {
                setEditingMember(m);
                setIsMemberModalOpen(true);
              }}
              onRenewMember={(m) => setRenewingMember(m)}
              onViewCard={(m) => {
                setSelectedCardId(m.id);
                setCurrentView('cards');
              }}
              onViewQr={(m) => setQrModalMember(m)}
            />
          )}

          {currentView === 'expiring' && (
            <MemberList
              initialFilter="EXPIRING_30"
              onAddMember={() => {
                setEditingMember(null);
                setIsMemberModalOpen(true);
              }}
              onEditMember={(m) => {
                setEditingMember(m);
                setIsMemberModalOpen(true);
              }}
              onRenewMember={(m) => setRenewingMember(m)}
              onViewCard={(m) => {
                setSelectedCardId(m.id);
                setCurrentView('cards');
              }}
              onViewQr={(m) => setQrModalMember(m)}
            />
          )}

          {currentView === 'cards' && (
            <MembershipCardView
              members={members}
              initialSelectedMemberId={selectedCardId}
              onRenewMember={(m) => setRenewingMember(m)}
            />
          )}

          {currentView === 'renewals' && <RenewalHistoryList />}

          {currentView === 'scanner' && (
            <EntranceScanner
              onOpenCard={(id) => {
                setSelectedCardId(id);
                setCurrentView('cards');
              }}
              onRenewMember={(id) => {
                const found = members.find((m) => m.id === id);
                if (found) setRenewingMember(found);
              }}
            />
          )}

          {currentView === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Doctor Registration / Edit Modal */}
      <MemberFormModal
        isOpen={isMemberModalOpen}
        initialMember={editingMember}
        onClose={() => {
          setIsMemberModalOpen(false);
          setEditingMember(null);
        }}
        onSaved={() => {
          refreshData();
        }}
      />

      {/* Membership Renewal Modal */}
      <RenewModal
        isOpen={Boolean(renewingMember)}
        member={renewingMember}
        onClose={() => setRenewingMember(null)}
        onRenewed={() => {
          refreshData();
        }}
      />

      {/* QR Code Preview & Download Modal */}
      <QrCodeModal
        isOpen={Boolean(qrModalMember)}
        member={qrModalMember}
        onClose={() => setQrModalMember(null)}
        onOpenPublicVerification={(id) => {
          setPublicVerifyId(id);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
