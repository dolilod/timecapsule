import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';

import { Text, View } from '@/components/Themed';
import {
  getOutboxEntries,
  retrySendEntry,
  removeFromOutbox,
  getInvalidPhotoUris,
  updatePhotoUri,
} from '@/services/outbox';
import { CapsuleEntry } from '@/types';

export default function OutboxScreen() {
  const [entries, setEntries] = useState<CapsuleEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    const outboxEntries = await getOutboxEntries();
    // Sort by createdAt descending (newest first)
    outboxEntries.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setEntries(outboxEntries);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEntries();
    setRefreshing(false);
  };

  const handleRetry = async (entry: CapsuleEntry) => {
    // First check for expired photos
    const invalidUris = await getInvalidPhotoUris(entry);
    if (invalidUris.length > 0) {
      Alert.alert(
        'Photo Expired',
        'The photo attached to this entry is no longer available. Would you like to select a new photo?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Select New Photo',
            onPress: () => handleRepickPhoto(entry, invalidUris[0]),
          },
          {
            text: 'Remove Photo & Retry',
            onPress: async () => {
              // Remove photo and retry
              entry.photoUris = undefined;
              await retrySendEntry(entry);
              await loadEntries();
            },
          },
        ]
      );
      return;
    }

    setRetryingId(entry.id);

    const result = await retrySendEntry(entry);

    setRetryingId(null);

    if (result.success) {
      Alert.alert('Success', 'Email sent successfully!');
    } else {
      Alert.alert('Send Failed', result.error || 'Failed to send. Please try again.');
    }

    await loadEntries();
  };

  const handleRepickPhoto = async (entry: CapsuleEntry, expiredUri: string) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library permission is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await updatePhotoUri(entry.id, expiredUri, result.assets[0].uri);
        await loadEntries();
        Alert.alert('Photo Updated', 'You can now retry sending this entry.');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleDelete = (entry: CapsuleEntry) => {
    Alert.alert(
      'Delete Entry',
      `Are you sure you want to delete this entry for Day ${entry.dayNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removeFromOutbox(entry.id);
            await loadEntries();
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: CapsuleEntry['status']) => {
    switch (status) {
      case 'pending':
        return '#FF9500';
      case 'sending':
        return '#007AFF';
      case 'failed':
        return '#FF3B30';
      case 'sent':
        return '#34C759';
      default:
        return '#999';
    }
  };

  const getStatusText = (status: CapsuleEntry['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'sending':
        return 'Sending...';
      case 'failed':
        return 'Failed';
      case 'sent':
        return 'Sent';
      default:
        return status;
    }
  };

  if (entries.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <FontAwesome name="check-circle" size={64} color="#34C759" />
        <Text style={styles.emptyTitle}>All Caught Up!</Text>
        <Text style={styles.emptySubtitle}>
          No pending entries in your outbox
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.header}>
        {entries.length} pending {entries.length === 1 ? 'entry' : 'entries'}
      </Text>

      {entries.map((entry) => (
        <View key={entry.id} style={styles.entryCard}>
          <View style={styles.entryHeader}>
            <View style={styles.entryTitleRow}>
              <Text style={styles.entryTitle}>Day {entry.dayNumber}</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(entry.status) + '20' },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(entry.status) },
                  ]}
                >
                  {getStatusText(entry.status)}
                </Text>
              </View>
            </View>
            <Text style={styles.entryMeta}>
              {entry.childName} • {formatDate(entry.createdAt)}
            </Text>
          </View>

          {entry.text && (
            <Text style={styles.entryText} numberOfLines={2}>
              {entry.text}
            </Text>
          )}

          {entry.photoUris && entry.photoUris.length > 0 && (
            <View style={styles.photoPreview}>
              <FontAwesome name="image" size={14} color="#666" />
              <Text style={styles.photoText}>
                {entry.photoUris.length} photo{entry.photoUris.length > 1 ? 's' : ''}
              </Text>
            </View>
          )}

          {entry.errorMessage && (
            <Text style={styles.errorText}>{entry.errorMessage}</Text>
          )}

          <View style={styles.entryActions}>
            <TouchableOpacity
              style={[
                styles.retryButton,
                retryingId === entry.id && styles.retryButtonDisabled,
              ]}
              onPress={() => handleRetry(entry)}
              disabled={retryingId === entry.id || entry.status === 'sending'}
            >
              {retryingId === entry.id ? (
                <Text style={styles.retryButtonText}>Sending...</Text>
              ) : (
                <>
                  <FontAwesome name="refresh" size={14} color="#fff" />
                  <Text style={styles.retryButtonText}>Retry</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(entry)}
            >
              <FontAwesome name="trash-o" size={16} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: 'center',
  },
  entryCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  entryHeader: {
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  entryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  entryMeta: {
    fontSize: 13,
    opacity: 0.6,
  },
  entryText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 8,
    color: '#333',
  },
  photoPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  photoText: {
    fontSize: 13,
    color: '#666',
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    marginBottom: 8,
  },
  entryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  retryButtonDisabled: {
    backgroundColor: '#999',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 10,
  },
});
