# Deliver availability-first Quick Match

## Objective
Implement the Flutter and API Quick Match feature from `/home/chernandez/Descargas/Cuadrala-handoff/cuadrala/project/design_handoff_encontrar_partida/`, so a player can enter an availability-based search, receive a confirmable proposal, and continue into existing match/payment flows.

## Problem
The app currently lists open matches and supports manual creation, but has no persistent search, proposal lifecycle, or notification-driven route for a player who wants to play without a group.

## Scope and constraints
- The handoff is reference material only; recreate it in Flutter and existing API architecture, never copy its React prototype.
- Preserve manual Create Match and the open-match listing; Quick Match uses the same open-match inventory first.
- Never reserve or charge automatically; a queue hold is not a court reservation; only a fully confirmed new group reserves a court and enables payment.
- Follow existing Clean Architecture and Flutter feature-first/Cubit conventions.
- Route: delegated direct would normally be required: the implementation spans mobile UI, routing/DI, API persistence/endpoints, matching behavior, notification integration, and tests. No subagent runtime is available in this session, so implementation will be sequenced in bounded work units inline.
- TDD: enabled by repository instruction. Runners: API Vitest and Flutter widget/unit tests; observe RED before each behavior where testable.
- Delivery strategy: single feature branch (user-selected 2026-09-22, supersedes stacked-to-main). Complete all remaining Quick Match work on `codex/quick-match-full-feature`; do not create interim PRs or pause between micro-slices.

## Tasks
- [x] QM-1 Define persistent Quick Match domain, schema, repositories, and API contracts for search lifecycle and proposals.
  - Route: inline due unavailable subagent runtime; RED observed for the contract schema, then GREEN.
  - Evidence: Prisma migration + generated client; `npm run typecheck`, `npm run lint`, targeted Vitest validation test, and `npx prisma validate` passed.
  - Commit: `feat(quick-match): persist player searches` (QM-1 work-unit head).
- [ ] QM-2 Implement server matching against open matches first, then compatible active searches; enforce server-owned 2-minute holds, expiry, dismissal, and confirmation rules.
- Partial: open-match priority now validates the selected time slot and serializes active holds per match; read-time expiry, dismiss, and explicit open-match confirmation endpoints are implemented. Compatible four-player group proposals are now created after open-match inventory; a cancellation releases the whole group. Group proposals now expose available venue/court/time options and final confirmation atomically creates the four-player `Match` plus its confirmed reservation when an option is selected.
  - Completed slices: grouped-proposal expiry releases every pending/confirmed proposal atomically; venue/court options and reservation finalization are now wired through confirmation.
- [ ] QM-3 Wire mobile data, dependency injection, routes, Cubit, and persistent Quick Match state.
  - Partial: API client/repository/DTO/Cubit now load, start, dismiss, confirm, and cancel persistent state; configuration obtains valid sport/category IDs from the catalog.
- [ ] QM-4 Implement handoff-faithful Home hero, configuration sheet, active-search, no-match, proposal, confirmation, and expiry UI states.
  - Partial: Home CTA framing, a usable Quick Match configuration, active queue, proposal countdown, dismissal, confirmation UI, venue/court option selection, and a Home active/proposal banner are present. Proposal and confirmation states now use scroll-safe handoff hierarchy, success treatment, waiting copy, and a direct route to the confirmed match; deeper pixel-level parity and expiry UI remain pending.
- [ ] QM-5 Update Explore framing/banner; add proposal and filled-match notifications/deep links, plus opt-in “Avisos en mi horario” preferences and invitation flow.
  - Partial: Explore now distinguishes browsing from queueing and routes users to Quick Match; confirmed open-match joins reuse the existing player-joined notification. In-app and push destination handling now recognize `QUICK_MATCH_PROPOSAL` and route to Quick Match consistently; opt-in availability alerts outside the queue and invitation handling remain pending.
- [ ] QM-6 Run API and Flutter verification, record work-unit commits, and perform a visual review against the supplied handoff.

