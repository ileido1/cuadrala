# Delta Spec: issue-34-club-payment-reconciliation

| Campo | Valor |
|-------|-------|
| **Change** | `issue-34-club-payment-reconciliation` |
| **Proposal** | [`proposal.md`](./proposal.md) |
| **Capabilities** | `venue-staff-payment-notifications` (new) · `monetization-transactions` (modified) · `multi-currency-payments` (modified) |

---

## Domain: venue-staff-payment-notifications (NEW CAPABILITY)

### Purpose

Notify venue staff when a transaction becomes PENDING, additive to the existing player/organizer notification defined in `notifications-player-delivery` (unarchived).

### Requirements

#### Requirement: Notify-context exposes venue staff recipients (REQ-VSN-001)

`TransactionReceiptNotifyContextRepository.getForTransactionSV` MUST resolve `venueStaffUserIds: string[]` — every `VenueStaff.userId` for the venue owning the transaction's match court, without role filtering (decision D1).

##### Scenario: Context resolves staff for a match transaction
- GIVEN a transaction linked to a match whose court belongs to venue V with 3 `VenueStaff` rows
- WHEN `getForTransactionSV` is called
- THEN `venueStaffUserIds` MUST contain exactly those 3 `userId` values, regardless of role

#### Requirement: Staff delivery on payment method selection (REQ-VSN-002)

`RecordPlayerPaymentSelectionUseCase` MUST create a delivery for every `venueStaffUserIds` entry when the transaction transitions to PENDING, in addition to any existing organizer delivery.

##### Scenario: Player selects a non-cash method
- GIVEN a transaction with a resolved venue staff list of 2 users
- WHEN the player selects a payment method that sets the transaction to PENDING
- THEN both staff users MUST receive a delivery for the pending-payment event
- AND the delivery MUST NOT depend on payer/organizer identity

#### Requirement: Staff delivery on receipt upload (REQ-VSN-003)

`UploadTransactionReceiptUseCase` MUST create a delivery for every `venueStaffUserIds` entry when a receipt is uploaded for a PENDING transaction, mirroring REQ-VSN-002.

##### Scenario: Player uploads a receipt
- GIVEN a PENDING transaction with 1 resolved venue staff user
- WHEN the player uploads a valid receipt
- THEN the staff user MUST receive a delivery
- AND integration test coverage MUST assert the delivery row exists

#### Requirement: Organizer notification unaffected (REQ-VSN-004)

Staff notification MUST be additive: the existing organizer delivery (skipped only when `payerUserId === organizerUserId`, per `notifications-player-delivery`) MUST continue to fire unchanged in both use cases.

##### Scenario: Organizer differs from payer
- GIVEN `organizerUserId !== payerUserId`
- WHEN a transaction becomes PENDING
- THEN the organizer MUST still receive their existing delivery
- AND staff deliveries MUST be created independently, not as a replacement

---

## Domain: monetization-transactions (MODIFIED CAPABILITY)

### MODIFIED Requirements

#### Requirement: Confirmación manual API (REQ-MCP-037)

`PATCH /api/v1/transactions/:transactionId/confirm-manual` MUST aceptar body:

```json
{
  "venuePaymentMethodId": "uuid",
  "settlementAmount": { "amountMinor": "2750000", "currencyCode": "BS" },
  "referenceNumber": "optional"
}
```

This is the **sole live route** for staff confirmation; no venue-staff-scoped equivalent route exists.
(Previously: text referenced "y ruta venue staff equivalente" as a second valid route — removed per REQ-MCP-046.)

##### Scenario: Staff confirma con método y monto válidos
- GIVEN staff confirma con método y monto válidos
- WHEN PATCH exitoso
- THEN MUST retornar breakdown con `MoneyAmount` y `paymentStatus` actualizado

##### Scenario: Legacy route no longer resolves
- GIVEN a client calls `PATCH /venues/:venueId/transactions/:transactionId/confirm`
- WHEN the request reaches the router
- THEN the API MUST respond 404 (route not registered)

### REMOVED Requirements

#### Requirement: Venue-staff-scoped confirm route (REQ-MCP-046 target)

`VENUE_STAFF_ROUTER` MUST NOT register `PATCH /venues/:venueId/transactions/:transactionId/confirm`, nor `patchConfirmVenueTransactionCON`.

(Reason: dead code — no client, no OpenAPI entry, no tests; `confirm-manual` is the sole live confirmation route per REQ-MCP-037.)
(Migration: None — no callers depend on this route.)

### ADDED Requirements

#### Requirement: Reject-manual documented in OpenAPI (REQ-MCP-047)

`openapi.ts` MUST document `PATCH /api/v1/transactions/:transactionId/reject-manual`, including request body (`reason`) and success response (`status: CANCELLED`).

