import React, { useEffect, useState } from 'react';
import { UserAccount, PhotocopyRequest } from './types';
import { Header } from './components/Header';
import { TeacherSubmissionForm } from './components/TeacherSubmissionForm';
import { StatusTracker } from './components/StatusTracker';
import { KepsekDashboard } from './components/KepsekDashboard';
import { AdminManagement } from './components/AdminManagement';
import { AdminResource } from './components/AdminResource';
import { AdminLoginModal } from './components/AdminLoginModal';
import { supabase } from './lib/supabase';

type AppTab = 'FORM' | 'TRACK' | 'KEPSEK' | 'ADMIN' | 'RESOURCE';

const TAB_PATHS: Record<AppTab, string> = {
  FORM: '/',
  TRACK: '/lacak-status',
  KEPSEK: '/portal-kepsek',
  ADMIN: '/admin-kelola',
  RESOURCE: '/admin-resource',
};

const getTabFromPath = (): AppTab => {
  switch (window.location.pathname) {
    case '/lacak-status':
      return 'TRACK';
    case '/portal-kepsek':
      return 'KEPSEK';
    case '/admin-kelola':
      return 'ADMIN';
    case '/admin-resource':
      return 'RESOURCE';
    default:
      return 'FORM';
  }
};

const canAccess = (tab: AppTab, role?: UserAccount['role']) => {
  if (tab === 'FORM' || tab === 'TRACK') return true;
  if (!role) return false;
  if (tab === 'KEPSEK') {
    return role === 'KEPSEK' || role === 'WAKASEK' || role === 'ADMIN';
  }
  if (tab === 'ADMIN') return role === 'ADMIN';
  if (tab === 'RESOURCE') return role === 'RESOURCE' || role === 'ADMIN';
  return false;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>(() => getTabFromPath());
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [trackCode, setTrackCode] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [authLoading, setAuthLoading] = useState(true);

  const navigateToTab = (tab: AppTab, replace = false) => {
    if (!canAccess(tab, currentUser?.role)) {
      if (tab !== 'FORM' && tab !== 'TRACK') {
        setShowLoginModal(!currentUser);
      }
      return;
    }

    setActiveTab(tab);
    const path = TAB_PATHS[tab];

    if (window.location.pathname !== path) {
      if (replace) {
        window.history.replaceState({}, '', path);
      } else {
        window.history.pushState({}, '', path);
      }
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const next = getTabFromPath();
      if (canAccess(next, currentUser?.role)) {
        setActiveTab(next);
      } else {
        setActiveTab('FORM');
        window.history.replaceState({}, '', '/');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser]);

  const loadStaffProfile = async (email: string, authUser: any) => {
    try {
      const { data, error } = await supabase
        .from('staff_access')
        .select('id, email, name, role, active')
        .ilike('email', email)
        .eq('active', true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        await supabase.auth.signOut();
        setCurrentUser(null);
        setActiveTab('FORM');
        window.history.replaceState({}, '', '/');
        alert(
          'Akun Google ini belum memiliki akses Portal Staff. Hubungi Administrator SD.'
        );
        return;
      }

      const staffUser: UserAccount = {
        id: data.id,
        name: data.name,
        email: data.email,
        username: data.email.split('@')[0],
        role: data.role as UserAccount['role'],
        title:
          data.role === 'KEPSEK'
            ? 'Kepala Sekolah'
            : data.role === 'WAKASEK'
              ? 'Wakil Kepala Sekolah'
              : data.role === 'RESOURCE'
                ? 'Tim Resource'
                : data.role === 'ADMIN'
                  ? 'Administrator SD'
                  : 'Guru',
        avatar:
          authUser?.user_metadata?.avatar_url ||
          authUser?.user_metadata?.picture ||
          undefined,
      };

      // Penting: refresh token Supabase tidak boleh memaksa pindah halaman.
      setCurrentUser(staffUser);
      setShowLoginModal(false);

      const currentTab = getTabFromPath();
      if (!canAccess(currentTab, staffUser.role)) {
        setActiveTab('FORM');
        window.history.replaceState({}, '', '/');
      } else {
        setActiveTab(currentTab);
      }
    } catch (err) {
      console.error('Error memuat profile staff:', err);
      setCurrentUser(null);
      setActiveTab('FORM');
      window.history.replaceState({}, '', '/');
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user?.email) {
          await loadStaffProfile(session.user.email, session.user);
        } else {
          setCurrentUser(null);
          const initialTab = getTabFromPath();
          if (initialTab !== 'FORM' && initialTab !== 'TRACK') {
            setActiveTab('FORM');
            window.history.replaceState({}, '', '/');
          }
        }
      } catch (err) {
        console.error('Gagal mengecek session:', err);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      if (session?.user?.email) {
        await loadStaffProfile(session.user.email, session.user);
      } else {
        setCurrentUser(null);
        setActiveTab('FORM');
        window.history.replaceState({}, '', '/');
      }

      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchPendingCount = async () => {
    if (!currentUser) {
      setPendingCount(0);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('staff_pending_count');
      if (error) throw error;
      setPendingCount(Number(data || 0));
    } catch (err) {
      console.error('Gagal mengambil jumlah pending:', err);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      setPendingCount(0);
      return;
    }

    fetchPendingCount();
    const interval = window.setInterval(fetchPendingCount, 10000);
    return () => window.clearInterval(interval);
  }, [currentUser]);

  const handleSubmittedNewRequest = (_newReq: PhotocopyRequest) => {
    if (currentUser) fetchPendingCount();
  };

  const handleGoToTrack = (code: string) => {
    setTrackCode(code);
    setActiveTab('TRACK');
    window.history.pushState({}, '', TAB_PATHS.TRACK);
  };

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setShowLoginModal(false);

    if (user.role === 'KEPSEK' || user.role === 'WAKASEK') {
      setActiveTab('KEPSEK');
      window.history.pushState({}, '', TAB_PATHS.KEPSEK);
    } else if (user.role === 'ADMIN') {
      setActiveTab('ADMIN');
      window.history.pushState({}, '', TAB_PATHS.ADMIN);
    } else if (user.role === 'RESOURCE') {
      setActiveTab('RESOURCE');
      window.history.pushState({}, '', TAB_PATHS.RESOURCE);
    } else {
      setActiveTab('FORM');
      window.history.pushState({}, '', '/');
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout gagal:', err);
    }

    setCurrentUser(null);
    setPendingCount(0);
    setActiveTab('FORM');
    window.history.pushState({}, '', '/');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Memeriksa akun...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => navigateToTab(tab)}
        currentUser={currentUser}
        onOpenLogin={() => setShowLoginModal(true)}
        onLogout={handleLogout}
        pendingCount={pendingCount}
      />

      <main className="flex-1 pb-16">
        {/* Form tetap mounted agar isian/file tidak hilang saat pindah menu/tab. */}
        <div className={activeTab === 'FORM' ? 'block' : 'hidden'}>
          <TeacherSubmissionForm
            onSubmitted={handleSubmittedNewRequest}
            onGoToTrack={handleGoToTrack}
          />
        </div>

        {activeTab === 'TRACK' && (
          <StatusTracker initialTrackingCode={trackCode} />
        )}

        {activeTab === 'KEPSEK' &&
          currentUser &&
          canAccess('KEPSEK', currentUser.role) && (
            <KepsekDashboard
              reviewerName={`${currentUser.name} ${
                currentUser.role === 'KEPSEK'
                  ? '(Kepala SD Lazuardi)'
                  : currentUser.role === 'WAKASEK'
                    ? '(Wakil Kepala SD Lazuardi)'
                    : '(Administrator)'
              }`}
              canReview={
                currentUser.role === 'KEPSEK' ||
                currentUser.role === 'WAKASEK'
              }
              onRequestUpdated={fetchPendingCount}
            />
          )}

        {activeTab === 'ADMIN' && currentUser?.role === 'ADMIN' && (
          <AdminManagement />
        )}

        {activeTab === 'RESOURCE' &&
          currentUser &&
          (currentUser.role === 'RESOURCE' || currentUser.role === 'ADMIN') && (
            <AdminResource />
          )}
      </main>

      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-500 text-white font-black flex items-center justify-center text-[10px]">
              EP
            </div>
            <span className="font-bold text-white text-sm">E-Photocopy</span>
            <span className="text-slate-500">| Sistem Persetujuan & Layanan Fotokopi Bahan Ajar</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <button onClick={() => navigateToTab('FORM')} className="hover:text-blue-400">
              Formulir Guru
            </button>
            <span>•</span>
            <button onClick={() => navigateToTab('TRACK')} className="hover:text-blue-400">
              Lacak Status
            </button>
            {!currentUser && (
              <>
                <span>•</span>
                <button onClick={() => setShowLoginModal(true)} className="hover:text-blue-400">
                  Portal Staff
                </button>
              </>
            )}
          </div>
        </div>
      </footer>

      {showLoginModal && !currentUser && (
        <AdminLoginModal
          onLoginSuccess={handleLoginSuccess}
          onClose={() => setShowLoginModal(false)}
        />
      )}
    </div>
  );
}
