# Home: tag de superficie de cancha (Exterior/Cubierta)

Branch: `fix/home-match-card-surface-tag`. Runners: `npm test` en `services/api/`, `flutter test` en `apps/mobile/`.

## Specs

- **S1 (issue #126)**: el handoff (`cuadrala-home.jsx:27-30`) muestra en cada tarjeta de partido un tag de superficie (Exterior/Cubierta). El widget compartido `MatchCard` ya soportaba el parámetro `surfaceTag`, pero ningún caller lo pasaba — y el campo no existía end-to-end: ni en `OpenMatchDTO`/`MatchListItemDTO` del backend, ni en `OpenMatchDto` del mobile.
- **S2**: fix — exponer `surfaceType` (ya existe en el schema de `Court`, usado hoy solo para sedes/canchas) a través de las dos rutas que alimentan las tarjetas del home: `listOpenMatchesSV` (open matches / "Cerca de ti") y `listMyMatchesSV` (Mis partidas) — y conectarlo en `home_screen.dart`'s `_MatchCardFor`.

## Tasks

| ID | Linked S# | Route | Status | Commit/Evidence |
|----|-----------|-------|--------|------------------|
| T1 | S1-S2 | inline (parent) | done | ver Log |

## Log

- **L1**: Issue #126 era parte del batch de 15 issues de UI/UX + logout. Usuario confirmó "si" para arrancar con #126 y #133 (#133 ya mergeado, PR #138).
- Investigación: `surfaceType` ya existe en `Court` (schema.prisma:706) y ya se expone para sedes/canchas (`venues.controller.ts`), pero NUNCA llegaba a los endpoints de listado de partidos. Encontré que "Cerca de ti" y "Mis partidas" en el home usan DOS ecosistemas de DTO/mapper distintos en el backend: `OpenMatchDTO`/`computeOpenMatchDTOSV` (`prisma_match_repository.ts`, para `GET /matches/open`) y `MatchListItemDTO`/`toListItemDTO` (`prisma_match_query_repository.ts`, para `GET /matches/mine`) — hubo que tocar ambos para que las dos secciones del home (que comparten el mismo widget `_MatchCardFor`) queden consistentes.
- Descartado del alcance: `listMatchesSV` (endpoint genérico `GET /matches`, sin ningún dato de cancha seleccionado hoy — no lo usa el mobile para esto) y `getMatchByIdSV`/`listMatchesByVenueSV` (detalle de partido y listados de sede — otras pantallas, fuera del alcance de #126).
- RED: tests unitarios nuevos para `computeOpenMatchDTOSV` y `toListItemDTO` (exportado por primera vez para poder testearlo igual que su par, siguiendo el patrón ya establecido en `prisma_match_repository_mapper.test.ts`), más `OpenMatchDto.fromJson` (mobile) y un test de widget en `home_screen_test.dart` que confirma el badge "Exterior" se ve en pantalla. Todos fallan contra el código viejo (compilación o aserción) → GREEN tras el fix.
- Regresión: backend completo 1226/1226 (211 archivos), `npm run typecheck` y `npm run lint` limpios. Mobile: `test/features/matches/` + `test/features/home/` (143/143), suite completo 1292/1292, `flutter analyze` limpio.
