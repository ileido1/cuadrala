# Contrato de torneos — Cuadrala API v1

Leído del código (routers, controllers, schemas Zod, casos de uso) el 2026-09-07.
Base: `/api/v1`. Todo `Content-Type: application/json`.

## Envelope

**Éxito**
```json
{ "success": true, "message": "<texto en español>", "data": <payload> }
```

**Error**
```json
{ "success": false, "code": "TORNEO_CERRADO", "message": "<texto>", "details": <opcional> }
```

`details` sólo viene poblado en `VALIDACION_FALLIDA` (400): es el `flatten()` de Zod,
con forma `{ formErrors: [], fieldErrors: { campo: ["mensaje"] } }`.

Códigos que vas a ver en estas pantallas:

| code | HTTP | Cuándo |
|---|---|---|
| `VALIDACION_FALLIDA` | 400 | Body o params malformados |
| `NO_AUTORIZADO` | 401 | Sin sesión |
| `NO_AUTORIZADO` | 403 | No sos organizador ni staff de la sede |
| `ACCESO_DENEGADO` | 403 | Idem, en carga de resultados |
| `TORNEO_RESTRINGIDO` | 403 | Invitado en torneo competitivo con costo |
| `TORNEO_NO_ENCONTRADO` | 404 | |
| `INSCRIPCION_NO_ENCONTRADA` | 404 | |
| `INVITACION_NO_ENCONTRADA` | 404 | |
| `TORNEO_CERRADO` | 409 | El torneo no está en `DRAFT` ni `OPEN` |
| `INSCRIPCION_DUPLICADA` | 409 | Ya hay invitación activa para ese usuario |
| `ESTADO_INVALIDO` | 409 | La invitación ya fue respondida |
| `FORMATO_NO_SOPORTADO` | 400 | Bracket pedido a un torneo que no es `SINGLE_ELIMINATION` |
| `PAGINACION_INVALIDA` | 400 | `page < 1`, o `limit` fuera de 1..100 |

## Estados

`TournamentStatus`: `DRAFT` · `OPEN` · `IN_PROGRESS` · `COMPLETED` · `CANCELLED`
`visibility`: `PUBLIC` · `PRIVATE`
`registration.status`: `PENDING` · `CONFIRMED` (y bajas, vía `disable`)
`registrationType`: `AUTHENTICATED` · `GUEST`
`invitation.status`: `PENDING` · `ACCEPTED` · `REJECTED` · `CANCELLED`

**Regla que gobierna casi todas las pantallas de inscripción:** el plantel está
abierto en `DRAFT` **y** `OPEN`. Desde `IN_PROGRESS` toda escritura de inscripción
responde 409 `TORNEO_CERRADO`. Vale para: inscribir, retirar, invitar, invitar
huésped, confirmar, eliminar y confirmar en lote.

---

# Objetos

## `Tournament` (listado)

```ts
{
  id: string            // uuid
  name: string
  status: TournamentStatus
  visibility: 'PUBLIC' | 'PRIVATE'
  organizerUserId: string | null
  sportId: string
  sportName: string
  categoryId: string
  categoryName: string
  startsAt: string | null     // ISO 8601
  registrationCount: number
}
```

## `TournamentDetail` (detalle) — lo anterior más:

```ts
{
  formatPresetId: string
  formatPresetName: string    // 'SINGLE_ELIMINATION' | ...
  presetSchemaVersion: number
  formatParameters: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}
```

> **Ojo para el diseño de la pregunta 1 del jugador ("¿puedo entrar?"):**
> el DTO de listado y detalle **no trae `inscriptionPrice`, `isCompetitive`,
> `venueId` ni `pairedRegistration`**. Esos cuatro campos existen en el modelo
> (los usa el dominio) pero no salen por `GET /tournaments` ni por
> `GET /tournaments/:id`. Si la tarjeta muestra precio o sede, hoy no hay de
> dónde sacarlos: hay que ampliar el DTO.

## `Registration`

```ts
{
  id: string
  tournamentId: string
  userId: string | null            // null en GUEST
  userName: string | null          // null en GUEST
  status: 'PENDING' | 'CONFIRMED'
  registrationType: 'AUTHENTICATED' | 'GUEST'
  guestName: string | null
  guestPhone: string | null
  guestEmail: string | null
  registeredByUserId: string | null  // organizador que lo dio de alta (sólo GUEST)
  partnerRegistrationId: string | null  // la otra mitad de la dupla
  createdAt: string
}
```

## `Invitation`

```ts
{
  id: string
  tournamentId: string
  invitedUserId: string
  createdByUserId: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
  createdAt: string
  updatedAt: string
}
```

---

# Jugador — las cuatro preguntas

## 1. ¿Puedo entrar?

### `GET /tournaments`
Auth: **no** requiere. Query (todo opcional salvo defaults):

```
status=DRAFT|OPEN|IN_PROGRESS|COMPLETED|CANCELLED
sportId=<uuid>   categoryId=<uuid>   venueId=<uuid>
startsAtFrom=<ISO>   startsAtTo=<ISO>    // From <= To, si no 400
page=1 (min 1)       limit=20 (1..100)
```
Schema `.strict()`: **un query param de más es 400**, no se ignora.

