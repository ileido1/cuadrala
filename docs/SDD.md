# SDD — App móvil de gestión de pádel (Fase 1: visión, especificación y diseño)

**Versión:** 1.1  
**Alcance de este documento:** Fase 1 del flujo spec-driven (sin implementación de código).  
**Stack objetivo:** React Native + Expo, Zustand, TanStack Query; backend Node.js + TypeScript + PostgreSQL + Prisma; Clean Architecture + Repository + SOLID.  
**Entorno de desarrollo:** Ubuntu.

---

## 1. Visión de producto

### 1.1 Propuesta de valor

Aplicación móvil multiplataforma (iOS/Android) para **organizar caimaneras y americanos**, gestionar **torneos y rankings por categorías**, y **emparejar jugadores por nivel** con herramientas para **cuadrar partidas con faltantes**, **descubrir partidas incompletas** (filtros por cancha, sede, precio por persona) y **coordinar con el grupo** sin salir de la app.

### 1.2 Objetivos medibles (orientativos para roadmap)

| Objetivo | Indicador sugerido |
|----------|-------------------|
| Reducir fricción al armar partidos | Tiempo medio desde “falta gente” hasta partido confirmado |
| Aumentar ocupación de canchas | % de partidos que pasan de incompleto a completo |
| Retención del organizador | Partidos/torneos creados por usuario activo mensual |
| Confianza en el matchmaking | Disputas reportadas / partidos jugados |

### 1.3 Fuera de alcance inicial (explícito)

- Custodia financiera completa desde día 1 (se inicia con modelo híbrido: ledger + confirmación manual y luego pasarela por fases).
- Streaming o video en vivo de partidos.
- Árbitros digitales o validación federativa oficial de resultados.

---

## 2. User personas

### 2.1 Organizador de torneos — «Marina»

| Aspecto | Descripción |
|---------|-------------|
| **Perfil** | Administra club o grupo recurrente; arma americanos y torneos por categorías. |
| **Necesidades** | Crear brackets/rotaciones, comunicar cambios, ver quién falta, cerrar inscripciones, publicar resultados y ranking. |
| **Frustraciones** | Grupos de WhatsApp desordenados, cambios de última hora, desbalance de niveles. |
| **Comportamiento en app** | Alta frecuencia en creación/edición de eventos, moderación de solicitudes de unión, uso de filtros de sede/cancha/precio para promover partidas abiertas. |

### 2.2 Jugador casual — «Diego»

| Aspecto | Descripción |
|---------|-------------|
| **Perfil** | Juega fines de semana; no organiza torneos grandes pero sí se apunta a partidas y americanos. |
| **Necesidades** | Ver partidas cercanas o en su sede, unirse cuando falta gente, saber nivel/categoría, coordinar hora y lugar con poco ruido. |
| **Frustraciones** | Quedarse fuera por desconocer partidas abiertas; niveles mal emparejados. |
| **Comportamiento en app** | Exploración de partidas incompletas, solicitudes de unión, chat o hilos por partido/torneo, actualización de disponibilidad. |

---

## 3. Historias de usuario y trazabilidad a requisitos

### 3.1 Leyenda de IDs

- **FR-*** — Requisito funcional.
- **NFR-*** — Requisito no funcional (detalle en sección 7).
- **US-*** — Historia de usuario (referencia para backlog).

### 3.2 MVP — historias principales

| ID | Historia | Criterio de aceptación (alto nivel) | Requisitos |
|----|----------|-------------------------------------|------------|
| US-M01 | Como **usuario**, quiero **registrarme e iniciar sesión** para **usar la app de forma personalizada**. | Autenticación estable; sesión recuperable; cierre de sesión. | FR-001, FR-002, NFR-SEC-01 |
| US-M02 | Como **jugador**, quiero **definir mi perfil y categoría/nivel** para **ser emparejado correctamente**. | Perfil editable; categoría o nivel visible según reglas del torneo/partido. | FR-003, FR-004 |
| US-M03 | Como **organizador**, quiero **crear un partido (caimanera/americano)** con **fecha, sede, cancha y cupo** para **convocar jugadores**. | Partido creado con estado (borrador/abierto/cerrado/cancelado); visible para invitados o lista según configuración. | FR-010, FR-011 |
| US-M04 | Como **jugador**, quiero **unirme o solicitar unirme** a un partido para **completar el cupo**. | Flujo de unión o solicitud; notificación al organizador si aplica. | FR-012 |
| US-M05 | Como **organizador**, quiero **crear un torneo por categorías** con **inscripciones** para **gestionar americanos o eliminatorias según formato**. | Torneo con fechas, sede, formato, categorías; jugadores inscritos por categoría. | FR-020, FR-021 |
| US-M06 | Como **sistema**, debo **registrar resultados y actualizar ranking por categoría** para **reflejar el desempeño**. | Introducción de resultados autorizada; ranking consultable y consistente con reglas definidas. | FR-030, FR-031 |
| US-M07 | Como **jugador**, quiero **matchmaking por nivel/categoría** para **jugar partidas equilibradas**. | Emparejamiento o restricción por categoría en torneo/partido; reglas configurables por organizador. | FR-040 |
| US-M08 | Como **integrante de un partido/torneo**, quiero **un canal de comunicación** para **coordinar hora, cambios y avisos**. | Mensajes asociados a entidad (partido/torneo); lista de participantes visible según privacidad. | FR-050, FR-051 |

