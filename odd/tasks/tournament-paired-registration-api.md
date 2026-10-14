# Tournament Paired Registration API

## Objective
Restore the organizer's doubles-pairing UI by including `pairedRegistration` in tournament read responses.

## Problem and Why
The mobile detail screen defaults a missing `pairedRegistration` field to `false`, which suppresses the existing `TournamentPairingSection` even for a doubles tournament. The API's shared list DTO mapper and detail query omit this field.

## Scope
- Add `pairedRegistration` to the tournament query DTO, mapper, and every Prisma select feeding that mapper, including detail and venue listings.
- Document the response field in OpenAPI.
- Add a regression test proving the mapper preserves both `true` and `false`.
- No mobile UI redesign, schema migration, database query, seed, deployment, or push.

## Constraints
- Preserve unrelated untracked `.codegraph/` and `apps/mobile/test/features/tournaments/goldens/failures/` contents.
- Work on branch `codex/tournament-pairing-flag`.
- Do not push or deploy.

## Authorized Scope
The user authorized fixing the hidden doubles-pairing UI and adding a regression test.

## Route and TDD
- Route: delegated direct.
- Trigger evidence: the fix spans the API DTO, Prisma query adapter, OpenAPI, and mapper regression test; writer delegation is required for the multi-file change.
- TDD: enabled by project `AGENTS.md`; runner is Vitest (`services/api`: `npm test`, focused RED/GREEN: `npx vitest run src/test/unit/prisma_tournament_list_mapper.test.ts`).
- Delivery: `ask-on-risk`; forecast is under 100 authored changed lines.
- RDD: disabled by global setting; ordinary verification only (`disabled/unmanaged`).

## Tasks
- [x] **T1 — Expose pairing modality in tournament reads.** Added a failing mapper regression test first, observed RED, then updated DTO/mapper/Prisma selects/OpenAPI and verified GREEN.

## Acceptance Criteria
- List, detail, viewer, and venue tournament reads preserve the persisted `pairedRegistration` boolean.
- The mobile client can receive `true` and render the existing pairing section.
- Regression test fails before the implementation and passes after it.
- Required API verification order passes: typecheck → lint → test.
- Task closes with a Conventional Commit on the feature branch; record commit identity and verification evidence below.

## Progress and Evidence
- Exploration verified the root cause in `services/api/src/infrastructure/adapters/prisma_tournament_query_repository.ts`; mobile already consumes the field and conditionally renders the pairing section.
- Working tree initially had only unrelated untracked `.codegraph/` and `apps/mobile/test/features/tournaments/goldens/failures/` data; preserve both.
- TDD RED: the two new `pairedRegistration` mapper assertions failed before implementation because the mapper omitted the field.
- Verification passed: focused mapper test (8/8); `npm run typecheck`; `npm run lint`; `npm test` (185 files, 1,051 tests); `git diff --check`.
- Implementation work-unit commit: `2d73f921502352f714683122afbdde0dead621f1` — `fix(api): expose tournament pairing mode`.
- No push or deploy was performed. RDD remained disabled/unmanaged; no native review was run.

## Next Step
Local fix and verification are complete. Push or deploy only if the user separately requests it.

## Relevant Files
- `services/api/src/domain/ports/tournament_query_repository.ts` — read DTO contract.
- `services/api/src/infrastructure/adapters/prisma_tournament_query_repository.ts` — serializer and Prisma field selections.
- `services/api/src/presentation/openapi/openapi.ts` — API response documentation.
- `services/api/src/test/unit/prisma_tournament_list_mapper.test.ts` — mapper regression test.
- `services/api/src/test/unit/prisma_tournament_viewer_summary_mapper.test.ts` — required read-response fixture.
- `apps/mobile/lib/src/features/tournaments/presentation/tournament_detail/org_registrations_tab.dart` — existing pairing UI gated by the flag.
