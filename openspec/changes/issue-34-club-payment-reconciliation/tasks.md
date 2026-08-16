# Tasks: issue-34-club-payment-reconciliation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | P1 ~250 / P2 ~200 / P3 ~180 (per design.md Migration/Rollout) |
| 400-line budget risk | Low |
| Chained PRs recommended | Yes |
| Suggested split | P1 → P2 → P3 (P2 independiente de P1; P3 independiente de ambos) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

## DAG

| ID | Tarea | Dep | Estado |
|----|-------|-----|--------|
| T1 | Port `services/api/src/domain/ports/transaction_receipt_notify_context_repository.ts`: agregar `venueId: string \| null` y `venueStaffUserIds: string[]` (requeridos) a `TransactionReceiptNotifyContextDTO` | — | done |
| T2 | RED (typecheck): actualizar fakes en `services/api/src/test/unit/confirm_transaction_as_venue_staff.use_case.test.ts` con los 2 campos nuevos del DTO | T1 | done |
| T3 | RED: crear `services/api/src/test/unit/notify_venue_staff_pending_payment.use_case.test.ts` — fan-out staff, self-notify skip `payerUserId === staffUserId`, dedupe vs organizador, `venueId === null` → sin evento (b), aislamiento de fallos | T1 | done |
| T4 | RED (integración): extender `services/api/src/test/integration/s28_01_transaction_receipts.http-db.integration.test.ts` — tras subir comprobante, `NotificationDelivery` existe para cada `VenueStaff` de la sede y sigue existiendo la del organizador | T1 | done |
| T5 | GREEN: `services/api/src/infrastructure/adapters/prisma_transaction_receipt_notify_context_repository.ts` — select anidado `match.court.venueId` + `court.venue.staff.userId`, dedupe, mapeo a `venueStaffUserIds`; agregar comentario en español (línea ~27, rama `ROW.match === null`) documentando el gap conocido de transacciones de reserva sin match (ver sección Known Gaps) | T2,T3,T4 | done |
| T6 | GREEN: `services/api/src/application/use_cases/record_player_payment_selection.use_case.ts` — `_notifyOrganizerOfSelectionSV` carga CTX una vez; organizador byte-idéntico; agregar fan-out staff con skip `payerUserId === staffUserId` y dedupe vs organizador ya notificado, try/catch propio por emisión | T5 | done |
| T7 | GREEN + bugfix: `services/api/src/application/use_cases/upload_transaction_receipt.use_case.ts` — mismo restructure que T6; además mover `getForTransactionSV` (línea 127) **dentro** del `try` existente (hoy fuera: un fallo del adapter rompía el upload completo) | T5 | done |
| T8 | RED: grep de callers `transactions/.*\/confirm(?!-manual)` en `apps/web`, `apps/mobile`, `services/api` (debe dar 0 resultados) + agregar expectativa `404` en `services/api/src/test/http/endpoints.http.contract.test.ts` para `PATCH /venues/:venueId/transactions/:transactionId/confirm` | — | done |
| T9 | GREEN: borrar ruta + dead code — `services/api/src/presentation/routes/venue_staff.router.ts` (bloque `PATCH .../confirm` + import `patchConfirmVenueTransactionCON`); `services/api/src/presentation/controllers/venue_staff.controller.ts` (función `patchConfirmVenueTransactionCON` + imports huérfanos `CONFIRM_TRANSACTION_AS_VENUE_STAFF_UC`, `CONFIRM_TRANSACTION_BODY_SCHEMA`, `TRANSACTION_ID_PARAM_SCHEMA`, `parseCurrencyCode`); `services/api/src/presentation/composition/venue_staff.composition.ts` (quitar re-export `CONFIRM_TRANSACTION_AS_VENUE_STAFF_UC`, dejar `LIST_VENUE_PENDING_TRANSACTIONS_UC`). No tocar `ConfirmTransactionAsVenueStaffUseCase`, `monetization.composition.ts`, `patchConfirmTransactionManualCON`, `VENUE_ID_PARAMS_SCHEMA` | T8 | done |
| T10 | `services/api/src/presentation/openapi/openapi.ts` — documentar `PATCH /api/v1/transactions/{transactionId}/reject-manual` (tags `['Monetization']`, `security: bearerAuth`, path param `transactionId` uuid, body requerido `{reason: string(1..500)}` de `REJECT_TRANSACTION_BODY_SCHEMA`, respuestas 200/400/401/403/404) | — | done |
| T11 | RED→GREEN: endurecer `services/api/src/test/integration/payment_wave1_gate.integration.test.ts` (~línea 162, `GET /venues/:venueId/transactions/pending incluye obligación pendiente`) — reemplazar `IDS.toContain(txPendingId)` por assert de shape completo (25 claves del DTO de `ListVenuePendingTransactionsUseCase`: id, matchId, reservationId, userId, amountTotal, status, createdAt, payerName, payerEmail, obligationAmountMinor, obligationCurrency, pricingCurrency, contextLabel, bookingType, courtId, courtName, sportId, categoryId, scheduledAt, durationMinutes, receiptId, receiptMimeType, paymentMethodType, paymentMethodName, paymentMethodConfig, venuePaymentMethodId, playerReportedSettlement*), `status: 'PENDING'`, fechas ISO, `amountTotal` string | — | done |
| T12 | `services/api/README.md` — agregar filas: `GET/POST /venues/:venueId/staff`, `GET /venues/:venueId/transactions/pending`, `PATCH /transactions/:transactionId/reject-manual`, `PATCH /transactions/:transactionId/player-payment-selection`, `POST /transactions/:transactionId/receipt`, `GET /transactions/:transactionId/receipt/:receiptId` | T9,T10,T11 | done |
| T13 | `services/api/src/domain/ports/venue_repository.ts` — `VenueListItemDTO`: agregar `countryCode: string`, `timezone: string \| null` | — | done |
| T14 | RED (typecheck): actualizar `services/api/src/test/unit/prisma_venue_list_mapper.test.ts` — `countryCode` propagado; `timezone` null cuando no hay `monetizationSettings` | T13 | done |
| T15 | GREEN: `services/api/src/infrastructure/adapters/prisma_venue_repository.ts` — `VENUE_LIST_SELECT` + `countryCode: true`, `monetizationSettings: { select: { timezone: true } }`; `VenueListRow`/`mapVenueListItemSV` propagan `countryCode` y `timezone: row.monetizationSettings?.timezone ?? null` | T14 | done |
| T16 | `apps/web/src/types/api.ts` — `Venue.timezone?: string \| null` (nullable explícito), confirmar `countryCode` tipado | T15 | done |
| T17 | RED: crear `apps/web/src/lib/venue-timezone.test.ts` — `isFallback: true` cuando `timezone` null (default `America/Caracas`); valor real de sede respetado cuando existe | T16 | done |
| T18 | GREEN: crear `apps/web/src/lib/venue-timezone.ts` — `DEFAULT_VENUE_TIMEZONE` + `resolveVenueTimezone(venue) => { timezone, isFallback }` | T17 | done |
| T19 | GREEN: `apps/web/src/app/dashboard/payments/page.tsx` — sustituir `?? 'VE'` / `?? 'America/Caracas'` por `currentVenue.countryCode` y `resolveVenueTimezone(currentVenue)`; renderizar aviso visible cuando `isFallback` (A7 — sin fallback silencioso) | T18 | done |
| T20 | Verifier: API `npm run typecheck && npm run lint && npm test` (`services/api`); Web `npm run lint && npm test` (`apps/web`); confirmar T3/T4/T8/T11/T14/T17 en verde y sin regresión en `confirm_transaction_as_venue_staff.use_case.test.ts` / `endpoints.http.contract.test.ts` | T6,T7,T9,T10,T12,T19 | done |

