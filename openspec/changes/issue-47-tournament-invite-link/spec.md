# Delta Spec: issue-47-tournament-invite-link

| Campo | Valor |
|-------|-------|
| **Change** | `issue-47-tournament-invite-link` |
| **GitHub Issue** | ileido1/cuadrala#47 — "[Feature] Invite players to tournament by shareable link" |
| **Proposal** | (ver documento de Proposer, alcance ya aprobado por el usuario) |
| **Capabilities** | `tournament-invite-link` (new) |

---

## Domain: tournament-invite-link (NEW CAPABILITY)

### Purpose

Permitir que el organizador de un torneo (o staff de su sede) genere un link
compartible que cualquier persona pueda abrir para inscribirse al torneo, sin
necesidad de que el organizador conozca de antemano quién va a entrar (a
diferencia de `TournamentInvitation`, que invita a un usuario ya identificado
por id). El link debe abrir la app mobile si está instalada (deep link) y
caer a una landing web si no lo está o si se abre en escritorio.

### Decisiones ya cerradas (no reabrir en este documento)

- Modelo nuevo `TournamentInviteLink`; NO se reusa ni se modifica
  `TournamentInvitation` ni `TournamentGuestScheduleToken` (son de otras
  features). El patrón de token seguro de `TournamentGuestScheduleToken` SÍ
  se copia (hash sha256, nunca se persiste el token crudo).
