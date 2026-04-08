/**
 * CalRemind — Configuration Template
 *
 * SETUP INSTRUCTIONS:
 * 1. Copy this file to config.js  (config.js is in .gitignore — never commit it)
 * 2. Paste your Google OAuth Client ID below
 * 3. See README.md for how to create a Client ID in Google Cloud Console
 */

const CONFIG = {
  CLIENT_ID: '',   // ← paste your Client ID here, e.g. '123456-abc.apps.googleusercontent.com'

  SCOPES: 'https://www.googleapis.com/auth/calendar.readonly',

  DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
};
