# Backlog de producto — Cuádrala

**Versión:** 1.0  
**Última actualización:** alineado con visión multi-deporte (alcance inicial: pádel en Venezuela / Caracas).

---

## 0. Principios de alcance

| Principio | Descripción |
|-----------|-------------|
| **Multi-deporte (genérico)** | El modelo de producto y de datos debe permitir **cualquier deporte** (fútbol, pickleball, tenis, etc.) mediante **deporte** como dimensión configurable, no hardcodear solo pádel. |
| **Alcance inicial: pádel** | Reglas de puntuación, textos de onboarding, íconos y copy pueden estar orientados a pádel; la **API y el dominio** evitan nombres exclusivos de “americano” donde deba existir un concepto genérico (p. ej. “formato de torneo”). |
| **Torneos parametrizables** | Un torneo **no** se limita al formato “Americano”. Debe soportar **parámetros configurables**: formato (round robin, eliminación, suizo, americano, personalizado), número de participantes, categorías, ventanas de tiempo, etc. El “Americano” es **un preset** dentro del catálogo de formatos, no el único tipo. |
| **TDD / Orchestrator** | Cada épica se aborda en el flujo: Explorer → Proposer → Spec Writer → Designer → Task Planner → **Tester (Red)** → Implementer (Green) → Verifier. Las historias están ordenadas por **dependencias** dentro de cada épica. |

**Backlog Mobile (Flutter)**: las historias de la app están en `docs/BACKLOG_MOBILE.md` y la planificación de sprints en `docs/MOBILE_SPRINTS.md`.

---

## 1. Mapa de épicas y orden recomendado (TDD)

Orden global sugerido: **E0 → E1 → E2 → E3 → E4 → E5 → E6 → E7**. Dentro de cada épica, seguir el orden de las historias (IDs).

| Orden | Épica | Objetivo | Estado (según historias) |
|-------|-------|----------|--------------------------|
| E0 | Cimientos multi-deporte y torneo parametrizable | Deportes, presets de formato, torneo genérico | **In Progress (avanzado backend)** (**US-E0-01 Done backend**; **US-E0-02 Parcial**; **US-E0-03 Done backend**) |
| E1 | Identidad, auth y perfil competitivo | Cuenta, perfil, nivel/categoría, (futuro Elo) | **In Progress (avanzado backend)** (**US-E1-01 Done backend**; US-E1-02 Done backend; US-E1-03 Parcial) |
| E2 | Partidos, descubrimiento y unión validada | Listados, filtros, join con reglas de nivel | **In Progress (avanzado backend)** (US-E2-01 Parcial; US-E2-02 Done; US-E2-03 Done + join atómico; **US-E2-04 Done backend**) |
| E3 | Motor de torneos y formatos | Rotaciones, rondas, tablero (según formato) | **In Progress (avanzado backend)** (US-E3-01 Parcial; US-E3-02 Done; US-E3-03 Done; **US-E3-04 Parcial**) |
| E4 | Sedes y geo | Directorio, mapa, horas vacantes | **In Progress (avanzado backend)** (US-E4-01 Parcial backend; US-E4-02 Parcial backend; **US-E4-03 Done backend**; **US-E4-04 Done backend (índices)**) |
| E5 | Ranking y resultados | Resultados → recálculo (puntos / Elo) | **In Progress (avanzado backend)** (**US-E5-01 Done backend**; **US-E5-02 Done backend**; US-E5-03 Parcial backend) |
| E6 | Cobro colaborativo | Obligaciones, comprobantes, sin custodia | **Done (MVP backend)** (US-E6-01/02 Cumplida; **US-E6-03 Done backend**) |
| E7 | Coordinación | Chat, notificaciones | **In Progress (avanzado backend)** (**US-E7-01 Done backend MVP**; **US-E7-02 Parcial backend (avanzado)**; **US-E7-03 Done backend (preferencias por tipo)**) |

---

## 2. Épica E0 — Plataforma genérica: deporte y torneos parametrizables

### US-E0-01 — Modelo de deporte configurable

**Como** product owner  
**Quiero** que el sistema distinga **deporte** (p. ej. `PADEL`, `PICKLEBALL`) sin acoplar la lógica solo a pádel  
**Para** reutilizar la app en otros deportes más adelante.

