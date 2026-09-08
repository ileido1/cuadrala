# Handoff: Flujo de torneos (épico #56 — las siete preguntas)

## Overview
Flujo completo de torneos para Cuádrala (padel, Venezuela, app móvil en español), construido sobre el rediseño existente de la app. Cubre las cuatro preguntas del jugador (¿puedo entrar? ¿estoy adentro? ¿cuándo y dónde juego? ¿cómo voy?) y las tres del organizador (quién se anotó y aceptarlo de un toque, el cuadro armado, "listo, avisale a todos"). El orden de las preguntas **es** el orden de la pantalla: la #1 vive antes del botón de inscripción, nunca después.

## About the Design Files
Los archivos de este bundle son **referencias de diseño hechas en HTML/React (Babel en el navegador)** — prototipos que muestran aspecto y comportamiento esperados, no código de producción para copiar. La tarea es **recrear estas pantallas en el entorno del proyecto real** (Flutter, en el caso de Cuádrala) usando sus patrones, widgets y librerías existentes. Los estilos inline y los `window.*` globals son andamiaje del prototipo, no arquitectura propuesta.

## Fidelity
**Alta fidelidad.** Colores, tipografía, espaciados, radios y copy son finales. El copy en español rioplatense/venezolano neutro está pensado y debe respetarse tal cual (es parte del diseño: "Te anotaste. Falta que te acepten.", "Confirmar 4 pendientes", etc.).

Frame de referencia: iPhone 402 × 874 px.

---

## Design Tokens

Ya existen en el proyecto (`.cz[data-theme]` en `Cuadrala App.html`). Sin cambios para torneos.

| Token | Dark | Light |
|---|---|---|
| `--green` | `#17A34A` | igual |
| `--lime` | `#C5FF00` | igual |
| `--green-bg` | `color-mix(green 15%, transparent)` | igual |
| `--bg` | `#0B1220` | `#F3F4F6` |
| `--bg-2` | `#0F172A` | `#FFFFFF` |
| `--surface` | `#131C2E` | `#FFFFFF` |
| `--surface-2` | `#1B2740` | `#F3F4F6` |
| `--line` | `rgba(255,255,255,.09)` | `#E5E7EB` |
| `--line-strong` | `rgba(255,255,255,.18)` | `#CBD2DC` |
| `--text` | `#F8FAFC` | `#0F172A` |
| `--muted` | `#94A3B8` | `#64748B` |
| `--muted-2` | `#5C6B85` | `#94A3B8` |

Rojo de error/bloqueo: `#F87171`. Ámbar de advertencia: `#F59E0B`.

Radios: botones/chips `12px`, tarjetas `18px` (`--radius-card`), tarjetas internas `14px`, pills `999px`.
Tipografía: Plus Jakarta Sans. Escala usada: 27/800 (título de pantalla), 19/800 (título de sheet), 17/800 (nombre de torneo), 15/700, 14.5/700 (nombre de persona), 13.5–12.5/600 (secundario), 11–12/800 uppercase letter-spacing .3–.4 (etiquetas de sección).
Sombra de acción primaria: `0 8px 20px rgba(23,163,74,.4)`; toast `0 10px 28px rgba(0,0,0,.35)`.
Precio: siempre dual — US$ grande (800) + Bs debajo en `--muted-2` 11.5/600. Tasa placeholder `BS_RATE = 40`; conectar a la tasa real.

---

## Screens / Views

### 1. Listado de torneos (tab nuevo "Torneos" en el bottom nav)
**Propósito:** responder la #1 sin abrir nada.
**Layout:** header `54px` de padding superior, título 27/800 + subhead 13.5 `--muted`, y a la derecha botón **Crear** (42px alto, verde, radio 12). Debajo, `Segmented` [Abiertos · Mis torneos]. Contenido en columna con `gap: 12`, padding lateral 20.

Elementos, en orden:
1. **Banner de invitación** (si hay una `PENDING`): fondo `color-mix(lime 12%, surface)`, borde lime 45%, icono en cuadrado lime 34px, título 14.5/800, cuerpo 13 `--muted`, link "Ver invitación →".
2. **Fila de organizador** (si el usuario organiza alguno): cuadrado lime con icono escudo, "Organizás Copa Cuádrala" + "4 inscriptos esperando que los aceptes", chevron.
3. **Chips de filtro** (sólo en "Abiertos"): "Mi categoría 7ma" (activo por defecto) y "Cerca".
4. **Tarjetas de torneo.**

