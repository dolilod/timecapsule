// Warm, family-friendly color palette
export const palette = {
  // Primary - Warm Coral (kid-friendly, energetic)
  coral: {
    50: '#FFF5F3',
    100: '#FFE8E3',
    200: '#FFCFC5',
    300: '#FFB0A0',
    400: '#FF8A75',
    500: '#FF6B50',
    600: '#E85A42',
    700: '#C44835',
    800: '#A03828',
    900: '#7C2A1D',
  },

  // Secondary - Soft Teal (calming, trustworthy)
  teal: {
    50: '#F0FDFB',
    100: '#CCFBF1',
    200: '#99F6E4',
    300: '#5EEAD4',
    400: '#2DD4BF',
    500: '#14B8A6',
    600: '#0D9488',
    700: '#0F766E',
    800: '#115E59',
    900: '#134E4A',
  },

  // Accent - Warm Gold (memories, precious moments)
  gold: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  // Neutrals - Warm gray tones
  neutral: {
    0: '#FFFFFF',
    50: '#FAFAF9',
    100: '#F5F5F4',
    150: '#EFEEEC',
    200: '#E7E5E4',
    300: '#D6D3D1',
    400: '#A8A29E',
    500: '#78716C',
    600: '#57534E',
    700: '#44403C',
    800: '#292524',
    900: '#1C1917',
    1000: '#000000',
  },

  // Semantic colors
  success: {
    light: '#D1FAE5',
    DEFAULT: '#10B981',
    dark: '#047857',
  },
  warning: {
    light: '#FEF3C7',
    DEFAULT: '#F59E0B',
    dark: '#B45309',
  },
  error: {
    light: '#FEE2E2',
    DEFAULT: '#EF4444',
    dark: '#B91C1C',
  },
  info: {
    light: '#DBEAFE',
    DEFAULT: '#3B82F6',
    dark: '#1D4ED8',
  },
};

// Light theme
export const lightTheme = {
  // Backgrounds
  background: {
    primary: palette.neutral[0],
    secondary: palette.neutral[50],
    tertiary: palette.neutral[100],
    elevated: palette.neutral[0],
  },

  // Text
  text: {
    primary: palette.neutral[900],
    secondary: palette.neutral[600],
    tertiary: palette.neutral[500],
    inverse: palette.neutral[0],
    link: palette.coral[500],
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
    light: palette.neutral[200],
    DEFAULT: palette.neutral[300],
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
    backgroundAlt: palette.neutral[100],
    border: palette.neutral[200],
    shadow: 'rgba(0, 0, 0, 0.05)',
  },

  prompt: {
    background: palette.coral[50],
    border: palette.coral[200],
    label: palette.coral[600],
  },

  tabBar: {
    background: palette.neutral[0],
    active: palette.coral[500],
    inactive: palette.neutral[400],
    border: palette.neutral[200],
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
    primaryDisabled: palette.neutral[600],
    secondary: palette.teal[400],
    secondaryHover: palette.teal[500],
  },

  // Borders
  border: {
    light: palette.neutral[700],
    DEFAULT: palette.neutral[600],
    strong: palette.neutral[500],
    focus: palette.coral[400],
  },

  // Status
  status: {
    success: palette.success.DEFAULT,
    successBg: 'rgba(16, 185, 129, 0.15)',
    warning: palette.warning.DEFAULT,
    warningBg: 'rgba(245, 158, 11, 0.15)',
    error: palette.error.DEFAULT,
    errorBg: 'rgba(239, 68, 68, 0.15)',
    pending: palette.gold[400],
    pendingBg: 'rgba(245, 158, 11, 0.15)',
  },

  // Components
  card: {
    background: palette.neutral[800],
    backgroundAlt: palette.neutral[700],
    border: palette.neutral[600],
    shadow: 'rgba(0, 0, 0, 0.3)',
  },

  prompt: {
    background: 'rgba(255, 107, 80, 0.1)',
    border: palette.coral[700],
    label: palette.coral[400],
  },

  tabBar: {
    background: palette.neutral[900],
    active: palette.coral[400],
    inactive: palette.neutral[500],
    border: palette.neutral[700],
  },
};

export type ThemeColors = typeof lightTheme;
