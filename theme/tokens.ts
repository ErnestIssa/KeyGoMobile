export type ThemeName = 'light' | 'dark';

/**
 * Mobile app uses a fixed canvas `#10141C` (plain background everywhere).
 * `canvasText` / `canvasTextMuted` are for copy that sits directly on that canvas.
 * `text` / `textMuted` target elevated surfaces (cards, inputs).
 */
export const tokens = {
  light: {
    bgPage: '#10141C',
    bgElevated: '#ffffff',
    bgSubtle: '#e8eef9',
    border: 'rgba(37, 99, 235, 0.12)',
    text: '#0a0f1a',
    textMuted: '#5c6578',
    canvasText: '#f1f5f9',
    canvasTextMuted: '#94a3b8',
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
    bgPage: '#10141C',
    bgElevated: '#181e2a',
    bgSubtle: '#222a38',
    border: 'rgba(244, 114, 182, 0.14)',
    text: '#f1f5f9',
    textMuted: '#94a3b8',
    canvasText: '#f1f5f9',
    canvasTextMuted: '#94a3b8',
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

/** Tailwind parity: `rounded-xl` buttons, `rounded-2xl` cards. */
export const radii = {
  button: 12,
  card: 16,
  /** @deprecated use radii.button */
  xl: 12,
  /** @deprecated use radii.card */
  xxl: 16,
} as const;

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
} as const;
