import React from 'react';
import { UserAccount } from '../types';
import {
  Printer,
  ShieldCheck,
  FileText,
  Search,
  LogIn,
  LogOut,
  Building2,
} from 'lucide-react';

type HeaderTab = 'FORM' | 'TRACK' | 'KEPSEK' | 'ADMIN' | 'RESOURCE';

interface HeaderProps {
  activeTab: HeaderTab;
  setActiveTab: (tab: HeaderTab) => void;
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
  const canApproval =
    currentUser?.role === 'KEPSEK' ||
    currentUser?.role === 'WAKASEK' ||
    currentUser?.role === 'ADMIN';

  const canAdmin = currentUser?.role === 'ADMIN';
  const canResource =
    currentUser?.role === 'RESOURCE' || currentUser?.role === 'ADMIN';

  const navButton = (tab: HeaderTab, activeClass = 'text-blue-700') =>
    `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
      activeTab === tab
        ? `bg-white ${activeClass} shadow-sm border border-slate-200/60`
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="bg-slate-900 text-slate-300 px-4 py-1.5 text-xs font-medium flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="font-semibold text-white">
            Sistem Layanan Fotokopi Bahan Ajar
          </span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono hidden sm:block">
          Tahun Ajaran 2026/2027
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button
            type="button"
            className="flex items-center gap-3 text-left"
            onClick={() => setActiveTab('FORM')}
          >
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
                Persetujuan • Tracking • Antrean Resource
              </p>
            </div>
          </button>

          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
            <button onClick={() => setActiveTab('FORM')} className={navButton('FORM')}>
              <FileText className="w-4 h-4" />
              <span>Formulir Guru</span>
              <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-bold">
                Publik
              </span>
            </button>

            <button onClick={() => setActiveTab('TRACK')} className={navButton('TRACK')}>
              <Search className="w-4 h-4" />
              <span>Lacak Status</span>
            </button>

            {canApproval && (
              <button
                onClick={() => setActiveTab('KEPSEK')}
                className={`${navButton('KEPSEK')} relative`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Portal Persetujuan</span>
                {pendingCount > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full animate-pulse">
                    {pendingCount}
                  </span>
                )}
              </button>
            )}

            {canAdmin && (
              <button onClick={() => setActiveTab('ADMIN')} className={navButton('ADMIN')}>
                <Building2 className="w-4 h-4" />
                <span>Admin Kelola</span>
              </button>
            )}

            {canResource && (
              <button
                onClick={() => setActiveTab('RESOURCE')}
                className={navButton('RESOURCE', 'text-indigo-700')}
              >
                <Printer className="w-4 h-4" />
                <span>Kelola Resource</span>
              </button>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5 pl-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-800 truncate max-w-[140px]">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-blue-600 font-bold uppercase">
                    {currentUser.role}
                  </div>
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

      <div className="md:hidden bg-slate-50 border-t border-slate-200 px-2 py-2 flex items-center justify-start gap-1 overflow-x-auto text-xs">
        <MobileButton
          label="Form"
          active={activeTab === 'FORM'}
          onClick={() => setActiveTab('FORM')}
          icon={<FileText className="w-4 h-4" />}
        />
        <MobileButton
          label="Lacak"
          active={activeTab === 'TRACK'}
          onClick={() => setActiveTab('TRACK')}
          icon={<Search className="w-4 h-4" />}
        />

        {canApproval && (
          <div className="relative">
            <MobileButton
              label="Persetujuan"
              active={activeTab === 'KEPSEK'}
              onClick={() => setActiveTab('KEPSEK')}
              icon={<ShieldCheck className="w-4 h-4" />}
            />
            {pendingCount > 0 && (
              <span className="absolute -top-1 right-0 bg-amber-500 text-white text-[9px] font-extrabold min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </div>
        )}

        {canAdmin && (
          <MobileButton
            label="Admin"
            active={activeTab === 'ADMIN'}
            onClick={() => setActiveTab('ADMIN')}
            icon={<Building2 className="w-4 h-4" />}
          />
        )}

        {canResource && (
          <MobileButton
            label="Resource"
            active={activeTab === 'RESOURCE'}
            onClick={() => setActiveTab('RESOURCE')}
            icon={<Printer className="w-4 h-4" />}
          />
        )}
      </div>
    </header>
  );
};

const MobileButton: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}> = ({ label, active, onClick, icon }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg whitespace-nowrap ${
      active ? 'text-blue-600 font-bold' : 'text-slate-600'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);
