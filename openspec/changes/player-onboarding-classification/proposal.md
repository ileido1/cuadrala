# Proposal: Clasificación jugador en onboarding y perfil

## Intent

Completar el **perfil deportivo real** del jugador en onboarding y perfil: categoría por deporte (8va–1ra en raqueta; tiers en equipo), mano dominante y lado de cancha (drive/revés), alineado con validación de unión a partidas y matchmaking. Hoy el paso 2 mobile es genérico y la API usa `UserCategory` global sin `sportId`.

## Problem

| Síntoma | Causa raíz |
|---------|------------|
| Onboarding paso 2 solo Principiante/Intermedio/Avanzado (`skillLevel` 1.5/3.5/5.5) | `sport_profiles_page.dart` mapea 3 niveles fijos; `sidePreference` siempre `ANY` |
| No se pide mano dominante ni categoría 8va–1ra | Onboarding no llama `PATCH` profile con `dominantHand`; no asigna `UserCategory` |
| Unirse a partida falla o es incoherente | `JoinMatchUseCase` exige `UserCategory` exacta; onboarding no la crea |
| Perfil muestra "Diestro" siempre | `profile_screen.dart` hardcodea BRAZO |
| Categorías globales en catálogo | `Category` sin `sportId`; `UserCategory` sin deporte; `GET /categories` plano |
| Equipo vs raqueta mezclados | Misma escala numérica para FOOTBALL5, VOLLEY, etc. |

## Goals

1. **Onboarding completo (raqueta):** banda (Básico/Intermedio/Avanzado) + categoría ordinal (8va…1ra) + diestro/zurdo/ambidiestro + drive/revés por deporte seleccionado.
2. **Onboarding equipo:** exactamente **3** tiers — Recreativo / Intermedio / Competitivo (sin cuarto nivel; sin ordinales 8va–1ra).
3. **Categoría por deporte:** modelo `UserSportCategory` (o equivalente) y join match validado contra categoría del deporte del partido.
4. **Perfil veraz:** mostrar `dominantHand`, `sidePreference` y categoría por deporte desde API.
5. **Catálogo:** categorías seed/list filtrables por `sportId` o `sportCode`.
6. **Sin variantes "fuerza":** solo ordinales numéricos (1ra, 2da, … 8va); rechazar slugs tipo `1ra-fuerza`.

## Non-goals

- Reclasificación automática por ELO/ranking (solo autodeclarada en MVP).
- Onboarding web staff o edición masiva de categorías en admin UI.
- Torneos: migrar reglas de categoría en este cambio (solo asegurar DTOs compatibles).
- Matchmaking avanzado por mano/lado (solo persistir y exponer).
- Deprecar `skillLevel` en `PlayerSportProfile` en M1 (mantener derivado o legacy hasta spec de ranking).

---

## Options

### (a) Modelo de categoría por deporte

| Opción | Descripción | Pros | Contras |
|--------|-------------|------|---------|
| **A. `Category.sportId` + `UserSportCategory` (recomendada)** | Añadir `sportId` a `Category`; tabla `UserSportCategory(userId, sportId, categoryId)`; deprecar `UserCategory` tras migración | Join match claro; catálogo por deporte; torneos/partidas siguen `categoryId` | Migración datos; actualizar repos y seed |
| **B. Solo `UserSportCategory` sin `sportId` en Category** | Inferir deporte por convención de slug | Menos cambio en `Category` | Slugs frágiles; torneos ambiguos |
| **C. Ampliar `PlayerSportProfile` con `categoryId`** | Categoría embebida en perfil deportivo | Un solo write en onboarding | Duplica fuente de verdad con join match; rompe torneos que usan `Category` directo |

### (b) UX onboarding — paso deportes/nivel

