// ============================================================
// GOOGLE CALENDAR REMINDER APP - CONFIGURATION
// ============================================================
// IMPORTANT: Replace the CLIENT_ID below with your own.
// Follow the setup instructions in the app to get your Client ID.
// ============================================================

const CONFIG = {
  // Replace this with your Google OAuth 2.0 Client ID
  // Get it from: https://console.cloud.google.com/apis/credentials
  CLIENT_ID: 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com',

  // Google Calendar API scope (read-only access)
  SCOPES: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',

  // Discovery doc for Google Calendar API
  DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',

  // How often to poll for new events (in milliseconds)
  POLL_INTERVAL: 60000, // 60 seconds

  // Default reminder advance time (minutes before event)
  DEFAULT_REMINDER_MINUTES: 15,

  // Snooze options (in minutes)
  SNOOZE_OPTIONS: [
    { label: '5 minutes', value: 5 },
    { label: '10 minutes', value: 10 },
    { label: '15 minutes', value: 15 },
    { label: '30 minutes', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '2 hours', value: 120 },
  ],

  // How many days ahead to fetch events
  FETCH_DAYS_AHEAD: 1,

  // Notification sound (base64-encoded short chime)
  ENABLE_SOUND: true,

  // Maximum events to display in agenda
  MAX_AGENDA_EVENTS: 50,
};
