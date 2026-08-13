import React, { useEffect, useState } from 'react';
import { UserAccount, PhotocopyRequest } from './types';
import { Header } from './components/Header';
import { TeacherSubmissionForm } from './components/TeacherSubmissionForm';
import { StatusTracker } from './components/StatusTracker';
import { KepsekDashboard } from './components/KepsekDashboard';
import { AdminManagement } from './components/AdminManagement';
import { AdminLoginModal } from './components/AdminLoginModal';
import { supabase } from './lib/supabase';

type AppTab = 'FORM' | 'TRACK' | 'KEPSEK' | 'ADMIN';

const TAB_PATHS: Record<AppTab, string> = {
  FORM: '/',
  TRACK: '/lacak-status',
  KEPSEK: '/portal-kepsek',
  ADMIN: '/admin-resource',
};

const getTabFromPath = (): AppTab => {
  switch (window.location.pathname) {
    case '/lacak-status':
      return 'TRACK';

    case '/portal-kepsek':
      return 'KEPSEK';

    case '/admin-resource':
case '/admin-kelola':
  return 'ADMIN';

    default:
      return 'FORM';
  }
};
export default function App() {
 const [activeTab, setActiveTab] =
  useState<AppTab>(() => getTabFromPath());

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [trackCode, setTrackCode] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [authLoading, setAuthLoading] = useState(true);
    const navigateToTab = (
    tab: AppTab,
    replace = false
  ) => {
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
      setActiveTab(getTabFromPath());
    };

    window.addEventListener(
      'popstate',
      handlePopState
    );

    return () => {
      window.removeEventListener(
        'popstate',
        handlePopState
      );
    };
  }, []);

  // =====================================================
  // LOAD STAFF PROFILE DARI SUPABASE
  // =====================================================

  const loadStaffProfile = async (email: string, authUser: any) => {
    try {
      const { data, error } = await supabase
        .from('staff_access')
        .select('id, email, name, role, active')
        .ilike('email', email)
        .eq('active', true)
        .maybeSingle();

      if (error) {
        console.error('Gagal membaca staff_access:', error);
        await supabase.auth.signOut();
        setCurrentUser(null);
        setActiveTab('FORM');
        return;
      }

      // Login Google berhasil, tetapi akun tidak terdaftar
      if (!data) {
        await supabase.auth.signOut();

        setCurrentUser(null);
        setActiveTab('FORM');

        alert(
          'Akun Google ini tidak memiliki akses ke Portal Pengelola. Silakan gunakan akun Kepala Sekolah atau Administrator yang telah terdaftar.'
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
    : data.role === 'RESOURCE'
    ? 'Admin Resource'
    : 'Administrator',
        avatar:
          authUser?.user_metadata?.avatar_url ||
          authUser?.user_metadata?.picture ||
          undefined,
      };

      setCurrentUser(staffUser);
      setShowLoginModal(false);

      // Otomatis arahkan berdasarkan role
      title:
  data.role === 'KEPSEK'
    ? 'Kepala Sekolah'
    : data.role === 'RESOURCE'
    ? 'Admin Resource'
    : 'Administrator',
      }
    } catch (err) {
      console.error('Error memuat profile staff:', err);
      setCurrentUser(null);
    }
  };

  // =====================================================
  // CEK SESSION GOOGLE SAAT WEB DIBUKA
  // =====================================================

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
        }
      } catch (err) {
        console.error('Gagal mengecek session:', err);
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
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
      }

      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // =====================================================
  // HITUNG PENGAJUAN MENUNGGU
  // HANYA UNTUK STAFF YANG SUDAH LOGIN
  // =====================================================

  const fetchPendingCount = async () => {
    if (!currentUser) {
      setPendingCount(0);
      return;
    }

    try {
      const { count, error } = await supabase
        .from('photocopy_requests')
        .select('*', {
          count: 'exact',
          head: true,
        })
        .eq('status', 'MENUNGGU');

      if (error) {
        console.error('Gagal mengambil jumlah pending:', error);
        return;
      }

      setPendingCount(count || 0);
    } catch (err) {
      console.error('Failed to fetch pending count:', err);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      setPendingCount(0);
      return;
    }

    fetchPendingCount();

    const interval = setInterval(() => {
      fetchPendingCount();
    }, 10000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // =====================================================
  // FORM & TRACKING
  // =====================================================

  const handleSubmittedNewRequest = (_newReq: PhotocopyRequest) => {
    if (currentUser) {
      fetchPendingCount();
    }
  };

  const handleGoToTrack = (code: string) => {
  setTrackCode(code);
  navigateToTab('TRACK');
};

  // Tetap dipertahankan agar cocok dengan props AdminLoginModal
  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setShowLoginModal(false);

    if (user.role === 'KEPSEK') {
  navigateToTab('KEPSEK');
} else if (
  user.role === 'ADMIN' ||
  user.role === 'RESOURCE'
) {
  navigateToTab('ADMIN');
}
    }
  };

  // =====================================================
  // LOGOUT GOOGLE
  // =====================================================

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout gagal:', err);
    }

    setCurrentUser(null);
    setPendingCount(0);
    navigateToTab('FORM');
  };

  // =====================================================
  // LOADING SESSION
  // =====================================================

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />

          <p className="text-sm font-semibold text-slate-700">
            Memeriksa akun...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">

      <Header
  activeTab={activeTab}
  setActiveTab={navigateToTab}
        currentUser={currentUser}
        onOpenLogin={() => setShowLoginModal(true)}
        onLogout={handleLogout}
        pendingCount={pendingCount}
      />

      <main className="flex-1 pb-16">

        {activeTab === 'FORM' && (
          <TeacherSubmissionForm
            onSubmitted={handleSubmittedNewRequest}
            onGoToTrack={handleGoToTrack}
          />
        )}

        {activeTab === 'TRACK' && (
          <StatusTracker initialTrackingCode={trackCode} />
        )}

        {activeTab === 'KEPSEK' && currentUser && (
  <KepsekDashboard
    reviewerName={
      `${currentUser.name} ${
        currentUser.role === 'KEPSEK'
          ? '(Kepala SD Lazuardi)'
          : '(Administrator)'
      }`
    }
    canReview={currentUser.role === 'KEPSEK'}
    onRequestUpdated={fetchPendingCount}
  />
)}

        {activeTab === 'ADMIN' &&
  (currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'RESOURCE') && (
    <AdminManagement />
  )}

      </main>

      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-[10px]">
              EP
            </div>

            <span className="font-bold text-white text-sm">
              E-Photocopy
            </span>

            <span className="text-slate-500">
              | Sistem Persetujuan Bahan Ajar Sekolah
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">

            <button
              onClick={() => navigateToTab('FORM')}
              className="hover:text-emerald-400 transition-colors"
            >
              Formulir Guru (Publik)
            </button>

            <span>•</span>

            <button
              onClick={() => navigateToTab('TRACK')}
              className="hover:text-emerald-400 transition-colors"
            >
              Lacak Status
            </button>

            <span>•</span>

            {!currentUser && (
              <button
                onClick={() => setShowLoginModal(true)}
                className="hover:text-emerald-400 transition-colors"
              >
                Portal Pengelola & Kepala Sekolah
              </button>
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
