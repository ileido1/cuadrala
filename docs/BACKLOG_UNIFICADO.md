# Backlog unificado — Cuádrala (Backend + Mobile)

**Propósito**: este archivo es la **única fuente de verdad** para:
- **Sprints** mobile, **API (backend)** y **web / backoffice** (plan por feature).
- **Historias** Backend `US-E*`, Mobile `US-M*`, Web `US-W*`, con estado y dependencias.

> Los documentos históricos están en `docs/archive/` (`BACKLOG_MOBILE.md`, `MOBILE_SPRINTS.md`). Los stubs en `docs/BACKLOG_MOBILE.md` y `docs/MOBILE_SPRINTS.md` solo redirigen. `docs/BACKLOG.md` sigue activo para US‑E*. Ver sección “Migración de docs”.

---

## Estado actual (resumen ejecutivo)

- **Mobile (Flutter)**: Auth + Onboarding + Shell + Home + Partidas (list + detalle) + Perfil + Notificaciones inbox + pagos/chat (MVP) **implementados y con tests/analyze en verde**.
- **Backend (API)**: base multi‑deporte, matches open + join, matchmaking suggestions, rankings/ratings, pagos (obligations/receipts) y notificaciones in‑app/preferencias **avanzado** (ver `US-E*`).
- **Reserva de cancha**: validación **sede + pista + solape + vacante** al crear/reprogramar partida (**`US-E2-05`**, backend Done); **consulta de horarios disponibles** (**`US-E4-06`**) y UX en app (**`US-M3-08`**) planificadas en **Sprint M19**.
- **Regla de producto (club)**: el cobro de **cancha** se alinea al **`Venue`** del `court` de la partida; la **validación del pago** la hace **solo el club** (staff del venue), no el organizador de la partida como autoridad de conciliación — backlog **`US-E8*`**, **`US-M8-03`**, **`US-W1-*`**.
- **Web (Next.js)**: backoffice club **implementado** en `apps/web` (`Sprint W1`: `US-W1-01`..`US-W1-05` **Done**; `US-W1-06` auditoría pendiente).

---

## 1) Sprints (plan y estado): Mobile, API, Web

### Sprints realizados (Done)

#### Sprint M1 — Fundaciones + Auth
- **US incluidas**: `US-M0-01`, `US-M0-02`, `US-M0-03`, `US-M1-01`, `US-M1-02`, `US-M1-03`
- **Estado**: **Done (front)** / **Done (back)** (auth backend en `US-E1-01`)

#### Sprint M2 — Home + Discovery de partidas
- **US incluidas**: `US-M2-01`, `US-M3-01`, `US-M3-02`
- **Estado**: **Done (front)** / **Done (back)** (`US-E2-02` + `GET /matches/{id}`)

#### Sprint M3 — Crear/Unirse/Ciclo de vida de partida
- **US incluidas**: `US-M3-03`, `US-M3-04`, `US-M3-05`
- **Estado**: **Done (front)** / **Parcial (back)** (en backend `US-E2-01` sigue parcial “muy avanzado”)

#### Sprint M4 — Resultados + Pagos (MVP)
- **US incluidas**: `US-M3-06`, `US-M8-01`, `US-M8-02`
- **Estado**: **Done (front)** / **Done (back MVP)** (`US-E5-01`, `US-E6-01..03`)

#### Sprint M6 — Chat + Notificaciones (MVP)
- **US incluidas**: `US-M5-01`, `US-M6-01`
- **Estado**: **Done (front)** / **Done (back MVP)** (`US-E7-01`, `US-E7-02 (in-app)`)

#### Sprint M7 — Perfil/Ranking (MVP)
- **US incluidas**: `US-M7-01`, `US-M7-02`
- **Estado**: **Done (front)** / **Done/Parcial (back)** (ratings/leaderboard `US-E5-03` parcial; stats básicos disponibles)

#### Sprint M10 — UI alineada a Mockup Sandbox (cuadrala-sport)
- **US incluidas (ajuste visual)**: `US-M0-02`, `US-M2-01`, `US-M3-01`, `US-M3-02`, `US-M6-01`
- **Estado**: **Done (front)** (alineación visual aplicada a pantallas core + `AppHeader` + bottom nav blur)

