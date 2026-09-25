# Restore API integration gate and verify web backoffice runtime

## Objective
Make the API integration suite deterministic, clear existing web build warnings where safely correct, execute the requested deployed-backoffice login/registration verification, and publish the completed work to `main`.

## Problem
The API typecheck and lint gates are green. The prior full-suite failure (10 files / 34 tests) was caused by two overlapping local `npm test` processes mutating the same `TEST_DATABASE_URL`, not a product or fixture defect. It must be re-run once, in isolation, to establish the real gate. The web build is green but reports seven stale `react-hooks/exhaustive-deps` warnings. Login and registration are contract-tested but not yet exercised at a deployed web backoffice runtime.

## Scope and constraints
- Authorized scope: repair API test setup/data lifecycle, web hook dependency warnings where behavior remains stable, deploy/runtime verification, and push to `origin/main` after checks.
- Do not alter production behavior to hide test failures; establish deterministic fixture ownership/cleanup instead.
- Runtime checks must use the configured deployed backoffice URL and only a dedicated test account or a user-provided account authorized for this purpose.
- Route: delegated direct is normally required (4+ files), but no callable writer delegation surface exists in this runtime. Proceed inline with bounded work units.
- TDD: enabled. Runner: `npm test`; obtain a focused RED before each behavioral correction.
- Delivery: ask-on-risk, forecast ~350 authored lines. Work units remain on `codex/quick-match-full-feature` until final user-authorized push to main.

## Tasks
- [x] WBE-1 Map the API integration fixture lifecycle and determine the prior failure cause.
  - Evidence: the earlier run accidentally overlapped two full API suites against one test database; race conditions between suite resets explained unique/FK failures. No product fixture defect was reproduced.
- [x] WBE-2 Re-run the API full suite exactly once, in isolation, and record the real gate result.
  - Evidence: `npm test` completed in 136.02s with 175 files / 1,023 tests passing. Expected Resend 422 warnings remain non-fatal test logging.
- [x] WBE-3 Correct safe web `useEffect` dependency warnings and verify test/type/build gates.
  - Evidence: stabilized fetch/selection callbacks and venue id dependency; web tests pass 19 files / 109 tests, standalone typecheck passes, and production build has no exhaustive-deps warnings.
- [ ] WBE-4 Perform deployed web-backoffice login and registration E2E with authorized credentials, then publish verified commits to `origin/main`.
  - Pending: the repository only configures a local web URL (`http://localhost:3001`); a deployed backoffice URL and a dedicated authorized account are still needed for the remote runtime step.

## Acceptance criteria
- API `typecheck`, lint, and full `npm test` pass without referential-integrity fixture failures. (Verified: 175 files / 1,023 tests.)
- Web test, standalone TypeScript validation, and production build pass without the seven prior exhaustive-deps warnings. (Verified: 19 files / 109 tests.)
- Deployed login and registration complete successfully using the live backoffice configuration.
- Verified commits are pushed to `origin/main`.

## Initial evidence
- Previous full API run: 10 test files / 34 tests fail; examples include `Tournament_organizerUserId_fkey` and `Match_tournamentId_fkey` errors after parent data is missing.
- Web build passes but reports warnings in schedule, tournament views, payments list, and PaymentConfirmDialog.
- Existing web contract tests validate `/auth/login`, `/auth/register`, and secure venue ownership; no deployed runtime session was exercised.

## Relevant files
- `services/api/src/test/` — integration fixture setup and failing suites.
- `services/api/vitest.config.ts` — runner sequencing/configuration.
- `apps/web/src/app/(auth)/login/LoginForm.tsx` — backoffice login/registration entry.
- `apps/web/src/lib/auth.ts` — NextAuth credentials bridge.