- Autorización para generar/listar/revocar links: únicamente el organizador
  del torneo o staff de su sede, vía `AssertTournamentOrganizerAccessUseCase`
  (mismo mecanismo que #49/#50), sin UC nuevo de autorización.
- El registro vía link acepta usuario autenticado (si manda su sesión) o
  invitado (nombre/teléfono/email), reusando `TournamentRegistration.
  registrationType` (`AUTHENTICATED` / `GUEST`) tal cual existe hoy.
- Alcance incluye deep-linking real a mobile, además de la landing web.

### Modelo de datos (contrato)

#### `TournamentInviteLink` (nueva entidad)

| Campo | Tipo | Constraint |
|-------|------|------------|
| `id` | `String` | PK, uuid |
| `tournamentId` | `String` | FK → `Tournament`, `onDelete: Cascade` |
| `tokenHash` | `String` | `@unique`, sha256 hex del token crudo — **nunca se persiste el token crudo** |
| `createdByUserId` | `String` | FK → `User`; actor que generó el link (organizador o staff) |
| `expiresAt` | `DateTime` | NOT NULL — siempre tiene valor (ver NFR-TIL-004 para el default) |
| `maxUses` | `Int?` | `null` = sin límite de usos; si se define, MUST ser `>= 1` |
| `usesCount` | `Int` | `@default(0)`; se incrementa solo en altas nuevas (ver REQ-TIL-008/REQ-TIL-010) |
| `revokedAt` | `DateTime?` | `null` = activo |
| `createdAt` | `DateTime` | `@default(now())` |

Índices: `@@index([tournamentId])`, `@@index([expiresAt])` (mismo patrón que
`TournamentGuestScheduleToken`).

#### `TournamentRegistration` (modificación aditiva)

| Campo nuevo | Tipo | Constraint |
|-------------|------|------------|
| `inviteLinkId` | `String?` | FK → `TournamentInviteLink`, `onDelete: SetNull`; `null` cuando la inscripción no vino de un link |

No se modifica ninguna constraint existente (`@@unique([tournamentId, userId])`
sigue aplicando solo a `AUTHENTICATED`). Este campo es lo único que permite
cumplir REQ-TIL-006 ("quién se registró vía cada link").

---

### Requirements

#### Requirement: Generar link de invitación (REQ-TIL-001)

Solo el organizador del torneo o staff de su sede MUST poder generar un link.
`POST /tournaments/:tournamentId/invite-links` (requiere `requireAuth`).

##### Scenario: Organizador genera un link válido
- GIVEN un usuario autenticado que es `organizerUserId` del torneo
- WHEN hace `POST /tournaments/:tournamentId/invite-links` con body `{}` (sin overrides)
- THEN la respuesta MUST ser 201 con `{ id, token, url, deepLink, expiresAt, maxUses: null, usesCount: 0, revokedAt: null, createdAt }`
- AND `token` MUST ser el valor crudo, devuelto **solo esta vez** (no se puede recuperar después)

##### Scenario: Actor sin autoridad intenta generar un link
- GIVEN un usuario autenticado que no es organizador ni staff de la sede del torneo
- WHEN hace `POST /tournaments/:tournamentId/invite-links`
- THEN MUST responder 403 `NO_AUTORIZADO` (vía `AssertTournamentOrganizerAccessUseCase.executeSV`)
- AND no MUST crearse ninguna fila `TournamentInviteLink`

##### Scenario: Torneo inexistente
- GIVEN `:tournamentId` no existe
- WHEN se llama el endpoint
- THEN MUST responder 404 `TORNEO_NO_ENCONTRADO`

---

#### Requirement: Token seguro, nunca persistido en crudo (REQ-TIL-002)

El token MUST generarse con la misma entropía que `TournamentGuestScheduleToken`
(`randomBytes(32).toString('base64url')`) y MUST almacenarse únicamente como
`sha256(token)` hex en `tokenHash`. Ningún log, response de listado, ni mensaje
de error MUST incluir el token crudo salvo en la respuesta de creación.

##### Scenario: Validación de un token recibido
- GIVEN un token crudo recibido en `GET/POST /public/tournament-invite-links/:token...`
- WHEN el sistema lo valida
- THEN MUST calcular `sha256(token)` y buscar por `tokenHash`, nunca comparar el string crudo almacenado
- AND si el string no cumple longitud `40..200` MUST responder 400 antes de tocar la base de datos (mismo patrón que `z.string().min(40).max(200)` de guest-schedule)

##### Scenario: Listado nunca expone el token
- GIVEN `GET /tournaments/:tournamentId/invite-links`
- WHEN se devuelve la lista de links
- THEN ningún item MUST incluir `token` ni `tokenHash`

---

#### Requirement: Expiración con default y override (REQ-TIL-003 / NFR-TIL-004)

**Default cuando no se especifica `expiresAt`:** `MIN(tournament.registrationClosesAt, tournament.startsAt)` si alguno de los dos está definido y es futuro; si ninguno aplica, `now() + 30 días`. Racional: un link que sigue activo después de que el torneo ya cerró inscripción o ya empezó es un bug de UX, no solo de seguridad — atarlo al ciclo de vida del torneo lo evita sin que el organizador tenga que acordarse de revocarlo.

**Override explícito:** el organizador MAY pasar `expiresAt` propio. MUST estar entre `now() + 1 hora` y `now() + 180 días` (cota dura para no dejar tokens vivos indefinidamente); fuera de rango MUST responder 422.

##### Scenario: Sin override, torneo con `registrationClosesAt` futuro
- GIVEN un torneo con `registrationClosesAt` en 5 días y `startsAt` en 10 días
- WHEN se genera el link sin `expiresAt` en el body
- THEN `expiresAt` resultante MUST ser el `registrationClosesAt` del torneo (el mínimo de los dos)

##### Scenario: Sin override, torneo sin fechas declaradas
- GIVEN un torneo con `registrationClosesAt = null` y `startsAt = null`
- WHEN se genera el link sin `expiresAt`
- THEN `expiresAt` resultante MUST ser `now() + 30 días`

##### Scenario: Link expirado
- GIVEN un `TournamentInviteLink` con `expiresAt <= now()`
- WHEN se llama `GET` o `POST .../register` con ese token
- THEN MUST responder 410 `ENLACE_INVALIDO`
- AND NO MUST crearse ninguna inscripción

---

#### Requirement: Límite de usos opcional (REQ-TIL-004)

`maxUses = null` MUST significar sin tope. Si está definido, al alcanzar
`usesCount >= maxUses` cualquier intento posterior de registro MUST
rechazarse, sin afectar la capacidad de seguir listando o revocar el link.

##### Scenario: Link con usos agotados
- GIVEN un link con `maxUses = 5` y `usesCount = 5`
- WHEN alguien intenta `POST .../register` con ese token
- THEN MUST responder 409 `ENLACE_AGOTADO`
- AND `usesCount` NO MUST incrementarse

##### Scenario: `maxUses` inválido al crear
- GIVEN un body de creación con `maxUses: 0` o `maxUses: -1`
- WHEN se llama `POST /tournaments/:tournamentId/invite-links`
- THEN MUST responder 422 (debe ser `null` o entero `>= 1`)

---

#### Requirement: Revocación (REQ-TIL-005)

`DELETE /tournaments/:tournamentId/invite-links/:linkId` (requiere
`requireAuth` + misma autorización que REQ-TIL-001). Idempotente: revocar un
link ya revocado MUST seguir respondiendo éxito sin efecto adicional.

##### Scenario: Organizador revoca un link activo
- GIVEN un link activo (`revokedAt = null`)
- WHEN el organizador hace `DELETE /tournaments/:tournamentId/invite-links/:linkId`
- THEN MUST responder 204
- AND `revokedAt` MUST quedar seteado a `now()`
- AND cualquier intento posterior de registro con ese token MUST responder 409 `ENLACE_REVOCADO`

##### Scenario: Actor sin autoridad intenta revocar
- GIVEN un usuario autenticado que no es organizador ni staff de la sede
- WHEN intenta `DELETE .../invite-links/:linkId`
- THEN MUST responder 403 `NO_AUTORIZADO`
- AND el link NO MUST modificarse

##### Scenario: `linkId` de otro torneo
- GIVEN un `linkId` válido pero que pertenece a otro `tournamentId`
- WHEN se llama `DELETE /tournaments/:tournamentId/invite-links/:linkId`
- THEN MUST responder 404 `ENLACE_NO_ENCONTRADO` (no 403 — no se filtra existencia cruzada)

---

#### Requirement: Listado de links y de quién se registró por cada uno (REQ-TIL-006)

`GET /tournaments/:tournamentId/invite-links` (misma autorización) MUST
devolver, por cada link, sus metadatos y la lista de inscripciones que lo
usaron (vía `TournamentRegistration.inviteLinkId`).

##### Scenario: Listado con inscriptos
- GIVEN un link con 2 inscripciones asociadas (1 `AUTHENTICATED`, 1 `GUEST`)
- WHEN se llama `GET /tournaments/:tournamentId/invite-links`
- THEN la respuesta MUST incluir ese link con `registrants: [...]` de longitud 2
- AND cada item de `registrants` MUST indicar `registrationId`, `type`, `displayName` (nombre del user o `guestName`), `registeredAt`
- AND el `token`/`tokenHash` NO MUST estar presente (ver REQ-TIL-002)

---

#### Requirement: Registro autenticado vía link (REQ-TIL-007)

`POST /public/tournament-invite-links/:token/register` usa middleware
`optionalAuth` (ya existente en `auth.middleware.ts`), NO `requireAuth`.

##### Scenario: Usuario autenticado se registra con sesión válida
- GIVEN un link válido (no expirado, no revocado, con cupo de usos) y un `Authorization: Bearer <token>` válido en el request
- WHEN se llama `POST .../register` sin body de invitado
- THEN MUST crearse/reusarse una `TournamentRegistration` con `registrationType: AUTHENTICATED`, `userId` del actor, `status: PENDING`, `inviteLinkId` = id del link
- AND la respuesta MUST ser 201 con `{ registrationId, registrationType: 'AUTHENTICATED', tournamentId, status: 'PENDING' }`
- AND `usesCount` del link MUST incrementarse en 1 solo si la inscripción es nueva (ver Edge cases: reintento idempotente)

---

#### Requirement: Registro como invitado vía link (REQ-TIL-008)

Sin `Authorization` válido, el body MUST incluir `{ name, phone?, email }` con
los mismos límites que `INVITE_GUEST_TOURNAMENT_PARTICIPANT_BODY_SCHEMA`
(`name`: 1–100 chars; `phone`: opcional, regex `^\+?\d{8,15}$`; `email`:
requerido, formato válido).

El invariante existente `assertRegistrationIdentityInvariantSV` exige
`registeredByUserId` no nulo para `GUEST`. Como no hay un organizador
registrando en vivo, `registeredByUserId` MUST setearse al `createdByUserId`
del link (quien generó el link asume esa autoría, de forma análoga a cómo
hoy el organizador registra invitados vía `invite_guest_tournament_
participant`).

##### Scenario: Invitado se registra sin sesión
- GIVEN un link válido y sin `Authorization` en el request
- WHEN se llama `POST .../register` con `{ name: 'Juan Pérez', email: 'juan@mail.com' }`
- THEN MUST crearse una `TournamentRegistration` con `registrationType: GUEST`, `guestName`, `guestEmail`, `guestPhone: null`, `registeredByUserId` = `createdByUserId` del link, `inviteLinkId` = id del link
- AND la respuesta MUST ser 201 con `{ registrationId, registrationType: 'GUEST', tournamentId, status: 'PENDING' }`

##### Scenario: Datos de invitado inválidos
- GIVEN sin `Authorization` y body `{ name: '', email: 'no-es-un-email' }`
- WHEN se llama `POST .../register`
- THEN MUST responder 400 por validación zod, sin tocar la base de datos

---

#### Requirement: Reusa la ventana de roster abierto (REQ-TIL-009)

El registro vía link MUST reusar `isTournamentRosterOpenSV(tournament.status)`
tal cual (no se define una regla nueva).

##### Scenario: Torneo ya cerrado o en curso
- GIVEN un torneo con `status` fuera de `{DRAFT, OPEN}` (p. ej. `IN_PROGRESS`)
- WHEN se llama `POST .../register` con un link por demás válido
- THEN MUST responder 409 `TORNEO_CERRADO`
- AND NO MUST crearse inscripción ni incrementarse `usesCount`

---

#### Requirement: Reusa el chequeo de cupos agotados (REQ-TIL-010)

El registro vía link MUST reusar la misma lógica de `maxSlots` que
`RegisterTournamentParticipantUseCase` (conteo de inscripciones vs.
`tournament.maxSlots`), sin introducir una garantía de atomicidad distinta.

##### Scenario: Cupos agotados
- GIVEN `tournament.maxSlots = 16` y 16 inscripciones activas
- WHEN se llama `POST .../register` con un link válido
- THEN MUST responder 409 `CUPOS_AGOTADOS`

---

#### Requirement: Deep link a mobile con fallback web (REQ-TIL-011)

El `url`/`deepLink` devuelto en REQ-TIL-001 MUST ser una única URL universal
(`https://<dominio>/invite/:token`) que:
- en Android, con App Links configurado (`autoVerify` intent-filter +
  `assetlinks.json` en el dominio), MUST abrir la app directamente si está
  instalada;
- en iOS, con Universal Links configurado (Associated Domains entitlement +
  `apple-app-site-association` en el dominio), MUST abrir la app directamente
  si está instalada;
- si la app no está instalada, o se abre desde escritorio, MUST caer a la
  landing web (`apps/web/src/app/invite/[token]/page.tsx`).

La elección de paquete mobile (`app_links`, sucesor activo de `uni_links`) y
la configuración exacta de manifest/entitlements quedan para Designer/
Implementer — este requisito solo fija el comportamiento observable.

##### Scenario: App instalada
- GIVEN un dispositivo Android/iOS con Cuadrala instalada y App/Universal Links configurado
- WHEN el usuario abre la URL del link desde cualquier app externa (chat, mail)
- THEN el sistema operativo MUST abrir Cuadrala directamente en la pantalla de registro del torneo correcto (mismo `tournamentId` que resuelve el token)

##### Scenario: App no instalada
- GIVEN un dispositivo sin Cuadrala instalada
- WHEN se abre la misma URL
- THEN MUST abrirse la landing web en `/invite/:token`

##### Scenario: Apertura en escritorio
- GIVEN un navegador de escritorio
- WHEN se abre la URL del link
- THEN MUST renderizarse la landing web (sin intento de deep link)

---

#### Requirement: Landing web funcional, no solo redirección (REQ-TIL-012)

La landing web (`/invite/[token]`) MUST permitir completar el registro
completo (autenticado o invitado) llamando directamente a los mismos
endpoints públicos (`GET`/`POST /public/tournament-invite-links/:token...`),
no limitarse a un cartel de "descargá la app". Racional: el usuario decidió
explícitamente que el fallback cubre "si no tiene la app, o en escritorio" —
en escritorio nunca va a tener la app, así que una landing que solo redirige
a una store deja a ese usuario sin forma de registrarse.

##### Scenario: Registro completo desde la landing web
- GIVEN un usuario sin la app, en un navegador
- WHEN abre `/invite/:token`, ve la previsualización del torneo (`GET /public/tournament-invite-links/:token`) y completa el formulario de invitado
- THEN MUST poder enviar `POST /public/tournament-invite-links/:token/register` desde la misma página y recibir confirmación de inscripción

##### Scenario: Previsualización de link inválido
- GIVEN un token expirado, revocado o agotado
- WHEN se abre `/invite/:token`
- THEN la landing MUST mostrar un mensaje específico según el motivo (expirado / revocado / agotado / torneo cerrado), no un error genérico

---

### Non-Functional Requirements

#### NFR-TIL-001 — Entropía y manejo seguro del token

El token crudo MUST generarse con `randomBytes(32)` (256 bits) codificado
`base64url`, igual que `TournamentGuestScheduleToken`. MUST NOT persistirse
en crudo en ninguna tabla, log, ni mensaje de error — solo `sha256(token)` en
`tokenHash`. Las búsquedas por token MUST hacerse siempre por hash.

#### NFR-TIL-002 — Rate limiting (sin mecanismo reusable existente)

Se confirmó por búsqueda en `services/api/src` que **no existe** ningún
middleware de rate-limiting en el proyecto hoy (`rg rateLimit|RateLimit` → 0
resultados). Este feature MUST NOT inventar un middleware de rate-limiting
nuevo sin autorización explícita separada del usuario — eso es una decisión
de infraestructura transversal, no de esta feature puntual.

Como mitigación proporcional dentro del alcance actual: la validación de
longitud de token (`40..200` caracteres) MUST rechazar con 400 antes de
tocar la base de datos (mismo patrón que `tournament_schedule.validation.ts`),
y la entropía de NFR-TIL-001 hace la enumeración de tokens computacionalmente
inviable. La ausencia de rate-limiting en los endpoints públicos (`GET`/`POST
/public/tournament-invite-links/:token...`) queda documentada como
limitación aceptada — **should**, no **must**, para una iteración futura si
el usuario decide agregar rate-limiting transversal al proyecto.

#### NFR-TIL-003 — Límites de input de invitado

MUST reusar exactamente los límites ya definidos en
`INVITE_GUEST_TOURNAMENT_PARTICIPANT_BODY_SCHEMA`
(`services/api/src/presentation/validation/tournament_registration.validation.ts`):
`name` 1–100 caracteres, `phone` opcional con regex `^\+?\d{8,15}$`, `email`
requerido con formato válido. No se definen límites nuevos ni distintos para
no desincronizar el guest de "invitar" (organizador) del guest de "link"
(autoinscripción).

#### NFR-TIL-004 — Default de expiración

Ver REQ-TIL-003: default atado al ciclo de vida del torneo
(`registrationClosesAt`/`startsAt`) con fallback de 30 días; override
acotado entre 1 hora y 180 días.

---

### Requirements table (API contract)

| Método y path | Auth | Request | Response éxito | Errores |
|---|---|---|---|---|
| `POST /tournaments/:tournamentId/invite-links` | `requireAuth` + organizador/staff | `{ expiresAt?, maxUses? }` | 201 `{ id, token, url, deepLink, expiresAt, maxUses, usesCount: 0, revokedAt: null, createdAt }` | 404 `TORNEO_NO_ENCONTRADO`, 403 `NO_AUTORIZADO`, 422 (expiresAt/maxUses fuera de rango) |
| `GET /tournaments/:tournamentId/invite-links` | `requireAuth` + organizador/staff | — | 200 `[{ id, expiresAt, maxUses, usesCount, revokedAt, createdAt, createdByUserId, registrants: [...] }]` | 404 `TORNEO_NO_ENCONTRADO`, 403 `NO_AUTORIZADO` |
| `DELETE /tournaments/:tournamentId/invite-links/:linkId` | `requireAuth` + organizador/staff | — | 204 | 404 `ENLACE_NO_ENCONTRADO`, 403 `NO_AUTORIZADO` |
| `GET /public/tournament-invite-links/:token` | `optionalAuth` (no requerido) | — | 200 `{ tournamentId, tournamentName, sportName, categoryName, venueName, startsAt, status, acceptsRegistration }` | 400 (largo inválido), 410 `ENLACE_INVALIDO`, 409 `ENLACE_REVOCADO`, 409 `ENLACE_AGOTADO` |
| `POST /public/tournament-invite-links/:token/register` | `optionalAuth` | con sesión: `{}`; sin sesión: `{ name, phone?, email }` | 201 `{ registrationId, registrationType, tournamentId, status: 'PENDING' }` | 400 (datos de invitado inválidos / largo de token), 404 `TORNEO_NO_ENCONTRADO`, 409 `TORNEO_CERRADO`, 409 `CUPOS_AGOTADOS`, 410 `ENLACE_INVALIDO`, 409 `ENLACE_REVOCADO`, 409 `ENLACE_AGOTADO` |

---

### Edge cases

| Caso | Comportamiento esperado |
|------|--------------------------|
| Torneo pasa a `IN_PROGRESS`/estado de cierre con links activos | No se autorrevocan; cualquier intento de registro MUST responder 409 `TORNEO_CERRADO` (REQ-TIL-009). El organizador MAY revocarlos explícitamente para que la landing muestre "cerrado" en vez de fallar al enviar el formulario |
| Concurrencia en el último cupo (`maxSlots`) | MUST comportarse igual que `RegisterTournamentParticipantUseCase` hoy (conteo-y-comparación, no atómico a nivel DB); este feature NO MUST introducir una garantía más débil que la existente, pero tampoco está obligado a resolver la ventana de carrera preexistente — es una limitación conocida heredada, no una regresión |
| Reutilización de datos de invitado (`email`/`phone`) ya registrados por otro medio en el mismo torneo | NO MUST agregarse deduplicación nueva — hoy `@@unique([tournamentId, userId])` solo dedupea `AUTHENTICATED`; las filas `GUEST` nunca dedupean entre sí. Este feature no cambia ese comportamiento |
| Revocación concurrente con un registro en curso | Best-effort: una sola lectura de `revokedAt`/`expiresAt`/`usesCount` antes de escribir, igual al patrón de `guest_schedule_action.use_case.ts`. No se exige una transacción serializable adicional |
| `maxUses = 0` o negativo al crear | 422 al crear el link, no se persiste |
| Reintento idempotente de un usuario `AUTHENTICATED` que ya se registró con el mismo link | MUST devolver la inscripción existente (201 o 200, mismo criterio que `RegisterTournamentParticipantUseCase.executeSV` con `created: false`) sin incrementar `usesCount` una segunda vez |
| Token con largo fuera de `40..200` | 400 antes de cualquier consulta a base de datos |

---

### Traceability to proposal

| Criterio de alcance aprobado | Requisitos |
|---|---|
| Generación de link | REQ-TIL-001, REQ-TIL-002 |
| Expiración/uso opcional | REQ-TIL-003, REQ-TIL-004, NFR-TIL-004 |
| Revocación | REQ-TIL-005 |
| Registro autenticado y como invitado | REQ-TIL-007, REQ-TIL-008 |
| Reuso de reglas de roster/cupos existentes | REQ-TIL-009, REQ-TIL-010 |
| Listado de quién se registró por link | REQ-TIL-006 |
| Deep-link mobile + fallback web funcional | REQ-TIL-011, REQ-TIL-012 |
| Seguridad del token / límites de input | NFR-TIL-001, NFR-TIL-002, NFR-TIL-003 |

### Out of Scope (explícito)

- Modificar `TournamentInvitation` (invitación a usuario conocido) — queda intacta.
- Agregar rate-limiting transversal nuevo al proyecto (NFR-TIL-002 lo documenta como limitación aceptada, no lo implementa).
- Cambiar la deduplicación existente de inscripciones `GUEST` (sin unique por email/phone).
- Resolver la ventana de carrera preexistente de `maxSlots` más allá de lo que ya hace `RegisterTournamentParticipantUseCase`.
- Detalles exactos de configuración de Android App Links / iOS Universal Links (manifest, entitlements, elección final de paquete) — quedan para Designer/Implementer; este spec solo fija el comportamiento observable (REQ-TIL-011).
