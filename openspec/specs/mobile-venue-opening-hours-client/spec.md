# Capability: mobile-venue-opening-hours-client

| Campo | Valor |
|-------|-------|
| **Programa** | `mobile-player-alignment` (archivado 2026-05-18) |
| **Fase** | M4 (P1) |
| **Paquete** | `apps/mobile` |
| **Referencia semántica** | `apps/web/src/lib/venue-opening-hours.ts`, `services/api/src/domain/services/venue/venue_opening_hours.service.ts` |

## Propósito

Acotar el picker de disponibilidad al crear partida usando `Venue.openingHours` y util Dart con la misma semántica que web/API (timezone sede, día cerrado, ventana open/close).

## Modelo openingHours (referencia)

Mapa JSON por día (`sunday` … `saturday`) con `{ "open": "HH:mm", "close": "HH:mm" }`. Día ausente o cerrado → sin slots. Timezone por defecto sede: `America/Caracas` si no se especifica otro en venue settings.

## Requirements

### REQ-MVOH-001 — VenueDto incluye openingHours

| Campo | Valor |
|-------|-------|
| **Prioridad** | P1 |
| **Fase** | M4 |

`VenueDto` (list/detail) MUST deserializar `openingHours` desde API cuando esté presente.

**Given** `GET /venues/:id` con `openingHours` en JSON  
**When** mobile parsea venue  
**Then** modelo MUST conservar mapa por día para el util.

**Given** `openingHours` null o ausente  
**When** se calcula ventana  
**Then** util MUST aplicar defaults documentados (p. ej. 08:00–23:00) alineados a web.

---

### REQ-MVOH-002 — Util Dart en core

| Campo | Valor |
|-------|-------|
| **Prioridad** | P1 |
| **Fase** | M4 |

MUST existir módulo `apps/mobile/lib/src/core/venue/` (o ruta acordada en design) con funciones espejo de:

- `dayKeyFromIsoDate`
- `getDayWindowMinutes` / rango open-close del día
- `minutesToTimeString`
- detección día cerrado

**Given** mismos inputs que tests web en `venue-opening-hours.test.ts`  
**When** se ejecutan casos equivalentes en Dart  
**Then** MUST producir mismos `from`/`to` en minutos locales.

---

### REQ-MVOH-003 — create_match_screen usa ventana sede

| Campo | Valor |
|-------|-------|
| **Prioridad** | P1 |
| **Fase** | M4 |

`create_match_screen` MUST NOT usar ventana fija global 06:00–23:59; MUST calcular `from`/`to` del día seleccionado según `openingHours` y timezone de la sede.

**Given** sede abierta lunes 08:00–22:00  
**When** jugador elige lunes en picker  
**Then** slots ofrecidos MUST estar ⊆ [08:00, 22:00) en hora local sede.

**Given** domingo cerrado en `openingHours`  
**When** jugador elige domingo  
**Then** MUST mostrar estado vacío / sede cerrada en español; MUST NOT ofrecer slots.

---

### REQ-MVOH-004 — Integración con getVenueAvailability

| Campo | Valor |
|-------|-------|
| **Prioridad** | P1 |
| **Fase** | M4 |

Parámetros `from`/`to` enviados a disponibilidad MUST derivarse del util de opening hours para la fecha seleccionada (conversión a UTC según timezone sede).

**Given** fecha y sede con horario conocido  
**When** mobile solicita availability  
**Then** rango UTC del request MUST cubrir solo la ventana abierta (no 06:00–23:59 genérico).

---

### REQ-MVOH-005 — Timezone sede

| Campo | Valor |
|-------|-------|
| **Prioridad** | P1 |
| **Fase** | M4 |

Cálculo de día local MUST usar timezone de monetización/settings de sede (`America/Caracas` por defecto).

**Given** `scheduledAt` cruzando medianoche UTC pero mismo día local  
**When** se resuelve `dayKey`  
**Then** MUST usar calendario local sede, no UTC del dispositivo.

---

### REQ-MVOH-006 — Sin edición de horarios en mobile

| Campo | Valor |
|-------|-------|
| **Prioridad** | P1 |
| **Fase** | M4 |

Mobile MUST NOT exponer UI para editar `openingHours`; edición permanece en web settings.

**Given** app mobile M4  
**When** se recorren pantallas de sede  
**Then** MUST NOT existir formulario de horarios staff.

---

### REQ-MVOH-007 — Tests unitarios util

| Campo | Valor |
|-------|-------|
| **Prioridad** | P1 |
| **Fase** | M4 |

MUST existir tests unitarios Dart (≥ 1 por regla crítica): día cerrado, default sin mapa, ventana normal, parseo `HH:mm`.

**Given** `flutter test` del archivo `venue_opening_hours_test.dart` (nombre según design)  
**When** CI mobile  
**Then** MUST pasar todos los casos portados desde web.

## Criterios de aceptación verificables (M4)

| ID | Verificación |
|----|----------------|
| AC-MVOH-01 | Test unitario domingo cerrado → 0 slots |
| AC-MVOH-02 | Test lunes 08–22 → primer slot ≥ 08:00, último < 22:00 |
| AC-MVOH-03 | Paridad con casos en `apps/web/src/lib/venue-opening-hours.test.ts` |
| AC-MVOH-04 | `flutter analyze` + `flutter test` verdes |
