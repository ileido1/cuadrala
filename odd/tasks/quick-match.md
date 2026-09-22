# Deliver availability-first Quick Match

## Objective
Implement the Flutter and API Quick Match feature from `/home/chernandez/Descargas/Cuadrala (6)/design_handoff_encontrar_partida/`, so a player can enter an availability-based search, receive a confirmable proposal, and continue into existing match/payment flows.

## Problem
The app currently lists open matches and supports manual creation, but has no persistent search, proposal lifecycle, or notification-driven route for a player who wants to play without a group.

## Scope and constraints
- The handoff is reference material only; recreate it in Flutter and existing API architecture, never copy its React prototype.
- Preserve manual Create Match and the open-match listing; Quick Match uses the same open-match inventory first.
- Never reserve or charge automatically; the server owns proposal expiry and confirmation.
- Follow existing Clean Architecture and Flutter feature-first/Cubit conventions.
- Route: delegated direct would normally be required: the implementation spans mobile UI, routing/DI, API persistence/endpoints, matching behavior, notification integration, and tests. No subagent runtime is available in this session, so implementation will be sequenced in bounded work units inline.
- TDD: enabled by repository instruction. Runners: API Vitest and Flutter widget/unit tests; observe RED before each behavior where testable.
- Delivery strategy: stacked-to-main (user-selected 2026-09-22). Forecast: well over 400 authored lines. Each merged work-unit slice lands in main before the next branch is created from main.

## Tasks
- [x] QM-1 Define persistent Quick Match domain, schema, repositories, and API contracts for search lifecycle and proposals.
  - Route: inline due unavailable subagent runtime; RED observed for the contract schema, then GREEN.
  - Evidence: Prisma migration + generated client; `npm run typecheck`, `npm run lint`, targeted Vitest validation test, and `npx prisma validate` passed.
  - Commit: `feat(quick-match): persist player searches` (QM-1 work-unit head).
- [ ] QM-2 Implement server matching against open matches first, then compatible active searches; enforce expiry, dismissal, and confirmation rules.
- [ ] QM-3 Wire mobile data, dependency injection, routes, Cubit, and persistent Quick Match state.
- [ ] QM-4 Implement handoff-faithful Home hero, configuration sheet, active-search, no-match, proposal, confirmation, and expiry UI states.
- [ ] QM-5 Update Explore to its new framing/banner and connect notification/deep-link handling for proposals.
- [ ] QM-6 Run API and Flutter verification, record work-unit commits, and perform a visual review against the supplied handoff.

## Acceptance criteria
- A player can configure and persist a Quick Match search from Home.
- The service proposes a compatible open match before attempting a new group.
- Proposals are explicitly confirmable, server-expiring, and never directly charge or reserve a court.
- Existing manual Create and Explore flows remain available.
- Mobile reproduces the final copy, hierarchy, tokens, and states from the handoff.
- Tests cover search lifecycle, priority matching, proposal expiry/dismissal/confirmation, and primary UI states.

## Progress
- 2026-09-22: inspected the complete handoff and current architecture. Existing open-match inventory, availability management, notification runtime, manual creation, and payment routes can be reused; no persistent Quick Match model or API exists.

## Verification evidence
- QM-1: RED — missing `quick_match.validation.ts` caused the new Vitest suite to fail. GREEN — 3 validation tests passed.
- QM-1: API `npm run typecheck`, `npm run lint`, and `npx prisma validate` passed.

## Next step
- QM-2 on `codex/quick-match-proposals`: match compatible open inventory first, then create server-expiring proposals with explicit dismiss/confirm rules.

## Relevant Files
- `apps/mobile/lib/src/features/home/presentation/home_screen.dart` — Home hero integration.
- `apps/mobile/lib/src/features/matches/presentation/discover_matches_screen.dart` — Explore framing/banner.
- `apps/mobile/lib/src/features/availability/` — availability defaults.
- `services/api/prisma/schema.prisma` — Quick Match persistence.
- `services/api/src/application/use_cases/list_open_matches.use_case.ts` — shared open-match inventory.