### 3.3 Funcionalidades adicionales obligatorias (MVP ampliado o MVP+)

| ID | Historia | Criterio de aceptación (alto nivel) | Requisitos |
|----|----------|-------------------------------------|------------|
| US-A01 | Como **organizador o jugador**, quiero **marcar jugadores faltantes y cuadrar el partido** para **no cancelar por huecos**. | Estado “faltan X”; invitaciones o lista de suplentes; transición a “completo” cuando se cumple cupo. | FR-060, FR-061 |
| US-A02 | Como **jugador**, quiero **ver partidas incompletas** y **filtrar por cancha, sede y precio por persona** para **encontrar dónde unirme**. | Listado con filtros; datos de precio y sede coherentes con el partido. | FR-062, FR-063 |
| US-A03 | Como **jugador**, quiero **indicar disponibilidad** (franjas o días) para **que otros me propongan partidos**. | Disponibilidad guardada y usable en sugerencias o invitaciones (alcance según diseño de privacidad). | FR-064 |
| US-A04 | Como **grupo**, necesitamos **coordinación clara** (avisos, confirmaciones) **sin depender solo de chat externo**. | Notificaciones in-app o push para eventos clave; hilos por contexto. | FR-050, FR-065, NFR-OBS-01 |

### 3.4 Mapa de trazabilidad requisitos ↔ historias

| Requisito | Historias |
|-----------|-----------|
| FR-001 | US-M01 |
| FR-002 | US-M01 |
| FR-003 | US-M02 |
| FR-004 | US-M02 |
| FR-010 | US-M03 |
| FR-011 | US-M03 |
| FR-012 | US-M04 |
| FR-020 | US-M05 |
| FR-021 | US-M05 |
| FR-030 | US-M06 |
| FR-031 | US-M06 |
| FR-040 | US-M07 |
| FR-050 | US-M08, US-A04 |
| FR-051 | US-M08 |
| FR-060 | US-A01 |
| FR-061 | US-A01 |
| FR-062 | US-A02 |
| FR-063 | US-A02 |
| FR-064 | US-A03 |
| FR-065 | US-A04 |

---

## 4. Requisitos funcionales (catálogo)

| ID | Descripción |
|----|-------------|
| FR-001 | Registro de usuario con validación de identidad mínima (email/teléfono según política). |
| FR-002 | Inicio y cierre de sesión; gestión de tokens de acceso y refresco. |
| FR-003 | Perfil de usuario: nombre visible, avatar opcional, datos de contacto según privacidad. |
| FR-004 | Asignación y edición de nivel y/o categoría para matchmaking y torneos. |
| FR-010 | CRUD de partidos: tipo (caimanera/americano u otros definidos), sede, cancha, horario, cupo, precio por persona opcional. |
| FR-011 | Estados de partido: borrador, abierto, completo, en curso, finalizado, cancelado. |
| FR-012 | Unión a partido: directa o vía solicitud aprobada por organizador. |
| FR-020 | CRUD de torneos: nombre, fechas, sede, formato, categorías admitidas. |
| FR-021 | Inscripción de jugadores a torneo por categoría; cierre de inscripción. |
| FR-030 | Registro de resultados por partido o ronda según formato de torneo/partido. |
| FR-031 | Cálculo y consulta de ranking por categoría con reglas versionadas (puntos por victoria, etc.). |
| FR-040 | Reglas de emparejamiento: restricción por categoría/nivel; generación de cruces o rotaciones según tipo de evento. |
| FR-050 | Mensajería o comentarios por partido y por torneo (contexto acotado). |
| FR-051 | Lista de participantes y roles (organizador, jugador) con permisos diferenciados. |
| FR-060 | Indicación de plazas faltantes en partido; convocatoria de suplentes o lista de interesados. |
| FR-061 | Transición automática o manual de “incompleto” a “completo” al cubrir cupo. |
| FR-062 | Listado de partidos incompletos con información mínima (sede, hora, huecos). |
| FR-063 | Filtros: sede, cancha, rango de precio por persona. |
| FR-064 | Disponibilidad del usuario: franjas horarias y/o días preferentes. |
| FR-065 | Notificaciones por eventos: solicitud de unión, partido completo, cambio de horario, mensaje nuevo. |