**Tarjeta de torneo** (padding 14, `--radius-card`): fila superior con pill de estado + chip de categoría (lime si es la del usuario, gris si no) + chip de género + estado propio de inscripción a la derecha ("Adentro"/"Pendiente"). Nombre 17/800. Debajo, en una fila que envuelve con `gap: 4px 14px`, los dos datos que faltan de la #1: `📅 SÁB 12 Sep · 09:00` y `📍 Club Cuádrala · 1.2 km`, ambos 12.5/600 `--muted` con icono 14px. Pie: "11/16 inscriptos" + "cierra VIE" y barra de cupos de 5px (verde, gris si llena), y a la derecha el precio dual.

Pills de estado: `DRAFT` Borrador (gris), `OPEN` Inscripción abierta (verde sobre `--green-bg`), `IN_PROGRESS` En juego (texto `#15301a` sobre lime), `COMPLETED` Finalizado (gris), `CANCELLED` Cancelado (rojo 16%).

**Vacíos:** "Nada abierto en tu categoría / Quitá el filtro para ver el resto" y "Todavía no te anotaste a ninguno / Cuando te inscribas, va a aparecer acá", ambos con icono trofeo 30px centrado.

### 2. Detalle de torneo
**Propósito:** #1 completa y, cuando ya hay respuesta, la #2 arriba de todo.
**Layout:** `SheetHeader` (back + nombre + "Club Cuádrala · Masculino 7ma"). Si el usuario está confirmado o el torneo está en juego, aparece un `Segmented` [Info · Mis partidos · Tabla] pegado bajo el header sobre `--bg-2`. Cuerpo scrolleable con padding `16px 20px 130px`. Footer fijo (fondo sólido `--bg-2`, borde superior).

**Orden del cuerpo en Info:**
1. **Banner de estado de inscripción**, si existe: pendiente → ámbar, "Te anotaste. Falta que te acepten." + "El organizador confirma los inscriptos. Te avisamos apenas quedés adentro — no tenés que volver a entrar." · confirmada → verde, "Estás adentro" + link "Ver mis partidos →".
2. **Bloque "¿Puedo entrar?"** — tarjeta con cuatro filas separadas por línea de 1px con sangría 60px. Cada fila: cuadro 34px radio 10 con icono, etiqueta 12/800 uppercase `--muted-2`, valor 15/700, sub 12.5.
   - **Nivel** — "Categoría 7ma · Masculino" / "Jugás 7ma. Podés entrar." con ✓ verde; si no califica, cuadro y sub en `#F87171` y candado a la derecha; **si viene por invitación (insc ≠ none), la fila vuelve a tono ok** con "Te invitaron: entrás aunque juegues 7ma".
   - **Inscripción** — precio dual a la derecha, sub "Por jugador, se paga al confirmar".
   - **Cuándo** — "SÁB 12 Sep · 09:00" / "Inscripción hasta VIE 11 Sep · 20:00".
   - **Dónde** — "Club Cuádrala, Las Mercedes" / "1.2 km de vos · organiza Club Cuádrala".
3. **"Cómo se juega"** — tres tarjetas iguales: Formato, Cuadro (16 jugadores), Anotados.
4. **Inscriptos** — `AvatarStack` + "7 confirmados" / "4 esperando al organizador".

**Footer según estado:**
- No inscripto y elegible: línea "Entrás como **pendiente** hasta que te acepten" + precio; botón verde 54px "Inscribirme".
- No elegible: botón deshabilitado "Es categoría 5ta · jugás 7ma" con candado.
- Inscripción cerrada: "Inscripción cerrada" con reloj.
- Pendiente: bloque gris con spinner "Esperando al organizador" + botón "Retirarme".
- Confirmado: "Ver cuándo y dónde juego" (lleva a la pestaña Mis partidos).

