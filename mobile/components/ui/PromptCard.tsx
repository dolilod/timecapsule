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
          padding: spacing[4],
        },
      ]}
    >
      <View style={styles.header}>
        <Text
          style={[
            typography.styles.labelSmall,
            { color: colors.prompt.label, textTransform: 'uppercase' },
          ]}
        >
          TODAY'S PROMPT
        </Text>
        <TouchableOpacity
          onPress={onRefresh}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <FontAwesome name="refresh" size={16} color={colors.prompt.label} />
        </TouchableOpacity>
      </View>
      <Text
        style={[
          typography.styles.body,
          { color: colors.text.primary, marginTop: spacing[2] },
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
  },
});
