// ============================================================
//  CalRemind — Google Calendar Reminder App
//  Main Application Logic
// ============================================================

const App = (() => {
  // ---- State ----
  let tokenClient = null;
  let gapiInited = false;
  let gisInited = false;
  let accessToken = null;
  let currentUser = null;
  let events = [];
  let activeReminders = [];
  let dismissedEventIds = new Set();
  let firedReminderIds = new Set();
  let pollTimer = null;
  let countdownTimer = null;
  let reminderPopupVisible = false;
  let settingsPanelVisible = false;
  let wizardStep = 0;
  let isSignedIn = false;
  let isRestoringSession = false;
  let settings = {
    sound: true,
    browserNotif: true,
    autoPopup: true,
    defaultReminder: 15,
  };

  // ---- Audio Context for notification sound ----
  let audioCtx = null;
  function playNotificationSound() {
    if (!settings.sound) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + i * 0.15);
        gain.gain.linearRampToValueAtTime(0.15, now + i * 0.15 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + i * 0.15);
        osc.stop(now + i * 0.15 + 0.5);
      });
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }

  // ---- Initialization ----
  function init() {
    loadSettings();
    updateClock();
    setInterval(updateClock, 1000);
    updateCurrentOrigin();

    // Check if setup is already done
    const savedClientId = localStorage.getItem('calremind_client_id');
    const savedToken = sessionStorage.getItem('calremind_token');
    if (savedClientId) {
      CONFIG.CLIENT_ID = savedClientId;
      if (savedToken) {
        // Has saved session — show dashboard immediately (no flash)
        document.getElementById('setupWizard').classList.add('hidden');
        document.getElementById('signInScreen').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        document.getElementById('signInBtn').classList.add('hidden');
        document.getElementById('userInfo').classList.remove('hidden');
        document.getElementById('reminderBell').classList.remove('hidden');
        document.getElementById('settingsBtn').classList.remove('hidden');
        document.getElementById('userName').textContent = 'Reconnecting...';
        updateStatus(true);
      } else {
        // Setup done but no active session
        showSignInScreen();
      }
    } else {
      // First run — show wizard
      showWizard();
    }

    waitForLibraries();
  }

  // ---- Wizard ----
  function showWizard() {
    document.getElementById('setupWizard').classList.remove('hidden');
    document.getElementById('signInScreen').classList.add('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    wizardStep = 0;
    updateWizardUI();
  }

  function showSignInScreen() {
    document.getElementById('setupWizard').classList.add('hidden');
    document.getElementById('signInScreen').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('signInBtn').classList.remove('hidden');
  }

  function wizardNext() {
    if (wizardStep < 4) {
      wizardStep++;
      updateWizardUI();
    }
  }

  function wizardPrev() {
    if (wizardStep > 0) {
      wizardStep--;
      updateWizardUI();
    }
  }

  function updateWizardUI() {
    // Update pages
    for (let i = 0; i <= 4; i++) {
      const page = document.getElementById(`wizardStep${i}`);
      if (page) {
        page.classList.toggle('active', i === wizardStep);
      }
    }
    // Update dots
    document.querySelectorAll('.wizard-step-dot').forEach(dot => {
      const step = parseInt(dot.dataset.step);
      dot.classList.toggle('active', step === wizardStep);
      dot.classList.toggle('completed', step < wizardStep);
    });
  }

  function finishWizard() {
    const input = document.getElementById('wizardClientIdInput').value.trim();
    if (!input || !input.includes('.apps.googleusercontent.com')) {
      showToast('Please paste a valid Client ID (ends with .apps.googleusercontent.com)', 'error');
      return;
    }

    CONFIG.CLIENT_ID = input;
    localStorage.setItem('calremind_client_id', input);
    showToast('Setup complete! Signing you in...', 'success');

    // Initialize token client if GIS is ready
    if (typeof google !== 'undefined' && google.accounts) {
      initTokenClient();
    }

    // Show sign-in screen and trigger sign-in
    showSignInScreen();
    setTimeout(() => handleSignIn(), 800);
  }

  function resetSetup() {
    localStorage.removeItem('calremind_client_id');
    localStorage.removeItem('calremind_settings');
    sessionStorage.removeItem('calremind_token');
    CONFIG.CLIENT_ID = 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com';
    accessToken = null;
    tokenClient = null;
    showWizard();
    showToast('Setup reset. You can enter a new Client ID.', 'info');
  }

  // ---- Library Loading ----
  let gapiLoading = false;
  function waitForLibraries() {
    // Check immediately, then poll for availability
    tryInitGapi();
    tryInitGis();
    const checkInterval = setInterval(() => {
      tryInitGapi();
      tryInitGis();
      if (gapiInited && gisInited) {
        clearInterval(checkInterval);
      }
    }, 300);
  }

  function tryInitGapi() {
    if (gapiInited || gapiLoading || typeof gapi === 'undefined') return;
    gapiLoading = true;
    gapi.load('client', async () => {
      try {
        await gapi.client.init({
          discoveryDocs: [CONFIG.DISCOVERY_DOC],
        });
        gapiInited = true;
        console.log('✅ gapi client initialized');
        checkReady();
      } catch (e) {
        console.error('gapi init failed:', e);
        gapiLoading = false;
      }
    });
  }

  function tryInitGis() {
    if (gisInited || typeof google === 'undefined' || !google.accounts) return;
    gisInited = true;
    if (CONFIG.CLIENT_ID && CONFIG.CLIENT_ID !== 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com') {
      initTokenClient();
    }
    console.log('✅ GIS loaded');
    checkReady();
  }

  function initTokenClient() {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.CLIENT_ID,
      scope: CONFIG.SCOPES,
      callback: handleTokenResponse,
    });
  }

  function checkReady() {
    if (gapiInited && gisInited && !isSignedIn) {
      console.log('✅ App ready');
      const savedToken = sessionStorage.getItem('calremind_token');
      if (savedToken && CONFIG.CLIENT_ID !== 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com') {
        accessToken = savedToken;
        gapi.client.setToken({ access_token: savedToken });
        isRestoringSession = true;
        onSignedIn();
      }
    }
  }

  function handleTokenResponse(resp) {
    if (resp.error) {
      console.error('Token error:', resp);
      showToast('Authentication failed. Please try again.', 'error');
      return;
    }
    accessToken = resp.access_token;
    sessionStorage.setItem('calremind_token', accessToken);
    isRestoringSession = false;
    onSignedIn();
  }

  // ---- Auth Actions ----
  function handleSignIn() {
    if (!CONFIG.CLIENT_ID || CONFIG.CLIENT_ID === 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com') {
      showWizard();
      showToast('Please complete the setup first', 'info');
      return;
    }
    if (!tokenClient) {
      if (typeof google !== 'undefined' && google.accounts) {
        initTokenClient();
      } else {
        showToast('Google services are still loading. Please wait a moment and try again.', 'info');
        return;
      }
    }
    isSignedIn = false; // Allow fresh sign-in
    tokenClient.requestAccessToken({ prompt: 'consent' });
  }

  function handleSignOut() {
    if (accessToken) {
      google.accounts.oauth2.revoke(accessToken, () => {
        console.log('Token revoked');
      });
    }
    accessToken = null;
    currentUser = null;
    isSignedIn = false;
    sessionStorage.removeItem('calremind_token');
    gapi.client.setToken(null);

    // Reset UI
    showSignInScreen();
    document.getElementById('reminderBell').classList.add('hidden');
    document.getElementById('settingsBtn').classList.add('hidden');
    document.getElementById('userInfo').classList.add('hidden');
    document.getElementById('settingsAccountEmail').textContent = 'Not signed in';
    updateStatus(false);
    if (pollTimer) clearInterval(pollTimer);
    if (countdownTimer) clearInterval(countdownTimer);
    pollTimer = null;
    countdownTimer = null;
    events = [];
    activeReminders = [];
    dismissedEventIds.clear();
    firedReminderIds.clear();
    showToast('Signed out successfully', 'info');
  }

  async function onSignedIn() {
    // Guard against duplicate calls
    if (isSignedIn) return;
    isSignedIn = true;

    // Clear any existing timers from previous sessions
    if (pollTimer) clearInterval(pollTimer);
    if (countdownTimer) clearInterval(countdownTimer);

    // Show dashboard
    document.getElementById('setupWizard').classList.add('hidden');
    document.getElementById('signInScreen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');

    // Show header elements
    document.getElementById('signInBtn').classList.add('hidden');
    document.getElementById('userInfo').classList.remove('hidden');
    document.getElementById('reminderBell').classList.remove('hidden');
    document.getElementById('settingsBtn').classList.remove('hidden');
    document.getElementById('userName').textContent = 'Connected';
    updateStatus(true);

    // Only show toast on fresh sign-in, not session restore
    if (!isRestoringSession) {
      showToast('Connected to Google Calendar!', 'success');
    }
    isRestoringSession = false;

    // Fetch user info to display email in settings
    try {
      const userInfo = await gapi.client.request({ path: 'https://www.googleapis.com/oauth2/v2/userinfo' });
      if (userInfo.result && userInfo.result.email) {
        document.getElementById('userName').textContent = userInfo.result.name || userInfo.result.email;
        document.getElementById('settingsAccountEmail').textContent = userInfo.result.email;
      }
    } catch (e) {
      console.warn('Could not fetch user info:', e);
      document.getElementById('settingsAccountEmail').textContent = 'Connected';
    }

    // Request browser notification permission
    if (settings.browserNotif && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Fetch events
    await fetchEvents();

    // Start polling
    pollTimer = setInterval(fetchEvents, CONFIG.POLL_INTERVAL);

    // Start countdown ticker
    countdownTimer = setInterval(() => {
      checkReminders();
      updateCountdowns();
    }, 1000);
  }

  // ---- Calendar API ----
  async function fetchEvents() {
    try {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + CONFIG.FETCH_DAYS_AHEAD);
      tomorrow.setHours(23, 59, 59, 999);

      const response = await gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: now.toISOString(),
        timeMax: tomorrow.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: CONFIG.MAX_AGENDA_EVENTS,
      });

      events = (response.result.items || []).filter(e => e.start && (e.start.dateTime || e.start.date));
      console.log(`📅 Fetched ${events.length} events`);

      renderSidebar();
      renderMainContent();
      processReminders();
      updateLastSync();
    } catch (error) {
      console.error('Failed to fetch events:', error);
      if (error.status === 401) {
        showToast('Session expired. Please sign in again.', 'error');
        handleSignOut();
      } else {
        showToast('Failed to fetch events. Retrying...', 'error');
      }
    }
  }

  // ---- Render Sidebar ----
  function renderSidebar() {
    const now = new Date();
    document.getElementById('sidebarDate').textContent = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    document.getElementById('sidebarDay').textContent = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

    const todayEvents = events.filter(e => {
      const start = new Date(e.start.dateTime || e.start.date);
      return start.toDateString() === now.toDateString() || isAllDay(e);
    });

    document.getElementById('sidebarEventCount').textContent =
      todayEvents.length === 0 ? 'No events today' :
      `${todayEvents.length} event${todayEvents.length !== 1 ? 's' : ''} today`;

    const timeline = document.getElementById('timeline');

    if (todayEvents.length === 0) {
      timeline.innerHTML = `
        <div class="no-events">
          <div class="no-events-icon"><i data-lucide="inbox" style="width:40px;height:40px;"></i></div>
          <div class="no-events-text">No events scheduled today</div>
        </div>
      `;
      refreshIcons();
      return;
    }

    const colors = ['blue', 'green', 'amber', 'red'];
    timeline.innerHTML = todayEvents.map((event, i) => {
      const start = new Date(event.start.dateTime || event.start.date);
      const end = event.end ? new Date(event.end.dateTime || event.end.date) : null;
      const isPast = end ? end < now : start < now;
      const isNow = start <= now && end && end > now;
      const isSoon = !isPast && !isNow && (start - now) <= 30 * 60 * 1000;
      const color = colors[i % colors.length];

      let badge = '';
      if (isNow) badge = '<span class="event-badge now">NOW</span>';
      else if (isSoon) badge = '<span class="event-badge soon">SOON</span>';

      const hasVideo = getVideoLink(event);
      if (hasVideo) badge += '<span class="event-badge video"><i data-lucide="video" class="icon-xs"></i></span>';

      const loc = event.location || '';

      return `
        <div class="timeline-event ${isPast ? 'past' : ''} ${isNow ? 'active' : ''}">
          <div class="event-time-col">
            <div class="event-time-start">${isAllDay(event) ? 'All Day' : formatTime(start)}</div>
            ${end && !isAllDay(event) ? `<div class="event-time-end">${formatTime(end)}</div>` : ''}
          </div>
          <div class="event-indicator ${color}"></div>
          <div class="event-details">
            <div class="event-title">${escapeHtml(event.summary || '(No title)')}</div>
            ${loc ? `<div class="event-location"><i data-lucide="map-pin" class="icon-xs"></i> ${escapeHtml(loc)}</div>` : ''}
            <div class="event-meta">${badge}</div>
          </div>
        </div>
      `;
    }).join('');
    refreshIcons();
  }

  // ---- Render Main Content ----
  function renderMainContent() {
    const now = new Date();
    const upcomingEvents = events.filter(e => {
      const start = new Date(e.start.dateTime || e.start.date);
      return start > now || (e.end && new Date(e.end.dateTime || e.end.date) > now);
    });

    // Next meeting card
    const nextCard = document.getElementById('nextMeetingCard');
    if (upcomingEvents.length > 0) {
      const next = upcomingEvents[0];
      const start = new Date(next.start.dateTime || next.start.date);
      const end = next.end ? new Date(next.end.dateTime || next.end.date) : null;

      nextCard.classList.remove('hidden');
      document.getElementById('nextMeetingTitle').textContent = next.summary || '(No title)';
      document.getElementById('nextMeetingTime').innerHTML = `<i data-lucide="clock" class="icon-xs"></i> ${isAllDay(next) ? 'All Day' : formatTime(start) + (end ? ' – ' + formatTime(end) : '')}`;
      document.getElementById('nextMeetingLocation').innerHTML = next.location ? `<i data-lucide="map-pin" class="icon-xs"></i> ${escapeHtml(next.location)}` : '';

      updateNextMeetingCountdown(start);

      const actions = document.getElementById('nextMeetingActions');
      const videoLink = getVideoLink(next);
      actions.innerHTML = '';
      if (videoLink) {
        actions.innerHTML += `<a href="${videoLink}" target="_blank" class="btn-join"><i data-lucide="video" class="icon-xs"></i> Join Meeting</a>`;
      }
      actions.innerHTML += `<button class="btn-secondary" onclick="App.snoozeReminder('${next.id}', 5)" style="padding: 10px 20px; font-size: 0.82rem;"><i data-lucide="alarm-clock" class="icon-xs"></i> Remind in 5 min</button>`;
      refreshIcons();
    } else {
      nextCard.classList.add('hidden');
    }

    // Events grid
    const grid = document.getElementById('eventsGrid');
    const noEvents = document.getElementById('noEventsMain');
    const remaining = upcomingEvents.slice(1);

    if (remaining.length > 0) {
      noEvents.classList.add('hidden');
      grid.innerHTML = remaining.map(event => {
        const start = new Date(event.start.dateTime || event.start.date);
        const end = event.end ? new Date(event.end.dateTime || event.end.date) : null;
        const videoLink = getVideoLink(event);

        return `
          <div class="event-card">
            <div class="event-card-time">
              ${isAllDay(event) ? 'All Day' : formatTime(start) + (end ? ' – ' + formatTime(end) : '')}
            </div>
            <div class="event-card-title">${escapeHtml(event.summary || '(No title)')}</div>
            ${event.location ? `<div class="event-card-desc"><i data-lucide="map-pin" class="icon-xs"></i> ${escapeHtml(event.location)}</div>` : ''}
            ${event.description ? `<div class="event-card-desc">${escapeHtml(stripHtml(event.description).substring(0, 120))}</div>` : ''}
            <div class="event-meta" style="margin-top: auto;">
              ${videoLink ? `<a href="${videoLink}" target="_blank" class="btn-join-reminder" style="text-decoration:none;"><i data-lucide="video" class="icon-xs"></i> Join</a>` : ''}
            </div>
          </div>
        `;
      }).join('');
    } else if (upcomingEvents.length <= 1) {
      if (upcomingEvents.length === 0) noEvents.classList.remove('hidden');
      else noEvents.classList.add('hidden');
      grid.innerHTML = '';
    } else {
      noEvents.classList.add('hidden');
      grid.innerHTML = '';
    }
  }

  // ---- Reminder Engine ----
  function processReminders() {
    const now = new Date();
    events.forEach(event => {
      if (dismissedEventIds.has(event.id)) return;
      if (isAllDay(event)) return;

      const start = new Date(event.start.dateTime);
      const reminderMinutes = getEventReminderMinutes(event);
      const triggerTime = new Date(start.getTime() - reminderMinutes * 60 * 1000);

      const existing = activeReminders.find(r => r.event.id === event.id);
      if (!existing) {
        activeReminders.push({
          event,
          triggerTime,
          snoozedUntil: null,
          fired: firedReminderIds.has(event.id),
        });
      } else {
        existing.event = event;
        existing.triggerTime = triggerTime;
      }
    });

    const eventIds = new Set(events.map(e => e.id));
    activeReminders = activeReminders.filter(r => eventIds.has(r.event.id));
  }

  function checkReminders() {
    const now = new Date();
    let newReminders = false;

    activeReminders.forEach(reminder => {
      if (dismissedEventIds.has(reminder.event.id)) return;
      if (reminder.fired) return;

      const effectiveTrigger = reminder.snoozedUntil || reminder.triggerTime;
      if (now >= effectiveTrigger) {
        reminder.fired = true;
        firedReminderIds.add(reminder.event.id);
        newReminders = true;
      }
    });

    if (newReminders) {
      playNotificationSound();
      ringBell();
      showBrowserNotification();
      updateReminderUI();

      if (settings.autoPopup && !reminderPopupVisible) {
        showReminderPopup();
      }
    }

    updateReminderBadge();
  }

  function getEventReminderMinutes(event) {
    if (event.reminders) {
      if (event.reminders.useDefault === false && event.reminders.overrides) {
        const popup = event.reminders.overrides.find(o => o.method === 'popup');
        if (popup) return popup.minutes;
      }
    }
    return settings.defaultReminder;
  }

  function getActiveReminderCount() {
    return activeReminders.filter(r => r.fired && !dismissedEventIds.has(r.event.id)).length;
  }

  function getFiredReminders() {
    return activeReminders.filter(r => r.fired && !dismissedEventIds.has(r.event.id));
  }

  // ---- Reminder UI ----
  function updateReminderBadge() {
    const count = getActiveReminderCount();
    const badge = document.getElementById('reminderBadge');
    if (count > 0) {
      badge.classList.remove('hidden');
      badge.textContent = count;
    } else {
      badge.classList.add('hidden');
    }
  }

  function updateReminderUI() {
    const firedReminders = getFiredReminders();
    const list = document.getElementById('reminderList');
    const countEl = document.getElementById('reminderPopupCount');
    countEl.textContent = firedReminders.length;

    if (firedReminders.length === 0) {
      list.innerHTML = `
        <div class="no-events" style="padding: 32px;">
          <div class="no-events-icon"><i data-lucide="check-circle" style="width:40px;height:40px;color:var(--accent-green);"></i></div>
          <div class="no-events-text">No active reminders</div>
        </div>
      `;
      refreshIcons();
      return;
    }

    list.innerHTML = firedReminders.map((reminder, i) => {
      const event = reminder.event;
      const start = new Date(event.start.dateTime);
      const end = event.end ? new Date(event.end.dateTime) : null;
      const now = new Date();
      const diff = start - now;
      const videoLink = getVideoLink(event);

      let countdownText = '';
      let countdownClass = '';
      if (diff > 0) {
        countdownText = `in ${formatDuration(diff)}`;
        countdownClass = diff < 5 * 60 * 1000 ? 'imminent' : '';
      } else {
        countdownText = `started ${formatDuration(-diff)} ago`;
        countdownClass = 'overdue';
      }

      return `
        <div class="reminder-item" style="animation-delay: ${i * 0.08}s">
          <div class="reminder-item-header">
            <div class="reminder-item-title">${escapeHtml(event.summary || '(No title)')}</div>
            <div class="reminder-countdown ${countdownClass}" data-event-id="${event.id}" data-start="${start.toISOString()}">
              ${countdownText}
            </div>
          </div>
          <div class="reminder-item-meta">
            <span><i data-lucide="clock" class="icon-xs"></i> ${formatTime(start)}${end ? ' – ' + formatTime(end) : ''}</span>
            ${event.location ? `<span><i data-lucide="map-pin" class="icon-xs"></i> ${escapeHtml(event.location)}</span>` : ''}
          </div>
          <div class="reminder-item-actions">
            ${videoLink ? `<a href="${videoLink}" target="_blank" class="btn-join-reminder" style="text-decoration:none;"><i data-lucide="video" class="icon-xs"></i> Join</a>` : ''}
            <button class="btn-snooze" onclick="App.toggleSnoozeDropdown(this, '${event.id}')">
              <i data-lucide="alarm-clock" class="icon-xs"></i> Snooze ▾
            </button>
            <button class="btn-dismiss" onclick="App.dismissReminder('${event.id}')">Dismiss</button>
          </div>
        </div>
      `;
    }).join('');
    refreshIcons();
  }

  function showReminderPopup() {
    reminderPopupVisible = true;
    document.getElementById('reminderOverlay').classList.add('active');
    document.getElementById('reminderPopup').classList.add('active');
    updateReminderUI();
  }

  function hideReminderPopup() {
    reminderPopupVisible = false;
    document.getElementById('reminderOverlay').classList.remove('active');
    document.getElementById('reminderPopup').classList.remove('active');
  }

  function toggleReminderPopup() {
    if (reminderPopupVisible) hideReminderPopup();
    else showReminderPopup();
  }

  function dismissReminder(eventId) {
    dismissedEventIds.add(eventId);
    const idx = activeReminders.findIndex(r => r.event.id === eventId);
    if (idx !== -1) activeReminders.splice(idx, 1);
    updateReminderUI();
    updateReminderBadge();
    showToast('Reminder dismissed', 'info');
    if (getActiveReminderCount() === 0) hideReminderPopup();
  }

  function dismissAllReminders() {
    getFiredReminders().forEach(r => dismissedEventIds.add(r.event.id));
    activeReminders = activeReminders.filter(r => !r.fired);
    updateReminderUI();
    updateReminderBadge();
    hideReminderPopup();
    showToast('All reminders dismissed', 'info');
  }

  function snoozeReminder(eventId, minutes) {
    const reminder = activeReminders.find(r => r.event.id === eventId);
    if (reminder) {
      reminder.snoozedUntil = new Date(Date.now() + minutes * 60 * 1000);
      reminder.fired = false;
      firedReminderIds.delete(eventId);
    }
    updateReminderUI();
    updateReminderBadge();
    showToast(`Snoozed for ${minutes} minute${minutes !== 1 ? 's' : ''}`, 'info');
    document.querySelectorAll('.snooze-dropdown.active').forEach(d => d.classList.remove('active'));
    if (getActiveReminderCount() === 0) hideReminderPopup();
  }

  let activeSnoozeEventId = null;
  function toggleSnoozeDropdown(btn, eventId) {
    let dropdown = document.getElementById('globalSnoozeDropdown');
    
    // Create global dropdown if it doesn't exist
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.id = 'globalSnoozeDropdown';
      dropdown.className = 'snooze-dropdown';
      document.body.appendChild(dropdown);
      
      // Close when clicking outside or scrolling
      const closeDropdown = (e) => {
        if (e.type === 'click' && (e.target.closest('.btn-snooze') || e.target.closest('#globalSnoozeDropdown'))) return;
        dropdown.classList.remove('active');
      };
      document.addEventListener('click', closeDropdown);
      
      const reminderList = document.getElementById('reminderList');
      if (reminderList) {
        reminderList.addEventListener('scroll', closeDropdown);
      }
    }
    
    // Toggle off if clicking same button
    if (dropdown.classList.contains('active') && activeSnoozeEventId === eventId) {
      dropdown.classList.remove('active');
      return;
    }
    
    activeSnoozeEventId = eventId;
    
    // Render options
    dropdown.innerHTML = CONFIG.SNOOZE_OPTIONS.map(opt =>
      `<button class="snooze-option" onclick="App.snoozeReminder('${eventId}', ${opt.value})">${opt.label}</button>`
    ).join('');
    
    // Position dropdown fixed to avoid bounding container leaks
    const rect = btn.getBoundingClientRect();
    dropdown.style.position = 'fixed';
    
    // Flip up if closer to bottom of screen
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < 250) {
      dropdown.style.top = 'auto';
      dropdown.style.bottom = (window.innerHeight - rect.top + 4) + 'px';
    } else {
      dropdown.style.top = (rect.bottom + 4) + 'px';
      dropdown.style.bottom = 'auto';
    }
    
    dropdown.style.left = rect.left + 'px';
    dropdown.style.right = 'auto';
    
    // Make visible
    setTimeout(() => dropdown.classList.add('active'), 0);
  }

  // ---- Countdowns ----
  function updateCountdowns() {
    document.querySelectorAll('.reminder-countdown[data-start]').forEach(el => {
      const start = new Date(el.dataset.start);
      const now = new Date();
      const diff = start - now;
      if (diff > 0) {
        el.textContent = `in ${formatDuration(diff)}`;
        el.className = 'reminder-countdown' + (diff < 5 * 60 * 1000 ? ' imminent' : '');
      } else {
        el.textContent = `started ${formatDuration(-diff)} ago`;
        el.className = 'reminder-countdown overdue';
      }
    });
    updateNextMeetingCountdownTick();
  }

  let nextMeetingStart = null;
  function updateNextMeetingCountdown(start) {
    nextMeetingStart = start;
    updateNextMeetingCountdownTick();
  }

  function updateNextMeetingCountdownTick() {
    if (!nextMeetingStart) return;
    const el = document.getElementById('nextMeetingCountdown');
    if (!el) return;
    const diff = nextMeetingStart - new Date();
    if (diff > 0) {
      el.textContent = `Starts in ${formatDuration(diff)}`;
    } else {
      el.textContent = `Started ${formatDuration(-diff)} ago`;
    }
  }

  // ---- Browser Notifications ----
  function showBrowserNotification() {
    if (!settings.browserNotif) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const fired = getFiredReminders();
    if (fired.length === 0) return;

    const latest = fired[fired.length - 1];
    const start = new Date(latest.event.start.dateTime);
    new Notification(`🔔 ${latest.event.summary || 'Meeting'}`, {
      body: `${formatTime(start)}${latest.event.location ? ' • ' + latest.event.location : ''}`,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="0.9em" font-size="90">🔔</text></svg>',
      tag: latest.event.id,
      requireInteraction: true,
    });
  }

  // ---- Bell Animation ----
  function ringBell() {
    const bell = document.getElementById('reminderBell');
    bell.classList.remove('ringing');
    void bell.offsetWidth;
    bell.classList.add('ringing');
  }

  // ---- Settings ----
  function loadSettings() {
    const saved = localStorage.getItem('calremind_settings');
    if (saved) {
      try { settings = { ...settings, ...JSON.parse(saved) }; } catch (e) {}
    }
    const soundEl = document.getElementById('settingSound');
    const notifEl = document.getElementById('settingBrowserNotif');
    const popupEl = document.getElementById('settingAutoPopup');
    const reminderEl = document.getElementById('settingDefaultReminder');
    if (soundEl) soundEl.checked = settings.sound;
    if (notifEl) notifEl.checked = settings.browserNotif;
    if (popupEl) popupEl.checked = settings.autoPopup;
    if (reminderEl) reminderEl.value = String(settings.defaultReminder);
  }

  function saveSetting(key, value) {
    settings[key] = key === 'defaultReminder' ? parseInt(value) : value;
    localStorage.setItem('calremind_settings', JSON.stringify(settings));
    showToast('Setting saved', 'success');
  }

  function toggleSettings() {
    settingsPanelVisible = !settingsPanelVisible;
    document.getElementById('settingsOverlay').classList.toggle('active', settingsPanelVisible);
    document.getElementById('settingsPanel').classList.toggle('active', settingsPanelVisible);
  }

  // ---- Status Bar ----
  function updateStatus(connected) {
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    if (connected) {
      dot.className = 'status-dot connected';
      text.textContent = 'Connected to Google Calendar';
    } else {
      dot.className = 'status-dot disconnected';
      text.textContent = 'Not connected';
    }
  }

  function updateLastSync() {
    const el = document.getElementById('lastSync');
    el.textContent = `Last sync: ${formatTime(new Date())}`;
  }

  // ---- UI Helpers ----
  function updateClock() {
    const el = document.getElementById('headerTime');
    const now = new Date();
    el.textContent = now.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
    });
  }

  function updateCurrentOrigin() {
    const el = document.getElementById('currentOrigin2');
    if (el) el.textContent = window.location.origin;
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${escapeHtml(message)}`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ---- Utility Functions ----
  function refreshIcons() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function formatTime(date) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }

  function isAllDay(event) {
    return !event.start.dateTime && !!event.start.date;
  }

  function getVideoLink(event) {
    if (event.hangoutLink) return event.hangoutLink;
    if (event.conferenceData && event.conferenceData.entryPoints) {
      const video = event.conferenceData.entryPoints.find(ep => ep.entryPointType === 'video');
      if (video) return video.uri;
    }
    const text = (event.location || '') + ' ' + (event.description || '');
    const zoomMatch = text.match(/(https:\/\/[^\s]*zoom\.us\/[^\s<"]+)/i);
    if (zoomMatch) return zoomMatch[1];
    const teamsMatch = text.match(/(https:\/\/teams\.microsoft\.com\/[^\s<"]+)/i);
    if (teamsMatch) return teamsMatch[1];
    const webexMatch = text.match(/(https:\/\/[^\s]*webex\.com\/[^\s<"]+)/i);
    if (webexMatch) return webexMatch[1];
    return null;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  // Close snooze dropdowns on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.btn-snooze') && !e.target.closest('.snooze-dropdown')) {
      document.querySelectorAll('.snooze-dropdown.active').forEach(d => d.classList.remove('active'));
    }
  });

  // ---- Public API ----
  return {
    init,
    handleSignIn,
    handleSignOut,
    toggleReminderPopup,
    toggleSettings,
    saveSetting,
    dismissReminder,
    dismissAllReminders,
    snoozeReminder,
    toggleSnoozeDropdown,
    wizardNext,
    wizardPrev,
    finishWizard,
    resetSetup,
  };
})();

document.addEventListener('DOMContentLoaded', App.init);
