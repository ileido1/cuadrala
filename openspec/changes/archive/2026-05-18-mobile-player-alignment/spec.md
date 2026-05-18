# Especificación: Mobile jugador-only — alineación pagos, partidas y reservas

| Campo | Valor |
|-------|-------|
| **Change** | `mobile-player-alignment` |
| **Estado** | Spec-ready (TDD) |
| **Propuesta** | [`proposal.md`](./proposal.md) |
| **Exploración** | [`exploration.md`](./exploration.md) |
| **Decisión PO** | Mobile = **solo jugador**; staff = **solo web** |
| **Strict TDD** | `openspec/config.yaml` → `strict_tdd: true` |

## Propósito

Especificar el comportamiento verificable para alinear `apps/mobile` al rol **jugador**, eliminar superficie staff obsoleta, y cerrar brechas con API (reservas `PUBLISHED`, `MoneyAmount`, `openingHours`, seguimiento de transacciones) sin introducir flujos staff en mobile.

## Alcance por fase

| Fase | Prioridad | Contenido | Artefacto |
|------|-----------|-----------|-----------|
| **M1** | P0 | Eliminar `backoffice_reservations`, `payments`, ruta schedule, DI staff | [`specs/mobile-player-only-surface.md`](./specs/mobile-player-only-surface.md) |
| **M2** | P0 | `POST /matches` + reserva `MATCH` `PUBLISHED` atómica; mobile `durationMinutes` | [`specs/mobile-player-match-reservation.md`](./specs/mobile-player-match-reservation.md) |
| **M3** | P0/P1 | `MoneyAmount`, `payment-methods` lectura, sin confirm-manual, waiting con estado | [`specs/mobile-player-payments-ux.md`](./specs/mobile-player-payments-ux.md) |
| **M4** | P1 | `openingHours` en picker crear partida | [`specs/mobile-venue-opening-hours-client.md`](./specs/mobile-venue-opening-hours-client.md) |

**Fuera de alcance:** UI staff mobile, CRUD métodos de pago, confirmación manual en mobile, ledger Fase 2, torneos/bookings unificados, PSP/webhooks.

## Capabilities

### Nuevas

| Capability | Archivo | Reqs |
|------------|---------|------|
| `mobile-player-only-surface` | `specs/mobile-player-only-surface.md` | REQ-MPOS-001 … 006 |
| `mobile-player-match-reservation` | `specs/mobile-player-match-reservation.md` | REQ-MPMR-001 … 008 |
| `mobile-player-payments-ux` | `specs/mobile-player-payments-ux.md` | REQ-MPPU-001 … 012 |
| `mobile-venue-opening-hours-client` | `specs/mobile-venue-opening-hours-client.md` | REQ-MVOH-001 … 007 |

### Modificadas (delta)

| Capability | Alcance del delta en este change |
|------------|----------------------------------|
| `multi-currency-payments` | Consumo **solo lectura/formateo** en mobile jugador; sin confirmación staff |
| `monetization-transactions` | Summary/obligations/status consumidos por mobile con `MoneyAmount` explícito |

