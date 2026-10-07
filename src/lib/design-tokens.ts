/**
 * Leish! Design Tokens — Champagne Elegance DARK Palette
 * Warm gold on deep espresso — dark theme
 */

export const primitives = {
  color: {
    brand: {
      50: '#FDFBF5', 100: '#FAF5E6', 200: '#F3E9CC', 300: '#EADCA8',
      400: '#DFCC84', 500: '#C9A961', 600: '#B08F45', 700: '#8F7234',
      800: '#6E5726', 900: '#4E3D1A',
    },
    neutral: {
      50: '#FDFCF9', 100: '#EFE9DE', 200: '#DFD5C5', 300: '#C4B8A4',
      400: '#A3947D', 500: '#7D6F5A', 600: '#5A4F3E', 700: '#3B3226',
      800: '#332B20', 900: '#261F17', 950: '#1A150F',
    },
    accent: {
      gold: '#C9A961', goldLight: '#DFCC84', goldDark: '#8F7234',
      champagne: '#F3E9CC', blush: '#F5E6DE', cream: '#FDFCF9',
      emerald: '#10B981',
    },
  },
  space: {
    0: '0', 1: '0.25rem', 2: '0.5rem', 3: '0.75rem', 4: '1rem',
    5: '1.25rem', 6: '1.5rem', 8: '2rem', 10: '2.5rem', 12: '3rem',
    16: '4rem', 20: '5rem', 24: '6rem',
  },
  font: {
    sans: 'Raleway, Inter, system-ui, -apple-system, sans-serif',
    serif: 'Lora, Playfair Display, Georgia, serif',
    mono: 'JetBrains Mono, monospace',
  },
  radius: {
    sm: '0.25rem', md: '0.5rem', lg: '0.75rem', xl: '1rem',
    '2xl': '1.5rem', '3xl': '2rem', full: '9999px',
  },
} as const;

export const semantic = {
  color: {
    bg: {
      primary: primitives.color.neutral[950],
      secondary: primitives.color.neutral[900],
      tertiary: primitives.color.neutral[800],
      elevated: primitives.color.neutral[800],
    },
    text: {
      primary: primitives.color.neutral[50],
      secondary: primitives.color.neutral[100],
      tertiary: primitives.color.neutral[200],
      inverse: primitives.color.neutral[950],
    },
    brand: {
      primary: primitives.color.brand[500],
      hover: primitives.color.brand[400],
      active: primitives.color.brand[600],
    },
    accent: {
      gold: primitives.color.accent.gold,
      goldLight: primitives.color.accent.goldLight,
      champagne: primitives.color.accent.champagne,
      blush: primitives.color.accent.blush,
      success: primitives.color.accent.emerald,
    },
    border: {
      default: primitives.color.neutral[700],
      hover: primitives.color.neutral[600],
      focus: primitives.color.brand[500],
    },
  },
  space: {
    component: { xs: primitives.space[1], sm: primitives.space[2], md: primitives.space[4], lg: primitives.space[6], xl: primitives.space[8] },
    layout: { sm: primitives.space[4], md: primitives.space[8], lg: primitives.space[12], xl: primitives.space[16] },
  },
} as const;

export const component = {
  button: {
    primary: { bg: semantic.color.brand.primary, text: semantic.color.text.inverse, hover: semantic.color.brand.hover, active: semantic.color.brand.active },
    secondary: { bg: semantic.color.bg.tertiary, text: semantic.color.text.primary, hover: primitives.color.neutral[700] },
  },
  card: { bg: semantic.color.bg.secondary, border: semantic.color.border.default, hover: semantic.color.border.hover },
  input: { bg: semantic.color.bg.tertiary, border: semantic.color.border.default, focus: semantic.color.border.focus, text: semantic.color.text.primary, placeholder: semantic.color.text.tertiary },
} as const;

export type PrimitiveTokens = typeof primitives;
export type SemanticTokens = typeof semantic;
export type ComponentTokens = typeof component;
