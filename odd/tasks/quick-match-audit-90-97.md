# Quick Match audit — issues #90-#97

Two independent units, disjoint edit surfaces: T1 (API, parent inline) and T2 (Mobile, delegated writer).

## Specs

### API (#90-#93) — branch `fix/quick-match-api-correctness-90-91-92-93`

- **S1 (#90)**: `findCompatibleGroupSV` and `createGroupProposalsSV`'s `SERIALIZED_GROUPS` query must filter `expiresAt: { gt: new Date() }`, matching the open-match path (`findOpenCandidateSV`'s `HOLDS` query already does this). A stale PENDING proposal not yet swept by `expireProposalForUserSV` must not block/absorb new group candidates.
- **S2 (#91)**: `cancelForUserSV` must clean up a PENDING/CONFIRMED group proposal exactly like `dismissProposalForUserSV` does (shrink remaining members' `playerIds`, mark the cancelled user's row `DISMISSED`) before setting the search `CANCELLED` — otherwise the group can never reach `ALL_CONFIRMED` (a row stuck PENDING forever).
- **S3 (#92)**: `ConfirmMyQuickMatchProposalUseCase.executeSV` must tolerate a `YA_UNIDO` (409) from `joinMatch.executeSV` as "already done" and proceed to confirm the proposal — safe retry after a partial failure (join succeeded, confirm didn't).
- **S4 (#93)**: when a group proposal is (re)created, notify not only `invitationUserIds` but also pre-existing group members (`existingMemberUserIds`, new field on `QuickMatchGroupCandidateDTO`) — they must learn a new player joined without having to poll `GET /quick-match` on their own.

### Mobile (#94-#97) — branch `fix/quick-match-mobile-ux-94-95-96-97`

- **S5 (#95)**: `QuickMatchCubit` must propagate the real API error message/code instead of a fixed generic string per action (`quick_match_cubit.dart:26-27,35-36,43-44,51-52`), same pattern other features use for `AppFailure`.
- **S6 (#96)**: the waiting screen (`_Searching` in `quick_match_screen.dart`) must periodically refresh the search state while visible (e.g. `Timer.periodic`), instead of loading once in `initState` and never again.
- **S7 (#97)**: tapping the foreground proposal notification while the Quick Match screen is already open must refresh that screen instead of pushing a second instance (`foreground_notification_handler.dart:110-114`).
- **S8 (#94)**: add test coverage for the feature as part of fixing S5-S7 (cubit, screen, notification-handler tests) — there is currently zero coverage (`**/*quick_match*test.dart` returns nothing).

## Tasks

| ID | Linked S# | Route | Status | Commit/Evidence |
|----|-----------|-------|--------|------------------|
| T1 | S1-S4 | inline (parent) | done | PR #98, merged `73bc583` |
| T2 | S5-S8 | delegated (mobile writer) | done | branch `fix/quick-match-mobile-ux-94-95-96-97`, commit `8318d77` |
| T3 | all | parent seam check | pending | |

## Log

- **L1**: User asked (informal Spanish) what's missing re: Quick Match queue, notifications, UX, unseen errors. Audited via explorer agent, documented as #90-#97, user confirmed "si" to start implementing all.
- T1 (API): fixed in `prisma_quick_match_repository.ts` (S1, S2), `confirm_my_quick_match_proposal.use_case.ts` (S3), `match_quick_match.use_case.ts` + `quick_match_repository.ts` port (S4). New test file `quick_match_correctness.http-db.integration.test.ts`, 4 RED-then-GREEN cases. Regression: existing `quick_match_group.http-db.integration.test.ts` unchanged and green. Typecheck/lint clean.
- T2 (Mobile): S5 — `quick_match_cubit.dart`'s `load/start/confirmProposal/dismissProposal` now catch `on AppFailure catch (e) { emit(Failure(e.message)) }` before the generic `catch (_)`, reusing the convention from `matchmaking_cubit.dart`/`open_matches_cubit.dart`; `ApiClient` already throws `AppFailure` for every HTTP failure, so backend codes like `CANCHA_NO_DISPONIBLE`/`PROPUESTA_VENCIDA` now reach the UI. S6 — `_Searching` in `quick_match_screen.dart` became a `StatefulWidget` with a `Timer.periodic(5s)` calling a new `QuickMatchCubit.refreshSilently()` (fetches `current()` without emitting `QuickMatchLoading`, so no spinner flash); timer is cancelled in `dispose()`. S7 — `foreground_notification_handler.dart` gained `resolveNotificationNavigation(...)`, which returns `null` (skip push) when the resolved destination is already the visible route; `_navigateFromData` now uses it before `router.go`/`router.push`. The actual file lives at `lib/src/core/push/foreground_notification_handler.dart`, not under `features/notifications/` as the ticket guessed. S8 — RED-then-GREEN evidence for all three: 4 new cubit tests, 2 new screen tests (poll + timer-cancel-on-dispose), 4 new handler tests, all in pre-existing test files/siblings; no prior quick-match test changed behavior. `flutter analyze`: clean. Commit: `8318d77`.