## P1 Apply Notes (T1–T7, implementado)

- **T2 deviation:** `confirm_transaction_as_venue_staff.use_case.test.ts` no construye ningún literal tipado de `TransactionReceiptNotifyContextDTO` (todos sus dobles son `as never`), por lo que agregar los 2 campos requeridos en T1 no generó ningún error de typecheck en ese archivo. Se verificó con `npm run typecheck` antes y después de T1: el único error nuevo estaba en el adapter (T5, esperado). T2 queda marcado `done` como verificación confirmada, no como edición real.
- **TEST_DATABASE_URL:** disponible vía `.env` cargado por la app en runtime (no visible en un `echo $TEST_DATABASE_URL` de shell plano). El test de integración T4 corrió contra DB real y pasó, junto con el resto de la suite de integración (42 archivos / 129 tests, sin regresión).

## P2 Apply Notes (T8–T12, implementado)

- **T8 deviation (hallazgo importante):** el 404 "ruta inexistente" y el 404 de negocio (`TRANSACCION_NO_ENCONTRADA` que lanza `ConfirmTransactionAsVenueStaffUseCase` cuando la transacción no existe) son indistinguibles por status code — ambos devuelven 404. Se verificó empíricamente con `git stash` (ruta viva + body `{success:false, code:'TRANSACCION_NO_ENCONTRADA', ...}` vs ruta borrada + body `{}` con `RES.text` conteniendo `Cannot PATCH`). El test añadido en `endpoints.http.contract.test.ts` no solo verifica `status === 404`, también `RES.body` vacío y `RES.text` con el mensaje de fallback de Express, para probar realmente que la ruta ya no está registrada (no solo que el caso de negocio 404ea).
- **T8 grep de callers (hallazgo, no bloqueante):** `apps/web/src/lib/api-client.ts` define DOS wrappers muertos que apuntan a la URL borrada (`venues.transactions.confirm` y `transactions.confirm`, líneas ~111 y ~266), contradiciendo la afirmación de proposal.md/design.md de "sin cliente". Se confirmó con grep que **ningún componente invoca** esos wrappers (`rg "venues\.transactions\.confirm\(|transactions\.confirm\("` en `apps/web/src` fuera de `api-client.ts` → 0 resultados) — son código muerto en el cliente, no una llamada real a la ruta borrada. No se tocó `api-client.ts` (fuera del scope de archivos de este slice); se reporta como hallazgo para un cleanup de seguimiento.
- **TEST_DATABASE_URL:** igual que P1, disponible vía `.env` cargado por la app en runtime.