---

## 5. Arquitectura del sistema

### 5.1 Vista lógica (capas)

- **Presentación (móvil):** pantallas Expo/React Native; estado UI y caché cliente con Zustand; datos remotos con TanStack Query.
- **API (backend):** HTTP/JSON (REST o RPC documentado); autenticación JWT (u OAuth2 si se amplía); validación de entrada; casos de uso orquestando reglas de negocio.
- **Dominio:** entidades y reglas (torneo, partido, ranking, matchmaking); sin dependencias de framework.
- **Infraestructura:** Prisma + PostgreSQL; adaptadores de repositorio; clientes de notificaciones push y almacenamiento de archivos si aplica.

### 5.2 Diagrama de componentes (texto)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENTE (React Native + Expo)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────────┐ │
│  │   Screens    │  │   Zustand    │  │   TanStack Query (+ HTTP API)   │ │
│  │  / navigation│  │  UI / session│  │   cache, retries, invalidation  │ │
│  └──────┬───────┘  └──────┬───────┘  └───────────────┬────────────────┘ │
│         │                  │                          │                   │
│         └──────────────────┴──────────────────────────┘                   │
└─────────────────────────────────┬─────────────────────────────────────────┘
                                  │ HTTPS (JSON)
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    API GATEWAY / HTTP SERVER (Node + TS)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────────┐ │
│  │  Controllers │→ │ Use Cases    │→ │ Domain Services (reglas)        │ │
│  │  (adaptadores│  │ (app layer)  │  │ ranking, matchmaking, torneo     │ │
│  │   entrada)   │  │              │  │                                │ │
│  └──────────────┘  └──────┬───────┘  └────────────────────────────────┘ │
│                           │                                              │
│                           ▼                                              │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │              Ports (interfaces) + Repository implementations        │ │
│  └──────────────────────────────┬─────────────────────────────────────┘ │
└─────────────────────────────────┼─────────────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          ▼                       ▼                       ▼
   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
   │ PostgreSQL  │         │ Push (FCM/  │         │ Storage     │
   │ (Prisma)    │         │ APNS)       │         │ (opcional)  │
   └─────────────┘         └─────────────┘         └─────────────┘
```

### 5.3 Flujo de datos (ejemplos)

**A) Listar partidos incompletos con filtros**

1. Pantalla invoca hook de TanStack Query → `GET /matches?status=incomplete&venueId=&courtId=&priceMin=&priceMax=`.
2. Controller valida query params → caso de uso `ListIncompleteMatches`.
3. Repositorio ejecuta consulta Prisma con índices en `status`, `venue_id`, `price_per_person`.
4. Respuesta DTO → caché en Query; Zustand solo para filtros UI y selección local.

**B) Registrar resultado y actualizar ranking**

1. Organizador confirma resultado → `POST /tournaments/:id/matches/:matchId/results`.
2. Caso de uso valida permisos y estado del torneo → persiste `match_result` y dispara `UpdateRankingForCategory`.
3. Transacción en BD; invalidación de caché de ranking en cliente vía Query.

**C) Coordinación y faltantes**

1. Jugador marca “faltan 2” o acepta convocatoria → actualización de `match` / `match_participant` / `substitute_invite`.
2. Evento interno → servicio de notificaciones envía push (NFR).

### 5.4 Decisiones de integración (resumen)

| Decisión | Opción recomendada |
|----------|-------------------|
| API | REST versionada (`/v1/...`) con OpenAPI. |
| Autenticación | JWT de corta duración + refresh; almacenamiento seguro en móvil (SecureStore). |
| Tiempo real | MVP: polling o refetch con Query; fase posterior: WebSocket para chat en vivo. |

---

## 6. Esquema de base de datos relacional (PostgreSQL)

### 6.1 Modelo conceptual (entidades principales)

| Entidad | Propósito |
|---------|-----------|
| `users` | Cuenta y perfil. |
| `user_profiles` | Datos extendidos (bio, foto URL). |
| `skill_levels` / `categories` | Catálogo de niveles y categorías de juego. |
| `user_category` | Nivel del usuario por categoría (histórico opcional con vigencia). |
| `venues` | Sedes/clubes. |
| `courts` | Canchas pertenecientes a una sede. |
| `matches` | Partidos (caimanera/americano); sede/cancha opcional; precio por persona; estado; cupos. |
| `match_participants` | Jugadores en un partido; rol; estado (confirmado, pendiente, lista de espera). |
| `match_spots` | Huecos explícitos (opcional si se modela por cupo numérico). |
| `substitute_requests` | Convocatorias cuando faltan jugadores (vinculadas a `match_id`). |
| `tournaments` | Torneos con formato y fechas. |
| `tournament_categories` | Categorías habilitadas en el torneo. |
| `tournament_registrations` | Inscripción de usuario a torneo + categoría. |
| `tournament_matches` o reutilizar `matches` con `tournament_id` | Partidos del torneo (según diseño: FK `matches.tournament_id` nullable). |
| `match_results` | Resultado por partido (sets/games/puntos según reglas). |
| `ranking_entries` | Snapshot o tabla acumulativa por torneo/categoría/temporada. |
| `availability_slots` | Disponibilidad recurrente o puntual del usuario. |
| `conversations` / `messages` | Hilos por partido o torneo; mensajes con autor y timestamps. |
| `notifications` | Cola o log de notificaciones para push e in-app. |

### 6.2 Esquema SQL de referencia (simplificado)

> Tipos y nombres ajustables en Prisma; incluye claves foráneas e índices sugeridos.

```sql
-- Usuarios y perfil
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE,
  phone           VARCHAR(32) UNIQUE,
  password_hash   VARCHAR(255), -- o delegar a proveedor OAuth
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_profiles (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name    VARCHAR(120) NOT NULL,
  avatar_url      TEXT,
  timezone        VARCHAR(64) DEFAULT 'America/Bogota'
);

