export interface ChildProfile {
  id: string;
  name: string;
  birthday: string; // ISO date string
  email: string;
  createdAt: string; // ISO date string
  isDefault: boolean;
}

export interface CapsuleEntry {
  id: string;
  childId: string;
  text?: string;
  photoUris?: string[];
  voiceUri?: string;
  createdAt: string;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  errorMessage?: string;
  dayNumber: number;
}

export interface GmailAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  userEmail: string;
}
