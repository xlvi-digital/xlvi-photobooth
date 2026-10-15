import React from 'react';
import { EVENT_DATA } from '../data/eventData.js';

/**
 * EventBackground
 * 
 * Reusable background component for all screens after landing page.
 * Uses currentEvent.cover_image (fallback to default if null).
 * 
 * Hierarchy:
 * EventBackground
 *  ├── Layer 1: Background Image (blur 6px, opacity ~16%, cover, center)
 *  ├── Layer 2: Soft Translucent Overlay (75-85% opacity, theme-harmonized)
 *  └── Layer 3: Content (position: relative, z-10, completely sharp & untouched)
 */
export default function EventBackground({ currentEvent, children, className = '' }) {
  // Single source of truth: currentEvent.cover_image
  const coverUrl = currentEvent?.cover_image || EVENT_DATA?.heroPhoto;
  const theme = currentEvent?.theme_id || currentEvent?.event_settings?.theme_id || 'blue';

  return (
    <div
      className={`relative w-full flex-1 flex flex-col overflow-hidden min-h-[100dvh] sm:min-h-full ${className}`}
      style={{
        // Base fallback matching theme background
        backgroundColor: 'var(--background)',
      }}
    >
      {/* 
        LAYER 1: BACKGROUND IMAGE
        - url(currentEvent.cover_image)
        - blur ringan 6px (dalam rentang 4–8px)
        - opacity rendah ~16% (dalam rentang 10–20%)
        - cover, center, no-repeat
        - scale-105 to avoid border blur artifacts
        - pointer-events-none & z-0
      */}
      {coverUrl && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
        >
          <div
            className="w-full h-full scale-105 transition-all duration-700 ease-out"
            style={{
              backgroundImage: `url("${coverUrl}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center 25%',
              backgroundRepeat: 'no-repeat',
              filter: 'blur(6px)',
              opacity: 0.16,
            }}
          />
        </div>
      )}

      {/* 
        LAYER 2: SOFT TRANSLUCENT OVERLAY (75–85%)
        - Soft theme-tinted translucent overlay to guarantee high contrast & readability
        - Ruby: subtle warm blush tint
        - Green: subtle emerald/sage tint
        - Blue: subtle soft royal tint
        - pointer-events-none & z-[1]
      */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-[1] transition-colors duration-300"
        style={{
          backgroundColor:
            theme === 'ruby'
              ? 'rgba(255, 245, 245, 0.82)'
              : theme === 'green'
              ? 'rgba(236, 253, 245, 0.82)'
              : 'rgba(239, 246, 255, 0.82)',
        }}
      />

      {/* 
        LAYER 3: CONTENT
        - Header, Main Content, Action Buttons
        - Fully sharp, position: relative, z-10
        - No blur or opacity on any content
      */}
      <div className="relative z-10 flex-1 flex flex-col w-full h-full">
        {children}
      </div>
    </div>
  );
}
