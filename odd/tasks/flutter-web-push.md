# Flutter Web Push

## Objective
Enable browser push notifications for the existing installable Flutter Web PWA while reusing Cuadrala's authenticated FCM registration-token API and preserving native push and in-app notifications.

## Problem and Why
Web builds currently select a no-op push service and the Flutter FCM service exits on `kIsWeb`, so matchmaking and other backend notifications reach browser users only in the in-app Avisos experience. The user authorized enabling web push before store publication.

## Scope and Constraints
- Scope is `apps/mobile` Flutter Web plus the mobile deployment workflow; do not create a separate PWA or change backend token schema/delivery.
- Ask browser permission only from an explicit settings action; notification preference toggles alone are not consent.
- Reuse the current FCM token endpoint; never expose backend service-account credentials.
- Public Firebase Web options and VAPID are configured as repository Actions Variables; deployment and HTTPS live delivery remain unverified until an authorized workflow run and PWA test.
- Preserve Flutter's install/offline service worker; use Firebase's documented dedicated push scope and validate coexistence.
- Preserve pre-existing unrelated workspace state: `.atl/skill-registry.md`, `.codegraph/`, and tournament golden failures.
- RDD is globally disabled; use ordinary functional checks and do not start review.
- Work branch: `codex/flutter-web-push` (branched from current `origin/main` commit `4de3869`).

## Authorized Scope
- `apps/mobile/lib/src/core/env/app_env.dart`
- `apps/mobile/lib/src/core/di/service_locator.dart`
- `apps/mobile/lib/src/core/push/push_token_sync_service.dart`
- `apps/mobile/lib/src/core/push/fcm_push_token_sync_service.dart`
- `apps/mobile/lib/src/core/push/foreground_notification_handler.dart`
- `apps/mobile/lib/src/core/push/push_notification_tap_handler.dart`
- `apps/mobile/lib/src/features/notifications/presentation/notification_prefs_screen.dart`
- `apps/mobile/web/index.html`
- `apps/mobile/web/firebase-messaging-sw.js`
- `apps/mobile/test/core/push/fcm_push_token_sync_service_test.dart`
- `apps/mobile/test/features/notifications/presentation/notification_prefs_screen_test.dart`
- `apps/mobile/test/web/firebase_messaging_sw.test.mjs`
- `.github/workflows/deploy-mobile.yml`
- `apps/mobile/README.md`
- `openspec/changes/flutter-web-push/`
- `odd/tasks/flutter-web-push.md`
- User-approved additional paths: `apps/mobile/lib/src/features/auth/data/secure_token_storage.dart`, `apps/mobile/lib/src/core/storage/flutter_secure_token_storage.dart`, `apps/mobile/lib/src/features/profile/data/profile_repository.dart`, `apps/mobile/lib/src/features/profile/data/models/user_me_dto.dart`, and `apps/mobile/lib/src/core/push/noop_push_token_sync_service.dart`.

## Acceptance Criteria
1. Web push is unavailable without valid public Firebase Web/VAPID configuration and unrelated app/in-app notifications continue working.
2. Authenticated users explicitly opt in from notification settings; only after browser permission and backend registration succeed does the UI report enabled.
3. Web FCM token updates register through the existing token API; logout disables registrations and clears local opt-in without changing native behavior.
4. Foreground notifications use the current in-app notification/destination behavior; background notifications show a browser notification and clicks route only to recognized in-app paths with a safe `/avisos` fallback.
5. Flutter PWA installation/offline behavior remains intact alongside the Firebase messaging worker.
6. Unit/widget/worker tests and Flutter web build pass; live delivery is not called verified until the configured deployed HTTPS origin is exercised.

## Work Units and Progress

