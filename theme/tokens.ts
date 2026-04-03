export type ThemeName = 'light' | 'dark';

/**
 * Light: airy cool-white page, ink text on canvas, crisp cards.
 * Dark: slate canvas (#10141C), elevated surfaces, soft pink accents on borders.
 * `canvasText*` = copy on the page background; `text*` = copy on cards / inputs.
 */
export const tokens = {
  light: {
    bgPage: '#eef1f9',
    bgElevated: '#ffffff',
    bgSubtle: '#e4e9f4',
    /** Fields inside white cards */
    inputSurface: '#f4f6fc',
    border: 'rgba(15, 23, 42, 0.09)',
    text: '#0b1220',
    textMuted: '#5a6578',
    canvasText: '#0b1220',
    canvasTextMuted: '#64708c',
    brand: '#1d4ed8',
    brandHover: '#1e3a8a',
    brandSoft: 'rgba(29, 78, 216, 0.11)',
    accent: '#be185d',
    accentSoft: 'rgba(190, 24, 93, 0.11)',
    danger: '#b91c1c',
    dangerSoft: 'rgba(185, 28, 28, 0.1)',
    ring: 'rgba(29, 78, 216, 0.4)',
    shadow: 'rgba(15, 23, 42, 0.07)',
    shadowLg: 'rgba(15, 23, 42, 0.1)',
  },
  dark: {
    bgPage: '#10141C',
    bgElevated: '#181e2a',
    bgSubtle: '#222a38',
    inputSurface: '#141b28',
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

export const radii = {
  button: 14,
  card: 20,
  /** @deprecated use radii.button */
  xl: 14,
  /** @deprecated use radii.card */
  xxl: 20,
} as const;

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  /** Auth / section gutters */
  screenX: 22,
} as const;