### Sprints en curso (In Progress)

#### Sprint M11–M13 — Onboarding “rich” (identidad / deportes / ubicación / disponibilidad)
- **US incluidas**:
  - `US-M10-01` Onboarding status + guard de rutas
  - `US-M10-02` Identidad (nombre, ciudad, avatar, teléfono WhatsApp, fecha de nacimiento)
  - `US-M10-03` Perfiles por deporte (`skill_level` por `sportId`, `side_preference`, `dominant_hand`)
  - `US-M10-04` Ubicación + radio (GPS + edición)
  - `US-M10-05` Disponibilidad semanal (slots)
- **Estado**: **Done (front/back) — UI/UX en refinamiento continuo**

> Nota: estas US no estaban enumeradas en los docs originales; se incluyen aquí para consolidar lo ya implementado.

### Sprints pendientes (Planned / Not started)

#### Sprint M19 — Disponibilidad de pistas (venue + court) — **Siguiente foco sugerido**
- **Objetivo**: el jugador **ve horarios libres** por sede/pista al publicar una partida; el backend ya **rechaza** reservas inválidas (**`US-E2-05`**).
- **US incluidas**:
  - **`US-E2-05`** Validación al crear/actualizar partida (`venueId`+`courtId`+`scheduledAt`, anti‑solape, alineación con `VacantHour` publicada, códigos `CANCHA_*` / `HORARIO_RESERVA_INCOMPATIBLE`) — **Done (back)**
  - **`US-E4-06`** API: listar **slots disponibles/ocupados** por `venueId` y/o `courtId` en rango `from`–`to` (granularidad y contrato en OpenAPI) — **Done (back)**
  - **`US-M3-08`** Crear partida: tras elegir sede y pista, mostrar **selector de horarios** alimentado por `US-E4-06` (estados vacío/error/carga) — **Done (front)** · depende `US-E4-06`
  - **`US-M3-09`** *(Opcional, mismo sprint)* Errores `CANCHA_OCUPADA` / `HORARIO_RESERVA_INCOMPATIBLE`: mensajes claros + CTA si existe `details.conflictingMatchId` (p. ej. ir al partido / unirse) — **Pendiente (front)**

#### Sprint M5 — Torneos (MVP)
- **US incluidas**: `US-M4-01`, `US-M4-02`, `US-M4-03`, `US-M4-04`
- **Estado**: **Parcial (front)** / **Parcial (back)** — crear torneo, detalle, scoreboard y schedule en app; **pendiente** listado/catálogo (`US-M4-01`, tab torneos sin listado completo)

#### Sprint M16 — Notificaciones “pro”
- **Alcance**:
  - Push segmentado (por tipo + opcional por geo/horario)
  - WhatsApp fallback **opcional** (si se define proveedor)
  - Recordatorios por horario/ubicación
  - Preferencias por tipo (UI + enforcement)
- **Estado**: **Parcial (front)** (inbox hecho) / **Parcial (back)** (preferencias por tipo done; push/recordatorios por schedule/geo pendiente)

#### Sprint M17 — Clubs / Sedes / Zonas de juego
- **Alcance**:
  - “Zonas” guardadas (radios múltiples, favoritos)
  - Búsqueda de clubes cercanos con maps provider real
  - Integración con onboarding (ubicación)
- **Estado**: **Pendiente (front/back)** (backend `US-E4-01/02` parcial; falta “zonas” como modelo de usuario)

#### Sprint M18 — Pagos al club (Mobile): datos del venue en el flujo de pago
- **Regla de negocio**: el cobro de cancha es **al club (venue)** asociado al `court` de la partida; **solo el club** valida el pago (no el organizador de la partida como autoridad de conciliación).
- **US incluidas**: `US-M8-03` (y opcional `US-M8-04`)
- **Dependencias**: `US-E8-01`, `US-E8-02` (instrucciones de transferencia en venue)
- **Estado**: **Pendiente (front)** / **Pendiente (back parcial)** — hoy el móvil no muestra datos bancarios por venue; `confirm-manual` aún sin política “solo club”.