**Criterios de aceptación**

1. Dado un despliegue, cuando consulto catálogo de deportes, entonces recibo al menos el deporte configurado para el alcance actual (pádel).
2. Dado un partido o torneo, cuando persiste en BD, entonces tiene `sportId` o equivalente (no asumir siempre pádel en código de dominio).
3. Dado el cliente móvil, cuando muestra textos específicos de pádel, entonces provienen de configuración/copy por deporte, no de strings fijos en núcleo de negocio (salvo MVP donde se documente deuda técnica).

**Estado:** **Done (backend):** modelos `Sport`, `TournamentFormatPreset`, `sportId` en `Match`/`Tournament`; `GET /sports`, `GET /sports/:id/tournament-format-presets`, `POST /tournaments`; seed multi‑sport (ej. PADEL/TENNIS/PICKLEBALL) + presets por deporte. Tests de integración DB (`s31_*`) validan catálogo multi‑sport y que no se mezclan presets por `sportId`.

Pendiente: UI/copy por deporte (frontend) y reglas específicas por deporte si se requieren.

**Verificación TDD:** tests de contrato + integración sobre creación de entidad con `sport`.

---

### US-E0-02 — Formatos de torneo parametrizables (no solo Americano)

**Como** organizador  
**Quiero** crear un torneo eligiendo **formato y parámetros** (ej. americano, round robin, eliminación simple, suizo)  
**Para** no estar limitado a un solo tipo de evento.

**Criterios de aceptación**

1. Dado un formulario de creación de torneo, cuando selecciono un **preset de formato**, entonces el sistema persiste `tournamentFormat` + `formatParameters` (JSON validado o columnas tipadas).
2. Dado el preset “Americano”, cuando creo el torneo, entonces es equivalente funcional al caso de uso histórico “americano” pero modelado como **instancia** de formato, no como único enum global.
3. Dado un formato no soportado aún, cuando intento activarlo, entonces recibo error claro o el formato queda en estado “próximamente” según política de producto.

**Estado:** **Parcial (backend, avanzado):** torneos parametrizables vía API (`POST /tournaments`) con `formatPresetId|formatPresetCode` + `formatParameters` y **validación fuerte por preset** (schema por formato/version; rechaza keys extra y tipos inválidos). Tests de contrato + integración DB (`s32_*`).

Pendiente: ampliar formatos (eliminación, suizo, etc.), y que el motor soporte más formatos (épica E3).

**Verificación TDD:** tests de dominio para validación de parámetros por formato; migraciones compatibles hacia atrás.

---

### US-E0-03 — Presets de formato versionados

**Como** sistema  
**Quiero** **versionar** reglas de formato (puntos por partido, tamaño de grupo, etc.)  
**Para** poder cambiar reglas sin romper torneos en curso.

**Criterios de aceptación**

1. Dado un torneo en curso, cuando se publica nueva versión de un preset, entonces el torneo sigue usando la versión con la que fue creado.
2. Dado un torneo nuevo, cuando uso el preset, entonces referencia la versión vigente al momento de creación.

**Estado:** **Done (backend):** presets por `sportId+code` con **versionado**, `isActive` + `effectiveFrom` y relación `supersedes`; publish de nuevas versiones y resolución de “vigente” al crear torneo por `formatPresetCode`. Tests de integración DB (`e0_03_*`, `e8_*`) validan que torneos existentes quedan pegados a su `formatPresetId`.

---

## 3. Épica E1 — Identidad, auth y perfil (ADN del jugador)

### US-E1-01 — Registro e inicio de sesión

**Como** usuario  
**Quiero** registrarme e iniciar sesión de forma segura  
**Para** usar la app con mi identidad.

**Criterios:** tokens de acceso/refresh; cierre de sesión; mensajes en español.

**Estado:** **Done (backend):** endpoints `register/login/refresh/logout` con **refresh rotation** persistida (`RefreshToken`) + invalidación al logout. Tests de integración DB (`s25_*`) cubren: refresh rota y el token viejo ya no sirve; logout revoca; errores consistentes.

---

### US-E1-02 — Perfil técnico (Drive / Revés) y datos de juego

**Como** jugador  
**Quiero** indicar lado de cancha preferido y datos relevantes  
**Para** mejorar emparejes en pádel.

