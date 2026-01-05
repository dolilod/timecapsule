# Time Capsule Mobile App — MVP Specification (v1.0)

## Overview

**Digital Time Capsule** — a mobile app that makes it effortless for parents to send daily memories to a dedicated child email address (e.g., `childname@gmail.com`) that the child opens at 18.

---

## Non-Negotiables

- Gmail send-only scope in v1 (`gmail.send`) — no reading inbox
- No server-side storage of user content (text/photos/audio)
- One-tap compose: open → capture → send in <15 seconds
- Low floor: photo-only counts as "done"
- No streak guilt mechanics (no punishment for missed days)
- Email is the archive: if the app dies, the kid still has everything

---

## Tech Stack

- **Framework:** React Native (Expo) + TypeScript
- **Navigation:** Expo Router
- **Local Storage:** AsyncStorage for drafts/outbox/profiles
- **Auth:** Gmail OAuth 2.0 with PKCE (native app flow)
- **Scope:** `https://www.googleapis.com/auth/gmail.send` only
- **Backend:** Minimal — only for remote config/prompts (can be stubbed with local JSON)

---

## MVP Screens

### 1. Onboarding Flow
- Create Child Profile: name, birthday (for "Day N" calculation), destination email
- Connect sender via Gmail OAuth (send-only scope)
- Request permissions: notifications, camera/photos

### 2. Compose Screen (Main)
- Opens directly to compose for default child
- Daily prompt displayed at top (tap to refresh)
- Input options:
  - Text input (1 line encouraged)
  - Add photo (camera or library)
  - Record voice note (hold to record)
- One-tap Send button
- Post-send micro-reward: "Delivered ✅ Day {N} added."

### 3. Settings Screen
- Child profile management (edit name, birthday, email)
- Switch between children (if multiple)
- Reminder time configuration
- Prompt theme selection
- Gmail connection status
- Export/help text

### 4. Outbox Screen (for offline reliability)
- List of pending/failed sends
- Retry button for each item
- Auto-retry on app open when network available

---

## Email Format (Metadata Injection)

**Subject:** `Day {N} — {YYYY-MM-DD} — {ChildName}`

**Body:**
```
Day {N} • Age {X years, Y months} • {optional city}

{User's message text}

#timecapsule
```

**Attachments:** Photos (auto-downscaled if >5MB), voice notes

---

## Data Models

### ChildProfile
```typescript
interface ChildProfile {
  id: string;           // UUID
  name: string;
  birthday: Date;
  email: string;
  createdAt: Date;
  isDefault: boolean;
}
```

### CapsuleEntry (for outbox)
```typescript
interface CapsuleEntry {
  id: string;
  childId: string;
  text?: string;
  photoUris?: string[];
  voiceUri?: string;
  createdAt: Date;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  errorMessage?: string;
  dayNumber: number;
}
```

### GmailAuth
```typescript
interface GmailAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  userEmail: string;
}
```

---

## Gmail API Integration

### OAuth Flow (PKCE for native apps)
1. Generate code verifier (random 43-128 char string)
2. Create code challenge (SHA256 hash, base64url encoded)
3. Open auth URL: `https://accounts.google.com/o/oauth2/v2/auth`
4. Exchange code for tokens at: `https://oauth2.googleapis.com/token`

### Sending Email
- Endpoint: `POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send`
- Body: `{ "raw": "<base64url-encoded-RFC2822-message>" }`
- Scope required: `gmail.send`

### RFC 2822 Message Format
```
From: sender@gmail.com
To: child@gmail.com
Subject: Day 42 — 2025-01-05 — Altaira
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="boundary123"

--boundary123
Content-Type: text/plain; charset="UTF-8"

Day 42 • Age 4 years, 2 months

Today you said "I love pancakes more than the moon"

#timecapsule
--boundary123
Content-Type: image/jpeg
Content-Transfer-Encoding: base64
Content-Disposition: attachment; filename="photo.jpg"

<base64-encoded-image-data>
--boundary123--
```

---

## Prompt System

- Prompts stored in local JSON file (50 prompts, age-bucketed)
- Age buckets: 0-12mo, 1-3yr, 3-5yr, 5-10yr, 10-18yr
- Daily prompt selected based on child's current age
- Refresh button cycles to next prompt in bucket
- Track which prompts have been used (local storage)

---

## Notifications

- Daily local push notification at user-configured time
- Default: 8:00 PM
- Notification text: "Time to capture today's moment for {ChildName}"
- Tap opens directly to Compose screen

---

## Offline Handling

1. On send failure (network/API error):
   - Store entry in local outbox
   - Show "Queued for retry" feedback
2. On app open:
   - Check for pending outbox items
   - Attempt to send in background
3. Outbox screen shows all pending items with retry option

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Invalid child email | Show validation error before save |
| Gmail auth expires | Auto-refresh token; if fails, prompt re-auth |
| Photo too large (>10MB) | Auto-downscale to ~2MB |
| Network fails during send | Queue to outbox, retry later |
| User has multiple kids | Support multiple profiles (v1: max 1 free, paywall for more) |
| Bounce/delivery failure | Show "delivery failed" if API returns error |

---

## Success Metrics (for reference)

- **Activation:** % who connect Gmail + create child in first session
- **Day-2 send rate**
- **Day-7 send rate**
- **10+ entries in 14 days** (north star)
- **Median time-to-send** (open → send)
- **Prompt engagement:** % using prompt vs blank

---

## What's NOT in v1

- No in-app timeline/feed of memories (email inbox is the feed)
- No AI ghostwriting
- No multi-provider (Outlook/iCloud) — Gmail only
- No collaboration/multi-sender
- No `gmail.readonly` or `gmail.modify` scopes
- No server-side content storage

---

## Implementation Task Order

### Task A: Navigation + Local Child Profile
- Expo Router tabs (Compose, Settings)
- Local persistence of Child Profile
- Onboarding flow if no child exists
- Basic email validation

### Task B: Compose Screen
- Daily prompt display + refresh
- Text input
- Photo picker (camera + library)
- Send button (mock implementation first)
- Prompt library from local JSON

### Task C: Notifications
- Daily local push scheduling
- Configurable reminder time
- Deep link to Compose on tap

### Task D: Gmail OAuth + Send
- PKCE OAuth flow
- Token storage (secure)
- Gmail API `users.messages.send`
- RFC 2822 MIME message construction
- Photo attachment support

### Task E: Offline Outbox
- Outbox queue for failed sends
- Background retry on app open
- Outbox screen with manual retry

---

## File Structure (Target)

```
timecapsule/
├── docs/
│   └── SPEC.md
├── mobile/
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── compose.tsx
│   │   │   └── settings.tsx
│   │   ├── onboarding/
│   │   │   └── index.tsx
│   │   └── _layout.tsx
│   ├── components/
│   │   ├── PromptCard.tsx
│   │   ├── PhotoPicker.tsx
│   │   └── VoiceRecorder.tsx
│   ├── services/
│   │   ├── gmail.ts
│   │   ├── storage.ts
│   │   └── notifications.ts
│   ├── data/
│   │   └── prompts.json
│   ├── types/
│   │   └── index.ts
│   └── package.json
└── .gitignore
```
