# Web auth secure cookie

## Objective
Make the Vercel backoffice preserve a valid NextAuth session when navigating from login to protected routes under HTTPS.

## Problem
Production authentication succeeds, but `/dashboard` redirects to `/login?callbackUrl=%2Fdashboard`. The middleware calls `getToken` without `secureCookie`, so it reads `authjs.session-token` while HTTPS Auth.js issues `__Secure-authjs.session-token`.

## Scope
- `apps/web/src/middleware.ts`
- A focused middleware regression test under `apps/web/src/__tests__/`

## Constraints
- Preserve HTTP localhost behavior.
- TDD enabled by repository guidance (`AGENTS.md`); runner: `npm test` from `apps/web`.
- Route: delegated direct. Writer trigger: middleware fix plus non-trivial regression test touch two files.
- Forecast: 60 authored changed lines. Delivery: ask-on-risk; no chain expected.

## Tasks
- [x] AUTH-1 Add a red regression test proving HTTPS middleware reads the secure Auth.js session cookie. Route: delegated; evidence: test initially failed because `secureCookie` was absent.
- [x] AUTH-2 Pass `secureCookie` from the request protocol to `getToken` and verify the focused web test. Route: delegated; evidence: `apps/web/src/__tests__/middleware.test.ts` passed (2 tests).

## Acceptance criteria
- A valid `__Secure-authjs.session-token` is recognised on HTTPS protected routes.
- Local HTTP continues to use the unprefixed cookie.
- Focused web tests pass.

## Verification
- Passed: `cd apps/web && npm test -- src/__tests__/middleware.test.ts` — 1 file, 2 tests.

## Progress
- 2026-09-27: Live production reproduction verified the defect: `/api/auth/session` returns an authenticated user while `/dashboard` returns 307 to login.
- 2026-09-27: Fixed protocol-aware cookie lookup and added the HTTPS/HTTP regression test.

## Next step
Commit the verified work unit, deploy it, and re-run the production login path.
