import React from 'react';
import { ArrowLeft } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Frame', screenName: 'frame' },
  { id: 2, label: 'Foto', screenName: 'camera' },
  { id: 3, label: 'Ucapan', screenName: 'greeting' },
  { id: 4, label: 'Selesai', screenName: 'success' },
];

export default function HeaderStepper({ currentStep, onBack, title = "XLVI Photobooth" }) {
  return (
    <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-md border-b border-[var(--border-color)] px-4 pt-3 pb-2.5 transition-all theme-transition">
      {/* Top row: Back button & Title */}
      <div className="flex items-center justify-between mb-2">
        {onBack ? (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-dark)] active:scale-95 transition-all py-1.5 px-2 -ml-2 rounded-lg hover:bg-[var(--primary-soft)] cursor-pointer"
            aria-label="Kembali ke langkah sebelumnya"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
        ) : (
          <div className="w-16" />
        )}

        <div className="text-center">
          <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)] font-serif block truncate max-w-[200px]">
            {title}
          </span>
        </div>

        <div className="w-16" />
      </div>

      {/* Elegant Progress Stepper */}
      <div className="flex items-center justify-between max-w-xs mx-auto px-1 py-1">
        {STEPS.map((step, idx) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center group">
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium transition-all duration-300 ${
                      isActive
                        ? 'bg-[var(--primary)] text-white shadow-sm ring-2 ring-[var(--primary)]/20'
                        : isCompleted
                        ? 'bg-[var(--primary-light)] text-[var(--primary-dark)] font-semibold'
                        : 'bg-neutral-200 text-neutral-500'
                    }`}
                  >
                    {isCompleted ? '✓' : `0${step.id}`}
                  </span>
                  <span
                    className={`text-[11px] font-sans transition-colors ${
                      isActive
                        ? 'font-semibold text-[var(--text-primary)]'
                        : isCompleted
                        ? 'text-[var(--primary-dark)] font-medium'
                        : 'text-neutral-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              </div>

              {idx < STEPS.length - 1 && (
                <div
                  className={`h-[1.5px] flex-1 mx-2 transition-colors duration-300 ${
                    step.id < currentStep ? 'bg-[var(--primary)]' : 'bg-neutral-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </header>
  );
}
