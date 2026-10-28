# Fix authorization gaps (issues #49, #50, #67)

## Objective
Close three authorization bugs found while auditing the API against the GitHub project board. Each gets its own branch and commit(s), closing its own issue.

## Problem
Three write endpoints authenticate the caller but either skip authorization entirely or ignore the authenticated actor:

- `POST /matches/:matchId/transactions/create-obligations` and `POST /reservations/:reservationId/transactions/create-obligations` have **no auth middleware at all** (issue #49).
- `postVenueCON`, `postRegisterTournamentParticipantCON`, `withdrawTournamentRegistrationCON` authenticate but take the acting identity from body/path instead of `_req.authUser` (issue #50).
- `postUpsertVenueStaffCON` extracts the actor only for the 401 guard, then lets any authenticated user grant themselves staff/owner role on any venue (issue #67).

## Decisions (user, 2026-10-23 — refined 2026-10-26, refined again 2026-10-28)
- **#49 match obligations — final design**: two authorization paths, same mechanism as #50 (`AssertTournamentOrganizerAccessUseCase`, generic despite the name — reused, not reinvented):
  - Self-service: `TARGET_IDS` (the ids the request would create obligations for, i.e. `participantUserIds` or, when omitted, all match participants) is exactly `[actorUserId]` → allowed with only the pre-existing "must be a participant" check. This is the real `apps/mobile` `pay_method_screen.dart` caller.
  - Anyone else, or "all participants at once" (the default when `participantUserIds` is omitted, same as before this fix existed) → requires `assertTournamentOrganizerAccess.executeSV({ actorUserId, organizerUserId: MATCH.organizerUserId, venueId: MATCH.venueId })`: the match organizer, or venue staff of the match's venue. This restores the pre-fix "organizer/staff generates for everyone" behavior, now gated instead of open to any authenticated user.
  - Superseded: the earlier "never a non-self id, period" rule from 2026-10-26 — that broke the real staff/organizer flow and is no longer correct.
- **#49 reservation obligations**: unchanged from 2026-10-26 — actor must be **venue staff of that reservation's venue** (`assertVenueStaffSV`), no self-only restriction (staff generates for the reservation's responsible user, e.g. `apps/web/src/components/schedule/PaymentConfirmDialog.tsx:779-789`).
- **#50**: resolve identity from `_req.authUser`; acting on behalf of another user requires the actor to be the match/tournament organizer or venue staff. **Done** — see T2 evidence below; only `withdrawTournamentRegistrationCON` needed the fix, the other two endpoints in the original issue were already correct in `main`.
- **#67**: actor must already be `VenueStaff` of that venue (`assertVenueStaffSV`), no bootstrap exception needed — venue creation already inserts the owner as staff in the same transaction. **Done** — see T1 evidence below.

## Scope and constraints
- TDD: Vitest is the runner; observe RED before implementing each fix.
- Each issue is its own branch off `main`, its own work-unit commit(s), referencing `Closes #N` in the commit/PR body.
- Run `npm run typecheck && npm run lint && npm test` (services/api) before closing each task.
- Do not touch the 5 backlog feature issues (#33, #35, #36, #37, #47) — out of scope here.

## Tasks
- [x] T1 (#67) `UpsertVenueStaffUseCase` takes `actorUserId`, enforces `assertVenueStaffSV` (no bootstrap exception — owner is already staff via auto-creation at venue creation). Branch `fix/venue-staff-authorization`, commit `11f3cfe`. TDD RED→GREEN confirmed (3/3). `typecheck`/`lint` clean. `npm test` full suite: 1057/1058 passed, 1 pre-existing unrelated failure (`quick_match_group.http-db.integration.test.ts`, confirmed identical on `main`).
- [x] T2 (#50) `WithdrawTournamentRegistrationUseCase` takes `actorUserId` + `AssertTournamentOrganizerAccessUseCase` (reused existing dependency); self-withdrawal skips the check, anyone else requires organizer or venue staff. `postVenueCON`/`postRegisterTournamentParticipantCON` needed no change (already correct). Branch `fix/tournament-withdrawal-authorization`, commits `fafb9f7` + `9c68b86` (fixed a pre-existing integration test that implicitly relied on the authorization gap to reach its 409 assertion). TDD RED→GREEN confirmed. `typecheck`/`lint` clean. `npm test` full suite: 1058/1059 passed, same 1 pre-existing unrelated failure as T1.
- [x] T3 (#49) — two sub-fixes, same endpoint family, branch `fix/create-obligations-authorization`.
  - Match side: `requireAuth` added to `POST /matches/:matchId/transactions/create-obligations`. `CreateMatchObligationUseCase` takes `actorUserId` + injected `AssertTournamentOrganizerAccessUseCase`. Self-service (`TARGET_IDS === [actorUserId]`) only requires match participation; anyone else, or the "all participants" default, requires organizer-or-staff access (see Decisions above). Added `organizerUserId: string` to `PaymentMatchWithParticipantsDTO` (`domain/ports/payment_match_read_repository.ts`) and to the Prisma adapter's return (`infrastructure/adapters/prisma_payment_match_read_repository.ts`) — it's a required scalar on `Match` already returned by the existing `include`-based query, no query shape change needed.
  - Reservation side: `requireAuth` added to `POST /reservations/:reservationId/transactions/create-obligations`; `CreateReservationObligationUseCase` takes `actorUserId` + injected `VenueStaffRepository`, requires `assertVenueStaffSV(actorUserId, RESERVATION.venueId, venueStaffRepository)` before creating (no self-only restriction). Unchanged from the first pass.
  - Controller (`monetization.controller.ts`): both `postCreateMatchObligationsCON`/`postCreateReservationObligationsCON` extract `ACTOR_USER_ID` via the file's existing inline `_req.authUser?.id` + 401-guard pattern (consistent with 3 other handlers in the same file) and pass it through.
  - Composition (`monetization.composition.ts`): instantiated `ASSERT_TOURNAMENT_ORGANIZER_ACCESS_UC = new AssertTournamentOrganizerAccessUseCase(VENUE_STAFF_REPOSITORY)` locally (same per-file-instance convention as `tournaments.composition.ts` etc. — it's stateless, no shared singleton needed) and wired it into `CREATE_MATCH_OBLIGATION_UC`; `VENUE_STAFF_REPOSITORY` (already instantiated) wired into `CREATE_RESERVATION_OBLIGATION_UC`. `PaymentOrchestrator` needed no change (forwards via `Parameters<UseCase['executeSV']>`).
  - Unit tests: `create_match_obligation.use_case.test.ts` (6 tests — self-service, non-participant self-service rejected, organizer-generates-for-all, staff-generates-for-all, default-to-self-when-no-organizer-access, non-organizer-targeting-another-participant rejected) and `create_reservation_obligation.use_case.test.ts` (3 tests), both TDD RED→GREEN confirmed.
  - 6 integration/contract test files fixed (user-authorized expansion of the allowed edit surface, confirmed each one's existing setup already had the right actor/token available — no scenario rewrites were actually needed, only missing `Authorization` headers):
    - `src/test/http/endpoints.http.contract.test.ts` — added the file's existing `VALID_ACCESS_TOKEN` to the matchId-UUID-validation request.
    - `src/test/integration/monetization.integration.test.ts` — added `Authorization: Bearer ${authToken}` (userA, already `VenueStaff` of the match's venue) to both create-obligations requests.
    - `src/test/integration/payment_wave1_gate.integration.test.ts`, `multi_currency_match_confirm.integration.test.ts` — added `Authorization: Bearer ${authToken}` (staffUserId, already `VenueStaff`, signed before the call) to the match create-obligations request.
    - `src/test/integration/multi_currency_ledger.integration.test.ts`, `multi_currency_reservation_confirm.integration.test.ts` — added `Authorization: Bearer ${authToken}` (staffUserId, already `VenueStaff` of the reservation's venue) to the reservation create-obligations request.
  - `typecheck` and `lint` (services/api): clean.
  - `npm test` full suite: **1063/1064 passed** (188/189 files), 1 pre-existing unrelated failure (`quick_match_group.http-db.integration.test.ts`, same baseline as T1/T2, confirmed identical on `main`). All 6 previously-broken files now pass.

## Verification
- `cd services/api && npm run typecheck`
- `cd services/api && npm run lint`
- `cd services/api && npm test`
