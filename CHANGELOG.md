# Changelog

All notable changes to CalRemind are documented here.

---

## [1.0.0] — 2026-04-08

### Security
- **[Critical fix]** `config.js` added to `.gitignore` — Client ID can no longer be accidentally committed to version control. Replaced with `config.example.js` template.
- **[High fix]** Added `Content-Security-Policy` meta tag — whitelists only Google APIs and Lucide CDN, blocking XSS escalation.
- **[High fix]** All event data (titles, locations, descriptions) now rendered via `textContent` — never `innerHTML`. Eliminates XSS from maliciously named calendar events.
- **[Medium fix]** `localStorage` now wrapped with 24-hour TTL on session data — prevents stale calendar data leaking to the next user of a shared machine.

### Performance
- **[High fix]** Adaptive polling — interval scales from 30 s (imminent meeting) → 10 min (no events today) instead of a fixed 60 s.
- **[High fix]** Polling pauses when the browser tab is hidden (`visibilitychange` API) — no API quota consumed while you're in another tab.
- **[Medium fix]** Incremental sync via Google Calendar `syncToken` — after the first full fetch, only diffs are pulled (~90% fewer API calls).
- **[Medium fix]** Explicit GAPI readiness guard — app waits for Google scripts to load before initialising, eliminating silent startup failures.

### Reliability
- **[High fix]** Structured error handling: HTTP 401 → triggers re-auth, 410 → full re-sync (expired syncToken), 429 → exponential back-off with toast notification, others → error toast + console with `[CalRemind]` prefix.
- **[Medium fix]** Timezone handling now reads `event.start.timeZone` from the Calendar API response instead of relying on the browser's system timezone.

### UX & Features
- **[High fix]** Keyboard accessibility on reminder popup: `Escape` dismisses, `Ctrl+S` snoozes, focus is trapped inside the dialog, first button is auto-focused on open.
- **[High fix]** ARIA roles added: `role="dialog"`, `aria-modal="true"`, `aria-live="assertive"` on reminder popup; `role="status"`, `aria-live="polite"` on status bar and toasts.
- **[New]** Multi-calendar support — fetches all calendars the user has selected in Google Calendar, not just `primary`.
- **[New]** Auto video-link detection — scans event location and description for Google Meet, Zoom, Teams, and Webex URLs. Shows a one-click **Join** button on the reminder popup and event cards.
- **[New]** Reminder grouping — back-to-back meetings that fire simultaneously are shown in a single popup instead of stacking multiple dialogs.
- **[New]** Snooze multi-option buttons (5 / 10 / 15 / 30 min) directly on each reminder item.
- **[New]** PWA / offline support — service worker (`sw.js`) caches app shell and last-fetched event data, so reminders survive brief connectivity drops.

### Code Quality
- **[High fix]** Extracted all magic numbers into `constants.js` — single source of truth for poll intervals, snooze durations, storage keys, etc.
- **[New]** `Session` helper module — wraps localStorage with TTL, safe JSON parsing, and a separation between session-scoped and permanent (preference) data.
- **[New]** `safeText()` helper — enforces `textContent` over `innerHTML` app-wide.
- **[New]** `extractVideoLink()` — centralised video-link detection using CONSTANTS.VIDEO_LINK_PATTERNS.
- **[New]** `eventStartDate()` — handles both timed (`dateTime`) and all-day (`date`) events correctly.

---

## [0.x] — Pre-release

Initial prototype — client-side Google Calendar reminder app with OAuth setup wizard, Outlook-inspired UI, persistent reminders, and snooze functionality.
