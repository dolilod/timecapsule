import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Text, View } from '@/components/Themed';
import {
  getDefaultChild,
  updateChildProfile,
  isValidEmail,
  calculateDayNumber,
  calculateAge,
} from '@/services/storage';
import {
  getReminderTime,
  saveReminderTime,
  scheduleDailyReminder,
  areNotificationsEnabled,
  setNotificationsEnabled,
  cancelAllScheduledNotifications,
  formatReminderTime,
  ReminderTime,
} from '@/services/notifications';
import {
  isGmailConnected,
  getConnectedEmail,
  disconnectGmail,
  createAuthRequest,
  exchangeCodeForTokens,
  getRedirectUri,
} from '@/services/gmail';
import * as AuthSession from 'expo-auth-session';
import { ChildProfile } from '@/types';
import { toDateOnlyString, fromDateOnlyString } from '@/services/date';

// Google OAuth discovery document
const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export default function SettingsScreen() {
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBirthday, setEditBirthday] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  // Notification state
  const [notificationsEnabled, setNotificationsEnabledState] = useState(false);
  const [reminderTime, setReminderTime] = useState<ReminderTime>({ hour: 20, minute: 0 });
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Gmail state
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [authRequest, setAuthRequest] = useState<AuthSession.AuthRequest | null>(null);

  const loadData = useCallback(async () => {
    const defaultChild = await getDefaultChild();
    setChild(defaultChild);
    if (defaultChild) {
      setEditName(defaultChild.name);
      setEditEmail(defaultChild.email);
      setEditBirthday(fromDateOnlyString(defaultChild.birthday));
    }

    // Load notification settings
    const enabled = await areNotificationsEnabled();
    setNotificationsEnabledState(enabled);
    const time = await getReminderTime();
    setReminderTime(time);

    // Load Gmail connection status
    const connected = await isGmailConnected();
    setGmailConnected(connected);
    if (connected) {
      const email = await getConnectedEmail();
      setGmailEmail(email);
    }

    // Prepare auth request
    const request = createAuthRequest();
    setAuthRequest(request);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleToggleNotifications = async (enabled: boolean) => {
    setNotificationsEnabledState(enabled);
    await setNotificationsEnabled(enabled);

    if (enabled && child) {
      await scheduleDailyReminder(child.name);
    } else {
      await cancelAllScheduledNotifications();
    }
  };

  const handleTimeChange = async (event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');

    if (selectedDate && child) {
      const newTime: ReminderTime = {
        hour: selectedDate.getHours(),
        minute: selectedDate.getMinutes(),
      };
      setReminderTime(newTime);
      await saveReminderTime(newTime);

      // Reschedule notification with new time
      if (notificationsEnabled) {
        await scheduleDailyReminder(child.name);
      }
    }
  };

  const getTimePickerDate = (): Date => {
    const date = new Date();
    date.setHours(reminderTime.hour, reminderTime.minute, 0, 0);
    return date;
  };

  const handleConnectGmail = async () => {
    if (!authRequest) {
      Alert.alert('Error', 'Auth request not ready. Please try again.');
      return;
    }

    setIsConnecting(true);
    try {
      const result = await authRequest.promptAsync(discovery);

      if (result.type === 'success' && result.params.code) {
        const tokens = await exchangeCodeForTokens(
          result.params.code,
          authRequest.codeVerifier || ''
        );

        if (tokens) {
          setGmailConnected(true);
          setGmailEmail(tokens.userEmail);
          Alert.alert('Success', 'Gmail connected successfully!');
        } else {
          Alert.alert('Error', 'Failed to complete authentication.');
        }
      } else if (result.type === 'error') {
        Alert.alert('Error', result.error?.message || 'Authentication failed.');
      }
    } catch (error) {
      console.error('Error connecting Gmail:', error);
      Alert.alert('Error', 'Failed to connect Gmail. Please try again.');
    } finally {
      setIsConnecting(false);
      // Recreate auth request for next attempt
      const request = createAuthRequest();
      setAuthRequest(request);
    }
  };

  const handleDisconnectGmail = () => {
    Alert.alert(
      'Disconnect Gmail',
      'Are you sure you want to disconnect your Gmail account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await disconnectGmail();
            setGmailConnected(false);
            setGmailEmail(null);
          },
        },
      ]
    );
  };

  const validateForm = (): boolean => {
    const newErrors: { name?: string; email?: string } = {};

    if (!editName.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!editEmail.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(editEmail.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!child || !validateForm()) return;

    setIsSaving(true);
    try {
      const updated = await updateChildProfile(child.id, {
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        birthday: toDateOnlyString(editBirthday),
      });

      if (updated) {
        setChild(updated);
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
      console.error('Error updating profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (child) {
      setEditName(child.name);
      setEditEmail(child.email);
      setEditBirthday(fromDateOnlyString(child.birthday));
    }
    setErrors({});
    setIsEditing(false);
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!child) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Child Profile</Text>
          {!isEditing && (
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Text style={styles.editButton}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {isEditing ? (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                value={editName}
                onChangeText={(text) => {
                  setEditName(text);
                  if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
                }}
                placeholder="Enter name"
                placeholderTextColor="#999"
                autoCapitalize="words"
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Birthday</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>{formatDate(editBirthday)}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <View style={styles.datePickerContainer}>
                  <DateTimePicker
                    value={editBirthday}
                    mode="date"
                    display="spinner"
                    maximumDate={new Date()}
                    onChange={(event, selectedDate) => {
                      if (Platform.OS === 'android') {
                        setShowDatePicker(false);
                      }
                      if (selectedDate) {
                        setEditBirthday(selectedDate);
                      }
                    }}
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      style={styles.datePickerDone}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={styles.datePickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                value={editEmail}
                onChangeText={(text) => {
                  setEditEmail(text);
                  if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
                }}
                placeholder="child@gmail.com"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton, isSaving && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.profileCard}>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Name</Text>
              <Text style={styles.profileValue}>{child.name}</Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Birthday</Text>
              <Text style={styles.profileValue}>
                {formatDate(new Date(child.birthday))}
              </Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Age</Text>
              <Text style={styles.profileValue}>{calculateAge(child.birthday)}</Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Day</Text>
              <Text style={styles.profileValue}>
                Day {calculateDayNumber(child.birthday)}
              </Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Email</Text>
              <Text style={styles.profileValue}>{child.email}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gmail</Text>
        <View style={styles.profileCard}>
          {gmailConnected ? (
            <>
              <View style={styles.gmailConnectedRow}>
                <View style={styles.gmailConnectedInfo}>
                  <Text style={styles.gmailConnectedLabel}>Connected</Text>
                  <Text style={styles.gmailEmail}>{gmailEmail}</Text>
                </View>
                <TouchableOpacity
                  style={styles.disconnectButton}
                  onPress={handleDisconnectGmail}
                >
                  <Text style={styles.disconnectButtonText}>Disconnect</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.notConnected}>Not connected</Text>
              <Text style={styles.hint}>
                Connect your Gmail to send memories to your child's email
              </Text>
              <TouchableOpacity
                style={[styles.connectButton, isConnecting && styles.buttonDisabled]}
                onPress={handleConnectGmail}
                disabled={isConnecting}
              >
                <Text style={styles.connectButtonText}>
                  {isConnecting ? 'Connecting...' : 'Connect Gmail'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.profileCard}>
          <View style={styles.notificationRow}>
            <View style={styles.notificationTextContainer}>
              <Text style={styles.notificationLabel}>Daily Reminder</Text>
              <Text style={styles.notificationHint}>
                Get reminded to capture today's moment
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#ddd', true: '#34C759' }}
              thumbColor="#fff"
            />
          </View>

          {notificationsEnabled && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.timeRow}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.timeLabel}>Reminder Time</Text>
                <Text style={styles.timeValue}>{formatReminderTime(reminderTime)}</Text>
              </TouchableOpacity>

              {showTimePicker && (
                <DateTimePicker
                  value={getTimePickerDate()}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
                />
              )}
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  loading: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  section: {
    marginBottom: 32,
    backgroundColor: 'transparent',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  editButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  profileCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: 'transparent',
  },
  profileLabel: {
    fontSize: 15,
    color: '#666',
  },
  profileValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  notConnected: {
    fontSize: 15,
    color: '#ff9500',
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    color: '#999',
  },
  form: {
    backgroundColor: 'transparent',
  },
  inputGroup: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#000',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#fff',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#000',
  },
  datePickerContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  datePickerDone: {
    backgroundColor: '#007AFF',
    padding: 12,
    alignItems: 'center',
  },
  datePickerDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  button: {
    flex: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  notificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  notificationTextContainer: {
    flex: 1,
    marginRight: 12,
    backgroundColor: 'transparent',
  },
  notificationLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  notificationHint: {
    fontSize: 13,
    color: '#999',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  timeLabel: {
    fontSize: 15,
    color: '#666',
  },
  timeValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#007AFF',
  },
  gmailConnectedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  gmailConnectedInfo: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  gmailConnectedLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#34C759',
    marginBottom: 2,
  },
  gmailEmail: {
    fontSize: 14,
    color: '#666',
  },
  disconnectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
  },
  disconnectButtonText: {
    fontSize: 14,
    color: '#ff3b30',
    fontWeight: '500',
  },
  connectButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
