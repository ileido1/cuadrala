## Backlog Mobile (Flutter) — Cuádrala

**Objetivo**: entregar la app mobile en Flutter (Material 3) consumiendo el backend existente (OpenAPI) y siguiendo el design system de referencia.

**UI baseline**: ver `.cursor/rules/flutter-ui-design-system-cuadrala.mdc`.

---

## 1) Principios (Mobile)

- **Backend-first**: no inventar endpoints. Si falta un contrato, se registra como historia backend (fuera de este documento).
- **Estados**: toda pantalla debe contemplar **loading / empty / error / success**.
- **Accesos**: el usuario no autenticado solo ve Auth; el resto requiere sesión.
- **Tokens**: mobile usa access+refresh; refresh se guarda seguro (según SDD).

---

## 2) Epics Mobile (orden recomendado)

| Orden | Épica | Objetivo | Depende de |
|---|---|---|---|
| M0 | Fundaciones | App shell, tema, navegación, cliente API, manejo de errores | SDD + OpenAPI |
| M1 | Auth | registro/login/refresh/logout, sesión persistente | `POST /auth/*` |
| M2 | Home | resumen + próximas acciones (CTA) | matches/tournaments |
| M3 | Partidas | listar/crear/detalle/unirse/salir/cancelar/resultados | `/matches*`, `/matchmaking*` |
| M4 | Torneos | listar/crear/detalle/schedule/scoreboard | `/tournaments*`, `/sports*` |
| M5 | Chat | chat por match y torneo (lista + envío) | `/matches/:id/chat/*`, `/tournaments/:id/chat/*` |
| M6 | Notificaciones | inbox + read/read-all + preferencias + push tokens | `/users/me/notifications*`, `/notification-subscriptions*`, `/device-push-tokens*` |
| M7 | Perfil/Ranking | perfil “me”, perfil técnico, stats, ratings, leaderboard | `/users/*`, `/ratings/leaderboard` |
| M8 | Pagos | obligaciones, summary, confirmar manual, comprobantes | `/transactions*`, `/users/:id/transactions` |
| M9 | Geo/Sedes | búsqueda lugares + geocode + vacant hours | `/geo/*`, `/venues/*`, `/vacant-hours*` |

---

## 3) Historias de Usuario (Mobile)

### M0 — Fundaciones

#### US-M0-01 — App shell y navegación base
**Como** usuario  
**Quiero** una navegación consistente (bottom tabs + rutas)  
**Para** moverme entre Inicio / Partidas / Torneos / Notif. / Perfil.

**Criterios de aceptación**
1. Bottom nav con 5 tabs (Inicio, Partidas, Torneos, Notif., Perfil) y preserva estado por tab.
2. Rutas protegidas: sin sesión, redirige a Login.
3. Deep link interno (ruta) funciona para: detalle de partida, detalle de torneo, notificaciones.

**Estado:** Not started (mobile)

---

#### US-M0-02 — Tema Material 3 + tokens del design system
**Como** usuario  
**Quiero** una UI coherente con el design system (verde principal, chips, cards)  
**Para** reconocer la marca y usar la app sin fricción.

**Criterios de aceptación**
1. `ThemeData` define `colorScheme` y tipografías según el baseline.
2. Componentes base reutilizables: `PrimaryButton`, `SecondaryButton`, `DangerButton`, `AppCard`, `StatusChip`, `EmptyState`, `ErrorState`, `SkeletonList`.
3. No se introducen colores fuera de paleta.

**Estado:** Not started (mobile)

---

#### US-M0-03 — Cliente API + manejo de errores estándar
**Como** app  
**Quiero** un cliente HTTP consistente (Dio/OpenAPI) y errores normalizados  
**Para** mapear códigos del backend a mensajes UX estables.

**Criterios de aceptación**
1. Todas las llamadas API pasan por una capa `ApiClient`/SDK generado.
2. Errores se mapean a `AppFailure(code, message)`; la UI no “branch” por `message`.
3. Se loguea `code` para debugging y se muestra mensaje corto al usuario.

**Estado:** Not started (mobile)

---

### M1 — Auth

#### US-M1-01 — Registro de usuario
**Como** usuario nuevo  
**Quiero** crear una cuenta  
**Para** empezar a jugar y organizar eventos.

**Endpoints**
- `POST /api/v1/auth/register`

**Criterios de aceptación**
1. Form con validación (email, password) y estados loading/error.
2. Al éxito, queda autenticado y navega a Inicio.
3. Mensajes en español y errores consistentes.

**Estado:** Not started (mobile)

---

#### US-M1-02 — Login + sesión persistente
**Como** usuario  
**Quiero** iniciar sesión y mantenerme logueado  
**Para** no autenticarme cada vez.