| Opción | Descripción | Pros | Contras |
|--------|-------------|------|---------|
| **A. Un paso dinámico por deporte (recomendada)** | Tras elegir deportes, wizard secuencial o acordeón: banda → ordinal/tier → mano → lado (solo raqueta) | Un flujo; validación por deporte | UI más larga si muchos deportes |
| **B. Dos pasos fijos** | Paso 2a deportes; 2b clasificación (todos los seleccionados en una pantalla) | Separación mental selección vs detalle | Scroll largo; más páginas en `PageController` |
| **C. Mantener un nivel global + editar en perfil** | Status quo mejorado | Mínimo cambio UI | No cumple PO; join match sigue roto |

### (c) Bandas y mapeo a `skillLevel` / join

| Opción | Descripción | Pros | Contras |
|--------|-------------|------|---------|
| **A. Categoría canónica; `skillLevel` derivado (recomendada)** | Guardar `categoryId` por deporte; opcionalmente set `skillLevel` mid-band para ranking legacy | Join y torneos usan `categoryId`; compat ranking | Tabla de mapeo banda→skill en seed |
| **B. Solo `skillLevel`; inferir categoría** | Sin `UserSportCategory` | Menos tablas | Impreciso entre 6ta/5ta; join match incoherente |

---

## Recomendación

| Eje | Decisión | Rationale |
|-----|----------|-----------|
| Modelo | **A — `Category.sportId` + `UserSportCategory`** | PO exige categoría por deporte; partidas ya tienen `categoryId` + `sportId` |
| UX | **A — un paso dinámico por deporte** (sub-flujo dentro del paso 2) | Recoge banda + ordinal + mano + lado sin inflar a 5 páginas globales |
| Equipo | **Tiers propios** vinculados a categorías seed `recreativo` / `intermedio` / `competitivo` por `sportCode` | Sin 8va–1ra en FOOTBALL5, BASKETBALL3X3, VOLLEY_BEACH |
| Raqueta | **Bandas PO** → elección ordinal dentro de la banda; slugs `8va`…`1ra` | Sin variantes fuerza |
| Join | **`userHasCategoryForSportSV`** o validar categoría del usuario para `match.sportId` | Sustituye check global `UserCategory` |
| Mensajes | **Español** en UI y errores API; **inglés** en código | Convención monorepo |

**Ordinales raqueta (seed):** 8va, 7ma (Básico); 6ta, 5ta, 4ta (Intermedio); 3ra, 2da, 1ra (Avanzado). **Mano:** RIGHT/LEFT/AMBIDEXTROUS. **Lado cancha:** RIGHT=drive, LEFT=revés (alinear copy UI "Drive"/"Revés").

---

## Scope por fases

### M1 — Modelo y catálogo API (P0)

**Paquete:** `services/api`

**In scope**

- Prisma: `Category.sportId` (FK `Sport`, nullable temporal → NOT NULL tras seed); modelo `UserSportCategory` con `@@unique([userId, sportId])`.
- Migración: copiar filas `UserCategory` → `UserSportCategory` asignando deporte por heurística (ej. PADEL default) o script one-off documentado.
- Seed: categorías por deporte (raqueta ordinales; equipo tiers); prohibir slugs `*-fuerza`.
- `GET /categories?sportId=` (o `sportCode`); OpenAPI actualizado.
- `PUT /me/sport-categories` (replace por deporte o batch items).
- Deprecar escritura en `UserCategory`; lectura dual-read opcional una release.

**Out of scope**

- Cambios mobile.

### M2 — Onboarding API y join match (P0)

**Paquete:** `services/api`

**In scope**

- Extender onboarding: al completar sport profiles, aceptar `categoryId` por item o endpoint dedicado que upsert `UserSportCategory` + `dominantHand` en `PlayerProfile`.
- Validación Zod: raqueta exige `categoryId` ordinal del deporte; equipo exige tier válido; raqueta exige `sidePreference` ≠ ANY si PO lo marca obligatorio.
- `JoinMatchUseCase`: verificar categoría del usuario para el `sportId` del partido (no solo `userId`+`categoryId` global).
- Tests integración join + onboarding status.

**Out of scope**

- UI mobile.

