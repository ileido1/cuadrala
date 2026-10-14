import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const workerPath = path.resolve('web/firebase-messaging-sw.js');

async function loadWorker({config = null} = {}) {
  const source = await readFile(workerPath, 'utf8');
  const listeners = new Map();
  let backgroundHandler;
  const shownNotifications = [];
  const openedWindows = [];

  const scope = {
    __FIREBASE_WEB_CONFIG__: config,
    addEventListener: (type, listener) => listeners.set(type, listener),
    clients: {
      matchAll: async () => [],
      openWindow: async (url) => openedWindows.push(url),
    },
    location: {origin: 'https://app.example'},
    registration: {
      showNotification: async (title, options) => {
        shownNotifications.push({title, options});
      },
    },
  };
  const firebase = {
    initializeApp: () => {},
    messaging: () => ({
      onBackgroundMessage: (handler) => {
        backgroundHandler = handler;
      },
    }),
  };
  vm.runInNewContext(source, {
    self: scope,
    firebase,
    importScripts: () => {},
    URL,
  });

  return {backgroundHandler, listeners, openedWindows, shownNotifications};
}

test('should display a safe match detail notification when a configured worker receives a background message', async () => {
  const worker = await loadWorker({
    config: {apiKey: 'public-api-key', appId: 'public-app-id', messagingSenderId: '123', projectId: 'public-project'},
  });

  assert.equal(typeof worker.backgroundHandler, 'function');
  await worker.backgroundHandler({
    notification: {title: 'Match updated', body: 'A player joined'},
    data: {eventType: 'MATCH_PLAYER_JOINED', matchId: 'match_123'},
  });

  assert.equal(worker.shownNotifications.length, 1);
  assert.equal(worker.shownNotifications[0].title, 'Match updated');
  assert.equal(worker.shownNotifications[0].options.body, 'A player joined');
  assert.equal(worker.shownNotifications[0].options.data.url, '/matches/match_123');
});

test('should route an unknown or unsafe notification click to avisos', async () => {
  const worker = await loadWorker();
  const click = worker.listeners.get('notificationclick');
  let closed = false;
  let waitUntil;

  click({
    notification: {data: {url: 'https://attacker.example'}, close: () => { closed = true; }},
    waitUntil: (promise) => { waitUntil = promise; },
  });
  await waitUntil;

  assert.equal(closed, true);
  assert.deepEqual(worker.openedWindows, ['https://app.example/avisos']);
});

test('should send unknown event payloads to avisos', async () => {
  const worker = await loadWorker({
    config: {apiKey: 'public-api-key', appId: 'public-app-id', messagingSenderId: '123', projectId: 'public-project'},
  });

  await worker.backgroundHandler({
    notification: {title: 'Unknown', body: 'Unexpected event'},
    data: {eventType: 'UNKNOWN_EVENT', matchId: 'match_123'},
  });

  assert.equal(worker.shownNotifications[0].options.data.url, '/avisos');
});

test('should remain inactive without complete public Firebase configuration', async () => {
  const worker = await loadWorker({config: {apiKey: 'public-api-key'}});

  assert.equal(worker.backgroundHandler, undefined);
});
