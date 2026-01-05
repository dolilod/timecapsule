import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { hasCompletedOnboarding } from '@/services/storage';
import { setupNotificationResponseListener } from '@/services/notifications';
import { autoRetryPending, getPendingCount } from '@/services/outbox';
import { isGmailConnected } from '@/services/gmail';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    checkOnboarding();

    // Set up notification tap handler
    const unsubscribe = setupNotificationResponseListener();

    // Set up app state listener for auto-retry on foreground
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      unsubscribe();
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    // When app comes to foreground from background
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      await attemptAutoRetry();
    }
    appState.current = nextAppState;
  };

  const attemptAutoRetry = async () => {
    try {
      // Only retry if Gmail is connected and there are pending entries
      const [connected, pendingCount] = await Promise.all([
        isGmailConnected(),
        getPendingCount(),
      ]);

      if (connected && pendingCount > 0) {
        console.log(`Auto-retrying ${pendingCount} pending outbox entries...`);
        const result = await autoRetryPending();
        console.log(`Auto-retry complete: ${result.succeeded} sent, ${result.failed} failed`);
      }
    } catch (error) {
      console.error('Auto-retry error:', error);
    }
  };

  const checkOnboarding = async () => {
    const completed = await hasCompletedOnboarding();
    setIsOnboardingComplete(completed);

    // Try auto-retry on initial app open
    if (completed) {
      await attemptAutoRetry();
    }
  };

  useEffect(() => {
    if (isOnboardingComplete === null) return;

    const inOnboarding = segments[0] === 'onboarding';

    if (!isOnboardingComplete && !inOnboarding) {
      router.replace('/onboarding');
    } else if (isOnboardingComplete && inOnboarding) {
      router.replace('/(tabs)/compose');
    }
  }, [isOnboardingComplete, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="onboarding"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