`200` → `data`:
```json
{ "items": [Tournament], "pageInfo": { "page": 1, "limit": 20, "total": 137 } }
```

### `GET /tournaments/venue/:venueId`
Auth: **requiere**. Query: `status`, `sportId`, `categoryId`, `page`, `limit`.
Misma forma de respuesta.

### `GET /tournaments/:tournamentId`
Auth: **no** requiere. `200` → `data`:
```json
{ "tournament": TournamentDetail, "registrations": [Registration] }
```

## 2. ¿Estoy adentro?

### `POST /tournaments/:tournamentId/registrations`
Auth: requiere. Body `.strict()`:
```json
{ "userId": "<uuid>" }
```
- `201` si se creó, `200` si ya existía y se actualizó. `data` = `Registration`.
- **Siempre entra `PENDING`.** La confirma el organizador. Diseñá el estado
  intermedio: "te anotaste, falta que te acepten".
- `409 TORNEO_CERRADO` si el torneo no está en `DRAFT`/`OPEN`.
- Al crearse dispara notificación al organizador (no al jugador).

> ⚠️ **`userId` sale del body, no de la sesión.** Cualquier autenticado puede
> inscribir a otro. Está marcado como TODO en el código y vive en el issue #50.
> Para el diseño: asumí que el usuario se inscribe a sí mismo, pero no diseñes
> encima "inscribir a un amigo" — esa puerta está abierta por accidente, no por
> decisión.

### `POST /tournaments/:tournamentId/registrations/:userId/withdraw`
Auth: requiere. Sin body. `204` sin contenido.
`409 TORNEO_CERRADO` fuera de `DRAFT`/`OPEN`. Mismo problema de autoría que el alta.

### Invitaciones que le llegan al jugador

`POST /tournaments/:tournamentId/invitations/:invitationId/respond`
Auth: requiere. Body `.strict()`:
```json
{ "action": "ACCEPT" }   // o "REJECT"
```
- Sólo el invitado puede responder → si no, `403 NO_AUTORIZADO`.
- Ya respondida → `409 ESTADO_INVALIDO` ("Esta invitación ya fue respondida").
- `ACCEPT` además crea la inscripción.
- `200` → `data` = `Invitation`.

## 3. ¿Cuándo y dónde juego?

### `GET /tournaments/:tournamentId/schedule/my-matches`
**Documentada en OpenAPI.** Auth: requiere. Devuelve sólo los partidos del jugador
que consulta — está hecha exactamente para esta pregunta, no le pases el cuadro entero.

### `GET /tournaments/:tournamentId/schedule`
**Documentada.** Auth: **no** requiere (es pública). `200` → `data` con el calendario
ya armado (`rounds`).

### `POST /tournaments/:id/schedule/rounds/:roundNumber/matches/:matchNumber/respond`
**Documentada.** El jugador acepta o rechaza el horario propuesto. El guard
"sólo quien juega ese partido" vive en el caso de uso.

## 4. ¿Cómo voy?

### `GET /tournaments/:tournamentId/scoreboard` — **documentada.**

### `GET /tournaments/:tournamentId/bracket`
Auth: requiere. `200` → `data`:
```json
{
  "tournamentId": "...", "tournamentName": "...",
  "totalRounds": 3, "bracketSize": 8,
  "rounds": [{
    "roundNumber": 1, "name": "Cuartos de final",
    "matches": [{
      "matchNumber": 1, "roundNumber": 1,
      "playerA": PlayerBracketSlot, "playerB": PlayerBracketSlot,
      "winnerId": "<uuid>|null",
      "score": [{ "userId": "...", "points": 6 }] ,
      "status": "PENDING|IN_PROGRESS|COMPLETED|BYE",
      "matchId": "<uuid>|null"
    }]
  }]
}
```
Dos estados vacíos que tenés que dibujar:
- `400 FORMATO_NO_SOPORTADO` — el torneo no es `SINGLE_ELIMINATION`.
- `400 VALIDACION_FALLIDA` — menos de 2 confirmados.
Y ojo: **los GUEST no entran al bracket**, sólo los autenticados.

---

# Organizador — las tres preguntas

## 1. Quién se anotó, y aceptarlo de un toque

### `GET /tournaments/:tournamentId/registrations`
Auth: requiere. **Sin guard de organizador.** `200` → `data`:
```json
{ "items": [Registration], "total": 12 }
```

> ⚠️ La respuesta incluye `guestPhone` y `guestEmail` de los invitados, y hoy
> la ve cualquier autenticado. Es PII. Si la pantalla del jugador consume esta
> misma ruta, el teléfono del vecino viaja igual aunque no lo pintes.

### `PATCH /tournaments/:tournamentId/registrations/:registrationId`
Auth + **organizador o staff de la sede** (403 `NO_AUTORIZADO`). Body `.strict()`:
```json
{ "status": "CONFIRMED" }
```
`CONFIRMED` es el **único valor aceptado** — no hay "rechazar" por esta vía.
En torneos de duplas fijas **mueve también al compañero**. `200` → `Registration`.