**Criterios:** campos opcionales/obligatorios según deporte; visibles en ficha de partido.

**Estado:** **Done (backend):** `PlayerProfile` (lateralidad y preferencia de lado + año de nacimiento) con `GET/PATCH /api/v1/users/me/profile` + `GET /api/v1/users/:userId/stats`, OpenAPI y tests (contrato + integración condicional).

---

### US-E1-03 — Categoría / nivel / suscripción FREE-PRO

**Como** jugador  
**Quiero** nivel o categoría y beneficios PRO cuando aplique  
**Para** matchmaking y monetización.

**Criterios:** alineado con `subscriptionType` y reglas de visibilidad.

**Estado:** Parcial (suscripción en API; falta producto completo y reglas PRO en app).

---

## 4. Épica E2 — Partidos, descubrimiento, unión

### US-E2-01 — Crear partido o sesión con deporte, sede, horario, cupo y precio

**Como** organizador  
**Quiero** publicar una partida con datos logísticos y económicos  
**Para** llenar cupos.

**Criterios:** CRUD; estados; `sport` explícito; precio opcional por persona.

**Estado:** **Parcial — backend (muy avanzado):** CRUD base + lifecycle (`/leave`, `/start`, `/finish`) + **precio por jugador** (`pricePerPlayerCents`) y filtros por precio/geo en `/matches/open` + **owner `organizerUserId`** (permisos para update/cancel/start/finish) + **join atómico** (no excede `maxParticipants` bajo concurrencia) + **cancelación permitida en `IN_PROGRESS`** (solo organizer, con cleanup de drafts).

Pendiente: reglas de pricing/cobro conectadas a E6 (automatización), “horas vacantes” (E4-03) y hardening adicional (observabilidad/worker separado).

---

### US-E2-02 — Listar partidas con cupos vacíos (filtros)

**Como** jugador  
**Quiero** ver partidas abiertas filtrando sede, precio, horario, nivel, **deporte**  
**Para** encontrar juego sin depender de WhatsApp.

**Criterios:** paginación; índices; respuesta estable en OpenAPI.

**Estado:** **Done (backend):** `GET /api/v1/matches/open` con filtros + paginación + **near/radiusKm** + **min/max pricePerPlayerCents**, OpenAPI y tests (contrato + integración condicional).

---

### US-E2-03 — Unirse con validación de nivel vs partido

**Como** jugador  
**Quiero** unirme solo si mi nivel/categoría es compatible  
**Para** partidas equilibradas.

**Criterios:** rechazo con código de negocio; organizador puede override según política.

**Estado:** **Done (backend):** `POST /api/v1/matches/:matchId/join` con validación de categoría + cupo; respuestas con códigos estables.

---

### US-E2-04 — Matchmaking inteligente (sugerencias)

**Como** sistema  
**Quiero** sugerir jugadores según ranking/categoría y exclusiones  
**Para** completar partidos.

**Criterios:** excluye participantes actuales; respeta categoría del partido.

**Estado:** **Done (backend):** endpoint `GET /api/v1/matchmaking/:matchId/suggestions` con estrategia de **similaridad** (cercanía a target Elo/fallback points), exclusión de participantes actuales, `limit` y filtro geo opcional. Tests de integración DB (`s29_*`) listos (condicionales a `TEST_DATABASE_URL`).

---

## 5. Épica E3 — Torneos: motor, rotaciones, tablero

### US-E3-01 — Crear torneo parametrizado vinculado a deporte

**Como** organizador  
**Quiero** crear un torneo con formato y parámetros  
**Para** no depender de Excel.

**Criterios:** ver US-E0-02; torneo asociado a `sport`.

**Estado:** **Parcial (backend, avanzado):** `POST /api/v1/tournaments` soporta `formatPresetId` o `formatPresetCode` + `formatParameters`, y persiste `presetSchemaVersion`. Validación fuerte de `formatParameters` por preset (ver US‑E0‑02, Sprint 32) y seed multi‑sport (Sprint 31).

Pendiente: UX/flows completos (frontend) y reglas de negocio avanzadas (inscripciones, cupos, lifecycle).

---

### US-E3-02 — Generar calendario de rondas / rotaciones según formato

