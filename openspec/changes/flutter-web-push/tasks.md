# Tasks: Flutter Web Push for the Installable PWA

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 450–650 authored lines |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: account-scoped enrollment and UI; PR 2: Firebase worker and deployment config |
| Delivery strategy | ask-on-risk (default; threshold crossed; user selected the chain strategy below) |
| Chain strategy | stacked-to-main (user chose that each part originates from main) |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Account-scoped opt-in, token sync, settings control | PR 1 | `cd apps/mobile && flutter test test/core/push/fcm_push_token_sync_service_test.dart test/features/notifications/presentation/notification_prefs_screen_test.dart` | Authenticated browser: enable permission, register, sign out; live Firebase delivery is pending deployment inputs | Revert service, DI, settings, and their tests together; native push remains unchanged |
| 2 | Firebase background worker and public deployment configuration | PR 2 | `cd apps/mobile && flutter analyze lib test && flutter test` | Deployed HTTPS PWA with Firebase Web options and VAPID key; verify foreground/background delivery and click routing | Revert worker and deployment workflow changes; web push returns to unavailable while app/in-app notifications remain |

## Phase 1: Mobile enrollment contract (RED → GREEN)

- [x] 1.1 **RED — service behavior tests (R1, R2, R5):** Added tests asserting no permission/token registration before explicit opt-in; permission denial, missing config, API failure/retry, token registration/refresh, and logout behavior. Focused run exits 1 as expected because the service seams/config fields are not implemented yet; existing native service tests pass.
- [x] 1.2 **GREEN — web configuration and synchronization (R1, R2, R5):** Implemented in `app_env.dart`, `push_token_sync_service.dart`, `fcm_push_token_sync_service.dart`, and `service_locator.dart`. Native behavior and the authenticated token endpoint remain unchanged; Firebase Web initialization uses public options and the VAPID key.
- [x] 1.3 **RED — notification settings tests (R1, R3, R5):** Added an explicit web-push control test separate from event-preference switches. First run exposed the existing `AppHeader` RenderBox/`CustomScrollView.slivers` mismatch; it was fixed with `SliverToBoxAdapter`. Focused service/widget tests pass.
- [x] 1.4 **GREEN — user-controlled enrollment UI (R1, R3, R5):** Added explicit browser enrollment and a restored enable/status-only control in `notification_prefs_screen.dart`; in-app preference toggles remain independent.

## Phase 2: Background delivery and deployment (RED/verification → GREEN)

- [x] 2.1 **RED — worker destination safety test (R3, R4):** Added `apps/mobile/test/web/firebase_messaging_sw.test.mjs` using Node's built-in test runner and VM. Before the worker existed, the focused run failed all three original cases with `ENOENT`; the final suite covers known match routing plus unknown/unsafe fallback and incomplete configuration.
- [x] 2.2 **GREEN — Firebase messaging worker (R3, R4):** Added `apps/mobile/web/firebase-messaging-sw.js` with build-generated public config, background title/body display, validated event-specific click routes, and `/avisos` fallback. Firebase retains its dedicated `/firebase-cloud-messaging-push-scope`; Flutter's service worker is unchanged.
- [x] 2.3 **GREEN — deployment variables and worker config (R2, R4, R5):** The deploy workflow now passes public Firebase Web/VAPID repository variables as Dart defines and prepends the same Firebase configuration to deployable worker output only when required values are present. Missing values leave the worker inert; no service-account/private credentials were added. Setup is documented in `apps/mobile/README.md`.
- [ ] 2.4 **Verification — local build and deployed HTTPS origin (R1–R5):** Local checks passed: worker suite (4 tests), `flutter analyze lib test`, and `flutter build web --release` both without defines and with non-secret placeholder public Web/VAPID defines. The full Flutter suite was intentionally deferred to final verification. Deployed HTTPS verification remains **pending external inputs**: a test account and browser exercise are required before installability/worker coexistence, permission, registration, foreground/background delivery, and click routing can be verified.

## Dependencies and parallelism

- Tasks 1.1 → 1.2 and 1.3 → 1.4 are strict RED-before-GREEN pairs; 1.1 and 1.3 may be authored independently.
- Phase 2 depends on the service and settings enrollment contract from Phase 1. Tasks 2.2 and 2.3 can be implemented in parallel after the Firebase public define names are fixed by 1.2; 2.4 is last.
- No backend/API or database changes are planned. Public values and deployment are resolved; live push verification still requires a browser and test account on the deployed HTTPS origin.

## Publication record

Actual delivery used four stacked slices: core PR #63, settings PR #64, worker/deployment PR #65, and this documentation slice.
