# Capability: mobile-player-only-surface

| Campo | Valor |
|-------|-------|
| **Programa** | `mobile-player-alignment` (archivado 2026-05-18) |
| **Fase** | M1 (P0) |
| **Paquete** | `apps/mobile` |

## Propósito

Garantizar que la app Flutter exponga únicamente superficie de **jugador**, eliminando features, rutas, inyección de dependencias y tests heredados de prototipo staff.

## Requirements

### REQ-MPOS-001 — Eliminación feature backoffice_reservations

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | M1 |

El directorio `apps/mobile/lib/src/features/backoffice_reservations/` MUST NOT existir tras M1.

**Given** el repositorio tras merge M1  
**When** se lista `features/backoffice_reservations`  
**Then** el path MUST estar ausente.

**Given** `flutter analyze`  
**When** se ejecuta en `apps/mobile`  
**Then** MUST NOT reportar imports rotos hacia `backoffice_reservations`.

---

### REQ-MPOS-002 — Eliminación feature payments staff

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | M1 |

El directorio `apps/mobile/lib/src/features/payments/` (pendientes staff) MUST NOT existir tras M1.

**Given** el repositorio tras merge M1  
**When** se busca `features/payments`  
**Then** MUST estar ausente.

**Given** flujos de monetización jugador en `features/monetization/`  
**When** M1 completa  
**Then** MUST permanecer intactos (no confundir con feature `payments` staff eliminada).

---

### REQ-MPOS-003 — Ruta schedule staff retirada

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | M1 |

La ruta `/venues/:venueId/schedule` MUST NOT registrarse en `GoRouter` ni constantes en `routes.dart`.

**Given** `app_router.dart` y `routes.dart`  
**When** se inspeccionan definiciones de ruta  
**Then** MUST NOT existir path `schedule` bajo venues para staff.

**Given** un deep link o navegación programática legacy a schedule  
**When** el usuario intenta abrirlo  
**Then** MUST caer en ruta desconocida / home jugador (comportamiento GoRouter por defecto), sin pantalla staff.

---

### REQ-MPOS-004 — DI sin registros staff

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | M1 |

`service_locator.dart` MUST NOT registrar repositorios, cubits ni use cases de `backoffice_reservations` ni `payments` staff.

**Given** `get_it` / `service_locator` tras M1  
**When** se buscan tipos `Backoffice*`, `StaffSchedule*`, `PendingPayments*` del feature eliminado  
**Then** MUST NOT existir registro.

---

### REQ-MPOS-005 — Tests staff eliminados

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | M1 |

Tests bajo `apps/mobile/test/features/backoffice_reservations/**` MUST eliminarse junto al feature.

**Given** `flutter test` en `apps/mobile`  
**When** CI ejecuta la suite  
**Then** MUST pasar sin tests que importen código staff eliminado.

---

### REQ-MPOS-006 — Cero referencias textuales en mobile

| Campo | Valor |
|-------|-------|
| **Prioridad** | P0 |
| **Fase** | M1 |

En `apps/mobile`, búsqueda de `backoffice_reservations` y ruta `schedule` staff MUST arrojar 0 coincidencias en `lib/` y `test/` (excluyendo comentarios de changelog si existieran).

**Given** `rg backoffice_reservations apps/mobile`  
**When** M1 está mergeado  
**Then** MUST retornar sin matches en código activo.

## Criterios de aceptación verificables (M1)

| ID | Verificación |
|----|----------------|
| AC-MPOS-01 | `cd apps/mobile && flutter analyze` → exit 0 |
| AC-MPOS-02 | `cd apps/mobile && flutter test` → exit 0 |
| AC-MPOS-03 | `rg -l backoffice_reservations apps/mobile/lib apps/mobile/test` → vacío |
| AC-MPOS-04 | Navegación manual: no hay entrada UI a agenda sede |
