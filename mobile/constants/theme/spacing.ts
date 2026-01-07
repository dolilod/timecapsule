// 4px base unit system
export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

export const borderRadius = {
  none: 0,
  sm: 4,
  DEFAULT: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

// Component-specific semantic spacing
export const componentSpacing = {
  screenPadding: spacing[5],
  cardPadding: spacing[4],
  cardPaddingLarge: spacing[5],
  buttonPadding: spacing[4],
  buttonPaddingHorizontal: spacing[6],
  inputPadding: spacing[4],
  gap: {
    xs: spacing[1],
    sm: spacing[2],
    md: spacing[3],
    lg: spacing[4],
    xl: spacing[6],
  },
};

export const componentRadius = {
  button: borderRadius.md,
  card: borderRadius.md,
  input: borderRadius.md,
  badge: borderRadius.sm,
  photo: borderRadius.DEFAULT,
  avatar: borderRadius.full,
};
