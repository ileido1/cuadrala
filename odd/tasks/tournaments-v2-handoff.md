# Tournament v2 handoff

## Objective, problem and authorization
Implement the seven-step tournament flow from the supplied v2 prototype using existing Flutter architecture and real API contracts. Existing v1 visuals/semantics diverge. User authorized all seven steps and a dedicated local feature branch with seven commits, prepared for review in parts; no push/PR/merge.
Reference: external Downloads/Cuadrala (8)/design_handoff_torneos_v2/{README.md,CAMBIOS vs v1.md,prototipo/*.jsx}.

## Constraints
- Always use “Inscritos”; otherwise exact Spanish prototype copy.
- No PROPUESTA features: anonymous spectator, guest web links, tournament finish/cancel actions, score correction or result push.
- No invented fields/endpoints or simulated runtime data. Missing required data blocks the affected subsection, not unrelated work.
- The original mobile handoff preserved current backend contracts. On 2026-10-02 the user explicitly expanded scope to fix the named API gaps below; no unrelated product/API changes are authorized.
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
Running authored count: 11,341 (T1–T7 + T6b + T7a + T8 safe slices + T8f; additions+deletions, excludes generated binary fonts/goldens). Mirror: synced and read back (observation 1344; evolving mirror updated per task).

## Tasks (one commit per step)
- [x] T8f Fix three confirmed player-detail blockers (OPEN+INVITED and OPEN+PENDING overflow at 402px; missing tournament button font family; registration-error visibility) and add the excluded dark/light 402×874 detail goldens. User explicitly authorized these production repairs after T8 exposed them. Scope limited to tournament detail presentation/theme and regression tests/goldens; no backend, contracts, shared helper, or unrelated theme changes. Route: delegated direct. RED observed for invitation overflow; focused detail goldens GREEN.
- [x] T8p Player golden matrix. Covers Info viewer/status/optional/capacity/action states, player/spectator calendar empty/loading/error/response states, and scoreboard empty/loading/error/populated/own-highlight/guest states plus invited/pending/registration-error Info. Dark/light 402×874, real DTO fixtures only; each capture asserts scenario identity/no Flutter exceptions.
- [x] T8o Organizer golden matrix. Covers Inscritos draft/empty/confirmed/guest/contact/paired/invitation/load/error/busy, lower-scroll Duplas, Cuadro eligibility/warning/load/generation/error/generated/real GPK branch, separate Publicar status and visibility with busy/error, and guest/invite/pair sheets. Dark/light 402×874, real contracts only.
- [x] T8r Remaining screen golden matrix. Covers Explore/Mis torneos, invitation loading/error/responding/rejected/optional, create async/schema/date/optional/publish-failure, and result/bracket async/error/guest/doubles/tie/unresolved. Distinct supported branches only; unreachable states documented.
- [x] T7a Reject tied match results in every format. Keep the existing score DTO and endpoint, but prevent equal side totals from submission regardless of preset. Acceptance: equal scores blocked for singles/doubles and known/unknown formats; unequal scores submit; generic validation copy. Route: delegated direct (UI + regression tests). TDD ON; `flutter test` from `apps/mobile`; RED then GREEN observed. No backend change.
- [ ] T1 Theme tokens and base widgets. Reuse status pill, card, chips, header; semantic theme extension if required. Add Banner/FactRow/CupoBar/viewer badge only where absent. Deterministic Plus Jakarta Sans and golden helper. Acceptance: exact v2 tokens both themes, header trailing content width, >=44 touch targets; base widget/theme tests and golden. Route: delegated.
- [ ] T2 Explore / My tournaments. Wire six real filters/pagination, viewer badges/invitation, distinguish empty/load/error. Acceptance: public non-draft explore and correct organizer pending counts. Route: delegated.
- [ ] T3 Player detail. Info/footer states, conditional Calendar/Table, own matches schedule response without score, no public roster. Acceptance: tab/state matrix, missing-time/opponent/court handling, eligibility not fabricated. Route: delegated.
- [ ] T4 Received invitation. Full-screen view using existing pendingInvitationId and real response endpoint; no organizer-only invitation fetch required. Acceptance: player can accept/reject and reload real CONFIRMED result; loading/errors. Route: delegated.
- [ ] T5 Organizer. Inscritos individual/bulk/paired confirm, removal, locked roster, guest/invite/duplas, schedule generate, separate status/visibility. Acceptance: no mutation actions when locked, no fake roster category, real contracts and toasts. Route: delegated.
- [ ] T6 Create. Dynamic schemas bool/int/enum/reset, sport/category/gender/date/venue/capacity/price/visibility/publish, date validation and CTA. Acceptance: schema bounds only; nullable optional states are omitted from requests; publishOnCreate local second call cannot duplicate a successful create after publish failure; preserve only real preset defaults/fields and FX. Route: delegated.
- [x] T6b Create golden follow-up. Added deterministic 402×874 configured-form and create-error goldens in dark/light, using the existing schema preset and mocked API error. Scrolling is driven by visible test targets; no production layout changed. All four fixtures replay in the create screen test. Route: delegated.
- [ ] T7 Progress and results. Shared table/bracket/matches, guest identities, immutable results and format-aware ties. Fix Dart bracket decoder for existing nullable userId/registrationId payload. Acceptance: no correction, no false metrics or rank rules; refresh schedule+scoreboard after submit; zero/live/done goldens. Route: delegated.

## Known gaps / decisions
- Invitation ACCEPT currently confirms registration instead of leaving it PENDING for organizer confirmation; implement the prototype contract.
- Roster responses lack a participant's current sport category and preset responses omit a persisted nullable description; only expose real values (category to organizers; no fabricated fallbacks).
- Scoreboard lacks losses/draws/points against/difference; derive from completed scores. Preserve previously recorded tied match results as historical draws and count them separately; reject new tied results for all formats.
- Bracket guest-null-user decoding was fixed by T7; earlier preparation note is stale.
- Existing invitations list read is organizer-only; respond via ViewerTournamentDto.pendingInvitationId T4.
- Real exchange-rate repository exists; omit Bs when unavailable instead of mock rate.
- No existing golden harness / bundled font; T1 establishes deterministic typography.

## Authorized follow-up: tournament API and contract gaps (2026-10-02)
- User approved backend/API changes to close the handoff gaps and separately approved binding direct self-registration to the authenticated actor.
- Preserve old tied results; add a separate draw count to scoreboard metrics. Do not rewrite or delete historical scores. Reject equal side totals on all new result submissions, independent of format.
- Direct player registration must identify the enrolling player from the authenticated actor, never a caller-supplied `userId`. Invitation acceptance remains its own endpoint and must continue checking the invitee identity. Guest registration remains organizer-managed.
- Invitation search: partial, case-insensitive name query, minimum two characters, bounded result count (20), organizer/venue-staff authorized, return only user ID and display name, exclude already registered/invited tournament users; no contact data.
- Per-player category: derive the user's current category for the tournament's sport, display only to authorized organizers, and do not reject enrollment for category mismatch. Preset description is pass-through from persisted `FormatPresetVersion.description`; nullable stays absent/null, never invent copy.
- Scoreboard metrics: games played/won/lost/drawn, points for/against and difference, with existing points semantics retained. Rank by points, difference, direct head-to-head, then deterministic name/identity fallback as the prototype states.
- Scope is substantial: forecast 900–1,500 authored additions+deletions excluding generated assets. Retain `feature-branch-chain`, one Conventional Commit per coherent unit; local branch only, no push/PR/merge. TDD ON. API runner order: `npm run typecheck` → `npm run lint` → `npm test`; mobile runner: `flutter test` from `apps/mobile`.

### T9 implementation tasks
- [x] T9a Bind direct registration to actor identity. API takes the registration user from the authenticated actor and rejects body `userId`; Flutter sends an empty body. Invitation acceptance and organizer guest registration remain separate. Route: delegated direct. RED observed for API schema and Flutter request expectations; API focused contract+HTTP/DB tests passed (6/6), `npm run typecheck`, `npm run lint`, focused Flutter repository tests, `flutter analyze`, and `git diff --check` passed. Full API suite was attempted and failed in 17 files / 48 tests (977 passed, 7 skipped); unrelated failures remain to triage at final verification.
- [ ] T9b Reject new tied results for every format. Enforce the racket-sport winner-required rule in API result use case, update contract/unit tests; preserve old records (scoreboard historical draw count lands in T9g). Mobile already blocks ties. No data rewrite. Route: delegated direct.
- [ ] T9c Invitation ACCEPT creates/retains a PENDING registration while marking the invitation ACCEPTED; existing organizer individual/bulk confirmation promotes it to CONFIRMED. Cover API integration, registration/schedule eligibility, and mobile response tests. Route: delegated direct.
- [ ] T9d Expose persisted preset description through API and mobile DTO/UI, preserving null when absent. Route: delegated direct.
- [ ] T9e Include each authenticated registrant's current category for the tournament sport in organizer-only Inscritos data; keep participant category informational and do not block enrollment. Cover privacy redaction and mobile rendering. Route: delegated direct.
- [ ] T9f Add the authorized tournament-scoped name search and wire the organizer invitation sheet to real results, retaining organizer permissions and excluding existing roster/invites. Route: delegated direct.
- [ ] T9g Extend scoreboard contract and mobile table with played/won/lost/drawn, for/against/difference, prototype rank tie-breaks, and tests including historical tied records. Route: delegated direct.
- [ ] T9h Update authoritative tournament handoff/OpenAPI/spec docs and full verification after the above commits. Browser prototype/Tweaks comparison remains pending until a browser is available. Route: inline documentation after implementation.

## Progress and verification
T9a commit: 273a4f7 (`fix(tournaments): bind self-registration to actor`). No changes to withdrawal, invitations, or guest registration. Direct enrollment now uses bearer actor identity, so one authenticated user cannot target another by body `userId`.
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
- At the T7 commit, successful result submission reloaded the schedule and scoreboard and finished matches did not expose correction. The mobile UI then only blocked ties for `SINGLE_ELIMINATION`; T7a below supersedes that mobile rule. The API contract gap for other formats remains.
- Corrected full-suite regressions found during integration: OPEN pill test now checks the tournament-specific theme token; organizer labels and paired roster copy assertions align with rendered casing/spelling; roster copy uses “inscritos” and locked dark/light goldens were regenerated.
- RED/GREEN observed. Focused tournament progress/result and regression tests passed. Full `flutter test --reporter compact` passed (879 tests); `flutter analyze` clean; `flutter build web --debug` succeeded (35.4s); `git diff --check` clean.
- Six 402×874 progress snapshots cover zero/live/finished in dark/light. These are local regression references only; browser prototype comparison remains unavailable. T6b later closed the configured/error create golden gap.
- No backend edits, new dependencies, or invented endpoints/fields. Route: delegated direct. Rollback: T7 progress/result changes and the integration-only tournament copy/test corrections.
- Manual prototype/Tweaks comparison and formal pixel-parity acceptance remain pending.

T7 commit: ba24cd73e539512bb12e1751ff69739317fc836f (`feat(tournaments): add guest-safe progress and results`).

### T7a evidence
- User clarified racket match outcomes cannot be ties. Result entry now blocks equal side totals for every format (including absent/unknown preset), and permits submit once totals differ. Replaced the incorrect Americano tie-valid copy with generic “El resultado debe definir un ganador.” Covers singles, doubles, guest result submission, and API failure handling.
- Existing API rejects ties only in SINGLE_ELIMINATION. Per the current scope boundary, no backend or DTO changed; direct API calls for other formats remain a contract gap.
- RED observed before UI change; GREEN after. Parent reran focused `result_entry_sheet_test.dart`: 9 tests passed; `flutter analyze` for widget/test clean; `git diff --check` clean. No full suite/build rerun for this narrow task.
- Browser/Tweaks comparison remains unavailable. Route: delegated.

T7a commit: 70476a598a0a0553a7f7325662b6ae16c9fe2c3d (`fix(tournaments): reject tied match results`).

### T8 golden coverage extension — authorization and plan
- User explicitly authorized completing the missing tournament golden-state coverage, especially player detail and organizer. This is test-only scope: retain production screens, existing DTOs, dependencies, and backend unchanged. Existing test fixtures are deterministic test data, not runtime simulation.
- Mapping used CodeGraph and existing tests/prototype references. Coverage is a finite set of distinct visible branches, not an unbounded Cartesian product of all fields/statuses. Each scenario renders in both themes at 402×874 with existing fonts/locale/date/DPR harness.
- Three delegated work units: player detail, organizer, remaining tournament screens; workers have disjoint test/PNG ownership. Parent owns this tracker and final verification. Forecast additional 1,200–2,400 authored lines excluding generated PNGs; existing feature-branch-chain strategy retained, local commits only. RDD status rechecked: global OFF.
- Capture loading/busy with fixed pumps, not pumpAndSettle; assert branch identity and no exceptions. Explicit scroll captures cover lower sections. No screenshot is evidence of browser/JSX pixel parity; manual comparison remains pending.
- Checks per unit: missing-baseline RED, generate references, replay without update, focused analysis, diff check. Final: combined golden replay, full Flutter suite and analyze. Rollback: added tests and PNGs for the unit only; production unchanged.

### T8p safe coverage evidence (partial acceptance)
- Added 56 player-detail PNGs: 28 distinct scenarios in both themes at 402×874; original four baselines unchanged. Covered draft/live/completed/cancelled/missing facts/full/busy Info; player and spectator calendar empty/loading/error/response/missing-slot states; scoreboard empty/loading/error/own-highlight/guest states.
- Missing-reference RED observed; generated and replayed without update: 60 focused tests passed; focused analyze/diff check clean. Each capture verifies branch identity and no Flutter exceptions. Parent verified new PNG dimensions/theme pairs and inspected representative calendar capture.
- Remaining required cases: INVITED Info has 12px Row overflow (`_PendingInviteBanner`); PENDING Info has 33px footer Row overflow; enrollment error has no visible rendering. These states were not baselined or suppressed. T8p remains unchecked until resolved.
- Typography blocker shared by old/new snapshots: FilledButton/OutlinedButton theme uses TextStyle without fontFamily, so test labels render Ahem rectangles despite bundled font loading. No helper substitution or production change masks the defect. Full visual acceptance remains pending.
- Route delegated; test-only. Rollback: detail golden test additions plus `player_detail_*.png`. Browser parity unavailable; runtime harness is the actual Flutter widget render.

T8p safe-slice commit: e05f834702ee9f02e8694415287e717df10d7a05 (`test(tournaments): expand player state goldens`).

### T8o supported-state coverage evidence (partial acceptance)
- Added 90 organizer PNGs (96 references total), both themes at 402×874. Covers Inscritos draft/empty/confirmed/guest/contact/paired/load/error/busy, invitations and lower Duplas; Cuadro eligibility/pending warning/generation/failure/conflict/standings/live/guest/unsupported/real GPK transition; independent Publicar status/visibility busy/error; actual guest/invite/pair modal overlays.
- Missing-reference RED observed, generate and replay GREEN: 94 tests passed. Focused analyze and diff check clean. Parent verified PNG dimensions/theme pairs and inspected Publicar visibility-error screenshot.
- Pair sheet closes before mutation, so busy/API-error are not in-sheet visual states; guest validation rejects submission silently. These behaviors are documented, not simulated. Locked roster controls asserted absent. Pending publish futures resolve while Cubit stays mounted, preventing teardown emit-after-close.
- Shared missing button-font blocker prevents final visual acceptance. T8o stays unchecked pending typography correction; no production change. Rollback: organizer golden test additions and new organizer PNGs. Browser parity remains pending.

T8o safe-slice commit: 40c9db60ac83d15163823e0cb717eda370056a6f (`test(tournaments): expand organizer state goldens`).

### T8r supported-state coverage evidence (partial acceptance)
- Added 72 PNGs: 36 distinct scenarios in both themes (list 14, invitation 12, create 22, bracket 16, results 8). Covers list empty/loading/badges/optional/full/draft; invitation async/error/rejected/optional; create async/schema/date/lower optional fields/retained-create publish failure; result tie/doubles/guest/busy/error; bracket async/error/unresolved/BYE/pending/live.
- Refreshed ONLY existing `progress_zero_{dark,light}.png`, whose earlier T7a validation copy caused a preexisting 5.99% difference. Other old references unchanged. Missing-reference RED observed separately from that known baseline drift; four-file replay GREEN: 120 tests, final list/progress replay 56 tests. Focused analysis/diff check clean.
- First full-suite run had 1,100 passing tests and one stale result-submit integration test. It submitted default 0–0, now correctly disabled by T7a. Test-only correction asserts disabled at equality, increments first side and verifies 1–0 submit plus scoreboard reload. Isolated RED reproduced then GREEN (1 test); focused analysis clean.
- Bracket null-data UI is unreachable with nonnullable Future<BracketDto>; successful create navigates away, so retained-created publish error is captured instead. Standings captured in T8p. My-list loading uses the existing global loader. Shared typography blocker leaves final visual acceptance pending.
- Parent verified all new references are 402×874 with dark/light pairs and inspected lower create optional controls. No production/shared-helper/backend changes. Rollback: list/invitation/create/progress test additions and PNGs plus the stale integration fixture correction. Browser parity pending.

T8r safe-slice commit: 50984caf96b372aa6d1deb87128b3ddd3c0351e4 (`test(tournaments): cover remaining visual states`).

### T8 integration and remaining acceptance
- Added 218 PNGs (109 paired dark/light scenarios) and refreshed two existing result-zero PNGs. All new images verified as exactly 402×874 and paired by theme. No production, backend, dependency, or shared-harness files changed.
- Final `flutter test --no-pub --reporter compact`: all 1,101 tests passed (81 seconds), after repairing the stale tied-score integration fixture. Full `flutter analyze --no-pub`: clean. `git diff --check`: clean. Widget tests compile the modified test code; no app build rerun because production is unchanged. RDD disabled/unmanaged, global OFF; no native review, push, PR, or merge.
- Visual spot-checks: calendar unanswered light, organizer visibility-error light, create lower optional controls dark, plus preexisting create initial dark. Button labels show real unresolved-font squares in both old/new baselines. No acceptance claim or test-theme masking.
- T8p/T8o/T8r automated state-matrix coverage is complete. Production blockers were fixed under T8f authorization and affected tournament baselines refreshed. Formal pixel parity is still pending because manual prototype/Tweaks browser comparison remains unavailable.

### T8f authorization and execution
- User explicitly approved fixing the three blockers above and completing the missing dark/light detail snapshots. This authorizes only those bounded production changes plus regression tests and snapshots.
- Route: delegated direct; source mapping and root-cause evidence are already in context. TDD ON (`flutter test` from `apps/mobile`); observe RED before edits. Commit the behavior/tests as one work unit. Preserve all 218 previously committed snapshots and unrelated `.codegraph/`.
- Remaining verification: registration-error state render + snapshots, focused/full test and analyze results, inspect diffs/images. Browser/Tweaks parity remains an independent pending acceptance item.
- Integration finding: `TournamentTheme` wraps more than player detail; fixing its shared tournament button typography causes intentionally different rendered text across organizer, list, invitation, create, and progress golden surfaces. Refresh/replay every affected tournament golden file (not unrelated non-tournament references) so the suite records the actual corrected font rather than preserving Ahem baselines.
- RED/GREEN evidence: added INVITED case first failed because tester captured a Flutter overflow at 402×874; after using flexible invitation actions and pending-status copy, the 66-test detail golden file passed. The existing registration error is now rendered at the player footer, and Filled/Outlined tournament button styles preserve Plus Jakarta Sans.
- Updated all affected tournament golden references (list, detail, organizer, invitation, create, progress/results) because the scoped TournamentTheme controls each screen. Added six dark/light player snapshots for invitation, PENDING enrollment, and registration error. All 62 player-detail snapshots are 402×874.
- Parent verification: `flutter test --no-pub --reporter compact` passed all 1,107 tests; `flutter analyze --no-pub` clean; `flutter build web --debug --no-pub` succeeded; `git diff --check` clean. Reviewed invited, pending, and registration-error snapshots. These references validate Flutter regression behavior, not JSX pixel parity.
- No endpoints/DTOs/backend/dependencies changed. Manual browser/Tweaks comparison remains pending.
- Work-unit commit: `56c3115` (`fix(tournaments): resolve player golden blockers`). RDD: disabled/unmanaged (global OFF); no native review.