CREATE TABLE categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(32) NOT NULL UNIQUE, -- ej. 'C', 'B', 'A'
  name            VARCHAR(120) NOT NULL,
  description     TEXT
);

CREATE TABLE user_category (
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id     UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  rating          NUMERIC(5,2), -- opcional ELO interno
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, category_id)
);

-- Sedes y canchas
CREATE TABLE venues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(200) NOT NULL,
  address         TEXT,
  city            VARCHAR(120),
  geo_lat         DOUBLE PRECISION,
  geo_lng         DOUBLE PRECISION
);

CREATE TABLE courts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id        UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name            VARCHAR(120) NOT NULL,
  surface         VARCHAR(64) -- opcional
);
CREATE INDEX idx_courts_venue ON courts(venue_id);

-- Partidos
CREATE TYPE match_type AS ENUM ('CAIMANERA', 'AMERICANO', 'FRIENDLY', 'OTHER');
CREATE TYPE match_status AS ENUM ('DRAFT','OPEN','INCOMPLETE','FULL','IN_PROGRESS','DONE','CANCELLED');

CREATE TABLE matches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id        UUID NOT NULL REFERENCES users(id),
  type                match_type NOT NULL,
  status              match_status NOT NULL DEFAULT 'DRAFT',
  title               VARCHAR(200),
  starts_at           TIMESTAMPTZ NOT NULL,
  ends_at             TIMESTAMPTZ,
  venue_id            UUID REFERENCES venues(id),
  court_id            UUID REFERENCES courts(id),
  max_players         INT NOT NULL CHECK (max_players > 0),
  price_per_person    NUMERIC(10,2),
  category_id         UUID REFERENCES categories(id), -- restricción de nivel opcional
  tournament_id       UUID NULL, -- FK definida tras crear tournaments
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_matches_status_time ON matches(status, starts_at);
CREATE INDEX idx_matches_venue ON matches(venue_id);
CREATE INDEX idx_matches_price ON matches(price_per_person);

CREATE TYPE participant_role AS ENUM ('ORGANIZER','PLAYER');
CREATE TYPE participant_state AS ENUM ('PENDING','CONFIRMED','WAITLIST','DECLINED');

CREATE TABLE match_participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id        UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            participant_role NOT NULL DEFAULT 'PLAYER',
  state           participant_state NOT NULL DEFAULT 'PENDING',
  UNIQUE (match_id, user_id)
);
CREATE INDEX idx_participants_match ON match_participants(match_id);

-- Faltantes / suplentes
CREATE TABLE substitute_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id        UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  requested_by    UUID NOT NULL REFERENCES users(id),
  spots_needed    INT NOT NULL CHECK (spots_needed > 0),
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ
);

-- Torneos
CREATE TABLE tournaments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID NOT NULL REFERENCES users(id),
  name            VARCHAR(200) NOT NULL,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ,
  venue_id        UUID REFERENCES venues(id),
  format          VARCHAR(64) NOT NULL, -- ej. 'ROUND_ROBIN', 'SINGLE_ELIM'
  status          VARCHAR(32) NOT NULL DEFAULT 'PLANNED'
);

ALTER TABLE matches
  ADD CONSTRAINT fk_matches_tournament
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE SET NULL;

CREATE TABLE tournament_categories (
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  category_id     UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (tournament_id, category_id)
);

