# Tournament Invite Link (issue #47)

## Objective
Let a tournament organizer (or venue staff) generate a shareable link that anyone can open to self-register for the tournament — deep-linking into the mobile app when installed, falling back to a functional web landing otherwise.

## Problem
Today the only way to add a participant who isn't already a platform user known to the organizer is `InviteGuestTournamentParticipantUseCase` (organizer enters the guest's data themselves). There is no self-service path: the organizer cannot hand out one link and let people register themselves, authenticated or as guests, without the organizer knowing who's coming in advance.

## Source of truth (do not reopen)
- `openspec/changes/issue-47-tournament-invite-link/spec.md` — REQ-TIL-001..012, NFR-TIL-001..004, full API contract table, edge cases, traceability table.
- `openspec/changes/issue-47-tournament-invite-link/design.md` — module layout, interfaces, data flow, the 11 numbered design decisions, and the 3 points resolved with the user on 2026-10-28 (GUEST-via-link also gets the competitive+paid `TORNEO_RESTRINGIDO` check; cross-tournament `linkId` on `DELETE` is `404 ENLACE_NO_ENCONTRADO`; `createdByUserId` is `onDelete: Restrict`).
- Nothing below reinterprets or re-decides anything already closed in those two documents. This plan only sequences the work.

## Scope and constraints
- TDD per `.cursor/rules/tdd-guidelines.mdc` / `AGENTS.md`: observe RED before implementing whenever a runnable deterministic test applies. Tester (next step in the flow) writes the actual test files; this plan only states what must be red before and green after each task.
- `services/api` verification order: `npm run typecheck && npm run lint && npm test`.
- `apps/mobile` verification: `flutter analyze && flutter test`.
- `apps/web` verification: `npm run lint && npm test && npm run build` (no `typecheck` script; `build` is the Next.js type-check equivalent).
- Integration tests for repositories/end-to-end HTTP require `TEST_DATABASE_URL` (distinct from `DATABASE_URL` — see memory `cuadrala-test-db-es-otra-base`), with migrations applied via `npx prisma migrate deploy` against that DB.
- No scope expansion beyond what `spec.md`/`design.md` already authorize (no rate-limiting middleware, no `TournamentInvitation`/`TournamentGuestScheduleToken` changes, no new GUEST dedup).

---

## Task plan (DAG)

### Phase 1 — Backend: domain & data

| ID | Description | Depends on | File(s) | Requirement |
|----|---|---|---|---|
| T1 | Add `TournamentInviteLink` model + aditive `TournamentRegistration.inviteLinkId` field to Prisma schema; run `prisma migrate dev` / `prisma generate` | — | `services/api/prisma/schema.prisma` | Data model (spec "Modelo de datos") |
| T2 | Create port + DTOs for the new repository | — | `services/api/src/domain/ports/tournament_invite_link_repository.ts` | REQ-TIL-001/002/005/006 |
| T3 | Modify existing registration port: add `inviteLinkId?` to `CreateGuestTournamentRegistrationDTO`, add `setInviteLinkIdSV` method signature | — | `services/api/src/domain/ports/tournament_registration_repository.ts` | REQ-TIL-007/008, design decision #3 |
| T4 | Pure validity function (expired/revoked/exhausted), no DB | T2 | `services/api/src/domain/tournament/tournament_invite_link_validity.ts` | REQ-TIL-003/004, NFR-TIL-001 |

**Parallel group A:** T1, T2, T3 — three independent files, zero data/import dependency between them. Launch together.
**Sequential:** T4 waits only on T2 (needs `TournamentInviteLinkDTO`).

**Test notes:**
- T1: no RED/GREEN unit test; verification is `prisma:validate` passing and the migration applying cleanly against `TEST_DATABASE_URL`. Downstream repository tests (T12/T13) are what actually exercise the new columns.
- T2/T3: pure type declarations — no runtime test; covered transitively once T7–T13 compile against them (`typecheck` is the signal).
- T4: new unit test file `src/test/unit/tournament_invite_link_validity.test.ts`. RED: file/function doesn't exist. GREEN: throws `410 ENLACE_INVALIDO` on expired, `409 ENLACE_REVOCADO` on `revokedAt != null`, `409 ENLACE_AGOTADO` on `usesCount >= maxUses`, no throw on a healthy link.

---

### Phase 2 — Backend: shared logic refactor (strictly sequential, blocks T11)

| ID | Description | Depends on | File(s) | Requirement |
|----|---|---|---|---|
| T5 | Extract `registerGuestForTournamentCoreSV` (roster-open + competitive/paid restriction + `maxSlots` + `createGuestSV`) out of `InviteGuestTournamentParticipantUseCase` | T3 | `services/api/src/application/helpers/register_guest_for_tournament_core.ts` | REQ-TIL-008/009/010, design decision #1, "Puntos resueltos" #1 |
| T6 | Refactor `InviteGuestTournamentParticipantUseCase` to delegate its business body to the new helper, with no behavior change | T5 | `services/api/src/application/use_cases/invite_guest_tournament_participant.use_case.ts` | design decision #1 |

