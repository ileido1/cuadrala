# Capability: venue-staff-authorization-uc

**Programa:** `api-architecture-refactor`  
**Ola:** Wave 7 — P1  
**Alcance:** Autorización staff de venue vía use case; eliminación de export de repositorio al controller dashboard

## Purpose

Eliminar la última violación P1 donde `venue_dashboard.controller.ts` importa `VENUE_STAFF_REPOSITORY` y ejecuta `isUserStaffOfVenueSV` en capa presentation. La autorización MUST vivir en application mediante un UC dedicado reutilizable, alineado con el patrón gold de otros BC (bookings, monetization) que ya inyectan el port dentro del UC.

## Contrato del use case

| Campo | Valor |
|-------|-------|
| **Clase** | `AssertVenueStaffAccessUseCase` |
| **Archivo** | `application/use_cases/assert_venue_staff_access.use_case.ts` |
| **Método** | `executeSV(_actorUserId: string, _venueId: string): Promise<void>` |
| **Port inyectado** | `VenueStaffRepository` (`domain/ports/venue_staff_repository.ts`) |
| **Export composition** | `ASSERT_VENUE_STAFF_UC` desde `presentation/composition/venue_dashboard.composition.ts` |

### Comportamiento

- El UC MUST invocar `isUserStaffOfVenueSV(_actorUserId, _venueId)` en el port.
- Si el resultado es `false`, MUST lanzar `AppError` con código `NO_AUTORIZADO`, mensaje en español coherente con el handler actual, y **HTTP status 403**.
- Si el resultado es `true`, MUST resolver sin valor (void) — el handler continúa con el UC de negocio.
- **Idempotencia:** llamadas repetidas con el mismo par `(actorUserId, venueId)` y mismo estado de staff MUST producir el mismo resultado (éxito silencioso o mismo 403); MUST NOT tener efectos secundarios en persistencia ni mutar estado.

### Fuera de alcance (sin cambio en Wave 7)

- Compositions que ya inyectan `VenueStaffRepository` **dentro** de otros UC (`bookings.composition.ts`, `reservations.composition.ts`, `monetization.composition.ts`, `court_pricing.composition.ts`, etc.) MUST NOT refactorizarse a `ASSERT_VENUE_STAFF_UC` salvo decisión explícita posterior.
- Contratos HTTP (paths, query, body, shape JSON 200) MUST NOT cambiar; solo el origen interno de la comprobación staff.

## Requirements

### Requirement: AssertVenueStaffAccessUseCase es la única puerta de auth staff en venue dashboard

The system MUST provide `AssertVenueStaffAccessUseCase` with signature `executeSV(actorUserId: string, venueId: string): Promise<void>`. `venue_dashboard.controller.ts` MUST invoke `ASSERT_VENUE_STAFF_UC.executeSV(ACTOR_USER_ID, PARAMS.venueId)` before each business use case. The controller MUST NOT import `VenueStaffRepository`, `VENUE_STAFF_REPOSITORY`, or call `isUserStaffOfVenueSV` directly.

#### Scenario: Staff autorizado continúa al UC de negocio

- GIVEN un usuario autenticado con `req.authUser.id` válido
- AND el usuario es staff activo del `venueId` solicitado
- WHEN el handler llama `await ASSERT_VENUE_STAFF_UC.executeSV(actorUserId, venueId)`
- THEN la promesa MUST resolverse sin error
- AND el handler MAY invocar el UC de negocio correspondiente

#### Scenario: Usuario no staff recibe 403

- GIVEN un usuario autenticado que NO es staff del `venueId`
- WHEN `ASSERT_VENUE_STAFF_UC.executeSV(actorUserId, venueId)` se ejecuta
- THEN MUST lanzarse `AppError` con status **403** y código `NO_AUTORIZADO`
- AND el UC de negocio MUST NOT ejecutarse

#### Scenario: Idempotencia en verificación repetida

- GIVEN el mismo `actorUserId` y `venueId` en dos invocaciones consecutivas en la misma request lifecycle (o en tests con mock estable)
- WHEN `executeSV` se llama dos veces con staff válido
- THEN ambas MUST resolver sin error
- AND el repositorio MUST NOT registrar escrituras (solo lectura de membership)

#### Scenario: Usuario no autenticado permanece en controller

- GIVEN `req.authUser` es `undefined`
- WHEN cualquier handler de `venue_dashboard.controller.ts` procesa la request
- THEN el controller MUST lanzar 401 antes de invocar `ASSERT_VENUE_STAFF_UC` (comportamiento actual preservado)

---

### Requirement: Composition no exporta repositorio al controller dashboard