Detalle de deltas: sección [Deltas sobre capabilities existentes](#deltas-sobre-capabilities-existentes).

## Requisitos transversales

### REQ-MPA-X-001 — Separación de roles producto

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | M1+ |

La app mobile MUST NOT exponer rutas, pantallas ni casos de uso de **staff** (agenda sede, confirmar/rechazar pagos, settings sede, CRUD métodos de pago).

**Given** un usuario autenticado como jugador en mobile  
**When** navega por todas las rutas registradas en `GoRouter`  
**Then** MUST NOT existir destino a agenda staff ni confirmación manual de transacciones.

---

### REQ-MPA-X-002 — No regresión flujos jugador existentes

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | M1–M4 |

Torneos, chat, matchmaking, lifecycle de partida (join, resultados, cancelación) y onboarding de perfil MUST permanecer funcionales tras cada fase.

**Given** la suite `flutter test` y tests API de partidas/torneos existentes  
**When** se ejecuta CI tras merge de cada fase  
**Then** los tests preexistentes de esos dominios MUST seguir en verde sin cambios de contrato no documentados.

---

### REQ-MPA-X-003 — Verificación por paquete

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | M1–M4 |

| Paquete | Comando obligatorio antes de cerrar fase |
|---------|------------------------------------------|
| `apps/mobile` | `flutter analyze` → `flutter test` |
| `services/api` (M2/M3 API) | `typecheck` → `lint` → `test` |

**Given** una fase marcada completa en `tasks.md`  
**When** el Verifier ejecuta el pipeline del paquete afectado  
**Then** MUST pasar sin errores.

---

### REQ-MPA-X-004 — Presupuesto de revisión PR

| Campo | Valor |
|-------|-------|
| **Prioridad** | P1 |
| **Fase** | todas |

Cada PR de implementación SHOULD mantener ≤ 400 líneas (`additions + deletions`) salvo excepción documentada; orden recomendado: M1 → M2 API → M2 mobile → M3 → M4.

**Given** un forecast de diff > 400 líneas  
**When** se planifica `sdd-tasks`  
**Then** MUST recomendar chained PRs por fase.

## Deltas sobre capabilities existentes

### Delta: `multi-currency-payments`

#### ADDED Requirements

##### REQ-MPA-MCP-001 — Mobile jugador: solo lectura monetaria

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | M3 |

`apps/mobile` MUST consumir montos como `MoneyAmount` (`amountMinor` + `currencyCode`) en flujos de pago jugador y MUST NOT invocar endpoints de escritura staff de monetización (confirmación manual, CRUD métodos de pago).

**Given** un jugador en pantalla de pago de partida  
**When** la app muestra totales, obligaciones o instrucciones de transferencia  
**Then** cada monto visible MUST derivarse de `MoneyAmount` con `currencyCode` coherente con `venue.pricingCurrency` o `settlementCurrency` del medio, formateado vía util compartida (`formatMoney`).

**Given** el repositorio de monetización mobile  
**When** se inspecciona la API pública del data layer  
**Then** MUST NOT existir método `confirmTransactionManual` ni equivalente staff.

---

##### REQ-MPA-MCP-002 — Medios de pago activos (lectura)

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | M3 |

En flujo feliz, mobile MUST obtener medios de pago con `GET /api/v1/venues/:venueId/payment-methods` (lista activa, solo lectura) y MAY dejar de llamar `payment-info` legacy.

**Given** sede con al menos un `VenuePaymentMethod` activo  
**When** el jugador abre instrucciones de pago  
**Then** la UI MUST listar tipo de medio y `settlementCurrency` sin datos internos staff (IDs de conciliación, notas admin).

**Given** `payment-info` aún expuesto por API  
**When** mobile en versión M3+  
**Then** MUST NOT depender de `payment-info` en el camino feliz documentado en tests.

---

#### MODIFIED Requirements

##### Requirement: Alcance Phase 2 mobile staff paridad

(Previously: Phase 2 incluía «mobile staff paridad» en el programa multi-moneda.)

Para el change `mobile-player-alignment`, la paridad staff en mobile queda **descartada**; staff SHALL usar únicamente `apps/web`. Cualquier requisito de UI staff mobile en specs archivados NO aplica a `apps/mobile` tras este change.

**Given** la tabla de fases en `openspec/specs/multi-currency-payments/spec.md`  
**When** se interpreta alcance mobile post M3  
**Then** mobile MUST limitarse a lectura/formateo jugador; confirmación manual permanece en web.

---

### Delta: `monetization-transactions`

#### ADDED Requirements

##### REQ-MPA-MT-001 — Summary match para jugador con MoneyAmount

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | M3 |

`GET` de summary/obligations de partida consumido por mobile MUST incluir obligaciones y totales como `MoneyAmount` (o mapa equivalente con `amountMinor` + `currencyCode` por ítem).

**Given** partida con obligaciones en `pricingCurrency` USD  
**When** mobile parsea la respuesta de summary  
**Then** MUST NOT mostrar montos como string major sin moneda; dual-read legacy `*Cents` MAY usarse solo si `currencyCode` coincide con `pricingCurrency`.

---

##### REQ-MPA-MT-002 — Estado de transacción visible al jugador (sin confirmar)

| Campo | Valor |
|-------|-------|
| **Prioridad** | P1 |
| **Fase** | M3b |

Tras subir comprobante, mobile MUST reflejar `Transaction.status` ∈ {`PENDING`, `CONFIRMED`, `REJECTED`} mediante polling ligero o refresh al reentrar, sin invocar `confirm-manual`.

**Given** jugador en waiting screen con transacción `PENDING`  
**When** staff confirma en web  
**Then** tras intervalo de poll (5–15 s con backoff) o al volver a detalle, la UI MUST mostrar estado confirmado y mensaje acorde en español.

**Given** staff rechaza la transacción  
**When** mobile refresca estado  
**Then** MUST mostrar rechazo y permitir reintentar según reglas existentes de negocio.

**Given** el cubit/pantalla waiting se dispone  
**When** el widget sale del árbol  
**Then** MUST cancelar timers de poll.

---

#### MODIFIED Requirements

##### Requirement: REQ-MCP-037 — Confirmación manual API

(Previously: solo definía contrato PATCH staff sin exclusión mobile.)

`PATCH .../confirm-manual` MUST permanecer disponible para **staff web** únicamente. `apps/mobile` MUST NOT llamar este endpoint en ningún flujo.

**Given** build mobile M3+  
**When** se ejecuta búsqueda estática (`grep`) en `apps/mobile`  
**Then** MUST NOT existir referencias a `confirm-manual` ni rutas staff de transacciones.

*(Escenarios REQ-MCP-034–040 sin cambio en API; aplican a web/staff.)*

---

## Trazabilidad: criterios de éxito (propuesta)

| Criterio propuesta | Requisitos |
|--------------------|------------|
| Sin referencias backoffice/payments staff | REQ-MPOS-001–006, REQ-MPA-X-001 |
| Crear partida → bloqueo agenda web | REQ-MPMR-003–005 |
| 409 disponibilidad | REQ-MPMR-006–007 |
| Montos con moneda sede | REQ-MPPU-003–005, REQ-MPA-MCP-001 |
| Medios activos sin `payment-info` feliz | REQ-MPPU-006–007, REQ-MPA-MCP-002 |
| Sin confirm-manual mobile | REQ-MPPU-008, REQ-MPA-MT-002, REQ-MPA-MT delta 037 |
| Waiting refleja CONFIRMED | REQ-MPPU-009–011 |
| Picker acotado a openingHours | REQ-MVOH-003–007 |
| Torneos/chat OK | REQ-MPA-X-002 |

## Próximo paso

- **sdd-design:** secuencias create-match+reservation, DTOs Dart, `core/venue/opening_hours.dart`, plan chained PRs.
- **sdd-tasks:** DAG por fase M1→M4 tras design.
