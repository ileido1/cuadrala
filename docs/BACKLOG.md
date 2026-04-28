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

---

## 1. Mapa de épicas y orden recomendado (TDD)

Orden global sugerido: **E0 → E1 → E2 → E3 → E4 → E5 → E6 → E7**. Dentro de cada épica, seguir el orden de las historias (IDs).

| Orden | Épica | Objetivo | Estado (según historias) |
|-------|-------|----------|--------------------------|
| E0 | Cimientos multi-deporte y torneo parametrizable | Deportes, presets de formato, torneo genérico | **In Progress** (US-E0-01/02 Parcial; US-E0-03 No iniciada) |
| E1 | Identidad, auth y perfil competitivo | Cuenta, perfil, nivel/categoría, (futuro Elo) | **In Progress** (US-E1-01 Parcial; US-E1-02 No iniciada; US-E1-03 Parcial) |
| E2 | Partidos, descubrimiento y unión validada | Listados, filtros, join con reglas de nivel | **In Progress** (US-E2-01 Parcial; US-E2-02 Done; US-E2-03 Done; US-E2-04 Parcial) |
| E3 | Motor de torneos y formatos | Rotaciones, rondas, tablero (según formato) | **In Progress** (US-E3-01 Parcial; US-E3-02 Done; US-E3-03 Done) |
| E4 | Sedes y geo | Directorio, mapa, horas vacantes | **In Progress** (US-E4-01 Parcial; US-E4-02/03 No iniciada) |
| E5 | Ranking y resultados | Resultados → recálculo (puntos / Elo) | **In Progress** (US-E5-01 Parcial; US-E5-02 Parcial; US-E5-03 No iniciada) |
| E6 | Cobro colaborativo | Obligaciones, comprobantes, sin custodia | **Done (MVP)** (US-E6-01/02 Cumplida; US-E6-03 No iniciada) |
| E7 | Coordinación | Chat, notificaciones | **Backlog** (US-E7-01/02 No iniciada) |

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

**Estado:** **Parcial — backend:** modelos `Sport`, `TournamentFormatPreset`, `sportId` en `Match`/`Tournament`; `GET /sports`, `GET /sports/:id/tournament-format-presets`, `POST /tournaments`; seed PADEL + presets. Pendiente: más deportes en seed, UI y reglas por deporte.

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

**Estado:** **Parcial:** torneos parametrizables vía API (`POST /tournaments` + `formatParameters`); partidos sueltos siguen usando preset AMERICANO por defecto. Falta motor de rotaciones por formato (épica E3).

**Verificación TDD:** tests de dominio para validación de parámetros por formato; migraciones compatibles hacia atrás.

---

### US-E0-03 — Presets de formato versionados

**Como** sistema  
**Quiero** **versionar** reglas de formato (puntos por partido, tamaño de grupo, etc.)  
**Para** poder cambiar reglas sin romper torneos en curso.

**Criterios de aceptación**

1. Dado un torneo en curso, cuando se publica nueva versión de un preset, entonces el torneo sigue usando la versión con la que fue creado.
2. Dado un torneo nuevo, cuando uso el preset, entonces referencia la versión vigente al momento de creación.

**Estado:** No iniciada.

---

## 3. Épica E1 — Identidad, auth y perfil (ADN del jugador)

### US-E1-01 — Registro e inicio de sesión

**Como** usuario  
**Quiero** registrarme e iniciar sesión de forma segura  
**Para** usar la app con mi identidad.

**Criterios:** tokens de acceso/refresh; cierre de sesión; mensajes en español.

**Estado:** **Parcial — backend:** endpoints de auth (register/login/refresh) + middleware JWT + perfil (ver US‑E1‑02). Pendiente: logout/blacklist, endurecer refresh rotation y tests de integración en Node 20.19+.

---

### US-E1-02 — Perfil técnico (Drive / Revés) y datos de juego

**Como** jugador  
**Quiero** indicar lado de cancha preferido y datos relevantes  
**Para** mejorar emparejes en pádel.

