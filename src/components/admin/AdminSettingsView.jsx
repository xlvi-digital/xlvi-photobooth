import React, { useState } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  HardDrive,
  ShieldCheck,
  ExternalLink,
  Save,
  AlertTriangle
} from 'lucide-react';
import { isSupabaseConfigured, validateSupabaseConfig, supabase, sanitizeSupabaseUrl } from '../../lib/supabase.js';

export default function AdminSettingsView() {
  const isConfigured = isSupabaseConfigured();
  const configValidation = validateSupabaseConfig();
  const [testStatus, setTestStatus] = useState(null);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  // App settings state
  const [appName, setAppName] = useState('XLVI Virtual Photobooth');
  const [defaultVoiceDuration, setDefaultVoiceDuration] = useState(30);

  const testConnection = async () => {
    setTesting(true);
    setTestStatus(null);
    try {
      if (!isConfigured) {
        setTestStatus({
          type: 'warning',
          message: configValidation.errors.join(' | ') + '. Sistem saat ini berjalan dengan local storage fallback yang aman.',
        });
        setTesting(false);
        return;
      }

      // Test 1: Database query
      const { error: dbError } = await supabase.from('events').select('count', { count: 'exact', head: true });
      if (dbError) throw dbError;

      // Test 2: Storage bucket test
      let storageNote = '';
      try {
        const { error: bucketError } = await supabase.storage.from('frames').list('', { limit: 1 });
        if (bucketError) {
          storageNote = ` (Peringatan Bucket: ${bucketError.message} — pastikan bucket "frames" sudah dibuat di Supabase Storage)`;
        } else {
          storageNote = ' dan Supabase Storage Bucket "frames" siap.';
        }
      } catch (stErr) {
        storageNote = ` (Storage check: ${stErr.message})`;
      }

      setTestStatus({
        type: 'success',
        message: `Koneksi ke Supabase PostgreSQL berhasil! Database aktif${storageNote}`,
      });
    } catch (err) {
      setTestStatus({
        type: 'error',
        message: 'Gagal terhubung ke Supabase: ' + (err.message || 'Periksa API Key dan skema tabel.'),
      });
    } finally {
      setTesting(false);
    }
  };

  const copyMigrationPath = () => {
    navigator.clipboard.writeText('/supabase/schema.sql');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearLocalCache = () => {
    if (confirm('Bersihkan cache data lokal browser?')) {
      localStorage.removeItem('xlvi_frames_db_cache_v2');
      localStorage.removeItem('xlvi_events_db_cache');
      localStorage.removeItem('xlvi_gallery_items_v2');
      alert('Cache lokal berhasil dibersihkan. Muat ulang halaman untuk memperbarui.');
    }
  };

  const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const sanitizedUrl = sanitizeSupabaseUrl(rawUrl);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <span className="text-[10px] tracking-[0.2em] uppercase text-[#8c7365] font-mono">
          KONFIGURASI SISTEM &amp; DATABASE
        </span>
        <h2 className="font-serif text-2xl sm:text-3xl text-[#3a2820] font-normal tracking-wide">
          Pengaturan Aplikasi &amp; Supabase
        </h2>
        <p className="text-xs text-[#7a6456] mt-0.5 font-sans">
          Kelola koneksi backend Supabase PostgreSQL, Storage Buckets, dan konfigurasi default photobooth.
        </p>
      </div>

      {/* Supabase Connection Card */}
      <div className="bg-white rounded-3xl p-6 border border-[#e8ded2] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e8ded2] pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
              isConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-base font-semibold text-[#3a2820]">
                Status Backend Supabase
              </h3>
              <p className="text-xs text-[#8c7365]">
                {isConfigured ? 'Supabase Client Terhubung Aktif' : 'Mode Offline / Local Fallback Siap'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={testConnection}
              disabled={testing}
              className="py-2 px-3.5 rounded-xl bg-[#5c4033] hover:bg-[#4a3429] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Menguji...' : 'Uji Koneksi Supabase'}</span>
            </button>
          </div>
        </div>

        {/* Configuration errors notification */}
        {!configValidation.isValid && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Pemberitahuan Konfigurasi Backend:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800 font-mono">
              {configValidation.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Test Result Alert */}
        {testStatus && (
          <div className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 ${
            testStatus.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : testStatus.type === 'warning'
              ? 'bg-amber-50 text-amber-900 border border-amber-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}>
            {testStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            )}
            <p className="leading-relaxed">{testStatus.message}</p>
          </div>
        )}

        {/* Environment Keys Reference */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-[#faf7f2] rounded-xl border border-[#e8ded2]">
            <span className="font-mono text-[10px] text-[#8c7365] block mb-1">
              VITE_SUPABASE_URL (Project URL Base)
            </span>
            <code className="text-[11px] font-mono text-[#3a2820] break-all block">
              {sanitizedUrl || 'Belum diatur (.env)'}
            </code>
            {rawUrl !== sanitizedUrl && (
              <span className="text-[10px] text-emerald-700 font-mono mt-1 block">
                ✓ Otomatis dinormalisasi ke format base Project URL
              </span>
            )}
          </div>
          <div className="p-3 bg-[#faf7f2] rounded-xl border border-[#e8ded2]">
            <span className="font-mono text-[10px] text-[#8c7365] block mb-1">
              VITE_SUPABASE_ANON_KEY
            </span>
            <code className="text-[11px] font-mono text-[#3a2820] truncate block">
              {import.meta.env.VITE_SUPABASE_ANON_KEY ? '●●●●●●●● (Tersimpan aman, kunci publik anonim)' : 'Belum diatur (.env)'}
            </code>
          </div>
        </div>

        {/* Migration Helper */}
        <div className="bg-[#f4ede4] p-4 rounded-2xl border border-[#e8ded2] space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-serif font-semibold text-xs text-[#5c4033] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>SQL Database Migration Script (Ready-to-Run)</span>
            </span>
            <button
              type="button"
              onClick={copyMigrationPath}
              className="inline-flex items-center gap-1 text-[11px] text-[#5c4033] hover:underline font-semibold cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin!' : 'Salin Path: /supabase/schema.sql'}</span>
            </button>
          </div>
          <p className="text-[11px] text-[#5c4738] leading-relaxed">
            File <strong>/supabase/schema.sql</strong> berisi seluruh DDL lengkap untuk: tabel <code>profiles</code>, <code>events</code>, <code>event_settings</code>, <code>frames</code>, <code>frame_slots</code>, <code>submissions</code>, <code>submission_media</code>, <code>voice_notes</code>, bucket Storage, dan RLS security policies.
          </p>
        </div>
      </div>

      {/* Storage & Buckets Card */}
      <div className="bg-white rounded-3xl p-6 border border-[#e8ded2] shadow-xs space-y-3">
        <h3 className="font-serif text-base font-semibold text-[#3a2820] flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-[#5c4033]" />
          <span>Supabase Storage Buckets</span>
        </h3>
        <p className="text-xs text-[#7a6456]">
          Struktur bucket yang otomatis digunakan oleh aplikasi dengan relative storage path:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[
            { name: 'frames', desc: 'Overlay PNG & Thumbnail', pathSample: 'event-id/frame-slug/overlay_xxx.png' },
            { name: 'events', desc: 'Cover Acara Undangan', pathSample: 'event-id/cover.jpg' },
            { name: 'submissions', desc: 'Foto, Kolase, & Boomerang', pathSample: 'event-id/submission-id/media.jpg' },
            { name: 'voices', desc: 'Audio Rekaman Suara Tamu', pathSample: 'event-id/submission-id/voice.webm' },
          ].map((b) => (
            <div key={b.name} className="p-3 bg-[#faf7f2] rounded-xl border border-[#e8ded2] space-y-1">
              <span className="font-mono font-bold text-[#5c4033] block">{b.name}</span>
              <span className="text-[10px] text-[#8c7365] block">{b.desc}</span>
              <code className="text-[9px] text-[#705849] bg-white px-1.5 py-0.5 rounded border border-[#e8ded2] font-mono block break-all">
                {b.pathSample}
              </code>
            </div>
          ))}
        </div>
      </div>

      {/* Local Storage & Cache Controls */}
      <div className="bg-white rounded-3xl p-6 border border-[#e8ded2] shadow-xs space-y-4">
        <h3 className="font-serif text-base font-semibold text-[#3a2820]">
          Pembersihan Cache Data Lokal
        </h3>
        <p className="text-xs text-[#7a6456]">
          Jika ingin mereset cache simulasi offline browser dan mengambil ulang seluruh frame dari Supabase:
        </p>
        <button
          type="button"
          onClick={clearLocalCache}
          className="py-2 px-4 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold cursor-pointer transition-colors"
        >
          Bersihkan Cache Lokal Browser
        </button>
      </div>
    </div>
  );
}