| Task | Work | Route / trigger | Status | Verification evidence |
|---|---|---|---|---|
| T1 | Implement and test explicit opt-in, configuration validation, account-scoped web token lifecycle, foreground behavior, and settings UI. | Delegated direct; multiple non-trivial Dart files and tests. | Complete | `cd apps/mobile && flutter test test/core/push/fcm_push_token_sync_service_test.dart test/features/notifications/presentation/notification_prefs_screen_test.dart` — passed (20 tests); `cd apps/mobile && flutter analyze lib test` — passed with no issues. Marker deletion is best-effort and cannot block logout. Commit: `acbe0d5`. |
| T2 | Add Firebase worker/background routing, public build configuration, deploy workflow wiring, and user-facing setup documentation. | Delegated direct; multiple non-trivial files. | Complete (local) | RED worker test observed `ENOENT`; GREEN Node suite passed (4 tests). `flutter analyze lib test` and release web builds without config and with non-secret placeholder defines passed. Live HTTPS delivery remains pending external Firebase/deployment inputs. Commit: `edca8ef`. |
| T3 | Verify matchmaking notification audience semantics, run final checks, inspect diff, update OpenSpec/task/memory, and record work-unit commits. | Read-only explorer plus delegated verification and parent spot-check. | Complete (local) | Matchmaking audit confirms `MATCH_SLOT_OPENED` fans out to all active matching subscriptions and `OPEN_MATCH` proposals stay private to the searching user; tests cover multiple eligible recipients. Node worker tests passed 4/4; `flutter analyze lib test` passed; full `flutter test` passed 1,145; both web release builds passed (no config and placeholder public defines). Work-unit commits: `acbe0d5`, `edca8ef`; tracker verification commit: `f43841f`. Live HTTPS delivery remains unverified; no push/PR/deploy. |
| T4 | Save public Firebase Web/VAPID configuration as repository-level GitHub Actions Variables and read back exact values. | Delegated direct; repetitive operational settings plus independent readback. | Complete (remote configuration) | Created 7 repository-level Actions Variables in `ileido1/cuadrala` (no pre-existing target variables): API key, app ID, sender ID, project ID, auth domain, storage bucket, and VAPID key. GitHub Variables-page readback independently exact-matched all seven. No secrets, deploy, workflow dispatch, backend, or other remote changes. Tracker configuration commit: `5387ffb`. |
| T5 | Publish the core account-scoped web enrollment slice from its immutable candidate. | Delegated direct; approved 806-line size exception with a confirmed +32 net correction; RDD globally off. | Complete | PR [#63](https://github.com/ileido1/cuadrala/pull/63) merged into main as `2da091d`. Labels: exactly `type:feature` and `size:exception`. Remote workflow [Desplegar app web #38050194863](https://github.com/ileido1/cuadrala/actions/runs/38050194863) passed all install, analyze, test, web build, package, and Vercel publish steps. Independent focused 18, writer full Flutter 1,143, and local release build were also observed. Live browser HTTPS notification delivery remains unverified. |
| T6 | Publish the notification-settings UI slice from its immutable candidate. | Delegated direct; medium executable assessment, RDD globally off (disabled/unmanaged). | Complete | PR [#64](https://github.com/ileido1/cuadrala/pull/64) merged into main as `0c72cb7`, with exactly `type:feature`. Main workflow [#38051011404](https://github.com/ileido1/cuadrala/actions/runs/38051011404) passed install, analyze, tests, web build, package, and Vercel publish. Candidate was 2 UI paths, 195 authored lines; source verification was the writer's successful analysis, focused/full tests, and build. Live browser delivery remains unverified. |
| T7 | Publish Firebase worker/deployment slice. | Delegated direct; high workflow assessment, RDD off. | Complete | PR [#65](https://github.com/ileido1/cuadrala/pull/65) merged as `fe7d6497`; exact [workflow #38298537742](https://github.com/ileido1/cuadrala/actions/runs/38298537742) passed install, analysis, tests, web build, package, and Vercel publish. Production alias: `https://www.cuadrala.app`. Node worker tests passed 4/4; no browser delivery proof claimed. |
| T8 | Prepare docs and tracker slice. | Future stacked-to-main slice; target ≤400 lines where possible. | Pending | README/OpenSpec/ODD updates after T7 publication. |
| T9 | Verify deployed HTTPS PWA delivery. | Pending authorized operational proof. | Pending external access | Requires an authorized deploy plus test-account/browser proof; no app account or backend access is authorized now. |

## Delivery Strategy
- Original branch diff: 1,584 authored lines (1,474 additions, 110 deletions). Four sequential `stacked-to-main` slices are authorized: T5 core 806 lines (user-approved `size:exception`), T6 UI 195, T7 worker 229, T8 docs/tracker 354 plus tracker updates.
- Current baseline commit: `4de3869`; immutable desired-source snapshot: `2bf6b98`. T5 starts from `origin/main` in the release worktree on `feat/flutter-web-push-01-core`; each later slice starts from updated main after the previous merge.
- Test-first exception: source behavior is immutable and already has RED→GREEN evidence; publication performs exact candidate verification rather than inventing new behavior.

## Applicable Checks
- Test-first: add/observe meaningful RED cases before the corresponding implementation, then GREEN.
- `cd apps/mobile && flutter test test/core/push/fcm_push_token_sync_service_test.dart test/features/notifications/presentation/notification_prefs_screen_test.dart`
- `cd apps/mobile && node --test test/web/firebase_messaging_sw.test.mjs`
- `cd apps/mobile && flutter analyze lib test && flutter test`
- `cd apps/mobile && flutter build web --release` with configuration absent and complete public web config.
- Live test with a test account on deployed HTTPS origin, once public Firebase options and VAPID configuration are supplied.

## Current Status and Next Step
T1 is complete and committed as `acbe0d5`: public Web configuration, explicit permission enrollment, account-scoped persisted opt-in, token refresh/logout cleanup (including storage-delete failure), DI, and notification-settings UI are covered by focused tests and `flutter analyze lib test`. The control is enable/status-only: it does not disable all backend device tokens; browser site permission settings remain the truthful disable path. T2 is complete locally and committed as `edca8ef`: a root Firebase worker safely maps only known event/subject routes, deployment injects only public build variables, and setup is documented. The worker suite passed 4 tests, the complete Flutter suite passed 1,145 tests, analysis passed, and both requested release builds passed. Read-only matchmaking audit: `OPEN_MATCH` proposals are private to the searching user, while `MATCH_SLOT_OPENED` fanout targets all active compatible subscribers and tests cover multiple eligible users. Do not claim production delivery: real Firebase public values, deployment configuration, and HTTPS-origin verification remain external pending inputs. T4 is complete: seven public repository-level GitHub Actions Variables were created in `ileido1/cuadrala` for the existing Firebase Cuadrala Web app, and their displayed values exact-matched the approved configuration. The parent generated and verified the public VAPID key. No secrets, deploy, workflow dispatch, backend access, push, PR, or merge occurred. T5 is complete: PR [#63](https://github.com/ileido1/cuadrala/pull/63) merged the independently verified 838-line core exception into main as `2da091d`, with exactly `type:feature` and `size:exception` labels. The main-triggered [Desplegar app web run #38050194863](https://github.com/ileido1/cuadrala/actions/runs/38050194863) passed installation, analysis, tests, web build, Vercel packaging, and Vercel publish. The RED test proved that a storage-read error escaped `_hasWebPushOptIn`; `bd5382d` now fails closed before session bootstrap can log out a valid user. RDD remained globally off; ordinary independent and local checks were the record. Do not claim runtime notification delivery: deployed HTTPS browser/PWA proof remains T9. T6 and T7 are complete and deployed. T8 documentation/tracker is prepared locally as `d606959` and remains unpublished. Live HTTPS browser/PWA notification proof remains T9; the production alias is `https://www.cuadrala.app`, but no browser/account delivery verification was performed.

## Relevant Files
- `apps/mobile/lib/src/core/di/service_locator.dart` — selects the configured web push service when public configuration is valid.
- `apps/mobile/lib/src/core/push/fcm_push_token_sync_service.dart` — native token registration with web guards.
- `apps/mobile/lib/src/features/notifications/presentation/notification_prefs_screen.dart` — existing notification preferences and web push explanation.
- `apps/mobile/web/manifest.json` — existing installable PWA metadata.
- `services/api/src/infrastructure/adapters/fcm_push_notification_provider.ts` — current backend sends stored FCM registration tokens.
- `openspec/changes/flutter-web-push/spec.md` — behavior contract.
- `openspec/changes/flutter-web-push/design.md` — implementation design.
- `openspec/changes/flutter-web-push/tasks.md` — dependency-ordered checklist.