CREATE TABLE tournament_registrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id     UUID NOT NULL REFERENCES categories(id),
  seed            INT,
  UNIQUE (tournament_id, user_id)
);
CREATE INDEX idx_treg_tournament ON tournament_registrations(tournament_id);

-- Resultados y ranking
CREATE TABLE match_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id        UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  reported_by     UUID NOT NULL REFERENCES users(id),
  payload         JSONB NOT NULL, -- estructura flexible: sets, parejas, etc.
  confirmed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ranking_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope           VARCHAR(32) NOT NULL, -- 'GLOBAL','VENUE','TOURNAMENT'
  scope_ref_id    UUID, -- nullable: tournament_id o venue_id
  category_id     UUID NOT NULL REFERENCES categories(id),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points          NUMERIC(10,2) NOT NULL DEFAULT 0,
  matches_played  INT NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scope, scope_ref_id, category_id, user_id)
);

-- Disponibilidad
CREATE TABLE availability_slots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday         SMALLINT, -- 0-6 si recurrente
  starts_at       TIME,
  ends_at         TIME,
  specific_date   DATE,     -- opcional para one-shot
  timezone        VARCHAR(64) NOT NULL DEFAULT 'America/Bogota'
);
CREATE INDEX idx_avail_user ON availability_slots(user_id);

-- Coordinación / mensajería
CREATE TYPE conversation_scope AS ENUM ('MATCH','TOURNAMENT');

CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope           conversation_scope NOT NULL,
  match_id        UUID REFERENCES matches(id) ON DELETE CASCADE,
  tournament_id   UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  CHECK (
    (scope = 'MATCH' AND match_id IS NOT NULL AND tournament_id IS NULL) OR
    (scope = 'TOURNAMENT' AND tournament_id IS NOT NULL AND match_id IS NULL)
  )
);

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id),
  body            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_conv ON messages(conversation_id, created_at);