## P3 Apply Notes (T13–T19, implementado) + T20 (verifier final)

- **Conflicto spec.md vs. design.md (A7) — hallazgo importante, no bloqueante:** `spec.md` REQ-MCP-050 documenta un default silencioso (`?? 'America/Caracas'`) resuelto en el adapter, igual a `mapVenueDetailSV`. `design.md` A7 y este propio `tasks.md` (T14/T15) dicen lo contrario: `timezone` viaja `string | null` tal cual, fallback solo en `apps/web` vía `resolveVenueTimezone` (observable, `isFallback`). Se implementó conforme a design.md/tasks.md/instrucción explícita del batch de apply, no conforme al texto literal de spec.md. `spec.md` queda desalineado con el código y debería corregirse en un follow-up antes de archivar — no se editó por estar fuera de alcance de `sdd-apply`. Ver detalle en `verify-report.md`.
- **Fold-in fuera de T13–T19 (causado por P2):** se eliminaron los 2 wrappers muertos `apiClient.venues.transactions.confirm` / `apiClient.transactions.confirm` en `apps/web/src/lib/api-client.ts` (apuntaban a la ruta borrada en P2/T9). Re-verificado con grep antes de borrar: 0 llamadas fuera de `api-client.ts`.
- **T20:** API `typecheck` (0 errores) → `lint` (0 errores/warnings) → `test` (103 archivos / 611 tests, 0 fallos) verdes. Web `lint` (exit 0, solo warnings preexistentes fuera de este change) → `test` (11 archivos / 58 tests, 0 fallos) → `build` (PASS, 13 rutas) verdes. Detalle completo en `verify-report.md`.

## Known Gaps (aceptados, no se resuelven en este change)

- **`matchId` NOT NULL / transacciones de solo-reserva sin match:** `NotificationEvent.matchId` es NOT NULL en `prisma/schema.prisma`; `getForTransactionSV` devuelve `null` cuando `ROW.match === null`, por lo que ni el organizador ni el staff reciben aviso para pagos de reservas directas sin partido asociado. Límite conocido y ya existente para el camino del organizador — se documenta con comentario en español en el adapter (T5) y se acepta como gap, no se modifica el schema Prisma en este change.
- **`reject-manual` no persiste `reason`:** se documenta en OpenAPI (T10) como requerido; persistirlo queda fuera de scope (ver design.md Open Questions).
- **`mapVenueDetailSV` sigue con default silencioso** (`GET /venues/:id`, línea 138 de `prisma_venue_repository.ts`): A7 solo cubre `venues/mine`; alinear el detail queda como follow-up fuera de este change.

## Pendiente (fuera de este change)

- Cierre de `openspec/changes/web-pending-payments-queue` (decisión D3, cleanup separado).
- Copy por audiencia (`kind: 'VENUE_PAYMENT_PENDING'` vs. reutilizar `kind` existentes) — resuelto en spec.md como evento nuevo (A3); si el spec cambia, T6/T7 deben revisarse.
