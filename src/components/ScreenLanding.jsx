import React, { useState } from 'react';
import { Volume2, VolumeX, Sparkles, Image as ImageIcon, Shield, MapPin, Heart } from 'lucide-react';
import { EVENT_DATA } from '../data/eventData.js';
import { toggleBackgroundMusic, isAudioPlaying } from '../utils/audioSynthesis.js';

/**
 * Formats a YYYY-MM-DD date string into Indonesian locale
 * strictly avoiding UTC timezone day-shift.
 */
export function formatIndonesianDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const d = new Date(year, month, day);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  }
  return trimmed;
}

export default function ScreenLanding({ onStart, onOpenGallery, onOpenAdmin, activeEvent = null }) {
  const [isPlaying, setIsPlaying] = useState(isAudioPlaying());

  const handleAudioToggle = () => {
    toggleBackgroundMusic((playing) => {
      setIsPlaying(playing);
    });
  };

  // Single source of truth: currentEvent
  const currentEvent = activeEvent || {};
  const coupleName = currentEvent.name || '';
  const welcomeTitle = currentEvent.event_settings?.welcome_title || 'The Wedding Of';
  const rawDate = currentEvent.event_date || '';
  const formattedDate = formatIndonesianDate(rawDate);
  const locationText = (currentEvent.location || '').trim();
  const welcomeSubtitle = currentEvent.event_settings?.welcome_subtitle || 'Abadikan momenmu bersama kami';

  // Theme emoji indicator
  const themeEmoji =
    currentEvent.theme_id === 'ruby'
      ? '❤️'
      : currentEvent.theme_id === 'green'
      ? '💚'
      : '💙';

  return (
    <div className="relative min-h-[92vh] flex flex-col justify-between bg-[var(--background)] overflow-hidden text-[var(--text-primary)] theme-transition">
      {/* Top Wedding Couple Photo Container */}
      <div className="relative w-full overflow-hidden bg-[var(--surface-soft)]">
        <div className="relative aspect-[3/3.8] w-full">
          <img
            src={activeEvent?.cover_image || EVENT_DATA.heroPhoto}
            alt={`${coupleName} - The Wedding Couple`}
            className="w-full h-full object-cover object-top scale-100 transition-transform duration-1000 ease-out"
            referrerPolicy="no-referrer"
          />

          {/* Soft vignette gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10 pointer-events-none" />
        </div>

        {/* Organic Soft Scalloped Wave Divider matching theme background */}
        <div className="absolute -bottom-1 left-0 right-0 w-full overflow-hidden leading-none z-10 pointer-events-none">
          <svg
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className="relative block w-full h-8 sm:h-12 text-[var(--background)] fill-current theme-transition"
          >
            <path d="M0,0 C150,60 350,-20 600,35 C850,90 1050,15 1200,45 L1200,120 L0,120 Z"></path>
          </svg>
        </div>

        {/* Discreet Admin Access Button on Top Left */}
        {onOpenAdmin && (
          <button
            type="button"
            onClick={onOpenAdmin}
            className="absolute top-4 left-4 z-20 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-md text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="Buka Admin Dashboard"
          >
            <Shield className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Decorative Botanical Leaf Sketch SVGs floating softly */}
      <div className="absolute top-[48%] left-4 opacity-25 pointer-events-none">
        <svg className="w-10 h-10 text-[var(--primary)]" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M20 5 C15 12 10 20 20 35 C30 20 25 12 20 5 Z M20 5 L20 35 M15 15 C17 18 19 22 20 22 M25 18 C23 20 21 24 20 24" />
        </svg>
      </div>
      <div className="absolute top-[52%] right-6 opacity-25 pointer-events-none">
        <svg className="w-8 h-8 text-[var(--primary)] rotate-45" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M20 5 C15 12 10 20 20 35 C30 20 25 12 20 5 Z M20 5 L20 35" />
        </svg>
      </div>

      {/* Main Content & Typography Section */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-between px-6 pt-3 pb-8 text-center">
        <div className="w-full max-w-sm flex flex-col items-center">
          {/* Subtitle / Tagline with Theme Emoji */}
          <div className="flex items-center gap-1.5 mb-1.5 theme-transition">
            <span className="text-sm select-none">{themeEmoji}</span>
            <p className="text-[11px] sm:text-xs tracking-[0.28em] uppercase text-[var(--primary)] font-sans font-medium">
              {welcomeTitle}
            </p>
          </div>

          {/* Main Couple / Event Name */}
          <h1 className="font-serif text-4xl sm:text-[42px] font-normal tracking-wide text-[var(--text-primary)] leading-tight mb-2 theme-transition">
            {coupleName}
          </h1>

          {/* Formatted Date */}
          {formattedDate && (
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] tracking-[0.08em] font-sans font-normal mb-1.5 theme-transition">
              {formattedDate}
            </p>
          )}

          {/* Event Location: Only displayed if location is provided */}
          {locationText && (
            <p className="text-xs text-[var(--text-secondary)] tracking-[0.04em] font-sans font-medium mb-6 flex items-center justify-center gap-1.5 theme-transition">
              <MapPin className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
              <span>{locationText}</span>
            </p>
          )}

          {!locationText && <div className="mb-4" />}

          {/* Primary Action Button: MULAI PHOTOBOOTH */}
          <button
            onClick={onStart}
            className="w-full max-w-[280px] h-[52px] rounded-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-[0.98] text-white font-medium text-sm tracking-[0.12em] uppercase transition-all duration-200 shadow-md shadow-[var(--primary)]/25 flex items-center justify-center gap-2 group cursor-pointer theme-transition"
          >
            <span>Mulai Photobooth</span>
            <Sparkles className="w-4 h-4 text-white/90 group-hover:rotate-12 transition-transform duration-300" />
          </button>

          {/* Secondary Link: Lihat Galeri */}
          <button
            onClick={onOpenGallery}
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--primary)] font-medium py-1.5 px-3 rounded-full hover:bg-[var(--primary-soft)] transition-colors cursor-pointer theme-transition"
          >
            <ImageIcon className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span>Lihat Galeri Foto Tamu</span>
          </button>
        </div>

        {/* Bottom Footer Info & Branding */}
        <div className="w-full pt-6 flex flex-col items-center justify-center space-y-1">
          <p className="text-xs text-[var(--text-secondary)] font-serif italic tracking-wide">
            "{welcomeSubtitle}"
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] tracking-[0.16em] uppercase text-[var(--text-secondary)]/80 font-sans">
              Powered by XLVI Digital
            </span>
            {onOpenAdmin && (
              <>
                <span className="text-[var(--border-color)]">·</span>
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="text-[10px] text-[var(--primary)] hover:underline font-sans cursor-pointer"
                >
                  Admin
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
