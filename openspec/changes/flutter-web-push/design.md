# Design: Flutter Web Push for the Installable PWA

## Technical Approach

Reuse the existing `PushTokenSyncService`, `FcmPushTokenSyncService`, notifications repository, authenticated FCM token endpoint, notification payload, and destination resolver. Remove the web no-op at dependency injection, but preserve the current native behavior. Web enrollment is a separate, explicit user action from match-notification preference toggles; the service may resync only after a browser-local opt-in marker exists.

Configure Firebase Web using public build-time values, initialize `Firebase` with explicit `FirebaseOptions` on web, and pass the public VAPID key to the installed `firebase_messaging` API. Add the Firebase worker at the origin root. The installed FlutterFire web plugin's `getToken` accepts only `vapidKey`; it delegates default worker registration to the Firebase JS SDK. Firebase's documented default push scope is `/firebase-cloud-messaging-push-scope`, separate from Flutter's app worker scope, so do not manually register it at `/` or replace Flutter's worker. Keep backend token persistence and Admin delivery unchanged.

If any required Web option is absent, report push as unavailable and leave app and in-app notifications functional. Firebase config values and VAPID are public client configuration, not service-account credentials.

## Architecture Decisions

### Decision: Reuse FCM registration tokens and the current API

**Choice**: Register browser FCM tokens through the existing authenticated `registerPushToken` / `upsertDevicePushToken` contract. Keep server delivery in `FcmPushNotificationProvider` unchanged.

**Alternatives considered**: Migrate to Firebase Installation IDs (FID), or add a separate web-push subscription model.

**Rationale**: The API stores and sends FCM registration tokens already; changing identity/storage or delivery is not required for this feature. Firebase currently documents FID as the newer direction, so token migration can be a separate change if the API contract is revisited.

### Decision: Use explicit public build-time Web configuration

**Choice**: Add `FIREBASE_WEB_API_KEY`, `FIREBASE_WEB_APP_ID`, `FIREBASE_WEB_MESSAGING_SENDER_ID`, `FIREBASE_WEB_PROJECT_ID`, optional `FIREBASE_WEB_AUTH_DOMAIN` / `FIREBASE_WEB_STORAGE_BUCKET`, and `FIREBASE_WEB_VAPID_KEY` as public deployment variables. Pass them to Flutter as `--dart-define` values and generate the worker's public Firebase config from the same values into the deployable web output. `AppEnv` validates the required fields; missing/invalid configuration disables only web push.

**Alternatives considered**: Commit Firebase values to source, or use a Firebase service-account JSON in the browser.

**Rationale**: The client configuration and VAPID public key are intended to be exposed to browsers; runtime/build variables allow the same source to work across local and hosted environments without inventing values. Service-account credentials must remain server-only. The worker cannot read Dart defines, so its generated config must be produced from the same build inputs rather than separately hand-maintained.

### Decision: Keep Flutter and Firebase service workers on distinct scopes

**Choice**: Add `apps/mobile/web/firebase-messaging-sw.js` at the web root and let Firebase Messaging register it with its documented dedicated push scope `/firebase-cloud-messaging-push-scope`. Do not register it manually with `/` and do not modify Flutter-generated `flutter_service_worker.js`.

**Alternatives considered**: Replace Flutter's root-scope worker, merge Firebase handlers into Flutter's generated worker, or disable Flutter's worker.

**Rationale**: The plugin's installed `getToken` signature exposes only the VAPID key and does not accept a custom `ServiceWorkerRegistration`; Firebase's default registration uses a separate push scope. This preserves Flutter install/offline behavior without a build-time patch to generated worker code. The worker script must be served from the origin root even if the app's deployment path changes.

### Decision: Make enrollment explicit and account-scoped

**Choice**: Add a web-push control in `NotificationPrefsScreen` separate from per-event subscription switches. Invoke browser permission only from that control. After permission is granted and backend registration succeeds, persist a browser-local opt-in marker scoped to the authenticated account. Login/bootstrap may resync only when that marker exists. On logout, disable the account's existing token registrations through the current API and clear the marker; do not register on preference changes.

**Alternatives considered**: Auto-enroll during login, infer consent from notification preference switches, or persist a new server-side consent flag.

**Rationale**: Login and preference updates are not explicit browser permission consent. Local opt-in avoids a schema/API migration; the backend token remains the authoritative recipient registration. Failed registration must leave opt-in uncommitted so the user can retry.

### Decision: Reuse existing foreground destination semantics and handle background clicks in the worker

**Choice**: Reuse `ForegroundNotificationHandler` and `notificationDestination` for foreground banners and taps. In the Firebase worker, display the existing title/body and handle notification clicks using the existing data fields (`eventType`, `matchId`, `tournamentId`) to open the matching app route, with `/avisos` as the safe fallback.

**Alternatives considered**: Add backend `webpush.fcmOptions.link` data or open only the app root on every click.

**Rationale**: The current backend already sends title/body plus event and subject IDs but does not set a web link. Mapping those fields in the worker keeps the API unchanged and preserves useful navigation for background notifications. Unknown or malformed payloads must fall back to the notification list, not construct arbitrary URLs.

## Data Flow