#### Sprint E8 — Dueño de sede + conciliación (API / Backend)
- **US incluidas**: `US-E8-01` … `US-E8-06` (ver §3)
- **Objetivo**: modelo de **dueño/staff de sede**, **instrucciones de cobro por venue**, autorización de **confirmación de pago** solo por ese rol, listados para backoffice y ajuste de notificaciones al staff del club.
- **Estado**: **Done/Parcial** — core implementado y usado por `apps/web`; `US-E8-06` tests/OpenAPI y `US-W1-06` auditoría UI pendientes.

#### Sprint W1 — Backoffice Club (Web / Next.js)
- **US incluidas**: `US-W1-01` … `US-W1-06` (ver §2b)
- **Objetivo**: panel web para dueños de canchas (conciliación, ver comprobante, confirmar pago, editar datos de cobro del venue).
- **Estado**: **Done (front W1-01..W1-05)** / **Done (back E8 mínimo)** — repo `apps/web` activo en el monorepo.
- **Dependencias fuertes**: `US-E8-01`–`US-E8-04` mínimo (implementadas).

### Plan de despliegue ejecutado (resumen)

| Fase | API (E8) | Web (W1) | Estado |
|------|----------|----------|--------|
| **1** | `US-E8-01` dueño/staff en venue + migración | — | **Done** |
| **1** | `US-E8-02` datos de cobro del venue | — | **Done** |
| **1** | `US-E8-03` confirmación solo por staff del venue | — | **Done** |
| **2** | `US-E8-04` listado transacciones PENDING por sede | `US-W1-01`–`US-W1-02` auth + shell | **Done** |
| **3** | `US-E8-05` notificaciones a staff del venue | `US-W1-03`–`US-W1-04` lista + detalle + confirmar | **Done/Parcial** |
| **4** | `US-E8-06` OpenAPI + tests | `US-W1-05`–`US-W1-06` editar cobro + auditoría | **Parcial** (W1-05 Done; W1-06 pendiente) |

> **Nota**: la app **jugador** puede quedarse solo en “ver datos del club y subir comprobante”; la **conciliación** puede vivir **solo en web** en MVP. `US-M8-04` es opcional si el backoffice cubre todo el operativo.

---

## 2) Historias de usuario — Mobile (US-M*)

> **Fuente**: `docs/archive/BACKLOG_MOBILE.md` (histórico) + código en `apps/mobile/`. Este listado es el canonical.

### Fundaciones / Auth / Shell
- **US-M0-01** App shell y navegación base — **Done (front)**
- **US-M0-02** Tema Material 3 + tokens — **Done (front)**
- **US-M0-03** Cliente API + errores estándar — **Done (front)**
- **US-M1-01** Registro — **Done (front)**
- **US-M1-02** Login + sesión persistente — **Done (front)**
- **US-M1-03** Logout — **Done (front)**

### Home / Partidas
- **US-M2-01** Home “Tu resumen” — **Done (front)**
- **US-M3-01** Listado abiertas — **Done (front)**
- **US-M3-02** Detalle (read-only + acciones) — **Done (front)**
- **US-M3-03** Crear partida — **Done (front)**
- **US-M3-04** Unirse / salir — **Done (front)**
- **US-M3-05** Cancelar / iniciar / finalizar — **Done (front)**
- **US-M3-06** Proponer / confirmar resultado — **Done (front)**
- **US-M3-07** Sugerencias de matchmaking — **Done (front)** (`matchmaking_screen`; backend `GET /matchmaking/.../suggestions`)
- **US-M3-08** Crear partida: **horarios disponibles** por pista/sede (consume `US-E4-06`) — **Done (front)**
- **US-M3-09** Tratamiento UX de conflictos de reserva (`CANCHA_OCUPADA`, etc.) — **Pendiente (front)** *(opcional dentro de Sprint M19)*

