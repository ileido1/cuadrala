# Proposal: Cierre conciliación de pagos de club (issue #34)

| Campo | Valor |
|-------|-------|
| **Change** | `issue-34-club-payment-reconciliation` |
| **Issue** | #34 (US-E8-05, US-E8-06, gap `venues/mine`) |
| **Paquetes** | `services/api`, `apps/web` |

## Intent

El flujo de conciliación de pagos de club ya funciona punta a punta (mobile paga → staff confirma en web), pero el club **no se entera** de que hay un pago pendiente salvo que alguien tenga abierta la cola web (polling 30s), y la superficie API tiene una ruta muerta, documentación incompleta y un bug funcional de zona horaria. Este cambio cierra esos cuatro huecos reales verificados en código.

## Problem

| Síntoma | Causa raíz |
|---------|------------|
| Staff no recibe aviso de pago pendiente | `TransactionReceiptNotifyContextDTO` solo expone `matchId/categoryId/organizerUserId/payerUserId`; `RecordPlayerPaymentSelection` y `UploadTransactionReceipt` envían `PAYMENT_PENDING` al **organizador** (jugador), no a la sede |
| Dos endpoints de confirmación staff | `PATCH /venues/:venueId/transactions/:transactionId/confirm` (`venue_staff.router.ts`) sin cliente, sin OpenAPI y sin tests; el cliente web usa `PATCH /transactions/:transactionId/confirm-manual` |
| FX resuelta con fecha equivocada fuera de VE | `VENUE_LIST_SELECT` (`prisma_venue_repository.ts`) no selecciona `countryCode` ni `monetizationSettings.timezone`; la web hardcodea `'VE'`/`'America/Caracas'` |
| Contrato staff poco confiable | `reject-manual` sin OpenAPI; `GET /venues/:venueId/transactions/pending` sin test happy-path; `services/api/README.md` omite rutas venue-staff/receipt |

## Goals (in scope)

1. **US-E8-05 — Notificación a staff:** extender el puerto de notify-context con destinatarios de sede y emitir `PAYMENT_PENDING` (o tipo dedicado) al staff del venue cuando la transacción queda pendiente, en ambos use cases.
2. **US-E8-06a — Consolidar ruta de confirmación staff:** una sola ruta viva, documentada y testeada (ver decisión abierta D2).
3. **Bug `GET /venues/mine`:** añadir `countryCode` y `timezone` al select Prisma, al DTO y consumirlos en `apps/web/src/app/dashboard/payments/page.tsx` (sin fallback silencioso).
4. **US-E8-06b — Contrato y pruebas:** documentar `reject-manual` en `openapi.ts`, test de integración happy-path del shape de `GET /venues/:venueId/transactions/pending`, y actualizar el listado de endpoints de `services/api/README.md`.

## Non-goals

- Issue #35 (gráficas/auditoría backoffice, US-W1-06).
- Issue #37 (bandeja staff mobile, US-M8-04).
- US-E8-01..04, US-W1-01..05 y US-M8-03: ya implementados y verificados en código.
- Reemplazar el polling de 30s de la cola web por realtime/websocket.
- Cambiar reglas de negocio de confirmación (la sede del court sigue siendo la dueña del pago; el organizador no confirma).

## Decisiones (resueltas 2026-08-15 por el PO)

| ID | Decisión | Resuelto | Impacto |
|----|----------|----------|---------|
| **D1** | ¿Quién es "staff" como destinatario de la notificación? | **Todas las filas `VenueStaff` del venue** (sin filtro por rol) | El puerto de notify-context expone la lista completa de `userId` de `VenueStaff` para el venue; fan-out a todos, sin distinción owner/admin/staff |
| **D2** | ¿Se elimina `PATCH /venues/:venueId/transactions/:transactionId/confirm`? | **Sí, se borra** (`venue_staff.router.ts` route + handler asociados) — sin cliente, sin doc, sin tests | `confirm-manual` queda como única ruta viva de confirmación staff |
| **D3** | ¿Se cierra aquí `web-pending-payments-queue`? | **No — cleanup separado**, fuera de este change | Este change no toca `openspec/changes/web-pending-payments-queue/`; se resuelve en un mini-cambio aparte |

> **Conflicto a evitar:** `openspec/changes/notifications-player-delivery/proposal.md` (sin archivar) fija el criterio "registrar medio de pago → delivery al organizador (si ≠ pagador)". La notificación a staff es **adición**, no sustitución: el spec debe declarar explícitamente si el organizador sigue recibiendo aviso.

## Capabilities

### New Capabilities

- `venue-staff-payment-notifications`: destinatarios de sede en el contexto de notificación y emisión de aviso de pago pendiente a staff.

### Modified Capabilities

- `monetization-transactions`: superficie staff de confirmación/rechazo (ruta canónica única, `reject-manual` documentado, contrato de `GET /venues/:venueId/transactions/pending` con test).
- `multi-currency-payments`: `GET /venues/mine` MUST exponer `countryCode` y `timezone` para resolución de fecha FX (elimina el default `VE`/`America/Caracas`).

