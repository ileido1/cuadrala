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
Delivery: feature-branch-chain, seven core work-unit commits plus the T6b golden-coverage follow-up; local only, review slices by commit. Forecast 2,000–4,000 authored additions+deletions excluding generated goldens; ~400 is advisory task-planning size, never omit tests or compress code to meet it. No PR creation authorized.
Checks: focused flutter test, flutter analyze, Flutter compile check, pixel goldens and browser comparison; full suite at final integration.
Rollback: each work-unit commit isolates its behavior/tests; revert in reverse dependency order, preserving unrelated files.
Running authored count: 9,088 (T1–T7 + T6b and final evidence; additions+deletions, excludes generated binary fonts/goldens). Mirror: synced and read back (observation 1344; evolving mirror updated per task).

## Tasks (one commit per step)
- [ ] T1 Theme tokens and base widgets. Reuse status pill, card, chips, header; semantic theme extension if required. Add Banner/FactRow/CupoBar/viewer badge only where absent. Deterministic Plus Jakarta Sans and golden helper. Acceptance: exact v2 tokens both themes, header trailing content width, >=44 touch targets; base widget/theme tests and golden. Route: delegated.
- [ ] T2 Explore / My tournaments. Wire six real filters/pagination, viewer badges/invitation, distinguish empty/load/error. Acceptance: public non-draft explore and correct organizer pending counts. Route: delegated.
- [ ] T3 Player detail. Info/footer states, conditional Calendar/Table, own matches schedule response without score, no public roster. Acceptance: tab/state matrix, missing-time/opponent/court handling, eligibility not fabricated. Route: delegated.
- [ ] T4 Received invitation. Full-screen view using existing pendingInvitationId and real response endpoint; no organizer-only invitation fetch required. Acceptance: player can accept/reject and reload real CONFIRMED result; loading/errors. Route: delegated.
- [ ] T5 Organizer. Inscritos individual/bulk/paired confirm, removal, locked roster, guest/invite/duplas, schedule generate, separate status/visibility. Acceptance: no mutation actions when locked, no fake roster category, real contracts and toasts. Route: delegated.
- [ ] T6 Create. Dynamic schemas bool/int/enum/reset, sport/category/gender/date/venue/capacity/price/visibility/publish, date validation and CTA. Acceptance: schema bounds only; nullable optional states are omitted from requests; publishOnCreate local second call cannot duplicate a successful create after publish failure; preserve only real preset defaults/fields and FX. Route: delegated.
- [x] T6b Create golden follow-up. Added deterministic 402×874 configured-form and create-error goldens in dark/light, using the existing schema preset and mocked API error. Scrolling is driven by visible test targets; no production layout changed. All four fixtures replay in the create screen test. Route: delegated.
- [ ] T7 Progress and results. Shared table/bracket/matches, guest identities, immutable results and format-aware ties. Fix Dart bracket decoder for existing nullable userId/registrationId payload. Acceptance: no correction, no false metrics or rank rules; refresh schedule+scoreboard after submit; zero/live/done goldens. Route: delegated.

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
Implementation T1–T7 plus T6b create-state snapshots is present. Formal visual acceptance remains pending: the prototype browser/Tweaks surface was unavailable, and generated golden references prove regression consistency—not parity with JSX. Final build/test verification is recorded under T7/T6b. Prototype local server http://127.0.0.1:8765/Cuadrala%20App.html. Browser comparison unavailable: cua reports no enabled browsers/apps (IAB unavailable); source inspection and automated goldens remain available. Manual Tweaks comparison MUST stay pending, not claimed passed.


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

T5 commit: 3cf5a6e91eb22c09113e7c1bf1408f6b6de463cd (`feat(tournaments): align organizer controls with v2`).

### T6 preparation findings
- Existing create path uses catalog/venue repositories, `TournamentPresetsCubit` → existing presets endpoint/DTO, `CreateTournamentCubit` → POST create then optional PATCH OPEN; no new endpoint needed.
- Preset DTO has `parametersSchema`/`defaultParameters` but no description. Only boolean/int/enum are supported; use server bounds and defaults, never hardcoded fallback bounds or mocked preset copy.
- Gender/capacity/price/endsAt can be omitted; represent unset gender, no capacity and no price distinctly (price 0 is explicitly free). Existing request supports visibility. Venue DTO has address/image, not zone.
- Preserve created tournament ID if POST succeeds and PATCH OPEN fails; retrying must not repeat POST and create a duplicate. Protect preset loads from stale sport-switch responses.
- Validation requirements include date order, schema type/bounds/enum membership, and prototype name minimum. Existing FX source remains authoritative; no Bs without a rate. Freeze current-time input in deterministic tests.

