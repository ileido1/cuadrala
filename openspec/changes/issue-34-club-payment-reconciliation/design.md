# Design: Cierre conciliación de pagos de club (issue #34)

## Technical Approach

Tres slices independientes, encadenados como PRs (P1 → P2 → P3), sin cambio de esquema Prisma ni migración.

- **P1 (api)** — El puerto `TransactionReceiptNotifyContextRepository` pasa a exponer también la sede y sus destinatarios (`venueId`, `venueStaffUserIds`). `RecordPlayerPaymentSelectionUseCase` y `UploadTransactionReceiptUseCase` emiten un **segundo** `NotificationEvent PAYMENT_PENDING` dirigido al staff, reutilizando el `CreatePaymentPendingNotificationEventUseCase` ya inyectado. La emisión al organizador queda **byte-idéntica**. No hay cambios en composition roots (ambos UC ya reciben las dos dependencias).
- **P2 (api)** — Se borra `PATCH /venues/:venueId/transactions/:transactionId/confirm` y su handler; `confirm-manual` queda como única ruta viva. Se documenta `reject-manual` en `openapi.ts`, se añade test happy-path de `GET /venues/:venueId/transactions/pending` y se completa la tabla de endpoints del README.
- **P3 (api+web)** — `VENUE_LIST_SELECT` incorpora `countryCode` y `monetizationSettings.timezone`; `VenueListItemDTO` los propaga y `apps/web` deja de usar las constantes `'VE'` / `'America/Caracas'` inline, resolviendo la zona horaria con un helper explícito que marca el fallback.

Regla de dependencia respetada: el puerto y los DTO viven en `domain/ports/`, la resolución del staff es una query de `infrastructure/adapters/`, y los UC solo consumen interfaces (ver `services/api/ARCHITECTURE.md` §2 y §3.5).

---

## Architecture Decisions

| ID | Decisión | Elección | Alternativas rechazadas | Rationale |
|----|----------|----------|-------------------------|-----------|
| **A1** | Forma del destinatario staff en el puerto | `venueId: string \| null` + `venueStaffUserIds: string[]` (campos **requeridos** en el DTO) | Puerto nuevo `VenueStaffRecipientsRepository`; campos opcionales | Un solo round-trip: la sede se deriva del mismo `Transaction → match.court`. Campos requeridos fuerzan que los fakes de test se actualicen (RED natural en typecheck). Un puerto extra duplicaría el lookup de la transacción |
| **A2** | Resolución de "staff" (D1) | Todas las filas `VenueStaff` del venue, sin filtro de rol, resueltas en el adapter | Filtrar por `OWNER`/`ADMIN`; parametrizar rol en el UC | D1 del PO. Mantiene el UC libre de política de roles; si más tarde hace falta filtrar, cambia solo el adapter |
| **A3** | ¿Un evento con fan-out o dos eventos? | **Dos** `NotificationEvent`: el actual (organizador, payload intacto) + uno nuevo para staff con `kind: 'VENUE_PAYMENT_PENDING'` | Un solo evento con `userIds = [organizador, ...staff]` | El payload es por evento, no por delivery: audiencias distintas (jugador mobile vs. club web) necesitan copy distinto. Además deja el camino del organizador sin tocar → cero regresión sobre `notifications-player-delivery` y diff aditivo |
| **A4** | Aislamiento de fallos | Cada emisión (organizador / staff) en su propio `try/catch`; ninguna bloquea el flujo principal | Un `try` que envuelva ambas | Un fallo al resolver staff no puede impedir el aviso al organizador (ni al revés), ni romper el upload/selección |
| **A5** | Consolidación de ruta (D2) | Borrado físico de ruta + handler; `confirm-manual` canónica | Deprecar con `410 Gone`; mantener alias | Sin clientes (web usa `confirm-manual`, mobile no confirma), sin OpenAPI y sin tests: no hay contrato que honrar |
| **A6** | Select Prisma de `venues/mine` | Ampliar el `VENUE_LIST_SELECT` compartido | Select dedicado solo para `listVenuesForUserSV` | Los 4 métodos que lo usan devuelven el mismo DTO; duplicar el select abriría deriva entre listados. El join `monetizationSettings` es 1-1 e indexado por PK |
| **A7** | Fallback de `timezone` nulo (no silencioso) | API devuelve `timezone: string \| null` **tal cual**; `apps/web` resuelve con `resolveVenueTimezone()` → `{ timezone, isFallback }` y muestra aviso visible en la cola de pagos | Default `'America/Caracas'` en el adapter; error 409 si falta timezone | El API no debe mentir sobre un dato que decide la fecha de FX. El fallback queda en el borde de UI, es observable por el usuario y no rompe sedes ya existentes |

---

## Data Flow

### P1 — pago pendiente → aviso a organizador + staff

