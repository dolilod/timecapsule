import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

type BadgeVariant = 'pending' | 'sending' | 'success' | 'error' | 'info';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant: BadgeVariant;
  label: string;
  size?: BadgeSize;
}

export function Badge({ variant, label, size = 'md' }: BadgeProps) {
  const { colors, typography, borderRadius } = useTheme();

  const getVariantColors = () => {
    switch (variant) {
      case 'pending':
        return { bg: colors.status.pendingBg, text: colors.status.pending };
      case 'sending':
        return { bg: colors.status.pendingBg, text: colors.interactive.primary };
      case 'success':
        return { bg: colors.status.successBg, text: colors.status.success };
      case 'error':
        return { bg: colors.status.errorBg, text: colors.status.error };
      case 'info':
        return { bg: colors.background.tertiary, text: colors.text.secondary };
    }
  };

  const variantColors = getVariantColors();
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: variantColors.bg,
          borderRadius: borderRadius.sm,
          paddingHorizontal: isSmall ? 6 : 10,
          paddingVertical: isSmall ? 2 : 4,
        },
      ]}
    >
      <Text
        style={[
          isSmall ? typography.styles.labelSmall : typography.styles.label,
          { color: variantColors.text },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
  },
});
