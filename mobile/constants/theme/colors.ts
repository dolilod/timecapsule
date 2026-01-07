// Warm, family-friendly color palette with a premium, earthy touch
export const palette = {
  // Primary - Deep Warm Coral (sophisticated, not neon)
  coral: {
    50: '#FFF0ED',
    100: '#FFDQD5',
    200: '#FFBCAD',
    300: '#FF9885',
    400: '#FF7055',
    500: '#F05030', // New primary base
    600: '#D63D1F',
    700: '#B02B10',
    800: '#8C200B',
    900: '#691607',
  },

  // Secondary - Muted Teal (calming, nature-inspired)
  teal: {
    50: '#F2FAFA',
    100: '#DDF5F5',
    200: '#BCEBEB',
    300: '#94DEDE',
    400: '#6ACCCC',
    500: '#45B5B5', // Less electric, more sea-glass
    600: '#329696',
    700: '#237878',
    800: '#175C5C',
    900: '#0E4242',
  },

  // Accent - Burnished Gold (memories, heirloom quality)
  gold: {
    50: '#FFFAF0',
    100: '#FFF0C7',
    200: '#FFE09E',
    300: '#FFCE70',
    400: '#FFBC47',
    500: '#F5A623', // Warmer, less yellow
    600: '#D68913',
    700: '#B06C0A',
    800: '#8C5204',
    900: '#693B01',
  },

  // Neutrals - Warm Stone/Sand (avoids sterile grays)
  neutral: {
    0: '#FFFFFF',
    50: '#FAFAF9',  // Warm white
    100: '#F5F5F0', // Bone
    150: '#EBEBE6',
    200: '#E3E3DE', // Stone
    300: '#D1D1CC',
    400: '#A3A39E',
    500: '#7D7D78',
    600: '#5C5C57',
    700: '#40403C',
    800: '#292926',
    900: '#171716',
    1000: '#000000',
  },

  // Semantic colors
  success: {
    light: '#E6F6ED',
    DEFAULT: '#2E8B57', // Sea Green
    dark: '#1F613C',
  },
  warning: {
    light: '#FFF8E6',
    DEFAULT: '#E69500', 
    dark: '#B37400',
  },
  error: {
    light: '#FEECEC',
    DEFAULT: '#D32F2F', // Deep red, less jarring
    dark: '#9A1B1B',
  },
  info: {
    light: '#E6F3F7',
    DEFAULT: '#4A90E2',
    dark: '#2A6BB5',
  },
};

// Light theme
export const lightTheme = {
  // Backgrounds
  background: {
    primary: palette.neutral[50], // Slightly off-white for warmth
    secondary: palette.neutral[0],  // Cards/Sheets usually white
    tertiary: palette.neutral[100],
    elevated: palette.neutral[0],
  },

  // Text
  text: {
    primary: palette.neutral[900],
    secondary: palette.neutral[600],
    tertiary: palette.neutral[500],
    inverse: palette.neutral[50],
    link: palette.coral[600],
  },

  // Interactive
  interactive: {
    primary: palette.coral[500],
    primaryHover: palette.coral[600],
    primaryPressed: palette.coral[700],
    primaryDisabled: palette.neutral[300],
    secondary: palette.teal[500],
    secondaryHover: palette.teal[600],
  },

  // Borders
  border: {
    light: palette.neutral[150],
    DEFAULT: palette.neutral[200],
    strong: palette.neutral[400],
    focus: palette.coral[500],
  },

  // Status
  status: {
    success: palette.success.DEFAULT,
    successBg: palette.success.light,
    warning: palette.warning.DEFAULT,
    warningBg: palette.warning.light,
    error: palette.error.DEFAULT,
    errorBg: palette.error.light,
    pending: palette.gold[500],
    pendingBg: palette.gold[50],
  },

  // Components
  card: {
    background: palette.neutral[0],
    backgroundAlt: palette.neutral[50],
    border: palette.neutral[150],
    shadow: 'rgba(23, 23, 22, 0.08)', // Warmer shadow
  },

  prompt: {
    background: '#FFF5F2', // Very light coral tint
    border: palette.coral[100],
    label: palette.coral[700],
  },

  tabBar: {
    background: palette.neutral[0],
    active: palette.coral[500],
    inactive: palette.neutral[400],
    border: palette.neutral[150],
  },
};

// Dark theme
export const darkTheme = {
  // Backgrounds
  background: {
    primary: palette.neutral[900],
    secondary: palette.neutral[800],
    tertiary: palette.neutral[700],
    elevated: palette.neutral[800],
  },

  // Text
  text: {
    primary: palette.neutral[50],
    secondary: palette.neutral[300],
    tertiary: palette.neutral[400],
    inverse: palette.neutral[900],
    link: palette.coral[400],
  },

  // Interactive
  interactive: {
    primary: palette.coral[400],
    primaryHover: palette.coral[500],
    primaryPressed: palette.coral[600],
    primaryDisabled: palette.neutral[700],
    secondary: palette.teal[400],
    secondaryHover: palette.teal[500],
  },

  // Borders
  border: {
    light: palette.neutral[800],
    DEFAULT: palette.neutral[700],
    strong: palette.neutral[600],
    focus: palette.coral[400],
  },

  // Status
  status: {
    success: palette.success.DEFAULT,
    successBg: 'rgba(46, 139, 87, 0.15)',
    warning: palette.warning.DEFAULT,
    warningBg: 'rgba(230, 149, 0, 0.15)',
    error: palette.error.DEFAULT,
    errorBg: 'rgba(211, 47, 47, 0.15)',
    pending: palette.gold[400],
    pendingBg: 'rgba(245, 166, 35, 0.15)',
  },

  // Components
  card: {
    background: palette.neutral[800],
    backgroundAlt: palette.neutral[700],
    border: palette.neutral[700],
    shadow: 'rgba(0, 0, 0, 0.4)',
  },

  prompt: {
    background: 'rgba(240, 80, 48, 0.1)',
    border: palette.coral[800],
    label: palette.coral[300],
  },

  tabBar: {
    background: palette.neutral[900],
    active: palette.coral[400],
    inactive: palette.neutral[500],
    border: palette.neutral[800],
  },
};

export type ThemeColors = typeof lightTheme;
