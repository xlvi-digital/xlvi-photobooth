/**
 * Preset photo filters for XLVI Photobooth.
 * Applied ONLY to user photo / video canvas (leaving frames, overlays, and themes intact).
 */
export const PHOTO_FILTERS = [
  {
    id: 'original',
    name: 'Original',
    icon: '✨',
    cssFilter: 'none',
    canvasFilter: 'none',
  },
  {
    id: 'bright',
    name: 'Bright',
    icon: '☀️',
    cssFilter: 'brightness(1.12) contrast(1.05) saturate(1.08)',
    canvasFilter: 'brightness(1.12) contrast(1.05) saturate(1.08)',
  },
  {
    id: 'warm',
    name: 'Warm',
    icon: '🌅',
    cssFilter: 'sepia(0.22) saturate(1.18) brightness(1.04) contrast(1.02)',
    canvasFilter: 'sepia(0.22) saturate(1.18) brightness(1.04) contrast(1.02)',
  },
  {
    id: 'cool',
    name: 'Cool',
    icon: '❄️',
    cssFilter: 'hue-rotate(185deg) saturate(1.1) brightness(1.05)',
    // Canvas equivalent / clean cool tint
    canvasFilter: 'hue-rotate(185deg) saturate(1.1) brightness(1.05)',
  },
  {
    id: 'vintage',
    name: 'Vintage',
    icon: '🎞️',
    cssFilter: 'sepia(0.35) contrast(1.15) brightness(0.95) saturate(1.1)',
    canvasFilter: 'sepia(0.35) contrast(1.15) brightness(0.95) saturate(1.1)',
  },
  {
    id: 'bw',
    name: 'B & W',
    icon: '🖤',
    cssFilter: 'grayscale(1) contrast(1.22) brightness(1.05)',
    canvasFilter: 'grayscale(1) contrast(1.22) brightness(1.05)',
  },
  {
    id: 'soft',
    name: 'Soft',
    icon: '🌸',
    cssFilter: 'brightness(1.08) contrast(0.92) saturate(1.05)',
    canvasFilter: 'brightness(1.08) contrast(0.92) saturate(1.05)',
  },
];

export function getFilterById(filterId) {
  return PHOTO_FILTERS.find((f) => f.id === filterId) || PHOTO_FILTERS[0];
}
