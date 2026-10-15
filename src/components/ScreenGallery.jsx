import React, { useState, useRef, useEffect } from 'react';
import { Camera, Volume2, Play, Pause, Heart, Download, X, Sparkles, Filter, AlertCircle, ArrowLeft, Infinity as InfinityIcon, Image as ImageIcon } from 'lucide-react';
import { playSyntheticVoice } from '../utils/audioSynthesis.js';
import { downloadFile } from '../utils/canvasRenderer.js';

export default function ScreenGallery({
  galleryItems,
  onStartNewPhoto,
  onBackToHome,
  triggerErrorState,
  setTriggerErrorState,
  currentEvent = null
}) {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'boomerang' | 'voice' | 'mine'
  const [likesMap, setLikesMap] = useState({});

  // Single active audio player state across the entire gallery
  const [activeAudioId, setActiveAudioId] = useState(null);
  const [activeAudioCurrentTime, setActiveAudioCurrentTime] = useState(0);
  const [activeAudioDuration, setActiveAudioDuration] = useState(0);

  const audioPlayerRef = useRef(null);
  const syntheticPlaybackRef = useRef(null);
  const syntheticIntervalRef = useRef(null);

  // Stop any audio on unmount
  useEffect(() => {
    return () => {
      stopCurrentAudio();
    };
  }, []);

  const stopCurrentAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    if (syntheticPlaybackRef.current) {
      syntheticPlaybackRef.current.stop();
      syntheticPlaybackRef.current = null;
    }
    if (syntheticIntervalRef.current) {
      clearInterval(syntheticIntervalRef.current);
      syntheticIntervalRef.current = null;
    }
    setActiveAudioId(null);
    setActiveAudioCurrentTime(0);
  };

  // Filter gallery items
  const filteredItems = galleryItems.filter((item) => {
    if (filterMode === 'boomerang') return item.type === 'boomerang';
    if (filterMode === 'voice') return item.hasVoiceNote;
    if (filterMode === 'mine') return item.isUserSubmission;
    return true;
  });

  // Handle Like
  const handleLike = (id, e) => {
    e.stopPropagation();
    setLikesMap((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1
    }));
  };

  // Parse voiceDuration string like "00:15" into seconds
  const parseDuration = (str) => {
    if (!str) return 12;
    if (typeof str === 'number') return str;
    const parts = str.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
    return 12;
  };

  const formatSeconds = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Toggle voice playback for a card (Enforces STRICT SINGLE ACTIVE AUDIO RULE)
  const handleToggleVoice = (item, e) => {
    if (e) e.stopPropagation();

    // If clicking the currently playing audio -> Pause
    if (activeAudioId === item.id) {
      stopCurrentAudio();
      return;
    }

    // Stop whatever was playing before
    stopCurrentAudio();

    const totalSeconds = parseDuration(item.voiceDuration);
    setActiveAudioDuration(totalSeconds);
    setActiveAudioId(item.id);
    setActiveAudioCurrentTime(0);

    // If item has a real audio URL, play it
    if (item.voiceUrl) {
      try {
        const audio = new Audio(item.voiceUrl);
        audioPlayerRef.current = audio;

        audio.ontimeupdate = () => {
          setActiveAudioCurrentTime(audio.currentTime);
        };

        audio.onended = () => {
          stopCurrentAudio();
        };

        audio.play().catch((err) => {
          console.warn('Real audio playback blocked, using smooth synthetic audio:', err);
          playSyntheticAudioFallback(totalSeconds);
        });
      } catch (e) {
        playSyntheticAudioFallback(totalSeconds);
      }
    } else {
      playSyntheticAudioFallback(totalSeconds);
    }
  };

  const playSyntheticAudioFallback = (totalSeconds) => {
    const node = playSyntheticVoice(totalSeconds, () => {
      stopCurrentAudio();
    });
    syntheticPlaybackRef.current = node;

    let sec = 0;
    syntheticIntervalRef.current = setInterval(() => {
      sec += 0.5;
      setActiveAudioCurrentTime(sec);
      if (sec >= totalSeconds) {
        stopCurrentAudio();
      }
    }, 500);
  };

  return (
    <div className="relative h-full w-full flex flex-col bg-transparent overflow-hidden theme-transition">
      {/* 
        STICKY COMPACT HEADER
        Does not scroll. Always visible in the 100dvh viewport.
      */}
      <header className="shrink-0 bg-white/70 backdrop-blur-md border-b border-[var(--border-color)] px-4 pt-3 pb-2 z-20 theme-transition">
        {/* Top row: Back button & Brand & New Photo button */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--primary)] hover:text-[var(--primary-dark)] py-1 px-2 -ml-2 rounded-lg hover:bg-[var(--primary-soft)] cursor-pointer font-medium active:scale-95 theme-transition"
            aria-label="Kembali ke Beranda"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Beranda</span>
          </button>

          <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)] font-serif truncate max-w-[150px]">
            {currentEvent?.name || 'XLVI Memories'}
          </span>

          <button
            onClick={onStartNewPhoto}
            className="inline-flex items-center gap-1 text-[11px] text-[var(--primary-dark)] font-semibold py-1 px-2.5 rounded-full bg-[var(--primary-light)] hover:bg-[var(--primary-soft)] cursor-pointer active:scale-95 theme-transition"
          >
            <Camera className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span>Foto Baru</span>
          </button>
        </div>

        {/* Title & Subtitle */}
        <div className="text-center mb-2">
          <h2 className="font-serif text-xl sm:text-2xl text-[var(--text-primary)] font-normal tracking-wide theme-transition">
            Photobooth Gallery
          </h2>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 font-sans theme-transition">
            Momen bahagia keluarga dan sahabat terkasih.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-center gap-1 p-0.5 bg-[var(--surface-soft)] border border-[var(--border-color)] rounded-full max-w-xs mx-auto w-full">
          <button
            onClick={() => setFilterMode('all')}
            className={`flex-1 py-1 px-2 rounded-full text-[11px] transition-all cursor-pointer theme-transition ${
              filterMode === 'all'
                ? 'bg-white font-semibold text-[var(--primary)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--primary)]'
            }`}
          >
            Semua ({galleryItems.length})
          </button>
          <button
            onClick={() => setFilterMode('boomerang')}
            className={`flex-1 py-1 px-2 rounded-full text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1 theme-transition ${
              filterMode === 'boomerang'
                ? 'bg-white font-semibold text-[var(--primary)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--primary)]'
            }`}
          >
            <InfinityIcon className="w-3 h-3" />
            <span>Boomerang</span>
          </button>
          <button
            onClick={() => setFilterMode('voice')}
            className={`flex-1 py-1 px-2 rounded-full text-[11px] transition-all cursor-pointer theme-transition ${
              filterMode === 'voice'
                ? 'bg-white font-semibold text-[var(--primary)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--primary)]'
            }`}
          >
            Suara 🎙️
          </button>
          <button
            onClick={() => setFilterMode('mine')}
            className={`flex-1 py-1 px-2 rounded-full text-[11px] transition-all cursor-pointer theme-transition ${
              filterMode === 'mine'
                ? 'bg-white font-semibold text-[var(--primary)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--primary)]'
            }`}
          >
            Milik Saya ✨
          </button>
        </div>
      </header>

      {/* Error state demonstration banner if triggered */}
      {triggerErrorState && (
        <div className="shrink-0 mx-4 mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2 text-xs shadow-xs z-20">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-amber-900">Foto belum berhasil dikirim.</p>
            <p className="text-amber-800/80 mt-0.5">Silakan periksa koneksi internet dan coba lagi.</p>
            <button
              onClick={() => setTriggerErrorState(false)}
              className="mt-1 text-[11px] font-semibold underline text-amber-900 cursor-pointer"
            >
              Tutup Pesan
            </button>
          </div>
        </div>
      )}

      {/* 
        INTERNAL GALLERY SCROLLING CONTAINER
        flex: 1, overflow-y: auto, overscroll-behavior: contain
        Body DOES NOT SCROLL. Only this area scrolls.
      */}
      <main className="flex-1 overflow-y-auto overscroll-contain px-3.5 pt-3 pb-24 relative z-10">
        {filteredItems.length === 0 ? (
          /* Empty Gallery State (Fixed 100dvh, no page scroll) */
          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8 my-auto">
            <div className="w-16 h-16 rounded-full bg-[var(--surface-soft)] border border-[var(--border-color)] text-[var(--primary)] flex items-center justify-center mb-3">
              <Camera className="w-8 h-8 opacity-70" />
            </div>
            <h4 className="font-serif text-lg text-[var(--text-primary)] font-medium mb-1">
              Belum Ada Momen
            </h4>
            <p className="text-xs text-[var(--text-secondary)] max-w-xs mb-5 font-sans leading-relaxed">
              {filterMode === 'mine'
                ? 'Kamu belum mengambil foto atau boomerang. Yuk abadikan senyum manismu sekarang!'
                : 'Belum ada momen yang dibagikan. Jadilah tamu pertama yang mengabadikan kenangan!'}
            </p>
            <button
              onClick={onStartNewPhoto}
              className="py-2.5 px-6 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold uppercase tracking-wider shadow-sm cursor-pointer active:scale-95 theme-transition"
            >
              Mulai Photobooth
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map((item) => {
              const isBoomerang = item.type === 'boomerang';
              const isAudioActive = activeAudioId === item.id;
              const likeCount = (item.likes || 0) + (likesMap[item.id] || 0);
              const isLiked = !!likesMap[item.id];
              const totalSec = parseDuration(item.voiceDuration);
              const currentProgress = isAudioActive && activeAudioDuration > 0
                ? Math.min(100, (activeAudioCurrentTime / activeAudioDuration) * 100)
                : 0;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedPhoto(item)}
                  className="group relative bg-[var(--surface)] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 border border-[var(--border-color)] cursor-pointer flex flex-col theme-transition"
                >
                  {/* Photo or Boomerang Media Preview (Untinted, original natural color) */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-[var(--surface-soft)]">
                    {isBoomerang && (item.mediaBlob || (typeof item.mediaUrl === 'string' && (item.mediaUrl.includes('.mp4') || item.mediaUrl.includes('.webm') || item.mediaUrl.startsWith('blob:')))) ? (
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
                        src={item.thumbnailUrl || item.mediaUrl || item.guestPhoto}
                        alt={item.guestName}
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                        loading="lazy"
                      />
                    )}

                    {/* Gradient Overlay at Bottom of Photo */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80 pointer-events-none" />

                    {/* Badges on Top of Card */}
                    <div className="absolute top-2 inset-x-2 flex items-center justify-between pointer-events-none">
                      {isBoomerang ? (
                        <span className="bg-black/60 backdrop-blur-xs text-white text-[8px] px-1.5 py-0.5 rounded-full flex items-center gap-1 font-sans font-medium">
                          <InfinityIcon className="w-2.5 h-2.5" />
                          <span>Boomerang</span>
                        </span>
                      ) : (
                        <span className="bg-black/50 backdrop-blur-xs text-white text-[8px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 font-sans font-medium">
                          <ImageIcon className="w-2.5 h-2.5" />
                          <span>Photo</span>
                        </span>
                      )}

                      {item.isUserSubmission && (
                        <span className="bg-[var(--primary)]/90 text-white text-[8px] px-1.5 py-0.5 rounded-full font-serif ml-auto">
                          Milikmu
                        </span>
                      )}
                    </div>

                    {/* Guest Name on Image */}
                    <div className="absolute bottom-1.5 inset-x-2 text-white pointer-events-none">
                      <p className="font-serif text-xs font-semibold leading-tight truncate">
                        {item.guestName}
                      </p>
                      <p className="text-[8px] text-white/80 font-sans truncate">
                        {item.createdAt}
                      </p>
                    </div>
                  </div>

                  {/* Card Bottom Area: Message & INLINE VOICE PLAYER */}
                  <div className="p-2.5 flex flex-col justify-between flex-1 bg-[var(--surface)]">
                    {/* Text greeting */}
                    <p className="text-[11px] text-[var(--text-primary)] font-sans line-clamp-2 leading-snug italic mb-2">
                      "{item.guestMessage || 'Selamat menempuh hidup baru!'}"
                    </p>

                    {/* INLINE VOICE NOTE PLAYER */}
                    {item.hasVoiceNote && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-[var(--surface-soft)] border border-[var(--border-color)] rounded-xl p-1.5 mb-2 flex flex-col gap-1 shadow-2xs theme-transition"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => handleToggleVoice(item, e)}
                              className="w-6 h-6 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white flex items-center justify-center cursor-pointer active:scale-95 shadow-2xs theme-transition"
                              aria-label={isAudioActive ? 'Jeda Suara' : 'Putar Suara'}
                            >
                              {isAudioActive ? (
                                <Pause className="w-2.5 h-2.5 fill-white" />
                              ) : (
                                <Play className="w-2.5 h-2.5 fill-white ml-0.5" />
                              )}
                            </button>
                            <span className="text-[10px] text-[var(--primary)] font-mono font-medium tabular-nums">
                              {isAudioActive ? formatSeconds(activeAudioCurrentTime) : (item.voiceDuration || '00:12')}
                            </span>
                          </div>

                          <div className="flex items-center gap-0.5 pr-1">
                            <span className={`w-0.5 h-2 bg-[var(--primary)] rounded-full ${isAudioActive ? 'animate-wave-1' : ''}`} />
                            <span className={`w-0.5 h-3 bg-[var(--primary)] rounded-full ${isAudioActive ? 'animate-wave-2' : ''}`} />
                            <span className={`w-0.5 h-2 bg-[var(--primary)] rounded-full ${isAudioActive ? 'animate-wave-3' : ''}`} />
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-[var(--border-color)] h-1 rounded-full overflow-hidden">
                          <div
                            className="bg-[var(--primary)] h-full transition-all duration-200"
                            style={{ width: `${currentProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Card Footer: Frame Name & Likes */}
                    <div className="pt-1 border-t border-[var(--border-color)] flex items-center justify-between mt-auto">
                      <span className="text-[8px] text-[var(--text-secondary)] font-serif truncate max-w-[80px]">
                        {item.frameName || 'Wedding Frame'}
                      </span>

                      <button
                        onClick={(e) => handleLike(item.id, e)}
                        className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Heart
                          className={`w-3 h-3 ${isLiked ? 'fill-rose-500 text-rose-500' : 'text-[var(--text-secondary)]'}`}
                        />
                        <span className="tabular-nums text-[9px]">{likeCount}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Action Bar inside 100dvh viewport */}
      <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/95 to-transparent z-20 flex justify-center pointer-events-none">
        <div className="w-full max-w-sm flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onStartNewPhoto}
            className="flex-1 h-11 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-[0.98] text-white font-medium text-xs tracking-[0.1em] uppercase transition-all duration-200 shadow-lg shadow-[var(--primary)]/25 flex items-center justify-center gap-2 cursor-pointer theme-transition"
          >
            <Camera className="w-4 h-4" />
            <span>Mulai Foto Photobooth</span>
          </button>
        </div>
      </div>

      {/* PHOTO / BOOMERANG DETAIL MODAL */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-[var(--background)] rounded-3xl overflow-hidden shadow-2xl border border-[var(--border-color)] flex flex-col max-h-[90dvh] theme-transition">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
              <span className="text-xs uppercase tracking-[0.2em] font-serif text-[var(--text-secondary)]">
                {selectedPhoto.type === 'boomerang' ? 'Boomerang Kenangan' : 'Foto Kenangan'}
              </span>
              <button
                onClick={() => {
                  stopCurrentAudio();
                  setSelectedPhoto(null);
                }}
                className="w-8 h-8 rounded-full bg-[var(--surface-soft)] text-[var(--primary)] flex items-center justify-center hover:bg-[var(--primary-light)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-4 flex-1">
              <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden shadow-md bg-white border border-[var(--border-color)] mb-3">
                {selectedPhoto.type === 'boomerang' && (selectedPhoto.mediaBlob || (typeof selectedPhoto.mediaUrl === 'string' && (selectedPhoto.mediaUrl.includes('.mp4') || selectedPhoto.mediaUrl.includes('.webm') || selectedPhoto.mediaUrl.startsWith('blob:')))) ? (
                  <video
                    src={selectedPhoto.mediaUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img
                    src={selectedPhoto.thumbnailUrl || selectedPhoto.mediaUrl || selectedPhoto.guestPhoto}
                    alt={selectedPhoto.guestName}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              <div className="bg-[var(--surface)] rounded-2xl p-3.5 border border-[var(--border-color)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-base font-semibold text-[var(--text-primary)]">
                      {selectedPhoto.guestName}
                    </h3>
                    <p className="text-[10px] text-[var(--text-secondary)] font-sans">
                      {selectedPhoto.createdAt}
                    </p>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--surface-soft)] text-[var(--primary)] font-serif">
                    {selectedPhoto.type === 'boomerang' ? '↔ Boomerang' : '📷 Photo'}
                  </span>
                </div>

                <p className="text-xs text-[var(--text-primary)] font-sans leading-relaxed italic bg-[var(--surface-soft)] p-2.5 rounded-xl border border-[var(--border-color)]/60">
                  "{selectedPhoto.guestMessage || 'Doa terbaik untuk kedua mempelai tercinta.'}"
                </p>

                {selectedPhoto.hasVoiceNote && (
                  <button
                    onClick={() => handleToggleVoice(selectedPhoto)}
                    className="w-full p-2.5 bg-[var(--surface-soft)] rounded-xl border border-[var(--border-color)] flex items-center justify-between cursor-pointer active:scale-98"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center">
                        {activeAudioId === selectedPhoto.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white ml-0.5" />}
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-semibold text-[var(--text-primary)]">Ucapan Suara</p>
                        <p className="text-[10px] text-[var(--text-secondary)] font-mono">
                          {activeAudioId === selectedPhoto.id ? formatSeconds(activeAudioCurrentTime) : selectedPhoto.voiceDuration}
                        </p>
                      </div>
                    </div>
                  </button>
                )}

                <button
                  onClick={() => downloadFile(selectedPhoto.mediaBlob || selectedPhoto.mediaUrl || selectedPhoto.guestPhoto, `xlvi-${selectedPhoto.type || 'photobooth'}-${selectedPhoto.guestName}.jpg`)}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-[var(--surface-soft)] border border-[var(--border-color)] text-[var(--primary)] text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Simpan Media Ini</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
