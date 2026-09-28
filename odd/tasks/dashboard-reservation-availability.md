# Dashboard reservation availability

## Objective
Prevent owner dashboard users from selecting court blocks that the reservation API rejects as occupied.

## Problem
Production reproduction on 2026-09-28: Cancha 1, 2026-10-04, 10:00–11:00 was rendered selectable, but the create request failed. The modal derives availability from `GET /bookings`; the authoritative `GET /courts/:courtId/slots` endpoint applies the server's live-reservation rule used for availability.

## Scope
- Fetch each selected court/date availability from the authoritative court-slots endpoint.
- Render only API-authorized slots as selectable, preserving venue hours and pricing display.
- Keep the API conflict message on failed creation as a race-condition fallback.
- Add regression coverage for authoritative unavailability and conflict feedback.

## Constraints
- Do not create, cancel, or alter production data during automated verification.
- TDD: enabled by project convention; runner: `npm test` in `apps/web`.
- Delivery strategy: ask-on-risk; forecast: under 400 authored lines; one work-unit commit.

## Tasks
- [x] DRA-1 — Reproduced production false positive. Evidence: 2026-10-04, Cancha 1, 10:00–11:00 rendered free; POST failed. Route: inline verification.
- [x] DRA-2 — Added regressions for authoritative court-slot availability and conflict feedback. Route: delegated direct. Evidence: RED observed by delegated writer (2 failures); focused test GREEN (3/3).
- [x] DRA-3 — Replaced booking-derived availability with court-slots response; fails closed while loading or on fetch failure. Route: delegated direct (same bounded work unit).
- [x] DRA-4 — Verified and prepared the work unit. Route: inline verification. Evidence: focused test 3/3; full suite 22 files / 125 tests; lint; build all passed. Commit pending.

## Acceptance criteria
- The modal disables every slot reported unavailable by `/courts/:courtId/slots`.
- The modal uses the court duration and date when requesting authoritative availability.
- A create 409 continues to show the API message.
- Focused tests, full web suite, lint, and build pass.

## Progress
- Earlier HELD-only correction is valid defensively but did not explain the reported incident; local commit `dafcfca` remains unpushed.
- Root mismatch reproduced in production after Render recovered.
- Next step: create the work-unit commit.

## Verification
- `cd apps/web && npm test -- src/components/schedule/ReservationModal.test.tsx` — 3/3 passed.
- `cd apps/web && npm test` — 22 files / 125 tests passed.
- `cd apps/web && npm run lint` — passed.
- `cd apps/web && npm run build` — passed.
- Runtime harness: production reproduction proved the prior false positive; no production data was persisted.
- Rollback boundary: revert the court-slots API client typing and ReservationModal availability source; backend remains unchanged.