### `POST /tournaments/:tournamentId/registrations/confirm-pending` — **documentada.**
Auth + organizador. Sin body. `200` → `data`: `{ "confirmed": 7 }`.
Confirma todos los `PENDING` de una. Con 16 inscriptos, esto es un botón contra
dieciséis toques — y contra el error silencioso de saltearse a uno.

### `DELETE /tournaments/:tournamentId/registrations/:registrationId`
Auth + organizador. `204`. Borra en cascada.

### `POST /tournaments/:tournamentId/invite-guest`
Auth + organizador. Body `.strict()`:
```json
{ "name": "Juan Pérez", "phone": "+584121234567", "email": "j@x.com" }
```
`name` requerido (1..100). `phone` opcional, E.164 `^\+?\d{8,15}$`. `email` opcional.
`201` → `Registration` con `registrationType: "GUEST"`, `status: "PENDING"`.
`403 TORNEO_RESTRINGIDO` si el torneo es competitivo **y** tiene costo de inscripción.

### Invitaciones a usuarios con cuenta
- `POST /tournaments/:id/invitations` — body `{ "userId": "<uuid>" }`. `201` → `Invitation`.
  `409 INSCRIPCION_DUPLICADA` si ya hay una `PENDING` o `ACCEPTED`.
- `GET /tournaments/:id/invitations` — `200` → `data` = **array plano** de `Invitation`
  (sin `items`/`total`, a diferencia de inscripciones).
- `DELETE /tournaments/:id/invitations/:invitationId` — `204`.

### Duplas (padel)
- `POST /tournaments/:id/registrations/pairs` — **documentada.** Body:
  `{ "firstRegistrationId": "<uuid>", "secondRegistrationId": "<uuid>" }`. `200`.
- `DELETE /tournaments/:id/registrations/:registrationId/pair` — **documentada.** `200`.

> En el MVP las duplas las arma **sólo el organizador**. El jugador se inscribe
> solo. No diseñes "invitá a tu compañero".

## 2. El cuadro armado sin pelearse con él

- `POST /tournaments/:id/schedule:generate` — **documentada.** Genera el calendario.
  Dos ojos acá: los dos puntos son literales en la URL, y conviene llamar antes a
  `confirm-pending` — el calendario se arma **sólo con los `CONFIRMED`**.
- `POST /.../rounds/:r/matches/:m/settle` — **documentada.** El organizador cierra
  el turno de un partido.
- `POST /.../rounds/:r/matches/:m/reschedule` — **documentada.** Mover un partido:
  es la salida cuando un jugador rechaza el horario o el turno vence.

### `POST /tournaments/:tournamentId/matches/:matchId/results`
Auth + organizador (403 `ACCESO_DENEGADO`). Body `.strict()`:
```json
{ "scores": [ { "userId": "<uuid>", "points": 6 }, { "userId": "<uuid>", "points": 4 } ] }
```
`points`: entero ≥ 0. Al menos un score. `201` → `data`:
```json
{ "resultId": "<uuid>", "recordedAt": "2026-09-07T18:00:00.000Z" }
```

## 3. "Listo, avisale a todos"

No hay un endpoint de "avisar". Las notificaciones salen **solas** como efecto de
las acciones: inscripción nueva avisa al organizador; confirmación (individual o en
lote) avisa al jugador. Para el diseño esto significa que el botón es
"Confirmar inscriptos", no "Enviar aviso" — el aviso es consecuencia, no acción.

### Publicar el torneo
- `PATCH /tournaments/:tournamentId/status` — body `{ "status": "OPEN" }` (enum de 5).
- `PATCH /tournaments/:tournamentId/visibility` — body `{ "visibility": "PUBLIC" }`.

Son **dos ejes distintos**, a propósito: se separaron en el issue #51 justamente
porque `DRAFT` hacía dos trabajos. Publicar (`visibility`) **no** cierra la
inscripción. En la UI no los mezcles en un solo switch.

---

# Lo que NO existe todavía

Si el diseño lo necesita, es trabajo nuevo de API, no una ruta que falta encontrar:

1. **Precio y sede en la tarjeta del torneo.** El DTO de listado/detalle no los trae.
   Es la pregunta 1 del jugador y hoy no se puede responder completa.
2. **Rechazar una inscripción.** `PATCH` sólo acepta `CONFIRMED`. Rechazar es `DELETE`,
   y eso borra en vez de dejar rastro.
3. **"Mis torneos" del jugador.** No hay un `GET /me/tournaments`; habría que filtrar
   el listado del lado del cliente.
4. **Bracket para formatos que no sean `SINGLE_ELIMINATION`.** Devuelve 400.

# Estado de documentación

12 rutas de torneo están en el OpenAPI con schema (todo lo de `schedule`, `scoreboard`,
`pairs`, `confirm-pending`, `chat` y `POST /tournaments`). Las 17 restantes —las de
inscripción, invitaciones, bracket, listado y estado— están en
`services/api/src/test/unit/openapi_route_coverage.debt.ts`. Este documento es la
fuente de verdad de esas 17 hasta que se documenten.
