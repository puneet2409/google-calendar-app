# CalRemind - Premium Google Calendar Reminder App

A sleek, modern, and Outlook-inspired web application that connects to Google Calendar to provide reliable and persistent meeting reminders.

## Features
- **Real-Time Synchronization**: Connects directly to your Google Calendar and polls for upcoming events.
- **Persistent Reminders**: Never miss a meeting with persistent on-screen alerts and audio chimes.
- **Snooze Functionality**: Snooze ongoing reminders in an accessible, professional interface.
- **Modern UI**: Outlook-inspired design, polished for a seamless desk experience.
- **Client-Side Only**: Your calendar data stays in your browser. No middleman servers analyzing your private data.

## Getting Started

To use this application, you need to set up a Google Cloud Project to generate an OAuth Client ID. This is completely free and takes only a few minutes.

### 1. Generate Google OAuth Credentials
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Search for the "Google Calendar API" in the API Library and enable it.
4. Go to **APIs & Services > OAuth consent screen** and configure it. (Set user type to "External" and add `http://localhost` or your domain to authorized domains if deploying).
5. Go to **Credentials**, click **Create Credentials**, and select **OAuth client ID**.
6. Set the Application type to **Web application**.
7. Under **Authorized JavaScript origins**, add the URL where you will host this app. If running locally, add `http://localhost:5500` or whatever local server you are using.
8. Copy the generated **Client ID**.

### 2. Configure the Application
Open `config.js` in a text editor and replace the placeholder with your actual Client ID:
```javascript
const CONFIG = {
  CLIENT_ID: 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com',
  // ...
};
```

### 3. Run the App
Since this app uses modern browser features and OAuth, it must be served on a local or remote web server. Opening `index.html` directly (`file://` protocol) will block the Google API.

**Option A: VS Code Live Server (Recommended)**
1. Install [Visual Studio Code](https://code.visualstudio.com/).
2. Install the **Live Server** extension.
3. Open this folder in VS Code, right-click `index.html`, and choose **Open with Live Server**.

**Option B: Python**
Run the following in your terminal from this folder:
```bash
python -m http.server 8000
```
Then go to `http://localhost:8000` in your browser.

## Deployment for Public Use
Because this relies strictly on HTML, CSS, and JS, this app can be published for free using **GitHub Pages**, **Vercel**, or **Netlify**. Ensure that whenever you deploy it, you add its final URL to your Google Cloud Console's "Authorized JavaScript origins".

## License
MIT License. Free for personal use.
