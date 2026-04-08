# CalRemind — Google Calendar Reminder App

![Version](https://img.shields.io/badge/version-1.0.0-6366F1?style=flat-square)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)
![Google Calendar API](https://img.shields.io/badge/Google%20Calendar-API-blue?style=flat-square&logo=google-calendar)
![Made with JavaScript](https://img.shields.io/badge/Made%20with-Vanilla%20JS-yellow?style=flat-square)
![Privacy First](https://img.shields.io/badge/Privacy-Client--Side%20Only-green?style=flat-square)

A sleek, modern, Outlook-inspired web application that connects to Google Calendar to provide reliable, persistent meeting reminders — with a one-click **Join** button for Google Meet, Zoom, Teams, and Webex.

> **v1.0.0** — Major security, performance, and accessibility release. See [CHANGELOG.md](CHANGELOG.md) for the full list of improvements.

---

## Features

| Feature | Details |
|---|---|
| **Real-Time Sync** | Connects directly to Google Calendar; adaptive polling (30 s → 10 min) |
| **Multi-Calendar** | Fetches all your selected calendars, not just primary |
| **Persistent Reminders** | Never miss a meeting — grouped popups with snooze (5/10/15/30 min) |
| **One-Click Join** | Auto-detects Meet, Zoom, Teams & Webex links in events |
| **Offline Resilience** | Service worker caches last events — reminders survive connectivity drops |
| **Keyboard Accessible** | `Escape` dismisses · `Ctrl+S` snoozes · Full ARIA dialog roles |
| **Privacy First** | 100% client-side — your calendar data never leaves your browser |
| **Smart Polling** | Pauses when tab is hidden; incremental sync saves ~90% API quota |

---

## Security

- **No Client ID in version control** — `config.js` is gitignored. Copy `config.example.js` and fill in your own ID.
- **Content Security Policy** — blocks XSS escalation from injected event data.
- **All event data via `textContent`** — never `innerHTML`. Maliciously named events can't run scripts.
- **LocalStorage TTL** — session data expires after 24 hours on shared machines.

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/puneet2409/google-calendar-app.git
cd google-calendar-app
```

### 2. Create your config

```bash
cp config.example.js config.js
```

Open `config.js` and paste your Google OAuth Client ID (see step 3).

### 3. Generate Google OAuth Credentials (free, ~3 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a project.
2. Enable the **Google Calendar API** in the API Library.
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
4. Application type: **Web application**.
5. Add your URL to **Authorized JavaScript origins** (e.g. `http://localhost:5500`).
6. Copy the **Client ID** and paste it into `config.js`.

> The in-app setup wizard walks you through every step with direct links.

### 4. Run the App

**Option A — VS Code Live Server (recommended)**
- Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension.
- Right-click `index.html` → **Open with Live Server**.

**Option B — Python**
```bash
python -m http.server 8000
# Open http://localhost:8000
```

---

## Deployment

This app is pure HTML/CSS/JS — deploy for free on:

| Platform | Command / Notes |
|---|---|
| **GitHub Pages** | Push to `main`; enable Pages in repo settings |
| **Vercel** | `vercel --prod` |
| **Netlify** | Drag-and-drop the folder |

After deploying, add your live URL to **Authorized JavaScript origins** in Google Cloud Console.

---

## Project Structure

```
calremind/
├── index.html          # App shell with CSP, ARIA, PWA meta
├── style.css           # All styles
├── app.js              # Main application logic (v1.0.0)
├── constants.js        # All timing/config constants
├── sw.js               # Service worker (offline support)
├── config.example.js   # Safe config template (committed)
├── config.js           # Your real Client ID (gitignored ⚠️)
├── CHANGELOG.md        # Version history
└── .gitignore
```

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Escape` | Dismiss all reminders |
| `Ctrl + S` | Snooze top reminder (5 min) |

---

## Privacy

CalRemind is **100% client-side**. Your Google OAuth token and calendar data are stored only in your browser's memory and localStorage. No data is sent to any third-party server. The only external connections are to Google's own APIs.

---

## License

MIT — free for personal and commercial use.

---

*Built with Antigravity · [@puneet2409](https://github.com/puneet2409)*
