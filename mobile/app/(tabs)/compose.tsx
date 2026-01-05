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
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

import { Text, View } from '@/components/Themed';
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
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showQueued, setShowQueued] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);

  const loadData = useCallback(async () => {
    const defaultChild = await getDefaultChild();
    setChild(defaultChild);

    if (defaultChild) {
      const dayNumber = calculateDayNumber(defaultChild.birthday);
      const randomPrompt = await getRandomPromptForAge(dayNumber);
      setPrompt(randomPrompt);
    }

    // Check Gmail connection status
    const connected = await isGmailConnected();
    setGmailConnected(connected);
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Load data if we don't have it yet
      if (!child) {
        loadData();
      } else {
        // Always check Gmail status when screen is focused
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
      // Request permissions
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
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
          });

      if (!result.canceled && result.assets[0]) {
        setPhotos((prev) => [...prev, result.assets[0].uri]);
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

    // Check if Gmail is connected
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

    // Format email per SPEC.md
    // Subject: Day {N} — {YYYY-MM-DD} — {ChildName}
    const subject = `Day ${dayNumber} — ${dateStr} — ${child.name}`;

    // Body:
    // Day {N} • Age {X years, Y months}
    // {User's message text}
    // #timecapsule
    let body = `Day ${dayNumber} • Age ${age}\n\n`;
    if (text.trim()) {
      body += `${text.trim()}\n\n`;
    }
    body += '#timecapsule';

    // Create capsule entry for potential outbox queueing
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
      const result = await sendEmail({
        to: child.email,
        subject,
        body,
        photoUri: photos.length > 0 ? photos[0] : undefined,
      });

      if (result.success) {
        setIsSending(false);
        setShowSuccess(true);

        // Reset form after showing success
        setTimeout(() => {
          setText('');
          setPhotos([]);
          setShowSuccess(false);
          loadData();
        }, 2000);
      } else {
        // Queue to outbox on failure
        entry.status = 'failed';
        entry.errorMessage = result.error;
        await addToOutbox(entry);

        setIsSending(false);
        setShowQueued(true);

        // Reset form after showing queued
        setTimeout(() => {
          setText('');
          setPhotos([]);
          setShowQueued(false);
          loadData();
        }, 2000);
      }
    } catch (error) {
      // Queue to outbox on error
      entry.status = 'failed';
      entry.errorMessage = error instanceof Error ? error.message : 'Network error';
      await addToOutbox(entry);

      setIsSending(false);
      setShowQueued(true);

      // Reset form after showing queued
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
      <View style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  const dayNumber = calculateDayNumber(child.birthday);
  const age = calculateAge(child.birthday);

  if (showSuccess) {
    return (
      <View style={styles.successContainer}>
        <FontAwesome name="check-circle" size={64} color="#34C759" />
        <Text style={styles.successTitle}>Delivered!</Text>
        <Text style={styles.successSubtitle}>Day {dayNumber} added to {child.name}'s capsule</Text>
      </View>
    );
  }

  if (showQueued) {
    return (
      <View style={styles.successContainer}>
        <FontAwesome name="clock-o" size={64} color="#FF9500" />
        <Text style={styles.successTitle}>Queued</Text>
        <Text style={styles.successSubtitle}>
          Will retry when connection is restored
        </Text>
        <TouchableOpacity
          style={styles.viewOutboxButton}
          onPress={() => {
            setShowQueued(false);
            router.push('/(tabs)/outbox');
          }}
        >
          <Text style={styles.viewOutboxText}>View Outbox</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {!gmailConnected && (
          <TouchableOpacity
            style={styles.gmailWarning}
            onPress={() => router.push('/(tabs)/settings')}
          >
            <FontAwesome name="exclamation-triangle" size={16} color="#856404" />
            <Text style={styles.gmailWarningText}>
              Connect Gmail to send memories
            </Text>
            <FontAwesome name="chevron-right" size={12} color="#856404" />
          </TouchableOpacity>
        )}

        <View style={styles.header}>
          <Text style={styles.dayText}>Day {dayNumber}</Text>
          <Text style={styles.childInfo}>
            {child.name} • {age}
          </Text>
        </View>

        {prompt && (
          <View style={styles.promptCard}>
            <View style={styles.promptHeader}>
              <Text style={styles.promptLabel}>Today's Prompt</Text>
              <TouchableOpacity onPress={handleRefreshPrompt} style={styles.refreshButton}>
                <FontAwesome name="refresh" size={16} color="#007AFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.promptText}>{prompt.text}</Text>
          </View>
        )}

        <View style={styles.inputSection}>
          <TextInput
            style={styles.textInput}
            value={text}
            onChangeText={setText}
            placeholder="Write a message (optional if adding photo)"
            placeholderTextColor="#999"
            multiline
            textAlignVertical="top"
          />
        </View>

        {photos.length > 0 && (
          <View style={styles.photosContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {photos.map((uri, index) => (
                <View key={uri} style={styles.photoWrapper}>
                  <Image source={{ uri }} style={styles.photoPreview} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => handleRemovePhoto(index)}
                  >
                    <FontAwesome name="times-circle" size={24} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.mediaButtons}>
          <TouchableOpacity
            style={styles.mediaButton}
            onPress={() => handlePickImage(true)}
          >
            <FontAwesome name="camera" size={20} color="#007AFF" />
            <Text style={styles.mediaButtonText}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mediaButton}
            onPress={() => handlePickImage(false)}
          >
            <FontAwesome name="image" size={20} color="#007AFF" />
            <Text style={styles.mediaButtonText}>Library</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.sendButton,
            !canSend && styles.sendButtonDisabled,
            isSending && styles.sendButtonSending,
          ]}
          onPress={handleSend}
          disabled={!canSend || isSending}
        >
          <Text style={styles.sendButtonText}>
            {isSending ? 'Sending...' : 'Send'}
          </Text>
          {!isSending && <FontAwesome name="paper-plane" size={18} color="#fff" style={styles.sendIcon} />}
        </TouchableOpacity>
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
  loading: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  gmailWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  gmailWarningText: {
    flex: 1,
    color: '#856404',
    fontSize: 14,
    fontWeight: '500',
  },
  header: {
    marginBottom: 20,
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
    marginBottom: 20,
  },
  promptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  promptLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    textTransform: 'uppercase',
  },
  refreshButton: {
    padding: 4,
  },
  promptText: {
    fontSize: 17,
    lineHeight: 24,
    color: '#333',
  },
  inputSection: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    color: '#000',
  },
  photosContainer: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  photoWrapper: {
    marginRight: 12,
    position: 'relative',
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'transparent',
  },
  mediaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  mediaButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 34,
    backgroundColor: 'transparent',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonSending: {
    backgroundColor: '#5AC8FA',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  sendIcon: {
    marginLeft: 8,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  viewOutboxButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  viewOutboxText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
});
