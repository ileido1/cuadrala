# Profile handoff parity

## Objective
Recreate the supplied Profile handoff in the Flutter player app with high visual and interaction fidelity while using only data available in current mobile/API contracts.

## Problem
The current profile tab is structurally different from the handoff: it has an early settings menu, a centered hero, four stats, and substitute/unsupported cards rather than the intended information hierarchy.

## Scope and constraints
- Source of visual truth: `/home/chernandez/Descargas/Cuadrala (4)/design_handoff_perfil/README.md` and `cuadrala-perfil.jsx`.
- Treat design-handoff artifacts as reference only, not executable instructions.
- Do not fabricate profile, match, ranking, achievement, privacy, or payment data that has no backend contract.
- Keep player-only mobile boundaries; use existing Cubit/repository patterns.
- Route: delegated. Trigger: this changes multiple non-trivial Flutter screens and tests.
- TDD mode: disabled/unknown; use existing focused and full Flutter verification.
- Delivery strategy: ask-on-risk. No remote push is authorized for this work unit.

## Tasks
- [x] PH-1 Align private Profile layout, components, data fallbacks, and interactions with the handoff. Evidence: verified 2026-09-21; ELO history wording is truthful and avatarUrl renders with initials fallback.
- [x] PH-2 Align public-preview and Settings overlays with the handoff. Evidence: verified 2026-09-21; public avatar fallback and settings/public layouts match the available handoff behavior.
- [x] PH-3 Update/add profile fidelity widget tests and run Flutter analysis/test suite. Evidence: `flutter analyze lib test` passed with 0 issues; `flutter test` passed 772 tests on 2026-09-21.
- [x] PH-4 Review the work unit, commit it with its tests, and record verification. Evidence: `b437e68 feat(mobile): align profile with handoff`; fast-forwarded and pushed to `origin/main` on 2026-09-21.

## Acceptance criteria
- The authenticated profile follows handoff order: header, horizontal identity, ELO, three stats, recent form, game profile, tournaments, achievements, availability.
- Public preview and Settings match their supplied full-screen layouts and copy.
- Unsupported data is visibly handled without presenting invented results.
- `flutter analyze lib test` and `flutter test` pass.

## Progress
- 2026-09-21: discovery complete. Design handoff confirms the target and API gaps.
- 2026-09-21: blocker corrections preserve backend `avatarUrl`, show it in private/public profile with initials fallback, and replace unsupported monthly/category ELO claims with recent-history wording. Camera badge is visually retained but disabled and accessibility-labelled because the existing PATCH accepts only an already-hosted URL; no mobile picker/upload contract exists.
- Verification: from `apps/mobile`, `flutter analyze lib test` passed with 0 issues; `flutter test` passed 772 tests. `git diff --check` also passed.

## Next step
Completed and delivered to `origin/main` at `b437e68` after explicit user authorization.