**Como** sistema  
**Quiero** calcular emparejamientos por ronda según el formato elegido  
**Para** americanos, round robin, etc.

**Criterios:** determinismo testeado; idempotencia al regenerar con mismos inputs.

**Estado:** **Done (backend):** Americano schedule determinista e idempotente (`POST/GET /api/v1/tournaments/:tournamentId/americano-schedule...`) + persistencia + OpenAPI + tests.

---

### US-E3-03 — Scoreboard en tiempo casi real

**Como** jugador  
**Quiero** ver posiciones actualizadas al cargar resultados  
**Para** seguir el torneo.

**Criterios:** polling o WebSocket según NFR; autorización por rol.

**Estado:** **Done (backend):** `GET /api/v1/tournaments/:tournamentId/scoreboard` + OpenAPI + tests (contrato + integración condicional).

---

### US-E3-04 — Schedule genérico de torneos (API unificada)

**Como** organizador o sistema  
**Quiero** generar y consultar un calendario genérico de torneo sin depender de endpoints específicos por formato  
**Para** soportar múltiples formatos con un contrato estable.

**Criterios de aceptación**

1. `POST /api/v1/tournaments/:tournamentId/schedule:generate` crea el calendario si no existe y es idempotente por `scheduleKey`.
2. `GET /api/v1/tournaments/:tournamentId/schedule` devuelve el calendario generado.
3. Si el formato no está soportado aún, responde `501` con error claro.

**Estado:** **Parcial (backend):** persistencia `TournamentSchedule` (JSON) + endpoints genéricos `schedule:generate` y `schedule` implementados; AMERICANO soportado; otros formatos responden `501`. Tests DB (`s33_*`) listos (condicionales a `TEST_DATABASE_URL`).

Pendiente: implementar formatos adicionales (Round Robin real, eliminatorias, etc.) y normalizar payloads por versión.

---

### US-E3-05 — Motor Round Robin real (schedule + rounds + persistencia)

**Como** organizador  
**Quiero** generar el calendario completo de un torneo **ROUND_ROBIN**  
**Para** poder correr “todos contra todos” sin Excel.

**Criterios de aceptación**

1. Dado un torneo con `formatPresetCode=ROUND_ROBIN`, cuando ejecuto `schedule:generate`, entonces devuelve payload válido (rondas/partidos) y lo persiste en `TournamentSchedule`.
2. Dado el mismo input, la generación es **determinista** e **idempotente** (mismo `scheduleKey`).
3. Dado un input inválido (participantes duplicados o <4), responde `400` con `VALIDACION_FALLIDA`.
4. El payload incluye información suficiente para “materializar” matches (al menos `roundNumber` + `pairings` por ronda).

**Estado:** No iniciada (backend). Depende de US‑E3‑04 (API genérica) y US‑E0‑02 (validación de parámetros).

---

### US-E3-06 — Formato Eliminación simple (single elimination) (MVP)

**Como** organizador  
**Quiero** crear un torneo de **eliminación simple**  
**Para** organizar brackets de manera rápida.

**Criterios de aceptación**

1. Existe un preset `SINGLE_ELIMINATION` (por deporte) con `defaultParameters` y validación de `formatParameters`.
2. `schedule:generate` genera un bracket inicial (primera ronda) y persiste el `TournamentSchedule`.
3. Si el número de participantes no es potencia de 2, el sistema define política (byes) o responde error claro.

**Estado:** No iniciada (backend).

---

### US-E3-07 — Inscripciones y cupos de torneo (registrations) (MVP)

**Como** organizador  
**Quiero** registrar participantes en un torneo y validar cupos  
**Para** que el motor genere schedules con fuente de verdad consistente.

**Criterios de aceptación**

1. Existe endpoint para **inscribir** usuario en un torneo (`POST /api/v1/tournaments/:tournamentId/registrations`) y para **listar** inscripciones.
2. No permite duplicados (idempotente) ni inscripciones si el torneo está en estado no permitido.
3. `schedule:generate` puede tomar participantes desde `TournamentRegistration` (sin tener que pasar `participantUserIds` manualmente), o se define un endpoint alterno claro.

**Estado:** No iniciada (backend).

## 6. Épica E4 — Sedes, geo, horas vacantes

### US-E4-01 — Directorio de sedes y canchas

