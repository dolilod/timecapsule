import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { ChildProfile } from '@/types';

const STORAGE_KEYS = {
  CHILD_PROFILES: 'child_profiles',
  DEFAULT_CHILD_ID: 'default_child_id',
} as const;

export async function getChildProfiles(): Promise<ChildProfile[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CHILD_PROFILES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading child profiles:', error);
    return [];
  }
}

export async function getDefaultChild(): Promise<ChildProfile | null> {
  try {
    const profiles = await getChildProfiles();
    const defaultChild = profiles.find((p) => p.isDefault);
    return defaultChild || profiles[0] || null;
  } catch (error) {
    console.error('Error getting default child:', error);
    return null;
  }
}

export async function saveChildProfile(
  profile: Omit<ChildProfile, 'id' | 'createdAt' | 'isDefault'>
): Promise<ChildProfile> {
  const profiles = await getChildProfiles();

  const newProfile: ChildProfile = {
    ...profile,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    isDefault: profiles.length === 0, // First child is default
  };

  const updatedProfiles = [...profiles, newProfile];
  await AsyncStorage.setItem(
    STORAGE_KEYS.CHILD_PROFILES,
    JSON.stringify(updatedProfiles)
  );

  return newProfile;
}

export async function updateChildProfile(
  id: string,
  updates: Partial<Omit<ChildProfile, 'id' | 'createdAt'>>
): Promise<ChildProfile | null> {
  const profiles = await getChildProfiles();
  const index = profiles.findIndex((p) => p.id === id);

  if (index === -1) return null;

  const updatedProfile = { ...profiles[index], ...updates };
  profiles[index] = updatedProfile;

  await AsyncStorage.setItem(
    STORAGE_KEYS.CHILD_PROFILES,
    JSON.stringify(profiles)
  );

  return updatedProfile;
}

export async function deleteChildProfile(id: string): Promise<boolean> {
  const profiles = await getChildProfiles();
  const filteredProfiles = profiles.filter((p) => p.id !== id);

  if (filteredProfiles.length === profiles.length) return false;

  // If we deleted the default, make the first remaining child default
  if (filteredProfiles.length > 0 && !filteredProfiles.some((p) => p.isDefault)) {
    filteredProfiles[0].isDefault = true;
  }

  await AsyncStorage.setItem(
    STORAGE_KEYS.CHILD_PROFILES,
    JSON.stringify(filteredProfiles)
  );

  return true;
}

export async function setDefaultChild(id: string): Promise<boolean> {
  const profiles = await getChildProfiles();
  const updatedProfiles = profiles.map((p) => ({
    ...p,
    isDefault: p.id === id,
  }));

  await AsyncStorage.setItem(
    STORAGE_KEYS.CHILD_PROFILES,
    JSON.stringify(updatedProfiles)
  );

  return true;
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  const profiles = await getChildProfiles();
  return profiles.length > 0;
}

// Utility: Calculate day number from birthday
export function calculateDayNumber(birthday: string): number {
  const birthDate = new Date(birthday);
  const today = new Date();
  const diffTime = today.getTime() - birthDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Day 1 is birth day
}

// Utility: Calculate age string from birthday
export function calculateAge(birthday: string): string {
  const birthDate = new Date(birthday);
  const today = new Date();

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();

  if (months < 0) {
    years--;
    months += 12;
  }

  if (today.getDate() < birthDate.getDate()) {
    months--;
    if (months < 0) {
      years--;
      months += 12;
    }
  }

  if (years === 0) {
    return `${months} month${months !== 1 ? 's' : ''}`;
  }

  return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
}

// Utility: Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
