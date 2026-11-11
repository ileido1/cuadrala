# Issue #116 — mobile golden coverage
Objective: add visual-regression goldens to the mobile modules that lack them. Branch `test/mobile-goldens-issue-116`.
Delivery: one commit per module (ask-on-risk). Runner: `flutter test` in `apps/mobile`.

## Specs

- S1: Issue #116 verbatim scope: "Ninguno de los módulos `auth`, `onboarding`, `home`, `profile`, `matches`, `venues`, `monetization` tiene golden tests — solo `tournaments` y `quick_match` los tienen." `matches` already covered by e0d0c26 (#146).
- S2: Goldens follow "el patrón ya establecido en `tournaments/goldens/` y `quick_match/goldens/`": light + dark PNG per state, fixed 402x874 at scale 1, real fonts, fixed dates.
- S3: Per the issue note, "conviene dividirlo por módulo en vez de intentarlo todo junto" — one commit per module.
- S4: Issue #116 verbatim: "Pantallas completas sin ningún test de widget: `match_detail_screen.dart`, `match_lifecycle_screen.dart`, `match_live_screen.dart`, `confirm_match_result_screen.dart`, `discover_matches_screen.dart`, `create_match_panel.dart`, `venue_booking_form.dart`, `upload_receipt_screen.dart`." Remaining ones get widget behavior tests + goldens (user L7: "haz lo que quedo afuera tambien"); also `result_draft_screen`.
- S5 (L7): fix the UI details found in this pass: venues "CUÁNDO" header not indented; GPS button hidden behind the selected-venue sheet; `quick_match_screen` date strip built from `DateTime.now()`.

## Tasks

- T0 shared helper `test/helpers/golden_harness.dart` — S2 — inline — done
- T1 auth (login, register, welcome) — S1-S3 — delegated (parallel writer) — done af5cf5a
- T2 onboarding (onboarding_flow, my_sports) — S1-S3 — delegated — done 3d842f2
- T3 home (home) — S1-S3 — delegated — done 336d16d
- T4 profile (profile, profile_settings, public_profile) — S1-S3 — delegated — done cb7dfd0
- T5 venues (venue_map, venue_booking) — S1-S3 — delegated — done 77708ed
- T6 monetization (pay_method, upload_receipt, waiting_confirmation) — S1-S3 — delegated — done 6150d97
- T7 matches results: confirm_match_result + result_draft tests/goldens — S4 — delegated — done 7b24fce
- T8 matches live: match_lifecycle + match_live tests/goldens — S4 — delegated — done 624dd6a
- T9 venues: create_match_panel + venue_booking_form tests/goldens, CUÁNDO indent, GPS button — S4, S5 — delegated — done 7052f6a
- T10 quick_match `now` seam — S5 — inline — skipped (see L9)

## Log

- L1 (2026-11-11): "haz la 116"
- L2: route — writer trigger (a): 6 independent modules with disjoint edit surfaces, each several files. Shared helper written inline first so writers reuse it instead of copying a 7th per-module helper.
- L3: no CHANGELOG/pubspec bump — test-only change, no user-visible behavior; same as e0d0c26.
- L4: session restarted mid-run; profile/monetization/venues writers resumed, auth/home/onboarding finished from disk.
- L5: goldens exposed real bugs, fixed in own commits: social button lost app font (df4e3d8), match card time wrapped "20:0/0" (022d113), profile availability label overflow (8be5885). Also #146 discover goldens drifted daily via DateTime.now() date strip — pinned with optional `now` (1c95d94); same seam added to VenueBookingScreen/Form.
- L6: full suite 1650 pass / 0 fail, flutter analyze clean. Follow-ups (not done): untested screens from S4; venues "CUÁNDO" header not indented; GPS button hidden behind venue sheet; quick_match_screen also builds its strip from DateTime.now().
- L7 (2026-11-11): "haz lo que quedo afuera tambien"
- L8: route — writer trigger (a): T7-T9 independent, disjoint surfaces; T10 small, inline.
- L9: T10 skipped — quick_match goldens generated 2026-11-01 still pass 11/11 on 2026-11-11, so none captures now-derived content; the seam would thread `now` through 6 DateTime.now() sites in private widgets for no current golden. Add it when a golden of the configuration/schedule sheet is written.
- L10: new bugs found by the T7-T9 tests, fixed TDD in own commits: confirm result gave no feedback after success (aa42cee); live screen pushed a result page per timer tick, RED showed 5 stacked (7dc134b); timer monospace font (ce56283); confirm empty/error padding (0dfe88d); Cuándo header (b1fc57c); GPS button (976d723); panel date strip double padding (fd04b16).
- L11: full suite 1751 pass / 0 fail, analyze clean. Not fixed: match_lifecycle_screen has hardcoded mockup content but no screen navigates to it (route only) — deletion candidate, user decision. Light-theme confirm cards invisible (surfaceContainer == surfaceContainerLowest) — theme decision.
