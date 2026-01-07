import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

type CardVariant = 'default' | 'elevated' | 'outlined';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  style?: ViewStyle;
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  style,
}: CardProps) {
  const { colors, componentRadius, componentSpacing } = useTheme();

  const getPadding = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'sm':
        return 12;
      case 'md':
        return componentSpacing.cardPadding;
      case 'lg':
        return componentSpacing.cardPaddingLarge;
    }
  };

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'default':
        return { backgroundColor: colors.card.backgroundAlt };
      case 'elevated':
        return {
          backgroundColor: colors.card.background,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        };
      case 'outlined':
        return {
          backgroundColor: colors.card.background,
          borderWidth: 1,
          borderColor: colors.card.border,
        };
    }
  };

  return (
    <View
      style={[
        styles.container,
        { borderRadius: componentRadius.card, padding: getPadding() },
        getVariantStyles(),
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
