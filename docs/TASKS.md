# Implementation Tasks — Copy-Paste Prompts

Use these prompts one-by-one with your AI coding agent. Commit after each task passes smoke tests.

---

## Agent Preamble (paste before EVERY task)

```
You are working in an Expo + React Native + TypeScript repo following `docs/SPEC.md` and `docs/TASKS.md`.

**Hard rules:**

* Implement ONLY what this task asks. Do not add "nice to haves."
* Keep dependencies minimal; prefer Expo SDK / Expo Router idioms.
* TypeScript everywhere; no `any` unless unavoidable.
* No backend for MVP unless the task explicitly requires it.
* No server-side storage of user content (text/photos/audio).
* After implementing, output: (1) files changed (2) manual test steps (3) any known limitations.
* Do not request or add any Gmail scope beyond `https://www.googleapis.com/auth/gmail.send` (Task D only).

If you encounter a spec conflict, keep the smallest change that satisfies acceptance criteria and point out the conflict in the final notes.
```

---

## Pre-flight Checklist

```bash
# Ensure you're in the timecapsule directory
cd timecapsule

# After each task:
git add . && git commit -m "feat: <task-name>"
```

---

## Sanity Checklist (run after each task)

### General
- [ ] App boots cleanly
- [ ] No surprise new screens/features beyond task
- [ ] TypeScript builds without errors (`npx tsc --noEmit`)
- [ ] Only expected packages added

### Task D Specific (Gmail OAuth)
- [ ] Scope is exactly `https://www.googleapis.com/auth/gmail.send`
- [ ] Uses PKCE (code challenge + verifier)
- [ ] Testing in dev build, NOT Expo Go
- [ ] Android: custom URI scheme enabled in Cloud Console if needed

---

## Task A: Navigation + Local Child Profile ✅

**Branch:** `feat/child-profile`

**Prompt for AI agent:**

> Read `docs/SPEC.md`. Implement onboarding + local persistence of a single `ChildProfile` using AsyncStorage.
>
> Must include:
> - Expo Router Tabs: Compose + Settings
> - On first launch with no profile: show onboarding (cannot access tabs until created)
> - Basic email validation (format-level)
> - Settings allows edit of name, birthday, email and persists
> - `ChildProfile` matches spec (UUID id, createdAt, isDefault)
>
> Constraints:
> - Keep UI minimal.
> - Do NOT implement Gmail auth, prompts, photos, notifications, outbox.
> - Create a small `services/storage.ts` wrapper and `types/index.ts`.
>
> Output: files changed + manual test steps using `npx expo start`.

**Acceptance criteria:**
- [x] App boots without errors
- [x] First launch shows onboarding
- [x] Can create child profile with name, birthday, email
- [x] Profile persists across app restart
- [x] Settings screen shows and can edit profile
- [x] Invalid email shows error

---

## Task B: Compose Screen (Prompt + Text + Photo) ✅

**Branch:** `feat/compose`

**Prompt for AI agent:**

> Read `docs/SPEC.md` and local prompts JSON. Implement Compose screen UX: prompt + text + photo + "mock send".
>
> Must include:
> - Age-bucket prompt selection (based on child age today)
> - Refresh cycles within same bucket (persist "used prompts" locally)
> - Text input
> - Photo picker: camera + library using `expo-image-picker`
> - Day number = days since birthday + 1 (Day 1 = birthday)
> - Send enabled if text OR photo exists (photo-only counts)
> - Send button logs payload + shows success feedback
>
> Constraints:
> - No Gmail API, no voice, no notifications, no outbox.
>
> Output: files changed + manual test steps.

**Acceptance criteria:**
- [x] Compose screen shows age-appropriate prompt
- [x] Refresh button shows new prompt
- [x] Can enter text
- [x] Can add photo from camera
- [x] Can add photo from library
- [x] Send button logs correct payload with Day N
- [x] Send works with photo-only (no text)

---

## Task C: Notifications ✅

**Branch:** `feat/notifications`

**Prompt for AI agent:**

> Read `docs/SPEC.md`. Implement local daily notifications using `expo-notifications`.
>
> Must include:
> - Permission request during onboarding
> - Default reminder time 8:00 PM
> - Settings: reminder time picker
> - Notification text includes child name
> - Tap opens Compose route
>
> Constraints:
> - No backend, no Gmail, no outbox.
>
> Output: files changed + manual test steps (include dev-friendly short-interval testing method).

**Acceptance criteria:**
- [x] Permission request works
- [x] Settings shows reminder time picker
- [x] Notification fires at scheduled time
- [x] Tapping notification opens Compose

---

## Task D: Gmail OAuth + Send

**Branch:** `feat/gmail`

### Critical OAuth Gotchas

**1. Expo Go CANNOT be used for OAuth:**
OAuth flows won't work in Expo Go because you can't customize your app scheme. You MUST use a Development Build for proper redirects.
- Docs: https://docs.expo.dev/guides/authentication/

**2. Google blocks Android custom URI schemes by default:**
For Android OAuth clients, custom URI scheme redirects are DISABLED by default. You must enable them in OAuth client Advanced Settings in Google Cloud Console, otherwise you'll get `invalid_request` errors.
- Docs: https://developers.googleblog.com/improving-user-safety-in-oauth-flows-through-new-oauth-custom-uri-scheme-restrictions/

**3. Use PKCE (no client_secret on mobile):**
Google's installed-app flow uses PKCE. For Android/iOS native clients, `client_secret` is optional/not applicable.
- Docs: https://developers.google.com/identity/protocols/oauth2/native-app

---

**Prompt for AI agent:**

> Read `docs/SPEC.md`. Implement Gmail OAuth (send-only scope) + sending email via Gmail API.
>
> Must include:
> - OAuth authorization code flow with PKCE using `expo-auth-session`
> - Use `WebBrowser.maybeCompleteAuthSession()`, `AuthSession.makeRedirectUri()`, and `useAuthRequest()` patterns
> - Store tokens in `expo-secure-store`
> - Refresh token handling
> - Gmail API `users.messages.send` with base64url-encoded RFC 2822 MIME message (text + optional photo attachment)
> - Subject/body formatting exactly per `SPEC.md`
> - Settings shows "Connected as {email} ✓" + Connect/Disconnect button
> - Graceful send errors
>
> **Critical constraints:**
> - Scope must be ONLY `https://www.googleapis.com/auth/gmail.send`
> - Do not request gmail.readonly/modify
> - Assume we will test with an Expo Development Build (OAuth won't work in Expo Go)
> - For Android: add Google Cloud setup notes explaining that custom URI scheme redirects are disabled by default and must be enabled under OAuth client Advanced settings
> - Use PKCE code challenge + verifier per Google installed-app flow
>
> Output:
> - Step-by-step Google Cloud + Expo config instructions
> - Files changed
> - Manual test steps (including how to confirm an email arrives)

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

> Read `docs/SPEC.md`. Implement offline outbox queue for failed sends.
>
> Must include:
> - `CapsuleEntry` model per spec; persist locally
> - On send failure: queue + show "Queued ✓"
> - Outbox screen + manual retry
> - Auto retry on app open when network available
> - Remove item only after confirmed send success
> - Handle expired photo URIs (warn + allow re-pick)
>
> Constraints:
> - Do not add a feed/timeline.
>
> Output: files changed + manual test steps (include airplane-mode test).

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
