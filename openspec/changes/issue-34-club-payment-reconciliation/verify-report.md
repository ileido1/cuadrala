# Verify report: issue-34-club-payment-reconciliation

**Fecha:** 2026-08-15
**Slices:** P1 (T1–T7) + P2 (T8–T12) + P3 (T13–T19) — las tres completas. Este reporte gatea T20, el verificador final del change completo.

## API (`services/api`)

| Check | Comando | Resultado |
|-------|---------|-----------|
| Typecheck | `npm run typecheck` | **PASS** — 0 errores |
| Lint | `npm run lint` | **PASS** — 0 errores, 0 warnings (103 archivos) |
| Test suite completa | `npm test` | **PASS** — 103 archivos / 611 tests (0 fallos) |

Tests clave del gate T20 confirmados dentro de la corrida completa:

| Test | Ubicación | Resultado |
|------|-----------|-----------|
| T3 — fan-out staff, dedupe, `venueId` null | `src/test/unit/notify_venue_staff_pending_payment.use_case.test.ts` | PASS (dentro de la corrida global) |
| T4 — `NotificationDelivery` por staff tras upload | `src/test/integration/s28_01_transaction_receipts.http-db.integration.test.ts` | PASS |
| T8 — 404 ruta borrada (sin regresión de negocio) | `src/test/http/endpoints.http.contract.test.ts` | PASS |
| T11 — shape completo de `pending` | `src/test/integration/payment_wave1_gate.integration.test.ts` | PASS |
| T14 — `countryCode`/`timezone` en mapper | `src/test/unit/prisma_venue_list_mapper.test.ts` | PASS (8 tests, 3 nuevos de este slice) |
| Sin regresión — fakes actualizados en T1 | `src/test/unit/confirm_transaction_as_venue_staff.use_case.test.ts` | PASS (1 test) |

`TEST_DATABASE_URL` cargado vía `.env` en runtime de la app (mismo mecanismo usado en P1/P2, no visible en `echo` de shell plano).

## Web (`apps/web`)

| Check | Comando | Resultado |
|-------|---------|-----------|
| Lint | `npm run lint` | **PASS** — exit 0. 7 warnings preexistentes de `react-hooks/exhaustive-deps` en archivos no tocados por este change (`schedule/page.tsx`, `tournaments/**`, `payments-list.tsx`, `PaymentConfirmDialog.tsx`); ninguno en los archivos de este slice |
| Test suite | `npm test` | **PASS** — 11 archivos / 58 tests (0 fallos), incluye 4 tests nuevos de T17 (`venue-timezone.test.ts`) |
| Build | `npm run build` | **PASS** — compila y prerrenderiza 13 rutas, incluida `/dashboard/payments` (8.66 kB) |

## P3 — Implementación (T13–T19)

- **T13** `VenueListItemDTO` (`services/api/src/domain/ports/venue_repository.ts`): agregados `countryCode: string`, `timezone: string | null`.
- **T14/T15 (RED→GREEN)** `VENUE_LIST_SELECT` ampliado con `countryCode: true` y `monetizationSettings: { select: { timezone: true } }` en `prisma_venue_repository.ts`. Confirmado aditivo: los otros 3 métodos que comparten el select (`listVenuesSV`, `listVenuesNearSV`, `createVenueSV`) siguen tipando/compilando correctamente (`npm run typecheck` limpio, tests de esos métodos sin regresión). `mapVenueListItemSV` propaga `countryCode` tal cual y `timezone: row.monetizationSettings?.timezone ?? null`.
- **T16** `apps/web/src/types/api.ts` — `Venue.timezone` ahora `string | null` explícito.
- **T17/T18 (RED→GREEN)** `apps/web/src/lib/venue-timezone.ts` (nuevo) — `DEFAULT_VENUE_TIMEZONE = 'America/Caracas'` + `resolveVenueTimezone(venue) => { timezone, isFallback }`.
- **T19** `apps/web/src/app/dashboard/payments/page.tsx` — reemplazados `currentVenue.countryCode ?? 'VE'` / `currentVenue.timezone ?? 'America/Caracas'` por `currentVenue.countryCode` y `resolveVenueTimezone(currentVenue).timezone`; agregado banner visible (`bg-amber-50`, no silencioso) en la pestaña "Pendientes" cuando `isFallback === true`.
- **Fold-in fuera de T13–T19 (causado directamente por el borrado de ruta de P2):** eliminados los dos wrappers muertos `apiClient.venues.transactions.confirm` y `apiClient.transactions.confirm` en `apps/web/src/lib/api-client.ts` (apuntaban a `PATCH /venues/:venueId/transactions/:transactionId/confirm`, ruta borrada en P2/T9 y por lo tanto 404 desde entonces). Re-verificado con `rg "venues\.transactions\.confirm\(|transactions\.confirm\("` en `apps/web/src` fuera de `api-client.ts` → 0 resultados, y `api-client.test.ts` no los referencia. Ningún blocker.