`venue_dashboard.composition.ts` MUST export `ASSERT_VENUE_STAFF_UC` wired con `PrismaVenueStaffRepository` (o adapter equivalente). It MUST NOT export `VENUE_STAFF_REPOSITORY` for controller consumption.

#### Scenario: Grep de export prohibido

- GIVEN Wave 7 P1 mergeado
- WHEN se ejecuta búsqueda en `presentation/composition/venue_dashboard.composition.ts` por `export { VENUE_STAFF_REPOSITORY` o `export.*VENUE_STAFF_REPOSITORY`
- THEN MUST haber **0** coincidencias

#### Scenario: Controller imports solo UC

- GIVEN `venue_dashboard.controller.ts`
- WHEN se analizan imports desde `venue_dashboard.composition.js`
- THEN solo MUST importar símbolos `*_UC` (incluido `ASSERT_VENUE_STAFF_UC`)
- AND MUST NOT importar `VENUE_STAFF_REPOSITORY`

---

### Requirement: Cinco handlers del dashboard migrados

Los cinco handlers HTTP en `venue_dashboard.controller.ts` MUST invocar `ASSERT_VENUE_STAFF_UC` tras validar sesión y params, y antes del UC de negocio:

| Handler | UC de negocio posterior |
|---------|-------------------------|
| `getDashboardStatsCON` | `GET_DASHBOARD_STATS_UC` |
| `getTransactionStatsCON` | `GET_TRANSACTION_STATS_UC` |
| `getTransactionHistoryCON` | `LIST_VENUE_TRANSACTION_HISTORY_UC` |
| `patchVenueCON` | `UPDATE_VENUE_UC` |
| `getVenueMatchesCON` | `LIST_VENUE_MATCHES_UC` |

#### Scenario: getDashboardStatsCON

- GIVEN request autenticada a stats de venue
- WHEN `getDashboardStatsCON` ejecuta
- THEN MUST llamar `ASSERT_VENUE_STAFF_UC.executeSV` con `venueId` de params
- AND luego `GET_DASHBOARD_STATS_UC.executeSV`

#### Scenario: patchVenueCON sin staff

- GIVEN usuario no staff del venue
- WHEN `patchVenueCON` ejecuta
- THEN respuesta HTTP MUST ser **403**
- AND `UPDATE_VENUE_UC` MUST NOT haberse invocado

---

### Requirement: Tests unitarios y contract mínimos (TDD)

Wave 7 P1 MUST ship tests before or with implementation (Red-Green).

#### Scenario: Unit test UC — staff válido

- GIVEN mock de `VenueStaffRepository` con `isUserStaffOfVenueSV` → `true`
- WHEN `AssertVenueStaffAccessUseCase.executeSV('user-1', 'venue-1')`
- THEN MUST resolver sin throw
- AND `isUserStaffOfVenueSV` MUST haberse llamado una vez con `('user-1', 'venue-1')`

#### Scenario: Unit test UC — no staff

- GIVEN mock con `isUserStaffOfVenueSV` → `false`
- WHEN `executeSV('user-1', 'venue-1')`
- THEN MUST rechazar con `AppError` status 403

#### Scenario: Contract test mínimo — dashboard sin staff

- GIVEN suite contract en `services/api` (sin DB o con fixtures según patrón existente de venues)
- WHEN `GET /api/v1/venues/:venueId/dashboard/stats` (o ruta equivalente registrada) con JWT de usuario no staff del venue
- THEN HTTP status MUST ser **403**
- AND body MUST incluir código/mensaje de error coherente con `NO_AUTORIZADO`

#### Scenario: Contract test mínimo — dashboard con staff

- GIVEN JWT de usuario staff del venue en entorno de test configurado
- WHEN mismo endpoint de stats
- THEN HTTP status MUST ser **200** (sin regresión de contrato exitoso)

## Casos límite

| Caso | Comportamiento esperado |
|------|-------------------------|
| `venueId` inexistente en BD | `isUserStaffOfVenueSV` → `false` → 403 (no filtrar 404 en UC de auth) |
| Staff revocado entre dos llamadas en requests distintas | Segunda request MAY devolver 403 si membership ya no existe |
| `actorUserId` vacío tras auth middleware | Controller 401 antes del UC; UC no recibe string vacío desde controller gold |

## Criterios verificables (proposal success criteria)

- [ ] `venue_dashboard.controller.ts`: 0 imports de `VENUE_STAFF_REPOSITORY` / ports staff
- [ ] 5 handlers usan `ASSERT_VENUE_STAFF_UC`
- [ ] `rg "export.*VENUE_STAFF_REPOSITORY" presentation/composition/venue_dashboard.composition.ts` → 0
- [ ] Tests unitarios UC + ≥1 contract 403/200 en verde con `npm test`
