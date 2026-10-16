import React from 'react';
import { formatIndonesianDate } from './ScreenLanding.jsx';
import { getMultiPhotoSlots } from '../utils/canvasRenderer.js';

export default function FrameOverlay({
  frameId = 'frame-01',
  selectedFrame,
  showText = true,
  currentSlotIndex = null,
  currentEvent = null,
  capturedPhotos = [],
  cameraPreview = null,
}) {
  const activeId = selectedFrame?.id || frameId;
  const overlayUrl = selectedFrame?.overlay_url;
  const configuredSlots = selectedFrame?.slots || selectedFrame?.frame_slots;
  const dynamicSlots = selectedFrame?.type === 'multi'
    ? getMultiPhotoSlots(selectedFrame)
    : configuredSlots;
  const isMulti = selectedFrame?.type === 'multi' || (dynamicSlots && dynamicSlots.length > 1);

  // Derive dynamic event name and event_date strictly from currentEvent
  const eventName = currentEvent?.name || '';
  const rawDate = currentEvent?.event_date || '';
  const eventDateIndo = formatIndonesianDate(rawDate);

  // Temporary debugging console log as strictly requested by user:
  console.log('[FRAME EVENT] currentEvent.name', currentEvent?.name);
  console.log('[FRAME EVENT] currentEvent.event_date', currentEvent?.event_date);

  // Helper date formatters for various styles
  const shortDate = rawDate ? rawDate.split('-').reverse().join('.') : ''; // 27.12.2026
  const slashDate = rawDate ? rawDate.split('-').reverse().map((p) => p.slice(-2)).join('/') : ''; // 27/12/26

  // If frame has dynamic multi-photo slots, render dynamic slot overlays!
  if (isMulti && dynamicSlots && dynamicSlots.length > 0) {
    return (
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
        {/* Outer frame borders */}
        <div className="absolute inset-1 sm:inset-2 border-2 border-[#5c4033] rounded-lg" />
        <div className="absolute inset-2 sm:inset-2.5 border border-[#c8a882]/80 rounded-md" />

        {/* Dynamic Photo Slot Guides */}
        <div className="relative z-10 w-full h-full">
          {dynamicSlots.map((slot, idx) => {
            const leftPct = ((slot.x || 0) / 1080) * 100;
            const topPct = ((slot.y || 0) / 1440) * 100;
            const widthPct = ((slot.width || 1080) / 1080) * 100;
            const heightPct = ((slot.height || 1440) / 1440) * 100;
            const isCurrent = currentSlotIndex === idx;
            const capturedPhoto = capturedPhotos[idx];

            return (
              <div
                key={idx}
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                  borderRadius: `${(slot.border_radius || 12) / 3}px`,
                }}
                className={`absolute overflow-hidden transition-all ${
                  isCurrent
                    ? 'border-[3px] border-amber-300 shadow-md ring-2 ring-[#5c4033]/50'
                    : capturedPhoto
                    ? 'border-2 border-[#c8a882]'
                    : 'border border-dashed border-[#c8a882]/80 bg-[#e9dfd4]'
                }`}
              >
                {isCurrent ? (
                  cameraPreview
                ) : capturedPhoto ? (
                  <img
                    src={capturedPhoto}
                    alt={`Hasil foto slot ${idx + 1}`}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[#8c7365]">
                    <span className="text-[10px] font-serif uppercase tracking-widest">Slot 0{idx + 1}</span>
                  </div>
                )}
                <span className={`absolute top-1 left-1 z-10 text-[8px] font-serif uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                  isCurrent ? 'bg-[#5c4033] text-white font-bold' : 'bg-black/45 text-white'
                }`}>
                  {isCurrent ? `Aktif · 0${idx + 1}` : capturedPhoto ? `Selesai · 0${idx + 1}` : `Berikutnya · 0${idx + 1}`}
                </span>
              </div>
            );
          })}
        </div>

        {/* Custom Uploaded Overlay PNG if present */}
        {overlayUrl && (
          <img
            src={overlayUrl}
            alt="Frame Overlay"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20"
          />
        )}

        {/* Bottom Typography */}
        {showText && (
          <div className="relative z-30 text-center pb-1 pt-2 bg-gradient-to-t from-[#faf7f2] via-[#faf7f2]/95 to-transparent">
            {eventName && (
              <h3 className="font-serif text-lg sm:text-xl text-[#3a2820] font-normal tracking-wide leading-none">
                {eventName}
              </h3>
            )}
            <p className="text-[9px] text-[#8c7365] tracking-[0.2em] font-sans mt-0.5">
              {selectedFrame?.name || 'Three Moments'}{eventDateIndo ? ` · ${eventDateIndo}` : ''}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Botanical Romance (Single)
  if (activeId === 'frame-02') {
    return (
      <div className="absolute inset-0 pointer-events-none p-3 sm:p-4 flex flex-col justify-between">
        <div className="absolute inset-2 sm:inset-3 border border-[#718066]/60 rounded-xl" />
        <div className="absolute inset-3 sm:inset-4 border border-[#718066]/30 rounded-lg" />

        <div className="relative z-10 flex justify-between items-start px-2 pt-1 text-[#5c6853]">
          <svg className="w-8 h-8 opacity-80 rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2C8 6 6 12 12 20M12 6C15 6 18 9 17 12M12 11C15 11 17 13 16 16M12 2c4 4 6 10 0 18" strokeLinecap="round" />
          </svg>
          <div className="text-center pt-1">
            <span className="text-[10px] tracking-[0.25em] uppercase font-serif text-[#5c6853]/90">
              The Wedding
            </span>
          </div>
          <svg className="w-8 h-8 opacity-80 -scale-x-100 -rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2C8 6 6 12 12 20M12 6C15 6 18 9 17 12M12 11C15 11 17 13 16 16M12 2c4 4 6 10 0 18" strokeLinecap="round" />
          </svg>
        </div>

        {overlayUrl && (
          <img src={overlayUrl} alt="Frame Overlay" className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20" />
        )}

        {showText && (
          <div className="relative z-10 text-center pb-2 bg-gradient-to-t from-[#faf7f2]/95 via-[#faf7f2]/80 to-transparent pt-6 rounded-b-lg">
            {eventName && (
              <h3 className="font-serif text-xl sm:text-2xl text-[#3a2820] font-normal tracking-wide">
                {eventName}
              </h3>
            )}
            {eventDateIndo && (
              <p className="text-[10px] text-[#718066] tracking-[0.2em] font-sans mt-0.5 uppercase">
                {eventDateIndo}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Luxury Warm Brown (Single)
  if (activeId === 'frame-03') {
    return (
      <div className="absolute inset-0 pointer-events-none p-3 sm:p-4 flex flex-col justify-between">
        <div className="absolute inset-2 sm:inset-3 border-2 border-[#5c4033] rounded-sm" />
        <div className="absolute inset-3 sm:inset-4 border border-[#c8a882]/70" />

        <div className="absolute top-2.5 left-2.5 w-3 h-3 border-t-2 border-l-2 border-[#c8a882]" />
        <div className="absolute top-2.5 right-2.5 w-3 h-3 border-t-2 border-r-2 border-[#c8a882]" />
        <div className="absolute bottom-2.5 left-2.5 w-3 h-3 border-b-2 border-l-2 border-[#c8a882]" />
        <div className="absolute bottom-2.5 right-2.5 w-3 h-3 border-b-2 border-r-2 border-[#c8a882]" />

        <div className="relative z-10 text-center pt-2">
          <div className="inline-block bg-[#faf7f2]/90 px-3 py-0.5 border border-[#c8a882]/40 rounded-full shadow-xs">
            <span className="text-[9px] tracking-[0.3em] uppercase text-[#5c4033] font-serif">
              ✦ XLVI LUXURY PHOTOBOOTH ✦
            </span>
          </div>
        </div>

        {overlayUrl && (
          <img src={overlayUrl} alt="Frame Overlay" className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20" />
        )}

        {showText && (
          <div className="relative z-10 text-center pb-2 bg-gradient-to-t from-[#faf7f2]/95 via-[#faf7f2]/85 to-transparent pt-6">
            <p className="text-[9px] uppercase tracking-[0.25em] text-[#8c7365] font-sans">
              The Wedding Celebration of
            </p>
            {eventName && (
              <h3 className="font-serif text-2xl sm:text-3xl text-[#5c4033] font-semibold tracking-wider mt-0.5">
                {eventName}
              </h3>
            )}
            {eventDateIndo && (
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="h-[1px] w-8 bg-[#c8a882]" />
                <span className="text-[10px] tracking-[0.2em] text-[#8c7365] font-sans">
                  {eventDateIndo}
                </span>
                <span className="h-[1px] w-8 bg-[#c8a882]" />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Modern Editorial (Single)
  if (activeId === 'frame-05') {
    return (
      <div className="absolute inset-0 pointer-events-none p-3 sm:p-4 flex flex-col justify-between">
        <div className="absolute inset-2 sm:inset-3 border border-[#2d2926]/80 rounded-md" />
        <div className="absolute inset-3 sm:inset-4 border border-[#8c7365]/30 rounded-sm" />

        <div className="relative z-10 flex justify-between items-center px-2 pt-1 text-[10px] text-[#2d2926]/90 font-sans tracking-widest uppercase">
          <span>NO. 46 / VIRTUAL</span>
          <span>{rawDate ? rawDate.split('-')[0] : 'EST. 2026'}</span>
        </div>

        {overlayUrl && (
          <img src={overlayUrl} alt="Frame Overlay" className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20" />
        )}

        {showText && (
          <div className="relative z-10 text-left px-3 pb-2 bg-gradient-to-t from-[#faf7f2]/95 via-[#faf7f2]/85 to-transparent pt-6">
            <div className="flex items-end justify-between border-t border-[#2d2926]/30 pt-1.5">
              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-[#8c7365]">Special Reception</p>
                {eventName && (
                  <h3 className="font-serif text-xl sm:text-2xl text-[#2d2926] font-medium tracking-tight">
                    {eventName}
                  </h3>
                )}
              </div>
              {eventDateIndo && (
                <div className="text-right">
                  <span className="text-[10px] font-mono tracking-widest text-[#2d2926]">
                    {slashDate || eventDateIndo}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default: Frame 01 or Custom Uploaded Frame Overlay
  return (
    <div className="absolute inset-0 pointer-events-none p-3 sm:p-4 flex flex-col justify-between">
      <div className="absolute inset-2 sm:inset-3 border border-[#c8a882]/80 rounded-sm" />
      <div className="absolute inset-3 sm:inset-4 border border-[#5c4033]/30" />

      <div className="relative z-10 text-center pt-1.5">
        <span className="text-[9px] tracking-[0.3em] font-serif text-[#8c7365] uppercase">
          — XLVI · MEMORIES —
        </span>
      </div>

      {overlayUrl && (
        <img
          src={overlayUrl}
          alt="Custom Frame Overlay"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20"
        />
      )}

      {showText && (
        <div className="relative z-10 text-center pb-2 bg-gradient-to-t from-[#faf7f2]/95 via-[#faf7f2]/80 to-transparent pt-6">
          <p className="text-[9px] uppercase tracking-[0.25em] text-[#8c7365] font-sans">
            The Wedding Of
          </p>
          {eventName && (
            <h3 className="font-serif text-2xl sm:text-3xl text-[#3a2820] font-normal tracking-wide mt-0.5">
              {eventName}
            </h3>
          )}
          {eventDateIndo && (
            <p className="text-[10px] text-[#8c7365] tracking-[0.2em] font-sans mt-0.5">
              {eventDateIndo}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
