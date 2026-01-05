import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Network from 'expo-network';
import { CapsuleEntry } from '@/types';
import { sendEmail } from './gmail';

const OUTBOX_KEY = 'outbox_entries';

// Get all outbox entries
export async function getOutboxEntries(): Promise<CapsuleEntry[]> {
  try {
    const data = await AsyncStorage.getItem(OUTBOX_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting outbox entries:', error);
    return [];
  }
}

// Save outbox entries
async function saveOutboxEntries(entries: CapsuleEntry[]): Promise<void> {
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(entries));
}

// Add entry to outbox
export async function addToOutbox(entry: CapsuleEntry): Promise<void> {
  const entries = await getOutboxEntries();
  entries.push(entry);
  await saveOutboxEntries(entries);
}

// Update entry in outbox
export async function updateOutboxEntry(
  id: string,
  updates: Partial<CapsuleEntry>
): Promise<void> {
  const entries = await getOutboxEntries();
  const index = entries.findIndex((e) => e.id === id);
  if (index !== -1) {
    entries[index] = { ...entries[index], ...updates };
    await saveOutboxEntries(entries);
  }
}

// Remove entry from outbox
export async function removeFromOutbox(id: string): Promise<void> {
  const entries = await getOutboxEntries();
  const filtered = entries.filter((e) => e.id !== id);
  await saveOutboxEntries(filtered);
}

// Get pending entries count
export async function getPendingCount(): Promise<number> {
  const entries = await getOutboxEntries();
  return entries.filter((e) => e.status === 'pending' || e.status === 'failed').length;
}

// Check if photo URI is still valid
export async function isPhotoUriValid(uri: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists;
  } catch {
    return false;
  }
}

// Check photo URIs for an entry and return invalid ones
export async function getInvalidPhotoUris(entry: CapsuleEntry): Promise<string[]> {
  if (!entry.photoUris || entry.photoUris.length === 0) return [];

  const invalidUris: string[] = [];
  for (const uri of entry.photoUris) {
    const valid = await isPhotoUriValid(uri);
    if (!valid) {
      invalidUris.push(uri);
    }
  }
  return invalidUris;
}

// Update photo URI in entry (for re-picking expired photos)
export async function updatePhotoUri(
  entryId: string,
  oldUri: string,
  newUri: string
): Promise<void> {
  const entries = await getOutboxEntries();
  const entry = entries.find((e) => e.id === entryId);
  if (entry && entry.photoUris) {
    const index = entry.photoUris.indexOf(oldUri);
    if (index !== -1) {
      entry.photoUris[index] = newUri;
      await saveOutboxEntries(entries);
    }
  }
}

// Retry sending a single entry
export async function retrySendEntry(
  entry: CapsuleEntry
): Promise<{ success: boolean; error?: string }> {
  // Update status to sending
  await updateOutboxEntry(entry.id, { status: 'sending', errorMessage: undefined });

  // Check if photo URIs are still valid
  const invalidUris = await getInvalidPhotoUris(entry);
  if (invalidUris.length > 0) {
    await updateOutboxEntry(entry.id, {
      status: 'failed',
      errorMessage: 'Photo expired. Please re-select the photo.',
    });
    return { success: false, error: 'Photo expired. Please re-select the photo.' };
  }

  try {
    const result = await sendEmail({
      to: entry.childEmail,
      subject: entry.subject,
      body: entry.body,
      photoUri: entry.photoUris?.[0],
    });

    if (result.success) {
      // Remove from outbox on success
      await removeFromOutbox(entry.id);
      return { success: true };
    } else {
      await updateOutboxEntry(entry.id, {
        status: 'failed',
        errorMessage: result.error,
      });
      return { success: false, error: result.error };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await updateOutboxEntry(entry.id, {
      status: 'failed',
      errorMessage,
    });
    return { success: false, error: errorMessage };
  }
}

// Auto-retry all pending entries (called on app open)
export async function autoRetryPending(): Promise<{
  attempted: number;
  succeeded: number;
  failed: number;
}> {
  // Check network availability first
  const networkState = await Network.getNetworkStateAsync();
  if (!networkState.isConnected || !networkState.isInternetReachable) {
    return { attempted: 0, succeeded: 0, failed: 0 };
  }

  const entries = await getOutboxEntries();
  const pendingEntries = entries.filter(
    (e) => e.status === 'pending' || e.status === 'failed'
  );

  if (pendingEntries.length === 0) {
    return { attempted: 0, succeeded: 0, failed: 0 };
  }

  let succeeded = 0;
  let failed = 0;

  for (const entry of pendingEntries) {
    const result = await retrySendEntry(entry);
    if (result.success) {
      succeeded++;
    } else {
      failed++;
    }
  }

  return {
    attempted: pendingEntries.length,
    succeeded,
    failed,
  };
}
