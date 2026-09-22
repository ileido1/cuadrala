# Correct mobile participation, navigation, and onboarding location

## Objective
Ensure the Profile tournament history counts only tournaments the player actually joined, make Inicio always open the home tab, and make onboarding request location permission and autofill location fields when permitted.

## Problem
The profile currently shows organizer-owned tournaments as if they were played, Inicio is reported to route to Perfil, and onboarding does not request location permission or autofill its geolocation fields.

## Scope and constraints
- Route: delegated. Trigger: the three defects span multiple Flutter/API data-flow, navigation, platform-permission, and onboarding files.
- Do not infer participation from tournament ownership; rely on explicit registration/player membership only.
- Preserve user-visible historical data and do not fabricate tournament results.
- Delivery strategy: ask-on-risk. No remote push is authorized for this work unit.

## Tasks
- [x] PTN-1 Trace and correct Profile tournament data so only actual player participation is included. Evidence: `ProfileCubit.load` filters the deliberately broad tournament feed by non-null `registrationStatus`, keeps both `PENDING` and `CONFIRMED` player registrations, excludes organizer-only and invitation-only entries, and sorts the profile projection by tournament `startsAt` descending with null dates last and tournament ID as the deterministic tie-breaker. `startsAt` is the semantic occurrence date; `endsAt` is optional and therefore cannot reliably identify the latest tournament.
- [x] PTN-2 Correct Inicio bottom-navigation routing to the home branch. Evidence: router branches and bottom tabs now project from one canonical `ShellDestination` order; Inicio is index 0 -> `/home` with tournaments enabled or disabled (21 focused tests passed).
- [x] PTN-3 Request location permission during onboarding and autofill geolocation fields when access is granted. Evidence: the Cubit requests once when the location step activates, autofills coordinates on success, classifies disabled/denied/permanently-denied/API/unsupported failures, and keeps explicit retry plus manual editing (23 onboarding tests passed).
- [x] PTN-4 Add regression tests and run applicable Flutter/API checks. Evidence: the bounded correction focused suite passed 21/21, `flutter analyze lib test` passed with no issues, `flutter test` passed 788/788, and `git diff --check` passed. API checks were not applicable because the deliberately broad endpoint and all API files remained unchanged.
- [x] PTN-5 Verify and record the work unit. Evidence: the independent findings were corrected without changing navigation behavior. Production DI always supplies `GeolocatorLocationService`; unsupported/web failures collapse through the generic `LOCATION_UNAVAILABLE` fallback, so the test-only missing-service branch reports the same truthful state instead of speculative `LOCATION_UNSUPPORTED`. The user explicitly authorized direct delivery to `origin/main` on 2026-09-22.

## Acceptance criteria
- An organizer who is not registered as a player is absent from “Torneos jugados” and last-tournament profile data.
- Tapping Inicio opens `/home`, never `/perfil`.
- Onboarding requests location permission at the relevant step, handles denied/permanently-denied/service-disabled states, and populates coordinates/location data when granted.
- Applicable Flutter and API checks pass.

## Progress
- 2026-09-21: task created from two user-reported regressions; implementation pending.
- 2026-09-21: scope extended by the user to include onboarding geolocation permission and autofill; prior delegated attempt produced no source changes due a provider usage limit.
- 2026-09-21: PTN-1 completed. Root cause was Profile consuming the API's intentionally broad viewer tournament feed without projecting explicit player registration membership; focused tests and analyze passed.
- 2026-09-21: PTN-2 completed. Removed the independent flag-dependent tab/branch index construction that allowed drift and replaced stale test fixtures with canonical destination assertions; focused tests and analyze passed.
- 2026-09-21: PTN-3 completed. Reused the existing `LocationService` through DI, moved proactive one-shot resolution into `OnboardingCubit`, retained manual fallback and explicit retry, and confirmed existing Android/iOS permission declarations were sufficient.
- 2026-09-21: PTN-4/PTN-5 completed. Full Flutter analysis and 785-test suite passed; no API checks were required, and no commit or push was made by explicit instruction.
- 2026-09-21: bounded verification correction completed. Profile tournament ordering now derives from `startsAt` at the profile projection boundary; explicit invitation/PENDING boundaries are covered; onboarding tests prove inactive-to-active detection and preservation of manually edited coordinates after a denied retry; the missing-service fallback now reports `LOCATION_UNAVAILABLE` consistently.

## Bounded correction verification
- Formatting: `dart format lib/src/features/profile/presentation/cubit/profile_cubit.dart lib/src/features/onboarding/presentation/cubit/onboarding_cubit.dart test/features/profile/presentation/cubit/profile_cubit_test.dart test/features/onboarding/presentation/cubit/onboarding_cubit_test.dart test/features/onboarding/presentation/pages/location_page_test.dart` — passed for all 5 edited Dart files.
- Focused behavior: `flutter test test/features/profile/presentation/cubit/profile_cubit_test.dart test/features/onboarding/presentation/cubit/onboarding_cubit_test.dart test/features/onboarding/presentation/pages/location_page_test.dart` — passed, 21 tests.
- Static analysis: `flutter analyze lib test` — passed, no issues found.
- Full suite: `flutter test` — passed, 788 tests.
- Diff hygiene: `git diff --check` from the repository root — passed.
- Runtime harness: N/A. This correction changes deterministic profile projection and onboarding state/widget behavior covered by unit/widget tests; no configured emulator/device location harness was available or required, and no navigation behavior changed.

## Rollback boundary
Rollback only the bounded correction hunks: the `startsAt` profile sort/comparator and its membership/order fixtures in `apps/mobile/lib/src/features/profile/presentation/cubit/profile_cubit.dart` and `apps/mobile/test/features/profile/presentation/cubit/profile_cubit_test.dart`; the truthful missing-service fallback and assertion in `apps/mobile/lib/src/features/onboarding/presentation/cubit/onboarding_cubit.dart` and `apps/mobile/test/features/onboarding/presentation/cubit/onboarding_cubit_test.dart`; and the inactive-to-active/manual-coordinate widget coverage in `apps/mobile/test/features/onboarding/presentation/pages/location_page_test.dart`. Do not revert whole files because they also contain the preserved earlier ODD work.

## Delivery constraint
Direct commit and push to `origin/main` were explicitly authorized on 2026-09-22. Final commit identities are recorded after delivery.
