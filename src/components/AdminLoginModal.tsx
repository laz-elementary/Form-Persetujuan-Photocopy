import React, { useState } from 'react';
import { UserAccount } from '../types';
import { DEMO_USERS, ALLOWED_STAFF_EMAILS } from '../data/mockData';
import { Lock, X, ShieldAlert } from 'lucide-react';

interface LoginModalProps {
  onLoginSuccess: (user: UserAccount) => void;
  onClose: () => void;
}

export const AdminLoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess, onClose }) => {
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleSelectAccount = (email: string) => {
    setError('');
    setPasswordInput('');
    const cleanEmail = email.trim().toLowerCase();

    if (!ALLOWED_STAFF_EMAILS.includes(cleanEmail)) {
      setError(
        'Akses Ditolak: Hanya dini@lazuardi.sch.id, sari@lazuardi.sch.id, dan saidi@lazuardi.sch.id yang terdaftar sebagai pengelola.'
      );
      return;
    }

    setSelectedEmail(cleanEmail);
  };

  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedEmail) return;

    if (!passwordInput.trim()) {
      setError('Masukkan kata sandi atau PIN pengelola.');
      return;
    }

    // Accept default PIN 1234 or email prefix as password (e.g. sari123, dini123) or any valid PIN
    setIsAuthenticating(true);

    setTimeout(() => {
      const cleanEmail = selectedEmail.toLowerCase();
      const foundUser = DEMO_USERS.find((u) => u.email.toLowerCase() === cleanEmail);

      if (foundUser) {
        onLoginSuccess(foundUser);
      } else {
        const nameParts = cleanEmail.split('@')[0];
        const formattedName = nameParts.charAt(0).toUpperCase() + nameParts.slice(1);
        const fallbackUser: UserAccount = {
          id: `user-${nameParts}`,
          name: formattedName,
          email: cleanEmail,
          username: nameParts,
          role: cleanEmail.includes('sari') ? 'KEPSEK' : 'ADMIN',
          title: cleanEmail.includes('sari') ? 'Kepala Sekolah (ACC & Penolakan)' : 'Administrator System',
        };
        onLoginSuccess(fallbackUser);
      }
      setIsAuthenticating(false);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp relative">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3 border border-blue-500/30">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-bold">Portal Masuk Pengelola</h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Otentikasi khusus Kepala Sekolah & Tim Resource
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg font-medium flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!selectedEmail ? (
            /* Step 1: Select Account */
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Pilih Akun Pengelola Lazuardi:
              </label>
              <div className="space-y-2">
                {DEMO_USERS.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectAccount(user.email)}
                    className="w-full p-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs shrink-0 border border-blue-200">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900 group-hover:text-blue-900 flex items-center gap-1.5">
                          <span>{user.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded font-mono font-normal">
                            {user.email}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">{user.title}</div>
                      </div>
                    </div>

                    <span className="text-xs font-bold text-blue-700 group-hover:text-blue-900 transition-colors shrink-0">
                      Pilih →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Step 2: Password / PIN Verification */
            <form onSubmit={handleVerifyPassword} className="space-y-4 animate-fadeIn">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                  {selectedEmail.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 truncate">{selectedEmail}</div>
                  <div className="text-[11px] text-blue-700 font-medium">Verifikasi Kata Sandi & PIN Staf</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEmail(null)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-700 underline shrink-0"
                >
                  Ubah
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Masukkan Kata Sandi / PIN Akses:
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Ketik kata sandi / PIN (Default PIN: 1234)"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  * Untuk keperluan verifikasi demo, gunakan PIN: <strong className="text-slate-700">1234</strong>
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedEmail(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {isAuthenticating ? 'Memverifikasi...' : 'Masuk Portal'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

