# Reproduce Home handoff in Flutter

## Objective
Port the Home screen from `/home/chernandez/Descargas/Cuadrala-handoff (1)/cuadrala/project/cuadrala-home.jsx` into Flutter so the player Home surface matches the supplied `¿Jugamos hoy?` design while preserving live HomeCubit data and current navigation.

## Problem
The deployed Home uses a different hierarchy (`Actividad en Cuádrala`), a generic Search/Create hero, and an empty open-matches section. It misses the handoff's intended Quick Match CTA hierarchy, inline Explore action, and the `Mis partidas` / `Cerca de ti` content layout.

## Scope and constraints
- The JSX handoff is reference material only; reproduce it in Dart without copying React code.
- Scope is the player Home screen shown in the supplied comparison. Other handoff screens remain out of scope until explicitly requested.
- Keep live profile, ELO, own matches, open matches, prices, and existing routes; do not introduce fixture data into production UI.
- Map `Encontrar partida` to Quick Match, `Crear partida` to the existing create-match sheet, `Explorar partidas` and `Ver todas` to the existing open-match / matches destinations.
- Preserve accessible controls, responsive mobile layout, and empty/error/loading states.
- TDD: enabled by repository instructions. Runner: `flutter test`; observe a focused RED before Dart implementation, then GREEN and refactor.
- Delivery strategy: ask-on-risk. Forecast: ~260 authored lines across test, Home UI, and visual QA artifacts.

## Tasks
- [x] HHP-1 Add/revise focused Home widget expectations for the handoff hierarchy and interaction destinations.
  - Route: delegated direct required by preparation/mapping trigger (Home UI, shared cards, data state, tests). No callable subagent delegation surface is available in this runtime; execute bounded work inline and record verification.
  - Acceptance: tests express the `¿Jugamos hoy?`, CTA labels, section labels, and no-match behavior without weakening existing data assertions.
- [x] HHP-2 Port the Home header, Quick Match hero and sections to Dart using existing data and routes.
  - Route: delegated direct writer required because the work changes two non-trivial files (Home UI and test). No callable writer delegation surface is available; execute bounded work inline.
  - Acceptance: Home matches the supplied JSX hierarchy; all four actions navigate to their current functional destinations; own matches and nearby open matches retain their data-driven cards.
- [ ] HHP-3 Verify mobile behavior and visual parity.
  - Acceptance: focused and full Flutter checks pass; Flutter analyzer passes; a fixed-viewport capture is compared against the supplied reference with any remaining data-dependent differences documented.

## Progress
- 2026-09-23: inspected the provided JSX and current Flutter Home implementation. The canonical reference for the attached screenshot is `project/cuadrala-home.jsx`, not the later redesign variant.

## Verification evidence
- HHP-1 RED: `flutter test test/features/home/presentation/home_screen_test.dart` failed because the previous Home did not render `¿Jugamos hoy?`, `Crear partida`, or the new CTA hierarchy.
- HHP-1/HHP-2 GREEN: focused Home widget suite passed (14 tests).
- HHP-2: `flutter analyze` passed with no issues.
- Work-unit commit: `0ea4e34 feat(home): align quick match hero with handoff`; native receipt review is disabled by repository status, so no review transition was run.
- HHP-3: full `flutter test` passed (806 tests).
- HHP-3 visual capture is pending a locally authenticated, data-seeded browser build or an explicitly authorized deployment. The supplied reference contains fixture matches, while production data is intentionally live; a meaningful pixel comparison must put both sides in the same state.

## Design/data notes
- The Home now follows the canonical `project/cuadrala-home.jsx` reference: compact profile header; `¿Jugamos hoy?` hero; primary `Encontrar partida`; secondary `Crear partida`; inline `Explorar partidas`; `Mis partidas`; and `Cerca de ti`.
- Court surface (`Exterior`/`Cubierta`) is not displayed because `OpenMatchDto` does not currently receive it from the API. It was deliberately not hardcoded; adding that optional API field is required for that visual tag to be data-correct.

## Next step
- Obtain a same-state authenticated browser capture to complete HHP-3 pixel comparison; do not compare the handoff fixture data against unrelated live production data.

## Relevant files
- `apps/mobile/lib/src/features/home/presentation/home_screen.dart` — Home composition and presentational widgets.
- `apps/mobile/lib/src/features/home/presentation/cubit/home_cubit.dart` — live Home data and upcoming-match filtering.
- `apps/mobile/test/features/home/presentation/home_screen_test.dart` — Home widget coverage.
- `/home/chernandez/Descargas/Cuadrala-handoff (1)/cuadrala/project/cuadrala-home.jsx` — source visual handoff.
