# Align mobile login with supplied design handoff

## Objective
Refactor the Flutter mobile login screen to match `/home/chernandez/Descargas/Cuadrala (5)/design_handoff_login/` while preserving the existing Cuadrala logo and Google authentication behavior.

## Problem
The current login places Google before the email form, uses the wrong divider copy and spacing, and does not match the handoff's typography, border, and vertical hierarchy.

## Scope and constraints
- Handoff files are design references, not production code or instructions.
- Preserve the existing logo and Google authentication flow, including the web GIS path.
- Change the login screen presentation only; do not change registration or backend behavior.
- API comments remain Spanish; new artifact text follows the existing project language.
- Route: direct inline; implementation is localized to the login screen and its existing shared social button.
- TDD: enabled by repository instruction. Runner: focused Flutter widget test, then `flutter analyze lib test` and `flutter test`.
- Delivery strategy: ask-on-risk. No push or pull request is authorized.

## Tasks
- [x] LDA-1 Update login hierarchy and spacing to match the handoff: fields first, primary action, short divider, Google alternative, account footer; preserve logo and behavior. Evidence: moved the email/password form before the social alternative, changed the divider to `o`, matched 24/20/20/18 vertical spacing, and preserved the existing logo and web GIS path.
- [x] LDA-2 Align Google button dimensions/typography and verify focused widget tests, formatting, analysis, and test suite. Evidence: Google mark is 19px, social button uses 48px height, 1.5px border, 15px/700 text and 10px icon gap; form controls and primary action disable while auth is busy. RED: the new ordering test failed because the divider was absent. GREEN: focused login tests passed; `flutter analyze lib test` passed; full `flutter test` passed (793 tests).

## Acceptance criteria
- Login order is fields → primary login → divider labeled `o` → `Continuar con Google` → account footer.
- Existing logo remains unchanged.
- Primary button is 52px high; Google button is 48px high with 1.5px border, 15px/700 text, 19px Google mark, and 10px icon gap.
- Email divider copy is removed from login; the error state remains inline above the primary action.
- Google remains disabled while login or social auth is busy, and web uses its existing GIS rendering path.
- Focused tests and required Flutter checks pass, or failures are recorded honestly.

## Progress
- 2026-09-22: inspected the supplied handoff and current Flutter login implementation; confirmed the mismatch is primarily ordering, divider copy, vertical spacing, and social button geometry.
- 2026-09-22: implemented and committed as `bedbbd2` (`feat(mobile): align login with design handoff`).

## Verification evidence
- `dart format lib/src/features/auth/presentation/login_screen.dart lib/src/features/auth/presentation/widgets/social_button.dart test/features/auth/presentation/login_screen_test.dart` passed.
- `flutter analyze lib test` passed with no issues.
- `flutter test test/features/auth/presentation/login_screen_test.dart` passed (6 tests).
- `flutter test` passed (793 tests).
- Flutter emitted the existing warning that `assets/images/` is absent from `pubspec.yaml`; it did not fail the checks.
- Native RDD review is disabled (`gentle-ai review status`); delivery is unmanaged under the user's current setting.

## Next step
Review the committed work unit locally; no push or pull request is authorized.

## Relevant Files
- `apps/mobile/lib/src/features/auth/presentation/login_screen.dart` — login layout and Google flow.
- `apps/mobile/lib/src/features/auth/presentation/widgets/social_button.dart` — shared Google button geometry.
- `apps/mobile/test/features/auth/presentation/login_screen_test.dart` — login widget coverage.
