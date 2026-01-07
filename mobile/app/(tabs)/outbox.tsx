import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  View,
  Text,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';

import { useTheme } from '@/hooks/useTheme';
import { Card, Badge, Button, IconButton, Banner, useToast } from '@/components/ui';
import { useNetwork } from '@/hooks/useNetwork';
import {
  getOutboxEntries,
  retrySendEntry,
  removeFromOutbox,
  getInvalidPhotoUris,
  updatePhotoUri,
} from '@/services/outbox';
import { CapsuleEntry } from '@/types';

export default function OutboxScreen() {
  const { colors, typography, spacing, componentRadius } = useTheme();

  const [entries, setEntries] = useState<CapsuleEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const { isOnline } = useNetwork();
  const toast = useToast();

  const loadEntries = useCallback(async () => {
    const outboxEntries = await getOutboxEntries();
    outboxEntries.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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
      toast.success('Email sent successfully');
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

  const getBadgeVariant = (status: CapsuleEntry['status']): 'pending' | 'sending' | 'error' | 'success' => {
    switch (status) {
      case 'pending':
        return 'pending';
      case 'sending':
        return 'sending';
      case 'failed':
        return 'error';
      case 'sent':
        return 'success';
      default:
        return 'pending';
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
      <View style={[styles.emptyContainer, { backgroundColor: colors.background.primary }]}>
        <FontAwesome name="check-circle" size={64} color={colors.status.success} />
        <Text style={[typography.styles.h1, { color: colors.text.primary, marginTop: spacing[5] }]}>
          All Caught Up!
        </Text>
        <Text style={[typography.styles.body, { color: colors.text.secondary, marginTop: spacing[2], textAlign: 'center' }]}>
          No pending entries in your outbox
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.interactive.primary}
        />
      }
    >
      {!isOnline && (
        <Banner variant="warning" message="You're offline — queued items will retry automatically" style={{ marginBottom: spacing[3] }} />
      )}
      <Text style={[typography.styles.bodySmall, { color: colors.text.secondary, marginBottom: spacing[4] }]}>
        {entries.length} pending {entries.length === 1 ? 'entry' : 'entries'}
      </Text>

      {entries.map((entry) => (
        <Card key={entry.id} variant="default" style={{ marginBottom: spacing[3] }}>
          {/* Header Row */}
          <View style={styles.entryHeader}>
            <View style={styles.entryTitleRow}>
              <Text style={[typography.styles.h3, { color: colors.text.primary }]}>
                Day {entry.dayNumber}
              </Text>
              <Badge variant={getBadgeVariant(entry.status)} label={getStatusText(entry.status)} />
            </View>
            <Text style={[typography.styles.bodySmall, { color: colors.text.secondary, marginTop: spacing[1] }]}>
              {entry.childName} • {formatDate(entry.createdAt)}
            </Text>
          </View>

          {/* Message Preview */}
          {entry.text && (
            <Text
              style={[typography.styles.body, { color: colors.text.primary, marginTop: spacing[2] }]}
              numberOfLines={2}
            >
              {entry.text}
            </Text>
          )}

          {/* Photo Indicator */}
          {entry.photoUris && entry.photoUris.length > 0 && (
            <View style={[styles.photoPreview, { marginTop: spacing[2] }]}>
              <FontAwesome name="image" size={14} color={colors.text.secondary} />
              <Text style={[typography.styles.bodySmall, { color: colors.text.secondary }]}>
                {entry.photoUris.length} photo{entry.photoUris.length > 1 ? 's' : ''}
              </Text>
            </View>
          )}

          {/* Error Message */}
          {entry.errorMessage && (
            <Text style={[typography.styles.bodySmall, { color: colors.status.error, marginTop: spacing[2] }]}>
              {entry.errorMessage}
            </Text>
          )}

          {/* Action Buttons */}
          <View style={[styles.entryActions, { marginTop: spacing[3] }]}>
            <Button
              title={retryingId === entry.id ? 'Sending...' : 'Retry'}
              onPress={() => handleRetry(entry)}
              size="sm"
              disabled={retryingId === entry.id || entry.status === 'sending'}
              loading={retryingId === entry.id}
              icon={
                retryingId !== entry.id ? (
                  <FontAwesome name="refresh" size={14} color={colors.text.inverse} />
                ) : undefined
              }
              iconPosition="left"
            />

            <IconButton
              icon={<FontAwesome name="trash-o" size={16} color={colors.status.error} />}
              onPress={() => handleDelete(entry)}
              variant="destructive"
              size="sm"
            />
          </View>
        </Card>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  entryHeader: {},
  entryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  entryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
