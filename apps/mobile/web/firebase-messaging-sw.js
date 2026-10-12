/* global firebase, importScripts */

(() => {
  const fallbackRoute = '/avisos';
  const firebaseConfig = self.__FIREBASE_WEB_CONFIG__;
  const isSafeId = (value) =>
    typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value);

  const routeForPayload = (data = {}) => {
    const eventType = data.eventType;
    const matchId = data.matchId;
    const tournamentId = data.tournamentId;

    const tournamentEvents = new Set([
      'TOURNAMENT_REGISTRATION_RECEIVED',
      'TOURNAMENT_REGISTRATION_CONFIRMED',
      'TOURNAMENT_SCHEDULE_PUBLISHED',
      'TOURNAMENT_STARTED',
      'TOURNAMENT_MATCH_NEEDS_ATTENTION',
    ]);
    if (tournamentEvents.has(eventType) && isSafeId(tournamentId)) {
      return `/tournaments/${tournamentId}?invitation=pending`;
    }
    if (eventType === 'QUICK_MATCH_PROPOSAL') return '/quick-match';
    if (!isSafeId(matchId)) return fallbackRoute;

    switch (eventType) {
      case 'CHAT_MESSAGE':
        return `/matches/${matchId}/chat`;
      case 'MATCH_PLAYER_JOINED':
      case 'MATCH_SLOT_OPENED':
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_PENDING':
      case 'MATCH_CANCELLED':
        return `/matches/${matchId}`;
      default:
        return fallbackRoute;
    }
  };

  const isSafeRoute = (value) =>
    value === fallbackRoute ||
    value === '/quick-match' ||
    /^\/matches\/[A-Za-z0-9_-]+(?:\/chat)?$/.test(value) ||
    /^\/tournaments\/[A-Za-z0-9_-]+\?invitation=pending$/.test(value);

  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const route = isSafeRoute(event.notification.data?.url)
      ? event.notification.data.url
      : fallbackRoute;

    event.waitUntil(
      self.clients.matchAll({type: 'window', includeUncontrolled: true}).then((clients) => {
        const destination = new URL(route, self.location.origin).href;
        for (const client of clients) {
          if (client.url === destination && 'focus' in client) return client.focus();
        }
        return self.clients.openWindow(destination);
      }),
    );
  });

  const requiredConfigKeys = ['apiKey', 'appId', 'messagingSenderId', 'projectId'];
  if (!firebaseConfig || !requiredConfigKeys.every((key) => firebaseConfig[key])) return;

  importScripts(
    'https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js',
  );

  firebase.initializeApp(firebaseConfig);
  firebase.messaging().onBackgroundMessage((payload) => {
    const notification = payload.notification || {};
    return self.registration.showNotification(notification.title || 'Cuádrala', {
      body: notification.body || 'Tenés una nueva notificación',
      data: {url: routeForPayload(payload.data)},
    });
  });
})();