**Criterios:** campos opcionales/obligatorios según deporte; visibles en ficha de partido.

**Estado:** **Parcial — backend:** `GET /users/me` y `PATCH /users/me` (perfil base). Pendiente: campos técnicos (drive/revés) y criterios por deporte.

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

**Estado:** **Parcial — backend:** CRUD base de partidos (`GET /matches`, `GET /matches/:id`, `POST /matches`, `PATCH /matches/:id`, `PATCH /matches/:id/cancel`) + `/americanos` legacy. Pendiente: precio/cobro por persona en creación (relacionado con E6), permisos (owner/admin) y tests de integración (Node 20.19+).

---

### US-E2-02 — Listar partidas con cupos vacíos (filtros)

**Como** jugador  
**Quiero** ver partidas abiertas filtrando sede, precio, horario, nivel, **deporte**  
**Para** encontrar juego sin depender de WhatsApp.

**Criterios:** paginación; índices; respuesta estable en OpenAPI.

**Estado:** **Done (backend):** `GET /api/v1/matches/open` con filtros + paginación, OpenAPI y tests de contrato.

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

**Estado:** Parcial (`GET .../matchmaking/.../suggestions`).

---

## 5. Épica E3 — Torneos: motor, rotaciones, tablero

### US-E3-01 — Crear torneo parametrizado vinculado a deporte

**Como** organizador  
**Quiero** crear un torneo con formato y parámetros  
**Para** no depender de Excel.

**Criterios:** ver US-E0-02; torneo asociado a `sport`.

**Estado:** Parcial (modelo `Tournament` existe; falta parametrización completa y presets).

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

## 6. Épica E4 — Sedes, geo, horas vacantes

### US-E4-01 — Directorio de sedes y canchas

**Como** sede  
**Quiero** perfil y canchas publicadas  
**Para** ser encontrada en la app.

**Criterios:** CRUD sede/cancha; multi-deporte si aplica.

**Estado:** Parcial (modelos; sin API pública completa).

---

### US-E4-02 — Exploración geográfica (mapa / radio)

**Como** jugador  
**Quiero** ver oferta cerca de mí  
**Para** decidir dónde jugar.

**Criterios:** lat/lng o bounding box; performance NFR.

**Estado:** No iniciada.

---

### US-E4-03 — Publicar horas vacantes / último minuto

**Como** sede  
**Quiero** publicar slots libres  
**Para** ocupación.

**Criterios:** visibilidad en listados; caducidad opcional.

**Estado:** No iniciada.

---

## 7. Épica E5 — Ranking y resultados

### US-E5-01 — Registrar resultados por partido o ronda

**Como** organizador o sistema  
**Quiero** registrar resultados autorizados  
**Para** cerrar el ciclo competitivo.

**Criterios:** validación de permisos; deporte puede influir en estructura del resultado (JSON tipado o tablas).

**Estado:** Parcial (modelos de resultado; flujo API incompleto según SDD).

---

### US-E5-02 — Recalcular ranking por categoría / deporte

**Como** sistema  
**Quiero** actualizar tabla de posiciones tras resultados  
**Para** reflejar desempeño.

**Criterios:** idempotencia; transacciones DB.

**Estado:** Parcial (`POST /ranking/recalculate/:categoryId`).

---

### US-E5-03 — (Futuro) Elo u otro rating dinámico

**Como** producto  
**Quiero** rating objetivo más allá de puntos acumulados  
**Para** matchmaking fino.

**Criterios:** fórmula versionada; migración desde puntos si aplica.

**Estado:** No iniciada.

---

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

**Estado:** No iniciada.

---

## 9. Épica E7 — Coordinación

### US-E7-01 — Chat o hilo por partido / torneo

**Como** grupo  
**Quiero** mensajería en contexto  
**Para** coordinar sin WhatsApp.

**Estado:** No iniciada.

---

### US-E7-02 — Notificaciones push / in-app

**Como** usuario  
**Quiero** avisos de cupo, pago y mensajes  
**Para** no perder oportunidades.

**Estado:** No iniciada.

---

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
