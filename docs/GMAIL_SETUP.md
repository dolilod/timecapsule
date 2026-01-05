# Gmail OAuth Setup Guide

This guide explains how to set up Google Cloud credentials for the Time Capsule app's Gmail integration.

## Prerequisites

- Google Cloud Console access
- Expo Development Build (OAuth **won't work** in Expo Go)

---

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Name: `Time Capsule` (or your preferred name)
4. Click **Create**

---

## Step 2: Enable Gmail API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click **Gmail API** → **Enable**

---

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type → **Create**
3. Fill in:
   - **App name**: Time Capsule
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Click **Save and Continue**

### Scopes

1. Click **Add or Remove Scopes**
2. Find and select: `https://www.googleapis.com/auth/gmail.send`
3. Click **Update** → **Save and Continue**

### Test Users (Required for Development)

1. Add email addresses of test users (including your own)
2. Click **Save and Continue** → **Back to Dashboard**

---

## Step 4: Create OAuth Credentials

### For iOS

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **iOS**
4. Name: `Time Capsule iOS`
5. **Bundle ID**: Your app's bundle identifier (e.g., `com.yourname.timecapsule`)
   - Must match `ios.bundleIdentifier` in `app.json`
6. Click **Create**
7. Copy the **Client ID** (format: `XXXXX.apps.googleusercontent.com`)

### For Android

1. Click **Create Credentials** → **OAuth client ID**
2. Application type: **Android**
3. Name: `Time Capsule Android`
4. **Package name**: Your app's package name (e.g., `com.yourname.timecapsule`)
   - Must match `android.package` in `app.json`
5. **SHA-1 certificate fingerprint**: Get this from your keystore:
   ```bash
   # For debug keystore (development)
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

   # For Expo development build
   eas credentials
   ```
6. Click **Create**
7. Copy the **Client ID**

### Critical: Enable Custom URI Scheme for Android

**This step is essential!** By default, Google blocks custom URI scheme redirects for Android.

1. Click on your Android OAuth client to edit it
2. Scroll to **Advanced Settings**
3. Enable **Allow custom URI scheme redirects**
4. Click **Save**

Without this, you'll get `invalid_request` errors during OAuth.

---

## Step 5: Update App Configuration

### Update `services/gmail.ts`

Replace the placeholder client IDs:

```typescript
const GOOGLE_CLIENT_ID_IOS = 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_ANDROID = 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com';
```

With your actual client IDs from Step 4.

### Update `app.json`

Ensure the scheme is configured:

```json
{
  "expo": {
    "scheme": "timecapsule",
    "ios": {
      "bundleIdentifier": "com.yourname.timecapsule"
    },
    "android": {
      "package": "com.yourname.timecapsule"
    }
  }
}
```

---

## Step 6: Build Development Client

OAuth requires a development build (Expo Go won't work):

```bash
# Install EAS CLI if not installed
npm install -g eas-cli

# Log in to Expo
eas login

# Create development build
eas build --profile development --platform ios
# or
eas build --profile development --platform android
```

---

## Testing the OAuth Flow

1. Start the development server:
   ```bash
   npx expo start --dev-client
   ```

2. Open the app on your device/simulator

3. Go to **Settings** → **Connect Gmail**

4. Complete the Google sign-in flow

5. After successful auth, Settings should show "Connected as {email}"

6. Try sending a memory from the Compose screen

---

## Troubleshooting

### "invalid_request" on Android

- Ensure custom URI scheme redirects are enabled (Step 4, Android section)
- Verify package name matches exactly

### "redirect_uri_mismatch"

- Check that your bundle ID / package name matches the OAuth client configuration
- Verify the scheme in `app.json` matches what's used in the redirect URI

### "access_denied"

- Make sure your email is added as a test user in OAuth consent screen
- App is in "Testing" mode until published

### Token refresh fails

- Check that you requested `access_type: 'offline'` and `prompt: 'consent'`
- This ensures a refresh token is provided

### Can't test on simulator/emulator

- iOS Simulator: Works with development builds
- Android Emulator: Make sure Google Play Services are installed

---

## Security Notes

- Only the `gmail.send` scope is requested - the app cannot read emails
- Tokens are stored in `expo-secure-store` (encrypted device storage)
- PKCE is used for the OAuth flow (no client secret stored in app)
- Users can revoke access at any time from Google Account settings

---

## Publishing to Production

Before releasing publicly:

1. Submit your app for Google OAuth verification
2. Go to **OAuth consent screen** → **Publish App**
3. Complete the verification process (may require privacy policy, terms of service)

Until verified, only test users can use the OAuth flow.
