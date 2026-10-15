import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Check, Edit3, Volume2 } from 'lucide-react';
import { playSyntheticVoice } from '../utils/audioSynthesis.js';

export default function ScreenVoiceNote({
  guestName,
  setGuestName,
  voiceAudioBlob,
  setVoiceAudioBlob,
  voiceDuration,
  setVoiceDuration,
  onSwitchToText,
  onSubmit,
  isSubmitting
}) {
  const [recordState, setRecordState] = useState(voiceAudioBlob ? 'recorded' : 'idle'); // 'idle' | 'recording' | 'recorded'
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSeconds, setPlaybackSeconds] = useState(0);
  const [errorText, setErrorText] = useState('');

  const timerRef = useRef(null);
  const playbackTimerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const micStreamRef = useRef(null);
  const audioElementRef = useRef(null);
  const currentObjectUrlRef = useRef(null);

  const MAX_DURATION = 60; // 60 seconds max

  // Stop microphone stream safely
  const stopMicStream = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Mic track stop error:', e);
        }
      });
      micStreamRef.current = null;
    }
  }, []);

  // Format seconds to mm:ss
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  // Find best supported audio MIME type
  const getSupportedAudioMime = () => {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/aac',
      'audio/ogg;codecs=opus',
      'audio/wav'
    ];
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
      for (const mime of candidates) {
        if (MediaRecorder.isTypeSupported(mime)) {
          return mime;
        }
      }
    }
    return '';
  };

  // Clean up all streams and audio players on unmount
  useEffect(() => {
    return () => {
      stopMicStream();
      if (timerRef.current) clearInterval(timerRef.current);
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
      if (currentObjectUrlRef.current) {
        URL.revokeObjectURL(currentObjectUrlRef.current);
      }
    };
  }, [stopMicStream]);

  // Start Voice Recording
  const handleStartRecord = async () => {
    setErrorText('');
    setElapsedSeconds(0);
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Perekam suara tidak didukung di browser ini.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const mimeType = getSupportedAudioMime();
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalType = mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: finalType });
        setVoiceAudioBlob(audioBlob);

        const currentSecs = elapsedSeconds > 0 ? elapsedSeconds : 1;
        setVoiceDuration(formatTime(currentSecs));
        setRecordState('recorded');
        stopMicStream();

        if (currentObjectUrlRef.current) {
          URL.revokeObjectURL(currentObjectUrlRef.current);
        }
        const objUrl = URL.createObjectURL(audioBlob);
        currentObjectUrlRef.current = objUrl;
        audioElementRef.current = new Audio(objUrl);
        audioElementRef.current.onended = () => {
          setIsPlaying(false);
          setPlaybackSeconds(0);
          if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
        };
      };

      mediaRecorder.start(200);
      setRecordState('recording');

      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          if (prev >= MAX_DURATION - 1) {
            handleStopRecord();
            return MAX_DURATION;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.warn('Microphone access denied, activating synthetic demo recording:', err);
      simulateVoiceRecording();
    }
  };

  const simulateVoiceRecording = () => {
    setRecordState('recording');
    setElapsedSeconds(0);

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => {
        if (prev >= 6) {
          clearInterval(timerRef.current);
          setRecordState('recorded');
          setVoiceDuration('00:06');
          setVoiceAudioBlob(new Blob(['mock-audio'], { type: 'audio/webm' }));
          return 6;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const handleStopRecord = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      setRecordState('recorded');
      setVoiceDuration(formatTime(elapsedSeconds || 5));
    }
  };

  const handleRetake = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
    }
    setIsPlaying(false);
    setPlaybackSeconds(0);
    setElapsedSeconds(0);
    setRecordState('idle');
    setVoiceAudioBlob(null);
  };

  const handlePlayAudio = () => {
    if (!audioElementRef.current && currentObjectUrlRef.current) {
      audioElementRef.current = new Audio(currentObjectUrlRef.current);
      audioElementRef.current.onended = () => {
        setIsPlaying(false);
        setPlaybackSeconds(0);
        if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      };
    }

    if (!audioElementRef.current) {
      playSyntheticVoice(elapsedSeconds || 6, () => {
        setIsPlaying(false);
        setPlaybackSeconds(0);
        if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      });
      setIsPlaying(true);
      playbackTimerRef.current = setInterval(() => {
        setPlaybackSeconds((prev) => prev + 1);
      }, 1000);
      return;
    }

    try {
      audioElementRef.current.currentTime = playbackSeconds;
      audioElementRef.current.play().then(() => {
        setIsPlaying(true);
        playbackTimerRef.current = setInterval(() => {
          if (audioElementRef.current) {
            setPlaybackSeconds(Math.floor(audioElementRef.current.currentTime));
          }
        }, 500);
      }).catch(() => {
        setIsPlaying(false);
      });
    } catch (e) {
      console.warn('Audio play initialization error:', e);
    }
  };

  const handlePauseAudio = () => {
    setIsPlaying(false);
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
    }
  };

  const handleFinalSubmit = () => {
    if (!guestName.trim()) {
      setErrorText('Mohon isi nama kamu terlebih dahulu.');
      return;
    }
    if (recordState !== 'recorded' || !voiceAudioBlob) {
      setErrorText('Mohon rekam ucapan suara kamu terlebih dahulu.');
      return;
    }
    setErrorText('');
    stopMicStream();
    onSubmit();
  };

  const progressPercent = Math.min(100, (elapsedSeconds / MAX_DURATION) * 100);

  return (
    <div className="flex-1 flex flex-col justify-between px-5 pt-3 pb-6 max-w-md mx-auto w-full bg-transparent theme-transition">
      {/* Title */}
      <div className="text-center mb-3">
        <span className="text-[10px] tracking-[0.25em] uppercase text-[var(--primary)] font-serif block mb-1 font-semibold theme-transition">
          Langkah 03
        </span>
        <h2 className="font-serif text-2xl sm:text-3xl text-[var(--text-primary)] font-normal tracking-wide theme-transition">
          Rekam Ucapan
        </h2>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-sans theme-transition">
          Sampaikan ucapanmu langsung melalui suara hangatmu.
        </p>
      </div>

      {/* Mode Switch Tabs [ ✍️ Teks ] [ 🎙️ Voice Note ] */}
      <div className="flex p-1 bg-[var(--surface-soft)] border border-[var(--border-color)] rounded-full max-w-[280px] mx-auto mb-4 w-full">
        <button
          type="button"
          onClick={onSwitchToText}
          className="flex-1 py-2 px-3 rounded-full text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--primary)] flex items-center justify-center gap-1.5 transition-all cursor-pointer theme-transition"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Teks</span>
        </button>
        <button
          type="button"
          className="flex-1 py-2 px-3 rounded-full text-xs font-semibold text-[var(--primary)] bg-white shadow-xs flex items-center justify-center gap-1.5 transition-all theme-transition"
        >
          <Mic className="w-3.5 h-3.5 text-[var(--primary)]" />
          <span>Voice Note</span>
        </button>
      </div>

      {/* Guest Name Input */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-[var(--text-primary)] mb-1.5 font-sans text-left">
          Nama Kamu
        </label>
        <input
          type="text"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="Contoh: Sarah &amp; Keluarga"
          maxLength={40}
          className="w-full px-4 py-2.5 bg-[var(--surface)] rounded-xl border border-[var(--border-color)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
        />
      </div>

      {/* Voice Recorder Visual Box */}
      <div className="relative w-full aspect-[4/3] bg-[var(--surface)] rounded-3xl border border-[var(--border-color)] shadow-sm p-6 flex flex-col items-center justify-between my-auto theme-transition">
        {/* Progress bar line at top */}
        <div className="w-full bg-[var(--surface-soft)] h-1.5 rounded-full overflow-hidden mb-2">
          <div
            className="bg-[var(--primary)] h-full transition-all duration-300"
            style={{ width: `${recordState === 'recorded' && isPlaying ? (playbackSeconds / (elapsedSeconds || 8)) * 100 : progressPercent}%` }}
          />
        </div>

        {/* Center Microphone / Waveform Area */}
        <div className="flex flex-col items-center justify-center my-auto">
          {recordState === 'idle' && (
            <div className="w-20 h-20 rounded-full bg-[var(--surface-soft)] border-2 border-dashed border-[var(--primary)]/40 flex items-center justify-center text-[var(--primary)] shadow-xs theme-transition">
              <Mic className="w-8 h-8 stroke-[1.8]" />
            </div>
          )}

          {recordState === 'recording' && (
            <div className="relative flex items-center justify-center">
              <div className="absolute w-28 h-28 rounded-full bg-rose-500/15 animate-ping duration-1000" />
              <div className="absolute w-24 h-24 rounded-full bg-rose-500/25 animate-pulse" />
              <div className="w-20 h-20 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg relative z-10">
                <Mic className="w-8 h-8" />
              </div>
            </div>
          )}

          {recordState === 'recorded' && (
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shadow-md theme-transition">
                {isPlaying ? (
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-1.5 h-6 bg-white rounded-full animate-wave-1" />
                    <span className="w-1.5 h-8 bg-white rounded-full animate-wave-2" />
                    <span className="w-1.5 h-5 bg-white rounded-full animate-wave-3" />
                    <span className="w-1.5 h-7 bg-white rounded-full animate-wave-4" />
                  </div>
                ) : (
                  <Volume2 className="w-8 h-8" />
                )}
              </div>
            </div>
          )}

          {/* Timer Display */}
          <div className="mt-3 text-center">
            <span className="font-mono text-2xl font-bold tracking-wider text-[var(--text-primary)] tabular-nums theme-transition">
              {recordState === 'recorded' && isPlaying
                ? formatTime(playbackSeconds)
                : formatTime(elapsedSeconds)}
            </span>
            <span className="text-[10px] text-[var(--text-secondary)] block font-sans mt-0.5">
              Maksimal 60 Detik
            </span>
          </div>
        </div>

        {/* State Control Buttons */}
        <div className="w-full flex items-center justify-center gap-3">
          {recordState === 'idle' && (
            <button
              onClick={handleStartRecord}
              className="py-2.5 px-6 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold tracking-wider uppercase transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 theme-transition"
            >
              <Mic className="w-4 h-4" />
              <span>Mulai Rekam</span>
            </button>
          )}

          {recordState === 'recording' && (
            <button
              onClick={handleStopRecord}
              className="py-2.5 px-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold tracking-wider uppercase transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 animate-pulse"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Selesai Rekam</span>
            </button>
          )}

          {recordState === 'recorded' && (
            <div className="flex items-center gap-3">
              <button
                onClick={isPlaying ? handlePauseAudio : handlePlayAudio}
                className="py-2 px-5 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-medium flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 theme-transition"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                <span>{isPlaying ? 'Jeda' : 'Putar Suara'}</span>
              </button>

              <button
                onClick={handleRetake}
                className="py-2 px-4 rounded-full bg-white hover:bg-[var(--surface-soft)] text-[var(--text-secondary)] hover:text-[var(--primary)] border border-[var(--border-color)] text-xs font-medium flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 theme-transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Rekam Ulang</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {errorText && (
        <p className="mt-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-center leading-relaxed">
          {errorText}
        </p>
      )}

      {/* Bottom Submit Button */}
      <div className="mt-5 pt-1">
        <button
          onClick={handleFinalSubmit}
          disabled={recordState !== 'recorded' || isSubmitting}
          className="w-full h-12 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-[0.98] text-white font-medium text-sm tracking-[0.1em] uppercase transition-all duration-200 shadow-md shadow-[var(--primary)]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 theme-transition"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Mengirim Voice Note...</span>
            </div>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>Gunakan Voice Note &amp; Kirim</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
