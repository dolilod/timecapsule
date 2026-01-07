import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

type IconButtonVariant = 'default' | 'primary' | 'destructive';
type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  disabled?: boolean;
  style?: ViewStyle;
}

export function IconButton({
  icon,
  onPress,
  variant = 'default',
  size = 'md',
  disabled = false,
  style,
}: IconButtonProps) {
  const { colors, borderRadius } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'default':
        return { backgroundColor: colors.background.tertiary };
      case 'primary':
        return { backgroundColor: colors.interactive.primary };
      case 'destructive':
        return { backgroundColor: colors.status.errorBg };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { width: 32, height: 32 };
      case 'md':
        return { width: 40, height: 40 };
      case 'lg':
        return { width: 48, height: 48 };
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.container,
        { borderRadius: borderRadius.DEFAULT },
        getVariantStyles(),
        getSizeStyles(),
        disabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.7}
    >
      {icon}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
