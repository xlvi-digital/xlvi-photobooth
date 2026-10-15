import React, { useState, useEffect, useRef } from 'react';
import {
  Image as ImageIcon,
  Search,
  Filter,
  Download,
  Trash2,
  Play,
  Pause,
  Mic,
  Repeat,
  Layers,
  Heart,
  Calendar,
  X,
  Eye
} from 'lucide-react';
import { fetchAllSubmissionsAdmin, deleteSubmission } from '../../services/submissionService.js';
import { fetchAllEvents } from '../../services/eventService.js';
import { downloadFile } from '../../utils/canvasRenderer.js';
import { playSyntheticVoice } from '../../utils/audioSynthesis.js';

export default function AdminGalleryView() {
  const [submissions, setSubmissions] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [mediaTypeFilter, setMediaTypeFilter] = useState('all');
  const [eventFilter, setEventFilter] = useState('all');

  // Detail Modal & Delete
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  // Audio Player State
  const [activeAudioId, setActiveAudioId] = useState(null);
  const [activeAudioTime, setActiveAudioTime] = useState(0);
  const audioPlayerRef = useRef(null);
  const syntheticIntervalRef = useRef(null);

  useEffect(() => {
    loadGalleryData();
    return () => stopAudio();
  }, [mediaTypeFilter, eventFilter]);

  async function loadGalleryData() {
    try {
      setLoading(true);
      const [subsData, eventsData] = await Promise.all([
        fetchAllSubmissionsAdmin({ eventId: eventFilter, mediaType: mediaTypeFilter, search }),
        fetchAllEvents(),
      ]);
      setSubmissions(subsData);
      setEvents(eventsData);
    } catch (err) {
      console.error('Error loading gallery:', err);
    } finally {
      setLoading(false);
    }
  }

  const stopAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    if (syntheticIntervalRef.current) {
      clearInterval(syntheticIntervalRef.current);
      syntheticIntervalRef.current = null;
    }
    setActiveAudioId(null);
    setActiveAudioTime(0);
  };

  const handleToggleVoice = (item, e) => {
    if (e) e.stopPropagation();
    if (activeAudioId === item.id) {
      stopAudio();
      return;
    }

    stopAudio();
    setActiveAudioId(item.id);

    if (item.voiceUrl) {
      const audio = new Audio(item.voiceUrl);
      audioPlayerRef.current = audio;
      audio.ontimeupdate = () => setActiveAudioTime(audio.currentTime);
      audio.onended = () => stopAudio();
      audio.play().catch(() => playSyntheticFallback(item.id));
    } else {
      playSyntheticFallback(item.id);
    }
  };

  const playSyntheticFallback = (id) => {
    playSyntheticVoice(15, () => stopAudio());
    let sec = 0;
    syntheticIntervalRef.current = setInterval(() => {
      sec += 1;
      setActiveAudioTime(sec);
      if (sec >= 15) stopAudio();
    }, 1000);
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    try {
      await deleteSubmission(deleteCandidate.id);
      setSubmissions((prev) => prev.filter((s) => s.id !== deleteCandidate.id));
      setDeleteCandidate(null);
      if (selectedSubmission?.id === deleteCandidate.id) setSelectedSubmission(null);
    } catch (e) {
      alert('Gagal menghapus submisi.');
    }
  };

  const handleDownload = (item, e) => {
    if (e) e.stopPropagation();
    const isVideo = item.type === 'boomerang';
    const filename = `xlvi-${item.type}-${item.guestName || 'guest'}.${isVideo ? 'mp4' : 'jpg'}`;
    downloadFile(item.mediaUrl, filename);
  };

  const filtered = submissions.filter(
    (s) =>
      !search ||
      s.guestName.toLowerCase().includes(search.toLowerCase()) ||
      (s.guestMessage || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] tracking-[0.2em] uppercase text-[#8c7365] font-mono">
            DATABASE SUBMISI TAMU
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl text-[#3a2820] font-normal tracking-wide">
            Galeri Photobooth &amp; Ucapan
          </h2>
          <p className="text-xs text-[#7a6456] mt-0.5 font-sans">
            Pantau semua momen yang dibagikan oleh tamu undangan, dengarkan rekaman suara, dan unduh salinan asli.
          </p>
        </div>

        <button
          type="button"
          onClick={loadGalleryData}
          className="py-2 px-3.5 rounded-xl border border-[#d9c8b7] text-xs font-semibold text-[#5c4033] hover:bg-[#faf7f2] cursor-pointer"
        >
          Muat Ulang (Refresh)
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-[#e8ded2] shadow-xs flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-[#8c7365] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari nama tamu atau isi ucapan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#d9c8b7] bg-[#faf7f2]"
          />
        </div>

        {/* Media Type */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#8c7365] font-medium hidden sm:inline">Tipe:</span>
          <select
            value={mediaTypeFilter}
            onChange={(e) => setMediaTypeFilter(e.target.value)}
            className="py-1.5 px-2.5 text-xs rounded-xl border border-[#d9c8b7] bg-[#faf7f2] text-[#3a2820] cursor-pointer"
          >
            <option value="all">Semua Format</option>
            <option value="photo">Single Photo</option>
            <option value="multi-photo">3-Foto Kolase</option>
            <option value="boomerang">Boomerang (Video)</option>
          </select>
        </div>

        {/* Event Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#8c7365] font-medium hidden sm:inline">Acara:</span>
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="py-1.5 px-2.5 text-xs rounded-xl border border-[#d9c8b7] bg-[#faf7f2] text-[#3a2820] cursor-pointer"
          >
            <option value="all">Semua Acara</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Submissions Grid */}
      {loading ? (
        <div className="p-16 text-center text-[#8c7365] text-xs">
          <div className="w-8 h-8 border-2 border-[#5c4033] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span>Memuat galeri submisi tamu...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center text-[#8c7365] border border-[#e8ded2]">
          <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40 text-[#5c4033]" />
          <p className="font-serif text-base font-semibold text-[#3a2820]">Belum Ada Submisi</p>
          <p className="text-xs mt-1">Belum ada foto atau boomerang yang diunggah untuk kriteria ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((item) => {
            const isBoomerang = item.type === 'boomerang';
            const isAudioActive = activeAudioId === item.id;

            return (
              <div
                key={item.id}
                onClick={() => setSelectedSubmission(item)}
                className="group relative bg-white rounded-2xl overflow-hidden border border-[#e8ded2] shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                {/* Media Image / Video Container */}
                <div className="relative aspect-[3/4] w-full bg-[#faf7f2] overflow-hidden">
                  {isBoomerang && item.mediaUrl && (item.mediaUrl.endsWith('.mp4') || item.mediaUrl.endsWith('.webm')) ? (
                    <video
                      src={item.mediaUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={item.thumbnailUrl || item.mediaUrl}
                      alt={item.guestName}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                    />
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-2 inset-x-2 flex items-center justify-between pointer-events-none">
                    <span className="bg-black/60 backdrop-blur-xs text-white text-[9px] px-2 py-0.5 rounded-full capitalize">
                      {item.type}
                    </span>
                    {item.hasVoiceNote && (
                      <span className="bg-indigo-600/90 text-white text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Mic className="w-2.5 h-2.5" />
                        <span>Voice</span>
                      </span>
                    )}
                  </div>

                  {/* Gradient bottom overlay with Name */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-white">
                    <p className="font-serif text-xs font-semibold leading-tight truncate">
                      {item.guestName}
                    </p>
                    <p className="text-[9px] text-white/80 truncate">
                      {item.frameName}
                    </p>
                  </div>
                </div>

                {/* Card Body: Message & Voice Player */}
                <div className="p-2.5 flex-1 flex flex-col justify-between space-y-2">
                  <p className="text-[11px] text-[#5c4738] line-clamp-2 italic">
                    "{item.guestMessage || 'Doa terbaik untuk kedua mempelai.'}"
                  </p>

                  {/* Voice Note Player Button */}
                  {item.hasVoiceNote && (
                    <button
                      type="button"
                      onClick={(e) => handleToggleVoice(item, e)}
                      className="w-full py-1.5 px-2 bg-[#f4ede4] hover:bg-[#ede4d8] border border-[#e8ded2] rounded-xl flex items-center justify-between text-xs cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-[#5c4033] text-white flex items-center justify-center">
                          {isAudioActive ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5 ml-0.5" />}
                        </div>
                        <span className="text-[10px] font-mono text-[#5c4033]">
                          {isAudioActive ? `00:${String(Math.round(activeAudioTime)).padStart(2, '0')}` : item.voiceDuration}
                        </span>
                      </div>
                      <span className="text-[9px] text-[#8c7365]">🎙️ Dengarkan</span>
                    </button>
                  )}

                  {/* Card Bottom Actions */}
                  <div className="pt-2 border-t border-[#e8ded2]/60 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(e) => handleDownload(item, e)}
                      className="text-[#5c4033] hover:text-[#3a2820] text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                      title="Unduh File Asli"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteCandidate(item);
                      }}
                      className="text-rose-600 hover:text-rose-700 p-1 rounded-md hover:bg-rose-50 cursor-pointer"
                      title="Hapus Submisi Ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm bg-[#faf7f2] rounded-3xl p-5 border border-[#e8ded2] shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#e8ded2] pb-3 mb-3">
              <span className="font-serif text-sm font-semibold text-[#3a2820]">
                Detail Momen: {selectedSubmission.guestName}
              </span>
              <button
                type="button"
                onClick={() => {
                  stopAudio();
                  setSelectedSubmission(null);
                }}
                className="w-7 h-7 rounded-full bg-[#ede4d8] text-[#5c4033] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden shadow-md bg-white border border-[#e8ded2] mb-3">
              {selectedSubmission.type === 'boomerang' && selectedSubmission.mediaUrl && (selectedSubmission.mediaUrl.endsWith('.mp4') || selectedSubmission.mediaUrl.endsWith('.webm')) ? (
                <video
                  src={selectedSubmission.mediaUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={selectedSubmission.thumbnailUrl || selectedSubmission.mediaUrl}
                  alt={selectedSubmission.guestName}
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            <div className="bg-white rounded-2xl p-4 border border-[#e8ded2] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-serif font-semibold text-sm text-[#3a2820]">
                  {selectedSubmission.guestName}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#f4ede4] text-[#5c4033] text-[10px] font-mono">
                  {selectedSubmission.type}
                </span>
              </div>

              <p className="text-[#5c4738] italic bg-[#faf7f2] p-2.5 rounded-xl border border-[#e8ded2]">
                "{selectedSubmission.guestMessage || 'Selamat menempuh hidup baru!'}"
              </p>

              {selectedSubmission.hasVoiceNote && (
                <button
                  type="button"
                  onClick={() => handleToggleVoice(selectedSubmission)}
                  className="w-full py-2 px-3 bg-[#f7f2ea] rounded-xl border border-[#e8ded2] flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#5c4033] text-white flex items-center justify-center">
                      {activeAudioId === selectedSubmission.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                    </div>
                    <span className="font-semibold text-[#3a2820]">Putar Ucapan Suara Tamu</span>
                  </div>
                  <span className="font-mono text-[10px] text-[#8c7365]">
                    {activeAudioId === selectedSubmission.id ? `00:${String(Math.round(activeAudioTime)).padStart(2, '0')}` : selectedSubmission.voiceDuration}
                  </span>
                </button>
              )}

              <div className="pt-2 border-t border-[#e8ded2] flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(selectedSubmission)}
                  className="flex-1 py-2 px-3 bg-[#5c4033] hover:bg-[#4a3429] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Media Asli</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteCandidate(selectedSubmission)}
                  className="py-2 px-3 rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-[#e8ded2] shadow-2xl space-y-4">
            <h3 className="font-serif text-lg font-semibold text-rose-900">
              Hapus Submisi Ini?
            </h3>
            <p className="text-xs text-[#5c4738] leading-relaxed">
              Foto dan rekaman suara dari <strong>"{deleteCandidate.guestName}"</strong> akan dihapus permanen dari galeri photobooth.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="py-2 px-4 rounded-xl border border-[#d9c8b7] text-xs font-medium text-[#5c4033]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