##### Scenario: Contract completeness check
- GIVEN the generated OpenAPI document
- WHEN queried for `/transactions/{transactionId}/reject-manual`
- THEN the PATCH operation MUST be present with request/response schemas

#### Requirement: Pending-transactions response shape verified (REQ-MCP-048)

`GET /venues/:venueId/transactions/pending` integration tests MUST assert the full item shape (`id`, `status`, obligation `MoneyAmount` fields, match/reservation reference, `venuePaymentMethodId` when set), not membership by `id` alone.

##### Scenario: Happy path asserts full shape
- GIVEN a venue with one PENDING transaction
- WHEN staff calls `GET /venues/:venueId/transactions/pending` with a valid token
- THEN response items MUST include obligation amount/currency fields and status `PENDING`
- AND the test MUST fail if any documented field is missing

#### Requirement: README endpoint inventory completeness (REQ-MCP-049)

`services/api/README.md` MUST list venue-staff (`/venues/:venueId/staff`, `/venues/:venueId/transactions/pending`), receipt upload, and `reject-manual` routes in its endpoint inventory.

##### Scenario: Doc review
- GIVEN `services/api/README.md`
- WHEN searched for the routes above
- THEN each MUST appear with method and path

---

## Domain: multi-currency-payments (MODIFIED CAPABILITY)

### ADDED Requirements

#### Requirement: `/venues/mine` exposes countryCode and timezone (REQ-MCP-050)

`VENUE_LIST_SELECT` and `listVenuesForUserSV` (backing `GET /venues/mine`) MUST select `countryCode` and `monetizationSettings.timezone`; `VenueListItemDTO` MUST expose both fields. Unlike `mapVenueDetailSV` (which keeps its own silent `?? 'America/Caracas'` default, deliberately untouched by this change), `timezone` here is returned **verbatim as `string | null`** — the API MUST NOT invent a fallback value. Fallback resolution is a web-layer concern (see REQ-MCP-051).

##### Scenario: Venue with configured timezone
- GIVEN a venue with `monetizationSettings.timezone = 'America/Bogota'`
- WHEN `GET /venues/mine` is called
- THEN the response item MUST include `countryCode` and `timezone: 'America/Bogota'`

##### Scenario: Venue without monetizationSettings row (no server-side fallback)
- GIVEN a venue with `monetizationSettings = null`
- WHEN `GET /venues/mine` is called
- THEN `timezone` MUST be `null` in the response — the API MUST NOT substitute `'America/Caracas'` or omit the field

#### Requirement: Web consumes real venue values with an explicit, visible fallback (REQ-MCP-051)

`apps/web/src/app/dashboard/payments/page.tsx` MUST read `currentVenue.countryCode` / `currentVenue.timezone` as returned by the API and MUST NOT retain independent hardcoded fallback constants (`'VE'`, `'America/Caracas'`) once REQ-MCP-050 ships. Because the API can now return `timezone: null`, the web layer MUST resolve a display fallback via `apps/web/src/lib/venue-timezone.ts` (`resolveVenueTimezone`), which returns both the resolved timezone and an `isFallback` flag; the page MUST render a visible indicator when `isFallback` is true rather than silently defaulting.

##### Scenario: Payments dashboard renders FX-dependent UI
- GIVEN `GET /venues/mine` now returns real `countryCode`/`timezone`
- WHEN the payments dashboard loads a venue outside Venezuela
- THEN FX date resolution MUST use the venue's real `countryCode`/`timezone`, not `'VE'`/`'America/Caracas'`

##### Scenario: Venue with no timezone configured (visible fallback)
- GIVEN `GET /venues/mine` returns `timezone: null` for a venue
- WHEN the payments dashboard renders that venue
- THEN `resolveVenueTimezone` MUST report `isFallback: true` and the page MUST show a visible warning indicator — not a silent default

---

## Traceability to Proposal Success Criteria

| Success Criteria | Requirements |
|---|---|
| Staff delivery on PENDING (selection/upload) | REQ-VSN-001..003 |
| Organizer notification unchanged | REQ-VSN-004 |
| Exactly one live staff confirm route, in OpenAPI, tested | REQ-MCP-037 (modified), REQ-MCP-046 |
| `reject-manual` documented | REQ-MCP-047 |
| Pending-list happy-path shape test | REQ-MCP-048 |
| `venues/mine` returns real `countryCode`/`timezone` | REQ-MCP-050, REQ-MCP-051 |
| README endpoint inventory | REQ-MCP-049 |

## Out of Scope (explicit)

Issue #35 (web charts/audit), issue #37 (mobile staff tray), US-E8-01..04/US-W1-01..05/US-M8-03 behavior, replacing 30s web polling with realtime, and `openspec/changes/web-pending-payments-queue/` (separate cleanup per decision D3).
