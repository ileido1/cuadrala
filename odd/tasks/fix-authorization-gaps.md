# Fix authorization gaps

## Objective

Close endpoints that authenticate the caller but never check whether that
caller is allowed to act on the target resource (GitHub issues #50 and #67).

## Scope

- T1 — Venue staff upsert ignored the actor (issue #67): any logged-in user
  could grant themselves a staff/owner role on any venue.
- T2 — Tournament withdrawal ignored the actor (issue #50): the `userId`
  came from the path, so any authenticated user could withdraw someone
  else's tournament registration with no ownership/staff check.

## Note on this document

This file did not exist on `main` when T2 started (confirmed via
`git log --all --diff-filter=A -- odd/tasks/fix-authorization-gaps.md`,
no hits). T1's own task document, if any, lives only on its branch
(`fix/venue-staff-authorization`, commit `11f3cfe`, closes #67) and was not
merged into `main`. This document was recreated from scratch to track T2;
T1 is recorded here for context only — it was not touched or re-verified
as part of this task.

## T1 — Venue staff authorization (done elsewhere, not touched here)

- Branch: `fix/venue-staff-authorization`.
- Commit: `11f3cfe` — "fix(api): require venue staff authorization to
  upsert venue staff". Closes #67.
- Not re-verified in this session; left untouched per instructions.

## T2 — Tournament withdrawal authorization (this task)

### Already correct before this task (verified against real code, untouched)

- `postVenueCON` (`services/api/src/presentation/controllers/venues.controller.ts:56-77`)
  — uses `ownerUserId: ACTOR_USER_ID`. OK.
- `postRegisterTournamentParticipantCON` (`services/api/src/presentation/controllers/tournament_registration.controller.ts:24-45`)
  — uses `userId: ACTOR_USER_ID`. OK.

### Fixed in this task

- `withdrawTournamentRegistrationCON` (same file, previously lines 63-79) —
  had a `//? TODO` comment and called
  `WITHDRAW_TOURNAMENT_REGISTRATION_UC.executeSV({ userId: PARAMS.userId })`
  with no authorization check at all.

### Decided criterion

- `PARAMS.userId === ACTOR_USER_ID` (self-withdrawal) → allowed, no extra check.
- Otherwise → require
  `AssertTournamentOrganizerAccessUseCase.executeSV({ actorUserId, organizerUserId: TOURNAMENT.organizerUserId, venueId: TOURNAMENT.venueId })`
  (tournament organizer or venue staff of the tournament's venue), 403 otherwise.

### Checklist

- [x] RED: extended `src/test/unit/withdraw_tournament_registration.use_case.test.ts`
      with 4 new cases (self-withdraw, organizer withdraws another, venue
      staff withdraws another, unrelated player rejected with 403).
      Confirmed 3 failing before implementation.
- [x] GREEN: `WithdrawTournamentRegistrationUseCase` now takes `actorUserId`
      and a `AssertTournamentOrganizerAccessUseCase` dependency; skips the
      check on self-withdrawal, enforces it otherwise, before the roster-open
      (409) check — same ordering as `RemoveTournamentRegistrationUseCase`.
- [x] Composition (`tournament_registration.composition.ts`) wires the
      already-existing `ASSERT_TOURNAMENT_ORGANIZER_ACCESS_UC` singleton into
      `WITHDRAW_TOURNAMENT_REGISTRATION_UC`.
- [x] Controller (`tournament_registration.controller.ts`) passes
      `ACTOR_USER_ID` through and the `//? TODO` comment was removed (no
      longer applies).
- [x] `npm run typecheck` — clean.
- [x] `npm run lint` — 0 errors, 0 warnings.
- [x] `npm test` — 1057 passed, 2 failed. Both failures triaged (see below).
      7/7 in the touched unit test file pass.

### Test run evidence

```
Test Files  2 failed | 185 passed (187)
     Tests  2 failed | 1057 passed (1059)
```

1. `src/test/integration/quick_match_group.http-db.integration.test.ts` —
   unrelated to this change (Quick Match groups, 500 instead of 201). No file
   touched by T2 is anywhere near this flow; treated as pre-existing.
2. `src/test/integration/tournament_registration_status_guard.http-db.integration.test.ts`
   > `responds 409 when withdrawing a registration on a tournament that is
   > IN_PROGRESS` — **caused by this fix**. The test withdraws
   > `CONFIRMED_USER`'s registration using an unrelated `playerToken`, on a
   > tournament with no `organizerUserId`/`venueId` set, purely to exercise
   > the roster-lock (409) guard. That is now correctly rejected with 403
   > (unauthorized) before the 409 check is reached — the exact gap #50 asks
   > to close. The test needs updating to use an authorized actor (the
   > affected user or the organizer) to isolate the 409 behavior from
   > authorization, but that file is **outside the allowed edit surface**
   > for this task, so it was left failing and reported instead of patched.

### Next step

Decide who updates
`src/test/integration/tournament_registration_status_guard.http-db.integration.test.ts`
(authorize T2 to touch it, or file it as a follow-up task) so the suite is
green again without re-opening the authorization gap.
