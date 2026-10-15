import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Search,
  Eye,
  Edit2,
  Copy,
  Trash2,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
  Sparkles,
  ExternalLink,
  Filter
} from 'lucide-react';
import {
  fetchAllFramesAdmin,
  toggleFrameActive,
  duplicateFrame,
  deleteFrame,
  updateFrameSortOrders
} from '../../services/frameService.js';
import { fetchAllEvents } from '../../services/eventService.js';
import FrameOverlay from '../FrameOverlay.jsx';

export default function AdminFramesList({ onNavigateToCreate, onNavigateToEdit }) {
  const [frames, setFrames] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [eventFilter, setEventFilter] = useState('all');
  const [previewModalFrame, setPreviewModalFrame] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [framesData, eventsData] = await Promise.all([
        fetchAllFramesAdmin(),
        fetchAllEvents(),
      ]);
      setFrames(framesData);
      setEvents(eventsData);
    } catch (err) {
      console.error('Error fetching frames:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleToggle = async (frame) => {
    try {
      const next = await toggleFrameActive(frame.id, frame.is_active);
      setFrames((prev) =>
        prev.map((f) => (f.id === frame.id ? { ...f, is_active: next } : f))
      );
      showMessage(`Status frame "${frame.name}" diubah menjadi ${next ? 'Aktif' : 'Non-Aktif'}`);
    } catch (e) {
      alert('Gagal mengubah status frame.');
    }
  };

  const handleDuplicate = async (frame) => {
    try {
      const duplicated = await duplicateFrame(frame.id);
      setFrames((prev) => [...prev, duplicated]);
      showMessage(`Frame "${frame.name}" berhasil diduplikasi sebagai "${duplicated.name}"`);
    } catch (e) {
      alert('Gagal menduplikasi frame: ' + e.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    try {
      await deleteFrame(deleteCandidate.id);
      setFrames((prev) => prev.filter((f) => f.id !== deleteCandidate.id));
      showMessage(`Frame "${deleteCandidate.name}" berhasil dihapus.`);
      setDeleteCandidate(null);
    } catch (e) {
      alert('Gagal menghapus frame.');
    }
  };

  const moveOrder = async (index, direction) => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= frames.length) return;

    const copy = [...frames];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;

    setFrames(copy);
    await updateFrameSortOrders(copy);
  };

  const showMessage = (msg) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3500);
  };

  // Filtered frames
  const filteredFrames = frames.filter((frame) => {
    const matchesSearch =
      !search ||
      frame.name.toLowerCase().includes(search.toLowerCase()) ||
      frame.slug.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || frame.type === typeFilter;
    const matchesEvent =
      eventFilter === 'all' ||
      (eventFilter === 'global' && !frame.event_id) ||
      frame.event_id === eventFilter;

    return matchesSearch && matchesType && matchesEvent;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] tracking-[0.2em] uppercase text-[#8c7365] font-mono">
            PENGATURAN BINGKAI &amp; SLOT
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl text-[#3a2820] font-normal tracking-wide">
            Kelola Frame Photobooth
          </h2>
          <p className="text-xs text-[#7a6456] mt-0.5 font-sans">
            Buat frame baru, upload PNG overlay, dan atur posisi photo slot tanpa perlu mengubah kode sumber.
          </p>
        </div>

        <button
          type="button"
          onClick={onNavigateToCreate}
          className="py-2.5 px-4 rounded-xl bg-[#5c4033] hover:bg-[#4a3429] text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer transition-transform active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Buat Frame Baru</span>
        </button>
      </div>

      {/* Notification Feedback */}
      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center justify-between animate-in fade-in">
          <span>{actionMessage}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="text-emerald-700 font-semibold text-xs ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-[#e8ded2] shadow-xs flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-[#8c7365] absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nama frame..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#d9c8b7] bg-[#faf7f2] focus:outline-none focus:ring-1 focus:ring-[#5c4033]"
          />
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#8c7365] font-medium hidden sm:inline">Tipe:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="py-1.5 px-2.5 text-xs rounded-xl border border-[#d9c8b7] bg-[#faf7f2] text-[#3a2820] focus:outline-none cursor-pointer"
          >
            <option value="all">Semua Tipe</option>
            <option value="single">Single Photo (1)</option>
            <option value="multi">Multi-Photo (3)</option>
            <option value="boomerang">Boomerang</option>
          </select>
        </div>

        {/* Event Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#8c7365] font-medium hidden sm:inline">Event:</span>
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="py-1.5 px-2.5 text-xs rounded-xl border border-[#d9c8b7] bg-[#faf7f2] text-[#3a2820] focus:outline-none cursor-pointer"
          >
            <option value="all">Semua Event</option>
            <option value="global">Frame Global (Semua Acara)</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                Event: {ev.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Frames Table / Cards */}
      <div className="bg-white rounded-3xl border border-[#e8ded2] overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-[#8c7365] text-xs">
            <div className="w-8 h-8 border-2 border-[#5c4033] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Memuat data frame dari Supabase...</span>
          </div>
        ) : filteredFrames.length === 0 ? (
          <div className="p-12 text-center text-[#8c7365] text-xs">
            <Layers className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="font-medium text-sm text-[#3a2820]">Belum ada frame.</p>
            <p className="mt-1">Buat frame pertama kamu atau ubah filter pencarian.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#faf7f2] border-b border-[#e8ded2] text-[#8c7365] uppercase text-[10px] tracking-wider font-semibold font-serif">
                  <th className="py-3 px-4 w-12 text-center">Urutan</th>
                  <th className="py-3 px-4 w-18">Preview</th>
                  <th className="py-3 px-4">Nama &amp; Detail Frame</th>
                  <th className="py-3 px-4">Tipe &amp; Slot</th>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8ded2]/60">
                {filteredFrames.map((frame, index) => {
                  const slotsCount = frame.photo_count || frame.slots?.length || 1;
                  return (
                    <tr
                      key={frame.id}
                      className="hover:bg-[#faf7f2]/70 transition-colors group"
                    >
                      {/* Sort Order Up/Down */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveOrder(index, 'up')}
                            className="p-0.5 text-[#8c7365] hover:text-[#5c4033] disabled:opacity-20 cursor-pointer"
                            title="Naikkan urutan"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-mono text-[11px] font-bold text-[#5c4033]">
                            {frame.sort_order || index + 1}
                          </span>
                          <button
                            type="button"
                            disabled={index === filteredFrames.length - 1}
                            onClick={() => moveOrder(index, 'down')}
                            className="p-0.5 text-[#8c7365] hover:text-[#5c4033] disabled:opacity-20 cursor-pointer"
                            title="Turunkan urutan"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Mini Thumbnail */}
                      <td className="py-3 px-4">
                        <div
                          onClick={() => setPreviewModalFrame(frame)}
                          className="relative w-12 aspect-[3/4] bg-[#faf7f2] rounded-lg overflow-hidden border border-[#d9c8b7] shadow-2xs cursor-pointer hover:scale-105 transition-transform"
                          title="Klik untuk melihat preview frame"
                        >
                          {frame.thumbnail_url || frame.overlay_url ? (
                            <img
                              src={frame.thumbnail_url || frame.overlay_url}
                              alt={frame.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#f0e6da] text-[8px] text-[#8c7365] font-serif">
                              {frame.name.slice(0, 3)}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      </td>

                      {/* Frame Name & Slug */}
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-semibold text-sm text-[#3a2820]">
                            {frame.name}
                          </p>
                          <p className="text-[11px] text-[#8c7365] font-mono mt-0.5">
                            slug: {frame.slug}
                          </p>
                          {frame.subtitle && (
                            <p className="text-[10px] text-[#7a6456] italic mt-0.5">
                              {frame.subtitle}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Type & Slots */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold capitalize ${
                              frame.type === 'multi'
                                ? 'bg-amber-100 text-amber-900'
                                : frame.type === 'boomerang'
                                ? 'bg-rose-100 text-rose-900'
                                : 'bg-[#f4ede4] text-[#5c4033]'
                            }`}
                          >
                            {frame.type} · {slotsCount} Slot
                          </span>
                          <span className="text-[10px] text-[#8c7365] font-mono">
                            {frame.width || 1080} x {frame.height || 1440} px
                          </span>
                        </div>
                      </td>

                      {/* Event Scope */}
                      <td className="py-3 px-4">
                        {frame.events?.name ? (
                          <span className="text-[10px] font-medium text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                            {frame.events.name}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-[#7a6456] bg-[#f4ede4] px-2 py-0.5 rounded-full border border-[#e8ded2]">
                            Global (Semua Acara)
                          </span>
                        )}
                      </td>

                      {/* Active Status Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggle(frame)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            frame.is_active
                              ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              frame.is_active ? 'bg-emerald-600' : 'bg-neutral-400'
                            }`}
                          />
                          <span>{frame.is_active ? 'Aktif' : 'Non-Aktif'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Preview Button */}
                          <button
                            type="button"
                            onClick={() => setPreviewModalFrame(frame)}
                            className="p-1.5 rounded-lg hover:bg-[#ede4d8] text-[#5c4033] cursor-pointer"
                            title="Preview Frame"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => onNavigateToEdit(frame.id)}
                            className="p-1.5 rounded-lg hover:bg-[#ede4d8] text-[#5c4033] cursor-pointer"
                            title="Edit Frame & Koordinat Slot"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Duplicate Button */}
                          <button
                            type="button"
                            onClick={() => handleDuplicate(frame)}
                            className="p-1.5 rounded-lg hover:bg-[#ede4d8] text-[#5c4033] cursor-pointer"
                            title="Duplikasi Frame"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => setDeleteCandidate(frame)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 cursor-pointer"
                            title="Hapus Frame"
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

      {/* MODAL: PREVIEW FRAME */}
      {previewModalFrame && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm bg-[#faf7f2] rounded-3xl p-5 border border-[#e8ded2] shadow-2xl flex flex-col items-center">
            <h3 className="font-serif text-lg font-semibold text-[#3a2820] mb-1">
              Preview Frame: {previewModalFrame.name}
            </h3>
            <p className="text-xs text-[#8c7365] mb-3">
              Tipe: {previewModalFrame.type} · {previewModalFrame.photo_count || 1} Slot Foto
            </p>

            {/* Frame canvas simulation */}
            <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden shadow-md bg-white border border-[#e8ded2] flex items-center justify-center">
              <FrameOverlay selectedFrame={previewModalFrame} showText={true} />
              {previewModalFrame.overlay_url && (
                <img
                  src={previewModalFrame.overlay_url}
                  alt={previewModalFrame.name}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                />
              )}
            </div>

            <div className="w-full flex items-center justify-between mt-4">
              <button
                type="button"
                onClick={() => setPreviewModalFrame(null)}
                className="py-2 px-4 rounded-xl border border-[#d9c8b7] text-xs font-semibold text-[#5c4033] hover:bg-[#f4ede4] cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = previewModalFrame.id;
                  setPreviewModalFrame(null);
                  onNavigateToEdit(id);
                }}
                className="py-2 px-4 rounded-xl bg-[#5c4033] text-white text-xs font-semibold hover:bg-[#4a3429] cursor-pointer"
              >
                Edit di Slot Editor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-[#e8ded2] shadow-2xl space-y-4">
            <h3 className="font-serif text-lg font-semibold text-rose-900">
              Hapus Frame Ini?
            </h3>
            <p className="text-xs text-[#5c4738] leading-relaxed">
              Apakah Anda yakin ingin menghapus frame <strong>"{deleteCandidate.name}"</strong>?
              Slot foto dan konfigurasi frame akan dihapus. Hasil foto tamu lama yang sudah jadi tetap tersimpan secara aman.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="py-2 px-4 rounded-xl border border-[#d9c8b7] text-xs font-medium text-[#5c4033] hover:bg-[#faf7f2] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
              >
                Hapus Frame
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