**Como** sede  
**Quiero** perfil y canchas publicadas  
**Para** ser encontrada en la app.

**Criterios:** CRUD sede/cancha; multi-deporte si aplica.

**Estado:** **Parcial (backend):** modelos + endpoints `POST /api/v1/venues`, `POST /api/v1/venues/:venueId/courts`, `GET /api/v1/venues` con filtro `near/radiusKm`, OpenAPI y tests de contrato (y/o integración condicional).

---

### US-E4-02 — Exploración geográfica (mapa / radio)

**Como** jugador  
**Quiero** ver oferta cerca de mí  
**Para** decidir dónde jugar.

**Criterios:** lat/lng o bounding box; performance NFR.

**Estado:** **Parcial (backend, avanzado):** filtros geo para oferta vía `GET /api/v1/matches/open?near=lat,lng&radiusKm=...` (bounding box) + endpoints internos de geocoding (`/api/v1/geo/places/*`) y persistencia de `placeId` + dirección normalizada en `Venue`.

Pendiente: implementar “distancia exacta” en resultados (si se requiere) y UX de mapa (frontend). La parte de performance base (índices) está cubierta por US‑E4‑04.

---

### US-E4-03 — Publicar horas vacantes / último minuto

**Como** sede  
**Quiero** publicar slots libres  
**Para** ocupación.

**Criterios:** visibilidad en listados; caducidad opcional.

**Estado:** **Done (backend):** modelo `VacantHour` + endpoints internos protegidos (`/api/v1/vacant-hours/publish|list|cancel`) que crean/cancelan un `Match` asociado, visible en discovery.

---

### US-E4-04 — Performance geo (índices y medición)

**Como** producto  
**Quiero** que los listados geo y filtros de oferta sean rápidos y estables  
**Para** soportar crecimiento sin degradación.

**Criterios de aceptación**

1. Existen índices para los patrones de consulta principales (status/scheduledAt/courtId/sportId/categoryId).
2. Se limita/pagina la respuesta para evitar cargas excesivas.
3. Se documenta (o se mide) el impacto mínimo en queries críticas.

**Estado:** **Done (backend - base):** migración con índices para matches/joins (`s36`). Pendiente: medición formal (EXPLAIN/benchmarks) y ajustes finos de queries según datos reales.

---

### US-E4-05 — Geo “exacta” y medición formal (p95/p99)

**Como** producto  
**Quiero** que los endpoints geo devuelvan distancia exacta (si se requiere) y tengan medición formal  
**Para** garantizar performance bajo carga real.

**Criterios de aceptación**

1. Se define si la API debe devolver `distanceKm` (y en qué endpoints); si aplica, se calcula de forma exacta.
2. Se agrega medición formal (EXPLAIN/bench) para queries críticas: `/matches/open` con `near/radiusKm` y `/venues?near`.
3. Se documenta una política de límites (max radius, max limit, paginación).

**Estado:** No iniciada (backend).

## 7. Épica E5 — Ranking y resultados

### US-E5-01 — Registrar resultados por partido o ronda

**Como** organizador o sistema  
**Quiero** registrar resultados autorizados  
**Para** cerrar el ciclo competitivo.

**Criterios:** validación de permisos; deporte puede influir en estructura del resultado (JSON tipado o tablas).

**Estado:** **Done (backend MVP):** flujo 4/4 con `MatchResultDraft` versionado + `MatchResultConfirmation`; soporta **REJECTED** y **re‑propuesta**; al completar confirmación válida finaliza `MatchResult` + `MatchResultScore` y aplica Elo. Tests DB (`s26_*`) listos (condicionales a `TEST_DATABASE_URL`).

Pendiente: permisos/auditoría avanzados según producto.

---

### US-E5-02 — Recalcular ranking por categoría / deporte

**Como** sistema  
**Quiero** actualizar tabla de posiciones tras resultados  
**Para** reflejar desempeño.

**Criterios:** idempotencia; transacciones DB.

**Estado:** **Done (backend MVP):** `POST /api/v1/ranking/recalculate/:categoryId` transaccional e idempotente desde `MatchResult/MatchResultScore`. Tests DB (`s27_*`) verifican recálculo doble sin duplicados (condicionales a `TEST_DATABASE_URL`).

---

