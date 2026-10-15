import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Search,
  Edit2,
  Copy,
  Trash2,
  ExternalLink,
  CheckCircle,
  Clock,
  Layers,
  Image as ImageIcon,
  Save,
  X,
  Link,
  Check,
  Sparkles,
  AlertCircle,
  Upload
} from 'lucide-react';
import {
  fetchAllEvents,
  createEvent,
  updateEvent,
  duplicateEvent,
  deleteEvent,
  uploadEventCoverImage
} from '../../services/eventService.js';
import ThemeSelector from '../ThemeSelector.jsx';
import { THEMES } from '../../context/ThemeContext.jsx';
import { formatIndonesianDate } from '../ScreenLanding.jsx';

export default function AdminEventsList({ onOpenEventPhotobooth }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [formError, setFormError] = useState(null);
  const [copiedSlug, setCopiedSlug] = useState(null);
  const [createdEventSuccess, setCreatedEventSuccess] = useState(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    theme_id: 'blue',
    description: '',
    event_date: '2026-12-27',
    location: '',
    cover_image: '',
    status: 'active',
  });

  const [settingsData, setSettingsData] = useState({
    welcome_title: 'The Wedding Of',
    welcome_subtitle: 'Abadikan momenmu bersama kami',
    couple_name: '',
    theme_id: 'blue',
    allow_photo: true,
    allow_boomerang: true,
    allow_multi_photo: true,
    allow_voice: true,
    max_voice_duration: 30,
    gallery_enabled: true,
    download_enabled: true,
    share_enabled: true,
  });

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      setLoading(true);
      const data = await fetchAllEvents();
      setEvents(data);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenCreate = () => {
    setEditingEventId(null);
    setFormError(null);
    setFormData({
      name: '',
      slug: '',
      theme_id: 'blue',
      description: '',
      event_date: new Date().toISOString().split('T')[0],
      location: '',
      cover_image: '',
      status: 'active',
    });
    setSettingsData({
      welcome_title: 'The Wedding Of',
      welcome_subtitle: 'Abadikan momenmu bersama kami',
      couple_name: '',
      theme_id: 'blue',
      allow_photo: true,
      allow_boomerang: true,
      allow_multi_photo: true,
      allow_voice: true,
      max_voice_duration: 30,
      gallery_enabled: true,
      download_enabled: true,
      share_enabled: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (event) => {
    setEditingEventId(event.id);
    setFormError(null);
    const theme_id = event.theme_id || event.event_settings?.theme_id || 'blue';
    setFormData({
      name: event.name || '',
      slug: event.slug || '',
      theme_id,
      description: event.description || '',
      event_date: event.event_date || '',
      location: event.location || '',
      cover_image: event.cover_image || '',
      status: event.status || 'active',
    });
    const s = event.event_settings || {};
    setSettingsData({
      welcome_title: s.welcome_title || 'The Wedding Of',
      welcome_subtitle: s.welcome_subtitle || 'Abadikan momenmu bersama kami',
      couple_name: s.couple_name || event.name,
      theme_id,
      allow_photo: s.allow_photo ?? true,
      allow_boomerang: s.allow_boomerang ?? true,
      allow_multi_photo: s.allow_multi_photo ?? true,
      allow_voice: s.allow_voice ?? true,
      max_voice_duration: s.max_voice_duration || 30,
      gallery_enabled: s.gallery_enabled ?? true,
      download_enabled: s.download_enabled ?? true,
      share_enabled: s.share_enabled ?? true,
    });
    setModalOpen(true);
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3.5 * 1024 * 1024) {
      alert('Ukuran file melebihi 3MB. Disarankan gambar di bawah 3MB (1080x1920) agar cepat dimuat.');
    }

    setIsUploadingCover(true);
    try {
      const targetSlug = formData.slug || formData.name || 'event';
      const uploadedUrl = await uploadEventCoverImage(file, targetSlug);
      if (uploadedUrl) {
        setFormData((prev) => ({ ...prev, cover_image: uploadedUrl }));
        showMessage('Cover image berhasil diunggah.');
      }
    } catch (err) {
      console.error('Error uploading cover image:', err);
      alert('Gagal mengunggah cover image: ' + (err.message || 'Periksa koneksi internet'));
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Nama event wajib diisi.');
      return;
    }

    setFormError(null);

    try {
      const payloadData = {
        ...formData,
        name: formData.name.trim(),
        theme_id: formData.theme_id || 'blue',
      };
      const payloadSettings = {
        ...settingsData,
        theme_id: formData.theme_id || 'blue',
      };

      if (editingEventId) {
        const updated = await updateEvent(editingEventId, payloadData, payloadSettings);
        showMessage(`Event "${formData.name}" berhasil diperbarui.`);
        setModalOpen(false);
        loadEvents();
      } else {
        const created = await createEvent(payloadData, payloadSettings);
        showMessage(`Event baru "${formData.name}" berhasil dibuat.`);
        setCreatedEventSuccess(created);
        setModalOpen(false);
        loadEvents();
      }
    } catch (err) {
      console.error('Error saving event:', err);
      setFormError(err.message || 'Gagal menyimpan event.');
    }
  };

  const handleDuplicate = async (event) => {
    try {
      await duplicateEvent(event.id);
      showMessage(`Event "${event.name}" berhasil diduplikasi.`);
      loadEvents();
    } catch (e) {
      alert('Gagal menduplikasi event: ' + e.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    try {
      await deleteEvent(deleteCandidate.id);
      showMessage(`Event "${deleteCandidate.name}" berhasil dihapus.`);
      setDeleteCandidate(null);
      loadEvents();
    } catch (e) {
      alert('Gagal menghapus event.');
    }
  };

  const handleCopyLink = (slug) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${origin}/event/${slug}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(fullUrl);
      setCopiedSlug(slug);
      showMessage(`Link event disalin: /event/${slug}`);
      setTimeout(() => setCopiedSlug(null), 3000);
    } else {
      prompt('Salin link event:', fullUrl);
    }
  };

  const showMessage = (msg) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 4000);
  };

  const getThemeBadge = (themeId) => {
    switch (themeId) {
      case 'ruby':
        return {
          emoji: '🔴',
          label: 'Ruby Red',
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          dot: 'bg-[#B4232C]',
        };
      case 'green':
        return {
          emoji: '🟢',
          label: 'Emerald Green',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-[#16805B]',
        };
      case 'blue':
      default:
        return {
          emoji: '🔵',
          label: 'Royal Blue',
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          dot: 'bg-[#2563EB]',
        };
    }
  };

  const filteredEvents = events.filter(
    (e) =>
      !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] tracking-[0.2em] uppercase text-[#8c7365] font-mono">
            MANAJEMEN ACARA &amp; TEMA MULTI-TENANT
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl text-[#3a2820] font-normal tracking-wide">
            Kelola Acara (Events)
          </h2>
          <p className="text-xs text-[#7a6456] mt-0.5 font-sans">
            Setiap acara memiliki URL slug mandiri, konfigurasi tema visual (Ruby, Blue, Green), frame, dan galeri tersendiri.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="py-2.5 px-4 rounded-xl bg-[#5c4033] hover:bg-[#4a3429] text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Buat Event Baru</span>
        </button>
      </div>

      {/* Success Notification Banner after Event Creation */}
      {createdEventSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-900">
                Event "{createdEventSuccess.name}" berhasil dibuat!
              </p>
              <p className="text-[11px] text-emerald-800 font-mono mt-0.5">
                URL Photobooth: /event/{createdEventSuccess.slug} · Tema: {getThemeBadge(createdEventSuccess.theme_id).label}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopyLink(createdEventSuccess.slug)}
              className="py-1.5 px-3 rounded-lg bg-white border border-emerald-300 text-emerald-900 font-medium text-[11px] hover:bg-emerald-100 flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Link</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenEventPhotobooth?.(createdEventSuccess.slug)}
              className="py-1.5 px-3 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-[11px] flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka Photobooth</span>
            </button>
            <button
              type="button"
              onClick={() => setCreatedEventSuccess(null)}
              className="p-1 text-emerald-700 hover:text-emerald-950 cursor-pointer ml-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {actionMessage && (
        <div className="p-3 bg-neutral-900 text-white rounded-xl text-xs flex items-center justify-between animate-in fade-in shadow-md">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-white/70 hover:text-white ml-2">✕</button>
        </div>
      )}

      {/* Search Input */}
      <div className="bg-white p-3.5 rounded-2xl border border-[#e8ded2] shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-[#8c7365]" />
        <input
          type="text"
          placeholder="Cari event berdasarkan nama atau slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs bg-transparent focus:outline-none"
        />
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-3xl border border-[#e8ded2] overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-[#8c7365] text-xs">
            <div className="w-8 h-8 border-2 border-[#5c4033] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Memuat data event...</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-[#8c7365] text-xs">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="font-medium text-sm text-[#3a2820]">Belum ada event ditemukan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#faf7f2] border-b border-[#e8ded2] text-[#8c7365] uppercase text-[10px] tracking-wider font-semibold font-serif">
                  <th className="py-3 px-4">Nama Event &amp; URL Slug</th>
                  <th className="py-3 px-4 text-center">Theme Event</th>
                  <th className="py-3 px-4">Tanggal &amp; Lokasi</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Frames</th>
                  <th className="py-3 px-4 text-center">Submisi</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8ded2]/60">
                {filteredEvents.map((event) => {
                  const themeBadge = getThemeBadge(event.theme_id);
                  const isCopied = copiedSlug === event.slug;

                  return (
                    <tr key={event.id} className="hover:bg-[#faf7f2]/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-14 rounded-lg bg-neutral-100 border border-[#e8ded2] overflow-hidden shrink-0 flex items-center justify-center">
                            {event.cover_image ? (
                              <img src={event.cover_image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-[#8c7365]/40" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-[#3a2820]">{event.name}</p>
                            <p className="text-[11px] font-mono text-[#8c7365]">/event/{event.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${themeBadge.bg}`}
                          title={`Tema Aktif: ${themeBadge.label}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${themeBadge.dot}`} />
                          <span>{themeBadge.label}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#5c4738]">
                        <p className="font-semibold text-xs text-[#3a2820]">
                          {event.event_date ? formatIndonesianDate(event.event_date) : 'Belum diatur'}
                        </p>
                        {event.location ? (
                          <p className="text-[11px] text-[#8c7365] truncate max-w-xs mt-0.5">
                            📍 {event.location}
                          </p>
                        ) : (
                          <p className="text-[10px] text-neutral-400 italic mt-0.5">-</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                            event.status === 'active'
                              ? 'bg-emerald-100 text-emerald-900'
                              : event.status === 'draft'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          {event.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-medium text-[#5c4033]">
                        {event.frames_count || 0} Frame
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-medium text-[#5c4033]">
                        {event.submissions_count || 0} Submisi
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Preview / Buka Photobooth */}
                          <button
                            type="button"
                            onClick={() => onOpenEventPhotobooth?.(event.slug)}
                            className="p-1.5 rounded-lg hover:bg-[#ede4d8] text-[#5c4033] cursor-pointer"
                            title="Preview / Buka Photobooth Event Ini"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>

                          {/* Copy Link Event */}
                          <button
                            type="button"
                            onClick={() => handleCopyLink(event.slug)}
                            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                              isCopied
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'hover:bg-[#ede4d8] text-[#5c4033]'
                            }`}
                            title="Salin Link URL Photobooth"
                          >
                            {isCopied ? <Check className="w-4 h-4 text-emerald-700" /> : <Link className="w-4 h-4" />}
                          </button>

                          {/* Edit Event */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(event)}
                            className="p-1.5 rounded-lg hover:bg-[#ede4d8] text-[#5c4033] cursor-pointer"
                            title="Edit Event &amp; Tema"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Duplicate Event */}
                          <button
                            type="button"
                            onClick={() => handleDuplicate(event)}
                            className="p-1.5 rounded-lg hover:bg-[#ede4d8] text-[#5c4033] cursor-pointer"
                            title="Duplikasi Event"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {/* Delete Event */}
                          <button
                            type="button"
                            onClick={() => setDeleteCandidate(event)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 cursor-pointer"
                            title="Hapus Event"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: CREATE / EDIT EVENT */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 border border-[#e8ded2] shadow-2xl max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-[#e8ded2] pb-3">
              <div>
                <h3 className="font-serif text-lg font-semibold text-[#3a2820]">
                  {editingEventId ? `Edit Event: ${formData.name}` : 'Buat Event Baru'}
                </h3>
                <p className="text-[11px] text-[#8c7365]">
                  Konfigurasikan informasi acara dan pilih nuansa tema visual website.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[#faf7f2] flex items-center justify-center text-[#8c7365] hover:text-[#3a2820] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#3a2820] mb-1">Nama Acara *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      const slug = val
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)+/g, '');
                      setFormData((p) => ({
                        ...p,
                        name: val,
                        slug: editingEventId ? p.slug : slug,
                      }));
                    }}
                    placeholder="Contoh: Reyhan & Riska"
                    className="w-full py-2 px-3 rounded-xl border border-[#d9c8b7] bg-[#faf7f2]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#3a2820] mb-1">Slug URL *</label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-'),
                      })
                    }
                    placeholder="reyhan-riska"
                    className="w-full py-2 px-3 rounded-xl border border-[#d9c8b7] bg-[#faf7f2] font-mono text-[11px]"
                  />
                  <p className="text-[10px] text-[#8c7365] mt-0.5">
                    URL: /event/{formData.slug || 'slug-anda'}
                  </p>
                </div>
              </div>

              {/* SECTION: VISUAL THEME SELECTOR CARD */}
              <div className="pt-2 border-t border-[#e8ded2]">
                <ThemeSelector
                  value={formData.theme_id}
                  onChange={(newThemeId) =>
                    setFormData((prev) => ({ ...prev, theme_id: newThemeId }))
                  }
                  title="Pilih Nuansa Tema Photobooth untuk Acara Ini *"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#e8ded2]">
                <div>
                  <label className="block font-semibold text-[#3a2820] mb-1">Tanggal Acara</label>
                  <input
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl border border-[#d9c8b7] bg-[#faf7f2]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#3a2820] mb-1">Status Acara</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl border border-[#d9c8b7] bg-[#faf7f2]"
                  >
                    <option value="active">Active (Tamu dapat membuka photobooth)</option>
                    <option value="draft">Draft (Belum tersedia untuk tamu)</option>
                    <option value="completed">Completed (Selesai)</option>
                    <option value="archived">Archived (Diarsipkan)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#3a2820] mb-1">Lokasi Gedung / Ballroom</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Contoh: The Glass House Grand Ballroom, Jakarta"
                  className="w-full py-2 px-3 rounded-xl border border-[#d9c8b7] bg-[#faf7f2]"
                />
              </div>

              {/* SECTION: COVER IMAGE (GAMBAR UTAMA EVENT) */}
              <div className="pt-2 border-t border-[#e8ded2] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-[#3a2820]">
                    Gambar Utama Event (Cover Image)
                  </label>
                  <span className="text-[10px] text-[#8c7365]">
                    Rasio 9:16 · Maks 2–3 MB (JPG/WebP)
                  </span>
                </div>
                <p className="text-[11px] text-[#7a6456]">
                  Digunakan sebagai gambar utama pada halaman awal photobooth dan background galeri event.
                </p>

                <div className="flex flex-col sm:flex-row items-start gap-4 p-3.5 bg-[#faf7f2] rounded-2xl border border-[#e8ded2]">
                  {/* 9:16 Aspect Ratio Preview */}
                  <div className="relative w-28 aspect-[9/16] bg-neutral-200 rounded-xl overflow-hidden border border-[#d9c8b7] shadow-xs shrink-0 flex items-center justify-center">
                    {formData.cover_image ? (
                      <img
                        src={formData.cover_image}
                        alt="Preview Cover"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-2 text-[#8c7365]">
                        <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-40" />
                        <span className="text-[9px] block leading-tight">Belum Ada Cover</span>
                      </div>
                    )}
                    {isUploadingCover && (
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center text-white text-[10px] font-medium">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Upload Actions & Controls */}
                  <div className="flex-1 space-y-2.5 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="py-2 px-3.5 rounded-xl bg-[#5c4033] hover:bg-[#4a3429] text-white text-[11px] font-semibold cursor-pointer shadow-xs inline-flex items-center gap-1.5 transition-all">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{formData.cover_image ? 'Ganti Gambar' : 'Upload Cover Image'}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={handleCoverUpload}
                          disabled={isUploadingCover}
                        />
                      </label>

                      {formData.cover_image && (
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, cover_image: '' }))}
                          className="py-2 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-medium cursor-pointer"
                        >
                          Hapus Gambar
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] text-[#8c7365] mb-1 font-mono">
                        Atau URL Gambar Langsung:
                      </label>
                      <input
                        type="url"
                        value={formData.cover_image || ''}
                        onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                        placeholder="https://.../cover.jpg"
                        className="w-full py-1.5 px-3 rounded-xl border border-[#d9c8b7] bg-white text-[11px]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Feature Toggles */}
              <div className="pt-2 border-t border-[#e8ded2] space-y-2">
                <span className="font-semibold text-xs text-[#5c4033] font-serif block">
                  Fitur Photobooth Diizinkan untuk Acara Ini:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: 'allow_photo', label: 'Photo Mode' },
                    { key: 'allow_boomerang', label: 'Boomerang' },
                    { key: 'allow_multi_photo', label: '3-Foto Kolase' },
                    { key: 'allow_voice', label: 'Voice Notes' },
                  ].map((feat) => (
                    <label
                      key={feat.key}
                      className="flex items-center gap-2 p-2 rounded-xl border border-[#e8ded2] bg-[#faf7f2] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={settingsData[feat.key] ?? true}
                        onChange={(e) =>
                          setSettingsData({ ...settingsData, [feat.key]: e.target.checked })
                        }
                        className="rounded text-[#5c4033]"
                      />
                      <span className="text-[11px] font-medium text-[#3a2820]">{feat.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#e8ded2]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="py-2 px-4 rounded-xl border border-[#d9c8b7] text-xs font-semibold text-[#5c4033] cursor-pointer hover:bg-[#faf7f2]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 rounded-xl bg-[#5c4033] hover:bg-[#4a3429] text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingEventId ? 'Simpan Perubahan' : 'Buat Event'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-rose-200 shadow-2xl space-y-4 text-xs">
            <h4 className="font-serif text-base font-semibold text-rose-900">
              Hapus Acara "{deleteCandidate.name}"?
            </h4>
            <p className="text-[#8c7365]">
              Tindakan ini akan menghapus seluruh data acara dan relasinya. Data yang sudah dihapus tidak dapat dipulihkan.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="py-1.5 px-3 rounded-xl border border-[#d9c8b7] text-[#5c4033]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              >
                Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
