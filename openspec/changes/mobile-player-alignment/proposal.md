# Proposal: Mobile jugador-only — alineación pagos, partidas y reservas

## Intent

Alinear la app Flutter **exclusivamente al rol jugador**, eliminando superficie staff obsoleta y cerrando brechas con el modelo actual de API (bookings con `visibility`, pagos `MoneyAmount` multi-moneda, horarios de sede), dejando agenda, confirmación manual de pagos y settings en **web**.

## Problem

| Síntoma | Causa raíz |
|---------|------------|
| Mobile expone agenda staff y `BookingPaymentSheet` | Features `backoffice_reservations` y ruta `/venues/:id/schedule` heredadas de prototipo |
| Partida creada no bloquea cancha en agenda staff | `POST /matches` no crea `Reservation` `MATCH` + `visibility: PUBLISHED` |
| Slots fuera de horario de sede visibles al jugador | Ventana fija 06:00–23:59 en `create_match_screen.dart`, sin `openingHours` |
| Montos en Bs / strings sin moneda en pago | DTOs legacy (`payment-info`, `totalAmountBase`) ignoran `pricingCurrency` |
| Pantalla “esperando confirmación” estancada | Sin polling/WebSocket de `transaction.status`; jugador no distingue PENDING vs CONFIRMED |
| Repo mobile incluye `confirmTransactionManual` | Capacidad staff en capa data jugador |

## Goals

1. **Producto claro:** una sola app mobile para jugadores; staff solo en web.
2. **Limpieza verificable:** cero rutas/DI/tests de backoffice en mobile.
3. **Partidas publicadas:** crear partida con cancha/horario coherente con disponibilidad unificada (`PUBLISHED`).
4. **Pagos jugador:** obligaciones + medios de pago + comprobante con `MoneyAmount` y moneda de sede; sin confirmación manual en mobile.
5. **Horarios sede:** picker de disponibilidad acotado a `openingHours` (paridad conceptual con web).
6. **No regresión:** torneos, chat, lifecycle de partida y matchmaking intactos.

## Non-goals

- Cualquier UI o flujo **staff** en mobile (agenda, confirmar/rechazar pagos, settings sede, métodos de pago CRUD).
- Paridad web de reporting, ledger Fase 2, o conciliación.
- Migrar torneos a bookings unificados.
- PSP, webhooks, wallet custodial.
- Reescribir `apps/web` (solo referencia).
- Arreglar contratos backoffice mobile (descartados al eliminar el código).

---

## Options

### (a) Limpieza staff en mobile

| Opción | Descripción | Pros | Contras |
|--------|-------------|------|---------|
| **A. Eliminación directa (recomendada)** | Borrar features, rutas, DI y tests en un PR M1 | Menor superficie; sin deuda de flags | PR único puede ser grande (~15 archivos) |
| **B. Ocultar + eliminar después** | Quitar rutas primero; borrar código en release N+1 | Rollout gradual | Código muerto temporal; riesgo de reexposición |

### (b) Crear partida (reserva + visibilidad)

| Opción | Descripción | Pros | Contras |
|--------|-------------|------|---------|
| **A. Mantener `POST /matches` + extender API (recomendada)** | `CreateMatchUseCase` crea en transacción `Match` + `Reservation` `MATCH` `PUBLISHED` con `scheduledAt` + `durationMinutes` | Cambio mínimo en mobile; consistencia server-side | Requiere cambio API + tests integración |
| **B. Mobile llama `POST /venues/:id/bookings` + enlace match** | Cliente orquesta dos llamadas | Reutiliza bookings tal cual | Orquestación frágil; permisos staff en UC actual |
| **C. Solo bookings, deprecar `POST /matches`** | Un endpoint canónico | Modelo único | Rompe clientes; scope alto |

### (c) Pagos jugador

| Opción | Descripción | Pros | Contras |
|--------|-------------|------|---------|
| **A. Solo legacy `payment-info`** | Titular/CVU desde endpoint plano | Cero cambio API lectura | Sin `settlementCurrency`; desalineado multi-moneda |
| **B. `GET payment-methods` (activos) + summary con `MoneyAmount` (recomendada)** | Medios estructurados + obligaciones/resumen monetarios | Alineado con specs archivados | Actualizar DTOs/Cubits; posible endpoint player-safe |
| **C. Híbrido temporal** | Leer ambos; preferir payment-methods si presente | Migración suave | Dos parsers en mobile |

---

## Recomendación