**Strictly sequential: T5 → T6.** T6 cannot start before T5's helper exists; both touch the same business logic and must not run as parallel writers. This phase must complete before T11 (Phase 3) starts, but **not** before T7/T8/T9/T10 (they don't touch guest registration logic).

**Test notes:**
- T5: new unit test file `src/test/unit/register_guest_for_tournament_core.test.ts`, mocking `TournamentRegistrationRepository` (per `tdd-guidelines.md`'s "no `_deps` parameter" pattern — stub via `t.mock.method` on the repository module). RED: helper doesn't exist. GREEN: covers roster-closed → `TORNEO_CERRADO`, competitive+paid → `403 TORNEO_RESTRINGIDO` (this is the scenario the user explicitly resolved on 2026-10-28 — do not skip it here), `maxSlots` exhausted → `CUPOS_AGOTADOS`, happy path calls `createGuestSV` with the right DTO including `inviteLinkId` when passed.
- T6: **no new RED/GREEN** — this is a behavior-preserving extraction, the documented AGENTS.md exception ("no meaningful runnable RED" for a refactor). Regression guard: the existing `tournament_guest_registration.http-db.integration.test.ts` and `tournament_guest_registration_end_to_end.http-db.integration.test.ts` (require `TEST_DATABASE_URL`) must show the same pass count before and after T6. Record both counts as evidence.

---

### Phase 3 — Backend: new use cases

| ID | Description | Depends on | File(s) | Requirement |
|----|---|---|---|---|
| T7 | `CreateTournamentInviteLinkUseCase` | T2 | `services/api/src/application/use_cases/create_tournament_invite_link.use_case.ts` | REQ-TIL-001, REQ-TIL-003/004, NFR-TIL-004 |
| T8 | `ListTournamentInviteLinksUseCase` | T2 | `services/api/src/application/use_cases/list_tournament_invite_links.use_case.ts` | REQ-TIL-006 |
| T9 | `RevokeTournamentInviteLinkUseCase` | T2 | `services/api/src/application/use_cases/revoke_tournament_invite_link.use_case.ts` | REQ-TIL-005 |
| T10 | `GetTournamentInviteLinkPreviewUseCase` | T2, T4 | `services/api/src/application/use_cases/get_tournament_invite_link_preview.use_case.ts` | REQ-TIL-002, REQ-TIL-012 |
| T11 | `RegisterViaTournamentInviteLinkUseCase` | T2, T3, T4, **T5** | `services/api/src/application/use_cases/register_via_tournament_invite_link.use_case.ts` | REQ-TIL-007/008/009/010 |

**Parallel group B:** T7, T8, T9, T10, T11 — five independent files, no file overlap. T7–T10 only need Phase 1 outputs (T2/T4) and can start immediately after Phase 1. T11 additionally needs T5 (not T6) — it calls `registerGuestForTournamentCoreSV` directly, never through `InviteGuestTournamentParticipantUseCase`. All five can run as parallel workers once their individual prerequisites are met; T11's worker just starts one phase later than T7–T10's if Phase 2 isn't done yet.
Note: none of T7–T11 depend on T12/T13 (concrete Prisma repos) — they're written and unit-tested against the T2/T3 **interfaces**, with mocked repositories.

**Test notes** (unit tests, mocked repos, `src/test/unit/*.use_case.test.ts`):
- T7 (`create_tournament_invite_link.use_case.test.ts`): happy path 201 shape; 403 when `AssertTournamentOrganizerAccessUseCase` rejects; 404 unknown tournament; default `expiresAt = MIN(registrationClosesAt, startsAt)` when both future; default `+30d` when neither set; override outside `[now+1h, now+180d]` → 422; `maxUses: 0`/`-1` → 422.
- T8 (`list_tournament_invite_links.use_case.test.ts`): returns `registrants[]` per link, never exposes `token`/`tokenHash`; 403/404 same as above.
- T9 (`revoke_tournament_invite_link.use_case.test.ts`): sets `revokedAt`; idempotent on already-revoked; 403 when unauthorized (no mutation); 404 when `linkId` belongs to another `tournamentId`.
- T10 (`get_tournament_invite_link_preview.use_case.test.ts`): 400 before any lookup when token length outside `40..200`; 410/409 via `assertTournamentInviteLinkUsableSV`; `acceptsRegistration` reflects `isTournamentRosterOpenSV` without throwing.
- T11 (`register_via_tournament_invite_link.use_case.test.ts`): AUTHENTICATED happy path increments `usesCount` + calls `setInviteLinkIdSV` only when `created === true`; idempotent retry does neither; GUEST happy path sets `registeredByUserId = link.createdByUserId`; GUEST always increments (no idempotency); 410/409 token states; `TORNEO_CERRADO`/`CUPOS_AGOTADOS` via reused checks; invalid guest body → 400 with no DB write.

---

### Phase 4 — Backend: infrastructure

| ID | Description | Depends on | File(s) | Requirement |
|----|---|---|---|---|
| T12 | `PrismaTournamentInviteLinkRepository` (create): token gen (`randomBytes(32)` base64url) + sha256 hash, all 6 port methods | T1, T2 | `services/api/src/infrastructure/adapters/prisma_tournament_invite_link_repository.ts` | NFR-TIL-001, REQ-TIL-002/005/006 |
| T13 | Modify `PrismaTournamentRegistrationRepository`: `createGuestSV` passes `inviteLinkId`; add `setInviteLinkIdSV` | T1, T3 | `services/api/src/infrastructure/adapters/prisma_tournament_registration_repository.ts` | design decision #3 |

**Parallel group C:** T12, T13 run in parallel with each other **and with all of Phase 3** — different files, both only need Phase 1's migration (T1) and ports (T2/T3), not the use cases.

**Test notes** (integration, require `TEST_DATABASE_URL`):
- T12: new `src/test/integration/tournament_invite_link_repository.http-db.integration.test.ts` (mirror `prisma_tournament_guest_schedule_token_repository` pattern) — `createSV` returns raw token once and only the hash is persisted (assert DB row has no raw token column/value); `findByTokenHashSV` round-trips on the raw token via hash, never a raw comparison; `listByTournamentIdWithRegistrantsSV` returns the right `registrants[]` shape; `incrementUsesCountSV`/`revokeSV` idempotency.
- T13: extend the existing `prisma_tournament_registration_repository` integration test file with: `createGuestSV` persists `inviteLinkId` when passed; new `setInviteLinkIdSV` assertion.

---

### Phase 5 — Backend: presentation & wiring

| ID | Description | Depends on | File(s) | Requirement |
|----|---|---|---|---|
| T14 | Zod schemas (params/token/create-body) | — | `services/api/src/presentation/validation/tournament_invite_link.validation.ts` | REQ-TIL-002 (token length), REQ-TIL-004 (shape only) |
| T15 | `PUBLIC_WEB_URL` env var | — | `services/api/src/config/env.ts` | design decision #8 |
| T16 | 5 controllers | T7, T8, T9, T10, T11 | `services/api/src/presentation/controllers/tournament_invite_link.controller.ts` | REQ-TIL-001/005/006/007/008 |
| T17 | Router (3 authenticated + 2 public routes, one `Router()`, same pattern as `tournament_schedule.router.ts`) | T16, T14 | `services/api/src/presentation/routes/tournament_invite_link.router.ts` | REQ-TIL contract table |
| T18 | Composition (DI wiring, imports `REGISTER_TOURNAMENT_PARTICIPANT_UC` from `tournament_registration.composition.ts`) | T7, T8, T9, T10, T11, T12, T13, T15 | `services/api/src/presentation/composition/tournament_invite_link.composition.ts` | design decision #6 |
| T19 | Register router in the API router + end-to-end HTTP tests | T17, T18 | `services/api/src/presentation/routes/api.v1.router.ts` | Full contract table |

**Parallel:** T14 and T15 have no dependency on anything and can be done anytime, even during Phase 1 — included here per the user's phase grouping, but a worker is free to pick them up early.
**Sequential:** T16 → T17 → T18 → T19 is a real chain (controllers need all 5 use cases to exist; router needs controllers+validation; composition needs every concrete piece; router registration needs the composed router). T18 and T17 can be built concurrently by two workers since they don't share a file, but T19 needs both finished.

**Test notes:**
- T16: not independently unit-tested per project convention (no isolated controller tests found for comparable features) — covered by T19's HTTP tests.
- T17/T18: covered by T19.
- T19: new `src/test/integration/tournament_invite_link.http-db.integration.test.ts` (and/or an `http.contract.test.ts` for the 400/404/422 shape-only cases that don't need a DB). RED: all 5 endpoints 404 (router not registered). GREEN: full REQ-TIL-001..012 scenario table from the spec, end to end — this is the first point where the complete backend flow is actually exercised together.

---

### Phase 6 — Mobile: data & state

| ID | Description | Depends on | File(s) | Requirement |
|----|---|---|---|---|
| T20 | DTOs (link + registrant) | — | `apps/mobile/lib/src/features/tournament_invite_link/data/models/tournament_invite_link_dto.dart` | API contract shape |
| T21 | API client (5 HTTP calls via `ApiClient`) | T20 | `apps/mobile/lib/src/features/tournament_invite_link/data/tournament_invite_link_api.dart` | API contract shape |
| T22 | Repository (DTO ↔ domain mapping, errors) | T20, T21 | `apps/mobile/lib/src/features/tournament_invite_link/data/tournament_invite_link_repository.dart` | — |
| T23 | Cubit state (organizer side) | T20 | `.../presentation/cubit/tournament_invite_links_state.dart` | — |
| T24 | Cubit (generate/list/revoke, organizer side) | T22, T23 | `.../presentation/cubit/tournament_invite_links_cubit.dart` | REQ-TIL-001/005/006 |
| T25 | Cubit (preview/register, public/player side) | T22 | `.../presentation/cubit/tournament_invite_link_register_cubit.dart` | REQ-TIL-007/008/012 |

**Sequential chain:** T20 → T21 → T22 is a real chain (DTO shape → API calls → mapping). T23 only needs T20 and can be written by a second worker in parallel with T21/T22. T24 and T25 both only need T22 (+T23 for T24) and are two different files — **parallel group D: T24, T25**.
This whole phase has zero dependency on the backend being merged (mocked `ApiClient`/Dio in unit tests), only on the API **contract** already fixed in `spec.md`.

**Test notes** (`apps/mobile/test/...`, `mocktail` + `bloc_test`):
- T20: `fromJson`/`toJson` mapping unit tests, including the registrants sub-list.
- T21: mocked-Dio unit tests for the 5 calls (happy + error envelopes).
- T22: mapping/error-translation unit tests.
- T23: trivial `Equatable` state — usually no dedicated test, covered via T24's bloc tests.
- T24 (`tournament_invite_links_cubit_test.dart`): `bloc_test` scenarios for generate/list/revoke success + failure states; `tearDown(() => cubit.close())`.
- T25 (`tournament_invite_link_register_cubit_test.dart`): preview-loaded/invalid-reason states, register success/failure, authenticated-vs-guest branching.

---

### Phase 7 — Mobile: deep linking

| ID | Description | Depends on | File(s) | Requirement |
|----|---|---|---|---|
| T26 | Add `app_links` dependency | — | `apps/mobile/pubspec.yaml` | design decision #10 |
| T27 | Route path helpers (`tournamentInviteLinks`, `tournamentInviteLinkRegister` → `/invite/:token`) | — | `apps/mobile/lib/src/router/routes.dart` | REQ-TIL-011 |
| T28 | Deep link handler (cold-start + hot stream, same pattern as `push_notification_tap_handler.dart`) | T26 | `apps/mobile/lib/src/core/deep_link/tournament_invite_link_deep_link_handler.dart` | REQ-TIL-011 |
| T29 | Android `intent-filter autoVerify="true"` for the invite domain | — | `apps/mobile/android/app/src/main/AndroidManifest.xml` | REQ-TIL-011 |
| T30 | iOS Associated Domains (`applinks:<dominio>`) | — | iOS `Runner.entitlements` (or equivalent) | REQ-TIL-011 |
| T35 | Wire 2 new `GoRoute`s outside the shell | T27, **T32, T33 (Phase 8)** | `apps/mobile/lib/src/router/app_router.dart` | REQ-TIL-011 |
| T36 | Call `setupTournamentInviteLinkDeepLinkHandler(router.router)` in bootstrap | T28, T35 | `apps/mobile/lib/src/app/app.dart` | REQ-TIL-011 |

**Parallel group E:** T26, T27, T29, T30 — fully independent of each other and of everything else in mobile; a worker can do all four early. T28 only needs T26.
**Cross-phase dependency flagged explicitly:** T35 cannot be implemented for real before the two Phase 8 screens (T32 `TournamentInviteLinksScreen`, T33 `TournamentInviteLinkRegisterScreen`) exist, because `GoRoute.builder` references those screen widgets. Do not let the orchestrator launch T35 believing "Phase 7" is self-contained — it is the one task in this phase that must wait on Phase 8. T36 then waits on both T28 and T35.

**Test notes:**
- T26/T29/T30: no automated RED/GREEN — structural/config correctness only (pubspec resolves, manifest/entitlements XML is well-formed and references the right domain). This is the documented AGENTS.md exception for platform config with no meaningful runnable test.
- T28: unit test for the pure "extract token from `Uri`" logic if factored out as a small function (`extractInviteTokenFromUri` or similar) — RED/GREEN on parsing `/invite/<token>` paths, rejecting malformed ones. The actual OS-level deep link delivery is verified manually on-device, not automated.
- T35/T36: covered by a widget/router test if the project has one for `setupPushNotificationTapHandler`'s equivalent wiring (check precedent before writing); otherwise structural readback + manual device verification, same exception as above.

---

### Phase 8 — Mobile: UI

| ID | Description | Depends on | File(s) | Requirement |
|----|---|---|---|---|
| T31 | `GenerateInviteLinkSheet` (parallel to `invite_guest_sheet.dart`) | T24 | `.../presentation/widgets/generate_invite_link_sheet.dart` | REQ-TIL-001 |
| T32 | `TournamentInviteLinksScreen` (list + revoke + registrants) | T24, T31 | `.../presentation/tournament_invite_links_screen.dart` | REQ-TIL-005/006 |
| T33 | `TournamentInviteLinkRegisterScreen` (deep link target) | T25 | `.../presentation/tournament_invite_link_register_screen.dart` | REQ-TIL-007/008/012 |
| T34 | Add "Generar link" button | T32 | `.../tournament_detail/org_registrations_tab.dart` | REQ-TIL-001 |

**Parallel:** T31/T32 (one worker, sequential — T32 opens T31 as a sheet) can proceed fully in parallel with T33 (different worker, different file, depends only on T25 from Phase 6). T34 is a small, mechanical, already-understood single-line addition once T32 exists — fine to do inline rather than delegate.
**Remember:** T32 and T33 are the blockers for T35 in Phase 7 — report them done before attempting T35/T36.

**Test notes** (widget tests, `bloc_test`/`mocktail`):
- T31: `generate_invite_link_sheet_test.dart` — submit calls `cubit.generate(...)`, shows the one-time token/share action, loading/error states.
- T32: `tournament_invite_links_screen_test.dart` — renders list, revoke action calls cubit, shows registrants per link.
- T33: `tournament_invite_link_register_screen_test.dart` — preview rendering per reason (valid/expired/revoked/exhausted/closed), authenticated "confirm" vs guest form branching.
- T34: covered by `org_registrations_tab_test.dart` if one exists — otherwise structural readback (button present, correct `onTap`) is proportional for a one-line addition.

---

### Phase 9 — Web

| ID | Description | Depends on | File(s) | Requirement |
|----|---|---|---|---|
| T37 | 2 new `ApiClient` methods | — | `apps/web/src/lib/api-client.ts` | REQ-TIL-007/008/012 |
| T38 | Landing page (server component: preview fetch + conditional form) | T37, T39 | `apps/web/src/app/invite/[token]/page.tsx` | REQ-TIL-012 |
| T39 | Form client component (state + register call) | T37 | `apps/web/src/app/invite/[token]/invite-form.tsx` | REQ-TIL-007/008/012 |

**Sequential:** T37 has no dependency and should land first (compile-time only — no need to wait for the backend to be merged to write/unit-test it against a mocked fetch, but it is only *functionally* exercisable once T19 is live). T39 depends only on T37; T38 depends on both T37 and T39 (it imports `<InviteForm>`). **T38 and T39 can be built by the same worker sequentially, or T39 delegated separately and handed to whoever does T38.**
Confirmed by exploration: `apps/web/src/middleware.ts` does not guard `/invite`, so no guard changes are needed here (design decision #11) — do not add any.

**Test notes** (`vitest` + Testing Library, per `apps/web/package.json`):
- T37: unit test mocking the underlying HTTP call, asserting the two new methods hit the right public endpoints with the right payload shape.
- T39: component test — invalid guest input shows validation error without calling the API; valid submit calls `registerViaTournamentInviteLink` and shows confirmation.
- T38: renders the right "invalid reason" message per REQ-TIL-012's scenario (expired/revoked/exhausted/closed) based on the preview response; renders `<InviteForm>` when valid.

---

### Phase 10 — Final verification

| ID | Description | Depends on | Requirement |
|----|---|---|---|
| T40 | Run full automated verification across the three codebases | all of T1–T39 | — |
| T41 | Traceability checklist: map every REQ-TIL-001..012 / NFR-TIL-001..004 to the task(s) and test(s) that cover it, using the spec's "Traceability to proposal" table as the scaffold; flag any gap | T40 | all requirements |

**Sequential: T40 → T41** (T41 cites T40's pass/fail evidence).

**T40 commands:**
- `cd services/api && npm run typecheck && npm run lint && npm test`
- `cd apps/mobile && flutter analyze && flutter test`
- `cd apps/web && npm run lint && npm test && npm run build`

**T41 — requirement → task/test map (to be filled with pass/fail evidence when run):**

| Requirement | Covered by task(s) | Covered by test(s) |
|---|---|---|
| REQ-TIL-001 | T7, T16, T17, T19, T31, T34 | `create_tournament_invite_link.use_case.test.ts`, T19's HTTP suite, `generate_invite_link_sheet_test.dart` |
| REQ-TIL-002 | T2, T4, T12, T14 | `tournament_invite_link_validity.test.ts`, T12's integration test, T19's 400-before-DB case |
| REQ-TIL-003 / NFR-TIL-004 | T7 | `create_tournament_invite_link.use_case.test.ts` (default/override scenarios) |
| REQ-TIL-004 | T2, T7, T4 | same as above + `tournament_invite_link_validity.test.ts` (`ENLACE_AGOTADO`) |
| REQ-TIL-005 | T9, T32 | `revoke_tournament_invite_link.use_case.test.ts`, `tournament_invite_links_screen_test.dart` |
| REQ-TIL-006 | T8, T12, T32 | `list_tournament_invite_links.use_case.test.ts`, T12's integration test, `tournament_invite_links_screen_test.dart` |
| REQ-TIL-007 | T3, T11, T13, T25, T33, T37, T39 | `register_via_tournament_invite_link.use_case.test.ts`, T19's HTTP suite, mobile/web cubit+form tests |
| REQ-TIL-008 | T5, T11, T13, T25, T33, T37, T39 | `register_guest_for_tournament_core.test.ts`, `register_via_tournament_invite_link.use_case.test.ts`, same mobile/web tests |
| REQ-TIL-009 | T5, T11 | both use case test files |
| REQ-TIL-010 | T5, T11 | both use case test files |
| REQ-TIL-011 | T26–T30, T35, T36, T28's pure-parser test | manual on-device verification + any pure-function unit test |
| REQ-TIL-012 | T10, T19, T33, T38, T39 | `get_tournament_invite_link_preview.use_case.test.ts`, T19's HTTP suite, web/mobile landing tests |
| NFR-TIL-001 | T12, T2, T4 | T12's integration test (assert no raw token persisted) |
| NFR-TIL-002 | — (documented limitation, no implementation task) | N/A — confirm `rg rateLimit\|RateLimit` still returns 0 and this stays undocumented-as-accepted, not silently dropped |
| NFR-TIL-003 | T5, T11, T14 | reuses `INVITE_GUEST_TOURNAMENT_PARTICIPANT_BODY_SCHEMA` — no new schema to test, assert it's actually reused (not duplicated) during code review |

---

## Execution order (topological, by phase)

1. **T1, T2, T3** (parallel) → **T14, T15, T26, T27, T29, T30, T20** (fully independent, may start immediately too)
2. **T4** (after T2) · **T21** (after T20) · **T28** (after T26)
3. **T5** (after T3) · **T22** (after T20, T21) · **T23** (after T20)
4. **T6** (after T5) **in parallel with** **T7, T8, T9, T10, T11** (after T2/T4, T11 also after T5) **in parallel with** **T12, T13** (after T1, T2/T3) · **T24, T25** (after T22, T23)
5. **T16** (after T7–T11) · **T31, T33** (after T24 / T25 respectively) · **T37** (no dep, may have started earlier)
6. **T17** (after T16, T14) · **T32** (after T24, T31) · **T39** (after T37)
7. **T18** (after T7–T13, T15) · **T34** (after T32) · **T35** (after T27, T32, T33) · **T38** (after T37, T39)
8. **T19** (after T17, T18) · **T36** (after T28, T35)
9. **T40** (after everything)
10. **T41** (after T40)

## Parallelization summary for the orchestrator

- **Safe to launch together, no file/data overlap:** {T1, T2, T3}, {T14, T15}, {T26, T27, T29, T30}, {T7, T8, T9, T10, T11} once their individual deps clear, {T12, T13}, {T24, T25}, {T31-chain, T33}.
- **Strictly sequential, same logic/file, never parallel writers:** T5 → T6; T20 → T21 → T22; T16 → T17 → T18 → T19; T37 → T39 → T38.
- **Cross-phase trap to flag explicitly to the orchestrator:** T35 (Phase 7, `app_router.dart`) is blocked on T32/T33 (Phase 8 screens), not just on its own phase's T27. Do not dispatch T35 right after T26–T30 finish — wait for Phase 8.

---

## Tasks (checklist)
- [x] T1 — Prisma migration (new model + aditive field). `prisma validate` passes, `prisma generate` applied. Migration SQL written by hand at `prisma/migrations/20261028000000_add_tournament_invite_link/migration.sql` (standard Prisma `-- CreateTable/-- CreateIndex/-- AddForeignKey` format) because `prisma migrate dev` could not run: the local dev DB has pre-existing drift unrelated to this change (migration `20260915010000_add_registration_identity_to_match_scores`, introduced in commit `ac79b5d`, was modified after being applied). Fixing that requires a destructive `prisma migrate reset`, which was not run without explicit user authorization — NOT applied against the live dev DB yet.
- [x] T2 — `tournament_invite_link_repository.ts` port + DTOs
- [x] T3 — modify `tournament_registration_repository.ts` port (`inviteLinkId?` on `CreateGuestTournamentRegistrationDTO`, `setInviteLinkIdSV` on the interface)
- [x] T4 — `tournament_invite_link_validity.ts` pure function. TDD: RED confirmed (`assertTournamentInviteLinkUsableSV` didn't exist), GREEN confirmed (4/4 tests pass) in `src/test/unit/tournament_invite_link_validity.test.ts`.
- [x] T5 — extract `register_guest_for_tournament_core.ts`. TDD: RED confirmed (module didn't exist), GREEN confirmed (7/7 tests) in `src/test/unit/register_guest_for_tournament_core.test.ts` — covers roster-closed → `TORNEO_CERRADO`, competitive+paid → `403 TORNEO_RESTRINGIDO` (2026-10-28 user-confirmed scenario), `maxSlots` exhausted → `CUPOS_AGOTADOS`, happy path with/without `inviteLinkId`.
- [x] T6 — refactor `invite_guest_tournament_participant.use_case.ts` to delegate. Behavior-preserving (no new RED/GREEN, per AGENTS.md exception). Regression guard: `tournament_guest_registration.http-db.integration.test.ts` + `tournament_guest_registration_end_to_end.http-db.integration.test.ts` showed identical 21 failed / 12 passed (33) before and after — the 21 pre-existing failures are caused by `TournamentRegistration.inviteLinkId` not existing on `TEST_DATABASE_URL` yet (T1's migration was handwritten and never applied there, out of this phase's scope), not by this refactor.
- [x] T7 — `create_tournament_invite_link.use_case.ts`. TDD: RED confirmed (module didn't exist), GREEN confirmed (8/8 tests) in `src/test/unit/create_tournament_invite_link.use_case.test.ts` — covers 201 shape (raw token + url=deepLink), 403 NO_AUTORIZADO (no create), 404 TORNEO_NO_ENCONTRADO, default `expiresAt=MIN(registrationClosesAt,startsAt)` when both future, default `+30d` when neither set, 422 on override outside `[now+1h, now+180d]`, 422 on `maxUses` 0/-1.
- [x] T8 — `list_tournament_invite_links.use_case.ts`. TDD: RED confirmed, GREEN confirmed (3/3 tests) — returns `registrants[]` per link without exposing `token`/`tokenHash`, 403/404 same pattern as T7.
- [x] T9 — `revoke_tournament_invite_link.use_case.ts`. TDD: RED confirmed, GREEN confirmed (5/5 tests) — sets `revokedAt` via `revokeSV`, idempotent on already-revoked, 403 without mutation, 404 `ENLACE_NO_ENCONTRADO` (not `TORNEO_NO_ENCONTRADO`) both when the tournament is missing and when `linkId` belongs to another tournament (design.md, "Puntos resueltos" #2).
- [x] T10 — `get_tournament_invite_link_preview.use_case.ts`. TDD: RED confirmed, GREEN confirmed (6/6 tests) — happy path shape, `acceptsRegistration` reflects `isTournamentRosterOpenSV` without throwing, 410/409/410(no-match) via `assertTournamentInviteLinkUsableSV`. Note: the plan's test-note scenario "400 before any lookup when token length outside 40..200" was **not** duplicated here — per design.md decision #4 and the confirmed `guest-schedule` precedent (`GUEST_SCHEDULE_TOKEN_PARAM_SCHEMA`), token-length format validation lives only in zod at the presentation layer (T14), never duplicated in the use case; that scenario belongs to T19's HTTP-level test, out of this phase's scope.
- [x] T11 — `register_via_tournament_invite_link.use_case.ts`. TDD: RED confirmed, GREEN confirmed (11/11 tests) — AUTHENTICATED branch delegates on `RegisterTournamentParticipantUseCase` unmodified, increments `usesCount`+`setInviteLinkIdSV` only when `created === true` (idempotent retry does neither); GUEST branch calls `registerGuestForTournamentCoreSV` directly (never `InviteGuestTournamentParticipantUseCase`, design.md decision #1) with `registeredByUserId = link.createdByUserId`, always increments `usesCount` (no idempotency); reuses `TORNEO_CERRADO`/`CUPOS_AGOTADOS` via the helper; 410/409/410(no-match) link-validity states before touching either branch. Note: the plan's "invalid guest body → 400 with no DB write" scenario was **not** tested here — per design.md's data flow, guest-body format validation (`INVITE_GUEST_TOURNAMENT_PARTICIPANT_BODY_SCHEMA`) happens in the controller (T16) before `executeSV` is ever called; the UC trusts `guestInput` is already well-formed. That scenario belongs to T16/T19, out of this phase's scope.
- [x] T12 — `prisma_tournament_invite_link_repository.ts`. TDD: RED confirmed (module didn't exist), GREEN confirmed (8/8 tests) in `src/test/integration/tournament_invite_link_repository.http-db.integration.test.ts` — `createSV` returns the raw token once and persists only `sha256(token)` as `tokenHash` (asserted against the raw DB row, no raw token anywhere); `findByTokenHashSV` round-trips by hashing internally, returns `null` on no match; `findByIdAndTournamentIdSV` scoped correctly; `listByTournamentIdWithRegistrantsSV` returns `registrants[]` with `displayName` = user name (AUTHENTICATED) or `guestName` (GUEST), never exposes `token`/`tokenHash`; `incrementUsesCountSV`/`revokeSV` idempotency. Token gen/hash live in infrastructure per design decision #2 (precedent: `PrismaTournamentGuestScheduleTokenRepository`).
- [x] T13 — modify `prisma_tournament_registration_repository.ts`. TDD: RED confirmed (`inviteLinkId` not persisted by `createGuestSV`, `setInviteLinkIdSV` missing from the class), GREEN confirmed (3/3 tests) in new `src/test/integration/tournament_registration_repository.integration.test.ts` — `createGuestSV` now passes `inviteLinkId` through to the Prisma `create` call (`null` when absent), and `setInviteLinkIdSV(_registrationId, _inviteLinkId)` was added to satisfy the port interface. This resolved all 16 pre-existing `tsc` errors (`Property 'setInviteLinkIdSV' is missing...`) — confirmed `npm run typecheck` now passes with 0 errors.
- [x] T14 — `tournament_invite_link.validation.ts`. 4 schemas zod exactos (params de torneo, params de link, params de token `min(40).max(200)`, body de creación `expiresAt?`/`maxUses?`); el body de invitado del registro reusa `INVITE_GUEST_TOURNAMENT_PARTICIPANT_BODY_SCHEMA` tal cual, sin schema propio.
- [x] T15 — `PUBLIC_WEB_URL` env var. Mismo patrón que `PUBLIC_API_URL` en `env.ts` (`z.string().url().default('http://localhost:3000')`).
- [x] T16 — `tournament_invite_link.controller.ts`. 5 controllers: 3 autenticados (`requireActorUserIdSV`) + 2 públicos (`optionalAuth`); el de registro ignora el body cuando hay `_req.authUser` y valida con `INVITE_GUEST_TOURNAMENT_PARTICIPANT_BODY_SCHEMA` cuando no.
- [x] T17 — `tournament_invite_link.router.ts`. Un solo `Router()` (mismo patrón que `tournament_schedule.router.ts`): 3 rutas `requireAuth` + 2 públicas con `optionalAuth`.
- [x] T18 — `tournament_invite_link.composition.ts`. Wiring de los 5 use cases; `REGISTER_TOURNAMENT_PARTICIPANT_UC` importado desde `tournament_registration.composition.ts` sin tocarlo (design.md decisión #6); `ENV_CONST.PUBLIC_WEB_URL` para `url`/`deepLink`.
- [x] T19 — router registrado en `api.v1.router.ts` + E2E HTTP tests. TDD: RED confirmado (los 5 endpoints devolvían 404 con el router sin registrar, 21/21 tests fallando), GREEN confirmado (21/21 tests) en `src/test/integration/tournament_invite_link.http-db.integration.test.ts` — cubre la tabla de contrato completa del spec (happy path autenticado e invitado, idempotencia AUTHENTICATED vs no-idempotencia GUEST, expirado/revocado/agotado, torneo cerrado, cupos agotados, 403 sin autoridad, 404 torneo inexistente, 404 link de otro torneo al revocar, 400 antes de tocar DB con token de largo inválido, 422 `expiresAt`/`maxUses` fuera de rango). Efecto colateral detectado y corregido fuera de la superficie de edición original: las 5 rutas nuevas rompían `openapi_route_coverage.test.ts` (cobertura de OpenAPI) — se agregaron a `src/test/unit/openapi_route_coverage.debt.ts` siguiendo el mismo patrón ya usado por `tournament_registration`/`tournament_invitation`/`tournament-guest-schedule` (rutas de torneos documentadas como deuda, no en `openapi.ts`), en vez de escribir specs OpenAPI nuevas fuera de alcance. Suite completa: 1146 passed, 1 failed (preexistente, `quick_match_group.http-db.integration.test.ts`, causa raíz confirmada: mismatch de Prisma client en `prisma_quick_match_repository.ts`, ajeno a #47).
- [ ] T20 — mobile DTOs
- [ ] T21 — mobile API client
- [ ] T22 — mobile repository
- [ ] T23 — mobile cubit state (organizer)
- [ ] T24 — mobile cubit (organizer)
- [ ] T25 — mobile cubit (public register)
- [ ] T26 — `app_links` dependency
- [ ] T27 — `routes.dart` path helpers
- [ ] T28 — deep link handler
- [ ] T29 — Android manifest intent-filter
- [ ] T30 — iOS entitlements
- [ ] T31 — `GenerateInviteLinkSheet`
- [ ] T32 — `TournamentInviteLinksScreen`
- [ ] T33 — `TournamentInviteLinkRegisterScreen`
- [ ] T34 — "Generar link" button in `org_registrations_tab.dart`
- [ ] T35 — wire 2 `GoRoute`s in `app_router.dart`
- [ ] T36 — wire deep link handler in `app.dart`
- [ ] T37 — web `api-client.ts` methods
- [ ] T38 — `invite/[token]/page.tsx`
- [ ] T39 — `invite/[token]/invite-form.tsx`
- [ ] T40 — run full verification (3 codebases)
- [ ] T41 — traceability checklist against spec

## Verification
- `cd services/api && npm run typecheck && npm run lint && npm test`
- `cd apps/mobile && flutter analyze && flutter test`
- `cd apps/web && npm run lint && npm test && npm run build`

## Relevant Files
- `openspec/changes/issue-47-tournament-invite-link/spec.md`
- `openspec/changes/issue-47-tournament-invite-link/design.md`
- `services/api/prisma/schema.prisma`
- `services/api/src/domain/ports/tournament_invite_link_repository.ts`
- `services/api/src/domain/ports/tournament_registration_repository.ts`
- `services/api/src/domain/tournament/tournament_invite_link_validity.ts`
- `services/api/src/application/helpers/register_guest_for_tournament_core.ts`
- `services/api/src/application/use_cases/invite_guest_tournament_participant.use_case.ts`
- `services/api/src/application/use_cases/create_tournament_invite_link.use_case.ts`
- `services/api/src/application/use_cases/list_tournament_invite_links.use_case.ts`
- `services/api/src/application/use_cases/revoke_tournament_invite_link.use_case.ts`
- `services/api/src/application/use_cases/get_tournament_invite_link_preview.use_case.ts`
- `services/api/src/application/use_cases/register_via_tournament_invite_link.use_case.ts`
- `services/api/src/infrastructure/adapters/prisma_tournament_invite_link_repository.ts`
- `services/api/src/infrastructure/adapters/prisma_tournament_registration_repository.ts`
- `services/api/src/presentation/validation/tournament_invite_link.validation.ts`
- `services/api/src/presentation/controllers/tournament_invite_link.controller.ts`
- `services/api/src/presentation/routes/tournament_invite_link.router.ts`
- `services/api/src/presentation/routes/api.v1.router.ts`
- `services/api/src/presentation/composition/tournament_invite_link.composition.ts`
- `services/api/src/config/env.ts`
- `apps/mobile/lib/src/features/tournament_invite_link/` (new module, data/presentation)
- `apps/mobile/lib/src/core/deep_link/tournament_invite_link_deep_link_handler.dart`
- `apps/mobile/lib/src/router/routes.dart`
- `apps/mobile/lib/src/router/app_router.dart`
- `apps/mobile/lib/src/app/app.dart`
- `apps/mobile/lib/src/features/tournaments/presentation/tournament_detail/org_registrations_tab.dart`
- `apps/mobile/pubspec.yaml`
- `apps/mobile/android/app/src/main/AndroidManifest.xml`
- `apps/web/src/lib/api-client.ts`
- `apps/web/src/app/invite/[token]/page.tsx`
- `apps/web/src/app/invite/[token]/invite-form.tsx`
