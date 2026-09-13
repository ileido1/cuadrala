# Changelog

Todos los cambios notables de la API se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el versionado sigue [SemVer](https://semver.org/lang/es/).

## [1.12.0] - 2026-09-13

### Agregado

- **`GET /tournaments/:tournamentId/bracket` refleja el estado real una vez
  que existe calendario**: cada partido cuyo `Match` ya está materializado
  ahora devuelve su `matchId`, `status` (`PENDING`/`IN_PROGRESS`/`COMPLETED`,
  mapeado desde `Match.status`), `score` real y `winnerId` (mismo criterio de
  suma por lado que S7b/S7c, vía `resolveMatchWinningUserIdsSV`), en vez de
  `winnerId: null` fijo. Los slots sin `Match` materializado (incluidos los
  byes, que nunca crean uno) siguen en preview, sin cambios. Reutiliza
  `listTournamentMatchStatesSV` (S6b) — ninguna consulta nueva a la base.

## [1.11.0] - 2026-09-13

### Cambiado

- **Los huéspedes quedan fuera del cuadro de eliminación simple**: al
  generar el calendario (`POST /tournaments/:tournamentId/schedule:generate`),
  las inscripciones `GUEST` (`userId` nulo) ahora se excluyen antes de armar
  el cuadro de `SINGLE_ELIMINATION`. Round robin y americano no cambian, los
  huéspedes se siguen incluyendo. En torneos de duplas fijas, si el filtro
  deja a un inscripto sin su compañero, se dispara el mismo
  `DUPLAS_INCOMPLETAS` que ya existía para cualquier pareja incompleta — no
  se agregó un error nuevo para este caso.

## [1.10.1] - 2026-09-13

### Corregido

- **`getVenueIdForTournamentSV` podía resolver la sede de un partido sin
  cancha asignada**: el guard de acceso de
  `POST /tournaments/:tournamentId/matches/:matchId/results` buscaba
  cualquier `Match` del torneo (`findFirst` sin filtrar por `courtId`) para
  obtener su sede. Los partidos de ronda siguiente creados por el avance
  automático de eliminación simple (S7c-1) no tienen cancha asignada hasta
  que se programan, así que si `findFirst` elegía uno de ellos la sede
  salía `null` y el guard devolvía 400 en vez de la validación real (por
  ejemplo, el 409 de resultado duplicado). Ahora el filtro exige
  `courtId: { not: null }`.

## [1.10.0] - 2026-09-13

### Agregado

- **Avance automático de eliminación simple al cargar un resultado**
  (`POST /tournaments/:tournamentId/matches/:matchId/results`): un ganador
  claro (por suma de puntos por lado, singles o duplas) crea o completa el
  partido de la ronda siguiente — incluido el de 3er puesto — en la misma
  transacción que el resultado, vía el nuevo puerto
  `registerResultAndAdvanceSV` (reemplaza a `registerResultSV`). La
  transacción toma un lock a nivel de torneo (`SELECT ... FOR UPDATE` sobre
  `Tournament`) para que dos semifinales resueltas a la vez nunca creen dos
  finales, y es idempotente: reintentar no duplica partidos ya
  materializados. Round robin y americano no avanzan.

## [1.9.3] - 2026-09-13

### Agregado

- **`resolveSingleEliminationAdvancementParticipantsSV`** (dominio puro,
  `single_elimination/single_elimination_progress.ts`): expande la ref
  opaca de un lado ya resuelto (`playerARef`/`playerBRef` de
  `resolveSingleEliminationProgressSV`, un `TournamentRegistration.id`) en
  sus `MatchParticipant` a materializar, agregando la pareja fija cuando
  corresponde (mismo criterio que la materialización inicial del cuadro).
  Sin efectos secundarios; todavía no está conectado a ningún caso de uso.

## [1.9.2] - 2026-09-13

### Corregido

- **`POST /tournaments/:tournamentId/matches/:matchId/results` rechaza un
  empate en torneos `SINGLE_ELIMINATION`** con 400 `VALIDACION_FALLIDA`, sin
  escribir nada. El ganador (y el empate) se determinan sumando puntos por
  lado (`MatchParticipant.teamLabel ?? userId`) vía el nuevo puerto
  `listMatchParticipantSidesSV` y la función ya existente
  `resolveMatchWinningUserIdsSV` — nunca comparando filas individuales de
  puntaje, lo que en duplas daba el ganador equivocado (ej. lado A=[10,9]
  suma 19 vs lado B=[15,2] suma 17: la fila más alta es de B, pero A gana
  por suma). Round robin y americano siguen aceptando empates sin avance.

## [1.9.1] - 2026-09-13

### Agregado

- **Nuevo dominio puro `resolveSingleEliminationProgressSV`** (sin efectos de
  lado, sin DB) para el avance de un cuadro de eliminación simple: el
  partido `m` de la ronda `r+1` se completa con los ganadores registrados de
  los partidos `2m-1` y `2m` de la ronda `r`; un bye de primera ronda avanza
  al único jugador sin resultado registrado; y el partido por el 3er puesto
  (cuando existe) se completa con los perdedores de las dos semifinales, no
  con sus ganadores. `winnerRef`/`loserRef` son identificadores opacos de
  lado (nunca se inspeccionan), para no asumir singles y perder un lado de
  duplas. Todavía no está conectado a ningún caso de uso ni endpoint: es la
  base para el avance automático que se conecta en el siguiente slice.

## [1.9.0] - 2026-09-13

### Agregado

- **`GET /tournaments/:tournamentId/schedule` ahora expone el estado real de
  cada partido del "Partidos de hoy" del organizador.** Cada partido en
  `data.rounds[].matches` gana `matchId` y `matchStatus` (`null` cuando el
  partido aún no fue materializado), `decision` (`PENDING`/`ACCEPTED`/
  `REJECTED`, según las respuestas de los jugadores al turno propuesto) con
  `rejectedByName` cuando fue rechazado, `sides` (participantes agrupados por
  `MatchParticipant.teamLabel ?? userId`, dos jugadores por lado en duplas) y
  `scores` (los puntajes cargados, vacío sin resultado). El nuevo puerto
  `listTournamentMatchStatesSV` resuelve cada Match materializado por su
  `formatParameters.{scheduleKey,roundNumber,matchNumber}` con una sola
  consulta por calendario, nunca una por partido.

## [1.8.2] - 2026-09-13

### Corregido

- **El chequeo de resultado duplicado (1.8.1) no era seguro bajo concurrencia
  real.** Dos requests simultáneas para el mismo partido podían pasar ambas el
  chequeo `matchHasResultSV` antes de que cualquiera escribiera, creando dos
  `MatchResult`. `registerResultSV` ahora toma un lock de fila
  (`SELECT ... FOR UPDATE` sobre `Match`) y repite el chequeo de existencia
  dentro de la misma transacción antes de crear el resultado; la segunda
  request en llegar ve el resultado ya creado por la primera y responde 409
  `RESULTADO_YA_CARGADO` sin escribir. Cubierto por una integración que dispara
  dos requests estrictamente simultáneas y verifica exactamente un 201 y un
  409, con un único `MatchResult` en la base.

## [1.8.1] - 2026-09-12

### Corregido

- **`POST /tournaments/:tournamentId/matches/:matchId/results` rechazaba al
  organizador del torneo.** El guard solo aceptaba staff de la sede
  (`isUserStaffOfVenueSV`); el organizador del torneo recibía 403
  `ACCESO_DENEGADO` al intentar cargar un resultado de su propio torneo. Ahora
  reutiliza `AssertTournamentOrganizerAccessUseCase.executeSV` (organizador O
  staff de sede), la misma regla ya compartida por
  `list_tournament_registrations.use_case.ts`.
- **Bug preexistente descubierto en esta slice**: la ruta nunca funcionó por
  HTTP para nadie. Express fusiona `tournamentId` y `matchId` en un mismo
  `_req.params`, pero el controller los validaba con dos schemas Zod
  `.strict()` separados — cada uno rechazaba la clave del otro como "no
  reconocida", devolviendo siempre 400 `VALIDACION_FALLIDA`. Se reemplazó por
  un único schema combinado (`TOURNAMENT_MATCH_RESULT_PARAMS_SCHEMA`).
- **Cargar el mismo resultado dos veces duplicaba el marcador.** El endpoint no
  verificaba si el partido ya tenía un `MatchResult`; ahora responde 409
  `RESULTADO_YA_CARGADO` y no escribe nada cuando ya existe uno. El chequeo es
  a nivel de aplicación (no atómico bajo concurrencia real): la garantía
  transaccional completa (`SELECT ... FOR UPDATE`) queda para
  `registerResultAndAdvanceSV` en S7c-1.

## [1.8.0] - 2026-09-12

### Agregado

- **`GET /tournaments/:tournamentId/schedule/my-matches` ahora devuelve
  `roundName`.** Para torneos de eliminación simple es el nombre cualitativo
  de la ronda ("Cuartos de final", "Semifinal", "Final", "Tercer puesto"),
  calculado con la misma lógica de `bracket_generator.ts` (ahora exportada
  como `resolveSingleEliminationRoundNameSV`, reutilizable). Para cualquier
  otro formato es `null`; el cliente sigue teniendo `roundNumber` para caer a
  "Ronda {n}".
- **`GET /tournaments/:tournamentId/scoreboard` ahora devuelve `gamesWon`
  por fila.** Suma 1 por partido donde el lado del jugador ganó por puntos
  estrictamente más altos que cualquier otro lado. En duplas el lado se
  agrupa por `MatchParticipant.teamLabel` y se compara la **suma** de puntos
  del lado, nunca la fila individual más alta — comparar filas individuales
  daría el ganador equivocado (ej.: lado A=[15,15]=30 vs lado B=[20,10]=30 es
  empate, aunque B tenga la fila más alta). Un empate entre lados no suma
  `gamesWon` a nadie, pero `gamesPlayed` sigue contando ese partido para
  todos los participantes. Nueva función de dominio pura y reutilizable
  `resolveMatchWinningUserIdsSV` (`domain/tournament/match_side_aggregation.ts`).

## [1.7.1] - 2026-09-12

### Seguridad

- **`GET /tournaments/:id/registrations` ya no expone el contacto de invitados
  a cualquier autenticado.** Cualquiera con sesión podía ver `guestPhone` y
  `guestEmail` de los invitados sin cuenta de un torneo ajeno; el controller
  pasaba el resultado del caso de uso sin filtrar. Ahora, quien no organiza el
  torneo (ni es staff de su sede) recibe esos dos campos en `null`; `status` y
  `guestName` no cambian. El organizador y el staff de la sede siguen viendo
  el contacto completo. La regla de autoridad reutiliza
  `AssertTournamentOrganizerAccessUseCase.hasAccessSV()`, el mismo chequeo que
  usan las demás acciones de organizador sobre inscripciones.

  Auditado: ningún cliente de mobile o web renderiza hoy `guestPhone` ni
  `guestEmail` (el DTO de mobile los parsea pero ninguna pantalla los lee), así
  que el cambio no rompe consumidores existentes.

## [1.7.0] - 2026-09-12

### Agregado

- **`GET /api/v1/users/me/tournaments`.** Devuelve los torneos del usuario
  actual: en los que está inscripto (`registrationStatus`: `PENDING` o
  `CONFIRMED`), tiene una invitación pendiente (`pendingInvitationId`), o que
  organiza (`isOrganizer`). `pendingRegistrationsCount` solo tiene valor
  cuando el usuario organiza el torneo; para cualquier otro rol es `null`.
  Requiere autenticación (401 sin sesión). Montado en el router de perfil,
  no en `/tournaments`, para no colisionar con `/tournaments/:tournamentId`.

## [1.6.0] - 2026-09-12

### Agregado

- **`organizerName` en torneos e `invitedUserName` en invitaciones.**
  `GET /tournaments` y `GET /tournaments/:id` devuelven `organizerName`
  (string|null) con el nombre del organizador; `null` cuando el torneo no
  tiene uno asignado. Las invitaciones (`GET /tournaments/:id/invitations`)
  devuelven `invitedUserName` (string|null) con el nombre del invitado. No
  hay cambio de schema: ambos se resuelven vía join.

## [1.5.0] - 2026-09-12

### Agregado

- **`Tournament.gender` es opcional.** `POST /tournaments` acepta un `gender`
  ("MALE"/"FEMALE"/"MIXED", reusa `MatchGender`) opcional; los torneos
  existentes y los clientes legacy que no lo mandan quedan en `null`, sin
  backfill. Un valor inválido responde `400 VALIDACION_FALLIDA` con un mensaje
  en español. El campo se devuelve en el detalle (`GET /tournaments/:id`) y en
  cada item del listado (`GET /tournaments`).

## [1.4.0] - 2026-09-11

### Agregado

- **`GET /tournaments` filtra por cercanía.** Acepta `near` ("lat,lng") y
  `radiusKm` (default 10, máximo 200) y devuelve `distanceKm` en cada item
  cuando `near` está presente; sin `near` ningún item lo incluye. El filtro
  mira la sede del torneo (`venue.latitude/longitude`): un torneo sin sede no
  puede matchear "cerca" y queda afuera.

  Usa el mismo enfoque que `GET /venues` (bounding box en la consulta,
  haversine exacto en memoria para filtrar y ordenar por distancia real).

## [1.3.1] - 2026-09-11

### Corregido

- **Los presets v1 vuelven a aceptar sus `formatParameters`.** `POST
  /tournaments` respondía `400 VALIDACION_FALLIDA` a cualquier parámetro
  —por ejemplo `{ "doubleRound": true }`— enviado contra un preset
  `AMERICANO`, `ROUND_ROBIN` o `SINGLE_ELIMINATION` v1 creado antes de que
  existiera la columna `parametersSchema`.

  El validador ahora solo lee el `parametersSchema` del preset. La migración
  que agregó la columna la dejó en `NULL` y el seed no toca los presets v1 que
  ya existen, así que en esos presets toda key contaba como extra. La app
  móvil, que arma el formulario desde ese schema, tampoco mostraba los
  parámetros.

  La migración `20260911120000_backfill_v1_preset_parameters_schema` completa
  el schema de esos presets (solo `schemaVersion = 1` y todavía en `NULL`) con
  los mismos valores que declara el seed. Los presets que ya tienen schema,
  como Tenis `ROUND_ROBIN` v2, no cambian.

## [1.3.0] - 2026-09-07

### Agregado

- **El torneo lleva sede, precio, cupos y cierre de inscripción.** `POST
  /tournaments` acepta ahora `venueId`, `inscriptionPrice`, `maxSlots` y
  `registrationClosesAt`, y los cuatro se devuelven en `GET /tournaments` y
  `GET /tournaments/:id` junto con `venueName`.

  Antes no había forma de crear un torneo con sede ni con precio: las columnas
  `venueId` e `inscriptionPrice` existían en el modelo pero ni la ruta de alta
  las aceptaba ni el DTO de lectura las exponía. La pantalla que le responde al
  jugador "¿puedo entrar?" —nivel, precio, cuándo y dónde— no tenía con qué
  responderse.

  `maxSlots` y `registrationClosesAt` son columnas nuevas (migración
  `20260907220000_tournament_slots_and_registration_deadline`). Las cuatro son
  opcionales y los torneos ya creados siguen siendo válidos: `null` significa
  "el organizador no lo declaró", que no es lo mismo que `0`.

  `registrationClosesAt` es informativo para el cliente: la ventana real de
  inscripción la sigue gobernando `status` (`DRAFT`/`OPEN`). Se rechaza con
  `400 VALIDACION_FALLIDA` si cae después de `startsAt`.

  El OpenAPI de `POST /tournaments` documenta los cuatro campos nuevos y además
  `visibility`, que se aceptaba desde antes sin estar documentado.

## [1.2.1] - 2026-09-04

### Seguridad

- **`GET /users/search/by-document` exige autenticación.** Estaba registrado sin
  guard y respondía a peticiones anónimas contra producción, devolviendo `id`,
  `name`, `email` y `documentNumber` de quien coincidiera. Cualquiera podía
  consultar datos personales por número de documento. Cierra
  [#48](https://github.com/ileido1/cuadrala/issues/48).

  El payload no cambia: el único consumidor es `ReservationModal` del backoffice
  web, que ya viaja autenticado.

  Con `requireAuth` cualquier usuario autenticado puede seguir consultando.
  Restringirlo a `VenueStaff` quedó anotado como seguimiento en el issue: hoy el
  endpoint no recibe contexto de sede, así que necesita una decisión de producto.

## [1.2.0] - 2026-09-04

### Agregado

- **Worker de tasas de cambio.** Las tasas se refrescan solas desde
  [dolarapi](https://ve.dolarapi.com/v1/cotizaciones): un tick al arrancar la
  API y después cada 6 h (dolarapi publica una cotización por día). Usa el mismo
  lock distribuido que los otros workers, así que con varias instancias solo una
  refresca. Un tick fallido se registra y el worker sigue vivo: si se cayera, las
  tasas quedarían congeladas hasta el próximo deploy, que es justo el bug que
  vino a arreglar.
- Variables nuevas, todas con default útil: `EXCHANGE_RATES_WORKER_ENABLED`
  (`true`), `EXCHANGE_RATES_WORKER_INTERVAL_MS` (6 h),
  `EXCHANGE_RATES_WORKER_TICK_TIMEOUT_MS` (30 s) y
  `EXCHANGE_RATES_WORKER_COUNTRY_CODE` (`VE`).

### Corregido

- **Las tasas estaban congeladas en valores inventados.** El `POST
  /countries/:code/exchange-rates/refresh` existía, pero detrás de `requireAuth`
  y sin nadie que lo llamara. La base quedaba con lo que dejó el seed: USD a 50
  BS cuando el real ronda los 805, o sea todo precio convertido salía ~16 veces
  más barato.
- **El seed mentía sobre el origen de sus tasas.** Escribía `source:
  'dolarapi.com'` sobre cifras de relleno, así que desde afuera no había manera
  de distinguir una tasa real de una inventada. Ahora dice `source: 'seed'`.

## [1.1.0] - 2026-09-04

### Agregado

- **`GET /venues/:venueId/availability` marca los horarios ya pasados** con el
  motivo nuevo `PAST`. Antes el servidor los devolvía como disponibles y cada
  cliente decidía por su cuenta si ya habían pasado — usando el reloj del
  dispositivo, que solo acierta cuando el usuario está en el mismo huso que la
  cancha. Ahora lo decide el servidor, que es el único que conoce la zona
  horaria de la sede.
- `VenueRepository.getVenueTimezoneSV()`: expone la IANA tz de
  `venueMonetizationSettings`, con fallback a `America/Caracas`.
- `venueWallClockNowSV()`: traduce un instante a la hora de pared de la sede
  bajo la convención wall-clock-as-UTC. Ante una zona inválida cae en la de por
  defecto en vez de lanzar.
- El seed crea la fila `VenueMonetizationSettings` de cada sede. Sin esa fila el
  `timezone` viajaba como `null`: el default del schema no aplica cuando la fila
  no existe.

### Cambiado

- `GetCourtAvailabilityUseCase` recibe el reloj por constructor (con default al
  reloj real). Los tests que usaban fechas fijas ya no dependen de la fecha en
  que se ejecutan.
