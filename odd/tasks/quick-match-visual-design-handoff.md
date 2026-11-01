# Quick Match — visual pass contra el design handoff real

Branch: `fix/quick-match-visual-design-handoff`. Runner: `flutter test` en `apps/mobile/`.

Handoff real: `/home/chernandez/Descargas/Cuadrala-handoff/cuadrala/project/` (fuera del repo, provisto por el usuario), específicamente `Encontrar Partida Handoff.html` + `cuadrala-qm-ui.jsx` + `cuadrala-quickmatch.jsx` + `cuadrala-qm-avisos.jsx` + `cuadrala-qm-handoff.jsx`.

## Specs

- **S1**: los 4 usos de `Icons.*`/`PhosphorIconsLight` crudo en `quick_match_screen.dart` pasan a `AppIcons.*` (regla de `app_icons.dart`, confirmada también por el handoff: su propio set de iconos es cerrado, nunca mezcla familias).
- **S2**: `_Failure` reutiliza el widget compartido `ErrorState` en vez de reimplementarlo a mano.
- **S3**: la escala de radios colapsa a los 3 valores que usa el handoff (12 botones/chips, 18 cards, 22 hoja — confirmado literal en `cuadrala-qm-handoff.jsx:237`: `"radius-btn 12 · radius-card 18 · hojas 22"`); los pills (99) quedan igual.
- **S4**: overflow guard (`maxLines: 1, overflow: ellipsis`) en nombre de sede/cancha — el handoff no lo necesita porque su contenido es fijo, pero la app recibe nombres reales del backend que sí pueden desbordar.
- **S5**: precio dual (USD + Bs) reusando el `DualPrice` compartido y el helper `secondaryBsLabelSV`/`loadExchangeRatesSafelySV` ya establecidos por `discover_matches_cubit.dart` — el handoff siempre muestra ambas monedas apiladas (`cuadrala-ui.jsx:255-264`, componente `Price`).
- **S6**: copy de `_Expired` varía por tipo de propuesta — handoff usa `'Se liberó el cupo'` para `OPEN_MATCH` vs `'La propuesta expiró'` para `NEW_GROUP` (`cuadrala-quickmatch.jsx:253-269`).
- **S7**: transición entre pasos del flujo (`AnimatedSwitcher`, fade+slide 280ms, `Cubic(.3,.8,.3,1)`) — mismo timing que `sheetUp .28s cubic-bezier(.3,.8,.3,1)` del handoff.
- **S8**: cobertura de golden tests para la feature (searching, proposal, confirmed, expired — light+dark), que no existía.
- **S9 (fuera del alcance original, bug real encontrado en el camino)**: `app_theme.dart`'s `filledButtonTheme`/`outlinedButtonTheme` no fijaban `fontFamily` explícito en su `textStyle` — `tournament_theme.dart` ya tenía que parchar esto localmente (`WidgetStateProperty.resolveWith(...).copyWith(fontFamily: ...)`). Corregido en la raíz; verificado que no cambia ningún golden existente (el parche de torneos ya forzaba el mismo valor final).

## Decisiones explícitamente diferidas (confirmado con el usuario)

- Altura de botón 48→52px (global, toda la app) — NO aplicado.
- Verde de marca `#1F9A4D`→`#17A34A` (global, toda la app) — NO aplicado.

## Tasks

| ID | Linked S# | Route | Status | Commit/Evidence |
|----|-----------|-------|--------|------------------|
| T1 | S1-S9 | inline (parent) | done | ver Log |

## Log

- **L1**: Usuario pidió mejoras visuales del flujo de Quick Match, luego proveyó el handoff real en `/home/chernandez/Descargas/Cuadrala-handoff` y pidió corregir patrones/malas prácticas detectadas ("corrígelas").
- Auditoría inicial (sin handoff): 7 hallazgos vía exploración de código + comparación con design system doc.
- Reconciliación con el handoff real (agente lector): confirmó 6/7 hallazgos con evidencia JSX exacta, encontró 4 mismatches nuevos (altura de botón, verde de marca, `DualPrice` no reusado, copy de expirado no varía por tipo).
- Usuario confirmó NO aplicar los 2 cambios de theme global (altura de botón, verde de marca) — alcance acotado a Quick Match.
- Implementación: ver specs S1-S9 arriba. Durante S8 (goldens) se descubrió S9 (bug real de fontFamily en botones, visible solo en render de test) — verificado cero impacto en goldens existentes antes de corregir en la raíz.
- Regresión: `app_theme_test.dart` + suite completo de `quick_match/` (42 tests) verdes. Goldens de torneos corridos aparte: 234 passed / 4 failed, los 4 son exactamente el set de flakiness pre-existente ya documentado (`tournament_list_golden_test.dart` error/mine_error), no relacionado con este cambio.
