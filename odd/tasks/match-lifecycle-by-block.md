# Match lifecycle by court block

Objective: open matches start and end with their court block, loading the result ends the match, and players are reminded to load it. Branch `feat/match-lifecycle-by-block` (from `7952ff4`, on top of the unmerged `fix/match-result-and-live-screen`). Delivery: `ask-on-risk`. Runners: API `npm test` (Vitest; integration needs `TEST_DATABASE_URL`), mobile `flutter test`.

## Specs

Scope: regular (open/quick) matches — `Match.tournamentId` null. Tournament matches keep their own flow except where S7 says otherwise.

- **S1 — Start only by block time.** User's words: "se empieza la partida es al momento de iniciar debe iniciar es por la hora del bloque no que el organizador le iniciar". A match goes `SCHEDULED → IN_PROGRESS` only by the existing match-status worker at `scheduledAt` (rule unchanged: full and paid → in progress, otherwise cancelled). Clients never offer a manual start. The API endpoint `POST /matches/:id/start` stays (no client uses it; documented as not used by apps).
- **S2 — Loading the result ends the match.** When a participant proposes a result (`upsert` match result draft) for a match that is `IN_PROGRESS`, the API moves it to `FINISHED` in the same transaction and stores the draft. A `SCHEDULED` or `CANCELLED` match still rejects a result (message must say the match has not started / was cancelled, not "debe estar finalizado"). Confirm/repropose keep requiring `FINISHED` (they always follow a proposal).
- **S3 — Auto-finish at block end.** The worker moves `IN_PROGRESS → FINISHED` when `now >= scheduledAt + blockMinutes`, where `blockMinutes` is the linked `Reservation.durationMinutes`, or 90 when the match has no reservation. Matches with `scheduledAt` null are not touched.
- **S4 — Reminder to load the result.** User's words: "si nadie cargo el resultado despues de la hora del bloque llegar un recordatorio a los 4". When a match is finished at block end (S3) and has no result draft, every participant gets a `MATCH_RESULT_REMINDER` notification (in-app + push, respecting notification subscription preferences) with Spanish text like "¿Cómo salió la partida? Cargá el resultado". Sent once per match (idempotent across worker ticks/instances). New enum value via an additive migration.
- **S5 — Tell players when the worker cancels.** When the worker cancels a match at `scheduledAt` (not full or not paid), every participant gets a `MATCH_CANCELLED` notification whose text says why (incomplete or unpaid), once per match.
- **S6 — Organizer from the API.** `GET /matches/:id` (and the match detail DTO mobile reads) exposes `organizerUserId` (additive field). Mobile uses it instead of assuming the first participant is the organizer.
- **S7 — No live screen (mobile).** User's words: "la pantalla de envivo creo que no tiene mucho sentido". Remove `MatchLiveScreen`, its cubit/state, the `/matches/:matchId/live` route and `Routes.matchLive`. Callers go to the match detail instead (match detail "Ver partido en vivo" CTA; tournament `player_tabs.dart` button).
- **S8 — Match detail states (mobile).**
  - `SCHEDULED`: no start button; shows when the match starts ("Empieza a las HH:MM") plus share. No "Cargar resultado".
  - `IN_PROGRESS`: shows that it is in progress and when the block ends ("En curso · termina HH:MM"); participants get "Cargar resultado" (S2).
  - `FINISHED`: "Cargar resultado" as today.
  - Remove the manual "Iniciar partida" and "Finalizar partida" actions from the actions sheet.
  - Result entry screen accepts `IN_PROGRESS` and `FINISHED` matches; `SCHEDULED`/`CANCELLED` show the existing "todavía no terminó"-style guard with accurate copy.
- **S9 — Reminder tap (mobile).** Tapping a `MATCH_RESULT_REMINDER` notification (push or in-app list) opens the result entry for that match; the notification type is parsed and listed with readable copy.

Out of scope: storing an actual `startedAt` (start is always the block time now), live score.

## Tasks

| ID | Specs | Route | Status | Commit |
|----|-------|-------|--------|--------|
| T1 | S1–S6 (API) | delegated writer (parallel unit, `services/api`) | done; parent wired worker entrypoints + enabledTypes keys | npm test 1329/1329 |
| T2 | S6–S9 (mobile) | delegated writer (parallel unit, `apps/mobile`) | done; parent fixed share text to local time | flutter test 1514/1514 |
| T3 | all | independent verifier (Risk: items 1, 3, 4) | done: S1–S7, S9 pass; B1 (S8 block end) fixed by parent; probes committed | — |

Route evidence: two independent units with disjoint edit surfaces, each several files and well over 100 changed lines, launched together (Writer trigger a). Contract: `organizerUserId` on match detail; `MATCH_RESULT_REMINDER` notification type with `matchId` reachable for deep links; result proposal accepted for `IN_PROGRESS`.

## Log

- **L1 (2026-11-13, user verbatim):** "como se determina que la partida esta terminada? te parece correcto este flujo que mejorarias?"
- **L2 (2026-11-13, user verbatim):** "me parecen bien todas lo otro es que la pantalla de envivo creo que no tiene mucho sentido ademas de que se empieza la partida es al momento de iniciar debe iniciar es por la hora del bloque no que el organizador le iniciar y si nadie cargo el resultado despues de la hora del bloque llegar un recordatorio a los 4"
- **L3 analysis:** today start = worker at `scheduledAt` (full+paid, else silent cancel) or organizer manual start; finish = organizer manual only (`finish_match.use_case.ts`); result requires `FINISHED`. Bug: live "Terminar partido" (`match_live_cubit.dart` `endMatch`) never calls the API, so result submission fails. Mobile infers organizer as first participant; API has `organizerUserId` but does not return it. Live screen is also opened from tournaments (`player_tabs.dart:459`). Block duration lives on `Reservation.durationMinutes` (default 60; quick match/seed use 90).
- **L4 (2026-11-13) T1/T2 done:** API migration `20261113120000_add_match_result_reminder_notification_type`; new error codes `PARTIDO_NO_INICIADO` / `PARTIDO_CANCELADO`; worker cancel now sets reservation matchStatus CANCELLED. Parent wired `UPDATE_MATCH_STATUS_UC` into `main.ts` and `match_status_worker_main.ts` (writer had left them building the use case without notifications) and allowed `MATCH_RESULT_REMINDER` / `QUICK_MATCH_PROPOSAL` in `enabledTypes` validation (RED 400 → GREEN). Mobile: live screen removed, organizer from API, footer/sheet per S8, reminder deep link, all match times in local time (was UTC). Known gap: a notification is lost if the process crashes between the status change and the notification insert.
- **L5 (2026-11-13) T3 verification:** all concurrency probes clean (5 concurrent ticks → 1 reminder; result-vs-worker race consistent; rollback on failure). Blocker B1: mobile "termina HH:MM" assumed 90 min while the worker uses `Reservation.durationMinutes`. Fixed by parent: API exposes `blockEndsAt` on match detail (same `matchBlockEndsAtSV`), mobile renders it in local time with 90-min fallback; RED→GREEN both sides. Verifier probes P1–P6 committed as `e22_02_match_lifecycle_races.http-db.integration.test.ts` (P7 dropped: it never exercised confirm). Parent checks: API 1336/1336, mobile 1517/1517. Advisories left: reminder may follow a late draft (consistent with S4); UTC times remain in open/discover match cards, participant "Desde HH:MM" and tournament player tabs (pre-existing).