```
Payer (mobile)
   │ PATCH /transactions/:id/player-payment-selection
   │ POST  /transactions/:id/receipt
   ▼
RecordPlayerPaymentSelectionUC / UploadTransactionReceiptUC
   │ 1. persistencia (repo de transacción / receipt)   ← camino crítico
   │ 2. getForTransactionSV(transactionId)
   ▼
PrismaTransactionReceiptNotifyContextRepository
   │ Transaction → match{id,categoryId,organizerUserId,
   │                      court{venueId, venue{staff{userId}}}}
   ▼
CTX = { matchId, categoryId, organizerUserId, payerUserId,
        venueId, venueStaffUserIds[] }
   │
   ├─ (a) organizador ≠ payer  → CreatePaymentPendingNotificationEventUC
   │        payload { kind: PAYMENT_METHOD_SELECTED | RECEIPT_UPLOADED }   [SIN CAMBIOS]
   │
   └─ (b) staffRecipients      → CreatePaymentPendingNotificationEventUC
            payload { kind: VENUE_PAYMENT_PENDING, venueId, transactionId, payerUserId, receiptId? }
                 │
                 ▼
        NotificationEvent(PAYMENT_PENDING) + NotificationDelivery[] (createManyIdempotentSV)
```

`staffRecipients = venueStaffUserIds − {payerUserId} − {organizerUserId si ya recibió el evento (a)}`.
Si el set queda vacío o `venueId === null`, no se emite el evento (b).

---

## File Changes

### P1 — Notificación a staff (api)

| File | Action | Description |
|------|--------|-------------|
| `services/api/src/domain/ports/transaction_receipt_notify_context_repository.ts` | Modify | `venueId: string \| null` + `venueStaffUserIds: string[]` en el DTO |
| `services/api/src/infrastructure/adapters/prisma_transaction_receipt_notify_context_repository.ts` | Modify | Select anidado `match.court.venueId` + `court.venue.staff.userId`; dedupe y mapeo a `venueStaffUserIds` |
| `services/api/src/application/use_cases/record_player_payment_selection.use_case.ts` | Modify | Reestructurar `_notifyOrganizerOfSelectionSV` → carga CTX una vez, emite (a) y (b) por separado |
| `services/api/src/application/use_cases/upload_transaction_receipt.use_case.ts` | Modify | Ídem; además mover el `getForTransactionSV` **dentro** del `try` (hoy está fuera: un fallo del adapter rompería el upload) |
| `services/api/src/test/unit/notify_venue_staff_pending_payment.use_case.test.ts` | Create | RED: staff recibe delivery; organizador conserva el suyo; dedupe payer/organizador; `venueId` null → sin evento (b) |
| `services/api/src/test/unit/confirm_transaction_as_venue_staff.use_case.test.ts` | Modify | Fakes del notify-context: añadir los 2 campos nuevos (solo typecheck) |

**Composition:** sin cambios. `monetization.composition.ts` y `transaction_receipts.composition.ts` ya inyectan `RECEIPT_NOTIFY_CONTEXT_REPOSITORY` + `CREATE_PAYMENT_PENDING_NOTIFICATION_EVENT_UC` en ambos UC.

### P2 — Ruta canónica + contrato/doc/tests (api)

| File | Action | Description |
|------|--------|-------------|
| `services/api/src/presentation/routes/venue_staff.router.ts` | Modify | Borrar el `PATCH .../confirm` y el import de `patchConfirmVenueTransactionCON` |
| `services/api/src/presentation/controllers/venue_staff.controller.ts` | Modify | Borrar `patchConfirmVenueTransactionCON` y sus imports que quedan huérfanos |
| `services/api/src/presentation/composition/venue_staff.composition.ts` | Modify | Quitar el re-export de `CONFIRM_TRANSACTION_AS_VENUE_STAFF_UC` (queda solo `LIST_VENUE_PENDING_TRANSACTIONS_UC`) |
| `services/api/src/presentation/openapi/openapi.ts` | Modify | Nueva entrada `/api/v1/transactions/{transactionId}/reject-manual` |
| `services/api/README.md` | Modify | Filas de rutas venue-staff, receipt y `reject-manual` |
| `services/api/src/test/integration/payment_wave1_gate.integration.test.ts` | Modify | Reforzar el test existente (`GET /venues/:venueId/transactions/pending incluye obligación pendiente`, línea ~162) que hoy solo verifica `IDS.toContain(txPendingId)`, para que valide el shape completo de la respuesta |

**Dead code exacto tras borrar la ruta** (solo lo consumía `patchConfirmVenueTransactionCON`):

- `patchConfirmVenueTransactionCON` (único consumidor: la ruta borrada).
- En `venue_staff.controller.ts`: imports `CONFIRM_TRANSACTION_AS_VENUE_STAFF_UC`, `CONFIRM_TRANSACTION_BODY_SCHEMA`, `TRANSACTION_ID_PARAM_SCHEMA`, `parseCurrencyCode`.
- Re-export `CONFIRM_TRANSACTION_AS_VENUE_STAFF_UC` en `venue_staff.composition.ts`.

