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
Running authored count: 0. Mirror: synced and read back (observation 1344; evolving mirror updated per task).

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
Next: T1 delegated implementation. Prototype local server http://127.0.0.1:8765/Cuadrala%20App.html. Browser comparison unavailable: cua reports no enabled browsers/apps (IAB unavailable); source inspection and automated goldens remain available. Manual Tweaks comparison MUST stay pending, not claimed passed.


### T1 evidence
- Delegated writer v2_t1 observed RED for missing theme/primitives/card empty price and golden files; GREEN 28 focused tests.
- Parent verification: flutter analyze no issues; 49 theme/base/card/golden tests passed; flutter build web --debug succeeded (37.9s); git diff --check clean.
- Dark/light 402×874 base goldens generated/replayed with bundled font; parent inspected dark baseline. These are regression references, NOT browser parity proof.
- Bounded TournamentTheme preserves other app palette; bundled fonts from official google/fonts OFL. Header tournamentStyle opts into sizing. No deps added.
- Runtime harness: base golden widget render; full prototype/browser unavailable.
- Rollback: T1 theme extension, base widgets/header opt-in, font bundle and base tests only.
- Differences: card Bs label not yet wired to real FX; browser/Tweaks comparison pending.
- RDD disabled/unmanaged. Task checkbox stays pending visual acceptance.
