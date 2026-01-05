import AsyncStorage from '@react-native-async-storage/async-storage';
import promptsData from '@/data/prompts.json';

export interface Prompt {
  id: number;
  ageBucket: string;
  text: string;
}

export interface AgeBucket {
  id: string;
  label: string;
  minDays: number;
  maxDays: number;
}

const STORAGE_KEYS = {
  USED_PROMPTS: 'used_prompts',
  CURRENT_PROMPT: 'current_prompt',
} as const;

// Get prompts and age buckets from the JSON data
export function getAllPrompts(): Prompt[] {
  return promptsData.prompts as Prompt[];
}

export function getAgeBuckets(): AgeBucket[] {
  return promptsData.ageBuckets as AgeBucket[];
}

// Determine age bucket based on days since birth
export function getAgeBucketForDays(days: number): AgeBucket | null {
  const buckets = getAgeBuckets();
  return buckets.find((b) => days >= b.minDays && days <= b.maxDays) || null;
}

// Get prompts for a specific age bucket
export function getPromptsForBucket(bucketId: string): Prompt[] {
  return getAllPrompts().filter((p) => p.ageBucket === bucketId);
}

// Get used prompt IDs from storage
async function getUsedPromptIds(): Promise<number[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USED_PROMPTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Mark a prompt as used
async function markPromptUsed(promptId: number): Promise<void> {
  const used = await getUsedPromptIds();
  if (!used.includes(promptId)) {
    used.push(promptId);
    await AsyncStorage.setItem(STORAGE_KEYS.USED_PROMPTS, JSON.stringify(used));
  }
}

// Get a random prompt for the given age bucket, preferring unused ones
export async function getRandomPromptForAge(daysSinceBirth: number): Promise<Prompt | null> {
  const bucket = getAgeBucketForDays(daysSinceBirth);
  if (!bucket) {
    // Default to the closest bucket
    const buckets = getAgeBuckets();
    const closest = daysSinceBirth < buckets[0].minDays ? buckets[0] : buckets[buckets.length - 1];
    return getRandomPromptFromBucket(closest.id);
  }
  return getRandomPromptFromBucket(bucket.id);
}

async function getRandomPromptFromBucket(bucketId: string): Promise<Prompt | null> {
  const prompts = getPromptsForBucket(bucketId);
  if (prompts.length === 0) return null;

  const usedIds = await getUsedPromptIds();
  const unusedPrompts = prompts.filter((p) => !usedIds.includes(p.id));

  // If all prompts have been used, reset and use all
  const availablePrompts = unusedPrompts.length > 0 ? unusedPrompts : prompts;

  const randomIndex = Math.floor(Math.random() * availablePrompts.length);
  const selectedPrompt = availablePrompts[randomIndex];

  await markPromptUsed(selectedPrompt.id);
  return selectedPrompt;
}

// Get next prompt in the same bucket (for refresh)
export async function getNextPromptInBucket(
  currentPromptId: number,
  daysSinceBirth: number
): Promise<Prompt | null> {
  const bucket = getAgeBucketForDays(daysSinceBirth);
  if (!bucket) return getRandomPromptForAge(daysSinceBirth);

  const prompts = getPromptsForBucket(bucket.id);
  const currentIndex = prompts.findIndex((p) => p.id === currentPromptId);

  if (currentIndex === -1) {
    return getRandomPromptForAge(daysSinceBirth);
  }

  // Get the next prompt in the list, cycling back to start
  const nextIndex = (currentIndex + 1) % prompts.length;
  const nextPrompt = prompts[nextIndex];

  await markPromptUsed(nextPrompt.id);
  return nextPrompt;
}

// Save current prompt for the session
export async function saveCurrentPrompt(promptId: number): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_PROMPT, String(promptId));
}

// Get saved current prompt
export async function getSavedCurrentPrompt(): Promise<number | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_PROMPT);
    return data ? parseInt(data, 10) : null;
  } catch {
    return null;
  }
}

// Clear current prompt (after sending)
export async function clearCurrentPrompt(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_PROMPT);
}
