# Web dashboard auth flow

## Objective
Authenticated users of the web backoffice must go directly to `/dashboard`; the web must not apply the mobile player's onboarding gate.

## Problem
`apps/web/src/middleware.ts` and `GoogleSignInButton.tsx` redirect users with `onboardingComplete=false` to `/onboarding`, but the web has no onboarding route. Web registration already creates a venue and the onboarding flow belongs to mobile/player.

## Why
Production logs show repeated `GET /onboarding 404` after successful authentication.

## Scope
- Remove the onboarding-based redirect from the web middleware.
- Preserve unauthenticated protected-route redirects to `/login`.
- Preserve authenticated auth-route redirects to `/dashboard`.
- Route Google sign-in to its callback URL/dashboard.
- Add or update focused tests for the web auth flow.

## Constraints
- Do not change mobile onboarding.
- Do not alter API contracts.
- Preserve unrelated working-tree changes.
- Artifact language: English; user communication: Spanish.

## Authorized scope
User explicitly authorized implementation of the web dashboard redirect fix.

## Acceptance criteria
- Authenticated users can request `/dashboard` regardless of `onboardingComplete`.
- Authenticated users requesting `/login` or `/register` are redirected to `/dashboard`.
- Unauthenticated users requesting `/dashboard` are redirected to `/login?callbackUrl=%2Fdashboard`.
- Google sign-in does not navigate to nonexistent `/onboarding`.
- No web code references `/onboarding` as a required redirect.

## Checks
- `npm test` in `apps/web`
- `npm run build` in `apps/web`
- `npm run lint` in `apps/web` (record pre-existing failures honestly)
- Runtime: `N/A` unless local Next server is available; verify route behavior through focused middleware tests.

## Progress
- [x] T1: Remove web onboarding gate and align Google sign-in redirect.
- [x] T2: Add focused middleware tests for protected, authenticated dashboard, and auth-route behavior.
- [x] T3: Run verification, update this document, and commit the work unit.

## Route and trigger evidence
- Route: direct inline implementation; no delegation runtime is available in this session.
- Mapping evidence: relevant flow is contained in middleware, credential login, Google login, and existing middleware tests.
- Forecast: ~80 authored changed lines; delivery strategy `ask-on-risk` (under budget).

## Verification evidence
- Focused: `npm test -- --run src/__tests__/middleware.test.ts` — 6 tests passed.
- Full suite: `npm test` — 20 files, 115 tests passed.
- Build: `npm run build` — passed; `/dashboard` is present and no `/onboarding` route is emitted.
- Lint: `npm run lint` — passed with no warnings or errors.
- Static check: no `/onboarding` redirect references remain under `apps/web/src`.
- Runtime harness: N/A; production deployment was not authorized in this task.
- Review assessment: high risk (`hot_path` auth signal); RDD status is disabled, so delivery is `disabled/unmanaged` and no review actor was started.
- Behavior commit: `c6125ed` (`fix(web): route authenticated users to dashboard`).
- Task-document commit: `9c44d2d` (`docs(odd): record dashboard auth verification`).

## Next step
Implement T1, then T2.