```text
Notification settings: user taps web-push control
  → PushTokenSyncService checks Web config and browser support
  → requestPermission (only in this gesture)
  → FirebaseMessaging.getToken(vapidKey: public key)
  → authenticated NotificationsRepository.registerPushToken
  → persist account-scoped local opt-in marker only after API success

Subsequent authenticated startup / token refresh
  → if marker exists, fetch current FCM token and upsert through same API

Backend event dispatch
  → FCM title/body + eventType/matchId/tournamentId/categoryId
  → foreground: FirebaseMessaging.onMessage → existing foreground banner → existing destination resolver
  → background/closed: firebase-messaging-sw.js → browser notification → validated destination URL on click

Logout
  → disable account tokens with existing API → clear local opt-in marker
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/mobile/lib/src/core/env/app_env.dart` | Modify | Read and validate public Firebase Web options and VAPID build defines. |
| `apps/mobile/lib/src/core/di/service_locator.dart` | Modify | Use the FCM sync service for web instead of `NoopPushTokenSyncService`; retain native service. |
| `apps/mobile/lib/src/core/push/push_token_sync_service.dart` | Modify | Add explicit web-enrollment entry point while keeping login sync/logout interface. |
| `apps/mobile/lib/src/core/push/fcm_push_token_sync_service.dart` | Modify | Initialize Firebase Web with options; support user-triggered permission/token registration, opted-in refresh, web token cleanup, and foreground listeners without changing native behavior. |
| `apps/mobile/lib/src/features/notifications/presentation/notification_prefs_screen.dart` | Modify | Add an independent web-push control and unavailable/denied/registration-failure states. |
| `apps/mobile/web/firebase-messaging-sw.js` | Create | Initialize Firebase Messaging from generated public config, process background messages, and route notification clicks safely. |
| `.github/workflows/deploy-mobile.yml` | Modify | Inject public Firebase Web/VAPID variables as Dart defines and generate worker config in build output; do not use service-account credentials. |
| `apps/mobile/test/core/push/fcm_push_token_sync_service_test.dart` | Modify | Cover opt-in, no prompt before opt-in, missing config, permission denial, token refresh, registration failure, and logout cleanup. |
| `apps/mobile/test/features/notifications/presentation/notification_prefs_screen_test.dart` | Create | Cover control visibility/state and that enabling push is distinct from event preference switches. |

No API schema, database, Admin provider, or match-preference change is planned.

## Interfaces / Contracts

- Required Dart defines: `FIREBASE_WEB_API_KEY`, `FIREBASE_WEB_APP_ID`, `FIREBASE_WEB_MESSAGING_SENDER_ID`, `FIREBASE_WEB_PROJECT_ID`, `FIREBASE_WEB_VAPID_KEY`.
- Optional Firebase options: `FIREBASE_WEB_AUTH_DOMAIN`, `FIREBASE_WEB_STORAGE_BUCKET`.
- The web token uses the same authenticated request body as native: `{ token, enabled: true }`; the backend's existing schema strips/does not require platform metadata.
- Local opt-in marker is account-keyed and contains no credential or FCM token. A failed API upsert does not set it; logout disables backend registrations before clearing it.
- Service worker data is untrusted input. Accept only known event types and validated subject IDs; unknown values navigate to `/avisos`.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit | Web options completeness, explicit enrollment, permission denial, no automatic prompt, token refresh, API failure recovery, logout cleanup | Extend existing mocked `FcmPushTokenSyncService` tests. |
| Widget | Web push control and its state remain independent from notification-type preferences | Add focused widget coverage around `NotificationPrefsScreen`. |
| Build | Web Firebase options compile and absent config keeps the build/app usable | Run `flutter analyze lib test`, `flutter test`, and a release web build both with and without public Web config. |
| Browser/manual | Worker scope does not replace Flutter's worker; permission, foreground banner, background notification, and click destination work | Verify on deployed HTTPS origin with a real Firebase Web app/VAPID key and test account. This remains pending only for a real browser/account delivery test on the deployed HTTPS origin. |

## Threat Matrix

N/A — no routing/shell/subprocess, VCS/PR automation, executable-file classification, or process-integration boundary is introduced. Worker notification destinations are constrained to known app routes and fall back safely.

## Migration / Rollout

No database/API migration. Configure the public repository variables before deployment. Public Firebase options and VAPID are configured and deployed. The UI reports configured support and the explicit enrollment/registration result; real browser delivery remains unverified until T9 exercises the deployed HTTPS origin with an account.

## Account consent safety

A verified consent-storage read failure is fail-closed (`bd5382d`), so it cannot escape into authentication bootstrap and end a valid session. Logout consent cleanup remains best-effort: a storage-deletion failure does not block logout and may leave the marker until later cleanup.

## Open Questions

- [ ] Confirm the production deployment serves Flutter at the origin root and serves `firebase-messaging-sw.js` with the required root path; Firebase's default worker registration expects that file at the origin root.
- [x] Approved public Firebase Web options and VAPID key are configured as repository variables; do not record their values here.
- [ ] Real FCM delivery and supported-browser behavior remain unverified until the deployed HTTPS origin is tested with a browser and test account.
- [ ] No `sdd/flutter-web-push/proposal` artifact was found; this design uses the existing `spec.md` and the Explorer/Proposer handoff observations as its intent source.
