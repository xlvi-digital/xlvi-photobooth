import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, Zap, Upload, Sparkles, Repeat, Infinity as InfinityIcon, RotateCcw } from 'lucide-react';
import FrameOverlay from './FrameOverlay.jsx';
import FilterSelector from './FilterSelector.jsx';
import { playCameraShutterSound, playCountdownBeep } from '../utils/audioSynthesis.js';
import { generateBoomerangVideo, renderMultiPhotoComposite } from '../utils/canvasRenderer.js';
import { getFilterById } from '../utils/photoFilters.js';
import { FRAMES } from '../data/eventData.js';
import guestCoupleImg from '../assets/images/guest_photo_couple_1791014034635.jpg';
import guestBridesmaidsImg from '../assets/images/guest_photo_bridesmaids_1791014050445.jpg';
import guestFriendsImg from '../assets/images/guest_photo_friends_1791014066759.jpg';

export default function ScreenCamera({
  selectedFrame,
  selectedFrameId,
  currentEvent = null,
  onMediaCaptured,
  onBack,
  initialCapturedPhotos = [],
  targetSlotToRetake = null
}) {
  // Resolve active frame object securely
  const activeFrame = selectedFrame || (selectedFrameId ? FRAMES.find((f) => f.id === (typeof selectedFrameId === 'object' ? selectedFrameId?.id : selectedFrameId)) : null) || FRAMES[0];
  const isMulti = activeFrame?.type === 'multi';
  const targetPhotoCount = activeFrame?.photoCount || 1;

  // Single-frame mode supports photo or boomerang. Multi-photo is photo mode.
  const [captureMode, setCaptureMode] = useState('photo'); // 'photo' | 'boomerang'
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' (front) or 'environment' (back)
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [flashAnimation, setFlashAnimation] = useState(false);

  // Photo filter preset state
  const [selectedFilter, setSelectedFilter] = useState('original');
  const activeFilterPreset = getFilterById(selectedFilter);

  // Multi-photo state
  const [capturedPhotos, setCapturedPhotos] = useState(initialCapturedPhotos);
  const [currentSlotIndex, setCurrentSlotIndex] = useState(
    targetSlotToRetake !== null ? targetSlotToRetake : (initialCapturedPhotos.length < targetPhotoCount ? initialCapturedPhotos.length : 0)
  );
  const [isCompositingMulti, setIsCompositingMulti] = useState(false);

  // Boomerang states
  const [isRecordingBoomerang, setIsRecordingBoomerang] = useState(false);
  const [isProcessingBoomerang, setIsProcessingBoomerang] = useState(false);
  const [boomerangProgress, setBoomerangProgress] = useState(0);

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Stop active media stream tracks safely and thoroughly
  const stopCurrentStream = useCallback(() => {
    if (streamRef.current) {
      console.log('[CAMERA] stream stopped');
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Track stop error:', e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch (e) {}
    }
    setStream(null);
  }, []);

  // Initialize camera with facingMode and attach to videoRef safely
  const startCamera = useCallback(async (facing) => {
    setCameraError(null);
    stopCurrentStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Kamera tidak didukung di browser ini.');
      }

      const constraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1080 },
          height: { ideal: 1440 },
          aspectRatio: { ideal: 0.75 }
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;
      setStream(mediaStream);
      console.log('[CAMERA] stream started');

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.log('Video auto-play handled:', playErr);
        }
      }
    } catch (err) {
      console.warn('Camera access issue:', err);
      setCameraError('Silakan izinkan akses kamera pada browser untuk melanjutkan.');
    }
  }, [stopCurrentStream]);

  // When mounting or retaking, start camera and clean up on unmount
  useEffect(() => {
    console.log('[RETAKE] camera restarted');
    startCamera(facingMode);

    return () => {
      stopCurrentStream();
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [facingMode, startCamera, stopCurrentStream]);

  // Ensure videoRef is safely bound to stream whenever stream is ready or component updates
  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      videoRef.current.play().catch((playErr) => {
        console.log('Video auto-play handled:', playErr);
      });
    }
  }, [stream]);

  // Flip Camera front ↔ rear
  const toggleCamera = () => {
    if (isCountingDown || isRecordingBoomerang || isProcessingBoomerang) return;
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Main capture trigger
  const handleStartCapture = () => {
    if (isCountingDown || isRecordingBoomerang || isProcessingBoomerang) return;

    setIsCountingDown(true);
    setCountdownValue(3);
    playCountdownBeep(false);

    let count = 3;
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    countdownIntervalRef.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdownValue(count);
        playCountdownBeep(false);
      } else {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        setIsCountingDown(false);
        playCountdownBeep(true);

        if (!isMulti && captureMode === 'boomerang') {
          executeBoomerangCapture();
        } else {
          executePhotoCapture();
        }
      }
    }, 900);
  };

  // Snapshot from video stream onto canvas
  const executePhotoCapture = async () => {
    setFlashAnimation(true);
    playCameraShutterSound();
    setTimeout(() => setFlashAnimation(false), 260);

    const video = videoRef.current;
    let dataUrl;

    if (video && video.videoWidth > 0 && !cameraError) {
      const canvas = document.createElement('canvas');
      const targetWidth = 1080;
      const targetHeight = 1440;
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      // Mirror user front camera
      if (facingMode === 'user') {
        ctx.translate(targetWidth, 0);
        ctx.scale(-1, 1);
      }

      // Apply chosen photo filter directly to the raw user camera capture
      if (activeFilterPreset && activeFilterPreset.canvasFilter && activeFilterPreset.canvasFilter !== 'none') {
        try {
          ctx.filter = activeFilterPreset.canvasFilter;
        } catch (e) {
          console.warn('Canvas filter apply warning:', e);
        }
      }

      const vidAspect = video.videoWidth / video.videoHeight;
      const targetAspect = targetWidth / targetHeight;
      let drawW, drawH, drawX, drawY;

      if (vidAspect > targetAspect) {
        drawH = targetHeight;
        drawW = targetHeight * vidAspect;
        drawX = (targetWidth - drawW) / 2;
        drawY = 0;
      } else {
        drawW = targetWidth;
        drawH = targetWidth / vidAspect;
        drawX = 0;
        drawY = (targetHeight - drawH) / 2;
      }

      ctx.drawImage(video, drawX, drawY, drawW, drawH);
      dataUrl = canvas.toDataURL('image/jpeg', 0.94);
    } else {
      // Fallback sample photos
      const fallbackList = [guestCoupleImg, guestBridesmaidsImg, guestFriendsImg];
      dataUrl = fallbackList[currentSlotIndex % 3];
    }

    console.log('[CAPTURE] photo captured');

    // MULTI PHOTO HANDLING (Up to 3 Photos)
    if (isMulti) {
      const updatedPhotos = [...capturedPhotos];
      updatedPhotos[currentSlotIndex] = dataUrl;
      setCapturedPhotos(updatedPhotos);

      const filledCount = updatedPhotos.filter(Boolean).length;
      if (filledCount >= targetPhotoCount) {
        setIsCompositingMulti(true);
        try {
          const compResult = await renderMultiPhotoComposite(updatedPhotos, activeFrame, false, currentEvent, selectedFilter);
          stopCurrentStream();
          setIsCompositingMulti(false);
          onMediaCaptured({
            type: 'multi-photo',
            photoCount: targetPhotoCount,
            mediaUrl: compResult.dataUrl,
            mediaBlob: compResult.blob,
            thumbnailUrl: compResult.dataUrl,
            rawPhotos: updatedPhotos,
            selectedFrame: activeFrame,
            frameId: activeFrame.id,
            currentEvent: currentEvent,
            selectedFilter: selectedFilter
          });
        } catch (err) {
          console.error('Multi photo composite error:', err);
          stopCurrentStream();
          setIsCompositingMulti(false);
          onMediaCaptured({
            type: 'multi-photo',
            photoCount: targetPhotoCount,
            mediaUrl: dataUrl,
            thumbnailUrl: dataUrl,
            rawPhotos: updatedPhotos,
            selectedFrame: activeFrame,
            frameId: activeFrame.id,
            currentEvent: currentEvent,
            selectedFilter: selectedFilter
          });
        }
      } else {
        // Move to the next unfilled slot
        let nextIndex = (currentSlotIndex + 1) % targetPhotoCount;
        while (updatedPhotos[nextIndex] && nextIndex !== currentSlotIndex) {
          nextIndex = (nextIndex + 1) % targetPhotoCount;
        }
        setCurrentSlotIndex(nextIndex);
      }
    } else {
      // SINGLE PHOTO HANDLING
      stopCurrentStream();
      onMediaCaptured({
        type: 'photo',
        photoCount: 1,
        rawPhoto: dataUrl,
        mediaUrl: dataUrl,
        thumbnailUrl: dataUrl,
        isMirrored: false, // already mirrored on raw canvas
        selectedFrame: activeFrame,
        frameId: activeFrame.id,
        currentEvent: currentEvent,
        selectedFilter: selectedFilter
      });
    }
  };

  /**
   * Boomerang capture:
   * 25 frames sampled over 1000ms (1.0 second forward).
   * 1000ms forward + 1000ms reverse = 2000ms total video duration!
   */
  const executeBoomerangCapture = async () => {
    const video = videoRef.current;
    const isMock = !video || video.videoWidth === 0 || cameraError;

    setIsRecordingBoomerang(true);
    setBoomerangProgress(0);

    const capturedFrames = [];
    const totalFrames = 25; // 25 frames for 1.0 second forward
    const intervalMs = 40; // 40ms * 25 = 1000ms

    if (!isMock) {
      let frameCount = 0;
      const intervalId = setInterval(() => {
        if (frameCount >= totalFrames) {
          clearInterval(intervalId);
          finalizeBoomerang(capturedFrames);
          return;
        }

        const c = document.createElement('canvas');
        c.width = 720;
        c.height = 960;
        const cx = c.getContext('2d');

        if (facingMode === 'user') {
          cx.translate(c.width, 0);
          cx.scale(-1, 1);
        }

        // Apply chosen filter to boomerang frames
        if (activeFilterPreset && activeFilterPreset.canvasFilter && activeFilterPreset.canvasFilter !== 'none') {
          try {
            cx.filter = activeFilterPreset.canvasFilter;
          } catch (e) {}
        }

        const vidAspect = video.videoWidth / video.videoHeight;
        const targetAspect = c.width / c.height;
        let dw, dh, dx, dy;
        if (vidAspect > targetAspect) {
          dh = c.height;
          dw = c.height * vidAspect;
          dx = (c.width - dw) / 2;
          dy = 0;
        } else {
          dw = c.width;
          dh = c.width / vidAspect;
          dx = 0;
          dy = (c.height - dh) / 2;
        }

        cx.drawImage(video, dx, dy, dw, dh);
        capturedFrames.push(c);

        frameCount++;
        setBoomerangProgress(Math.round((frameCount / totalFrames) * 100));
      }, intervalMs);
    } else {
      // Mock simulation fallback
      const baseImg = new Image();
      baseImg.crossOrigin = 'anonymous';
      baseImg.onload = () => {
        for (let i = 0; i < totalFrames; i++) {
          const c = document.createElement('canvas');
          c.width = 720;
          c.height = 960;
          const cx = c.getContext('2d');
          const scale = 1 + (i / totalFrames) * 0.12;
          const sw = c.width / scale;
          const sh = c.height / scale;
          const sx = (c.width - sw) / 2;
          const sy = (c.height - sh) / 2;
          cx.drawImage(baseImg, sx, sy, sw, sh, 0, 0, c.width, c.height);
          capturedFrames.push(c);
        }
        finalizeBoomerang(capturedFrames);
      };
      baseImg.src = guestCoupleImg;
    }
  };

  const finalizeBoomerang = async (frames) => {
    setIsRecordingBoomerang(false);
    setIsProcessingBoomerang(true);
    playCameraShutterSound();

    try {
      const result = await generateBoomerangVideo({
        rawFrames: frames,
        selectedFrame: activeFrame,
        isMirrored: false,
        currentEvent: currentEvent,
        filterId: selectedFilter
      });

      stopCurrentStream();
      setIsProcessingBoomerang(false);

      onMediaCaptured({
        type: 'boomerang',
        mediaUrl: result.videoUrl,
        mediaBlob: result.videoBlob,
        thumbnailUrl: result.thumbnailUrl,
        isMirrored: false,
        selectedFrame: activeFrame,
        frameId: activeFrame.id,
        currentEvent: currentEvent,
        selectedFilter: selectedFilter
      });
    } catch (e) {
      console.warn('Boomerang encoding error:', e);
      stopCurrentStream();
      setIsProcessingBoomerang(false);
      onMediaCaptured({
        type: 'boomerang',
        mediaUrl: guestCoupleImg,
        thumbnailUrl: guestCoupleImg,
        isMirrored: false,
        selectedFrame: activeFrame,
        frameId: activeFrame.id,
        currentEvent: currentEvent,
        selectedFilter: selectedFilter
      });
    }
  };

  // File upload fallback
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const uploadedData = event.target.result;
      if (isMulti) {
        const updated = [...capturedPhotos];
        updated[currentSlotIndex] = uploadedData;
        setCapturedPhotos(updated);

        const filledCount = updated.filter(Boolean).length;
        if (filledCount >= targetPhotoCount) {
          setIsCompositingMulti(true);
          const compResult = await renderMultiPhotoComposite(updated, activeFrame, false, currentEvent, selectedFilter);
          stopCurrentStream();
          setIsCompositingMulti(false);
          onMediaCaptured({
            type: 'multi-photo',
            photoCount: targetPhotoCount,
            mediaUrl: compResult.dataUrl,
            mediaBlob: compResult.blob,
            thumbnailUrl: compResult.dataUrl,
            rawPhotos: updated,
            selectedFrame: activeFrame,
            frameId: activeFrame.id,
            currentEvent: currentEvent,
            selectedFilter: selectedFilter
          });
        } else {
          let nextIndex = (currentSlotIndex + 1) % targetPhotoCount;
          while (updated[nextIndex] && nextIndex !== currentSlotIndex) {
            nextIndex = (nextIndex + 1) % targetPhotoCount;
          }
          setCurrentSlotIndex(nextIndex);
        }
      } else {
        stopCurrentStream();
        onMediaCaptured({
          type: 'photo',
          photoCount: 1,
          rawPhoto: uploadedData,
          mediaUrl: uploadedData,
          thumbnailUrl: uploadedData,
          isMirrored: false,
          selectedFrame: activeFrame,
          frameId: activeFrame.id,
          currentEvent: currentEvent,
          selectedFilter: selectedFilter
        });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex-1 flex flex-col justify-between px-4 pt-2 pb-5 max-w-md mx-auto w-full">
      {/* Header Info & Switcher */}
      <div className="text-center mb-1">
        <div className="flex items-center justify-center gap-1.5">
          <h2 className="font-serif text-xl sm:text-2xl text-[#3a2820] font-normal tracking-wide">
            {isMulti
              ? `Ambil Foto ${currentSlotIndex + 1} dari ${targetPhotoCount}`
              : `Ambil ${captureMode === 'boomerang' ? 'Boomerang' : 'Foto'}`}
          </h2>
        </div>

        {/* Multi-Photo Step Progress Dots */}
        {isMulti ? (
          <div className="flex items-center justify-center gap-2 mt-1 mb-1">
            {[0, 1, 2].map((slotIdx) => {
              const isFilled = !!capturedPhotos[slotIdx];
              const isCurrent = currentSlotIndex === slotIdx;
              return (
                <button
                  key={slotIdx}
                  type="button"
                  onClick={() => setCurrentSlotIndex(slotIdx)}
                  className={`flex items-center gap-1 py-0.5 px-2 rounded-full text-[10px] font-sans transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-[#5c4033] text-white font-semibold ring-1 ring-[#5c4033]/30'
                      : isFilled
                      ? 'bg-[#e2d5c7] text-[#5c4033]'
                      : 'bg-[#ede4d8] text-[#8c7365]'
                  }`}
                >
                  <span>{isFilled ? '✓' : `●`}</span>
                  <span>Foto 0{slotIdx + 1}</span>
                </button>
              );
            })}
          </div>
        ) : (
          /* Single frame mode switch tabs [ PHOTO ] [ BOOMERANG ] */
          <div className="flex p-1 bg-[var(--surface-soft)] border border-[var(--border-color)] rounded-full max-w-[210px] mx-auto mt-1 mb-1 w-full">
            <button
              type="button"
              onClick={() => setCaptureMode('photo')}
              disabled={isCountingDown || isRecordingBoomerang || isProcessingBoomerang}
              className={`flex-1 py-1 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer theme-transition ${
                captureMode === 'photo'
                  ? 'text-[var(--primary)] bg-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--primary)]'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Photo</span>
            </button>
            <button
              type="button"
              onClick={() => setCaptureMode('boomerang')}
              disabled={isCountingDown || isRecordingBoomerang || isProcessingBoomerang}
              className={`flex-1 py-1 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer theme-transition ${
                captureMode === 'boomerang'
                  ? 'text-[var(--primary)] bg-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--primary)]'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Boomerang</span>
            </button>
          </div>
        )}

        <p className="text-[10px] text-[var(--text-secondary)] font-sans theme-transition">
          {isMulti
            ? `Posisikan diri untuk slot foto ke-${currentSlotIndex + 1}. Frame: ${activeFrame?.name}`
            : captureMode === 'boomerang'
            ? `Boomerang 1s maju + 1s mundur (Frame: ${activeFrame?.name})`
            : `Posisikan dirimu di dalam frame ${activeFrame?.name}.`}
        </p>
      </div>

      {/* Main Camera Viewport (Portrait 3:4 ratio) */}
      <div className="relative w-full aspect-[3/4] bg-neutral-900 rounded-3xl overflow-hidden shadow-lg border border-[#e8ded2] flex items-center justify-center">
        {/* Live Video Feed with Filter Effect applied ONLY to the video feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            filter: activeFilterPreset?.cssFilter || 'none',
          }}
          className={`w-full h-full object-cover transition-all duration-200 ${
            facingMode === 'user' ? '-scale-x-100' : ''
          } ${cameraError ? 'hidden' : 'block'}`}
        />

        {/* Fallback Screen if Camera Access is Denied */}
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#f7f2ea] z-30">
            <div className="w-12 h-12 rounded-full bg-[#5c4033]/10 text-[#5c4033] flex items-center justify-center mb-3">
              <Camera className="w-6 h-6" />
            </div>
            <h4 className="font-serif text-lg text-[#3a2820] font-medium mb-1">
              Kamera belum diizinkan
            </h4>
            <p className="text-xs text-[#7a6456] mb-4 max-w-xs leading-relaxed">
              {cameraError}
            </p>

            <div className="flex flex-col gap-2 w-full max-w-xs">
              <button
                onClick={() => startCamera(facingMode)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#5c4033] text-white text-xs font-medium cursor-pointer shadow-xs active:scale-98"
              >
                Coba Aktifkan Kamera Lagi
              </button>
              <button
                onClick={() => {
                  stopCurrentStream();
                  if (!isMulti && captureMode === 'boomerang') {
                    executeBoomerangCapture();
                  } else {
                    executePhotoCapture();
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#f0e6da] text-[#5c4033] border border-[#d9c8b7] text-xs font-medium cursor-pointer hover:bg-[#e8ded0]"
              >
                Gunakan Simulasi Tamu (Demo)
              </button>
            </div>
          </div>
        )}

        {/* Live Selected Frame Overlay with slot indicator (Frame image is 100% natural, UNFILTERED) */}
        <FrameOverlay
          selectedFrame={activeFrame}
          currentSlotIndex={isMulti ? currentSlotIndex : null}
          showText={true}
          currentEvent={currentEvent}
        />

        {/* Shutter Flash Animation */}
        {flashAnimation && (
          <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-250 pointer-events-none" />
        )}

        {/* Countdown Number Overlay */}
        {isCountingDown && (
          <div className="absolute inset-0 z-40 bg-black/40 backdrop-blur-xs flex items-center justify-center">
            <span className="text-8xl sm:text-9xl font-serif text-white font-bold animate-ping duration-700">
              {countdownValue}
            </span>
          </div>
        )}

        {/* Boomerang Recording Progress Overlay (1000ms duration) */}
        {isRecordingBoomerang && (
          <div className="absolute inset-0 z-40 bg-black/30 backdrop-blur-xs flex flex-col items-center justify-center text-white">
            <div className="relative w-16 h-16 rounded-full border-4 border-rose-500 flex items-center justify-center mb-2 animate-pulse">
              <span className="w-6 h-6 rounded-full bg-rose-600" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest font-sans">
              Merekam Gerakan (1 Detik Maju)...
            </span>
            <div className="w-32 bg-white/30 h-1.5 rounded-full overflow-hidden mt-3">
              <div
                className="bg-rose-500 h-full transition-all duration-75"
                style={{ width: `${boomerangProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Compositing Multi-Photo Overlay */}
        {(isProcessingBoomerang || isCompositingMulti) && (
          <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white p-6 text-center">
            <div className="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin mb-3" />
            <h4 className="font-serif text-lg font-medium">
              {isCompositingMulti ? 'Menyatukan 3 Foto...' : 'Memproses Boomerang (2s Loop)...'}
            </h4>
            <p className="text-[11px] text-white/80 mt-1 max-w-xs font-sans">
              Menerapkan bingkai {activeFrame?.name} pada hasil akhir...
            </p>
          </div>
        )}

        {/* Top Camera Utilities */}
        <div className="absolute top-4 inset-x-4 z-20 flex items-center justify-between pointer-events-auto">
          <button
            onClick={() => setIsFlashActive(!isFlashActive)}
            className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all cursor-pointer ${
              isFlashActive
                ? 'bg-amber-100/90 text-amber-800'
                : 'bg-black/35 text-white/90 hover:bg-black/50'
            }`}
            title="Flash"
          >
            <Zap className="w-4 h-4" />
          </button>

          <button
            onClick={toggleCamera}
            disabled={isCountingDown || isRecordingBoomerang || isProcessingBoomerang}
            className="w-9 h-9 rounded-full bg-black/35 hover:bg-black/50 text-white/90 flex items-center justify-center backdrop-blur-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            title="Balik Kamera Depan / Belakang"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preset Photo Filter Strip Bar (Available before capture) */}
      <div className="my-1.5 w-full max-w-sm mx-auto">
        <FilterSelector
          selectedFilter={selectedFilter}
          onSelectFilter={setSelectedFilter}
        />
      </div>

      {/* Multi-Photo mini preview strip at bottom */}
      {isMulti && capturedPhotos.some(Boolean) && (
        <div className="mb-1 flex items-center justify-center gap-2 max-w-xs mx-auto">
          {[0, 1, 2].map((idx) => {
            const photoSrc = capturedPhotos[idx];
            return (
              <div
                key={idx}
                onClick={() => setCurrentSlotIndex(idx)}
                className={`relative w-12 h-12 rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                  currentSlotIndex === idx
                    ? 'border-[#5c4033] shadow-md scale-105'
                    : photoSrc
                    ? 'border-[#c8a882] opacity-80'
                    : 'border-dashed border-[#e8ded2] bg-[#f4ede4]'
                }`}
                title={`Ulangi Foto 0${idx + 1}`}
              >
                {photoSrc ? (
                  <img src={photoSrc} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-[10px] text-[#8c7365] font-mono">
                    0{idx + 1}
                  </span>
                )}
                {photoSrc && (
                  <div className="absolute inset-0 bg-black/20 hover:bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <RotateCcw className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Camera Controls & Trigger */}
      <div className="flex flex-col items-center">
        <div className="w-full flex items-center justify-around max-w-xs">
          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isCountingDown || isRecordingBoomerang || isProcessingBoomerang}
            className="w-12 h-12 rounded-full bg-white border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--primary)] flex items-center justify-center shadow-xs hover:bg-[var(--surface-soft)] active:scale-95 transition-all cursor-pointer disabled:opacity-50 theme-transition"
            title="Unggah Foto dari Galeri"
          >
            <Upload className="w-5 h-5" />
          </button>

          {/* Big Circular Capture Button ◉ with theme primary color */}
          <button
            onClick={handleStartCapture}
            disabled={isCountingDown || isRecordingBoomerang || isProcessingBoomerang}
            className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-transparent border-4 border-[var(--primary)] p-1 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex flex-col items-center justify-center theme-transition"
            aria-label={!isMulti && captureMode === 'boomerang' ? 'Rekam Boomerang' : `Ambil Foto ${currentSlotIndex + 1}`}
          >
            <div className="w-full h-full rounded-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] transition-colors flex flex-col items-center justify-center text-white theme-transition">
              {!isMulti && captureMode === 'boomerang' ? (
                <>
                  <InfinityIcon className="w-6 h-6 stroke-[2.2]" />
                  <span className="text-[8px] font-sans uppercase font-bold tracking-tighter mt-0.5">Boom</span>
                </>
              ) : (
                <div className="flex flex-col items-center">
                  <Camera className="w-6 h-6" />
                  {isMulti && (
                    <span className="text-[8px] font-bold font-mono">0{currentSlotIndex + 1}</span>
                  )}
                </div>
              )}
            </div>
          </button>

          {/* Sample quick button */}
          <button
            onClick={() => {
              stopCurrentStream();
              if (!isMulti && captureMode === 'boomerang') {
                executeBoomerangCapture();
              } else {
                executePhotoCapture();
              }
            }}
            disabled={isCountingDown || isRecordingBoomerang || isProcessingBoomerang}
            className="w-12 h-12 rounded-full bg-white border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--primary)] flex items-center justify-center shadow-xs hover:bg-[var(--surface-soft)] active:scale-95 transition-all cursor-pointer disabled:opacity-50 theme-transition"
            title="Percobaan (Demo)"
          >
            <Sparkles className="w-5 h-5 text-[var(--primary)]" />
          </button>
        </div>

        <p className="text-[11px] text-[var(--text-secondary)] mt-1 font-sans theme-transition">
          {isMulti
            ? `Foto ${currentSlotIndex + 1} dari ${targetPhotoCount} · Frame ${activeFrame?.name}`
            : captureMode === 'boomerang'
            ? 'Boomerang: 1 detik maju + 1 detik mundur'
            : `Mode Foto · Frame ${activeFrame?.name}`}
        </p>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>
    </div>
  );
}
