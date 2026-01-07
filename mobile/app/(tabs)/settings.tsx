import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Switch,
  View,
  Text,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { useTheme } from '@/hooks/useTheme';
import { Card, Button, Banner, useToast } from '@/components/ui';
import { useNetwork } from '@/hooks/useNetwork';
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
  formatNextReminder,
} from '@/services/notifications';
import {
  isGmailConnected,
  getConnectedEmail,
  disconnectGmail,
  exchangeCodeForTokens,
  getRedirectUri,
  getClientId,
} from '@/services/gmail';
import * as AuthSession from 'expo-auth-session';
import { ChildProfile } from '@/types';
import { toDateOnlyString, fromDateOnlyString } from '@/services/date';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

export default function SettingsScreen() {
  const { colors, typography, spacing, componentRadius } = useTheme();
  const { isOnline } = useNetwork();
  const toast = useToast();

  const [child, setChild] = useState<ChildProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBirthday, setEditBirthday] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  const [notificationsEnabled, setNotificationsEnabledState] = useState(false);
  const [reminderTime, setReminderTime] = useState<ReminderTime>({ hour: 20, minute: 0 });
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: getClientId(),
      scopes: ['openid', 'email', 'profile', GMAIL_SCOPE],
      redirectUri: getRedirectUri(),
      usePKCE: true,
      extraParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
    discovery
  );

  const loadData = useCallback(async () => {
    const defaultChild = await getDefaultChild();
    setChild(defaultChild);
    if (defaultChild) {
      setEditName(defaultChild.name);
      setEditEmail(defaultChild.email);
      setEditBirthday(fromDateOnlyString(defaultChild.birthday));
    }

    const enabled = await areNotificationsEnabled();
    setNotificationsEnabledState(enabled);
    const time = await getReminderTime();
    setReminderTime(time);

    const connected = await isGmailConnected();
    setGmailConnected(connected);
    if (connected) {
      const email = await getConnectedEmail();
      setGmailEmail(email);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  React.useEffect(() => {
    const handleAuthResponse = async () => {
      if (response?.type === 'success') {
        const code = response.params?.code;
        if (code && request?.codeVerifier) {
          setIsConnecting(true);
          try {
            const tokens = await exchangeCodeForTokens(code, request.codeVerifier);
            if (tokens) {
              setGmailConnected(true);
              setGmailEmail(tokens.userEmail);
              Alert.alert('Success', `Gmail connected as ${tokens.userEmail}`);
            } else {
              Alert.alert('Error', 'Failed to exchange tokens.');
            }
          } catch (error) {
            Alert.alert('Error', 'Failed to connect Gmail.');
          } finally {
            setIsConnecting(false);
          }
        }
      } else if (response?.type === 'error') {
        Alert.alert('Error', response.error?.message || 'Authentication failed.');
        setIsConnecting(false);
      } else if (response?.type === 'dismiss') {
        setIsConnecting(false);
      }
    };

    if (response) {
      handleAuthResponse();
    }
  }, [response, request]);

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
    if (!request) {
      Alert.alert('Error', 'Auth request not ready. Please try again.');
      return;
    }

    setIsConnecting(true);
    try {
      await promptAsync();
    } catch (error) {
      Alert.alert('Error', 'Failed to start Gmail authentication.');
      setIsConnecting(false);
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
        toast.success('Profile updated');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
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
      <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <Text style={[typography.styles.body, { color: colors.text.secondary, textAlign: 'center', marginTop: 100 }]}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      contentContainerStyle={styles.content}
    >
      {!isOnline && (
        <Banner variant="warning" message="You’re offline — changes will be saved locally" style={{ marginBottom: spacing[3] }} />
      )}
      {/* Child Profile Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[typography.styles.h3, { color: colors.text.primary }]}>
            Child Profile
          </Text>
          {!isEditing && (
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Text style={[typography.styles.button, { color: colors.interactive.primary }]}>
                Edit
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {isEditing ? (
          <View style={styles.form}>
            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={[typography.styles.label, { color: colors.text.primary, marginBottom: spacing[2] }]}>
                Name
              </Text>
              <TextInput
                style={[
                  styles.input,
                  typography.styles.bodyLarge,
                  {
                    backgroundColor: colors.background.primary,
                    borderColor: errors.name ? colors.status.error : colors.border.DEFAULT,
                    borderRadius: componentRadius.input,
                    color: colors.text.primary,
                  },
                ]}
                value={editName}
                onChangeText={(text) => {
                  setEditName(text);
                  if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
                }}
                placeholder="Enter name"
                placeholderTextColor={colors.text.tertiary}
                autoCapitalize="words"
              />
              {errors.name && (
                <Text style={[typography.styles.bodySmall, { color: colors.status.error, marginTop: spacing[1] }]}>
                  {errors.name}
                </Text>
              )}
            </View>

            {/* Birthday Picker */}
            <View style={styles.inputGroup}>
              <Text style={[typography.styles.label, { color: colors.text.primary, marginBottom: spacing[2] }]}>
                Birthday
              </Text>
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  {
                    backgroundColor: colors.background.primary,
                    borderColor: colors.border.DEFAULT,
                    borderRadius: componentRadius.input,
                  },
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[typography.styles.bodyLarge, { color: colors.text.primary }]}>
                  {formatDate(editBirthday)}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <View
                  style={[
                    styles.datePickerContainer,
                    { backgroundColor: colors.card.backgroundAlt, borderRadius: componentRadius.card },
                  ]}
                >
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
                      style={[styles.datePickerDone, { backgroundColor: colors.interactive.primary }]}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={[typography.styles.button, { color: colors.text.inverse }]}>Done</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={[typography.styles.label, { color: colors.text.primary, marginBottom: spacing[2] }]}>
                Email
              </Text>
              <TextInput
                style={[
                  styles.input,
                  typography.styles.bodyLarge,
                  {
                    backgroundColor: colors.background.primary,
                    borderColor: errors.email ? colors.status.error : colors.border.DEFAULT,
                    borderRadius: componentRadius.input,
                    color: colors.text.primary,
                  },
                ]}
                value={editEmail}
                onChangeText={(text) => {
                  setEditEmail(text);
                  if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
                }}
                placeholder="child@gmail.com"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && (
                <Text style={[typography.styles.bodySmall, { color: colors.status.error, marginTop: spacing[1] }]}>
                  {errors.email}
                </Text>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <Button title="Cancel" onPress={handleCancel} variant="secondary" style={{ flex: 1 }} />
              <Button
                title={isSaving ? 'Saving...' : 'Save'}
                onPress={handleSave}
                disabled={isSaving}
                loading={isSaving}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        ) : (
          <Card variant="default">
            <View style={[styles.profileRow, { borderBottomColor: colors.border.light }]}>
              <Text style={[typography.styles.body, { color: colors.text.secondary }]}>Name</Text>
              <Text style={[typography.styles.body, { color: colors.text.primary, fontWeight: '500' }]}>
                {child.name}
              </Text>
            </View>
            <View style={[styles.profileRow, { borderBottomColor: colors.border.light }]}>
              <Text style={[typography.styles.body, { color: colors.text.secondary }]}>Birthday</Text>
              <Text style={[typography.styles.body, { color: colors.text.primary, fontWeight: '500' }]}>
                {formatDate(new Date(child.birthday))}
              </Text>
            </View>
            <View style={[styles.profileRow, { borderBottomColor: colors.border.light }]}>
              <Text style={[typography.styles.body, { color: colors.text.secondary }]}>Age</Text>
              <Text style={[typography.styles.body, { color: colors.text.primary, fontWeight: '500' }]}>
                {calculateAge(child.birthday)}
              </Text>
            </View>
            <View style={[styles.profileRow, { borderBottomColor: colors.border.light }]}>
              <Text style={[typography.styles.body, { color: colors.text.secondary }]}>Day</Text>
              <Text style={[typography.styles.body, { color: colors.text.primary, fontWeight: '500' }]}>
                Day {calculateDayNumber(child.birthday)}
              </Text>
            </View>
            <View style={[styles.profileRow, { borderBottomWidth: 0 }]}>
              <Text style={[typography.styles.body, { color: colors.text.secondary }]}>Email</Text>
              <Text style={[typography.styles.body, { color: colors.text.primary, fontWeight: '500' }]}>
                {child.email}
              </Text>
            </View>
          </Card>
        )}
      </View>

      {/* Gmail Section */}
      <View style={styles.section}>
        <Text style={[typography.styles.h3, { color: colors.text.primary, marginBottom: spacing[3] }]}>
          Gmail
        </Text>
        <Card variant="default">
          {gmailConnected ? (
            <View style={styles.gmailConnectedRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.gmailStatusRow}>
                  <View style={[styles.statusDot, { backgroundColor: colors.status.success }]} />
                  <Text style={[typography.styles.label, { color: colors.status.success }]}>
                    Connected
                  </Text>
                </View>
                <Text style={[typography.styles.bodySmall, { color: colors.text.secondary, marginTop: spacing[1] }]}>
                  {gmailEmail}
                </Text>
              </View>
              <Button
                title="Disconnect"
                onPress={handleDisconnectGmail}
                variant="ghost"
                size="sm"
              />
            </View>
          ) : (
            <>
              <Text style={[typography.styles.label, { color: colors.status.warning }]}>
                Not connected
              </Text>
              <Text style={[typography.styles.bodySmall, { color: colors.text.tertiary, marginTop: spacing[1] }]}>
                Connect your Gmail to send memories to your child's email
              </Text>
              <View style={{ marginTop: spacing[3] }}>
                <Button
                  title={isConnecting ? 'Connecting...' : !request ? 'Loading...' : 'Connect Gmail'}
                  onPress={handleConnectGmail}
                  disabled={isConnecting || !request}
                  loading={isConnecting}
                  icon={<FontAwesome name="google" size={16} color={colors.text.inverse} />}
                  iconPosition="left"
                />
              </View>
            </>
          )}
        </Card>
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={[typography.styles.h3, { color: colors.text.primary, marginBottom: spacing[3] }]}>
          Notifications
        </Text>
        <Card variant="default">
          <View style={styles.notificationRow}>
            <View style={{ flex: 1, marginRight: spacing[3] }}>
              <Text style={[typography.styles.body, { color: colors.text.primary, fontWeight: '500' }]}>
                Daily Reminder
              </Text>
              <Text style={[typography.styles.bodySmall, { color: colors.text.tertiary, marginTop: spacing[1] }]}>
                Get reminded to capture today's moment
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.border.DEFAULT, true: colors.status.success }}
              thumbColor={colors.background.primary}
            />
          </View>

          {notificationsEnabled && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border.light }]} />
              <TouchableOpacity style={styles.timeRow} onPress={() => setShowTimePicker(true)}>
                <Text style={[typography.styles.body, { color: colors.text.secondary }]}>
                  Reminder Time
                </Text>
                <Text style={[typography.styles.body, { color: colors.interactive.primary, fontWeight: '500' }]}>
                  {formatReminderTime(reminderTime)}
                </Text>
              </TouchableOpacity>

              <Text style={[typography.styles.bodySmall, { color: colors.text.tertiary, marginTop: spacing[1], marginHorizontal: 16 }]}>
                Next reminder: {formatNextReminder(reminderTime)}
              </Text>

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
        </Card>
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
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  form: {},
  inputGroup: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    padding: 14,
  },
  dateButton: {
    borderWidth: 1,
    padding: 14,
  },
  datePickerContainer: {
    marginTop: 8,
    overflow: 'hidden',
  },
  datePickerDone: {
    padding: 12,
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  gmailConnectedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gmailStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
