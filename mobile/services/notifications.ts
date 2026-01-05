import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { router } from 'expo-router';

const STORAGE_KEYS = {
  REMINDER_TIME: 'reminder_time',
  NOTIFICATIONS_ENABLED: 'notifications_enabled',
} as const;

// Default reminder time: 8:00 PM (20:00)
const DEFAULT_REMINDER_HOUR = 20;
const DEFAULT_REMINDER_MINUTE = 0;

export interface ReminderTime {
  hour: number;
  minute: number;
}

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Request notification permissions
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Notifications only work on physical devices');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permission not granted');
    return false;
  }

  // Required for Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily-reminder', {
      name: 'Daily Reminder',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#007AFF',
    });
  }

  return true;
}

// Check if notifications are enabled
export async function areNotificationsEnabled(): Promise<boolean> {
  try {
    const enabled = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED);
    return enabled === 'true';
  } catch {
    return false;
  }
}

// Set notifications enabled state
export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED, String(enabled));

  if (!enabled) {
    await cancelAllScheduledNotifications();
  }
}

// Get saved reminder time
export async function getReminderTime(): Promise<ReminderTime> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.REMINDER_TIME);
    if (data) {
      return JSON.parse(data);
    }
  } catch {
    // Fall through to default
  }
  return { hour: DEFAULT_REMINDER_HOUR, minute: DEFAULT_REMINDER_MINUTE };
}

// Save reminder time
export async function saveReminderTime(time: ReminderTime): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.REMINDER_TIME, JSON.stringify(time));
}

// Schedule daily reminder notification
export async function scheduleDailyReminder(childName: string): Promise<string | null> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return null;
  }

  // Cancel existing notifications first
  await cancelAllScheduledNotifications();

  const reminderTime = await getReminderTime();

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time Capsule',
      body: `Time to capture today's moment for ${childName}`,
      data: { screen: 'compose' },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: reminderTime.hour,
      minute: reminderTime.minute,
    },
  });

  await setNotificationsEnabled(true);

  return identifier;
}

// Cancel all scheduled notifications
export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Get all scheduled notifications (for debugging)
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}

// Format time for display
export function formatReminderTime(time: ReminderTime): string {
  const hour12 = time.hour % 12 || 12;
  const ampm = time.hour >= 12 ? 'PM' : 'AM';
  const minuteStr = time.minute.toString().padStart(2, '0');
  return `${hour12}:${minuteStr} ${ampm}`;
}

// Setup notification response listener (for handling taps)
export function setupNotificationResponseListener(): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;

    if (data?.screen === 'compose') {
      // Navigate to compose screen
      router.push('/(tabs)/compose');
    }
  });

  return () => subscription.remove();
}

// Schedule a test notification (for development)
export async function scheduleTestNotification(): Promise<void> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.log('No permission for test notification');
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time Capsule',
      body: 'This is a test notification!',
      data: { screen: 'compose' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
    },
  });
}
