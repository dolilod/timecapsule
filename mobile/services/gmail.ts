import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { encode as base64Encode } from 'base-64';
import * as FileSystem from 'expo-file-system';

// Complete auth session for web browser redirect
WebBrowser.maybeCompleteAuthSession();

// Constants
const GOOGLE_CLIENT_ID_IOS = '788944197232-b4vf9e0rl0fr1ia2keg5q16m2plrooo1.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_ANDROID = 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'gmail_access_token',
  REFRESH_TOKEN: 'gmail_refresh_token',
  EXPIRES_AT: 'gmail_expires_at',
  USER_EMAIL: 'gmail_user_email',
} as const;

// Only request send scope - no read/modify
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

// Google OAuth endpoints
const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export interface GmailTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userEmail: string;
}

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  photoUri?: string;
}

// Get redirect URI for the current platform
// For iOS, Google requires reversed client ID format
export function getRedirectUri(): string {
  // Extract client ID prefix (before .apps.googleusercontent.com)
  const clientId = getClientId();
  const clientIdPrefix = clientId.split('.apps.googleusercontent.com')[0];

  // iOS uses reversed client ID as scheme
  return `com.googleusercontent.apps.${clientIdPrefix}:/oauth2redirect/google`;
}

// Get client ID based on platform
export function getClientId(): string {
  // In a real app, you'd check Platform.OS and return the appropriate client ID
  // For now, return iOS client ID (you'll configure both in Google Cloud Console)
  return GOOGLE_CLIENT_ID_IOS;
}

