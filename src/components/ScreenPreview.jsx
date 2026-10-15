import React, { useEffect, useState } from 'react';
import { RotateCcw, Check, Download, Infinity as InfinityIcon, Layers } from 'lucide-react';
import { renderPhotoboothComposite, renderMultiPhotoComposite, downloadImage, downloadFile } from '../utils/canvasRenderer.js';
import { FRAMES } from '../data/eventData.js';
import FilterSelector from './FilterSelector.jsx';

export default function ScreenPreview({
  capturedMedia,
  selectedFrame,
  selectedFrameId,
  currentEvent = null,
  onRetake,
  onRetakeSlot,
  onRetakeAll,
  onConfirm,
  onConfirmMedia,
  onBack,
}) {
  const confirmCallback = onConfirmMedia || onConfirm;
  const retakeCallback = onRetake || onRetakeAll;
  const activeFrame = selectedFrame || (selectedFrameId ? FRAMES.find((f) => f.id === (typeof selectedFrameId === 'object' ? selectedFrameId?.id : selectedFrameId)) : null) || capturedMedia?.selectedFrame || FRAMES[0];
  const isBoomerang = capturedMedia?.type === 'boomerang';
  const isMulti = capturedMedia?.type === 'multi-photo';

  const [selectedFilter, setSelectedFilter] = useState(capturedMedia?.filterId || 'original');
  const [compositedImage, setCompositedImage] = useState(null);
  const [compositedBlob, setCompositedBlob] = useState(null);
  const [isProcessing, setIsProcessing] = useState(!isBoomerang);

  // Handle Retake Action
  const handleRetake = () => {
    console.log('[RETAKE] resetting photo');
    setCompositedImage(null);
    setCompositedBlob(null);
    if (retakeCallback) {
      retakeCallback(capturedMedia?.rawPhotos || null);
    }
  };

  useEffect(() => {
    let isMounted = true;

    if (isBoomerang) {
      setIsProcessing(false);
      setCompositedImage(capturedMedia?.thumbnailUrl);
      setCompositedBlob(capturedMedia?.mediaBlob);
    } else if (isMulti && capturedMedia?.rawPhotos && capturedMedia.rawPhotos.length > 0) {
      // Re-composite multi-photo when filter changes
      setIsProcessing(true);
      renderMultiPhotoComposite(capturedMedia.rawPhotos, activeFrame, false, currentEvent, selectedFilter)
        .then(({ dataUrl, blob }) => {
          if (isMounted) {
            setCompositedImage(dataUrl);
            setCompositedBlob(blob);
            setIsProcessing(false);
          }
        })
        .catch((err) => {
          console.error('Error re-rendering multi-photo composite:', err);
          if (isMounted) {
            setCompositedImage(capturedMedia.mediaUrl);
            setIsProcessing(false);
          }
        });
    } else if (capturedMedia?.mediaUrl) {
      // Single photo: composite with the selected frame overlay and typography & filter
      setIsProcessing(true);
      const photoSrc = capturedMedia.rawPhoto || capturedMedia.mediaUrl;
      renderPhotoboothComposite(photoSrc, activeFrame, capturedMedia.isMirrored, currentEvent, selectedFilter)
        .then(({ dataUrl, blob }) => {
          if (isMounted) {
            setCompositedImage(dataUrl);
            setCompositedBlob(blob);
            setIsProcessing(false);
          }
        })
        .catch((err) => {
          console.error('Error rendering photobooth composite:', err);
          if (isMounted) {
            setCompositedImage(capturedMedia.mediaUrl);
            setIsProcessing(false);
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [capturedMedia, activeFrame, isBoomerang, isMulti, currentEvent, selectedFilter]);

  const handleConfirm = async () => {
    let finalBlob = compositedBlob;

    // Safety check: if blob is not yet ready, convert compositedImage / dataUrl to blob
    if (!finalBlob && compositedImage && typeof compositedImage === 'string' && compositedImage.startsWith('data:')) {
      try {
        const parts = compositedImage.split(',');
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        finalBlob = new Blob([u8arr], { type: 'image/jpeg' });
      } catch (e) {
        console.warn('Fallback dataUrl to Blob conversion warning:', e);
      }
    }

    if (isBoomerang) {
      confirmCallback({
        type: 'boomerang',
        mediaUrl: capturedMedia.mediaUrl,
        mediaBlob: capturedMedia.mediaBlob,
        thumbnailUrl: capturedMedia.thumbnailUrl,
        isMirrored: capturedMedia.isMirrored,
        selectedFrame: activeFrame,
        frameId: activeFrame?.id,
        currentEvent: currentEvent || capturedMedia?.currentEvent,
        filterId: selectedFilter,
      });
    } else if (isMulti) {
      confirmCallback({
        type: 'multi-photo',
        photoCount: capturedMedia.photoCount || 3,
        mediaUrl: compositedImage || capturedMedia.mediaUrl,
        mediaBlob: finalBlob || capturedMedia.mediaBlob,
        thumbnailUrl: compositedImage || capturedMedia.mediaUrl,
        rawPhotos: capturedMedia.rawPhotos,
        selectedFrame: activeFrame,
        frameId: activeFrame?.id,
        currentEvent: currentEvent || capturedMedia?.currentEvent,
        filterId: selectedFilter,
      });
    } else {
      confirmCallback({
        type: 'photo',
        photoCount: 1,
        mediaUrl: compositedImage || capturedMedia.mediaUrl,
        mediaBlob: finalBlob || capturedMedia.mediaBlob,
        thumbnailUrl: compositedImage || capturedMedia.mediaUrl,
        isMirrored: false,
        selectedFrame: activeFrame,
        frameId: activeFrame?.id,
        currentEvent: currentEvent || capturedMedia?.currentEvent,
        filterId: selectedFilter,
      });
    }
  };

  const handleDownloadPreview = () => {
    if (isBoomerang) {
      if (capturedMedia.mediaBlob) {
        downloadFile(capturedMedia.mediaBlob, `xlvi-boomerang-${Date.now()}.mp4`);
      } else {
        downloadImage(capturedMedia.thumbnailUrl, `xlvi-boomerang-${Date.now()}.jpg`);
      }
    } else {
      if (compositedBlob) {
        downloadFile(compositedBlob, `xlvi-photo-${Date.now()}.jpg`);
      } else {
        downloadImage(compositedImage || capturedMedia.mediaUrl, `xlvi-photo-${Date.now()}.jpg`);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between px-5 pt-3 pb-6 max-w-md mx-auto w-full bg-transparent theme-transition">
      {/* Title */}
      <div className="text-center mb-2">
        <span className="text-[10px] tracking-[0.25em] uppercase text-[var(--primary)] font-serif block mb-0.5 font-semibold theme-transition">
          Hasil Capture
        </span>
        <h2 className="font-serif text-2xl sm:text-3xl text-[var(--text-primary)] font-normal tracking-wide theme-transition">
          {isBoomerang ? 'Hasil Boomerang' : isMulti ? 'Hasil Kolase 3 Foto' : 'Hasil Foto'}
        </h2>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-sans theme-transition">
          Frame: <strong>{activeFrame?.name}</strong>. Cek hasil &amp; filter sebelum lanjut.
        </p>
      </div>

      {/* Photobooth Card Preview (Media itself is rendered with the chosen filter, frame decor is unaffected) */}
      <div className="relative w-full max-w-[320px] mx-auto aspect-[3/4] bg-[var(--surface)] rounded-2xl overflow-hidden shadow-xl border border-[var(--border-color)] p-2 flex flex-col justify-between theme-transition">
        {isProcessing ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--surface-soft)] text-[var(--text-secondary)]">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-serif italic">Menyatukan foto &amp; bingkai {activeFrame?.name}...</p>
          </div>
        ) : (
          <div className="relative w-full h-full rounded-xl overflow-hidden bg-[var(--surface-soft)] flex items-center justify-center">
            {isBoomerang ? (
              <>
                {/* Boomerang Video Player */}
                <video
                  src={capturedMedia.mediaUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                />
                {/* Boomerang Tag Badge */}
                <div className="absolute top-2 left-2 z-20 bg-black/60 backdrop-blur-xs text-white text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 font-sans">
                  <InfinityIcon className="w-3 h-3" />
                  <span>Boomerang · 2s Loop</span>
                </div>
              </>
            ) : isMulti ? (
              <>
                <img
                  src={compositedImage || capturedMedia.mediaUrl}
                  alt="Multi-photo Preview"
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-2 left-2 z-20 bg-[var(--primary)]/90 backdrop-blur-xs text-white text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 font-sans">
                  <Layers className="w-3 h-3" />
                  <span>3 Foto Kolase</span>
                </div>
              </>
            ) : (
              <img
                src={compositedImage || capturedMedia.mediaUrl}
                alt="Photobooth Preview"
                className="w-full h-full object-contain"
              />
            )}
          </div>
        )}
      </div>

      {/* Preset Photo Filter Strip Bar (Available on preview before final save) */}
      {!isBoomerang && (
        <div className="mt-2 mb-1 w-full max-w-sm mx-auto">
          <FilterSelector
            selectedFilter={selectedFilter}
            onSelectFilter={setSelectedFilter}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-3 space-y-2.5">
        <div className="flex items-center gap-3">
          {/* Ambil Ulang / Ulangi */}
          <button
            onClick={handleRetake}
            className="flex-1 h-12 rounded-full bg-white hover:bg-[var(--surface-soft)] text-[var(--primary)] border border-[var(--border-color)] text-xs font-semibold uppercase tracking-wider transition-all duration-200 shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98 theme-transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{isBoomerang ? 'Ulangi' : 'Ambil Ulang'}</span>
          </button>

          {/* Gunakan / Gunakan Foto */}
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex-1 h-12 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold uppercase tracking-wider transition-all duration-200 shadow-md shadow-[var(--primary)]/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50 theme-transition"
          >
            <Check className="w-4 h-4" />
            <span>{isBoomerang ? 'Gunakan' : 'Gunakan Foto'}</span>
          </button>
        </div>

        {/* Quick Save Option */}
        <button
          onClick={handleDownloadPreview}
          className="w-full py-1.5 text-center text-[11px] text-[var(--text-secondary)] hover:text-[var(--primary)] inline-flex items-center justify-center gap-1.5 cursor-pointer font-sans theme-transition"
        >
          <Download className="w-3.5 h-3.5 text-[var(--primary)]" />
          <span>Unduh salinan {isBoomerang ? 'boomerang' : 'foto'} ini ke HP</span>
        </button>
      </div>
    </div>
  );
}
