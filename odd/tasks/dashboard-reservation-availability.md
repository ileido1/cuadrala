# Dashboard reservation availability

## Objective
Prevent owner dashboard users from selecting a court block that the reservation API will reject as occupied.

## Problem
`ReservationModal` only treats `CONFIRMED` bookings as occupied, but the backend's live occupancy rule includes both `HELD` and `CONFIRMED`. The UI can therefore show a held slot as available and receive `409 CONFLICTO` on creation.

## Scope
- Display `HELD` and `CONFIRMED` bookings as occupied in the reservation modal.
- Preserve and display the API conflict message for a failed reservation creation.
- Add focused regression coverage.

## Constraints
- Do not alter backend conflict semantics; it is the source of truth.
- TDD: enabled by project convention; runner: `npm test` in `apps/web`.
- Delivery strategy: ask-on-risk; forecast: under 400 authored lines; one work-unit commit.

## Tasks
- [x] DRA-1 — Added regressions for held-slot occupancy and the 409 message. Route: delegated direct (writer trigger: modal and test are non-trivial files). Evidence: RED observed by delegated writer; focused test GREEN (3/3).
- [x] DRA-2 — Modal now treats HELD and CONFIRMED as occupied and preserves the API message. Route: delegated direct (same bounded work unit).
- [x] DRA-3 — Verified and prepared the work unit. Route: inline verification. Evidence: focused test 3/3; full suite 22 files / 125 tests; lint; build all passed. Commit pending.

## Acceptance criteria
- A `HELD` booking for the selected court/date cannot be selected in the modal.
- A `CONFIRMED` booking remains unavailable.
- The API-provided `409 CONFLICTO` message is shown to the user.
- Focused tests, lint, and build pass.

## Progress
- Discovery confirmed on 2026-09-28: frontend filters reservations to `CONFIRMED`; backend occupancy uses `HELD` and `CONFIRMED`.
- Next step: create the work-unit commit.

## Verification
- `cd apps/web && npm test -- src/components/schedule/ReservationModal.test.tsx` — 3/3 passed.
- `cd apps/web && npm test` — 22 files / 125 tests passed.
- `cd apps/web && npm run lint` — passed.
- `cd apps/web && npm run build` — passed.
- Runtime harness: N/A; this is a client component unit test and no authenticated production-safe test account is available.
- Rollback boundary: revert the ReservationModal occupancy/error handling and its focused test; no backend behavior changes.
