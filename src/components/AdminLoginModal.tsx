import React, { useState } from 'react';
import { UserAccount } from '../types';
import { supabase } from '../lib/supabase';
import { X, ShieldCheck, LogIn, AlertCircle } from 'lucide-react';

interface LoginModalProps {
  onLoginSuccess: (user: UserAccount) => void;
  onClose: () => void;
}

export const AdminLoginModal: React.FC<LoginModalProps> = ({ onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setError('');

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        throw error;
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      setError(
        err?.message ||
          'Login Google gagal. Silakan coba kembali.'
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden relative">

        {/* Header */}
        <div className="bg-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3 border border-blue-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>

          <h3 className="text-xl font-bold">
            Portal Pengelola
          </h3>

          <p className="text-xs text-slate-300 mt-1">
            Kepala Sekolah & Administrator
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
              <ShieldCheck className="w-7 h-7 text-blue-600" />
            </div>

            <h4 className="font-bold text-slate-900 text-base">
              Masuk menggunakan akun Google
            </h4>

            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Gunakan akun Google Lazuardi yang telah terdaftar sebagai
              Kepala Sekolah atau Administrator.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-sm rounded-lg transition-all shadow-sm disabled:opacity-60"
          >
            <div className="w-6 h-6 flex items-center justify-center font-bold text-blue-600">
              G
            </div>

            <span>
              {isLoading
                ? 'Menghubungkan ke Google...'
                : 'Masuk dengan Google'}
            </span>

            {!isLoading && (
              <LogIn className="w-4 h-4 text-slate-400" />
            )}
          </button>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="text-[11px] text-slate-500 text-center leading-relaxed">
              Akses portal hanya diberikan kepada akun yang telah terdaftar
              di sistem sekolah.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
