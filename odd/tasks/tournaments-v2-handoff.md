# Tournament v2 handoff

## Objective, problem and authorization
Implement the seven-step tournament flow from the supplied v2 prototype using existing Flutter architecture and real API contracts. Existing v1 visuals/semantics diverge. User authorized all seven steps and a dedicated local feature branch with seven commits, prepared for review in parts; no push/PR/merge.
Reference: external Downloads/Cuadrala (8)/design_handoff_torneos_v2/{README.md,CAMBIOS vs v1.md,prototipo/*.jsx}.

## Constraints
- Always use “Inscritos”; otherwise exact Spanish prototype copy.
- No PROPUESTA features: anonymous spectator, guest web links, tournament finish/cancel actions, score correction or result push.
- No invented fields/endpoints or simulated runtime data. Missing required data blocks the affected subsection, not unrelated work.
- ACCEPT actually returns CONFIRMED; retain backend behavior and document visual/semantic deviation. No backend modifications.
- Reuse router/Cubits/repositories/DTOs/theme; no new dependencies without justification.
- Dark/light, DRAFT/OPEN/IN_PROGRESS, viewer none/invited/pending/confirmed/organizer, optional-data empties, loading/error.
- Golden checks 402×874 with deterministic fonts/locale/date, and browser Tweaks comparisons before closing each step.

## Workflow / delivery
Branch: codex/tournaments-v2-handoff. Base: bbb980ae0547ba3b6ca401f84441c726c682c6d6.
Route: delegated direct for every task (mapping requires 4+ files; writing prepares multiple non-trivial files).
TDD: ON, source AGENTS.md and .cursor/rules/tdd-guidelines.mdc. Runner: flutter test from apps/mobile; observed RED -> GREEN -> refactor.
RDD: disabled/unmanaged, global OFF verified; no native review.
Delivery: feature-branch-chain, seven work-unit commits; local only, review slices by commit. Forecast 2,000–4,000 authored additions+deletions excluding generated goldens; ~400 is advisory task-planning size, never omit tests or compress code to meet it. No PR creation authorized.
Checks: focused flutter test, flutter analyze, Flutter compile check, pixel goldens and browser comparison; full suite at final integration.
Rollback: each work-unit commit isolates its behavior/tests; revert in reverse dependency order, preserving unrelated files.
Running authored count: 6,187 (T1+T2+T3+T4+T5; excludes generated binary fonts/goldens). Mirror: synced and read back (observation 1344; evolving mirror updated per task).

## Tasks (one commit per step)
- [ ] T1 Theme tokens and base widgets. Reuse status pill, card, chips, header; semantic theme extension if required. Add Banner/FactRow/CupoBar/viewer badge only where absent. Deterministic Plus Jakarta Sans and golden helper. Acceptance: exact v2 tokens both themes, header trailing content width, >=44 touch targets; base widget/theme tests and golden. Route: delegated.
- [ ] T2 Explore / My tournaments. Wire six real filters/pagination, viewer badges/invitation, distinguish empty/load/error. Acceptance: public non-draft explore and correct organizer pending counts. Route: delegated.
- [ ] T3 Player detail. Info/footer states, conditional Calendar/Table, own matches schedule response without score, no public roster. Acceptance: tab/state matrix, missing-time/opponent/court handling, eligibility not fabricated. Route: delegated.
- [ ] T4 Received invitation. Full-screen view using existing pendingInvitationId and real response endpoint; no organizer-only invitation fetch required. Acceptance: player can accept/reject and reload real CONFIRMED result; loading/errors. Route: delegated.
- [ ] T5 Organizer. Inscritos individual/bulk/paired confirm, removal, locked roster, guest/invite/duplas, schedule generate, separate status/visibility. Acceptance: no mutation actions when locked, no fake roster category, real contracts and toasts. Route: delegated.
- [ ] T6 Create. Dynamic schemas bool/int/enum/reset, sport/category/gender/date/venue/capacity/price/visibility/publish, date validation and CTA. Acceptance: schema bounds only; publishOnCreate local second call; real FX, no fake description. Route: delegated.
- [ ] T7 Progress and results. Shared table/bracket/matches, guest identities, immutable results and format-aware ties. Fix Dart bracket decoder for existing nullable userId/registrationId payload. Acceptance: no correction, no false metrics or rank rules; zero/live/done goldens. Route: delegated.

## Known gaps / decisions
- Backend ACCEPT -> CONFIRMED differs from prototype PENDING; show real result.
- Roster DTO lacks individual category, preset DTO lacks description; do not fabricate.
- Scoreboard lacks losses/draws/difference; verify derivation from complete schedule before displaying those metrics. If not safely derivable, blocked and report.
- Existing bracket score decoder rejects guest null userId; client correction T7.
- Existing invitations list read is organizer-only; respond via ViewerTournamentDto.pendingInvitationId T4.
- Real exchange-rate repository exists; omit Bs when unavailable instead of mock rate.
- No existing golden harness / bundled font; T1 establishes deterministic typography.

## Progress and verification
T1 implementation and automated checks observed; visual acceptance remains pending because no browser is connected. Source tree initially clean except untracked .codegraph/ (preserve).
Next: T6 dynamic tournament creation. T5 organizer implementation received. Prototype local server http://127.0.0.1:8765/Cuadrala%20App.html. Browser comparison unavailable: cua reports no enabled browsers/apps (IAB unavailable); source inspection and automated goldens remain available. Manual Tweaks comparison MUST stay pending, not claimed passed.


### T1 evidence
- Delegated writer v2_t1 observed RED for missing theme/primitives/card empty price and golden files; GREEN 28 focused tests.
- Parent verification: flutter analyze no issues; 49 theme/base/card/golden tests passed; flutter build web --debug succeeded (37.9s); git diff --check clean.
- Dark/light 402×874 base goldens generated/replayed with bundled font; parent inspected dark baseline. These are regression references, NOT browser parity proof.
- Bounded TournamentTheme preserves other app palette; bundled fonts from official google/fonts OFL. Header tournamentStyle opts into sizing. No deps added.
- Runtime harness: base golden widget render; full prototype/browser unavailable.
- Rollback: T1 theme extension, base widgets/header opt-in, font bundle and base tests only.
- Differences: card Bs label not yet wired to real FX; browser/Tweaks comparison pending.
- RDD disabled/unmanaged. Task checkbox stays pending visual acceptance.

T1 commit: 2a624160172e9589291e4307509fc46b42aabec7. License upstream trailing whitespace caught in staged diff check and removed before amended commit.

### T3/T4 preparation findings
- Confirmed Calendar does not mount existing MyMatches tab; tab lazy-load controller is above the controller it tries to find. Wire real lifecycle/callback.
- COMPLETED spectator tabs absent; player Info still exposes roster; DRAFT footer enroll incorrectly enabled. Detail/load and response errors need visible retry/finally reset.
- Preserve viewer pendingInvitationId, resolve direct detail links via existing listMyTournaments when needed; never synthesize invitation DTO.

### T2 evidence
- Delegated writer observed RED: Explore screen absent and Mis torneos error converted to empty. GREEN tests include pagination/filter regression and separate my-list errors.
- Parent verification after Dart format: flutter analyze clean; 59 focused theme/tournament/card/list/golden tests passed; flutter build web --debug succeeded (36.8s); git diff --check clean.
- 12 list goldens: Explore, Mis torneos, empty, global loading/error, Mis torneos error in dark/light at 402×874. Browser comparison pending; fixtures not parity proof.
- Fixes: sport change now compares previous state; load-more preserves entries+error; rates use existing FX source and omit Bs without rate.
- Navigation: tournament detail receives existing ViewerTournamentDto as route extra and invitation flag from pendingInvitationId, no synthetic DTO.
- Runtime harness: list/golden widgets; no actual browser connected. Rollback: list API filter copies, Cubit/state, screen, tile extension/tests/goldens.
- Difference: “Crear” uses 44dp hit area vs JSX 42 visual; filters use existing picker/sheets, their opening UI is not specified in JSX.
- T2 checkbox remains pending browser visual acceptance.

T2 commit: 69bd1ef43e37deac592bf739341190378675bd5e.

### T3 evidence
- Detail now conditionally shows Info/Calendario/Tabla, uses real own-match schedule and read-only spectator schedule, hides public roster, and renders state-specific enrollment footer and exact v2 player-match actions/copy.
- Date facts use real `startsAt`/`endsAt` including cross-day end date; eligibility does not block based on unavailable/unverified category matching.
- RED/GREEN observed by delegated writer for the added end-date fact and corrected stale match-card expectations. Parent focused run passed 86 tests across detail, entry check, match card and detail goldens; `flutter analyze` clean; `flutter build web --debug` succeeded (98.7s); `git diff --check` clean.
- Four detail regression goldens cover OPEN/CONFIRMED × dark/light at 402×874. These are not prototype parity proof; full visual matrix and browser Tweaks comparison remain pending.
- Backend behavior retained: accepting an invitation yields CONFIRMED (not prototype PENDING); no endpoint/DTO invented. Calendar/Tabla spectator visibility limited to existing IN_PROGRESS/COMPLETED data.
- Route: delegated direct. Rollback: detail presentation, player match/entry widgets and their tests/goldens.
- Manual browser visual acceptance remains pending; no browser surface was available.

T3 commit: 5483f2f1bd09b68f54391c0578025caaf6161fd1 (`feat(tournaments): align player detail with v2`).

### T4 evidence
- Player invitation opens from the real `ViewerTournamentDto.pendingInvitationId`; invitation-list requests require explicit organizer role, and `null`/player role skips the organizer-only read endpoint.
- Accept/reject retain the real response API. Acceptance is shown only after the refreshed registration is `CONFIRMED`; failure remains visible and retry reload is available.
- RED/GREEN observed for the authorization rule and invitation response behavior. Parent focused run passed 63 invitation/detail tests including pending/accepted × dark/light 402×874 goldens; `flutter analyze` clean; `flutter build web --debug` succeeded (83.9s); `git diff --check` clean.
- Browser/Tweaks comparison unavailable; goldens are automated regression references, not visual parity proof. No endpoint/DTO invented.
- Route: delegated direct. Rollback: invitation screen/cubit gate/detail launch plus focused tests/goldens.
- Manual browser visual acceptance remains pending because no browser surface is available.

T4 commit: 5e6dbf7055260a78504800d9562e59f6aac62d7c (`feat(tournaments): implement invitee response flow`).

### T5 evidence
- Paired mode now keeps individual Inscritos rows and confirmation/removal alongside the separate Duplas section; pairing uses an explicit selection sheet for two real unpaired registrations. Individual categories are omitted because they are absent from the registration DTO.
- IN_PROGRESS retains roster counts and read-only participants while disabling mutations; Cuadro pending warning/action is hidden once generated or while locked. Guest action uses “Agregar sin cuenta”.
- Status and visibility remain separate; Cubit state, parent detail and feedback update only after API success. Existing transition restrictions remain; no finish/cancel actions added.
- Name-based invite search is still absent from real contracts; no mock player results are shown. The available ID-based invite remains.
- RED/GREEN observed. Parent ran 74 focused tests covering registrations, pairing, bracket warning, publish and detail; six organizer goldens paired OPEN/locked/generated Cuadro × dark/light at 402×874. `flutter analyze` clean, `flutter build web --debug` succeeded (35s), `git diff --check` clean.
- Browser/Tweaks visual comparison unavailable; goldens are regression baselines only. Full organizer state matrix remains pending.
- Route: delegated direct. Rollback: organizer detail tabs/pairing/guest sheet/publish cubit plus related tests and goldens.

T5 commit: pending.
