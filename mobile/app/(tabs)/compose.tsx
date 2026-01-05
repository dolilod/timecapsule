import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { Text, View } from '@/components/Themed';
import { getDefaultChild, calculateDayNumber, calculateAge } from '@/services/storage';
import { ChildProfile } from '@/types';

export default function ComposeScreen() {
  const [child, setChild] = useState<ChildProfile | null>(null);

  const loadChild = useCallback(async () => {
    const defaultChild = await getDefaultChild();
    setChild(defaultChild);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadChild();
    }, [loadChild])
  );

  if (!child) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  const dayNumber = calculateDayNumber(child.birthday);
  const age = calculateAge(child.birthday);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.dayText}>Day {dayNumber}</Text>
        <Text style={styles.childInfo}>
          {child.name} • {age}
        </Text>
      </View>

      <View style={styles.promptCard}>
        <Text style={styles.promptLabel}>Today's Prompt</Text>
        <Text style={styles.promptText}>
          What made them smile today? (1 sentence)
        </Text>
      </View>

      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Compose functionality coming in Task B
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  loading: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  header: {
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  dayText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  childInfo: {
    fontSize: 16,
    opacity: 0.7,
  },
  promptCard: {
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  promptLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  promptText: {
    fontSize: 18,
    lineHeight: 26,
    color: '#333',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  placeholderText: {
    fontSize: 14,
    opacity: 0.5,
    textAlign: 'center',
  },
});