### US-E5-03 — (Futuro) Elo u otro rating dinámico

**Como** producto  
**Quiero** rating objetivo más allá de puntos acumulados  
**Para** matchmaking fino.

**Criterios:** fórmula versionada; migración desde puntos si aplica.

**Estado:** **Parcial (backend, avanzado):** `UserRating` + `UserRatingHistory`, cálculo Elo al finalizar resultado (K-factor configurable) con política configurable (rating inicial, clamps min/max, K provisional), endpoints `GET /api/v1/users/:userId/ratings` y `/ratings/history`, **leaderboard por categoría** (`GET /api/v1/ratings/leaderboard`) y matchmaking priorizando Elo.

Pendiente: leaderboard por deporte (si el rating se separa por sport), y política Elo por deporte/categoría si cambia el sistema de puntuación.

---

### US-E5-04 — Elo por deporte (si aplica) + leaderboard por deporte

**Como** producto  
**Quiero** separar rating/leaderboard por **deporte** cuando el scoring difiere  
**Para** evitar mezclar habilidades entre deportes.

**Criterios de aceptación**

1. El rating se consulta por `sportId` (o se define explícitamente que es global).
2. Existe leaderboard filtrable por `sportId` + `categoryId`.
3. Migración/backfill definido (si se separa).

**Estado:** No iniciada (producto/backend).

## 8. Épica E6 — Cobro colaborativo (sin custodia)

### US-E6-01 — Obligaciones por participante + fee parametrizable

**Como** organizador  
**Quiero** generar montos por persona con comisión clara  
**Para** transparencia.

**Criterios:** fee rules; sin duplicar obligaciones activas.

**Estado:** Cumplida en API (MVP).

---

### US-E6-02 — Resumen y confirmación manual

**Como** jugador  
**Quiero** marcar pagado / organizador confirmar  
**Para** cerrar deudas informales.

**Criterios:** estados; auditoría mínima.

**Estado:** Cumplida en API (MVP).

---

### US-E6-03 — Adjuntar comprobante (imagen) a obligación

**Como** jugador  
**Quiero** subir captura de transferencia  
**Para** validación sin custodia de dinero.

**Criterios:** storage seguro; tipos MIME; tamaño máximo.

**Estado:** **Done (backend MVP):** `TransactionReceipt` + endpoints para subir/leer comprobante (storage local seguro, validación MIME/tamaño) + OpenAPI. Tests DB+FS (`s28_*`) listos (condicionales a `TEST_DATABASE_URL`).

---

## 9. Épica E7 — Coordinación

### US-E7-01 — Chat o hilo por partido / torneo

**Como** grupo  
**Quiero** mensajería en contexto  
**Para** coordinar sin WhatsApp.

**Estado:** **Done (backend MVP):** chat por `matchId` o `tournamentId` con persistencia (`ChatThread`, `ChatMessage`) y endpoints autenticados:
- `GET/POST /api/v1/matches/:matchId/chat/messages`
- `GET/POST /api/v1/tournaments/:tournamentId/chat/messages`

Tests de integración DB (`s34_*`) listos (condicionales a `TEST_DATABASE_URL`).

---

### US-E7-02 — Notificaciones push / in-app

**Como** usuario  
**Quiero** avisos de cupo, pago y mensajes  
**Para** no perder oportunidades.

**Estado:** **Parcial (backend, avanzado):** notificaciones segmentadas por categoría+geo con:
- Suscripciones (`NotificationSubscription`)
- Evento `MATCH_SLOT_OPENED` emitido cuando `leave` abre cupo
- Evento `MATCH_CANCELLED` (endpoint interno para crear evento + deliveries)
- `DevicePushToken` + provider Noop/FCM
- Dispatch como **worker real** con deliveries PENDING + retries/backoff + deshabilitado de tokens inválidos
- Worker automático in-process (env gated) + endpoint de métricas internas
- **Worker separado (servicio)** con lock distribuido (advisory lock) para escalado
- **In‑app**: bandeja con `NotificationDelivery.readAt` + endpoints `GET /api/v1/users/me/notifications` + marcar leído/read-all (Sprint 30; tests `s30_*`)

Pendiente: observabilidad “full” (dashboards/alertas externas) y política/plantillas por tipo (si se requiere).

---