**Compartido con `confirm-manual` — NO tocar:** `ConfirmTransactionAsVenueStaffUseCase`, su export en `monetization.composition.ts`, `patchConfirmTransactionManualCON`, `CONFIRM_TRANSACTION_BODY_SCHEMA` + `TRANSACTION_ID_PARAM_SCHEMA` en `monetization.validation.ts`, `VENUE_ID_PARAMS_SCHEMA` (lo usan los otros 3 handlers del controller), `AppError`, y `src/test/unit/confirm_transaction_as_venue_staff.use_case.test.ts`.

### P3 — `venues/mine` countryCode/timezone (api + web)

| File | Action | Description |
|------|--------|-------------|
| `services/api/src/infrastructure/adapters/prisma_venue_repository.ts` | Modify | `VENUE_LIST_SELECT` + `countryCode: true`, `monetizationSettings: { select: { timezone: true } }`; `VenueListRow` y `mapVenueListItemSV` propagan `countryCode` y `timezone: row.monetizationSettings?.timezone ?? null` |
| `services/api/src/domain/ports/venue_repository.ts` | Modify | `VenueListItemDTO`: `countryCode: string`, `timezone: string \| null` |
| `services/api/src/test/unit/prisma_venue_list_mapper.test.ts` | Modify | RED: `timezone` null cuando no hay `monetizationSettings`; `countryCode` propagado |
| `apps/web/src/lib/venue-timezone.ts` | Create | `DEFAULT_VENUE_TIMEZONE` + `resolveVenueTimezone(venue) → { timezone, isFallback }` |
| `apps/web/src/app/dashboard/payments/page.tsx` | Modify | Sustituir `?? 'VE'` / `?? 'America/Caracas'` por `currentVenue.countryCode` y `resolveVenueTimezone(...)`; render de aviso cuando `isFallback` |
| `apps/web/src/types/api.ts` | Modify | `Venue.timezone?: string \| null` (nullable explícito) |
| `apps/web/src/lib/venue-timezone.test.ts` | Create | Fallback marcado, valor de sede respetado |

---

## Interfaces / Contracts

```typescript
// domain/ports/transaction_receipt_notify_context_repository.ts
export type TransactionReceiptNotifyContextDTO = {
  matchId: string;
  categoryId: string;
  organizerUserId: string;
  payerUserId: string;
  /** Sede dueña del cobro (match.court.venueId). null si la transacción no resuelve sede. */
  venueId: string | null;
  /** userIds de TODAS las filas VenueStaff de la sede (D1: sin filtro por rol). Vacío si venueId es null. */
  venueStaffUserIds: string[];
};
```

```typescript
// Payload del evento nuevo (audiencia staff)
{
  kind: 'VENUE_PAYMENT_PENDING',
  venueId: string,
  transactionId: string,
  payerUserId: string,
  receiptId?: string,   // solo desde UploadTransactionReceiptUseCase
}
```

```typescript
// domain/ports/venue_repository.ts — VenueListItemDTO (adiciones)
countryCode: string;
/** IANA tz de monetizationSettings. null = sin configurar (el cliente decide el fallback). */
timezone: string | null;
```

**OpenAPI — `reject-manual`** (mismo patrón que `confirm-manual`, `tags: ['Monetization']`, `security: bearerAuth`, path param `transactionId` uuid) más `requestBody` **requerido** `{ reason: string (1..500) }` (lo exige `REJECT_TRANSACTION_BODY_SCHEMA`) y respuestas `200/400/401/403/404`.

**Test happy-path de pending** — `GET /api/v1/venues/:venueId/transactions/pending` con staff autenticado y una obligación `PENDING`: `200`, `body.success === true`, `body.data.items[0]` contiene exactamente las 25 claves del DTO de `ListVenuePendingTransactionsUseCase` (`id`, `matchId`, `reservationId`, `userId`, `amountTotal`, `status`, `createdAt`, `payerName`, `payerEmail`, `obligationAmountMinor`, `obligationCurrency`, `pricingCurrency`, `contextLabel`, `bookingType`, `courtId`, `courtName`, `sportId`, `categoryId`, `scheduledAt`, `durationMinutes`, `receiptId`, `receiptMimeType`, `paymentMethodType`, `paymentMethodName`, `paymentMethodConfig`, `venuePaymentMethodId`, `playerReportedSettlement*`), con `scheduledAt`/`createdAt` en ISO y `amountTotal` string.