### Desviación de diseño reportada (no silenciosa)

**Conflicto `spec.md` REQ-MCP-050 vs. `design.md` decisión A7:** `spec.md` (sección `multi-currency-payments`, REQ-MCP-050) especifica que `timezone` se resuelve **en el adapter** como `monetizationSettings?.timezone ?? 'America/Caracas'` — el mismo default silencioso que ya usa `mapVenueDetailSV` — y su segundo escenario dice explícitamente que el campo *no debe omitirse ni quedar null*. `design.md` (decisión A7) dice lo contrario: la API **debe** devolver `timezone: string | null` tal cual, y el fallback vive únicamente en el consumidor web (`resolveVenueTimezone`), de forma observable. `tasks.md` (T14/T15) fue redactado siguiendo A7 (`timezone` null propagado, no default en el adapter), y la instrucción explícita de este batch de apply reafirmó A7. Implementé conforme a **design.md + tasks.md + instrucción explícita** (null verbatim en la API, fallback visible en web), no conforme al texto literal de `spec.md`. `spec.md` queda desalineado con el código real y **debería corregirse** en un follow-up de `sdd-spec` para esta capability antes de archivar el change — no lo edité porque está fuera del alcance de `sdd-apply` (no se modifican specs en esta fase).

## Criterios de éxito (`proposal.md` → Success Criteria)

- [x] Al quedar una transacción `PENDING` (selección de medio o subida de comprobante), existe delivery para el/los destinatarios de staff definidos en D1, con test de integración. — P1, T3/T4
- [x] El organizador sigue recibiendo su notificación actual. — P1, REQ-VSN-004, sin cambios en el payload existente
- [x] Existe exactamente una ruta viva de confirmación staff, presente en `openapi.ts` y cubierta por tests. — P2, T9/T10
- [x] `PATCH /transactions/:transactionId/reject-manual` documentado en `openapi.ts`. — P2, T10
- [x] `GET /venues/:venueId/transactions/pending` tiene test happy-path que valida el shape real de respuesta. — P2, T11
- [x] `GET /venues/mine` devuelve `countryCode` y `timezone`; la web no usa constantes `'VE'`/`'America/Caracas'` hardcodeadas de forma independiente en `dashboard/payments/page.tsx`. — P3, T13–T19. **Matiz:** `timezone` es `string | null` (no default silencioso, ver desviación arriba); el fallback `'America/Caracas'` sigue existiendo pero explícito y observable en `venue-timezone.ts` (`isFallback`), no oculto. `payments-list.tsx` y `pending-payment-review-dialog.tsx` conservan sus propios defaults de prop (`countryCode = 'VE'`, `venueTimezone = 'America/Caracas'`) como valores por defecto de componente — no forman parte del archivo alcanzado por T19 y quedan fuera de este slice.
- [x] `services/api/README.md` lista rutas venue-staff, receipt y reject-manual. — P2, T12
- [x] API `typecheck` → `lint` → `test` verdes; `cd apps/web && npm run lint && npm test` verde. — confirmado arriba (además `npm run build` en web, verificación adicional no exigida por el criterio pero ejecutada)

## Notas

- Gap conocido aceptado (documentado en `tasks.md` → Known Gaps, no se resuelve aquí): transacciones de reserva sin `match` no generan aviso (ni organizador ni staff) porque `NotificationEvent.matchId` es NOT NULL.
- Gap conocido aceptado: `reject-manual` valida `reason` pero no lo persiste.
- Gap conocido aceptado: `mapVenueDetailSV` (`GET /venues/:id`) sigue con default silencioso `?? 'America/Caracas'` — A7 solo cubrió `venues/mine`; alinear el detail queda como follow-up fuera de este change.
- Pendiente fuera de este change (decisión D3): cierre de `openspec/changes/web-pending-payments-queue`.
