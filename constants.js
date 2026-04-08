/**
 * CalRemind — Application Constants
 * v1.0.0
 * All timing, limits and configuration values in one place.
 */

const CONSTANTS = {
  // ── Polling ────────────────────────────────────────────────────────────
  POLL_INTERVAL_IMMINENT_MS : 30_000,   // < 15 min to meeting
  POLL_INTERVAL_NEAR_MS     : 60_000,   // 15–60 min to meeting
  POLL_INTERVAL_FAR_MS      : 5 * 60_000, // > 60 min / no meetings
  POLL_INTERVAL_IDLE_MS     : 10 * 60_000,// no events today

  // ── Reminders ──────────────────────────────────────────────────────────
  DEFAULT_REMINDER_MS   : 15 * 60_000,
  SNOOZE_OPTIONS_MIN    : [5, 10, 15, 30],   // minutes
  REMINDER_CHECK_MS     : 30_000,            // how often to check if a reminder should fire
  REMINDER_DEDUP_WINDOW : 60_000,            // don't re-fire within this window

  // ── Calendar API ───────────────────────────────────────────────────────
  MAX_EVENTS_PER_FETCH  : 50,
  EVENTS_LOOKAHEAD_DAYS : 1,           // only fetch today's events
  RETRY_BACKOFF_BASE_MS : 5_000,
  RETRY_MAX_ATTEMPTS    : 3,

  // ── Storage keys ───────────────────────────────────────────────────────
  STORAGE_CLIENT_ID     : 'cr_client_id',
  STORAGE_SETTINGS      : 'cr_settings_v1',
  STORAGE_SETUP_DONE    : 'cr_setup_done',
  STORAGE_DISMISSED     : 'cr_dismissed_v1',
  STORAGE_SNOOZED       : 'cr_snoozed_v1',
  STORAGE_SESSION_TTL_MS: 24 * 60 * 60_000,  // 1 day expiry on cached data

  // ── UI ─────────────────────────────────────────────────────────────────
  TOAST_DURATION_MS     : 4_000,
  CLOCK_UPDATE_MS       : 1_000,
  ANIMATION_MS          : 200,

  // ── Video-link patterns ────────────────────────────────────────────────
  VIDEO_LINK_PATTERNS   : [
    /https:\/\/meet\.google\.com\/[^\s"<>]+/,
    /https:\/\/zoom\.us\/j\/[^\s"<>]+/,
    /https:\/\/teams\.microsoft\.com\/[^\s"<>]+/,
    /https:\/\/[^\s"<>]+\.webex\.com\/[^\s"<>]+/,
  ],
};

// Freeze to prevent accidental mutation
Object.freeze(CONSTANTS);
