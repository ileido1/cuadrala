# Capability: mobile-player-match-reservation

| Campo | Valor |
|-------|-------|
| **Change** | `mobile-player-alignment` |
| **Fase** | M2 (P0) |
| **Paquetes** | `services/api`, `apps/mobile` |

## Propósito

Al crear una partida regular, el servidor MUST crear en una sola transacción un `Match` y una `Reservation` tipo `MATCH` con `visibility: PUBLISHED`, coherente con disponibilidad unificada; el cliente mobile envía `durationMinutes` y maneja conflictos `409`.

## Requirements

### REQ-MPMR-001 — Transacción atómica match + reserva

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | M2 |
| **API** | `CreateMatchUseCase` (o UC invocado desde create match) |

`POST /api/v1/matches` MUST, en éxito, persistir `Match` y `Reservation` con `type = MATCH`, `visibility = PUBLISHED`, `scheduledAt` y `durationMinutes` alineados al payload.

**Given** cancha libre en el slot solicitado según reglas de disponibilidad (solo reservas publicadas)  
**When** jugador autenticado envía create match válido  
**Then** MUST retornar 201 con ids de match y reserva vinculada; MUST existir exactamente una reserva `MATCH` `PUBLISHED` para ese slot.

**Given** fallo de validación de disponibilidad dentro de la transacción  
**When** se intenta crear match  
**Then** MUST NOT dejar match huérfano sin reserva ni reserva sin match.

---

### REQ-MPMR-002 — Campos de reserva vinculada

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | M2 |

La reserva creada MUST usar `courtId`, `scheduledAt`, `durationMinutes` del request; `pricingCurrency` MUST copiarse de la sede; estado inicial coherente con modelo bookings unificado.

**Given** sede con `pricingCurrency = EUR`  
**When** se crea partida  
**Then** la reserva vinculada MUST tener `pricingCurrency = EUR`.

---

### REQ-MPMR-003 — Visibilidad PUBLISHED y agenda web

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | M2 |

La reserva MUST ser `PUBLISHED` para bloquear disponibilidad en consultas que filtran solo publicadas (paridad con web staff).

**Given** partida creada exitosamente  
**When** staff abre agenda web de la sede en el mismo slot  
**Then** MUST visualizarse bloqueo/reserva `MATCH` en ese horario.

---

### REQ-MPMR-004 — Mobile envía durationMinutes

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | M2 |

El cliente mobile MUST enviar `durationMinutes` en el body de create match; valor por defecto **90** si el usuario no altera duración (alineado con picker actual).

**Given** usuario crea partida sin cambiar duración  
**When** mobile serializa el request  
**Then** body MUST incluir `durationMinutes: 90` (o valor UI equivalente documentado).

**Given** usuario selecciona otra duración permitida  
**When** envía create match  
**Then** MUST reflejar el valor elegido en `durationMinutes`.

---

### REQ-MPMR-005 — Contrato POST /matches (jugador)

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | M2 |

Mobile MUST seguir usando `POST /api/v1/matches` con `type: REGULAR` (o equivalente documentado); MUST NOT orquestar `POST /venues/:id/bookings` + enlace manual en cliente.

**Given** flujo crear partida en mobile  
**When** se observa tráfico de red  
**Then** MUST existir una sola llamada create match (no doble POST booking+match).

---

### REQ-MPMR-006 — Conflicto de disponibilidad 409

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | M2 |

Si otra reserva `PUBLISHED` ocupa el slot, API MUST responder **409** con código/mensaje coherente con bookings existentes; mobile MUST mostrar error en español sin crash.

**Given** cancha con reserva `PUBLISHED` solapada  
**When** jugador intenta crear partida en el mismo slot  
**Then** API MUST 409; mobile MUST presentar mensaje comprensible y mantener formulario editable.

---

### REQ-MPMR-007 — Test integración API

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | M2 |

MUST existir test de integración (Vitest + `TEST_DATABASE_URL`) que verifique: (a) create match crea reserva publicada, (b) segundo create en mismo slot → 409.

**Given** DB de prueba migrada  
**When** test `create match links published reservation` ejecuta  
**Then** MUST pasar en CI con `TEST_DATABASE_URL`.

---

### REQ-MPMR-008 — Test mobile create match

| Campo | Valor |
|-------|-------|
| **Prioridad** | P1 |
| **Fase** | M2 |

SHOULD existir test de cubit o widget que verifique envío de `durationMinutes` y manejo de error 409 (mock repository).

**Given** repository mock que devuelve 409  
**When** cubit submit create match  
**Then** estado MUST ser error con mensaje; MUST NOT emitir éxito.

## Criterios de aceptación verificables (M2)

| ID | Verificación |
|----|----------------|
| AC-MPMR-01 | Test integración API match+reservation verde |
| AC-MPMR-02 | Tras crear partida, agenda web muestra bloqueo |
| AC-MPMR-03 | Segundo create mismo slot → 409 |
| AC-MPMR-04 | Request mobile incluye `durationMinutes` (test o log) |
