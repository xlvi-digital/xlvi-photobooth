import React from 'react';
import { Check, Sparkles } from 'lucide-react';
import { THEMES } from '../context/ThemeContext.jsx';

export default function ThemeSelector({
  value = 'blue',
  onChange,
  className = '',
  title = 'Pilih Theme Event',
}) {
  const selectedThemeId = value || 'blue';

  return (
    <div className={`w-full ${className}`}>
      {title && (
        <div className="flex items-center justify-between mb-2">
          <label className="block font-semibold text-[#3a2820] text-xs flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#8c7365]" />
            <span>{title}</span>
          </label>
          <span className="text-[11px] font-mono text-[#8c7365]">
            {THEMES.find((t) => t.id === selectedThemeId)?.name || 'Royal Blue'}
          </span>
        </div>
      )}

      {/* 3 Theme Visual Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
        {THEMES.map((theme) => {
          const isSelected = selectedThemeId === theme.id;

          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onChange?.(theme.id)}
              className={`relative p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all duration-200 cursor-pointer text-xs ${
                isSelected
                  ? 'bg-white border-[#5c4033] shadow-md ring-2 ring-[#5c4033]/20 translate-y-[-1px]'
                  : 'bg-[#faf7f2]/80 hover:bg-white border-[#e8ded2] hover:border-[#5c4033]/40 shadow-xs'
              }`}
              style={{
                touchAction: 'manipulation',
              }}
              aria-label={`Pilih tema ${theme.name}`}
            >
              {/* Header: Emoji & Active Badge */}
              <div className="flex items-center justify-between w-full mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl leading-none select-none">{theme.emoji}</span>
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white shadow-xs inline-block"
                    style={{ backgroundColor: theme.colorHex }}
                  />
                </div>

                {isSelected ? (
                  <span
                    className="w-5 h-5 rounded-full text-white flex items-center justify-center animate-in zoom-in-75 duration-150 shadow-xs"
                    style={{ backgroundColor: theme.colorHex }}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                ) : (
                  <span className="w-5 h-5 rounded-full border border-[#d9c8b7] bg-white/60" />
                )}
              </div>

              {/* Theme Name & Tagline */}
              <div>
                <p className="font-semibold text-sm text-[#3a2820] leading-tight">
                  {theme.name}
                </p>
                <p className="text-[10px] text-[#7a6456] mt-0.5 leading-tight">
                  {theme.tagline}
                </p>
              </div>

              {/* Theme Accent Tag */}
              <div className="mt-2.5 pt-2 border-t border-[#e8ded2]/60 flex items-center justify-between text-[10px]">
                <span className="text-[#8c7365] font-mono">id: {theme.id}</span>
                <span
                  className="font-medium text-[9px] px-1.5 py-0.5 rounded-md"
                  style={{
                    backgroundColor: theme.colorLight,
                    color: theme.colorDark,
                  }}
                >
                  {isSelected ? '✓ Terpilih' : theme.accentText}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
