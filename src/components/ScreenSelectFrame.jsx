import React from 'react';
import { Check, ArrowRight, Layers, Infinity as InfinityIcon } from 'lucide-react';
import { FRAMES } from '../data/eventData.js';
import FrameOverlay from './FrameOverlay.jsx';
import { formatIndonesianDate } from './ScreenLanding.jsx';

export default function ScreenSelectFrame({
  selectedFrame,
  selectedFrameId,
  onSelectFrame,
  onNext,
  framesList = null,
  currentEvent = null
}) {
  const currentId = selectedFrame?.id || (typeof selectedFrameId === 'object' ? selectedFrameId?.id : selectedFrameId) || 'frame-01';
  const availableFrames = (framesList && framesList.length > 0) ? framesList : FRAMES;

  const eventDisplayName = currentEvent?.name || '';
  const rawDate = currentEvent?.event_date || '';
  const shortDate = rawDate ? rawDate.split('-').reverse().join('.') : '';
  const formattedDate = formatIndonesianDate(rawDate) || shortDate;

  return (
    <div className="flex-1 flex flex-col justify-between px-5 pt-4 pb-6 max-w-md mx-auto w-full bg-transparent theme-transition">
      {/* Title & Subtitle */}
      <div className="text-center mb-3">
        <span className="text-[10px] tracking-[0.25em] uppercase text-[var(--primary)] font-serif block mb-1 font-semibold theme-transition">
          Langkah 01
        </span>
        <h2 className="font-serif text-2xl sm:text-3xl text-[var(--text-primary)] font-normal tracking-wide theme-transition">
          Pilih Frame
        </h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1 font-sans theme-transition">
          Pilih desain bingkai yang ingin kamu gunakan untuk fotomu.
        </p>
      </div>

      {/* Frame Selection Grid (Single and Multi-Photo Frames) */}
      <div className="grid grid-cols-2 gap-3.5 my-auto max-h-[60vh] overflow-y-auto pr-0.5">
        {availableFrames.map((frame, index) => {
          const isSelected = currentId === frame.id;
          const isMulti = frame.type === 'multi' || (frame.slots && frame.slots.length > 1);
          const isBoomerang = frame.type === 'boomerang';
          const slotsCount = frame.photo_count || frame.photoCount || (frame.slots ? frame.slots.length : 1);

          return (
            <div
              key={frame.id}
              onClick={() => {
                onSelectFrame(frame);
              }}
              className={`relative cursor-pointer rounded-2xl p-2 transition-all duration-300 flex flex-col items-center group text-left theme-transition ${
                isSelected
                  ? 'bg-white shadow-md ring-2 ring-[var(--primary)] scale-[1.02]'
                  : 'bg-white/70 hover:bg-white border border-[var(--border-color)] hover:border-[var(--primary)]/40 shadow-xs'
              }`}
            >
              {/* Active Check Badge */}
              {isSelected && (
                <div className="absolute top-3 right-3 z-20 w-6 h-6 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shadow-sm animate-in zoom-in-75 duration-200">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              )}

              {/* Number and Multi/Boomerang Badge */}
              <div className="absolute top-3 left-3 z-20 flex items-center gap-1">
                <span className="text-[9px] font-mono tracking-wider px-1.5 py-0.5 rounded-full bg-[var(--surface)]/90 text-[var(--text-secondary)] border border-[var(--border-color)]">
                  0{index + 1}
                </span>
                {isMulti && (
                  <span className="text-[8px] font-sans font-semibold tracking-wider px-1.5 py-0.5 rounded-full bg-[var(--primary)] text-white flex items-center gap-0.5 shadow-2xs">
                    <Layers className="w-2.5 h-2.5" />
                    <span>{slotsCount} Foto</span>
                  </span>
                )}
                {isBoomerang && (
                  <span className="text-[8px] font-sans font-semibold tracking-wider px-1.5 py-0.5 rounded-full bg-rose-600 text-white flex items-center gap-0.5 shadow-2xs">
                    <InfinityIcon className="w-2.5 h-2.5" />
                    <span>Boom</span>
                  </span>
                )}
              </div>

              {/* Frame Visual Thumbnail Preview (Frame image remains 100% natural and untinted) */}
              <div className="relative w-full aspect-[3/4] bg-[var(--surface-soft)] rounded-xl overflow-hidden mb-2.5 flex items-center justify-center border border-[var(--border-color)]">
                <div className="absolute inset-3 bg-gradient-to-br from-black/5 to-black/10 rounded-md opacity-40 flex items-center justify-center">
                  <span className="text-[11px] text-[var(--text-secondary)]/60 font-serif italic">Preview</span>
                </div>

                {/* Custom Overlay Thumbnail from Supabase if uploaded */}
                {frame.thumbnail_url || frame.overlay_url ? (
                  <img
                    src={frame.thumbnail_url || frame.overlay_url}
                    alt={frame.name}
                    className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
                  />
                ) : (
                  /* Live Frame Overlay SVG */
                  <FrameOverlay selectedFrame={frame} showText={false} currentEvent={currentEvent} />
                )}

                <div className="absolute bottom-2 inset-x-2 text-center pointer-events-none z-20 bg-gradient-to-t from-[var(--surface)]/90 to-transparent pt-2">
                  <p className="font-serif text-[11px] text-[var(--text-primary)] font-medium leading-none truncate">
                    {eventDisplayName || frame.name}
                  </p>
                  {formattedDate && (
                    <p className="text-[7px] text-[var(--text-secondary)] tracking-widest mt-0.5 font-sans">
                      {shortDate || formattedDate}
                    </p>
                  )}
                </div>
              </div>

              {/* Title & Tag */}
              <div className="w-full px-1">
                <h4 className="font-serif text-sm font-semibold text-[var(--text-primary)] truncate">
                  {frame.name}
                </h4>
                <p className="text-[10px] text-[var(--text-secondary)] truncate font-sans mt-0.5">
                  {frame.accent || frame.subtitle || 'Bingkai Elegan'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Action Button */}
      <div className="mt-4 pt-2">
        <button
          onClick={onNext}
          className="w-full h-12 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-[0.98] text-white font-medium text-sm tracking-[0.1em] uppercase transition-all duration-200 shadow-md shadow-[var(--primary)]/20 flex items-center justify-center gap-2 cursor-pointer theme-transition"
        >
          <span>Lanjutkan ke Kamera</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
