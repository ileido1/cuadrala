# Issue #116 — mobile golden coverage
Objective: add visual-regression goldens to the mobile modules that lack them. Branch `test/mobile-goldens-issue-116`.
Delivery: one commit per module (ask-on-risk). Runner: `flutter test` in `apps/mobile`.

## Specs

- S1: Issue #116 verbatim scope: "Ninguno de los módulos `auth`, `onboarding`, `home`, `profile`, `matches`, `venues`, `monetization` tiene golden tests — solo `tournaments` y `quick_match` los tienen." `matches` already covered by e0d0c26 (#146).
- S2: Goldens follow "el patrón ya establecido en `tournaments/goldens/` y `quick_match/goldens/`": light + dark PNG per state, fixed 402x874 at scale 1, real fonts, fixed dates.
- S3: Per the issue note, "conviene dividirlo por módulo en vez de intentarlo todo junto" — one commit per module.
- S4 (assumption, same scope as #146): goldens cover screens that already have behavior tests. Screens with no tests at all (`confirm_match_result_screen`, `match_lifecycle_screen`, `match_live_screen`, `result_draft_screen`, `create_match_panel`, `venue_booking_form`) are a separate follow-up.

## Tasks

- T0 shared helper `test/helpers/golden_harness.dart` — S2 — inline — done
- T1 auth (login, register, welcome) — S1-S3 — delegated (parallel writer) — done af5cf5a
- T2 onboarding (onboarding_flow, my_sports) — S1-S3 — delegated — done 3d842f2
- T3 home (home) — S1-S3 — delegated — done 336d16d
- T4 profile (profile, profile_settings, public_profile) — S1-S3 — delegated — done cb7dfd0
- T5 venues (venue_map, venue_booking) — S1-S3 — delegated — done 77708ed
- T6 monetization (pay_method, upload_receipt, waiting_confirmation) — S1-S3 — delegated — done 6150d97

## Log

- L1 (2026-11-11): "haz la 116"
- L2: route — writer trigger (a): 6 independent modules with disjoint edit surfaces, each several files. Shared helper written inline first so writers reuse it instead of copying a 7th per-module helper.
- L3: no CHANGELOG/pubspec bump — test-only change, no user-visible behavior; same as e0d0c26.
- L4: session restarted mid-run; profile/monetization/venues writers resumed, auth/home/onboarding finished from disk.
- L5: goldens exposed real bugs, fixed in own commits: social button lost app font (df4e3d8), match card time wrapped "20:0/0" (022d113), profile availability label overflow (8be5885). Also #146 discover goldens drifted daily via DateTime.now() date strip — pinned with optional `now` (1c95d94); same seam added to VenueBookingScreen/Form.
- L6: full suite 1650 pass / 0 fail, flutter analyze clean. Follow-ups (not done): untested screens from S4; venues "CUÁNDO" header not indented; GPS button hidden behind venue sheet; quick_match_screen also builds its strip from DateTime.now().
