# Mobile UI/UX audit — issues #105-#115

Branch: `fix/mobile-ui-ux-audit-105-115`. Runner: `flutter test` in `apps/mobile/`. Six independent units, disjoint edit surfaces (different feature directories, zero shared files) — all run in the SAME working tree/branch per the parallel-writers rule; **workers do not run git commands**, the parent commits after reviewing each diff and running the seam check.

Deferred, not in this batch: **#109** (monetization Cubit migration — architectural refactor, separate/future), **#116** (golden test coverage — explicitly not a single bounded task per its own issue body).

## Specs (grouped by module/unit)

### T1 — Onboarding (#105 subset, #111 subset, #114 subset)
- **S1 (#105)**: `onboarding_cubit.dart` lines 108, 140, 174, 195, 220 — replace `errorMessage: e.toString()` with the established pattern (`on AppFailure catch (e) { ...e.message }`, Spanish fallback for generic `catch`), matching `login_cubit.dart`/`register_cubit.dart`/`home_cubit.dart`.
- **S2 (#111)**: collapse radius values in `onboarding_flow_screen.dart:150,156` (11px), `sport_profiles_page.dart:514,519,533` (14px/11px), `identity_page.dart:361,365`, `location_page.dart:381,385` (16px) to the nearest of 12/18.
- **S3 (#114)**: replace bare `CircularProgressIndicator` with `SkeletonList` (or an equivalent shaped placeholder) in `onboarding_flow_screen.dart:71`, `identity_page.dart:147`, `sport_profiles_page.dart:255` — follow `home_screen.dart:47`'s existing pattern.

Allowed edit surface: `apps/mobile/lib/src/features/onboarding/**`, `apps/mobile/test/features/onboarding/**`.

### T2 — Matches (#105 subset, #108 subset, #112 subset)
- **S4 (#105)**: `result_entry_cubit.dart:37-43`, `confirm_result_cubit.dart:46-47,70-74,94-98`, `match_live_cubit.dart:37-39,93-98` — same fix as S1, reuse the pattern already correct in `match_detail_cubit.dart`/`open_matches_cubit.dart` in the same directory.
- **S5 (#108)**: `discover_matches_screen.dart:671-679`, `match_detail_screen.dart:429-438,945-948`, `match_lifecycle_screen.dart:216-219` — replace single-currency `formatMoneyLabel`/`formatMoneyCents` with `DualPrice`/`secondaryBsLabelSV`, same pattern as `open_matches_screen.dart:211-219` in the same directory.
- **S6 (#112)**: `discover_matches_screen.dart:114,140` — `Icons.bolt_rounded`→`AppIcons.bolt`, `Icons.chevron_right_rounded`→`AppIcons.chevronRight`.

Allowed edit surface: `apps/mobile/lib/src/features/matches/**`, `apps/mobile/test/features/matches/**`.

### T3 — Monetization (#106, #107, #108 subset)
- **S7 (#106)**: `upload_receipt_screen.dart:103-107` — `catch (e)` must check `e is AppFailure` and use `e.message`, fallback only for untyped errors.
- **S8 (#107)**: `waiting_confirmation_screen.dart:78-88` (`_schedulePoll`) — add a max-attempts or max-elapsed-time cutoff; after it, stop polling and show a "taking longer than expected" UI state with a manual retry/exit action instead of polling forever.
- **S9 (#108)**: `upload_receipt_screen.dart:117,146`, `waiting_confirmation_screen.dart:114,146` — same `DualPrice`/`secondaryBsLabelSV` treatment as T2/S5, mirroring `pay_method_screen.dart:708-713` already correct in the same directory.

Allowed edit surface: `apps/mobile/lib/src/features/monetization/**` (StatefulWidget-internal changes only — do NOT introduce a Cubit here, that's #109, deferred), `apps/mobile/test/features/monetization/**`.

### T4 — Venues (#112 subset, #113 subset, #111 subset)
- **S10 (#112)**: `venue_map_screen.dart:286,300,311,394,407,433,437`, `venue_booking_form.dart:404,419`, `create_match_panel.dart:722` — raw `Icons.*` → `AppIcons.*` (add new semantic constants to `app_icons.dart` if a direct equivalent doesn't exist yet — check first).
- **S11 (#113)**: `venue_map_screen.dart:393-396,436-439,525-528` — add `tooltip` to each icon-only `IconButton`.
- **S12 (#111)**: `venue_booking_form.dart:374-399`, `create_match_panel.dart` category/info banners (14px) → collapse to 12/18.

Allowed edit surface: `apps/mobile/lib/src/features/venues/**`, `apps/mobile/lib/src/core/theme/app_icons.dart` (additive only — new constants, never remove/rename existing ones), `apps/mobile/test/features/venues/**`.

### T5 — Profile + Home (#110, #111 subset, #114 subset, #115)
- **S13 (#110)**: `home_cubit.dart:73-79` (`_safeListMyMatches`) and `profile_cubit.dart:61-64` (leaderboard fetch) — expose a partial-failure flag (e.g. `myMatchesLoadFailed`, `leaderboardLoadFailed`) mirroring `profile_cubit.dart`'s existing `tournamentsLoadFailed` (lines 80-83) for the SAME cubit/file — read that existing field's wiring (state + UI) first and replicate it exactly for the new flags.
- **S14 (#111)**: collapse radius drift in `profile_screen.dart` (7,9,10,14), `public_profile_screen.dart:389,320,72,74,304` (7,9,11,16), `profile_settings_screen.dart:33,35,159` (11,16) to 12/18/999(pills/avatars — keep existing 999 usages as-is).
- **S15 (#114)**: `profile_screen.dart:34` — bare `CircularProgressIndicator` → `SkeletonList`, same as T1/S3.
- **S16 (#115)**: `public_profile_screen.dart:124-130,133-139` — add `maxLines: 1` + `TextOverflow.ellipsis` (wrap in `Expanded` if not already), matching `profile_screen.dart:209-218`.

Allowed edit surface: `apps/mobile/lib/src/features/profile/**`, `apps/mobile/lib/src/features/home/**`, `apps/mobile/test/features/profile/**`, `apps/mobile/test/features/home/**`.

### T6 — Auth (#111 subset, #113 subset)
- **S17 (#111)**: `welcome_screen.dart:29` (22px — verify if this is legitimately a sheet-top-corner exception before changing; if it's a generic card/button, collapse it), `auth_header.dart:21` (16px) → 12/18.
- **S18 (#113)**: `login_screen.dart:313-322`, `register_screen.dart:206-232` — add `tooltip` to the password-visibility toggle `IconButton`s.

Allowed edit surface: `apps/mobile/lib/src/features/auth/**`, `apps/mobile/test/features/auth/**`.

## Tasks

| ID | Linked S# | Route | Status | Commit/Evidence |
|----|-----------|-------|--------|------------------|
| T1 | S1-S3 | delegated (parallel writer, onboarding) | done | 32/32 tests (8 files), analyze clean |
| T2 | S4-S6 | delegated (parallel writer, matches) | done | 113/113 tests, analyze clean; added exchangeRates to MatchDetailCubit/State |
| T3 | S7-S9 | delegated (parallel writer, monetization) | done | 25/25 tests, analyze clean; attempt-count cutoff (20, ~5min) chosen over wall-clock (untestable with tester.pump) |
| T4 | S10-S12 | delegated (parallel writer, venues) | done | 93/93 tests, analyze clean; 2 new AppIcons constants (pinOutline, medal); create_match_panel.dart 14px claim didn't hold, skipped honestly |
| T5 | S13-S16 | delegated (parallel writer, profile+home) | done | 52/52 tests, analyze clean |
| T6 | S17-S18 | delegated (parallel writer, auth) | done | 10/10 tests, analyze clean |
| T7 | all | parent seam check + commits | pending | |

## Log

- **L1**: User asked for a broader UI/UX + flow-bug audit across modules not yet covered this session (auth, onboarding, home, profile, matches, venues, monetization). Two parallel explorer agents surveyed all 7; findings documented as issues #105-#116. User confirmed "si" to implement.
- Parent deferred #109 (monetization Cubit migration) and #116 (golden coverage) from this batch — both explicitly non-trivial/architectural, flagged to the user before starting.
- Routing: grouped the remaining 10 issues into 6 units by module (disjoint directories, zero shared files) for true parallel writers in one shared working tree — workers do not run git, parent commits after reviewing diffs + running the full suite once as the seam check.