### US-E7-03 — Preferencias de notificación por tipo (pagos/chat/cupos)

**Como** usuario  
**Quiero** habilitar o deshabilitar tipos específicos de notificación (p. ej. cupos, pagos, mensajes)  
**Para** no recibir alertas irrelevantes.

**Criterios de aceptación**

1. Dada una suscripción activa, cuando guardo preferencias por tipo, entonces el backend persiste la configuración por tipo.
2. Dado un evento de notificación, cuando el usuario tiene ese tipo deshabilitado, entonces no se crean/dispatchan deliveries para ese usuario.
3. Si el tipo no está especificado en preferencias, se asume **habilitado** (backward compatible).

**Estado:** **Done (backend MVP):** `NotificationSubscription.enabledTypes` + validación en API `/users/me/notification-subscriptions` y el dispatch respeta preferencias por tipo. Se agregaron tipos `PAYMENT_PENDING` y `CHAT_MESSAGE` (endpoints internos para crear eventos). Tests DB (`s35_*`) listos (condicionales a `TEST_DATABASE_URL`).

---

### US-E7-04 — Plantillas y payloads estables por tipo de notificación (contract)

**Como** producto  
**Quiero** que cada tipo de notificación tenga **payload estable** y plantilla (title/body) consistente  
**Para** que mobile pueda navegar/mostrar correctamente.

**Criterios de aceptación**

1. Para cada `NotificationEventType` soportado, existe contrato de payload (campos mínimos) y `dispatch` construye `title/body` coherentes.
2. El payload incluye datos suficientes para deep-link (matchId/tournamentId/threadId, etc.).
3. Tests de contrato validan que `dispatch` no rompe el shape.

**Estado:** No iniciada (backend/producto).

---

### US-E7-05 — Observability “full” notificaciones (dashboards + alertas)

**Como** operador  
**Quiero** dashboards/alertas externas para backlog/failure rate  
**Para** detectar degradación del worker de notificaciones.

**Criterios de aceptación**

1. Métricas expuestas se integran en herramienta externa (Datadog/Grafana/etc.) o se define estrategia.
2. Alertas para: backlog events, backlog deliveries, failure rate, tick timeout.
3. Documentación operativa (runbook) mínima.

**Estado:** No iniciada (infra/ops).


## 10. Checklist de verificación por historia (Scrum)

Para dar por **Done** cada historia en un sprint:

- [ ] Criterios de aceptación verificables en staging.
- [ ] Tests automatizados (contrato + integración con BD cuando aplique).
- [ ] OpenAPI o documento de contrato actualizado.
- [ ] Mensajes de error/éxito en español (reglas del proyecto).
- [ ] Si afecta multi-deporte: no hardcodear solo pádel en dominio; usar `sport` o configuración.

---

## 11. Próximo paso en flujo TDD (Orchestrator)

**Siguiente épica recomendada:** **E0** (deporte explícito + torneo parametrizable y presets), porque desbloquea el resto sin retrabajo masivo.

1. **Explorer:** auditoría de `schema.prisma` y rutas actuales (`AMERICANO`, `MatchType`, `Tournament`).
2. **Proposer:** decisión de `Sport` enum vs tabla `sports`; cómo mapear “Americano” a preset.
3. **Spec Writer:** FR/NFR y criterios de aceptación cerrados para US-E0-01 a US-E0-03.
4. **Designer:** diagrama de entidades y flujo de creación de torneo.
5. **Task Planner:** DAG de migraciones + API + tests.
6. **Tester:** tests en rojo.
7. **Implementer / Verifier:** hasta verde.

---

## 12. Scrum/Kanban operativo (backend-first) + Sprints

### Tablero Kanban recomendado

| Columna | Entrada mínima | Salida / DoD de columna |
|--------|-----------------|--------------------------|
| **Backlog** | Idea/historia sin refinar | Se entiende el “qué” y el “para qué” |
| **Ready** | Historia refinada | Tiene criterios de aceptación + contrato API tentativo (request/response) + dependencias claras |
| **In Progress** | Historia lista para construir | Hay test(s) inicial(es) en rojo o plan TDD concreto |
| **Review** | Implementación terminada | `lint` + `typecheck` + `test` en verde, OpenAPI actualizado si aplica |
| **Done** | Mergeable/deployable | Cumple checklist de verificación por historia (sección 10) |

