import React, { useState, useRef, useEffect } from 'react';
import { Check, Download, ArrowRight, Camera, Share2, Play, Pause, Volume2, Info } from 'lucide-react';
import { downloadFile, generateStoryVideo } from '../utils/canvasRenderer.js';

export default function ScreenSuccess({
  submittedMedia,
  guestName,
  guestMessage,
  voiceAudioBlob,
  voiceDuration,
  selectedFrame,
  currentEvent = null,
  onGoToGallery,
  onTakeAnother
}) {
  const isBoomerang = submittedMedia?.type === 'boomerang';
  const mediaUrl = submittedMedia?.mediaUrl || submittedMedia?.thumbnailUrl;
  const eventName = currentEvent?.name || submittedMedia?.currentEvent?.name || '';

  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(null);

  const audioPlayerRef = useRef(null);
  const voiceUrlRef = useRef(null);

  // Setup audio player for recorded voice note
  useEffect(() => {
    if (voiceAudioBlob) {
      voiceUrlRef.current = URL.createObjectURL(voiceAudioBlob);
      audioPlayerRef.current = new Audio(voiceUrlRef.current);

      audioPlayerRef.current.onended = () => {
        setIsPlayingVoice(false);
      };
    }

    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      if (voiceUrlRef.current) {
        URL.revokeObjectURL(voiceUrlRef.current);
      }
    };
  }, [voiceAudioBlob]);

  // Toggle voice playback
  const handleToggleVoice = () => {
    if (!audioPlayerRef.current) return;

    if (isPlayingVoice) {
      audioPlayerRef.current.pause();
      setIsPlayingVoice(false);
    } else {
      audioPlayerRef.current.play().then(() => {
        setIsPlayingVoice(true);
      }).catch((e) => {
        console.warn('Playback error:', e);
      });
    }
  };

  // Convert media to a File object for Web Share API
  const getShareFile = async () => {
    if (isBoomerang) {
      if (submittedMedia?.mediaBlob) {
        return new File([submittedMedia.mediaBlob], `xlvi-boomerang-${Date.now()}.mp4`, {
          type: submittedMedia.mediaBlob.type || 'video/mp4'
        });
      }
      const res = await fetch(mediaUrl);
      const blob = await res.blob();
      return new File([blob], `xlvi-boomerang-${Date.now()}.mp4`, { type: 'video/mp4' });
    }

    if (submittedMedia?.mediaBlob) {
      return new File([submittedMedia.mediaBlob], `xlvi-photobooth-${Date.now()}.jpg`, { type: 'image/jpeg' });
    }
    const res = await fetch(mediaUrl);
    const blob = await res.blob();
    return new File([blob], `xlvi-photobooth-${Date.now()}.jpg`, { type: 'image/jpeg' });
  };

  // Instagram Story Share Handler
  const handleInstagramShare = async () => {
    setShareFeedback(null);
    setIsGeneratingVideo(true);

    try {
      let fileToShare = null;
      let isVideo = isBoomerang;

      if (voiceAudioBlob && !isBoomerang) {
        try {
          const videoResult = await generateStoryVideo({
            photoDataUrl: mediaUrl,
            audioBlob: voiceAudioBlob,
            guestName: guestName || 'Tamu'
          });
          fileToShare = videoResult.videoFile;
          isVideo = true;
        } catch (videoErr) {
          console.warn('Story video composition failed, falling back to static photo:', videoErr);
          fileToShare = await getShareFile();
          isVideo = false;
        }
      } else {
        fileToShare = await getShareFile();
      }

      if (navigator.share && fileToShare) {
        const shareData = {
          files: [fileToShare],
          title: 'XLVI Wedding Photobooth',
          text: `Momen kenangan pernikahan Nela & Fadli bersama ${guestName || 'kami'}!`
        };

        if (navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData);
          setShareFeedback({
            type: 'success',
            message: 'Berhasil dibagikan ke Instagram Story!'
          });
        } else {
          try {
            downloadFile(fileToShare, fileToShare.name);
            setShareFeedback({
              type: 'info',
              message: isVideo
                ? 'Video disimpan ke galeri perangkat. Kamu bisa langsung mengunggahnya ke Instagram Story!'
                : 'Foto disimpan ke galeri perangkat. Kamu bisa langsung mengunggahnya ke Instagram Story!'
            });
          } catch (e) {
            setShareFeedback({
              type: 'info',
              message: isVideo
                ? 'Video telah disimpan di perangkatmu. Buka aplikasi Instagram untuk membagikannya ke Story!'
                : 'Foto telah disimpan di perangkatmu. Buka aplikasi Instagram untuk membagikannya ke Story!'
            });
          }
        }
      } else {
        downloadFile(fileToShare, fileToShare.name);
        setShareFeedback({
          type: 'info',
          message: isVideo
            ? 'Video telah diunduh ke galeri HP kamu. Buka aplikasi Instagram lalu unggah ke Story!'
            : 'Foto telah disimpan ke galeri HP kamu. Buka aplikasi Instagram lalu unggah ke Story!'
        });
      }
    } catch (err) {
      console.error('Share process error:', err);
      const fallbackFile = await getShareFile();
      downloadFile(fallbackFile, fallbackFile.name);
      setShareFeedback({
        type: 'info',
        message: 'Hasil telah diunduh. Buka Instagram untuk membagikannya ke Story!'
      });
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  // Direct Download Handler
  const handleDirectDownload = async () => {
    if (isBoomerang) {
      if (submittedMedia?.mediaBlob) {
        downloadFile(submittedMedia.mediaBlob, `xlvi-boomerang-${Date.now()}.mp4`);
      } else {
        downloadFile(mediaUrl, `xlvi-boomerang-${Date.now()}.mp4`);
      }
      setShareFeedback({
        type: 'success',
        message: 'Video Boomerang berhasil disimpan ke perangkatmu!'
      });
    } else if (voiceAudioBlob) {
      setIsGeneratingVideo(true);
      try {
        const videoResult = await generateStoryVideo({
          photoDataUrl: mediaUrl,
          audioBlob: voiceAudioBlob,
          guestName: guestName || 'Tamu',
          currentEvent: currentEvent || submittedMedia?.currentEvent
        });
        downloadFile(videoResult.videoBlob, videoResult.fileName);
        setShareFeedback({
          type: 'success',
          message: 'Video kenangan bersuara berhasil diunduh ke perangkatmu!'
        });
      } catch (e) {
        console.warn('Video download fallback to photo:', e);
        downloadFile(submittedMedia?.mediaBlob || mediaUrl, `xlvi-photobooth-${Date.now()}.jpg`);
        setShareFeedback({
          type: 'success',
          message: 'Foto photobooth berhasil disimpan!'
        });
      } finally {
        setIsGeneratingVideo(false);
      }
    } else {
      downloadFile(submittedMedia?.mediaBlob || mediaUrl, `xlvi-photobooth-${Date.now()}.jpg`);
      setShareFeedback({
        type: 'success',
        message: 'Foto photobooth berhasil disimpan ke perangkatmu!'
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between items-center px-5 pt-3 pb-8 max-w-md mx-auto w-full text-center overflow-y-auto bg-transparent theme-transition">
      {/* Top Celebration Icon */}
      <div className="flex flex-col items-center">
        <div className="w-13 h-13 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shadow-lg shadow-[var(--primary)]/25 mb-2.5 animate-in zoom-in-75 duration-300 theme-transition">
          <Check className="w-6 h-6 stroke-[2.5]" />
        </div>

        <span className="text-[10px] tracking-[0.25em] uppercase text-[var(--primary)] font-serif block mb-0.5 font-semibold theme-transition">
          Alhamdulillah
        </span>
        <h2 className="font-serif text-2xl sm:text-3xl text-[var(--text-primary)] font-normal tracking-wide theme-transition">
          {isBoomerang ? 'Boomerang Berhasil Dikirim' : 'Foto Berhasil Dikirim'}
        </h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xs leading-relaxed font-sans theme-transition">
          Terima kasih sudah menjadi bagian dari momen spesial{' '}
          {eventName ? (
            <span className="font-serif font-semibold text-[var(--primary)]">{eventName}</span>
          ) : (
            'acara ini'
          )}.
        </p>
      </div>

      {/* Captured Media Thumbnail / Video Loop (100% natural colors, no filters) */}
      <div className="relative w-full max-w-[210px] aspect-[3/4] bg-[var(--surface)] rounded-2xl overflow-hidden shadow-xl border-2 border-[var(--border-color)] p-1.5 my-3.5 group flex items-center justify-center theme-transition">
        {isBoomerang ? (
          <video
            src={mediaUrl}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover rounded-xl"
          />
        ) : (
          <img
            src={mediaUrl}
            alt="Hasil Photobooth Kamu"
            className="w-full h-full object-cover rounded-xl"
          />
        )}

        {/* Small subtle badge */}
        <div className="absolute bottom-3 inset-x-3 text-center pointer-events-none">
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[9px] text-white font-serif">
            {isBoomerang ? '↔ Boomerang · ' : ''}{guestName || 'Tamu Istimewa'}
          </span>
        </div>
      </div>

      {/* Voice Note Player if user recorded one */}
      {voiceAudioBlob && (
        <div className="w-full max-w-[280px] bg-[var(--surface-soft)] border border-[var(--border-color)] rounded-2xl p-2.5 mb-3 flex items-center justify-between shadow-xs theme-transition">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleVoice}
              className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center hover:bg-[var(--primary-hover)] cursor-pointer shadow-xs active:scale-95 theme-transition"
              aria-label="Putar ucapan suara"
            >
              {isPlayingVoice ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white ml-0.5" />}
            </button>
            <div className="text-left">
              <p className="text-[11px] font-semibold text-[var(--text-primary)] leading-tight">Ucapan Suaramu</p>
              <p className="text-[9px] text-[var(--text-secondary)] font-mono">{voiceDuration || '00:15'}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 pr-1">
            <span className={`w-1 h-3 bg-[var(--primary)] rounded-full ${isPlayingVoice ? 'animate-wave-1' : ''}`} />
            <span className={`w-1 h-5 bg-[var(--primary)] rounded-full ${isPlayingVoice ? 'animate-wave-2' : ''}`} />
            <span className={`w-1 h-2 bg-[var(--primary)] rounded-full ${isPlayingVoice ? 'animate-wave-3' : ''}`} />
            <span className={`w-1 h-4 bg-[var(--primary)] rounded-full ${isPlayingVoice ? 'animate-wave-4' : ''}`} />
          </div>
        </div>
      )}

      {/* Share / Download Notification Feedback */}
      {shareFeedback && (
        <div className={`w-full max-w-sm p-2.5 mb-3 rounded-xl text-xs flex items-start gap-2 text-left animate-in fade-in duration-200 ${
          shareFeedback.type === 'success'
            ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
            : 'bg-amber-50 text-amber-900 border border-amber-200'
        }`}>
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-current" />
          <p className="flex-1 leading-snug">{shareFeedback.message}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="w-full space-y-2">
        {/* Bagikan ke Instagram Story */}
        <button
          onClick={handleInstagramShare}
          disabled={isGeneratingVideo}
          className="w-full h-12 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-[0.98] text-white font-medium text-xs sm:text-sm tracking-[0.08em] uppercase transition-all duration-200 shadow-md shadow-[var(--primary)]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 theme-transition"
        >
          {isGeneratingVideo ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Menyiapkan Story...</span>
            </div>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              <span>Bagikan ke Instagram Story</span>
            </>
          )}
        </button>

        {/* Download direct button */}
        <button
          onClick={handleDirectDownload}
          disabled={isGeneratingVideo}
          className="w-full h-11 rounded-full bg-white hover:bg-[var(--surface-soft)] text-[var(--primary)] border border-[var(--border-color)] text-xs font-semibold uppercase tracking-wider transition-all duration-200 shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50 theme-transition"
        >
          <Download className="w-4 h-4 text-[var(--primary)]" />
          <span>{isBoomerang ? 'Unduh Video Boomerang ke HP' : (voiceAudioBlob ? 'Unduh Video & Foto ke HP' : 'Simpan Foto ke HP')}</span>
        </button>

        {/* Lihat Gallery */}
        <button
          onClick={onGoToGallery}
          className="w-full h-11 rounded-full bg-[var(--primary-light)] hover:bg-[var(--primary-soft)] text-[var(--primary-dark)] text-xs font-semibold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer theme-transition"
        >
          <span>Lihat Photobooth Gallery</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Ambil Foto Lagi */}
        <button
          onClick={onTakeAnother}
          className="w-full py-2 text-center text-xs text-[var(--text-secondary)] hover:text-[var(--primary)] inline-flex items-center justify-center gap-1.5 cursor-pointer font-sans theme-transition"
        >
          <Camera className="w-3.5 h-3.5 text-[var(--primary)]" />
          <span>Ambil {isBoomerang ? 'Boomerang' : 'Foto'} Lagi Bersama Teman</span>
        </button>
      </div>
    </div>
  );
}
