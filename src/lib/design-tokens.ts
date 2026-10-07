/**
 * Leish! Design Tokens
 * Three-layer architecture: Primitive → Semantic → Component
 */

// Primitive Tokens (raw values)
export const primitives = {
  // Colors
  color: {
    // Brand
    brand: {
      50: '#FDF2F0',
      100: '#FCE4E0',
      200: '#F9C9C1',
      300: '#F4A396',
      400: '#ED7A66',
      500: '#9A1A18', // Primary brand red
      600: '#8B1715',
      700: '#7A1412',
      800: '#691110',
      900: '#580E0D',
    },
    // Neutrals
    neutral: {
      50: '#FAF8F5',
      100: '#F5F0EB',
      200: '#E9D2C4',
      300: '#D4CDC7',
      400: '#A89F91',
      500: '#736A63',
      600: '#554E48',
      700: '#382F2A',
      800: '#2B231F',
      900: '#1C1613',
      950: '#0D0B0A',
    },
    // Accent
    accent: {
      gold: '#D4A373',
      champagne: '#EAC7C0',
      emerald: '#10B981',
    },
  },
  // Spacing
  space: {
    0: '0',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
  },
  // Typography
  font: {
    sans: 'Inter, system-ui, -apple-system, sans-serif',
    serif: 'Playfair Display, Georgia, serif',
    mono: 'JetBrains Mono, monospace',
  },
  // Border radius
  radius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    '3xl': '2rem',
    full: '9999px',
  },
  // Shadows
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
} as const;

// Semantic Tokens (purpose aliases)
export const semantic = {
  color: {
    // Backgrounds
    bg: {
      primary: primitives.color.neutral[950],
      secondary: primitives.color.neutral[900],
      tertiary: primitives.color.neutral[800],
      elevated: primitives.color.neutral[800],
    },
    // Text
    text: {
      primary: primitives.color.neutral[50],
      secondary: primitives.color.neutral[300],
      tertiary: primitives.color.neutral[400],
      inverse: primitives.color.neutral[950],
    },
    // Brand
    brand: {
      primary: primitives.color.brand[500],
      hover: primitives.color.brand[600],
      active: primitives.color.brand[700],
    },
    // Accent
    accent: {
      gold: primitives.color.accent.gold,
      champagne: primitives.color.accent.champagne,
      success: primitives.color.accent.emerald,
    },
    // Borders
    border: {
      default: primitives.color.neutral[700],
      hover: primitives.color.neutral[600],
      focus: primitives.color.brand[500],
    },
  },
  space: {
    component: {
      xs: primitives.space[1],
      sm: primitives.space[2],
      md: primitives.space[4],
      lg: primitives.space[6],
      xl: primitives.space[8],
    },
    layout: {
      sm: primitives.space[4],
      md: primitives.space[8],
      lg: primitives.space[12],
      xl: primitives.space[16],
    },
  },
} as const;

// Component Tokens
export const component = {
  button: {
    primary: {
      bg: semantic.color.brand.primary,
      text: semantic.color.text.primary,
      hover: semantic.color.brand.hover,
      active: semantic.color.brand.active,
    },
    secondary: {
      bg: semantic.color.bg.tertiary,
      text: semantic.color.text.primary,
      hover: primitives.color.neutral[700],
    },
  },
  card: {
    bg: semantic.color.bg.secondary,
    border: semantic.color.border.default,
    hover: semantic.color.border.hover,
  },
  input: {
    bg: semantic.color.bg.tertiary,
    border: semantic.color.border.default,
    focus: semantic.color.border.focus,
    text: semantic.color.text.primary,
    placeholder: semantic.color.text.tertiary,
  },
} as const;

export type PrimitiveTokens = typeof primitives;
export type SemanticTokens = typeof semantic;
export type ComponentTokens = typeof component;