| Eje | Decisión | Rationale |
|-----|----------|-----------|
| Staff | **A — eliminación directa** | PO bloqueó staff en mobile; flags no aportan valor |
| Partidas | **A — extender `CreateMatchUseCase`** | El jugador sigue con `POST /matches`; el servidor garantiza reserva `PUBLISHED` y evita doble modelo en cliente |
| Pagos | **B — payment-methods + MoneyAmount** | `payment-info` es legacy plano; métodos activos ya exponen tipo y `settlementCurrency`; summary/obligations deben llevar `currencyCode` |
| Horarios | **Portar lógica `venue-opening-hours` a Dart** en `core/` | Misma semántica que web/API; sin dependencia de TS en runtime |

**Duración partida:** mobile enviará `durationMinutes` (default 90, alineado con picker actual) en create match / reserva vinculada.

**Estado pago jugador:** tras subir comprobante, polling ligero a `GET .../transactions/summary` o detalle de transacción del usuario hasta `CONFIRMED` | `REJECTED` (staff confirma en web).

---

## Scope por fases

### M1 — Limpieza staff (P0)

**In scope**

- Eliminar `features/backoffice_reservations/`, `features/payments/`.
- Quitar ruta `/venues/:venueId/schedule`, imports y registros DI.
- Eliminar tests asociados; `flutter analyze` / `flutter test` verdes.

**Out of scope**

- Cambios API o web.

### M2 — Partidas y visibilidad (P0)

**In scope**

- API: transacción atómica match + reserva `MATCH` `PUBLISHED` (o UC dedicado invocado desde create match).
- Mobile: enviar `durationMinutes`; manejar errores `409` disponibilidad existentes.
- Tests API integración + test widget/cubit create match si aplica.

**Out of scope**

- Migrar listado abierto a bookings genérico.
- Flujos torneo.

### M3 — Pagos multi-moneda UX jugador (P0/P1)

**In scope**

- DTOs `MoneyAmount` en summary/obligations; `formatMoney` + `CurrencyCode.resolve(pricingCurrency)` en pantallas pago.
- Sustituir lectura `payment-info` por `GET /venues/:venueId/payment-methods` (lista activa, solo lectura).
- Eliminar `confirmTransactionManual` del repositorio mobile.
- Waiting screen: estados reales (pending / confirmed / rejected) vía poll o refresh al volver a detalle.
- Tests: `money_format_test`, cubit/repository monetization.

**Out of scope**

- Confirmación manual (web únicamente).
- Creación/edición métodos de pago.

**API posible (si falta):** enriquecer summary match con `currencyCode`; DTO player-safe de payment method (sin datos internos staff).

### M4 — Opening hours en picker (P1)

**In scope**

- `VenueDto.openingHours` + util Dart espejo de `venue-opening-hours.ts`.
- `create_match_screen`: calcular `from`/`to` del día según sede y timezone sede (`America/Caracas` default).
- Tests unitarios util horarios.

**Out of scope**

- Editar horarios desde mobile (web settings).

---

## Priorities

| ID | Prioridad | Contenido |
|----|-----------|-----------|
| M1 | **P0** | Retirar staff mobile |
| M2 | **P0** | Reserva publicada al crear partida |
| M3 | **P0** | MoneyAmount + medios de pago lectura; quitar confirm manual |
| M3b | **P1** | Poll estado transacción post-comprobante |
| M4 | **P1** | Opening hours en availability picker |

---

## Capabilities

### New Capabilities

- `mobile-player-only-surface`: exclusión de rutas/features/DI staff en `apps/mobile`.
- `mobile-player-match-reservation`: creación de partida con reserva `MATCH` `PUBLISHED` coherente con disponibilidad.
- `mobile-player-payments-ux`: flujo jugador con `MoneyAmount`, medios activos y seguimiento de estado sin confirmación manual.
- `mobile-venue-opening-hours-client`: cálculo de ventana diaria desde `openingHours` en cliente Flutter.

### Modified Capabilities

- `multi-currency-payments`: alcance mobile limitado a **lectura/formateo jugador** (sin staff confirm).
- `monetization-transactions`: contrato de summary/obligations consumido por mobile con `currencyCode` explícito.

---

## Approach

1. **M1 primero** — reduce ruido y evita mantener código staff roto.
2. **API antes de M3** — asegurar payloads `MoneyAmount` y create-match+reservation antes de retocar UI pago.
3. **Core compartido** — `CurrencyCode`, `MoneyAmount` (nuevo VO Dart si falta), `money_format.dart`.
4. **Feature-first** — cambios en `features/matches`, `features/monetization`, `features/venues`; sin acoplar presentation a Dio.
5. **TDD** — tests Red en API (M2/M3) y `flutter test` / `bloc_test` en mobile.

