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
  childName: string;
  childEmail: string;
  text?: string;
  photoUris?: string[];
  voiceUri?: string;
  createdAt: string;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  errorMessage?: string;
  dayNumber: number;
  age: string; // e.g., "4 years, 2 months"
  subject: string; // Pre-formatted email subject
  body: string; // Pre-formatted email body
}

export interface GmailAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  userEmail: string;
}