**README — filas a añadir:** `GET/POST /venues/:venueId/staff`, `GET /venues/:venueId/transactions/pending`, `PATCH /transactions/:transactionId/reject-manual`, `PATCH /transactions/:transactionId/player-payment-selection`, `POST /transactions/:transactionId/receipt`, `GET /transactions/:transactionId/receipt/:receiptId`.

---

## Testing Strategy

| Layer | Qué se prueba | Cómo |
|-------|---------------|------|
| Unit (P1) | Fan-out staff, dedupe payer/organizador, `venueId` null, aislamiento de fallos (staff falla → organizador sigue) | Vitest + fakes de puerto (patrón de `confirm_transaction_as_venue_staff.use_case.test.ts`) |
| Integration (P1) | Tras subir comprobante existe `NotificationDelivery` para cada `VenueStaff` de la sede y sigue existiendo la del organizador | supertest + `TEST_DATABASE_URL` |
| Contract (P2) | `PATCH /venues/:id/transactions/:txId/confirm` responde `404` (ruta inexistente) | `src/test/http/endpoints.http.contract.test.ts` |
| Integration (P2) | Happy-path del shape de `pending` | supertest, reforzar `payment_wave1_gate.integration.test.ts` (archivo existente) |
| Unit (P3) | `mapVenueListItemSV` propaga `countryCode` y `timezone` nulo | Vitest (archivo existente) |
| Unit web (P3) | `resolveVenueTimezone` marca `isFallback` | Vitest apps/web |

Orden CI: `npm run typecheck` → `npm run lint` → `npm test` (api); `npm run lint && npm test` (web).

---

## Threat Matrix

Aplica parcialmente: el cambio toca **routing** (borrado de ruta en `venue_staff.router.ts`), no toca shell, subprocesos, automatización VCS/PR, clasificación de ejecutables ni integración de procesos.

| Riesgo de routing | Aplicabilidad | Comportamiento esperado | Test RED |
|-------------------|---------------|-------------------------|----------|
| Cliente no detectado llamando la ruta borrada | Applicable | `404` del handler global, sin 500 ni stacktrace | Contract test `404` + grep de `transactions/.*\/confirm(?!-manual)` en `apps/web`, `apps/mobile` y `services/api` antes del borrado |
| Colisión/shadowing de rutas al reordenar el router | Applicable | `GET /venues/:venueId/transactions/pending` sigue resolviendo igual | Contract tests existentes (`401` sin token, `400` con uuid inválido) |
| Escalada de privilegios en la ruta superviviente | Applicable | `confirm-manual` conserva `requireAuth` + assert de staff dentro del UC | Test unit existente del UC (`403` si no es staff) |
| Shell / subproceso / VCS / ejecutables | N/A | — | Sin superficie |

---

## Migration / Rollout

Sin migración de esquema. Los tres slices son aditivos o de borrado sin estado persistido:

- **P1** — revert del commit; los `NotificationEvent` ya emitidos quedan como histórico inocuo.
- **P2** — revert restaura la ruta; no hay estado asociado.
- **P3** — payload aditivo: clientes viejos ignoran `countryCode`/`timezone`; revert del select + del consumidor web.

**Presupuesto de PRs (≤400 líneas):**

| PR | Scope | Estimación | Depende de |
|----|-------|------------|------------|
| **P1** | Puerto + adapter + 2 UC + tests staff | ~250 | — |
| **P2** | Borrado ruta + openapi + README + test pending | ~200 | — (independiente de P1) |
| **P3** | Select + DTO + helper web + tests | ~180 | — |

`Decision needed before apply: No`
`Chained PRs recommended: Yes`
`400-line budget risk: Low`

No hace falta split adicional dentro de cada PR. Si P2 crece (el test de integración de `pending` necesita fixtures propios), separar el test en `P2b`.

---

## Open Questions

- [ ] **Transacciones de reserva sin partido quedan sin aviso.** `NotificationEvent.matchId` es NOT NULL en `prisma/schema.prisma` y el notify-context devuelve `null` cuando `match` es null: el staff **no** recibirá aviso para pagos de reservas directas. ¿Se acepta como límite conocido de US-E8-05 (mismo límite que ya tiene el aviso al organizador) o requiere hacer `matchId` nullable en un change aparte?
- [ ] **Copy por audiencia.** ¿El spec exige `kind: 'VENUE_PAYMENT_PENDING'` (decisión A3) o prefiere reutilizar los `kind` existentes? Si reutiliza, colapsar a un solo evento con fan-out.
- [ ] **`mapVenueDetailSV` sigue con default silencioso** (`?? 'America/Caracas'`, línea 138 de `prisma_venue_repository.ts`). A7 deja `GET /venues/:id` sin tocar para no romper consumidores; alinear detail con list queda como follow-up fuera de este change.
- [ ] **`reject-manual` valida `reason` pero no lo persiste** (el UC no lo recibe). Se documenta en OpenAPI como requerido — persistirlo queda fuera de scope.
