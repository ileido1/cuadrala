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
  - Partial: open-match priority now validates the selected time slot and serializes active holds per match; read-time expiry, dismiss, and explicit open-match confirmation endpoints are implemented. Compatible four-player group proposals are now created after open-match inventory; a cancellation releases the whole group. Court selection/reservation after four confirmations is still pending.
- [ ] QM-3 Wire mobile data, dependency injection, routes, Cubit, and persistent Quick Match state.
  - Partial: API client/repository/DTO/Cubit now load, start, dismiss, confirm, and cancel persistent state; configuration obtains valid sport/category IDs from the catalog.
- [ ] QM-4 Implement handoff-faithful Home hero, configuration sheet, active-search, no-match, proposal, confirmation, and expiry UI states.
  - Partial: Home CTA framing and a usable Quick Match configuration, active queue, proposal countdown, dismissal, and confirmation UI are present; visual parity and navigation to the confirmed match remain pending.
- [ ] QM-5 Update Explore framing/banner; add proposal and filled-match notifications/deep links, plus opt-in “Avisos en mi horario” preferences and invitation flow.
  - Partial: Explore now distinguishes browsing from queueing and routes users to Quick Match; confirmed open-match joins reuse the existing player-joined notification. Dedicated proposal delivery and a deep link to Quick Match are implemented; opt-in availability alerts outside the queue and invitation handling remain pending.
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

## Next step
- Complete QM-2 group formation and notification delivery, then add widget tests and connect confirmed proposals to the match detail deep link.

## Relevant Files
- `apps/mobile/lib/src/features/home/presentation/home_screen.dart` — Home hero integration.
- `apps/mobile/lib/src/features/matches/presentation/discover_matches_screen.dart` — Explore framing/banner.
- `apps/mobile/lib/src/features/availability/` — availability defaults.
- `services/api/prisma/schema.prisma` — Quick Match persistence.
- `services/api/src/application/use_cases/list_open_matches.use_case.ts` — shared open-match inventory.
