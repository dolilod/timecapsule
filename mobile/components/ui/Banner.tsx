import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useTheme } from '@/hooks/useTheme';

type Variant = 'info' | 'warning' | 'error' | 'success';

export function Banner({
  variant = 'info',
  message,
  style,
}: {
  variant?: Variant;
  message: string;
  style?: ViewStyle;
}) {
  const { colors, typography, componentRadius, spacing } = useTheme();

  const palette = {
    info: { bg: colors.card.backgroundAlt, fg: colors.text.secondary, icon: 'info-circle' as const },
    warning: { bg: colors.status.warningBg, fg: colors.status.warning, icon: 'exclamation-triangle' as const },
    error: { bg: colors.status.errorBg, fg: colors.status.error, icon: 'exclamation-circle' as const },
    success: { bg: colors.status.successBg, fg: colors.status.success, icon: 'check-circle' as const },
  }[variant];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.bg, borderRadius: componentRadius.card, padding: spacing[3] },
        style,
      ]}
    >
      <FontAwesome name={palette.icon} size={16} color={palette.fg} />
      <Text style={[typography.styles.label, { color: palette.fg, marginLeft: spacing[2], flex: 1 }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

