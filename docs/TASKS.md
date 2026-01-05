# Implementation Tasks — Copy-Paste Prompts

Use these prompts one-by-one with your AI coding agent. Commit after each task passes smoke tests.

---

## Pre-flight Checklist

```bash
# Ensure you're in the timecapsule directory
cd timecapsule

# After each task:
git add . && git commit -m "feat: <task-name>"
```

---

## Task A: Navigation + Local Child Profile

**Branch:** `feat/child-profile`

**Prompt for AI agent:**

> Read `docs/SPEC.md`. Implement the onboarding flow and local persistence of a single Child Profile.
>
> Requirements:
> - Expo Router with tabs: (1) Compose (2) Settings
> - Child Profile model: id (UUID), name, birthday, email, createdAt, isDefault
> - Store in AsyncStorage
> - Onboarding screen appears if no child profile exists
> - Basic email format validation
> - Settings screen shows current child info and allows editing
> - TypeScript throughout
>
> Do NOT implement: Gmail auth, prompts, photo picker, notifications
>
> After changes, tell me how to test manually with `npx expo start`.

**Acceptance criteria:**
- [ ] App boots without errors
- [ ] First launch shows onboarding
- [ ] Can create child profile with name, birthday, email
- [ ] Profile persists across app restart
- [ ] Settings screen shows and can edit profile
- [ ] Invalid email shows error

---

## Task B: Compose Screen (Prompt + Text + Photo)

**Branch:** `feat/compose`

**Prompt for AI agent:**

> Read `docs/SPEC.md` and `docs/prompts.json`. Implement the Compose screen.
>
> Requirements:
> - Daily prompt displayed at top of compose screen
> - Prompt selection based on child's age (use ageBuckets from prompts.json)
> - "Refresh" button cycles to next prompt in same age bucket
> - Text input field (single line encouraged but allow multiline)
> - Photo picker: camera and library options using expo-image-picker
> - "Send" button that for now just console.logs the payload and shows success toast
> - Calculate Day N from child's birthday
> - Low floor: send button enabled if photo OR text exists
>
> Do NOT implement: Gmail API, voice recording, actual email sending
>
> After changes, provide manual test steps.

**Acceptance criteria:**
- [ ] Compose screen shows age-appropriate prompt
- [ ] Refresh button shows new prompt
- [ ] Can enter text
- [ ] Can add photo from camera
- [ ] Can add photo from library
- [ ] Send button logs correct payload with Day N
- [ ] Send works with photo-only (no text)

---

## Task C: Notifications

**Branch:** `feat/notifications`

**Prompt for AI agent:**

> Read `docs/SPEC.md`. Add daily local push notification scheduling.
>
> Requirements:
> - Use expo-notifications
> - Schedule daily notification at user-configured time (default 8:00 PM)
> - Notification text: "Time to capture today's moment for {ChildName}"
> - Settings screen: time picker for reminder
> - Notification tap deep-links to Compose screen
> - Request notification permissions in onboarding
>
> After changes, provide manual test steps (can test with shorter interval for dev).

**Acceptance criteria:**
- [ ] Permission request works
- [ ] Settings shows reminder time picker
- [ ] Notification fires at scheduled time
- [ ] Tapping notification opens Compose

---

## Task D: Gmail OAuth + Send

**Branch:** `feat/gmail`

**Prompt for AI agent:**

> Read `docs/SPEC.md`. Implement Gmail OAuth and email sending.
>
> Requirements:
> - OAuth 2.0 with PKCE for native apps
> - Request ONLY scope: `https://www.googleapis.com/auth/gmail.send`
> - Use expo-auth-session for OAuth flow
> - Store tokens securely (expo-secure-store)
> - Implement token refresh
> - Gmail API: `users.messages.send` with base64url RFC 2822 message
> - Support text body + optional photo attachment (MIME multipart)
> - Email format per SPEC.md (Subject: Day N — Date — ChildName)
> - Settings: show "Connected as email@gmail.com ✓" or "Connect Gmail" button
> - Handle send errors gracefully
>
> Do NOT request: gmail.readonly, gmail.modify, or any other scope
>
> Note: You'll need to create a Google Cloud project and OAuth client ID (type: iOS/Android). Provide setup instructions.

**Acceptance criteria:**
- [ ] OAuth flow completes without errors
- [ ] Tokens stored securely
- [ ] Send button actually sends email via Gmail API
- [ ] Email arrives at child's email with correct subject/body format
- [ ] Photo attachment works
- [ ] Settings shows connected email
- [ ] Can disconnect and reconnect

---

## Task E: Offline Outbox

**Branch:** `feat/outbox`

**Prompt for AI agent:**

> Read `docs/SPEC.md`. Implement offline outbox queue for reliability.
>
> Requirements:
> - On send failure (network error, API error): store entry locally
> - CapsuleEntry model per SPEC.md: id, childId, text, photoUris, status, errorMessage, dayNumber
> - Background retry when app opens + network available
> - New Outbox screen (add to navigation)
> - Outbox shows pending items with retry button
> - Show "Queued ✓" feedback on send failure
> - Remove from outbox only after successful send
> - Handle photo URIs that may have expired (re-pick or show warning)
>
> After changes, provide test steps (can test by disabling network).

**Acceptance criteria:**
- [ ] Send failure queues to outbox (not lost)
- [ ] Outbox screen shows pending items
- [ ] Manual retry works
- [ ] Auto-retry on app open works
- [ ] Successful retry removes from outbox
- [ ] UI shows queued status appropriately

---

## Post-MVP Polish (Optional)

These are not required for MVP but nice to have:

### Task F: Voice Recording
> Add hold-to-record voice note using expo-av. Attach as audio file to email.

### Task G: Multiple Children
> Support multiple child profiles. Add child switcher. First child free, paywall for additional.

### Task H: Location Tag
> Optional location in email body. Request location permission. Show city name.

---

## Git Workflow Reminder

```bash
# Before each task
git checkout main
git pull
git checkout -b feat/<task-name>

# After task passes
git add .
git commit -m "feat: <task-name>"
git checkout main
git merge feat/<task-name>
git push
```