// Create auth request configuration
export function createAuthRequest() {
  return new AuthSession.AuthRequest({
    clientId: getClientId(),
    scopes: ['openid', 'email', 'profile', GMAIL_SCOPE],
    redirectUri: getRedirectUri(),
    usePKCE: true,
    extraParams: {
      access_type: 'offline', // Request refresh token
      prompt: 'consent', // Always show consent screen to get refresh token
    },
  });
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<GmailTokens | null> {
  console.log('exchangeCodeForTokens called');
  console.log('Code length:', code?.length);
  console.log('Code verifier length:', codeVerifier?.length);
  console.log('Client ID:', getClientId());
  console.log('Redirect URI:', getRedirectUri());

  try {
    console.log('Calling AuthSession.exchangeCodeAsync...');
    const tokenResponse = await AuthSession.exchangeCodeAsync(
      {
        clientId: getClientId(),
        code,
        redirectUri: getRedirectUri(),
        extraParams: {
          code_verifier: codeVerifier,
        },
      },
      discovery
    );

    console.log('Token response received');
    console.log('Access token:', tokenResponse.accessToken ? 'present' : 'missing');
    console.log('Refresh token:', tokenResponse.refreshToken ? 'present' : 'missing');

    if (!tokenResponse.accessToken) {
      console.error('No access token in response');
      return null;
    }

    // Get user email from Google's userinfo endpoint
    console.log('Fetching user info...');
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokenResponse.accessToken}`,
        },
      }
    );
    const userInfo = await userInfoResponse.json();
    console.log('User info response:', JSON.stringify(userInfo));

    const tokens: GmailTokens = {
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken || '',
      expiresAt: tokenResponse.expiresIn
        ? Date.now() + tokenResponse.expiresIn * 1000
        : Date.now() + 3600 * 1000,
      userEmail: userInfo.email || '',
    };

    console.log('Saving tokens...');
    await saveTokens(tokens);
    console.log('Tokens saved successfully');
    return tokens;
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return null;
  }
}

// Save tokens to secure storage
async function saveTokens(tokens: GmailTokens): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
  await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
  await SecureStore.setItemAsync(STORAGE_KEYS.EXPIRES_AT, String(tokens.expiresAt));
  await SecureStore.setItemAsync(STORAGE_KEYS.USER_EMAIL, tokens.userEmail);
}

// Get stored tokens
export async function getStoredTokens(): Promise<GmailTokens | null> {
  try {
    const accessToken = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    const expiresAt = await SecureStore.getItemAsync(STORAGE_KEYS.EXPIRES_AT);
    const userEmail = await SecureStore.getItemAsync(STORAGE_KEYS.USER_EMAIL);

    if (!accessToken) return null;

    return {
      accessToken,
      refreshToken: refreshToken || '',
      expiresAt: expiresAt ? parseInt(expiresAt, 10) : 0,
      userEmail: userEmail || '',
    };
  } catch (error) {
    console.error('Error getting stored tokens:', error);
    return null;
  }
}

// Check if connected to Gmail
export async function isGmailConnected(): Promise<boolean> {
  const tokens = await getStoredTokens();
  return tokens !== null && tokens.accessToken.length > 0;
}

// Get connected email
export async function getConnectedEmail(): Promise<string | null> {
  const tokens = await getStoredTokens();
  return tokens?.userEmail || null;
}

// Refresh access token if expired
export async function refreshTokenIfNeeded(): Promise<string | null> {
  const tokens = await getStoredTokens();
  if (!tokens) return null;

  // Check if token is expired (with 5 minute buffer)
  if (Date.now() < tokens.expiresAt - 5 * 60 * 1000) {
    return tokens.accessToken;
  }

  // Need to refresh
  if (!tokens.refreshToken) {
    console.error('No refresh token available');
    return null;
  }

  try {
    const response = await AuthSession.refreshAsync(
      {
        clientId: getClientId(),
        refreshToken: tokens.refreshToken,
      },
      discovery
    );

    const newTokens: GmailTokens = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken || tokens.refreshToken,
      expiresAt: response.expiresIn
        ? Date.now() + response.expiresIn * 1000
        : Date.now() + 3600 * 1000,
      userEmail: tokens.userEmail,
    };

    await saveTokens(newTokens);
    return newTokens.accessToken;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

// Disconnect Gmail (revoke tokens)
export async function disconnectGmail(): Promise<void> {
  const tokens = await getStoredTokens();

  if (tokens?.accessToken) {
    try {
      // Revoke token with Google
      await AuthSession.revokeAsync(
        { token: tokens.accessToken },
        discovery
      );
    } catch (error) {
      console.error('Error revoking token:', error);
    }
  }

  // Clear stored tokens
  await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
  await SecureStore.deleteItemAsync(STORAGE_KEYS.EXPIRES_AT);
  await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_EMAIL);
}

// Build RFC 2822 MIME message
async function buildMimeMessage(
  from: string,
  payload: EmailPayload
): Promise<string> {
  const boundary = `boundary_${Date.now()}`;

  let message = '';
  message += `From: ${from}\r\n`;
  message += `To: ${payload.to}\r\n`;
  message += `Subject: ${payload.subject}\r\n`;
  message += 'MIME-Version: 1.0\r\n';

  if (payload.photoUri) {
    // Multipart message with attachment
    message += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;

    // Text part
    message += `--${boundary}\r\n`;
    message += 'Content-Type: text/plain; charset="UTF-8"\r\n\r\n';
    message += `${payload.body}\r\n\r\n`;

    // Photo attachment
    try {
      const photoBase64 = await FileSystem.readAsStringAsync(payload.photoUri, {
        encoding: 'base64',
      });

      const filename = payload.photoUri.split('/').pop() || 'photo.jpg';
      const mimeType = filename.toLowerCase().endsWith('.png')
        ? 'image/png'
        : 'image/jpeg';

      message += `--${boundary}\r\n`;
      message += `Content-Type: ${mimeType}\r\n`;
      message += 'Content-Transfer-Encoding: base64\r\n';
      message += `Content-Disposition: attachment; filename="${filename}"\r\n\r\n`;
      message += `${photoBase64}\r\n`;
    } catch (error) {
      console.error('Error reading photo:', error);
      // Continue without attachment
    }

    message += `--${boundary}--`;
  } else {
    // Simple text message
    message += 'Content-Type: text/plain; charset="UTF-8"\r\n\r\n';
    message += payload.body;
  }

  return message;
}

// URL-safe base64 encoding for Gmail API
// Handles Unicode characters by first encoding to UTF-8
function base64UrlEncode(str: string): string {
  // Convert Unicode string to UTF-8 bytes, then base64 encode
  // encodeURIComponent handles Unicode -> UTF-8 percent-encoding
  // unescape converts percent-encoding to actual bytes
  const utf8Bytes = unescape(encodeURIComponent(str));
  const base64 = base64Encode(utf8Bytes);
  // Make it URL-safe for Gmail API
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Send email via Gmail API
export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  const accessToken = await refreshTokenIfNeeded();
  if (!accessToken) {
    return { success: false, error: 'Not authenticated. Please connect Gmail first.' };
  }

  const tokens = await getStoredTokens();
  if (!tokens?.userEmail) {
    return { success: false, error: 'No sender email found.' };
  }

  try {
    const mimeMessage = await buildMimeMessage(tokens.userEmail, payload);
    const encodedMessage = base64UrlEncode(mimeMessage);

    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encodedMessage }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gmail API error:', errorData);
      return {
        success: false,
        error: errorData.error?.message || `Failed to send (${response.status})`,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}
