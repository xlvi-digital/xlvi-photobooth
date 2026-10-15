import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, Sparkles, Camera, AlertTriangle } from 'lucide-react';
import { signInAdmin } from '../../services/authService.js';
import { isSupabaseConfigured, validateSupabaseConfig } from '../../lib/supabase.js';

export default function AdminLoginView({ onLoginSuccess, onBackToPhotobooth }) {
  const [email, setEmail] = useState('admin@xlvi.id');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const configStatus = validateSupabaseConfig();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const { user, error } = await signInAdmin(email, password);
      if (error) {
        setErrorMsg(error.message || 'Login gagal. Periksa kembali email dan password.');
        setLoading(false);
        return;
      }
      onLoginSuccess(user);
    } catch (err) {
      setErrorMsg('Terjadi kesalahan login: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#201d1c] text-[#faf7f2] flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Top Header */}
      <div className="max-w-md mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="font-serif text-sm tracking-wider uppercase text-amber-200/90">
            XLVI Virtual Photobooth
          </span>
        </div>

        <button
          type="button"
          onClick={onBackToPhotobooth}
          className="text-xs text-[#a39286] hover:text-white flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-white/5 cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5 text-amber-300" />
          <span>Ke Photobooth</span>
        </button>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md mx-auto w-full my-auto">
        <div className="bg-[#2c2623] border border-[#443b35] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-[#5c4033] text-amber-300 flex items-center justify-center mx-auto mb-2 shadow-lg border border-amber-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-2xl font-normal text-white tracking-wide">
              Admin Dashboard Login
            </h2>
            <p className="text-xs text-[#a39286] font-sans">
              Masuk untuk mengelola frame kustom, event pernikahan, dan galeri tamu.
            </p>
          </div>

          {/* Validation warnings for environment variables */}
          {!configStatus.isValid && (
            <div className="p-3.5 rounded-2xl bg-amber-950/60 border border-amber-800/80 text-amber-200 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Pemberitahuan Konfigurasi Backend:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-300/90 font-mono">
                {configStatus.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
              <p className="text-[11px] text-[#c9b7aa] font-sans pt-1">
                Aplikasi saat ini menggunakan local cache fallback agar operasional tetap berjalan lancar.
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-[#d4c5b9] mb-1 font-medium">
                Email Administrator
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8c7365] absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@xlvi.id"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#201d1c] border border-[#443b35] text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#d4c5b9] mb-1 font-medium">
                Kata Sandi (Password)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8c7365] absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#201d1c] border border-[#443b35] text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#5c4033] hover:bg-[#724f3f] text-white text-xs font-semibold uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-98 disabled:opacity-50"
            >
              <span>{loading ? 'Memproses...' : 'Masuk ke Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials Pill */}
          <div className="p-3 rounded-2xl bg-[#201d1c]/80 border border-[#3d342f] text-center space-y-1">
            <span className="text-[10px] text-amber-200/90 font-mono uppercase tracking-wider block">
              💡 Akses Cepat Demo Admin
            </span>
            <p className="text-[11px] text-[#a39286]">
              Email: <code>admin@xlvi.id</code> · Password: <code>admin123</code>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-[#706259]">
        XLVI Virtual Photobooth · Powered by Supabase Backend
      </div>
    </div>
  );
}
