import React, { useState, useEffect } from 'react';
import { UserAccount, PhotocopyRequest } from './types';
import { Header } from './components/Header';
import { TeacherSubmissionForm } from './components/TeacherSubmissionForm';
import { StatusTracker } from './components/StatusTracker';
import { KepsekDashboard } from './components/KepsekDashboard';
import { AdminManagement } from './components/AdminManagement';
import { AdminLoginModal } from './components/AdminLoginModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'FORM' | 'TRACK' | 'KEPSEK' | 'ADMIN'>('FORM');
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [trackCode, setTrackCode] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetchPendingCount();
    // Periodically poll pending count
    const interval = setInterval(fetchPendingCount, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchPendingCount = async () => {
    try {
      const res = await fetch('/api/stats');
      const json = await res.json();
      if (json.success && json.data) {
        setPendingCount(json.data.pendingRequests || 0);
      }
    } catch (err) {
      console.error('Failed to fetch pending count:', err);
    }
  };

  const handleSubmittedNewRequest = (newReq: PhotocopyRequest) => {
    fetchPendingCount();
  };

  const handleGoToTrack = (code: string) => {
    setTrackCode(code);
    setActiveTab('TRACK');
  };

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setShowLoginModal(false);

    // Auto navigate based on role
    if (user.role === 'KEPSEK') {
      setActiveTab('KEPSEK');
    } else if (user.role === 'ADMIN') {
      setActiveTab('ADMIN');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('FORM');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Header Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onOpenLogin={() => setShowLoginModal(true)}
        onLogout={handleLogout}
        pendingCount={pendingCount}
      />

      {/* Main Content View */}
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

        {activeTab === 'KEPSEK' && (
          <KepsekDashboard
            reviewerName={currentUser?.name ? `${currentUser.name} (Kepala SD Lazuardi)` : 'Sari Kusuma Dewi (Kepala SD Lazuardi)'}
            onRequestUpdated={fetchPendingCount}
          />
        )}

        {activeTab === 'ADMIN' && <AdminManagement />}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-[10px]">
              EP
            </div>
            <span className="font-bold text-white text-sm">E-Photocopy</span>
            <span className="text-slate-500">| Sistem Persetujuan Bahan Ajar Sekolah</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <button onClick={() => setActiveTab('FORM')} className="hover:text-emerald-400 transition-colors">
              Formulir Guru (Publik)
            </button>
            <span>•</span>
            <button onClick={() => setActiveTab('TRACK')} className="hover:text-emerald-400 transition-colors">
              Lacak Status
            </button>
            <span>•</span>
            <button onClick={() => setShowLoginModal(true)} className="hover:text-emerald-400 transition-colors">
              Portal Pengelola & Kepala Sekolah
            </button>
          </div>
        </div>
      </footer>

      {/* Admin Login Modal */}
      {showLoginModal && (
        <AdminLoginModal
          onLoginSuccess={handleLoginSuccess}
          onClose={() => setShowLoginModal(false)}
        />
      )}
    </div>
  );
}
