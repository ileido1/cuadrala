# UI/UX vs. handoff — batch 2: issues #123-#136 (10 enhancements)

Branch: `fix/handoff-ui-batch-123-124-125-127-128-130-131-132-134-136`. Runner: `flutter test` en `apps/mobile/`. Cinco unidades independientes, disjoint edit surfaces (auth, home, matches, tournaments, profile) — todas corridas en la MISMA rama/working tree por el patrón de parallel-writers; **los agentes no corrieron git**, el padre revisó cada diff y commiteó tras el seam check.

Excluidos del batch original de 12 (no son UI, son features ausentes que necesitan backend): **#129** (ELO antes/después — no existe el dato en ningún lado del backend), **#135** (Clubes favoritos — la feature de favoritos no existe en absoluto, ni modelo ni endpoints).

## Specs (agrupadas por unidad)

### T1 — Auth (#123, #124)
- **S1 (#123)**: `login_screen.dart` — mover el botón social de Google al principio (después de `AuthTabs`, antes del formulario), restaurar el copy del divider "o continuar con email" (handoff: `cuadrala-auth.jsx:226-268`).
- **S2 (#124)**: `register_screen.dart` — `_validateConfirm()` debe validar en vivo, sin esperar a `_showLocalErrors` (handoff: `cuadrala-auth.jsx:327-329`). Solo ese campo, los demás validadores conservan su gate.

Allowed edit surface: `apps/mobile/lib/src/features/auth/**`, `apps/mobile/test/features/auth/**`.

### T2 — Home (#125, #127)
- **S3 (#125)**: agregar el título "Actividad cerca de ti" entre `_HomeHeader` y `_QuickMatchHomeBanner` (handoff: `cuadrala-home.jsx:72-77`).
- **S4 (#127)**: agregar el icon tile (46×46, bolt) junto al título del hero — solo eso, sin tocar el layout de botones ni el callout de búsqueda activa (handoff: `cuadrala-home.jsx:79-99`).

Allowed edit surface: `apps/mobile/lib/src/features/home/**`, `apps/mobile/test/features/home/**`.

### T3 — Matches/Descubrir (#128, #130, #131)
- **S5 (#128)**: `match_detail_screen.dart` — footer de fases `pending`/`confirmed`: CTA primario pasa de "Compartir partida" (duplicada) a "Cargar resultado" (`Routes.matchResult`, reusa la misma navegación que la fase `played`); el botón cuadrado de compartir queda igual.
- **S6 (#130)**: `discover_matches_cubit.dart` — `load()` default `onlyAvailable: true` (antes `false`). El filtro de categoría/nivel queda como estaba (chip manual) — el cubit no tiene acceso al perfil del jugador sin agregar una dependencia nueva, fuera de alcance.
- **S7 (#131)**: `discover_matches_screen.dart` — estado vacío reemplazado por el widget compartido `EmptyState` ("Nada con esos filtros" / "Prueba otro día o crea tu propia partida." / CTA "Crear partida" → `showCreateMatchSheet`).

Allowed edit surface: `apps/mobile/lib/src/features/matches/**`, `apps/mobile/test/features/matches/**`.

### T4 — Torneos (#132, #134)
- **S8 (#132)**: `tournaments_home_screen.dart` — banner "Organizás {torneo}" siempre visible arriba de la lista cuando el viewer organiza al menos un torneo con inscripciones pendientes (agregación client-side sobre `myTournaments`, ya cargado — sin request nueva). Empate: se queda el primero encontrado.
- **S9 (#134)**: `create_tournament_screen.dart` — `AppBar` genérico reemplazado por `AppHeader` compartido, igual que el resto de la feature. Navegación de "volver" preservada.

Allowed edit surface: `apps/mobile/lib/src/features/tournaments/**`, `apps/mobile/test/features/tournaments/**`.

### T5 — Perfil (#136)
- **S10 (#136)**: `profile_screen.dart` — acceso directo de un toque a "Editar perfil" (reusa `Routes.onboarding`, el mismo destino que la fila ya existente dentro de Ajustes, que no se tocó).

Allowed edit surface: `apps/mobile/lib/src/features/profile/**`, `apps/mobile/test/features/profile/**`.

## Tasks

| ID | Linked S# | Route | Status | Commit/Evidence |
|----|-----------|-------|--------|------------------|
| T1 | S1-S2 | delegated (parallel writer, auth) | done | 39/39 tests, analyze limpio |
| T2 | S3-S4 | delegated (parallel writer, home) | done | 31/31 tests, analyze limpio |
| T3 | S5-S7 | delegated (parallel writer, matches) | done | 122/122 tests, analyze limpio |
| T4 | S8-S9 | delegated (parallel writer, tournaments) | done | 641/641 tests, analyze limpio; 28 goldens regenerados (verificados uno por uno: 26 por el swap de header, 2 por el nuevo banner en el escenario "mine") |
| T5 | S10 | delegated (parallel writer, profile) | done | 40/40 tests, analyze limpio |
| T6 | all | parent seam check + commits | done | suite completo 1313/1313, `flutter analyze` limpio |

## Log

- **L1**: Usuario confirmó "OK" al plan de agrupar las 12 issues de `enhancement` por módulo. Antes de lanzar, el padre descartó #129 y #135 del batch (no son fixes de UI, son features completas ausentes — #129 necesita cómputo/exposición de ELO que no existe en el backend; #135 necesita un modelo de "favoritos" que no existe en absoluto).
- 5 agentes en paralelo, cada uno con brief autocontenido (contexto del handoff, evidencia `file:line`, superficie de edición acotada, instrucción explícita de TDD y de no tocar git). Ninguno se desvió de su alcance; donde algo no era seguro de resolver sin ampliar alcance (categoría/nivel en #130, ícono en el EmptyState compartido de #131), lo reportaron explícitamente en vez de forzarlo.
- El padre revisó los 10 diffs de código uno por uno antes de commitear — sin sorpresas, todos acotados y consistentes con las convenciones existentes del repo (incluida la ortografía "inscritos" del handoff, correctamente citada y auditada por `tournaments_copy_audit_test.dart`).
- Seam check: `flutter analyze` limpio, suite completo 1313/1313.