### 3. Mis partidos (#3)
Nota superior: "Sólo tus partidos. El cuadro completo está en **Tabla**." Tarjeta por partido: chip de ronda, bloque de fecha 62px (día 10.5/800 verde, hora 18/800, fecha 10.5), rival con avatar 30px y etiqueta "Rival", y línea de cancha con icono. Si el horario está propuesto, separador y pregunta "El organizador propuso este horario. ¿Te sirve?" con botones **Me sirve** (verde 44px) / **No puedo**. Al rechazar: "Avisamos al organizador. Va a reprogramar el partido y te llega el horario nuevo." Al aceptar: pill "Confirmado" en la cabecera de la tarjeta. Partidos futuros dependientes muestran chip "Depende del cuadro" y rival "Ganador C3".

### 4. Tabla (#4)
Línea "● Se actualiza sola al cargarse cada resultado". Tabla con cabecera `# / Jugador / PJ / PG / Pts` (11/800 uppercase). Fila propia resaltada con fondo `--green-bg`, nombre en 800 y sufijo "· vos". Posiciones 1–2 en verde. Debajo, botón secundario "Ver el cuadro completo".

### 5. Cuadro (bracket)
Rondas en columnas de 190px con scroll horizontal; título de ronda 11.5/800 uppercase. Tarjeta de partido: barra superior `--surface-2` con "Partido N" y estado ("EN JUEGO" verde / "Pendiente"), dos filas jugador+score separadas por línea; ganador en 800 con score verde, perdedor `--muted`; "Bye" y "Por definir" en `--muted-2`. El partido en juego lleva borde verde + halo `0 0 0 3px var(--green-bg)`. Nota al pie: "Los huéspedes (inscriptos sin cuenta) no entran al cuadro".
**Dos vacíos obligatorios**, centrados con icono en cuadro 56px:
- Formato no soportado (`400 FORMATO_NO_SOPORTADO`): "Este torneo no arma cuadro / El cuadro existe sólo para eliminación simple. Este torneo es round robin: seguí la posición en la tabla." Se deriva del formato del torneo, no de un flag manual.
- Menos de 2 confirmados (`400 VALIDACION_FALLIDA`): "Todavía no hay cuadro / Hacen falta al menos 2 inscriptos confirmados."

### 6. Invitación recibida
Pantalla completa: banner lime "Padel Country te invitó / Si aceptás quedás inscripto directo, sin esperar confirmación", y la misma tarjeta de cuatro datos (nivel, inscripción, cuándo, dónde) para que la #1 se responda también acá. Footer: **Rechazar** (secundario) / **Aceptar** (verde).

### 7. Panel del organizador — [Inscriptos · Cuadro · Publicar]
Header con subtítulo "Vos organizás este torneo" y badge lime "ORG"; `Segmented` fijo bajo el header.

