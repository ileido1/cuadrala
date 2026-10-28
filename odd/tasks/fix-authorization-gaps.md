# Fix authorization gaps (issues #49, #50, #67)

## Objective
Close three authorization bugs found while auditing the API against the GitHub project board. Each gets its own branch, commit, and (eventually) PR, closing its own issue.

## Problem
Three write endpoints authenticate the caller but either skip authorization entirely or ignore the authenticated actor:

- `POST /matches/:matchId/transactions/create-obligations` and `POST /reservations/:reservationId/transactions/create-obligations` have **no auth middleware at all** (issue #49).
- `postVenueCON`, `postRegisterTournamentParticipantCON`, `withdrawTournamentRegistrationCON` authenticate but take the acting identity from body/path instead of `_req.authUser` (issue #50).
- `postUpsertVenueStaffCON` extracts the actor only for the 401 guard, then lets any authenticated user grant themselves staff/owner role on any venue (issue #67).

## Decisions (user, 2026-10-23)
- **#49**: actor must be a participant of the match/reservation, and `participantUserIds` (if provided) may not contain any id other than the actor's — matches the only real caller (`pay_method_screen.dart`, self-service "pay my share").
- **#50**: resolve identity from `_req.authUser`; acting on behalf of another user requires the actor to be the match/tournament organizer or venue staff (per issue #50 acceptance criteria).
- **#67**: actor must already be `VenueStaff` of that venue (`assertVenueStaffSV`), with a bootstrap exception: the venue's `ownerUserId` may create the first staff record for a venue that has none yet.
- **#67 revised (2026-10-23)**: dropped the owner-bootstrap exception. `createVenueSV` already inserts a `VenueStaff` row with `role: 'OWNER'` for `ownerUserId` in the same transaction as venue creation (`prisma_venue_repository.ts:321-351`), so "sede nueva sin staff" does not occur in the real flow — the exception would have been dead code. Also: implementing it would have required a new read method on `VenueRepository`/`PrismaVenueRepository` to expose `ownerUserId`, which is outside T1's allowed edit surface. `UpsertVenueStaffUseCase` now enforces `assertVenueStaffSV` with no exception.

## Scope and constraints
- TDD: Vitest is the runner; observe RED before implementing each fix.
- Each issue is its own branch off `main`, its own work-unit commit(s), referencing `Closes #N` in the commit/PR body.
- Run `npm run typecheck && npm run lint && npm test` (services/api) before closing each task.
- Do not touch the 5 backlog feature issues (#33, #35, #36, #37, #47) — out of scope here.

## Tasks
- [x] T1 (#67) `UpsertVenueStaffUseCase` takes `actorUserId`, enforces `assertVenueStaffSV` (no bootstrap exception — see revised decision above); controller passes the actor through. Tests: non-staff → 403; existing staff can add another; venue owner (already staff via auto-creation) can add another.
  - Files: `services/api/src/application/use_cases/upsert_venue_staff.use_case.ts` (added `actorUserId` to `executeSV`, calls `assertVenueStaffSV` before `upsertSV`), `services/api/src/application/use_cases/upsert_venue_staff.use_case.test.ts` (new, 3 tests), `services/api/src/presentation/controllers/venue_staff.controller.ts:25` (passes `ACTOR_USER_ID`). `venue_staff.composition.ts` needed no change — `VenueStaffRepository` was already injected.
  - RED confirmed: 3/3 new tests failed before the fix (no authorization check, so the non-staff case didn't reject).
  - GREEN confirmed: 3/3 new tests pass after the fix.
  - `npm run typecheck`: pass, no errors.
  - `npm run lint`: pass, 0 errors/0 warnings repo-wide.
  - `npm test` (full suite): 1057/1058 passed. 1 pre-existing failure, unrelated: `src/test/integration/quick_match_group.http-db.integration.test.ts` (quick-match group departure, expects 201 got 500). Verified identical on `main` (`git diff main fix/venue-staff-authorization -- services/api/src/test/integration/quick_match_group.http-db.integration.test.ts services/api/src/application/use_cases/match_quick_match.use_case.ts` → empty diff), so this is a pre-existing red on `main`, not caused by this change.
  - Branch: `fix/venue-staff-authorization`.
- [ ] T2 (#50) `postVenueCON` sets `ownerUserId` from `_req.authUser`; `postRegisterTournamentParticipantCON`/`withdrawTournamentRegistrationCON` resolve the target user from `_req.authUser` unless the actor is the tournament organizer or venue staff. Tests cover "user A sends user B's id".
- [ ] T3 (#49) Add `requireAuth` to both `create-obligations` routes; use cases take `actorUserId`, reject if not a match/reservation participant, reject if `participantUserIds` contains anyone but the actor.

## Verification
- `cd services/api && npm run typecheck`
- `cd services/api && npm run lint`
- `cd services/api && npm test`
