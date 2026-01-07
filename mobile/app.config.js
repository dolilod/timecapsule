// Load environment variables (with development defaults)
// For production, set these via EAS Secrets
const GOOGLE_CLIENT_ID_IOS = process.env.GOOGLE_CLIENT_ID_IOS ||
  '788944197232-b4vf9e0rl0fr1ia2keg5q16m2plrooo1.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_ANDROID = process.env.GOOGLE_CLIENT_ID_ANDROID ||
  'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com';

// Extract the reversed client ID for iOS URL scheme
const getReversedClientId = (clientId) => {
  if (!clientId) return '';
  const prefix = clientId.split('.apps.googleusercontent.com')[0];
  return `com.googleusercontent.apps.${prefix}`;
};

export default {
  expo: {
    name: 'Time Capsule',
    slug: 'timecapsule',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'timecapsule',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.timecapsule.app',
      infoPlist: {
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [getReversedClientId(GOOGLE_CLIENT_ID_IOS)],
          },
        ],
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      package: 'com.timecapsule.app',
      permissions: ['android.permission.RECORD_AUDIO'],
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      [
        'expo-notifications',
        {
          icon: './assets/images/icon.png',
          color: '#007AFF',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'Allow Time Capsule to access your photos to add memories.',
          cameraPermission: 'Allow Time Capsule to access your camera to capture memories.',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: '9f1800c6-efc9-4717-b647-ac1b13dcfffa',
      },
      // Pass client IDs to the app via Constants.expoConfig.extra
      googleClientIdIos: GOOGLE_CLIENT_ID_IOS,
      googleClientIdAndroid: GOOGLE_CLIENT_ID_ANDROID,
    },
    owner: 'dolilod',
  },
};
