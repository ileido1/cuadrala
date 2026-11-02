# Torneos: pestaña de jugador confirmado mal etiquetada "Calendario"

Branch: `fix/tournament-mis-partidos-tab-label`. Runner: `flutter test` en `apps/mobile/`.

## Specs

- **S1 (issue #123... #137 batch, específicamente #133)**: el handoff (`cuadrala-torneos.jsx:220,287`) llama "Mis partidos" a la segunda pestaña cuando el jugador tiene inscripción `CONFIRMED`. El código real usaba siempre `tournamentDetailTabLabels[1]` = "Calendario", sin importar el estado — aunque el contenido mostrado ya distinguía correctamente entre `_MyMatchesTab` (CONFIRMED) y `_ScheduleTab` (espectador/no confirmado) desde antes.
- **S2**: fix — el label de la segunda pestaña debe ser "Mis partidos" cuando `currentRegistration?.status == 'CONFIRMED'`, y seguir siendo "Calendario" en cualquier otro caso (espectador durante torneo IN_PROGRESS/COMPLETED).

## Tasks

| ID | Linked S# | Route | Status | Commit/Evidence |
|----|-----------|-------|--------|------------------|
| T1 | S1-S2 | inline (parent) | done | ver Log |

## Log

- **L1**: Issue #133 era parte del batch de 15 issues de UI/UX + logout documentados hoy. Usuario confirmó "si" para arrancar por este y #126.
- `tournamentDetailTabLabels` está documentado como "público a propósito: los tests navegan tocando estas etiquetas" (comentario preexistente en el archivo) — confirmé el blast radius completo antes de tocar nada: 4 asserts en `tournament_detail_screen_test.dart` y 14 referencias `tab: 'Calendario'` en el golden test, de las cuales exactamente 10 corresponden a registro `CONFIRMED` (deben pasar a "Mis partidos") y 4 a espectador no confirmado (`spectator_*`, quedan en "Calendario").
- RED: actualicé los 4 asserts del test unitario y los 10 `tab:` del golden test a "Mis partidos" primero, confirmé que fallan contra el código viejo → GREEN tras el fix (índice 1 del array de tabs ahora condicional en vez de usar la constante fija).
- Goldens regenerados (`--update-goldens`): 28 PNGs (14 casos × light/dark) — las 10 `calendar_*` del batch más `detail_confirmed`, `live_confirmed`, `table_own_highlight_guest`, `table_zero_results`, que también muestran el SegmentedControl visible aunque naveguen a otra pestaña. Verifiqué una por una que todas corresponden a `registration: 'CONFIRMED'` antes de aceptar el regen — ninguna sorpresa.
- Regresión: `tournament_detail_screen_test.dart` (65/65), `tournament_detail_golden_test.dart` (68/68). Suite completo: 1288/1288, `flutter analyze` limpio.
