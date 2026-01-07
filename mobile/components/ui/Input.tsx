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

  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <View style={styles.container}>
      {label && (
        <Text
          style={[
            typography.styles.label,
            { color: colors.text.secondary, marginBottom: spacing[2], marginLeft: 2 },
          ]}
        >
          {label}
        </Text>
      )}
      {hint && (
        <Text
          style={[
            typography.styles.bodySmall,
            { color: colors.text.tertiary, marginBottom: spacing[2], marginLeft: 2 },
          ]}
        >
          {hint}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          typography.styles.body,
          {
            backgroundColor: colors.background.secondary, // Slightly darker than primary
            borderColor: error
              ? colors.status.error
              : isFocused
                ? colors.border.focus
                : colors.border.DEFAULT,
            borderWidth: isFocused ? 1.5 : 1,
            borderRadius: componentRadius.input,
            color: colors.text.primary,
            minHeight: multiline ? 120 : undefined,
            paddingTop: multiline ? 16 : 16, // Ensure text starts at top for multiline
          },
          style,
        ]}
        placeholderTextColor={colors.text.tertiary}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      {error && (
        <Text
          style={[
            typography.styles.bodySmall,
            { color: colors.status.error, marginTop: spacing[1], marginLeft: 2 },
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
    marginBottom: 20,
  },
  input: {
    padding: 16,
  },
});