## Approach

1. **API primero, TDD:** puerto → use cases → adapters → presentation, respetando la regla de dependencia (`domain`/`application` sin imports de infra).
2. Notificación staff reutilizando el pipeline existente de `NotificationEvent` + deliveries directos (mismo camino que `PAYMENT_CONFIRMED` al pagador), sin dispatch geo.
3. Fix `venues/mine` como slice independiente y pequeño (Prisma select + DTO + consumidor web + test).
4. Doc/tests (`openapi.ts`, README, contract test) como slice final de cierre.
5. **PRs encadenados (≤400 líneas):** P1 notificaciones staff (api) → P2 consolidación ruta + openapi/README/tests → P3 `venues/mine` countryCode/timezone (api+web).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `services/api/src/domain/ports/transaction_receipt_notify_context_repository.ts` | Modified | Destinatarios de sede en el DTO |
| `services/api/src/application/use_cases/record_player_payment_selection.use_case.ts` | Modified | Notificar staff además del organizador |
| `services/api/src/application/use_cases/upload_transaction_receipt.use_case.ts` | Modified | Ídem |
| `services/api/src/infrastructure/adapters/` (notify context) | Modified | Query de staff del venue |
| `services/api/src/presentation/routes/venue_staff.router.ts` | Modified/Removed | Según D2 |
| `services/api/src/presentation/openapi/openapi.ts` | Modified | `reject-manual` (+ ruta canónica) |
| `services/api/src/infrastructure/adapters/prisma_venue_repository.ts` | Modified | `countryCode`, `timezone` en `VENUE_LIST_SELECT` |
| `apps/web/src/app/dashboard/payments/page.tsx` | Modified | Usar valores reales del venue |
| `services/api/README.md` | Modified | Listado de endpoints venue-staff/receipt |
| `services/api/src/test/**` | New | Happy-path pending + notificación staff |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Ruido de notificaciones en clubes con mucho staff | Med | Resolver D1 antes de spec; limitar fan-out por rol si aplica |
| Borrar la ruta duplicada rompe un cliente no detectado | Low | Grep de clientes + búsqueda en logs antes del borrado; D2 con decisión humana |
| Venues sin `timezone` en `monetizationSettings` | Med | Definir fallback explícito y documentado (no silencioso) en spec |
| Solapamiento con `notifications-player-delivery` sin archivar | Med | Spec declara explícitamente coexistencia organizador + staff |
| PR > 400 líneas | Med | Cadena P1 → P2 → P3 |

## Rollback Plan

1. **Notificaciones staff:** revert del commit; sin migración de esquema si el destinatario se resuelve por query sobre `VenueStaff` (si se añade columna/config, incluir down migration).
2. **Ruta eliminada:** revert restaura el router; no hay estado persistido asociado.
3. **`venues/mine`:** el cambio es aditivo en el payload; clientes viejos ignoran campos nuevos. Revert del select + del consumidor web.
4. **Doc/tests:** revert sin impacto en runtime.

## Dependencies

| Dependencia | Estado | Notas |
|-------------|--------|-------|
| `VenueStaff` + `AssertVenueStaffAccessUseCase` | Hecho | Base para resolver destinatarios |
| Pipeline `NotificationEvent` + deliveries directos | Hecho | `notifications-player-delivery` (sin archivar) |
| `ConfirmTransactionAsVenueStaffUseCase` | Hecho | No cambia lógica de negocio |
| Decisiones D1/D2/D3 | **Resuelto** | Ver sección "Decisiones" |

## Success Criteria

- [ ] Al quedar una transacción `PENDING` (selección de medio o subida de comprobante), existe delivery para el/los destinatarios de staff definidos en D1, con test de integración.
- [ ] El organizador sigue recibiendo su notificación actual (o el spec documenta explícitamente el cambio).
- [ ] Existe exactamente una ruta viva de confirmación staff, presente en `openapi.ts` y cubierta por tests.
- [ ] `PATCH /transactions/:transactionId/reject-manual` documentado en `openapi.ts`.
- [ ] `GET /venues/:venueId/transactions/pending` tiene test happy-path que valida el shape real de respuesta.
- [ ] `GET /venues/mine` devuelve `countryCode` y `timezone`; la web no usa constantes `'VE'`/`'America/Caracas'`.
- [ ] `services/api/README.md` lista rutas venue-staff, receipt y reject-manual.
- [ ] API `typecheck` → `lint` → `test` verdes; `cd apps/web && npm run lint && npm test` verde.

## Next steps

- Decisiones D1/D2/D3 resueltas — ejecutar `sdd-spec` y `sdd-design` en paralelo.
- Cleanup separado (fuera de este change): cerrar `openspec/changes/web-pending-payments-queue` (correr verifier T10, actualizar `tasks.md`, archivar).
