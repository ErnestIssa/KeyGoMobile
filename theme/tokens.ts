export type ThemeName = 'light' | 'dark';

// Ported from `KeyGo/src/index.css` CSS variables.
export const tokens = {
  light: {
    bgPage: '#f0f4fb',
    bgElevated: '#ffffff',
    bgSubtle: '#e8eef9',
    border: 'rgba(37, 99, 235, 0.12)',
    text: '#0a0f1a',
    textMuted: '#5c6578',
    brand: '#1d4ed8',
    brandHover: '#1e40af',
    brandSoft: 'rgba(29, 78, 216, 0.1)',
    accent: '#db2777',
    accentSoft: 'rgba(219, 39, 119, 0.12)',
    danger: '#b91c1c',
    dangerSoft: 'rgba(185, 28, 28, 0.1)',
    ring: 'rgba(29, 78, 216, 0.45)',
    shadow: 'rgba(15, 23, 42, 0.08)',
    shadowLg: 'rgba(15, 23, 42, 0.12)',
  },
  dark: {
    bgPage: '#06080d',
    bgElevated: '#10141c',
    bgSubtle: '#181e2a',
    border: 'rgba(244, 114, 182, 0.14)',
    text: '#f1f5f9',
    textMuted: '#94a3b8',
    brand: '#60a5fa',
    brandHover: '#93c5fd',
    brandSoft: 'rgba(96, 165, 250, 0.15)',
    accent: '#f472b6',
    accentSoft: 'rgba(244, 114, 182, 0.14)',
    danger: '#f87171',
    dangerSoft: 'rgba(248, 113, 113, 0.12)',
    ring: 'rgba(96, 165, 250, 0.5)',
    shadow: 'rgba(0, 0, 0, 0.35)',
    shadowLg: 'rgba(0, 0, 0, 0.45)',
  },
} as const;

export type ThemeTokens = (typeof tokens)[ThemeName];

export const radii = {
  xl: 16,
  xxl: 20,
} as const;

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
} as const;

