import React, { useState } from 'react';
import { Send, ArrowRight, Mic, Edit3, Sparkles } from 'lucide-react';

const QUICK_GREETINGS = [
  "Barakallahu lakuma wa baraka alaikuma! ✨",
  "Selamat menempuh hidup baru Nela & Fadli! 💕",
  "Semoga langgeng & bahagia selamanya! 💐",
  "Happy wedding! Semoga sakinah mawaddah warahmah 🕊️"
];

export default function ScreenGreeting({
  guestName,
  setGuestName,
  guestMessage,
  setGuestMessage,
  onSwitchToVoice,
  onSubmit,
  isSubmitting
}) {
  const [errorText, setErrorText] = useState('');
  const maxChars = 200;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!guestName || !guestName.trim()) {
      setErrorText('Mohon isi nama kamu terlebih dahulu ya.');
      return;
    }
    if (!guestMessage || !guestMessage.trim()) {
      setErrorText('Tulis sedikit doa atau ucapan hangat untuk kedua mempelai.');
      return;
    }
    setErrorText('');
    onSubmit();
  };

  const handleQuickGreeting = (text) => {
    setGuestMessage((prev) => {
      const combined = prev ? `${prev} ${text}` : text;
      return combined.slice(0, maxChars);
    });
  };

  return (
    <div className="flex-1 flex flex-col justify-between px-5 pt-3 pb-6 max-w-md mx-auto w-full bg-transparent theme-transition">
      {/* Title */}
      <div className="text-center mb-4">
        <span className="text-[10px] tracking-[0.25em] uppercase text-[var(--primary)] font-serif block mb-1 font-semibold theme-transition">
          Langkah 03
        </span>
        <h2 className="font-serif text-2xl sm:text-3xl text-[var(--text-primary)] font-normal tracking-wide theme-transition">
          Tambahkan Ucapan
        </h2>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-sans theme-transition">
          Berikan pesan terbaik untuk kedua mempelai.
        </p>
      </div>

      {/* Mode Switch Tabs [ ✍️ Teks ] [ 🎙️ Voice Note ] */}
      <div className="flex p-1 bg-[var(--surface-soft)] border border-[var(--border-color)] rounded-full max-w-[280px] mx-auto mb-5 w-full">
        <button
          type="button"
          className="flex-1 py-2 px-3 rounded-full text-xs font-semibold text-[var(--primary)] bg-white shadow-xs flex items-center justify-center gap-1.5 transition-all theme-transition"
        >
          <Edit3 className="w-3.5 h-3.5 text-[var(--primary)]" />
          <span>Teks</span>
        </button>
        <button
          type="button"
          onClick={onSwitchToVoice}
          className="flex-1 py-2 px-3 rounded-full text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--primary)] flex items-center justify-center gap-1.5 transition-all cursor-pointer theme-transition"
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Voice Note</span>
        </button>
      </div>

      {/* Text Greeting Form */}
      <form onSubmit={handleSubmit} className="space-y-4 my-auto">
        {/* Name Input */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-primary)] mb-1.5 font-sans">
            Nama Kamu
          </label>
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Contoh: Reyhan &amp; Pasangan"
            maxLength={40}
            className="w-full px-4 py-3 bg-[var(--surface)] rounded-xl border border-[var(--border-color)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
          />
        </div>

        {/* Message Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-[var(--text-primary)] font-sans">
              Ucapan untuk Pengantin
            </label>
            <span className="text-[10px] text-[var(--text-secondary)] font-mono">
              {guestMessage.length}/{maxChars}
            </span>
          </div>
          <textarea
            value={guestMessage}
            onChange={(e) => setGuestMessage(e.target.value.slice(0, maxChars))}
            placeholder="Tuliskan doa restu dan pesan bahagiamu di sini..."
            rows={3}
            className="w-full px-4 py-3 bg-[var(--surface)] rounded-xl border border-[var(--border-color)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all resize-none"
          />
        </div>

        {/* Quick Suggestion Chips */}
        <div>
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5 font-sans font-medium">
            💡 Inspirasi Ucapan Cepat:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_GREETINGS.map((text, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickGreeting(text)}
                className="text-[11px] py-1 px-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--primary)] hover:border-[var(--primary)]/40 hover:bg-[var(--surface-soft)] transition-all text-left cursor-pointer active:scale-95 theme-transition"
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        {errorText && (
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 py-2 px-3 rounded-xl animate-in fade-in duration-200">
            {errorText}
          </p>
        )}
      </form>

      {/* Submit Button */}
      <div className="mt-4 pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full h-12 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-[0.98] text-white font-medium text-sm tracking-[0.1em] uppercase transition-all duration-200 shadow-md shadow-[var(--primary)]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 theme-transition"
        >
          <span>{isSubmitting ? 'Mengunggah Momen...' : 'Kirim Foto & Ucapan'}</span>
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
