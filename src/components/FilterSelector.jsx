import React from 'react';
import { PHOTO_FILTERS } from '../utils/photoFilters.js';

export default function FilterSelector({ selectedFilter = 'original', onSelectFilter }) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 scrollbar-none no-scrollbar">
        {PHOTO_FILTERS.map((filter) => {
          const isSelected = selectedFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => onSelectFilter(filter.id)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-sans flex items-center gap-1 transition-all cursor-pointer select-none ${
                isSelected
                  ? 'bg-[var(--primary)] text-white shadow-xs font-semibold scale-102 ring-1 ring-[var(--primary)]/30'
                  : 'bg-white/80 hover:bg-white text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
              }`}
            >
              <span className="text-[11px]">{filter.icon}</span>
              <span>{filter.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
