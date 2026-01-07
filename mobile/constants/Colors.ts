import { lightTheme, darkTheme } from './theme/colors';

// Legacy exports for backward compatibility
const tintColorLight = lightTheme.tabBar.active;
const tintColorDark = darkTheme.tabBar.active;

export default {
  light: {
    text: lightTheme.text.primary,
    background: lightTheme.background.primary,
    tint: tintColorLight,
    tabIconDefault: lightTheme.tabBar.inactive,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: darkTheme.text.primary,
    background: darkTheme.background.primary,
    tint: tintColorDark,
    tabIconDefault: darkTheme.tabBar.inactive,
    tabIconSelected: tintColorDark,
  },
};

// Re-export new theme for direct usage
export { lightTheme, darkTheme } from './theme/colors';