### M3 — Onboarding mobile (P0)

**Paquete:** `apps/mobile`

**In scope**

- Refactor paso 2: tras multi-select deportes, sub-flujo por deporte (banda → categoría → mano → lado si raqueta).
- Llamadas: `PATCH /me/player-profile` (`dominantHand`); `PUT /me/sport-categories`; `REPLACE sport-profiles` con `sidePreference` y `skillLevel` coherente.
- Copy español según bandas PO; deshabilitar continuar si falta categoría en deporte raqueta seleccionado.
- Tests: `onboarding_cubit_test`, `sport_profiles_page` / flow widget.

**Out of scope**

- Edición avanzada de categoría en perfil (M4).

### M4 — Perfil y create match (P1)

**Paquetes:** `apps/mobile`, ajustes API menores si faltan GET agregados

**In scope**

- `profile_screen`: leer `dominantHand` del profile DTO; categorías por deporte en fichas deportivas.
- `create_match_screen`: filtrar categorías por deporte de la partida (`sportId` del contexto).
- Opcional: permitir cambiar categoría por deporte en perfil (misma UX banda→ordinal).

**Out of scope**

- Web jugador (si existe) — follow-up.

---

## Priorities

| ID | Prioridad | Paquete | Contenido |
|----|-----------|---------|-----------|
| M1 | **P0** | api | Schema, seed, GET/PUT categorías por deporte |
| M2 | **P0** | api | Onboarding writes + join match por deporte |
| M3 | **P0** | mobile | Onboarding clasificación completa |
| M4 | **P1** | mobile | Perfil + picker create match |

---

## Capabilities

### New Capabilities

- `api-user-sport-category`: modelo, migración, endpoints y repos de categoría por deporte.
- `api-player-onboarding-classification`: contratos onboarding (profile + sport categories + validación por tipo de deporte).
- `mobile-player-onboarding-classification`: UX paso 2 banda/ordinal/tier/mano/lado y persistencia.
- `mobile-player-profile-classification`: visualización y edición básica de clasificación en perfil.

### Modified Capabilities

- `mobile-player-alignment`: índice — añadir dependencia de onboarding clasificado (criterio de “onboarding completo”).
- Ningún spec de pagos/partidas alterado en reglas de negocio; join match es delta en capability nueva o spec de matches si existe.

---

## Approach

1. **API primero (M1→M2)** — sin mobile nuevo hasta existir `PUT` categorías y catálogo por deporte.
2. **Seed idempotente** — todas las categorías referenciadas en tests de join.
3. **Mobile M3** — feature `onboarding` + `catalog`; VO locales `SportClassificationKind` (racket vs team).
4. **TDD** — tests API join/onboarding Red antes de migración aplicada en CI con `TEST_DATABASE_URL`.
5. **Chained PRs** — M1 api → M2 api → M3 mobile → M4 mobile (≤400 líneas cada uno).

---

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `services/api/prisma/schema.prisma` | Modified | `Category.sportId`, `UserSportCategory` |
| `services/api/prisma/seed.ts` | Modified | Categorías por deporte y tiers |
| `services/api/src/domain/ports/user_category_repository.ts` | Modified/Replaced | Puerto sport-scoped |
| `services/api/src/application/use_cases/join_match.use_case.ts` | Modified | Validación por deporte |
| `services/api/src/presentation/validation/onboarding.validation.ts` | Modified | `categoryId`, reglas raqueta/equipo |
| `services/api/src/presentation/routes/catalog.router.ts` | Modified | Filtro `sportId` |
| `apps/mobile/lib/src/features/onboarding/presentation/pages/sport_profiles_page.dart` | Modified | Sub-flujo clasificación |
| `apps/mobile/lib/src/features/onboarding/data/` | Modified | DTOs y API calls |
| `apps/mobile/lib/src/features/profile/presentation/profile_screen.dart` | Modified | Quitar hardcode Diestro |
| `apps/mobile/lib/src/features/matches/presentation/create_match_screen.dart` | Modified | Categorías por deporte |
| `apps/mobile/lib/src/features/catalog/` | Modified | `listCategories(sportId)` |