---

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/mobile/lib/src/features/backoffice_reservations/` | Removed | Agenda staff |
| `apps/mobile/lib/src/features/payments/` | Removed | Pendientes staff |
| `apps/mobile/lib/src/router/app_router.dart` | Modified | Quitar schedule staff |
| `apps/mobile/lib/src/core/di/service_locator.dart` | Modified | DI limpio |
| `apps/mobile/lib/src/features/matches/` | Modified | `durationMinutes`, errores, horarios M4 |
| `apps/mobile/lib/src/features/monetization/` | Modified | Payment-methods, MoneyAmount, waiting |
| `apps/mobile/lib/src/core/formatting/` | Modified | `formatMoney` uso extendido |
| `apps/mobile/lib/src/core/venue/` (nuevo) | New | Opening hours util |
| `services/api/src/application/use_cases/create_match.use_case.ts` | Modified | Reserva `PUBLISHED` atómica |
| `services/api/src/presentation/` (monetization/matches) | Modified | DTOs money en respuestas jugador |
| `apps/web` | None | Referencia únicamente |

---

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Regresión torneos/chat al borrar backoffice | Med | No tocar imports cruzados; CI `flutter test` completo |
| Doble reserva match + booking manual staff | Med | Test integración 409; documentar idempotencia |
| Jugador ve datos sensibles en payment-methods | Low | Filtrar DTO player-safe en API si hace falta |
| Poll agresivo en waiting screen | Low | Backoff 5–15 s; cancelar en dispose |
| PR > 400 líneas | High | Chained PRs: M1 → M2 API → M2 mobile → M3 → M4 |
| `payment-info` usado por otro cliente | Med | Deprecar sin borrar API en M3; sunset en spec |

---

## Rollback Plan

1. **M1:** revert commit que elimina features (git revert); restaurar rutas/DI.
2. **M2 API:** feature flag `MATCH_CREATE_LINKED_RESERVATION=false` si se implementa; si no, revert deploy API (reservas huérfanas: script limpieza documentado).
3. **M3/M4 mobile:** revert build anterior; API backward-compatible con campos legacy `*Cents` si dual-read activo.
4. No rollback de decisión producto (staff sigue solo web).

---

## Dependencies

| Dependencia | Estado | Notas |
|-------------|--------|-------|
| Multi-moneda API (archivado 2026-05-18) | **Hecho** | Specs en `openspec/specs/multi-currency-payments/` |
| `GET /venues/:id/payment-methods` | **Hecho** | Auth; validar permiso jugador vs staff |
| `Venue.openingHours` en API | **Hecho** | Exponer en list/detail venue si mobile aún no lo parsea |
| `CreateMatch` + reserva `PUBLISHED` | **Pendiente** | Cambio API M2 |
| Summary/obligations con `MoneyAmount` | **Parcial** | Verificar contrato actual; ampliar si falta `currencyCode` |
| Web staff flows | **Hecho** | Sin dependencia mobile |

---

## Success Criteria

- [ ] `flutter analyze` y `flutter test` sin referencias a `backoffice_reservations` ni `payments` staff.
- [ ] No existe ruta navegable a agenda staff en mobile (grep + prueba manual).
- [ ] Crear partida con cancha ocupada por otra reserva `PUBLISHED` devuelve error coherente (409).
- [ ] Tras crear partida, agenda web muestra bloqueo en slot (reserva `MATCH` `PUBLISHED`).
- [ ] Pantalla de pago muestra montos con símbolo/moneda de `venue.pricingCurrency` (USD/EUR/BS).
- [ ] Jugador lista medios activos sin llamar `payment-info` en flujo feliz.
- [ ] Mobile no invoca `confirm-manual` ni endpoints staff de transacciones.
- [ ] Waiting screen refleja `CONFIRMED` tras acción staff en web (test integración o E2E documentado).
- [ ] Picker de horarios no ofrece slots fuera de `openingHours` (test unit util + caso sede cerrada domingo).
- [ ] Torneos y chat: tests existentes siguen pasando.

---

## Success metrics (Verifier)

| Métrica | Objetivo |
|---------|----------|
| Archivos mobile staff restantes | 0 |
| Defectos P0 post-release (pagos/partidas) | 0 en 14 días |
| Cobertura tests nuevos util money/opening hours | ≥ 1 test por regla crítica |
| Líneas por PR | ≤ 400 (o excepción documentada) |

---

## Next steps

- **sdd-spec:** escenarios Given/When/Then por capability (`mobile-player-*`, deltas multi-moneda).
- **sdd-design:** secuencias create-match+reservation, DTOs Dart, estructura `core/venue/opening_hours.dart`, plan chained PRs.
- Ejecutar **sdd-spec** y **sdd-design** en paralelo tras aprobación PO de esta propuesta.