### T6 evidence
- Create now supports unset gender, optional end date, no capacity, no fee distinct from free (0), public/private visibility, and input schema validation. Only API-declared schema bounds/defaults/fields are used; preset description removed. Existing FX conversion remains authoritative; time anchor is injectable for deterministic tests.
- Preset requests ignore stale responses after sport changes. Successful create ID is retained when publish-on-create fails; retry calls PATCH only, preventing duplicate POST.
- RED/GREEN observed, including two stale Boolean-field widget assertions updated to the v2 accessible Sí/No control. Parent focused create screen/form/cubit/presets suite passed 44 tests; `flutter analyze` clean; `flutter build web --debug` succeeded (35.1s); `git diff --check` clean.
- Two 402×874 initial-form goldens cover dark/light. At the T6 commit, configured/error goldens were absent because nested/lazy scroll capture was unstable; T6b later resolved that coverage gap. No browser/Tweaks comparison available.
- Route: delegated direct. Rollback: create screen/form/cubits/state tests and initial goldens.

T6 commit: 3097ba08cbea30e800f3a74527ae283452966f04 (`feat(tournaments): align create flow with v2`).

### T6b evidence
- Added four 402×874 configured-form/error regression snapshots: each state in dark and light mode. The configured capture selects the real fixture preset “Liga” and schema values; the error capture uses the repository's mocked `AppFailure` response.
- Scroll position is stabilized by scrolling to the target fields at the actual 402×874 test viewport; production widgets/layout were not changed.
- Writer observed RED (missing goldens); parent reran `flutter test test/features/tournaments/presentation/create_tournament_screen_test.dart --reporter compact`: all 28 tests passed. Focused `flutter analyze test/features/tournaments/presentation/create_tournament_screen_test.dart` and `git diff --check` clean.
- Final integration after T6b: `flutter test --reporter compact` passed all 883 tests; full `flutter analyze` clean.
- Snapshots are local regression references, not visual parity proof. Browser/Tweaks remains unavailable. Route: delegated. Rollback: create-screen golden tests and their four generated fixtures only.

T6b commit: b90e0c94256bd8ba679773cea1e2bbbf72782cbc (`test(tournaments): cover configured create states`).

### T7 preparation findings
- Bracket score DTO currently rejects guest `userId: null`; retain `tournamentRegistrationId`. Winner IDs are registration-first, so UI must compare canonical registration identity, not assume user ID.
- Organizer score aggregation currently lets null user IDs match every guest side, contaminating guest totals; match only concrete identities and prefer registration IDs.
- Result endpoint/repository already exists. API rejects ties only for `SINGLE_ELIMINATION`; do not claim or simulate `GROUPS_PLUS_KNOCKOUT` knockout tie validation/advancement because those backend paths do not implement it.
- Current server rank is dense by points only. Extra metrics may only derive from complete, identifiable scored schedule and should be cross-checked against scoreboard; never fabricate zero for missing data or replace server rank with prototype tie-break.
- Keep finished scores immutable; successful result submission must refresh both schedule and scoreboard. Existing group-to-knockout action remains an explicit real endpoint.

### T7 evidence
- Bracket DTO accepts real guest result rows with nullable `userId` plus `tournamentRegistrationId`; winner/score rendering matches by registration first and never treats two null users as the same participant. Organizer schedule aggregation also prefers registration identity; incomplete identity/score rows omit the score rather than render fabricated `0` values.
- Successful result submission reloads the schedule and scoreboard. Finished matches do not expose a correction action. Existing result endpoint only supplies tie validation for `SINGLE_ELIMINATION`; ties are disabled in that format, while round-robin/Americano remain submittable. GPK/unknown formats have no fabricated client tie rule and the remaining backend contract limitation is explicit.
- Corrected full-suite regressions found during integration: OPEN pill test now checks the tournament-specific theme token; organizer labels and paired roster copy assertions align with rendered casing/spelling; roster copy uses “inscritos” and locked dark/light goldens were regenerated.
- RED/GREEN observed. Focused tournament progress/result and regression tests passed. Full `flutter test --reporter compact` passed (879 tests); `flutter analyze` clean; `flutter build web --debug` succeeded (35.4s); `git diff --check` clean.
- Six 402×874 progress snapshots cover zero/live/finished in dark/light. These are local regression references only; browser prototype comparison remains unavailable. Existing T6 configured/error create golden gap remains.
- No backend edits, new dependencies, or invented endpoints/fields. Route: delegated direct. Rollback: T7 progress/result changes and the integration-only tournament copy/test corrections.
- Manual prototype/Tweaks comparison and formal pixel-parity acceptance remain pending.

T7 commit: ba24cd73e539512bb12e1751ff69739317fc836f (`feat(tournaments): add guest-safe progress and results`).