### Torneos
- **US-M4-01** Catálogo deportes + presets + **listado** de torneos — **Pendiente (front)** (MVP: tab con placeholder “Próximamente: listado”; presets usados al crear)
- **US-M4-02** Crear torneo — **Done (front)** (`create_tournament_screen`)
- **US-M4-03** Detalle + scoreboard — **Done (front)** (`tournament_detail_screen`, scoreboard)
- **US-M4-04** Schedule genérico — **Done (front)** (fixture en detalle)

### Chat / Notificaciones
- **US-M5-01** Chat por partida — **Done (front)**
- **US-M5-02** Chat por torneo — **Done (front)** (`tournament_chat_screen`, read-only variant)
- **US-M6-01** Inbox notificaciones — **Done (front)**
- **US-M6-02** Preferencias por tipo — **Done (front)** (`notification_prefs_screen`)
- **US-M6-03** Device push tokens — **Pendiente (front)** (requiere proveedor push)

### Perfil / Ranking
- **US-M7-01** Perfil “me” + editar básicos — **Done (front)**
- **US-M7-02** Perfil técnico + stats/ratings — **Done (front)** (leaderboard avanzado puede quedar como mejora)

### Pagos
- **US-M8-01** Obligaciones + summary — **Done (front)**
- **US-M8-02** Comprobantes + flujo de espera (jugador); **confirmación** pasa a rol club vía API/backoffice — **Done (front)** / **Pendiente (regla negocio E8-03)**
- **US-M8-03** En el flujo de pago, mostrar **instrucciones de transferencia del `Venue`** ligado al `court` de la partida (no textos genéricos) — **Pendiente (front)** · requiere `US-E8-02`
- **US-M8-04** *(Opcional)* Rol “staff club” en app: bandeja mínima de pagos pendientes por sede — **Pendiente (front)** · requiere `US-E8-04`; *alternativa: solo `W1`*

### Geo / Sedes
- **US-M9-01** Búsqueda de lugares + detalle — **Pendiente (front)**
- **US-M9-02** Vacant hours publish/list/cancel — **Pendiente (front)**

### Onboarding (Rich)
- **US-M10-01..05** (ver Sprint M11–M13) — **Done (front/back)**

---

## 2b) Historias de usuario — Web / Backoffice Club (US-W1-*)

> **Stack real**: Next.js 14 (App Router), mismo JWT / API Cuádrala que mobile. Repo: `apps/web` en el monorepo.

- **US-W1-01** Scaffold Next.js + cliente API + login (NextAuth + credenciales contra API propia, alineado a `US-E1-01`) — **Done** (`apps/web/src/app/(auth)/login`, `apps/web/src/lib/auth.ts`)
- **US-W1-02** Shell backoffice (sidebar, selector de sede si el usuario tiene varias) — **Done** (`apps/web/src/app/dashboard/layout.tsx`, `apps/web/src/components/layout/sidebar.tsx`, `apps/web/src/contexts/venue-context.tsx`)
- **US-W1-03** Lista de pagos **PENDIENTE** asociados a partidos en **mis canchas** (usa `US-E8-04`) — **Done** (`apps/web/src/app/dashboard/payments/page.tsx`, `apps/web/src/components/payments/payments-list.tsx`)
- **US-W1-04** Detalle: ver jugador, monto, partido, enlace/descarga de **comprobante** + botón **Confirmar pago** (`US-E8-03`) — **Done** (`apps/web/src/components/payments/pending-payment-details.tsx`, `apps/web/src/components/payments/pending-payment-review-dialog.tsx`, `apps/web/src/components/payments/receipt-image-lightbox.tsx`)
- **US-W1-05** Formulario **datos de cobro del venue** (CRUD métodos de pago por venue; `US-E8-02`) — **Done** (`apps/web/src/app/dashboard/settings/page.tsx`, `apps/web/src/components/settings/PaymentMethodsSettings.tsx`)
- **US-W1-06** *(Fase 2)* Auditoría mínima: quién confirmó, timestamp (si el modelo de dominio lo permite) — **Pendiente** (no expuesta aún en UI)

---

## 3) Historias de usuario — Backend (US-E*)

> **Fuente**: `docs/BACKLOG.md`. Se conserva el detalle allí, pero el estado se referencia aquí.