---

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Migración `UserCategory` → `UserSportCategory` incorrecta | Med | Script con reporte; default PADEL documentado; rollback migration down |
| Usuarios existentes sin categoría no pueden unirse | High | Backfill en migración; onboarding incompleto redirige a paso 2 |
| Muchos deportes seleccionados alarga onboarding | Med | Acordeón + "misma categoría para todos" opcional SOLO si PO aprueba (default: no) |
| Torneos/listados usan categorías globales | Med | Mantener `categoryId` en Match; seed por deporte consistente |
| PR > 400 líneas | High | Cadena M1→M2→M3→M4 |
| Confusión drive/revés vs RIGHT/LEFT API | Low | Copy UI "Drive (derecha)" / "Revés (izquierda)"; tests de mapeo |

---

## Rollback Plan

1. **M1 migración:** `prisma migrate resolve` + down migration si existe; restaurar backup DB en staging.
2. **M2 API:** feature flag `JOIN_MATCH_SPORT_CATEGORY=false` → fallback `UserCategory` temporal (solo si dual-read implementado).
3. **M3/M4 mobile:** revert APK/build anterior; API backward-compatible (ignorar campos nuevos en clientes viejos).
4. **Seed:** revert commit seed; categorías huérfanas no bloquean runtime si FK opcional en transición.

---

## Dependencies

| Dependencia | Estado | Notas |
|-------------|--------|-------|
| `PlayerProfile.dominantHand`, `sidePreference` en API | **Hecho** | Mobile no los envía en onboarding |
| `PlayerSportProfile` | **Hecho** | Falta `categoryId` y reglas por deporte |
| `GET /categories` | **Hecho** | Falta filtro por deporte |
| `PUT` categorías usuario | **Pendiente** | M1 |
| Join match por categoría | **Hecho** (global) | Cambiar a por deporte en M2 |
| Specs mobile-player-alignment | **Hecho** | Extender criterio onboarding completo |

---

## Success Criteria

- [ ] Seed incluye categorías 8va–1ra por PADEL/TENNIS/PICKLEBALL y tiers por deportes equipo.
- [ ] `GET /categories?sportId=` devuelve solo categorías de ese deporte.
- [ ] Usuario tras onboarding tiene `UserSportCategory` por cada deporte raqueta/equipo seleccionado.
- [ ] Usuario raqueta con `dominantHand` y `sidePreference` distinto de default-only en DB.
- [ ] Join a partido PADEL 4ta falla con 403 si usuario solo tiene 6ta en PADEL (mensaje español).
- [ ] Join feliz cuando categoría coincide para el deporte del partido.
- [ ] Mobile paso 2 no envía `sidePreference: ANY` para raqueta sin elección explícita.
- [ ] Perfil muestra Zurdo/Ambidestro/Diestro según API, no hardcode.
- [ ] `flutter analyze` y `flutter test` verdes; API `typecheck` → `lint` → `test` verdes.
- [ ] No existen slugs `*-fuerza` en catálogo.

---

## Success metrics (Verifier)

| Métrica | Objetivo |
|---------|----------|
| Usuarios onboarding completado sin `UserSportCategory` | 0 en entorno de prueba post-M3 |
| Tests integración join por deporte | ≥ 2 escenarios (éxito + 403) |
| Defectos P0 clasificación post-release | 0 en 14 días |
| Líneas por PR | ≤ 400 o excepción documentada |

---

## Next steps

- **sdd-spec:** escenarios Given/When/Then por capability (`api-user-sport-category`, `mobile-player-onboarding-classification`, …).
- **sdd-design:** ERD Prisma, secuencia onboarding writes, wireframes sub-flujo por deporte, plan chained PRs.
- Ejecutar **sdd-spec** y **sdd-design** en paralelo tras aprobación PO.
