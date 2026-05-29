## Plan de Sprints — App Mobile (Flutter)

> **ARCHIVADO.** Fuente de verdad: [`docs/BACKLOG_UNIFICADO.md`](../BACKLOG_UNIFICADO.md).

> Este archivo queda como **histórico** y puede no reflejar el estado actual.

**Suposiciones**
- Backend ya está “avanzado” (Sprints 25–36) y el contrato de endpoints está en `services/api/src/presentation/openapi/openapi.ts`.
- Arquitectura Flutter: feature-first + BLoC/Cubit (ver `docs/SDD.md` y reglas de `.cursor/rules/flutter-architecture-best-practices.mdc`).
- UI baseline: `.cursor/rules/flutter-ui-design-system-cuadrala.mdc`.

**Definición de Done (mobile)**
- Pantallas del sprint implementadas con estados **loading/empty/error/success**
- Navegación y permisos coherentes (rutas protegidas)
- BLoC/Cubit por feature (sin HTTP directo en widgets)
- Tests mínimos por feature (unit de cubit + widget tests smoke)
- `flutter analyze` y `flutter test` en verde

---

## Sprint M1 — Fundaciones + Auth

**Objetivo**: tener app navegable con sesión real.

**Historias**
- US-M0-01 App shell y navegación base
- US-M0-02 Tema Material 3 + tokens del design system
- US-M0-03 Cliente API + manejo de errores estándar
- US-M1-01 Registro
- US-M1-02 Login + sesión persistente
- US-M1-03 Logout

**Entregable**: app que permite registrarse/loguearse y entrar a un Home placeholder con tabs.

---

## Sprint M2 — Home + Discovery de Partidas

**Objetivo**: que el usuario encuentre partidas y entre al detalle.

**Historias**
- US-M2-01 Home “Tu resumen” con CTAs
- US-M3-01 Listado de partidas abiertas (search + filtros + paginación)
- US-M3-02 Detalle de partida (read-only)

**Entregable**: flujo Login → Home → Partidas abiertas → Detalle.

---

## Sprint M3 — Crear/Unirse/Ciclo de vida de Partida

**Objetivo**: completar el loop principal de “crear y llenar una partida”.

**Historias**
- US-M3-03 Crear partida
- US-M3-04 Unirse / salir
- US-M3-05 Cancelar / iniciar / finalizar (mínimo: cancelar + start/finish si UX lo necesita ya)

**Entregable**: crear una partida desde el móvil, verla y unirse/salir; organizer puede cancelar.

---

## Sprint M4 — Resultados + Pagos (MVP)

**Objetivo**: cerrar la partida con resultado y habilitar cobro colaborativo básico.

**Historias**
- US-M3-06 Proponer/confirmar resultado
- US-M8-01 Crear obligaciones + ver summary
- US-M8-02 Comprobantes + confirmación manual

**Entregable**: “Resultado propuesto” y “Gestión de pagos” como en referencias.

---

## Sprint M5 — Torneos (MVP)

**Objetivo**: crear torneos y ver progreso (scoreboard + schedule si soporta).

**Historias**
- US-M4-01 Catálogo deportes + presets
- US-M4-02 Crear torneo (formParameters UI dinámica)
- US-M4-03 Detalle + scoreboard
- US-M4-04 Schedule genérico (generate + get) con manejo de `501`

**Entregable**: lista/crear/abrir torneo y ver tabla + rondas (si formato soportado).

---

## Sprint M6 — Chat + Notificaciones (MVP)

**Objetivo**: coordinación in-app + inbox.

**Historias**
- US-M5-01 Chat por partida
- US-M5-02 Chat por torneo
- US-M6-01 Inbox + marcar leído/read-all
- US-M6-02 Preferencias por tipo (enabledTypes)
- US-M6-03 Device push tokens (MVP)

**Entregable**: chat funcional y notificaciones in-app con preferencias.

---

## Sprint M7 — Perfil/Ranking (MVP)

**Objetivo**: cerrar la identidad competitiva.

**Historias**
- US-M7-01 Perfil “me”
- US-M7-02 Perfil técnico + stats/ratings + leaderboard

**Entregable**: Perfil como referencia (métricas + ranking + datos técnicos).

---

## Sprint M8+ — Post-MVP (Geo/Sedes + Vacant hours)

**Objetivo**: features de sedes y geo que elevan discovery y operación.

**Historias**
- US-M9-01 Búsqueda de lugares + detalle
- US-M9-02 Vacant hours publish/list/cancel
- (Opcional) mejoras de performance, caching, offline-lite, analytics

---

## Sprint M10 — UI alineada a Mockup Sandbox (cuadrala-sport)

**Objetivo**: alinear la app Flutter con los mockups en `Cuadrada-Sport/artifacts/mockup-sandbox` (jerarquía visual, headers, cards, chips, FAB y bottom nav).

**Historias**
- **US-M0-02** Tema Material 3 + tokens (ajustes finos: radios/spacing/bordes)
- **US-M2-01** Home “Tu resumen” con CTAs (ajuste visual)
- **US-M3-01** Listado de partidas abiertas (ajuste visual + FAB)
- **US-M3-02** Detalle de partida (ajuste visual)
- **US-M6-01** Inbox de notificaciones (alineado a mock)

**Entregable**
- Header compartido estilo mock (`AppHeader`) aplicado en pantallas principales.
- Notificaciones dejan de ser placeholder en el tab y se ven como en referencia.
- `flutter analyze` + `flutter test` en verde.

---

## Sprint M19 — Disponibilidad de pistas (venue + court)

> **Fuente de verdad:** `docs/BACKLOG_UNIFICADO.md` (sprint **M19**). Este bloque resume el alcance mobile + API.

**Objetivo**: al **crear partida**, el usuario ve **horarios disponibles** por sede y pista; el backend valida reservas coherentes (**`US-E2-05`**, ya implementado).

**Historias**
- **`US-E4-06`** (back) Endpoint(s) de **slots libres/ocupados** por `venueId` / `courtId` y rango temporal.
- **`US-M3-08`** (app) Integrar selector de hora con datos de **`US-E4-06`** en flujo “Nueva partida”.
- **`US-M3-09`** *(opcional)* Mensajes y CTAs para `CANCHA_OCUPADA` / `HORARIO_RESERVA_INCOMPATIBLE`.

**Entregable**: crear partida eligiendo solo franjas válidas; documentación OpenAPI y tests integración en API según especificación de `US-E4-06`.

