import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  Dimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

import { useTheme } from '@/hooks/useTheme';
import { Button, PromptCard, StatusIndicator, Banner, useToast } from '@/components/ui';
import { useNetwork } from '@/hooks/useNetwork';
import { getDefaultChild, calculateDayNumber, calculateAge } from '@/services/storage';
import {
  getRandomPromptForAge,
  getNextPromptInBucket,
  Prompt,
} from '@/services/prompts';
import { isGmailConnected, sendEmail } from '@/services/gmail';
import { addToOutbox } from '@/services/outbox';
import { ChildProfile, CapsuleEntry } from '@/types';

export default function ComposeScreen() {
  const router = useRouter();
  const { colors, typography, spacing, componentRadius } = useTheme();

  const [child, setChild] = useState<ChildProfile | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showQueued, setShowQueued] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const { isOnline } = useNetwork();
  const toast = useToast();

  const MAX_ATTACHMENTS = 5;
  const MAX_TOTAL_BYTES = 20 * 1024 * 1024; // ~20 MB safety limit

  const movePhoto = (fromIndex: number, toIndex: number) => {
    setPhotos((prev) => {
      if (toIndex < 0 || toIndex >= prev.length || fromIndex === toIndex) return prev;
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  };

  const loadData = useCallback(async () => {
    const defaultChild = await getDefaultChild();
    setChild(defaultChild);

    if (defaultChild) {
      const dayNumber = calculateDayNumber(defaultChild.birthday);
      const randomPrompt = await getRandomPromptForAge(dayNumber);
      setPrompt(randomPrompt);
    }

    const connected = await isGmailConnected();
    setGmailConnected(connected);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!child) {
        loadData();
      } else {
        isGmailConnected().then(setGmailConnected);
      }
    }, [child, loadData])
  );

  const handleRefreshPrompt = async () => {
    if (!child || !prompt) return;
    const dayNumber = calculateDayNumber(child.birthday);
    const nextPrompt = await getNextPromptInBucket(prompt.id, dayNumber);
    if (nextPrompt) {
      setPrompt(nextPrompt);
    }
  };

  const handlePickImage = async (useCamera: boolean) => {
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Camera permission is required to take photos.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Photo library permission is required to select photos.');
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.75,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.75,
            allowsMultipleSelection: true,
          });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotos((prev) => {
          const remaining = MAX_ATTACHMENTS - prev.length;
          const picked = result.assets.map((a) => a.uri).filter(Boolean).slice(0, Math.max(0, remaining));
          const next = [...prev, ...picked];
          if (result.assets.length > picked.length) {
            toast.error(`Maximum ${MAX_ATTACHMENTS} photos per email`);
          }
          return next;
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const canSend = text.trim().length > 0 || photos.length > 0;

  const handleSend = async () => {
    if (!canSend || !child) return;

    if (!gmailConnected) {
      Alert.alert(
        'Gmail Not Connected',
        'Please connect your Gmail account in Settings to send memories.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Go to Settings',
            onPress: () => router.push('/(tabs)/settings'),
          },
        ]
      );
      return;
    }

    setIsSending(true);

    const dayNumber = calculateDayNumber(child.birthday);
    const age = calculateAge(child.birthday);
    const dateStr = new Date().toISOString().split('T')[0];

    const subject = `Day ${dayNumber} — ${dateStr} — ${child.name}`;

    let body = `Day ${dayNumber} • Age ${age}\n\n`;
    if (text.trim()) {
      body += `${text.trim()}\n\n`;
    }
    body += '#timecapsule';

    const entry: CapsuleEntry = {
      id: uuidv4(),
      childId: child.id,
      childName: child.name,
      childEmail: child.email,
      text: text.trim() || undefined,
      photoUris: photos.length > 0 ? [...photos] : undefined,
      createdAt: new Date().toISOString(),
      status: 'sending',
      dayNumber,
      age,
      subject,
      body,
    };

    try {
      // Size guard: limit total attachments size
      const sizes = await Promise.all(
        photos.map(async (uri) => {
          try {
            const info = await FileSystem.getInfoAsync(uri);
            return info.exists && typeof info.size === 'number' ? info.size : 0;
          } catch {
            return 0;
          }
        })
      );
      let total = sizes.reduce((a, b) => a + b, 0);
      let attachUris = [...photos];
      if (total > MAX_TOTAL_BYTES) {
        // Trim from the end until under limit
        while (attachUris.length > 0 && total > MAX_TOTAL_BYTES) {
          const removed = attachUris.pop();
          const idx = photos.indexOf(removed!);
          total -= sizes[idx] || 0;
        }
        if (attachUris.length === 0) {
          Alert.alert('Attachments too large', 'Photos exceed the size limit. Please remove some or pick smaller photos.');
          setIsSending(false);
          return;
        }
        toast.error('Attachments trimmed to fit size limit');
      }
      const result = await sendEmail({
        to: child.email,
        subject,
        body,
        photoUris: attachUris.length > 0 ? attachUris : undefined,
      });

      if (result.success) {
        setIsSending(false);
        setShowSuccess(true);

        setTimeout(() => {
          setText('');
          setPhotos([]);
          setShowSuccess(false);
          loadData();
        }, 2000);
      } else {
        entry.status = 'failed';
        entry.errorMessage = result.error;
        await addToOutbox(entry);

        setIsSending(false);
        setShowQueued(true);

        setTimeout(() => {
          setText('');
          setPhotos([]);
          setShowQueued(false);
          loadData();
        }, 2000);
      }
    } catch (error) {
      entry.status = 'failed';
      entry.errorMessage = error instanceof Error ? error.message : 'Network error';
      await addToOutbox(entry);

      setIsSending(false);
      setShowQueued(true);

      setTimeout(() => {
        setText('');
        setPhotos([]);
        setShowQueued(false);
        loadData();
      }, 2000);
    }
  };

  if (!child) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <Text style={[typography.styles.body, { color: colors.text.secondary, textAlign: 'center', marginTop: 100 }]}>
          Loading...
        </Text>
      </View>
    );
  }

  const dayNumber = calculateDayNumber(child.birthday);
  const age = calculateAge(child.birthday);

  if (showSuccess) {
    return (
      <StatusIndicator
        type="success"
        title="Delivered!"
        subtitle={`Day ${dayNumber} added to ${child.name}'s capsule`}
      />
    );
  }

  if (showQueued) {
    return (
      <StatusIndicator
        type="queued"
        title="Queued"
        subtitle="Will retry when connection is restored"
        actionLabel="View Outbox"
        onAction={() => {
          setShowQueued(false);
          router.push('/(tabs)/outbox');
        }}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Offline Banner */}
        {!isOnline && (
          <Banner variant="warning" message="You're offline — sends will queue" style={{ marginBottom: 12 }} />
        )}

        {/* Gmail Warning Banner */}
        {!gmailConnected && (
          <TouchableOpacity
            style={[
              styles.gmailWarning,
              {
                backgroundColor: colors.status.warningBg,
                borderRadius: componentRadius.card,
              },
            ]}
            onPress={() => router.push('/(tabs)/settings')}
          >
            <FontAwesome name="exclamation-triangle" size={16} color={colors.status.warning} />
            <Text
              style={[
                typography.styles.label,
                { flex: 1, color: colors.status.warning },
              ]}
            >
              Connect Gmail to send memories
            </Text>
            <FontAwesome name="chevron-right" size={12} color={colors.status.warning} />
          </TouchableOpacity>
        )}

        {/* Header */}
        <View style={styles.header}>
          <Text style={[typography.styles.displayMedium, { color: colors.text.primary }]}>
            Day {dayNumber}
          </Text>
          <Text style={[typography.styles.body, { color: colors.text.secondary, marginTop: spacing[1] }]}>
            {child.name} • {age}
          </Text>
        </View>

        {/* Prompt Card */}
        {prompt && (
          <View style={{ marginBottom: spacing[5] }}>
            <PromptCard promptText={prompt.text} onRefresh={handleRefreshPrompt} />
          </View>
        )}

        {/* Text Input */}
        <View style={{ marginBottom: spacing[4] }}>
          <TextInput
            style={[
              styles.textInput,
              typography.styles.bodyLarge,
              {
                backgroundColor: colors.background.primary,
                borderColor: colors.border.DEFAULT,
                borderRadius: componentRadius.input,
                color: colors.text.primary,
              },
            ]}
            value={text}
            onChangeText={setText}
            placeholder="Write a message (optional if adding photo)"
            placeholderTextColor={colors.text.tertiary}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Photos Grid Preview with Reorder/Remove */}
        {photos.length > 0 && (() => {
          const columns = 3;
          const gap = 12;
          const horizontalPadding = 20; // matches scrollContent padding
          const totalWidth = Dimensions.get('window').width;
          const itemSize = Math.floor((totalWidth - horizontalPadding * 2 - gap * (columns - 1)) / columns);
          return (
            <View style={{ marginBottom: spacing[4] }}>
              <View style={[styles.gridContainer, { marginHorizontal: 0 }]}>
                {photos.map((uri, index) => (
                  <View
                    key={uri}
                    style={[
                      styles.gridItem,
                      {
                        width: itemSize,
                        height: itemSize,
                        marginRight: (index % columns) === columns - 1 ? 0 : gap,
                        marginBottom: gap,
                      },
                    ]}
                  >
                    <Image
                      source={{ uri }}
                      style={{ width: '100%', height: '100%', borderRadius: componentRadius.photo }}
                    />

                    {/* Position badge */}
                    <View style={[styles.badge, { backgroundColor: colors.card.backgroundAlt }]}> 
                      <Text style={[typography.styles.bodySmall, { color: colors.text.primary }]}>{index + 1}</Text>
                    </View>

                    {/* Remove button */}
                    <TouchableOpacity
                      accessibilityLabel={`Remove photo ${index + 1}`}
                      style={[styles.removeBtn]}
                      onPress={() => handleRemovePhoto(index)}
                    >
                      <FontAwesome name="times-circle" size={22} color={colors.status.error} />
                    </TouchableOpacity>

                    {/* Reorder controls */}
                    {photos.length > 1 && (
                      <View style={styles.reorderRow}>
                        <TouchableOpacity
                          accessibilityLabel={`Move photo ${index + 1} left`}
                          disabled={index === 0}
                          onPress={() => movePhoto(index, index - 1)}
                          style={[styles.reorderBtn, { opacity: index === 0 ? 0.4 : 1 }]}
                        >
                          <FontAwesome name="chevron-left" size={16} color={colors.text.inverse} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          accessibilityLabel={`Move photo ${index + 1} right`}
                          disabled={index === photos.length - 1}
                          onPress={() => movePhoto(index, index + 1)}
                          style={[styles.reorderBtn, { opacity: index === photos.length - 1 ? 0.4 : 1 }]}
                        >
                          <FontAwesome name="chevron-right" size={16} color={colors.text.inverse} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          );
        })()}

        {/* Media Buttons */}
        <View style={styles.mediaButtons}>
          <TouchableOpacity
            style={[
              styles.mediaButton,
              {
                backgroundColor: colors.card.backgroundAlt,
                borderRadius: componentRadius.button,
              },
            ]}
            onPress={() => handlePickImage(true)}
          >
            <FontAwesome name="camera" size={20} color={colors.interactive.primary} />
            <Text style={[typography.styles.button, { color: colors.interactive.primary }]}>
              Camera
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.mediaButton,
              {
                backgroundColor: colors.card.backgroundAlt,
                borderRadius: componentRadius.button,
              },
            ]}
            onPress={() => handlePickImage(false)}
          >
            <FontAwesome name="image" size={20} color={colors.interactive.primary} />
            <Text style={[typography.styles.button, { color: colors.interactive.primary }]}>
              Library
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Footer with Send Button */}
      <View style={[styles.footer, { backgroundColor: colors.background.primary }]}>
        <Button
          title={isSending ? 'Sending...' : 'Send'}
          onPress={handleSend}
          size="lg"
          fullWidth
          disabled={!canSend || isSending}
          loading={isSending}
          icon={
            !isSending ? (
              <FontAwesome name="paper-plane" size={18} color={colors.text.inverse} />
            ) : undefined
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  gmailWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  header: {
    marginBottom: 20,
  },
  textInput: {
    borderWidth: 1,
    padding: 16,
    minHeight: 100,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    borderRadius: 12,
  },
  reorderRow: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    gap: 6,
  },
  reorderBtn: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  mediaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 34,
  },
});
