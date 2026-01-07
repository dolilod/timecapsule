import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface InputProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
}

export function Input({
  label,
  hint,
  error,
  multiline,
  style,
  ...props
}: InputProps) {
  const { colors, typography, componentRadius, spacing } = useTheme();

  return (
    <View style={styles.container}>
      {label && (
        <Text
          style={[
            typography.styles.label,
            { color: colors.text.primary, marginBottom: spacing[2] },
          ]}
        >
          {label}
        </Text>
      )}
      {hint && (
        <Text
          style={[
            typography.styles.bodySmall,
            { color: colors.text.tertiary, marginBottom: spacing[2] },
          ]}
        >
          {hint}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          typography.styles.bodyLarge,
          {
            backgroundColor: colors.background.primary,
            borderColor: error ? colors.status.error : colors.border.DEFAULT,
            borderRadius: componentRadius.input,
            color: colors.text.primary,
            minHeight: multiline ? 100 : undefined,
          },
          style,
        ]}
        placeholderTextColor={colors.text.tertiary}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
      />
      {error && (
        <Text
          style={[
            typography.styles.bodySmall,
            { color: colors.status.error, marginTop: spacing[1] },
          ]}
        >
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    padding: 16,
  },
});
