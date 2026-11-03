# Quick Match: cancelar y banner en estado CONFIRMED (issues #121, #122)

Branch: `fix/quick-match-confirmed-cancel-and-banner`. Runner: `flutter test` en `apps/mobile/`.

## Specs

- **S1 (issue #121)**: la pantalla "Estamos formando el grupo" (`_Confirmed`, `status == 'CONFIRMED'` sin partido aún) solo ofrecía "Ver partida" (si `hasMatch`) y "Volver al inicio" (navegación pura, no cancela nada). Ningún botón cancelaba la búsqueda.
- **S2 (issue #122)**: el banner del home (`_visibleSearch`) ocultaba cualquier búsqueda en estado `CONFIRMED`, tratando "confirmé mi cupo, el grupo sigue formándose" igual que "ya existe partido, no hay nada que mostrar". `QuickMatchSearchDto` ya tiene el campo `proposal.matchId` para distinguir ambos casos.

## Tasks

| ID | Linked S# | Route | Status | Commit/Evidence |
|----|-----------|-------|--------|------------------|
| T1 | S1-S2 | inline (parent) | done | ver Log |

## Log

- **L1**: Usuario pidió "los bugs" del batch — #121 y #122, Quick Match.
- #121: agregué `onCancel` a `_Confirmed`, wireado a `QuickMatchCubit.cancel()` (ya existía, usado por "Salir de la cola" en `_Searching` — mismo patrón, sin diálogo de confirmación, consistente con la UX ya establecida). El botón solo se muestra `if (!hasMatch)` — una vez que existe partido, cancelar la búsqueda ya no tiene sentido.
- #122: `_visibleSearch` ahora solo oculta el banner cuando `status == 'CONFIRMED' && proposal?.matchId != null` (partido ya creado); mientras el grupo sigue formándose sin partido, el banner sigue mostrando "Tu búsqueda está activa".
- RED: tests nuevos en `quick_match_screen_test.dart` (botón "Salir de la cola" visible + tap llama a `repository.cancel()`) y `home_screen_test.dart` (nuevo grupo "Quick Match home banner — CONFIRMED visibility", con mock de `QuickMatchRepository` en `getIt` que el archivo no tenía registrado hasta ahora) — ambos fallan contra el código viejo → GREEN tras el fix.
- El golden `confirmed` de `quick_match_screen_golden_test.dart` usa `matchId: 'match-1'` (hasMatch=true), así que el botón nuevo queda oculto ahí — no hizo falta regenerar ningún golden.
- Regresión: `quick_match_screen_test.dart` + `quick_match_screen_golden_test.dart` (19/19), `home_screen_test.dart` (20/20). Suite completo: 1297/1297, `flutter analyze` limpio.
