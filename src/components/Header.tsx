import React from 'react';
import { UserAccount } from '../types';
import { Printer, ShieldCheck, FileText, Search, LogIn, LogOut, User, CheckCircle2, Building2 } from 'lucide-react';

interface HeaderProps {
  activeTab: 'FORM' | 'TRACK' | 'KEPSEK' | 'ADMIN';
  setActiveTab: (tab: 'FORM' | 'TRACK' | 'KEPSEK' | 'ADMIN') => void;
  currentUser: UserAccount | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  pendingCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenLogin,
  onLogout,
  pendingCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      {/* Top Notification Banner */}
      <div className="bg-slate-900 text-slate-300 px-4 py-1.5 text-xs font-medium flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
          <span className="font-semibold text-white">Sistem Layanan Fotokopi Bahan Ajar</span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono hidden sm:block">
          Tahun Ajaran 2026/2027
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('FORM')}>
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg tracking-tight text-slate-900 leading-tight">
                  E-Photocopy
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold bg-blue-50 text-blue-700 rounded border border-blue-200">
                  Resmi
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Portal Persetujuan Digital Bahan Ajar Sekolah
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setActiveTab('FORM')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'FORM'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Formulir Guru</span>
              <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-bold">Publik</span>
            </button>

            <button
              onClick={() => setActiveTab('TRACK')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'TRACK'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Lacak Status</span>
            </button>

            {currentUser && (
              <>
                {(currentUser.role === 'KEPSEK' || currentUser.role === 'ADMIN') && (
                  <button
                    onClick={() => setActiveTab('KEPSEK')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
                      activeTab === 'KEPSEK'
                        ? 'bg-white text-blue-700 shadow-sm border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Portal Kepsek</span>
                    {pendingCount > 0 && (
                      <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full animate-pulse">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                )}

                {currentUser.role === 'ADMIN' && (
                  <button
                    onClick={() => setActiveTab('ADMIN')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === 'ADMIN'
                        ? 'bg-white text-blue-700 shadow-sm border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Admin Kelola</span>
                  </button>
                )}
              </>
            )}
          </nav>

          {/* Right Action Section / User Profile */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5 pl-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-800 truncate max-w-[140px]">{currentUser.name}</div>
                  <div className="text-[10px] text-blue-600 font-bold uppercase">{currentUser.role}</div>
                </div>
                <button
                  onClick={onLogout}
                  title="Keluar Account"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk Portal Staff</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden bg-slate-50 border-t border-slate-200 px-2 py-2 flex items-center justify-around overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('FORM')}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg ${
            activeTab === 'FORM' ? 'text-blue-600 font-bold' : 'text-slate-600'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Form Guru</span>
        </button>

        <button
          onClick={() => setActiveTab('TRACK')}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg ${
            activeTab === 'TRACK' ? 'text-blue-600 font-bold' : 'text-slate-600'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Lacak Status</span>
        </button>

        {currentUser && (currentUser.role === 'KEPSEK' || currentUser.role === 'ADMIN') && (
          <button
            onClick={() => setActiveTab('KEPSEK')}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg relative ${
              activeTab === 'KEPSEK' ? 'text-blue-600 font-bold' : 'text-slate-600'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Kepsek</span>
            {pendingCount > 0 && (
              <span className="absolute -top-1 right-1 bg-amber-500 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        )}

        {currentUser && currentUser.role === 'ADMIN' && (
          <button
            onClick={() => setActiveTab('ADMIN')}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg ${
              activeTab === 'ADMIN' ? 'text-blue-600 font-bold' : 'text-slate-600'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Admin Resource</span>
          </button>
        )}
      </div>
    </header>
  );
};