```

### 6.3 Notas de diseño

- **Partidos dentro y fuera de torneo:** `matches.tournament_id` nullable unifica modelado y consultas de “partidas incompletas” con los mismos filtros.
- **Ranking:** `scope` permite ranking global, por sede o por torneo sin duplicar tablas.
- **Mensajes:** conversación única por partido/torneo (creación lazy al primer mensaje).

---

## 7. Estructura de carpetas propuesta

### 7.1 Frontend (`mobile/` o `apps/mobile/`)

```
apps/mobile/
├── app/                    # Expo Router (o src/navigation si no Router)
├── src/
│   ├── presentation/       # screens, components, hooks de UI
│   ├── application/        # casos de uso del cliente, mappers
│   ├── domain/             # tipos de dominio, reglas puras si aplica
│   ├── infrastructure/     # apiClient, storage, analytics
│   ├── state/              # stores Zustand
│   └── config/             # env, feature flags
├── assets/
└── app.json
```

### 7.2 Backend (`api/` o `services/api/`)

```
services/api/
├── src/
│   ├── presentation/       # controllers, validators (HTTP)
│   ├── application/        # use cases, DTOs, orquestación
│   ├── domain/             # entities, value objects, domain services, ports
│   ├── infrastructure/     # prisma, repositories, push, clock
│   └── config/             # env, logger
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/
│   ├── unit/
│   └── integration/
└── package.json
```

**Principio:** dependencias hacia dentro (`domain` sin imports de infra); adaptadores en `infrastructure` implementan interfaces de `domain`/`application`.

---

## 8. Requisitos no funcionales y criterios de aceptación de alto nivel

| ID | Área | Requisito | Criterio de aceptación (alto nivel) |
|----|------|-----------|-------------------------------------|
| NFR-SEC-01 | Seguridad | Autenticación y autorización por rol/recurso. | Acceso a acciones de organizador solo para dueños/organizadores; IDs UUID no enumerables expuestos con rate limiting. |
| NFR-SEC-02 | Seguridad | Datos personales minimizados y trazables. | Política de retención documentada; consentimiento para notificaciones; logs sin PII sensible. |
| NFR-PERF-01 | Rendimiento | Listados paginados y calientes. | Partidos/torneos con paginación cursor-based; tiempo de respuesta p95 objetivo \< 500 ms en LAN de referencia para listas. |
| NFR-PERF-02 | Rendimiento | Consultas geo opcionales. | Si se usa mapa, índices geoespaciales o bounding box en `venues`. |
| NFR-OBS-01 | Observabilidad | Trazas y métricas en API. | Correlation ID por request; logs estructurados; healthcheck `/health`. |
| NFR-OBS-02 | Observabilidad | Errores comprensibles en cliente. | Códigos de error estables documentados en OpenAPI; mensajes de usuario en español. |
| NFR-SCALE-01 | Escalabilidad | API stateless. | Sesión en JWT; posibilidad de escalar horizontalmente el servicio Node. |
| NFR-SCALE-02 | Escalabilidad | BD normalizada y migraciones versionadas. | Prisma migrate; backups automatizados (operación). |
| NFR-UX-01 | UX | Offline parcial opcional en MVP+. | TanStack Query con stale time y reintentos; mensajes de conectividad claros. |

**Trazabilidad NFR ↔ historias (ejemplos):** US-M01 → NFR-SEC-01; US-A02 → NFR-PERF-01; US-A04 → NFR-OBS-01, NFR-OBS-02.

---

## 9. Backlog inicial priorizado por fases

### Fase 0 — Cimientos

| Prioridad | Ítem | Historias / FR |
|-----------|------|----------------|
| P0 | Repos monorepo o multirepo, CI básico, lint, format | — |
| P0 | Esquema Prisma inicial + migraciones | FR-001–004 base |
| P0 | Autenticación API + cliente móvil (SecureStore) | US-M01, FR-001, FR-002 |

### Fase 1 — MVP core

| Prioridad | Ítem | Historias / FR |
|-----------|------|----------------|
| P0 | Perfil y categorías | US-M02, FR-003, FR-004 |
| P0 | Partidos: crear, listar, unirse | US-M03, US-M04, FR-010–FR-012 |
| P0 | Torneos e inscripciones | US-M05, FR-020, FR-021 |
| P0 | Resultados y ranking básico | US-M06, FR-030, FR-031 |
| P1 | Matchmaking por categoría en partido/torneo | US-M07, FR-040 |
| P1 | Conversaciones por partido/torneo | US-M08, FR-050, FR-051 |

### Fase 2 — Funcionalidades obligatorias adicionales

| Prioridad | Ítem | Historias / FR |
|-----------|------|----------------|
| P0 | Faltantes y cuadrar partido (convocatoria/suplentes) | US-A01, FR-060, FR-061 |
| P0 | Partidas incompletas + filtros sede/cancha/precio | US-A02, FR-062, FR-063 |
| P1 | Disponibilidad del jugador | US-A03, FR-064 |
| P1 | Notificaciones push + in-app | US-A04, FR-065, NFR-OBS-01 |

### Fase 3 — Post-MVP

| Prioridad | Ítem | Notas |
|-----------|------|--------|
| P2 | Pagos compartidos / reservas con club | Integración externa, compliance |
| P2 | WebSockets para chat en tiempo real | Sustituir polling |
| P2 | Rankings avanzados (ELO, temporadas) | Reglas configurables |
| P2 | Moderación y reportes | Contenido y usuarios |
| P2 | Analytics de producto | Embudos, retención |

---

## 10. Estrategia de monetización, wallet y pagos

### 10.1 Opciones de monetización recomendadas (sin depender de ads)

| Modelo | Cómo gana dinero | Potencial | Complejidad | Recomendación |
|--------|------------------|-----------|-------------|---------------|
| Suscripción PRO (jugadores/organizadores) | Mensual por estadísticas avanzadas, exportes y beneficios competitivos | Alto | Media | **Sí, desde temprano** |
| Service fee por transacción | Comisión fija o % por cobro de partido/torneo | Muy alto | Alta | **Sí, por fases** |
| SaaS para clubes/sedes | Plan mensual por panel de reservas y operación | Alto | Media-Alta | **Sí, tras tracción B2C** |
| Fee por torneo premium | Cobro al organizador por automatización de americano/torneo | Medio-Alto | Baja-Media | **Sí, en MVP+** |
| Boost de visibilidad | Destacar partidos o torneos en listados | Medio | Baja | Opcional |
| Patrocinios de torneos | Marca patrocinadora por evento/categoría | Medio-Alto | Media | Sí, post-MVP |
| Marketplace de servicios | Comisión por clases, encordado, etc. | Alto | Alta | Post-MVP |
| Insights agregados B2B | Reportes anónimos de demanda por sede/horario | Medio | Media | Post-MVP |

### 10.2 Modelo recomendado para Venezuela (estrategia híbrida)

**Recomendación:** iniciar con **Opción C (híbrido escalonado)**.

- **Etapa 1 (rápida adopción):** FREE para descubrir y unirse a partidas + ledger de "quién debe a quién" + confirmación manual.
- **Etapa 2 (monetización temprana):** plan **PRO** para estadísticas avanzadas y prioridad en partidas con faltantes.
- **Etapa 3 (escalado):** pasarela integrada para cobros en torneos/americanos + service fee parametrizable.

**Por qué esta opción:** reduce fricción de pago al inicio, valida comportamiento real y permite activar comisiones cuando ya existe confianza y volumen.

### 10.3 Historias de usuario de monetización

| ID | Historia | Criterio de aceptación (alto nivel) | Requisitos |
|----|----------|-------------------------------------|------------|
| US-P01 | Como organizador, quiero definir monto por persona y ver quién pagó para cerrar el evento sin fricción. | Estado de pago por integrante y total pendiente visibles. | FR-070, FR-071 |
| US-P02 | Como jugador, quiero confirmar pago manual o integrado para actualizar mi estado en el partido. | Cambios de estado auditables y consistentes. | FR-071, FR-072 |
| US-P03 | Como usuario PRO, quiero estadísticas avanzadas y prioridad en partidas incompletas para mejorar mi experiencia competitiva. | Features premium restringidas por plan. | FR-074, FR-075 |
| US-P04 | Como admin financiero, quiero conciliar transacciones y detectar discrepancias para operar con control. | Reporte de conciliación y trazabilidad por transacción. | FR-076, NFR-PAY-03 |
| US-P05 | Como sistema, quiero aplicar fee parametrizable por contexto (sede/torneo/tipo) para monetizar de forma flexible. | Preview del fee y cálculo final consistentes. | FR-073 |

### 10.4 Requisitos funcionales adicionales (monetización)

| ID | Descripción |
|----|-------------|
| FR-070 | Módulo de wallet/ledger para registrar obligaciones y movimientos financieros por usuario y evento. |
| FR-071 | Entidad `transactions` para registrar pagos por usuario/partido/torneo con estado (`PENDING`, `CONFIRMED`, `FAILED`, `REFUNDED`). |
| FR-072 | Confirmación de pago manual y/o integrada con adaptadores de pasarela. |
| FR-073 | Reglas de comisión (`fee_rules`) parametrizables por porcentaje y/o fijo, con vigencia y ámbito. |
| FR-074 | Roles de suscripción en usuario: `FREE`, `PRO` (extensible), con control de funcionalidades premium. |
| FR-075 | Prioridad de visibilidad para PRO en partidas con faltantes (ventana configurable). |
| FR-076 | Conciliación de transacciones (manual o automática) para control operativo y auditoría. |
| FR-077 | Flujo de reembolsos y ajustes con trazabilidad de origen. |

### 10.5 Requisitos no funcionales adicionales (pagos y finanzas)

| ID | Área | Requisito | Criterio de aceptación |
|----|------|-----------|------------------------|
| NFR-PAY-01 | Integridad | Idempotencia en creación/actualización de transacciones | No se duplican cobros ante reintentos |
| NFR-PAY-02 | Seguridad | No almacenar PAN/CVV; tokenizar métodos de pago | Cumplimiento mínimo PCI mediante proveedor |
| NFR-PAY-03 | Auditoría | Ledger inmutable y ajustes con trazabilidad | Todo ajuste registra actor, motivo y timestamp |
| NFR-PAY-04 | Exactitud | Reglas de redondeo monetario por moneda | Cálculo de fees reproducible y verificable |
| NFR-PAY-05 | Operación | Conciliación periódica entre estados internos y externos | Reporte diario de diferencias y estado |

### 10.6 Arquitectura: módulo de pagos y suscripciones

Agregar al backend:

- `PaymentOrchestrator`: aplica `fee_rules`, crea `transactions`, emite eventos de pago.
- `LedgerService`: única puerta de escritura del libro mayor financiero.
- `PaymentGatewayAdapters`: interfaz por proveedor (manual, pasarela A, pasarela B).
- `WebhookHandler`: procesamiento idempotente de notificaciones externas (cuando aplique integración).
- `SubscriptionEntitlements`: control centralizado de capacidades `FREE` vs `PRO`.

Flujo resumido:

1. Se crea partido/torneo con monto base.
2. El sistema calcula fee (si aplica) y genera preview.
3. Al confirmar pago (manual o pasarela), se registra `transaction`.
4. Se actualiza estado de participante y se dispara notificación.
5. Conciliación valida coherencia operativa.

### 10.7 Ampliación del esquema relacional

Nuevas tablas recomendadas:

- `transactions`
- `wallets`
- `wallet_ledger`
- `fee_rules`
- `subscriptions`
- `plans`
- `payment_methods` (tokenizados)
- `refunds`
- `payment_reconciliations`
- `payouts` (cuando exista liquidación a organizadores/sedes)

Ajustes de tablas existentes:

- `users.subscription_type` (`FREE`, `PRO`) como campo inicial simple (migrable luego a relación con `subscriptions`).
- `matches.price_per_person` se mantiene como base de negocio; el cobro real se referencia en `transactions`.

### 10.8 Backlog actualizado de monetización

| Fase | Prioridad | Ítem |
|------|-----------|------|
| Fase 2 | P0 | `users.subscription_type` + gating de funcionalidades PRO |
| Fase 2 | P0 | `transactions` + confirmación manual + ledger base |
| Fase 2 | P1 | `fee_rules` y cálculo de service fee preview/final |
| Fase 3 | P0 | Integración pasarela (primer proveedor) + webhooks + conciliación |
| Fase 3 | P1 | Reembolsos y ajustes auditables |
| Fase 4 | P1 | SaaS para sedes y payouts automatizados |
| Fase 4 | P2 | Patrocinios y marketplace de servicios |

---

## 11. Compliance Venezuela para Wallet y Pagos

> Nota: esta sección es guía de producto/arquitectura y **no sustituye asesoría legal**.

### 11.1 Enfoque regulatorio por etapas (go-to-market seguro)

| Etapa | Modelo operativo | Riesgo regulatorio | Recomendación |
|------|-------------------|--------------------|---------------|
| Etapa A | "Quién debe a quién" + confirmación manual (sin custodia de fondos por la app) | Bajo-Medio | **Inicio recomendado** |
| Etapa B | Cobro integrado vía tercero autorizado (PSP/partner) sin custodia directa de la app | Medio | Siguiente paso |
| Etapa C | Custodia propia de fondos / wallet transaccional plena | Alto | Solo con estrategia legal y operativa madura |

### 11.2 Referencias normativas clave a validar con asesoría local

- Marco BCV para proveedores no bancarios de servicios de pago (PSP), incluyendo autorización y obligaciones operativas.
- Exigencias de supervisión/relación con sistema bancario para actores de medios de pago autorizados.
- Reglas de prevención LC/FT/FPADM y reportes ante autoridades competentes, según rol operativo.
- Normativa tributaria y facturación digital aplicable cuando se emitan comprobantes fiscales por medios digitales.

### 11.3 Checklist de cumplimiento por fase

| Fase | Checklist mínimo | Owner sugerido |
|------|------------------|----------------|
| Fase 2 (MVP) | Términos y condiciones claros (sin custodia), política de privacidad, registro de auditoría de confirmaciones manuales, trazabilidad de montos y moneda | Producto + Legal + Backend |
| Fase 3 (integración pasarela) | Due diligence del proveedor autorizado, contrato de tratamiento de datos, idempotencia en webhooks, conciliación diaria, flujos de reverso/reembolso | Backend + DevOps + Legal/Finanzas |
| Fase 4 (escala) | Modelo formal de liquidación a sedes/organizadores, controles anti-fraude, tablero de excepciones, preparación para auditoría externa | Finanzas + Riesgo + Ingeniería |

### 11.4 Requisitos de arquitectura para cumplimiento

- **No custodial por defecto en MVP:** el ledger refleja obligaciones y confirmaciones, no saldos bancarios custodiados por la app.
- **Ledger inmutable:** correcciones por asientos compensatorios, nunca sobrescritura de transacciones.
- **Idempotencia obligatoria:** claves de idempotencia para creación de cobros y recepción de eventos.
- **Separación de roles:** permisos específicos para soporte, finanzas y administradores de sede.
- **Evidencia operativa:** bitácora de cambios, motivo de ajustes y actor responsable.

### 11.5 Matriz de riesgos y mitigación

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Interpretación regulatoria incorrecta sobre custodia | Alto | Revisiones legales por hito (A/B/C) antes de habilitar nuevas capacidades |
| Disputas entre jugadores por pagos manuales | Medio | Evidencias de confirmación, estado de pago visible y reglas de disputas |
| Duplicidad de cobros/eventos | Alto | Idempotencia + reconciliación automática + alertas |
| Inconsistencia entre ledger y proveedor | Alto | Job de conciliación diaria y cola de excepciones |
| Incumplimiento tributario documental | Alto | Flujo de comprobantes/facturas con proveedor homologado cuando aplique |

### 11.6 Criterios Go/No-Go para activar cobro integrado

Activar pasarela integrada solo si se cumplen todos:

1. Contrato con proveedor autorizado y evaluación de riesgo legal completada.
2. Pruebas de idempotencia y conciliación con tolerancia de error definida.
3. Flujo de reembolsos y soporte operativo documentado (SLA interno).
4. Términos de uso y política de pagos actualizados y publicados.

---

## 12. Preparación para Fase 2 (TDD)

- Congelar contratos OpenAPI para `auth`, `matches`, `tournaments`, `ranking`, `conversations`.
- Definir fixtures de Prisma para tests de integración (torneo con categorías, partido incompleto con filtros).
- Criterios “Definition of Ready” para cada historia: datos de prueba, estados esperados, permisos.

---

**Fin del documento Fase 1.**
