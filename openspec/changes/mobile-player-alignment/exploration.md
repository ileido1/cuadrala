# Exploración: Mobile jugador-only — alineación pagos, partidas y reservas

Resumen de hallazgos para `proposal.md`. Fuente: sdd-explore + revisión de código (2026-05-18).

## Decisión PO (bloqueada)

- **Mobile** = solo jugador.
- **Web** (`apps/web`) = staff/backoffice.

## Código staff a retirar (mobile)

| Área | Ruta / artefacto |
|------|------------------|
| Feature agenda staff | `apps/mobile/lib/src/features/backoffice_reservations/` |
| Pagos pendientes staff | `apps/mobile/lib/src/features/payments/` (sin ruta en router) |
| Ruta | `/venues/:venueId/schedule` en `app_router.dart`, `routes.dart` |
| DI | Registros en `service_locator.dart` |
| Tests | `test/features/backoffice_reservations/**` |

## Flujos jugador (estado actual)

| Flujo | Implementación | Gap |
|-------|----------------|-----|
| Crear partida | `POST /api/v1/matches` `type: REGULAR`, sin `visibility` | No crea `Reservation` `PUBLISHED`; disponibilidad API filtra solo reservas publicadas |
| Unirse | `GET /matches/open`, `POST /matches/:id/join` | OK |
| Disponibilidad al crear | `getVenueAvailability` con ventana fija 06:00–23:59 UTC local→UTC | Ignora `venue.openingHours`; web usa `venue-opening-hours.ts` |
| Pagar | `payment-info` → `create-obligations` → comprobante → `waiting_confirmation_screen` | Montos string sin `currencyCode`; `confirmTransactionManual` en repo jugador (staff); waiting sin poll de estado real |
| Moneda sede | `VenueDto.pricingCurrency` existe; UI precio fija lógica Bs | No usa `formatMoney` / `MoneyAmount` en flujo pago |

## API / web (referencia)

- Bookings unificados: `POST /venues/:venueId/bookings` tipo `MATCH`, `visibility` `DRAFT`/`PUBLISHED`.
- Multi-moneda archivado: `openspec/changes/archive/2026-05-18-multi-currency-payments/`, specs en `openspec/specs/multi-currency-payments/`.
- Horarios sede: `Venue.openingHours` JSON; dominio `venue_opening_hours.service.ts`; web `apps/web/src/lib/venue-opening-hours.ts`.
- Jugador lectura medios: `GET /venues/:venueId/payment-methods` (activos, auth).

## No tocar en este change

- Torneos, chat, matchmaking, lifecycle/resultados, onboarding perfil.