- **E0** (deportes/presets/torneos parametrizables): `US-E0-01` **Done**, `US-E0-02` **Parcial**, `US-E0-03` **Done**
- **E1** (auth/perfil): `US-E1-01` **Done**, `US-E1-02` **Done**, `US-E1-03` **Parcial**
- **E2** (matches/discovery/join): `US-E2-01` **Parcial**, `US-E2-02` **Done**, `US-E2-03` **Done**, `US-E2-04` **Done**, `US-E2-05` **Done** (validación disponibilidad sede/cancha al crear o actualizar)
- **E3** (torneos): `US-E3-01` **Parcial**, `US-E3-02` **Done**, `US-E3-03` **Done**, `US-E3-04` **Parcial**
- **E4** (sedes/geo): `US-E4-01` **Parcial**, `US-E4-02` **Parcial**, `US-E4-03` **Done**, `US-E4-04` **Done**, `US-E4-05` **Pendiente**, `US-E4-06` **Done** (slots disponibles por venue/court)
- **E5** (resultados/ranking/elo): `US-E5-01` **Done**, `US-E5-02` **Done**, `US-E5-03` **Parcial**
- **E6** (pagos): `US-E6-01/02` **Cumplida**, `US-E6-03` **Done**
- **E7** (chat/notificaciones): `US-E7-01` **Done**, `US-E7-02` **Parcial**, `US-E7-03` **Done**
- **E8** (club / venue / conciliación): ver detalle debajo — **Done/Parcial** (core implementado; auditoría UI pendiente)

### E8 — Dueño de sede, cobro al venue y conciliación (detalle US-E8-*)

> **Principio**: el pago de la cancha se concilia contra los **datos de cobro del `Venue`** seleccionado en la partida (`match.court → venue`). **Solo** usuarios con rol de **club** sobre ese venue pueden **confirmar** una transacción manual.

- **US-E8-01** Modelar dueño/staff de sede: `VenueStaff` (`venueId`, `userId`, `role`), migración Prisma, seed opcional — **Done** (`services/api/prisma/schema.prisma`, `services/api/src/domain/ports/venue_staff_repository.ts`, `services/api/src/infrastructure/adapters/prisma_venue_staff_repository.ts`)
- **US-E8-02** Persistir **métodos de cobro del venue** (tipo, moneda, config bancaria/PagoMóvil) + lectura en contexto de partida/pago — **Done** (`VenuePaymentMethod` + `services/api/src/domain/ports/venue_payment_method_repository.ts`)
- **US-E8-03** Confirmación de transacción **solo** por staff del venue (`ConfirmTransactionAsVenueStaffUseCase`; `PATCH /venues/:venueId/transactions/:transactionId/confirm`) — **Done**
- **US-E8-04** `GET` (autenticado club) listado de transacciones **PENDING** por `venueId` (`GET /venues/:venueId/transactions/pending`) para backoffice — **Done**
- **US-E8-05** Notificaciones de comprobante / pago pendiente: destinatarios = **staff del venue** — **Parcial** (evento de pago confirmado notifica; cobertura completa de pending pendiente de validación)
- **US-E8-06** OpenAPI + tests contrato/integración para E8 — **Parcial/Done** (OpenAPI incluye endpoints; tests de integración y contrato presentes)

---

## 4) Migración de docs (unificación)

- `docs/BACKLOG.md`: debe incluir **US‑E8\*** (club/venue), **`US-E2-05`** / **`US-E4-06`** (disponibilidad) y referenciar este archivo como “plan integrado”.
- `docs/archive/BACKLOG_MOBILE.md`: **archivado** (lista histórica US-M*); stub en `docs/BACKLOG_MOBILE.md` redirige aquí.
- `docs/archive/MOBILE_SPRINTS.md`: **archivado**; stub en `docs/MOBILE_SPRINTS.md` redirige aquí.
- `docs/DESIGN_SYSTEM.md`: índice de tokens, tema y mockups (no duplica backlog).
- Sprints canónicos: solo en este archivo (**Sprint M19** = disponibilidad pistas).
- `docs/archive/TODO.md`: tablero histórico backend; stub en `docs/TODO.md`.

