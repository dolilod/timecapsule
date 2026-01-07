import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useTheme } from '@/hooks/useTheme';

type StatusType = 'success' | 'queued' | 'error';

interface StatusIndicatorProps {
  type: StatusType;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function StatusIndicator({
  type,
  title,
  subtitle,
  actionLabel,
  onAction,
}: StatusIndicatorProps) {
  const { colors, typography, spacing, componentRadius } = useTheme();

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return { icon: 'check-circle' as const, color: colors.status.success };
      case 'queued':
        return { icon: 'clock-o' as const, color: colors.status.pending };
      case 'error':
        return { icon: 'exclamation-circle' as const, color: colors.status.error };
    }
  };

  const config = getTypeConfig();

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <FontAwesome name={config.icon} size={72} color={config.color} />
      <Text
        style={[
          typography.styles.h1,
          { color: colors.text.primary, marginTop: spacing[5] },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          typography.styles.body,
          {
            color: colors.text.secondary,
            marginTop: spacing[2],
            textAlign: 'center',
          },
        ]}
      >
        {subtitle}
      </Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          style={[
            styles.actionButton,
            {
              backgroundColor: colors.background.tertiary,
              borderRadius: componentRadius.button,
              marginTop: spacing[6],
            },
          ]}
        >
          <Text
            style={[typography.styles.button, { color: colors.interactive.primary }]}
          >
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
});
