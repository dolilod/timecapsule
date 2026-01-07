import { useColorScheme } from '@/components/useColorScheme';
import { lightTheme, darkTheme, ThemeColors } from '@/constants/theme/colors';
import { textStyles, fontSize, fontWeight } from '@/constants/theme/typography';
import { spacing, borderRadius, componentSpacing, componentRadius } from '@/constants/theme/spacing';

export interface Theme {
  colors: ThemeColors;
  typography: {
    styles: typeof textStyles;
    fontSize: typeof fontSize;
    fontWeight: typeof fontWeight;
  };
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  componentSpacing: typeof componentSpacing;
  componentRadius: typeof componentRadius;
  isDark: boolean;
}

export function useTheme(): Theme {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = colorScheme === 'dark' ? darkTheme : lightTheme;

  return {
    colors,
    typography: {
      styles: textStyles,
      fontSize,
      fontWeight,
    },
    spacing,
    borderRadius,
    componentSpacing,
    componentRadius,
    isDark: colorScheme === 'dark',
  };
}
