# Align web backoffice contracts and auth verification

## Objective
Bring the Next.js backoffice onto the current unified booking contract, restore reliable web quality gates, and verify login/registration against the current API contract.

## Problem
The calendar already reads unified `/venues/:venueId/bookings`, while the direct-reservation modal independently reads legacy `/reservations` to calculate availability. That can hide MATCH/BLOCKED occupancy. Web quality gates also fail before they can validate auth flows: `ErrorAlert` depends on an unavailable React global in Vitest, test matcher types are absent, and chat test requests use `null` where the client type accepts `undefined`.

## Scope and constraints
- Authorized scope: `apps/web` plus tests/config necessary to make the stated checks meaningful. No API contract change unless verification proves a web/API mismatch.
- Preserve direct-reservation creation and its reservation-payment endpoints; only occupancy reads move to the unified booking inventory.
- Verify login and registration using the existing API client, current auth endpoints, schemas, and automated UI/API-contract tests. Do not send real user credentials or call a remote deployment without separate explicit authorization.
- Route: delegated direct is normally required because this spans the booking availability adapter, auth UI, API-client tests, and test configuration (4+ files). No callable writer delegation surface is available in this runtime, so bounded tasks proceed inline.
- TDD: enabled by repository instruction. Runner: `npm test`; observe RED before each behavior fix.
- Delivery strategy: ask-on-risk; forecast ~250 authored changed lines across three independent work units.

## Tasks
- [x] WBA-1 Make direct-reservation availability use unified bookings, including MATCH/BLOCKED occupancy, with focused tests.
  - Evidence: focused `ReservationModal` and slot tests pass; the modal calls `/bookings` and only confirmed entries occupy slots.
- [x] WBA-2 Repair the web test/type quality gates without weakening assertions.
  - Evidence: restored automatic JSX transform and jest-dom matcher setup; `npm test` passes 19 files / 108 tests and `npx tsc --noEmit` passes.
- [x] WBA-3 Verify the LoginForm login and registration requests against current API validation/routes, and remove client-controlled venue ownership discovered in the registration flow.
  - Evidence: web API-contract tests cover `/auth/register` and `/venues`; existing NextAuth tests cover `/auth/login`. Venue creation now derives ownership from `requireAuth` actor and rejects client `ownerUserId`; focused API tests pass.
- [x] WBA-4 Run the full API and web checks, record evidence, and commit coherent work units. Runtime remote auth check is N/A unless explicitly authorized.
  - Evidence: API typecheck and lint pass. Full API suite fails outside this change: 10 integration files / 34 failures, led by foreign-key setup failures in tournament materialization/result tests. Web tests pass 19 files / 109 tests; standalone typecheck and production build pass. Build preserves seven pre-existing exhaustive-deps warnings.

## Acceptance criteria
- A staff member cannot be offered a direct-reservation time that overlaps a confirmed MATCH, DIRECT booking, or BLOCKED slot.
- `npm test` passes and standalone TypeScript validation is meaningful and green.
- Login and registration use `/api/v1/auth/login` and `/api/v1/auth/register` with payloads accepted by current API validation.
- `npm run build` passes without newly introduced warnings.

## Initial evidence
- `apps/web/src/components/schedule/ReservationModal.tsx` uses `/reservations` for availability; `apps/web/src/app/dashboard/schedule/page.tsx` uses `/bookings`.
- `services/api/src/presentation/routes/bookings.router.ts` states bookings replace matches + reservations.
- Current audit: every actively consumed endpoint examined remains registered; no removed endpoint target was found.
- Registration uses the correct `POST /auth/register` request shape, but its second step posts `ownerUserId` to venue creation. The API currently accepts that body value despite the authenticated actor, which permits assigning a venue to another user. The fix must derive ownership from the authenticated actor and stop sending the field from the client.
- Before implementation: `npm test` had 5 ErrorAlert failures (`React is not defined`); `npx tsc --noEmit` had 9 test-only errors; `npm run build` succeeded with pre-existing exhaustive-deps warnings.
- Completed checks: focused booking and ownership tests pass; web `npm test` passes 19 files / 109 tests, `npx tsc --noEmit` passes, and `npm run build` passes with the same seven pre-existing exhaustive-deps warnings. API `typecheck` and `lint` pass; API full suite has 10 pre-existing/infrastructure-linked integration-file failures (34 tests), so it is not a green delivery gate.

## Relevant files
- `apps/web/src/components/schedule/ReservationModal.tsx` — direct-reservation form and occupancy request.
- `apps/web/src/lib/court-time-slots.ts` — local occupied-slot calculation.
- `apps/web/src/components/auth/ErrorAlert.tsx` — failing test subject.
- `apps/web/src/app/(auth)/login/LoginForm.tsx` — login and registration flow.
- `apps/web/src/lib/api-client.ts` — typed web API contract.
- `services/api/src/presentation/routes/bookings.router.ts` — unified booking route.
