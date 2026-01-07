import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'right',
  fullWidth = false,
  style,
}: ButtonProps) {
  const { colors, typography, componentRadius } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          container: {
            backgroundColor: disabled
              ? colors.interactive.primaryDisabled
              : colors.interactive.primary,
          },
          text: { color: colors.text.inverse },
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: colors.background.tertiary,
            borderWidth: 1,
            borderColor: colors.border.DEFAULT,
          },
          text: { color: colors.text.primary },
        };
      case 'ghost':
        return {
          container: { backgroundColor: 'transparent' },
          text: { color: colors.interactive.primary },
        };
      case 'destructive':
        return {
          container: { backgroundColor: colors.status.error },
          text: { color: colors.text.inverse },
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          container: { paddingVertical: 10, paddingHorizontal: 16 },
          text: typography.styles.buttonSmall,
        };
      case 'md':
        return {
          container: { paddingVertical: 14, paddingHorizontal: 20 },
          text: typography.styles.button,
        };
      case 'lg':
        return {
          container: { paddingVertical: 18, paddingHorizontal: 24 },
          text: typography.styles.buttonLarge,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.container,
        { borderRadius: componentRadius.button },
        variantStyles.container,
        sizeStyles.container,
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.text.color} />
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          <Text
            style={[
              sizeStyles.text,
              variantStyles.text,
              icon ? styles.textWithIcon : undefined,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
  textWithIcon: {
    marginHorizontal: 4,
  },
});