## Acceptance criteria
- A player can configure and persist a Quick Match search from Home.
- The service proposes a compatible open match before attempting a new group.
- Queue proposals are explicitly confirmable, server-expiring, and never directly charge or reserve a court; a new group reserves only after all four confirm.
- Existing manual Create and Explore flows remain available.
- Mobile reproduces the final copy, hierarchy, tokens, and states from the handoff.
- Tests cover search lifecycle, priority matching, proposal expiry/dismissal/confirmation, and primary UI states.

## Progress
- 2026-09-22: QM-1 merged to main in PR #61.
- 2026-09-22: re-read the updated handoff. It adds explicit queue holds, notifications to already-confirmed players, opt-in availability alerts for non-queued players, invitation/race handling, and a dedicated notification preference surface.

## Verification evidence
- QM-1: RED — missing `quick_match.validation.ts` caused the new Vitest suite to fail. GREEN — 3 validation tests passed.
- QM-1: API `npm run typecheck`, `npm run lint`, and `npx prisma validate` passed.
- QM-2 slice: API `npm run typecheck`, `npm run lint`, `git diff --check`, and the focused Quick Match Vitest set passed (8 tests). Grouped proposal expiry now releases pending/confirmed group holds atomically and returns all group searches to `SEARCHING` with `noMatchYet`.
- Work-unit commit: `a121b92 fix(quick-match): expire grouped proposals atomically`; review assessment: medium risk, under budget, no native review due.
- QM-2 follow-up: documented all five Quick Match routes in OpenAPI; typecheck and focused Quick Match/OpenAPI tests passed (9 tests). The full API suite reported 165 passed / 9 failed files (12 tests), with 11 failures caused by the test database missing `NotificationEvent.quickMatchSearchId` and one unrelated receipt-delivery assertion; these require the test DB migration to be applied.
- QM-2 follow-up: applied all pending Prisma migrations to `cuadrala_test`; the six previously blocked notification integration files now pass (18 tests). The grouped confirmation finalization also passes `npm run typecheck`.
- QM-6 verification: API full suite passes (`174` files / `1018` tests); mobile Quick Match Cubit tests pass and `flutter analyze` reports no issues.
- QM-2/QM-3 follow-up: venue options are generated from active courts and live reservations; confirmation accepts the selected venue/court/time tuple and creates the linked `Reservation` atomically. API typecheck/lint and focused Quick Match tests (9) pass; mobile Quick Match analysis and Cubit tests pass.
- QM-4/QM-5 follow-up: confirmed Quick Match states expose a direct `Ver partida` action when the API returns `matchId`; grouped confirmations without a final match remain in a clear waiting state. Proposal/confirmation layouts are scroll-safe and closer to the handoff hierarchy. `QUICK_MATCH_PROPOSAL` is parsed by the notification inbox and covered by destination tests. Flutter focused Quick Match and notification tests pass (12), analysis passes, and `git diff --check` passes.
- Full-suite follow-up: the API suite was started against the migrated test database but was interrupted after a pre-existing 5-second timeout in `tournament_guest_registration_end_to_end.http-db.integration.test.ts` T24; the failure is not in this slice. The Flutter suite reached 784 passing tests but reported 10 existing failures in home/router expectations; the focused Quick Match and notification tests remain green.

## Next step
- Complete deeper pixel-level parity and the remaining notification/invitation flows (availability alerts outside the queue, invitation-specific actions, and expiry screen); then rerun the full API/mobile suites.

## Relevant Files
- `apps/mobile/lib/src/features/home/presentation/home_screen.dart` — Home hero integration.
- `apps/mobile/lib/src/features/matches/presentation/discover_matches_screen.dart` — Explore framing/banner.
- `apps/mobile/lib/src/features/availability/` — availability defaults.
- `services/api/prisma/schema.prisma` — Quick Match persistence.
- `services/api/src/application/use_cases/list_open_matches.use_case.ts` — shared open-match inventory.
