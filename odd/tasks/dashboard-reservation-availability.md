# Dashboard reservation availability

## Objective
Prevent owner dashboard users from selecting court blocks that the reservation API rejects as occupied, and make blocking use the same authoritative block-selection experience.

## Problem
Production reproduction on 2026-09-28: Cancha 1, 2026-10-04, 10:00–11:00 was rendered selectable, but the create request failed. The modal derives availability from `GET /bookings`; the authoritative `GET /courts/:courtId/slots` endpoint applies the server's live-reservation rule used for availability.

## Scope
- Make legacy reservation responses JSON-safe so a successful database transaction is never reported to the dashboard as a generic server error.
- Replace the block form time/duration inputs with the same court-duration block grid used by New Reservation.
- Request authoritative court slots and make unavailable blocks unselectable before blocking.
- Surface the API error message when blocking fails instead of a generic failure.
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
- [x] DRA-4 — Verified and committed availability alignment. Evidence: focused test 3/3; full suite 22 files / 125 tests; lint; build all passed. Commit `be3d4db`.
- [x] DRA-5 — Traced and fixed the post-commit 500 in legacy reservation responses. Route: delegated direct (mapping and writer triggers: cancellation spans UI, API use case, repository, and tests). Evidence: `ReservationDTO` carries native `bigint`; Express serialization threw after Prisma committed. The controller now uses the established JSON-safe booking mapper.
- [x] DRA-6 — Prevent false create/cancel failures caused by response serialization. Route: delegated direct (same work unit). Evidence: create, list, cancel, block, and unblock use JSON-safe mapper output; client now receives the success response instead of a post-commit 500.
- [x] DRA-7 — Verified regression and production cancellation. Route: inline verification. Evidence: cancellation was shown as `Cancelada` after reload; focused API regression 2/2, typecheck, and lint passed. Full API suite has pre-existing integration failures involving Resend/notification configuration and tournament fixtures.
- [x] DRA-8 — Aligned BlockSlotModal with the New Reservation four-column block grid and authoritative court-slot availability. Route: delegated direct (writer trigger: modal, API client, and regression test). Evidence: block duration comes from the selected court; loading, fetch failure, and unavailable blocks are disabled.
- [x] DRA-9 — Preserved block API errors and verified the full UI contract. Route: delegated direct (same work unit). Evidence: payload uses `scheduledAt` ISO instead of incompatible `date`/`startTime`; regression tests 3/3, lint, and production build passed.

## Acceptance criteria
- The modal disables every slot reported unavailable by `/courts/:courtId/slots`.
- Blocking submits the strict API contract (`scheduledAt`, `durationMinutes`, optional `notes`) and presents its error message.
- The modal uses the court duration and date when requesting authoritative availability.
- A create 409 continues to show the API message.
- Focused tests, full web suite, lint, and build pass.

## Progress
- Earlier HELD-only correction is valid defensively but did not explain the reported incident; local commit `dafcfca` remains unpushed.
- Root mismatch reproduced in production after Render recovered.
- Confirmed production behavior: the test reservation was created and later cancelled even though the dashboard initially displayed a generic error; reloading showed status `Cancelada`.
- Root cause: raw legacy controller DTOs contain native `bigint` monetary values. `res.json` throws after the database transaction commits, so rollback is no longer possible at that point.
- Fix: return `mapBookingToResponseSV` / `mapBookingsListToResponseSV`, which stringify minor monetary values before Express serializes the payload.
- `2abea49` was pushed to `origin/main`.
- Root cause for block errors: BlockSlotModal sent strict-schema-invalid `date` and `startTime` fields instead of `scheduledAt`, then discarded the API 400 message.
- Fixed in commit `cd39c7e`: UI now mirrors reservation block selection and sends the valid contract.
- Next step: push only with explicit authorization.

## Verification
- `cd apps/web && npm test -- src/components/schedule/ReservationModal.test.tsx` — 3/3 passed.
- `cd apps/web && npm test` — 22 files / 125 tests passed.
- `cd apps/web && npm run lint` — passed.
- `cd apps/web && npm run build` — passed.
- `cd services/api && npm test -- src/test/unit/reservations.controller.test.ts` — 2/2 passed.
- `cd services/api && npm run typecheck` — passed.
- `cd services/api && npm run lint` — passed.
- `cd services/api && npm test` — not clean: integration failures are unrelated to this controller change (Resend 422 notification delivery and tournament integration fixtures).
- `cd apps/web && npm test -- src/components/schedule/BlockSlotModal.test.tsx` — 3/3 passed.
- `cd apps/web && npm run lint` — passed.
- `cd apps/web && npm run build` — passed.
- Runtime harness: production reproduction proved the prior availability false positive. The test reservation was persisted and then confirmed cancelled after reload.
- Rollback boundary: revert the court-slots API client typing and ReservationModal availability source, and the JSON-safe mapping in the legacy reservations controller.