**WIP sugerido**

- **In Progress**: 2
- **Review**: 2
- **Ready**: 5–8

### Sprints propuestos (prioridad: backend)

#### Sprint 1 — “Base operable + contrato público”

- **Objetivo**: correr API local sin fricción (env + scripts) y poder testear manualmente con Swagger.
- **Scope**
  - **E0**: endurecer contrato y docs de endpoints existentes (`/sports`, `/tournaments`, `/americanos`).
  - **Docs**: OpenAPI/Swagger siempre actualizado para endpoints v1.
- **Criterios de salida**
  - `GET /docs` y `GET /openapi.json` operativos
  - `.env.example` completo y guía de ejecución/pruebas
  - Suite de **contrato HTTP** en verde; integración condicionada a `TEST_DATABASE_URL`

#### Sprint 2 — “E0 sólido: presets versionados (US-E0-03)”

- **Objetivo**: versionar presets sin romper torneos en curso.
- **Scope**
  - **US-E0-03** completa (modelo + migración + API si aplica + tests).
- **Criterios de salida**
  - Torneos guardan referencia a versión de preset; nuevas versiones no afectan torneos existentes
  - Tests de dominio/integ cubren los casos 1 y 2 de la historia

#### Sprint 3 — “E2 MVP: descubrimiento + unión validada”

- **Objetivo**: dejar de depender de WhatsApp para llenar cupos.
- **Scope**
  - **US-E2-02** listar partidas abiertas con filtros + paginación
  - **US-E2-03** unirse con validación de nivel/categoría (rechazo con código de negocio)
- **Criterios de salida**
  - Endpoint(s) con paginación/filtros documentados en OpenAPI
  - Validaciones y códigos de error en español

#### Sprint 4 — “E3 motor: rotaciones deterministas (inicio)”

- **Objetivo**: calendario/rotaciones idempotentes para al menos 1 formato (Americano).
- **Scope**
  - **US-E3-02** (Americano primero): algoritmo determinista + idempotencia
- **Criterios de salida**
  - Tests de dominio demuestran determinismo e idempotencia con mismos inputs
  - Contrato API para “generar/consultar rondas” documentado

#### Sprint 5 — “E3‑03 Scoreboard (posiciones)”

- **Objetivo**: exponer posiciones consultables por torneo con DTO estable.
- **Scope**
  - `GET /api/v1/tournaments/:tournamentId/scoreboard` + OpenAPI + tests (contrato + integración condicional)
- **Criterios de salida**
  - Endpoint documentado y validado por tests de contrato

#### Sprint 6 — “E2 CRUD de partidos (base)”

- **Objetivo**: completar CRUD base de partidos sin romper `open`/`join`.
- **Scope**
  - `GET /api/v1/matches` + `GET /api/v1/matches/:matchId`
  - `POST /api/v1/matches` (auth; creator queda como participante)
  - `PATCH /api/v1/matches/:matchId` (campos permitidos + invariantes)
  - `PATCH /api/v1/matches/:matchId/cancel`
  - OpenAPI + tests de contrato
- **Criterios de salida**
  - `lint` en verde
  - Tests de contrato cubren rutas nuevas (sin DB)

#### Sprint 7 — “E2 hardening + integración (cerrar ciclo)”

- **Objetivo**: endurecer permisos/estados y cerrar verificación con integración DB y runtime estándar.
- **Scope**
  - **Permisos MVP** en matches: definir owner (p. ej. `organizerUserId` o regla equivalente) y aplicar en `PATCH`/`cancel`.
  - **Integración DB** para CRUD de matches (seed + casos de cupo/estado) usando `TEST_DATABASE_URL`.
  - **Transiciones de estado** mínimas: impedir updates/cancel sobre `IN_PROGRESS/FINISHED/CANCELLED`; alineación con `MatchStatus` (Prisma).
  - **Infra**: estandarizar Node 20.19+ (docs/CI) para correr `npm test` y `npm run typecheck`.
- **Criterios de salida**
  - `npm run lint && npm run typecheck && npm test` en verde con Node 20.19+
  - Integración DB valida: create→update→cancel y conflictos (cupo/estado)

---

**Fin del backlog documentado.**