**Endpoints**
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`

**Criterios de aceptación**
1. Login guarda refresh token de forma segura (según SDD).
2. Al abrir la app, intenta refresh y entra directo si es válido.
3. Si refresh falla, vuelve a Login limpiando sesión local.

**Estado:** Not started (mobile)

---

#### US-M1-03 — Logout
**Como** usuario  
**Quiero** cerrar sesión  
**Para** proteger mi cuenta en dispositivos compartidos.

**Endpoints**
- `POST /api/v1/auth/logout`

**Criterios de aceptación**
1. Logout revoca en backend y limpia storage local.
2. Redirige a Login.
3. Maneja fallback offline (si falla red, igual limpia local y avisa).

**Estado:** Not started (mobile)

---

### M2 — Home

#### US-M2-01 — Home “Tu resumen” con CTAs
**Como** usuario  
**Quiero** ver un resumen con acciones rápidas  
**Para** crear una partida o un torneo en segundos.

**Criterios de aceptación**
1. Home muestra: CTA “Crear partida”, CTA “Nuevo torneo”.
2. Sección “Próxima partida” (si hay data; si no, empty state).
3. Sección “Abiertas cerca de ti” (lista corta + “Ver todas”).

**Estado:** Not started (mobile)

---

### M3 — Partidas

#### US-M3-01 — Listado de partidas abiertas (discovery)
**Como** usuario  
**Quiero** ver partidas abiertas con búsqueda y filtros  
**Para** unirme a una que me convenga.

**Endpoints**
- `GET /api/v1/matches/open`

**Criterios de aceptación**
1. Search + chips de filtro (deporte/categoría/cerca/hoy).
2. Cards con: deporte, club/cancha, fecha/hora, precio, cupos, CTA “Unirse”.
3. Paginación/infinite scroll + loading/empty/error.

**Estado:** Not started (mobile)

---

#### US-M3-02 — Detalle de partida
**Como** usuario  
**Quiero** ver el detalle completo de una partida  
**Para** decidir unirme y entender condiciones.

**Endpoints**
- `GET /api/v1/matches/{matchId}`

**Criterios de aceptación**
1. Muestra: sede/cancha, fecha/hora, precio, estado, jugadores (con badges).
2. CTA primaria abajo: “Unirme” (si aplica) / “Salir” / “Cancelar” (si organizer).
3. Acciones bloqueadas muestran motivo claro (reglas/cupos/estado).

**Estado:** Not started (mobile)

---

#### US-M3-03 — Crear partida
**Como** organizador  
**Quiero** crear una partida con los campos necesarios  
**Para** invitar y llenar cupos.

**Endpoints**
- `POST /api/v1/matches`
- (support) `GET /api/v1/sports`
- (support) `GET /api/v1/sports/{sportId}/tournament-format-presets` (si se reutiliza catálogo)

**Criterios de aceptación**
1. Form por secciones (deporte, sede/cancha, fecha/hora, categoría, jugadores, precio, privada, nota).
2. Validación local + errores del backend mapeados a UI.
3. Al éxito navega al detalle.

**Estado:** Not started (mobile)

---

#### US-M3-04 — Unirse / salir de partida
**Como** jugador  
**Quiero** unirme o salir de una partida  
**Para** gestionar mi participación.

**Endpoints**
- `POST /api/v1/matches/{matchId}/join`
- `POST /api/v1/matches/{matchId}/leave`

**Criterios de aceptación**
1. Join/leave actualiza UI (optimista opcional) y refleja cupos.
2. Si falla por reglas (categoría/estado/cupos), muestra mensaje claro.
3. Mantiene consistencia al volver al listado.

**Estado:** Not started (mobile)

---

#### US-M3-05 — Cancelar / iniciar / finalizar partida
**Como** organizador  
**Quiero** controlar el ciclo de vida de la partida  
**Para** mantener información fiable.

**Endpoints**
- `POST /api/v1/matches/{matchId}/cancel`
- `POST /api/v1/matches/{matchId}/start`
- `POST /api/v1/matches/{matchId}/finish`

**Criterios de aceptación**
1. Acciones visibles solo con permisos; confirm dialogs.
2. Estado cambia y se refleja en badges.
3. Manejo de errores y reintento.

**Estado:** Not started (mobile)

---

#### US-M3-06 — Proponer/confirmar resultado
**Como** jugador  
**Quiero** proponer y confirmar un resultado  
**Para** cerrar la partida y actualizar ranking.

**Endpoints**
- `POST /api/v1/matches/{matchId}/result-draft`
- `POST /api/v1/matches/{matchId}/result-draft/confirm`
- `POST /api/v1/matches/{matchId}/result-draft/reproposal`

**Criterios de aceptación**
1. Pantalla “Resultado propuesto” con confirm/rechazar (reproposal).
2. Estados claros: pendiente/confirmado/repropuesto.
3. Evitar doble envío (idempotencia en UI).

**Estado:** Not started (mobile)

---

#### US-M3-07 — Sugerencias de matchmaking
**Como** organizador  
**Quiero** sugerencias de jugadores para completar cupos  
**Para** llenar la partida más rápido.

**Endpoints**
- `GET /api/v1/matchmaking/{matchId}/suggestions`

**Criterios de aceptación**
1. Lista de candidatos con info mínima (nombre/categoría) y acción “Invitar” (si existe) o “Copiar” (MVP sin endpoint).
2. Loading/empty/error.
3. Si no hay endpoint de invitación, mostrar CTA “Compartir link” como alternativa.

**Estado:** Not started (mobile)

---

### M4 — Torneos

#### US-M4-01 — Catálogo de deportes y presets (para crear torneo)
**Como** organizador  
**Quiero** seleccionar deporte y preset de formato  
**Para** crear torneos parametrizados.

**Endpoints**
- `GET /api/v1/sports`
- `GET /api/v1/sports/{sportId}/tournament-format-presets`

**Criterios de aceptación**
1. Selector de deporte y preset con labels claros.
2. Si hay versión/preset inactivo, mostrar “Próximamente”.
3. Manejo de loading/error.

**Estado:** Not started (mobile)

---

#### US-M4-02 — Crear torneo
**Como** organizador  
**Quiero** crear un torneo con preset + formatParameters  
**Para** organizar competencias.

**Endpoints**
- `POST /api/v1/tournaments`

**Criterios de aceptación**
1. Form de torneo mapea `formatParameters` según preset (UI dinámica).
2. Validación de parámetros y error mapping.
3. Navega al detalle del torneo.

**Estado:** Not started (mobile)

---

#### US-M4-03 — Detalle de torneo + scoreboard
**Como** jugador  
**Quiero** ver el detalle y posiciones  
**Para** seguir el progreso del torneo.

**Endpoints**
- `GET /api/v1/tournaments/{tournamentId}/scoreboard`

**Criterios de aceptación**
1. Vista detalle: meta + estado + tabs “Schedule / Tabla” (si aplica).
2. Scoreboard ordenado, con highlight de mi usuario.
3. Loading/empty/error.

**Estado:** Not started (mobile)

---

#### US-M4-04 — Schedule genérico de torneo (generate + get)
**Como** organizador  
**Quiero** generar y consultar el schedule del torneo  
**Para** publicar rondas y canchas.

**Endpoints**
- `POST /api/v1/tournaments/{tournamentId}/schedule:generate`
- `GET /api/v1/tournaments/{tournamentId}/schedule`

**Criterios de aceptación**
1. Botón “Generar schedule” (con confirm) y feedback de progreso.
2. Render de rondas (lista por ronda) con estados.
3. Si el backend responde `501` (formato no soportado), mostrar “Próximamente” y fallback a scoreboard.

**Estado:** Not started (mobile)

---

### M5 — Chat

#### US-M5-01 — Chat por partida (listar + enviar)
**Como** participante  
**Quiero** chatear en la partida  
**Para** coordinar sin salir de la app.

**Endpoints**
- `GET /api/v1/matches/{matchId}/chat/messages`
- `POST /api/v1/matches/{matchId}/chat/messages`

**Criterios de aceptación**
1. UI tipo chat: burbujas + timestamps + input fijo.
2. Envío muestra estado (sending/failed).
3. Paginación o carga incremental si aplica.

**Estado:** Not started (mobile)

---

#### US-M5-02 — Chat por torneo (listar + enviar)
**Como** participante  
**Quiero** chatear en el torneo  
**Para** coordinar rondas y anuncios.

**Endpoints**
- `GET /api/v1/tournaments/{tournamentId}/chat/messages`
- `POST /api/v1/tournaments/{tournamentId}/chat/messages`

**Criterios de aceptación**: igual a US-M5-01.

**Estado:** Not started (mobile)

---

### M6 — Notificaciones

#### US-M6-01 — Inbox de notificaciones (listar + marcar leído)
**Como** usuario  
**Quiero** ver mis notificaciones y marcarlas como leídas  
**Para** no perderme eventos importantes.

**Endpoints**
- `GET /api/v1/users/me/notifications`
- `POST /api/v1/users/me/notifications/{deliveryId}/read`
- `POST /api/v1/users/me/notifications/read-all`

**Criterios de aceptación**
1. Lista con tabs (Todas / No leídas), unread dot.
2. “Marcar leídas” por item y “Marcar todas”.
3. Estados loading/empty/error.

**Estado:** Not started (mobile)

---

#### US-M6-02 — Preferencias por tipo (enabledTypes)
**Como** usuario  
**Quiero** activar/desactivar tipos de notificación  
**Para** controlar lo que recibo.

**Endpoints**
- `GET /api/v1/users/me/notification-subscriptions`
- `PATCH /api/v1/users/me/notification-subscriptions/{id}`

**Criterios de aceptación**
1. Pantalla de preferencias con toggles por tipo.
2. Guardado persistente y feedback.
3. Si un tipo no está disponible, se muestra deshabilitado.

**Estado:** Not started (mobile)

---

#### US-M6-03 — Gestión de device push tokens (MVP)
**Como** app  
**Quiero** registrar tokens de push en el backend  
**Para** habilitar push notifications cuando estén operativas.

**Endpoints**
- `POST /api/v1/users/me/device-push-tokens`
- `DELETE /api/v1/users/me/device-push-tokens/{id}`

**Criterios de aceptación**
1. En login/arranque registra token si existe.
2. En logout elimina token registrado.
3. Maneja fallback si permisos de notificación no otorgados.

**Estado:** Not started (mobile)

---

### M7 — Perfil/Ranking

#### US-M7-01 — Perfil “me” + editar datos básicos
**Como** usuario  
**Quiero** ver y editar mis datos  
**Para** mantener mi perfil actualizado.

**Endpoints**
- `GET /api/v1/users/me`
- (si aplica) update en el mismo recurso

**Criterios de aceptación**
1. Pantalla Perfil como en referencia (avatar + métricas + secciones).
2. Edición básica con validación.
3. Loading/error.

**Estado:** Not started (mobile)

---

#### US-M7-02 — Perfil técnico + stats/ratings
**Como** usuario  
**Quiero** ver mi perfil técnico, stats y Elo/ratings  
**Para** entender mi performance.

**Endpoints**
- `GET/PATCH /api/v1/users/me/profile`
- `GET /api/v1/users/{userId}/stats`
- `GET /api/v1/users/{userId}/ratings`
- `GET /api/v1/users/{userId}/ratings/history`
- `GET /api/v1/ratings/leaderboard`

**Criterios de aceptación**
1. Render de stats/ratings con empty state si no hay data.
2. Leaderboard con mi posición resaltada (si aplica).
3. Loading/error.

**Estado:** Not started (mobile)

---

### M8 — Pagos

#### US-M8-01 — Crear obligaciones por match + ver summary
**Como** organizador  
**Quiero** crear obligaciones de pago y ver el resumen  
**Para** coordinar pagos entre jugadores.

**Endpoints**
- `POST /api/v1/matches/{matchId}/transactions/create-obligations`
- `GET /api/v1/matches/{matchId}/transactions/summary`

**Criterios de aceptación**
1. Pantalla “Gestión de pagos” (total por persona + estado por jugador).
2. Acciones disponibles según estado.
3. Loading/error.

**Estado:** Not started (mobile)

---

#### US-M8-02 — Confirmación manual + comprobantes
**Como** usuario  
**Quiero** subir/ver comprobantes y confirmar pagos manualmente  
**Para** cerrar el ciclo de cobro sin fricción.

**Endpoints**
- `POST /api/v1/transactions/{transactionId}/confirm-manual`
- `POST /api/v1/transactions/{transactionId}/receipt`
- `GET /api/v1/transactions/{transactionId}/receipt/{receiptId}`

**Criterios de aceptación**
1. Flujo “Subir comprobante” con selección de archivo.
2. Estado por jugador: pendiente / enviado / confirmado.
3. Manejo de errores de upload.

**Estado:** Not started (mobile)

---

### M9 — Geo/Sedes (post-MVP recomendado)

#### US-M9-01 — Búsqueda de lugares + detalle
**Como** admin/organizador  
**Quiero** buscar lugares y ver detalles  
**Para** vincular sedes correctamente.

**Endpoints**
- `GET /api/v1/geo/places/search`
- `GET /api/v1/geo/places/{placeId}`

**Criterios de aceptación**
1. Search con debounce + resultados.
2. Detalle con dirección normalizada.
3. Loading/error.

**Estado:** Not started (mobile)

---

#### US-M9-02 — Publicar y listar vacant hours (post-MVP)
**Como** usuario/club  
**Quiero** publicar horas vacantes y ver listados  
**Para** facilitar la reserva/organización.

**Endpoints**
- `POST /api/v1/vacant-hours/publish`
- `GET /api/v1/vacant-hours`
- `POST /api/v1/vacant-hours/{id}/cancel`

**Criterios de aceptación**
1. Form publish + listado + cancelación.
2. Loading/empty/error.
3. Filtros básicos.

**Estado:** Not started (mobile)

