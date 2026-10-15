import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Layers,
  Image as ImageIcon,
  Mic,
  Repeat,
  Sparkles,
  Plus,
  ArrowRight,
  TrendingUp,
  Clock,
  Eye
} from 'lucide-react';
import { fetchAllEvents } from '../../services/eventService.js';
import { fetchAllFramesAdmin } from '../../services/frameService.js';
import { fetchAllSubmissionsAdmin } from '../../services/submissionService.js';

export default function AdminDashboardHome({ onNavigate }) {
  const [stats, setStats] = useState({
    totalEvents: 0,
    activeEvents: 0,
    totalFrames: 0,
    activeFrames: 0,
    totalSubmissions: 0,
    totalPhotos: 0,
    totalBoomerangs: 0,
    totalMultiPhotos: 0,
    totalVoiceNotes: 0,
  });
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [events, frames, submissions] = await Promise.all([
          fetchAllEvents(),
          fetchAllFramesAdmin(),
          fetchAllSubmissionsAdmin({}),
        ]);

        const activeEventsCount = events.filter((e) => e.status === 'active').length;
        const activeFramesCount = frames.filter((f) => f.is_active).length;

        const photoSubs = submissions.filter((s) => s.type === 'photo').length;
        const boomerangSubs = submissions.filter((s) => s.type === 'boomerang').length;
        const multiSubs = submissions.filter((s) => s.type === 'multi-photo').length;
        const voiceSubs = submissions.filter((s) => s.hasVoiceNote).length;

        setStats({
          totalEvents: events.length,
          activeEvents: activeEventsCount,
          totalFrames: frames.length,
          activeFrames: activeFramesCount,
          totalSubmissions: submissions.length,
          totalPhotos: photoSubs,
          totalBoomerangs: boomerangSubs,
          totalMultiPhotos: multiSubs,
          totalVoiceNotes: voiceSubs,
        });

        setRecentSubmissions(submissions.slice(0, 6));
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#3a2820] to-[#5c4033] rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] tracking-[0.25em] uppercase text-amber-200/90 font-mono">
            XLVI PHOTOBOOTH MANAGEMENT
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-normal tracking-wide mt-1">
            Selamat Datang di Admin Dashboard
          </h2>
          <p className="text-xs text-white/80 max-w-md mt-1 font-sans leading-relaxed">
            Kelola frame kustom, atur posisi photo slot secara visual, monitor event pernikahan, dan pantau submisi galeri tamu secara real-time.
          </p>
        </div>

        {/* Quick Action CTA Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('frames', { action: 'create' })}
            className="py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#3a2820] text-xs font-semibold uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Buat Frame Baru</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('events')}
            className="py-2.5 px-4 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-medium cursor-pointer transition-colors backdrop-blur-sm border border-white/20"
          >
            <span>Kelola Event</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Events */}
        <div className="bg-white rounded-2xl p-4 border border-[#e8ded2] shadow-xs">
          <div className="flex items-center justify-between text-[#8c7365] mb-2">
            <span className="text-xs font-medium">Events</span>
            <Calendar className="w-4 h-4 text-[#5c4033]" />
          </div>
          <p className="text-2xl font-serif font-bold text-[#3a2820]">
            {loading ? '...' : stats.totalEvents}
          </p>
          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1 font-medium">
            {stats.activeEvents} Aktif
          </span>
        </div>

        {/* Total Frames */}
        <div className="bg-white rounded-2xl p-4 border border-[#e8ded2] shadow-xs">
          <div className="flex items-center justify-between text-[#8c7365] mb-2">
            <span className="text-xs font-medium">Frames Tersedia</span>
            <Layers className="w-4 h-4 text-[#5c4033]" />
          </div>
          <p className="text-2xl font-serif font-bold text-[#3a2820]">
            {loading ? '...' : stats.totalFrames}
          </p>
          <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full inline-block mt-1 font-medium">
            {stats.activeFrames} Aktif di Photobooth
          </span>
        </div>

        {/* Total Submissions */}
        <div className="bg-white rounded-2xl p-4 border border-[#e8ded2] shadow-xs">
          <div className="flex items-center justify-between text-[#8c7365] mb-2">
            <span className="text-xs font-medium">Total Submisi</span>
            <ImageIcon className="w-4 h-4 text-[#5c4033]" />
          </div>
          <p className="text-2xl font-serif font-bold text-[#3a2820]">
            {loading ? '...' : stats.totalSubmissions}
          </p>
          <span className="text-[10px] text-[#8c7365] mt-1 block">
            {stats.totalPhotos} Foto · {stats.totalBoomerangs} Boomerang
          </span>
        </div>

        {/* Voice Notes */}
        <div className="bg-white rounded-2xl p-4 border border-[#e8ded2] shadow-xs">
          <div className="flex items-center justify-between text-[#8c7365] mb-2">
            <span className="text-xs font-medium">Voice Notes Tamu</span>
            <Mic className="w-4 h-4 text-[#5c4033]" />
          </div>
          <p className="text-2xl font-serif font-bold text-[#3a2820]">
            {loading ? '...' : stats.totalVoiceNotes}
          </p>
          <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full inline-block mt-1 font-medium">
            Terekam Bersuara
          </span>
        </div>
      </div>

      {/* Breakdown Cards: Photo vs Boomerang vs Multi-Photo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-[#e8ded2] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#faf7f2] border border-[#e8ded2] flex items-center justify-center text-[#5c4033]">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#8c7365]">Single Photo</p>
            <p className="text-lg font-serif font-bold text-[#3a2820]">{stats.totalPhotos} Momen</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#e8ded2] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center">
            <Repeat className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#8c7365]">Boomerang 2s Loop</p>
            <p className="text-lg font-serif font-bold text-[#3a2820]">{stats.totalBoomerangs} Video</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#e8ded2] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#8c7365]">Multi-Photo Kolase (3 Foto)</p>
            <p className="text-lg font-serif font-bold text-[#3a2820]">{stats.totalMultiPhotos} Kolase</p>
          </div>
        </div>
      </div>

      {/* Recent Submissions Preview Table */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#e8ded2] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-serif text-lg font-medium text-[#3a2820]">
              Submisi Terbaru dari Tamu
            </h3>
            <p className="text-xs text-[#8c7365] font-sans">
              Momen photobooth yang baru saja diunggah oleh keluarga &amp; sahabat
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('gallery')}
            className="text-xs text-[#5c4033] font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Buka Galeri Lengkap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentSubmissions.length === 0 ? (
          <div className="text-center py-8 text-[#8c7365] text-xs font-sans">
            Belum ada submisi tamu. Coba ambil foto di photobooth!
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {recentSubmissions.map((sub) => (
              <div
                key={sub.id}
                onClick={() => onNavigate('gallery')}
                className="group relative bg-[#faf7f2] rounded-2xl overflow-hidden border border-[#e8ded2] cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden">
                  <img
                    src={sub.thumbnailUrl || sub.mediaUrl || sub.guestPhoto}
                    alt={sub.guestName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {sub.hasVoiceNote && (
                    <div className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 backdrop-blur-xs">
                      <Mic className="w-2.5 h-2.5" />
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/75 to-transparent p-2 text-white">
                    <p className="font-serif text-[11px] font-medium leading-tight truncate">
                      {sub.guestName}
                    </p>
                    <p className="text-[8px] text-white/75 truncate">
                      {sub.frameName || 'Frame'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
