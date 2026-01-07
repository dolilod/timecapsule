import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useTheme } from '@/hooks/useTheme';

interface PromptCardProps {
  promptText: string;
  onRefresh: () => void;
}

export function PromptCard({ promptText, onRefresh }: PromptCardProps) {
  const { colors, typography, componentRadius, spacing } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.prompt.background,
          borderRadius: componentRadius.card,
          padding: spacing[5], // Increased padding
          borderColor: colors.prompt.border,
          borderWidth: 1,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <FontAwesome name="lightbulb-o" size={14} color={colors.prompt.label} />
          <Text
            style={[
              typography.styles.labelSmall,
              { color: colors.prompt.label },
            ]}
          >
            TODAY'S PROMPT
          </Text>
        </View>
        <TouchableOpacity
          onPress={onRefresh}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <FontAwesome name="refresh" size={14} color={colors.prompt.label} />
        </TouchableOpacity>
      </View>
      <Text
        style={[
          typography.styles.bodyLarge, // Increased size
          {
            color: colors.text.primary,
            marginTop: spacing[3],
            lineHeight: 24,
          },
        ]}
      >
        {promptText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
});