**Inscriptos (#1 del organizador).** Tres contadores (Inscriptos / Confirmados / Pendientes; el de pendientes con borde y número verdes si hay). Botón verde ancho **"Confirmar N pendientes"** + nota "Un toque confirma a todos y les llega el aviso solo. No hace falta mandar nada." (cuando no quedan: "Todos confirmados. Cada uno ya recibió su aviso."). Lista agrupada con cabeceras "Pendientes · N" / "Confirmados · N" sobre `--surface-2`: avatar 38px, nombre, chip "HUÉSPED" cuando aplica, sub con categoría o teléfono, y a la derecha ✕ gris + ✓ verde (38px) o el estado "✓ Adentro". Debajo: botones **Huésped** e **Invitar**. Sección **Duplas** con acción "Armar dupla" y nota "Las duplas las armás vos. Confirmar a uno confirma también a su compañero." Sección **Invitaciones enviadas** con estado "Sin responder" / "Rechazó".
Toast verde tras cada acción: "4 confirmados. A todos les llegó el aviso."

**Cuadro (#2).** Si hay pendientes, banner ámbar "N sin confirmar quedan fuera / El cuadro se arma sólo con los confirmados. Confirmalos antes de generar o vas a tener que rehacerlo." con acción directa. Antes de generar: tarjeta centrada con trofeo, "Generar el cuadro", "Eliminación simple con los 7 confirmados con cuenta. Los huéspedes quedan fuera del cuadro." y botón "Generar cuadro y horarios". Después: banner verde + botones "Ver cuadro" / "Cargar resultado" y lista **Partidos de hoy** con ronda, jugadores, horario y cancha; resultado cargado a la derecha, botón "Cargar" en el que está en juego, y "Rafa T. no puede a las 11:30" en ámbar con botón "Mover".

**Publicar (#3).** Dos ejes **separados y nunca combinados**:
- "Quién lo ve": toggle **Torneo público** — "Aparece en el listado de la app" / "Sólo lo ven los que invitás".
- "Estado de la inscripción": `Segmented` [Borrador · Abierta · En juego] con explicación bajo cada valor.
- Caja informativa: "Son dos cosas distintas: **publicar no cierra la inscripción**, y cerrar la inscripción no despublica el torneo."
- Sección **Avisos**: tres filas de sólo lectura (confirmaciones enviadas, horarios enviados, invitaciones sin responder) y el cierre "No hay un botón de 'avisar a todos': el aviso sale solo con cada acción."

### 8. Crear torneo
Sheet a pantalla completa, subtítulo "Lo creás en borrador: nadie lo ve todavía". Campos en orden: Nombre (requerido), Cuándo arranca (`DateStrip` de 28 días), Dónde (tarjetas de sede seleccionables), Categoría (chips) + género (`Segmented`), Formato (`Eliminación simple` / `Round robin`, con nota que explica el efecto sobre el cuadro), Cupos (stepper 4–32), Inscripción (stepper 0–60 con Bs debajo), y toggle **Publicar al crear** (apagado = borrador). Footer fijo con resumen "Club Cuádrala · 7ma Masculino · 16 cupos" + precio, y botón "Crear borrador" / "Crear y publicar"; deshabilitado dice "Ponele nombre al torneo".

---

## Interactions & Behavior
- Navegación: tab Torneos → detalle / panel organizador / crear, todos como overlay a pantalla completa con `sheetUp .28s cubic-bezier(.3,.8,.3,1)`; los sheets modales suben igual con fondo `rgba(0,0,0,.5)` y `czFade .18s`.
- Transiciones de chips, toggles y tarjetas: `.14s–.22s`. Spinner del estado pendiente: `spin 1s linear infinite`.
- Toast del organizador: aparece abajo, se va solo a los 2.6 s.
- Confirmar (individual o en lote) actualiza la lista en el acto y muestra el toast; **no** existe una acción separada de "notificar".
- El botón "Retirarme" y el ✕ del organizador no piden confirmación en el prototipo: en producción, `DELETE` sí debería pedirla (borra en cascada).

## State Management
Por torneo, en el cliente:
- `insc: 'none' | 'PENDING' | 'CONFIRMED'` — gobierna banner, footer y aparición de las pestañas Mis partidos / Tabla.
- `tab: 'Info' | 'Mis partidos' | 'Tabla'`.
- `bracketState: 'ok' | 'format' | 'few'` — derivado de `formatPresetName !== 'SINGLE_ELIMINATION'` y de la cantidad de confirmados.
- Organizador: `rows` (inscripciones), `generated` (hay calendario), `status`, `visible`, `sheet` abierto, `toast`.
- `eligible = tournament.categoryId === user.categoryId || insc !== 'none'`.

## Mapa pantalla → endpoint

| Pantalla / acción | Endpoint |
|---|---|
| Listado, chips de filtro | `GET /tournaments` (`status`, `categoryId`, `venueId`, `page`, `limit`; schema `.strict()`) |
| Detalle | `GET /tournaments/:id` |
| Inscribirme | `POST /tournaments/:id/registrations` → siempre `PENDING` |
| Retirarme | `POST /tournaments/:id/registrations/:userId/withdraw` |
| Invitación aceptar/rechazar | `POST /tournaments/:id/invitations/:invitationId/respond` |
| Mis partidos | `GET /tournaments/:id/schedule/my-matches` |
| Me sirve / No puedo | `POST /tournaments/:id/schedule/rounds/:r/matches/:m/respond` |
| Tabla | `GET /tournaments/:id/scoreboard` |
| Cuadro | `GET /tournaments/:id/bracket` |
| Lista de inscriptos (org) | `GET /tournaments/:id/registrations` |
| ✓ individual | `PATCH /tournaments/:id/registrations/:registrationId` `{status:'CONFIRMED'}` |
| Confirmar N pendientes | `POST /tournaments/:id/registrations/confirm-pending` |
| ✕ | `DELETE /tournaments/:id/registrations/:registrationId` |
| Huésped | `POST /tournaments/:id/invite-guest` |
| Invitar / lista de invitaciones | `POST` y `GET /tournaments/:id/invitations` |
| Armar / deshacer dupla | `POST …/registrations/pairs` · `DELETE …/registrations/:id/pair` |
| Generar cuadro y horarios | `POST /tournaments/:id/schedule:generate` (dos puntos literales; llamar antes a `confirm-pending`) |
| Partidos de hoy | `GET /tournaments/:id/schedule` |
| Mover | `POST …/rounds/:r/matches/:m/reschedule` |
| Cargar resultado | `POST /tournaments/:id/matches/:matchId/results` |
| Estado / visibilidad | `PATCH /tournaments/:id/status` · `PATCH /tournaments/:id/visibility` |
| Crear torneo | `POST /tournaments` |

**Errores a dibujar:** `409 TORNEO_CERRADO` (toda escritura de inscripción fuera de `DRAFT`/`OPEN`), `409 ESTADO_INVALIDO` (invitación ya respondida), `409 INSCRIPCION_DUPLICADA`, `403 TORNEO_RESTRINGIDO` (huésped en torneo competitivo con costo), `400 FORMATO_NO_SOPORTADO` y `400 VALIDACION_FALLIDA` en bracket. El envelope es `{ success, message, data }` / `{ success, code, message, details }` — el `message` viene en español y sirve como texto de error.

## Endpoints sin usar y trabajo de API pendiente
Sin usar hoy: `GET /tournaments/venue/:venueId` (el listado global ya filtra por sede), `DELETE /invitations/:invitationId` (falta el gesto "cancelar invitación" en la lista de enviadas), `POST …/matches/:m/settle` (en la UI cerrar el turno y cargar el resultado son el mismo gesto), y el `chat` del torneo (no hay chat en el diseño).

Pendiente de API — bloquea lo diseñado:
1. **`inscriptionPrice` y sede en el DTO de listado y detalle.** La tarjeta y el bloque "¿Puedo entrar?" los muestran. Es el único bloqueo duro.
2. **Rechazar inscripción con rastro.** Hoy `PATCH` sólo acepta `CONFIRMED` y rechazar es `DELETE`.
3. **`GET /me/tournaments`.** "Mis torneos" filtra en cliente.
4. **PII en `GET /registrations`.** Devuelve `guestPhone`/`guestEmail` a cualquier autenticado; las pantallas del jugador no deben consumir esa ruta tal como está.
5. **`userId` desde la sesión, no del body** (issue #50). El diseño asume que uno se inscribe a sí mismo.

## Assets
Ninguno externo. Iconos: set de líneas propio en `cuadrala-ui.jsx` (`Icon`, 24×24, `currentColor`) — para torneos se agregaron `trophy`, `shield` y `trend`. Fotos de sede: placeholders rayados (`ImgPlaceholder`), el cliente debe usar las imágenes reales del club. Fuente: Plus Jakarta Sans (Google Fonts).

## Files
- `Cuadrala App.html` — entrada, tokens CSS, carga de scripts.
- `cuadrala-torneos.jsx` — listado, tarjeta, detalle, "¿Puedo entrar?", mis partidos, tabla, cuadro y sus vacíos.
- `cuadrala-torneo-org.jsx` — panel del organizador (inscriptos, cuadro, publicar), sheets (huésped, invitar, dupla, resultado), invitación del jugador, crear torneo.
- `cuadrala-app.jsx` — navegación, estado de inscripción, panel de tweaks.
- `cuadrala-ui.jsx` — primitivas (Icon, Card, Chip, Segmented, Toggle, Stepper, Price, Avatar, SheetHeader).
- `cuadrala-home.jsx` — bottom nav (donde vive el tab Torneos) y estilos `primaryBtn` / `secondaryBtn`.
- `cuadrala-screens.jsx` — datos demo de sedes y categorías, `DateStrip`.
- `ios-frame.jsx`, `tweaks-panel.jsx` — andamiaje del prototipo, **no** se portan.
