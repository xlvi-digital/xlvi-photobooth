import React, { createContext, useContext, useState, useEffect } from 'react';

export const THEMES = [
  {
    id: 'blue',
    name: 'Royal Blue',
    tagline: 'Modern & Clean',
    emoji: '💙',
    colorHex: '#2563EB',
    colorDark: '#1E3A8A',
    colorLight: '#DBEAFE',
    colorSoft: '#EFF6FF',
    accentText: 'Biru Elegan'
  },
  {
    id: 'ruby',
    name: 'Ruby Red',
    tagline: 'Elegant & Romantic',
    emoji: '❤️',
    colorHex: '#B4232C',
    colorDark: '#7F1D1D',
    colorLight: '#FDECEC',
    colorSoft: '#FFF5F5',
    accentText: 'Merah Romantis'
  },
  {
    id: 'green',
    name: 'Emerald Green',
    tagline: 'Fresh & Natural',
    emoji: '💚',
    colorHex: '#16805B',
    colorDark: '#065F46',
    colorLight: '#D1FAE5',
    colorSoft: '#ECFDF5',
    accentText: 'Hijau Segar'
  }
];

const DEFAULT_THEME = 'blue';

const ThemeContext = createContext({
  currentTheme: DEFAULT_THEME,
  setTheme: () => {},
  themes: THEMES,
  activeThemeConfig: THEMES[0]
});

export function ThemeProvider({ children, eventTheme = 'blue' }) {
  const sanitizeTheme = (t) => {
    if (!t) return DEFAULT_THEME;
    const clean = String(t).trim().toLowerCase();
    if (
      clean === 'green' ||
      clean === 'emerald' ||
      clean === 'emerald-green' ||
      clean.includes('green') ||
      clean.includes('emerald')
    ) {
      return 'green';
    }
    if (
      clean === 'ruby' ||
      clean === 'red' ||
      clean === 'ruby-red' ||
      clean.includes('ruby') ||
      clean.includes('red')
    ) {
      return 'ruby';
    }
    if (clean === 'blue' || clean === 'royal-blue' || clean.includes('blue')) {
      return 'blue';
    }
    return DEFAULT_THEME;
  };

  const [currentTheme, setCurrentTheme] = useState(() => {
    const valid = sanitizeTheme(eventTheme);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', valid);
    }
    return valid;
  });

  // Sync state whenever eventTheme changes from active event
  useEffect(() => {
    const valid = sanitizeTheme(eventTheme);
    setCurrentTheme(valid);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', valid);
    }
  }, [eventTheme]);

  // Apply data-theme attribute on root element
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', currentTheme);
    }
  }, [currentTheme]);

  const handleSetTheme = (themeId) => {
    const valid = sanitizeTheme(themeId);
    setCurrentTheme(valid);
  };

  const activeThemeConfig = THEMES.find((t) => t.id === currentTheme) || THEMES[0];

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        setTheme: handleSetTheme,
        themes: THEMES,
        activeThemeConfig
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
