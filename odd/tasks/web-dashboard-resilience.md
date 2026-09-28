# Web dashboard resilience

## Objective

Make the web dashboard distinguish loading, empty, partial, and failed API states; remove misleading controls and fabricated data; and protect every active dashboard route with client-path tests.

## Problem

Production endpoints currently respond, but several screens turn API failures into plausible empty data, the shell renders before the venue context is ready, and the navigation exposes controls or copy that do not match implemented behavior.

## Why

Operators need to know whether a club has no data or the API failed. A dashboard that silently displays zero revenue, no courts, or a fake club identity is operationally unsafe.

## Scope

- Venue bootstrap, retry, zero-venue state, and multi-venue selection.
- Real signed-in user identity and removal of dead topbar actions.
- Partial/retry behavior for dashboard, payments, courts, and schedule.
- Remove the unfinished schedule list-mode control.
- Expand API client path coverage for active dashboard endpoint families.

## Constraints

- Preserve the existing visual system and Spanish product copy.
- Do not change API contracts or backend behavior.
- Do not expose credentials or session tokens in the UI.
- Preserve unrelated work and the untracked `.codegraph/` directory.

## Authorized scope

The user explicitly authorized solving every issue found in the dashboard API/UI audit.

## TDD

- Mode: enabled.
- Source: repository `AGENTS.md` testing convention.
- Runner: `cd apps/web && npm test -- <focused test files>`.
- Final order: tests -> lint -> build.

## Delivery

- Strategy: `auto-chain`.
- Chain strategy: `stacked-to-main`, explicitly chosen by the user on 2026-09-28.
- Forecast: approximately 450-550 authored changed lines across three work units after WDR-1 established the realistic test cost.
- Slice 1: WDR-1 (`3d80a3a`) plus this tracking record; can land independently on `main`.
- Slice 2: WDR-2 and WDR-3; depends on Slice 1 only through the truthful venue shell contract.
- Branch: `codex/web-dashboard-resilience`.
- RDD: disabled globally; delivery is unmanaged by RDD.

## Tasks

- [x] **WDR-1 — Make venue bootstrap and shell identity truthful**
  - Route: inline because delegated exploration was attempted but unavailable due account usage limits; mapping evidence came from CodeGraph and the production audit.
  - Add venue reload support and make the shell own venue loading, load failure, and zero-venue states.
  - Auto-select one venue and render a selector only when multiple venues exist.
  - Remove the fake `Club Palermo` fallback.
  - Render the real NextAuth user name/email and remove inactive search/notification controls.
  - Acceptance: content never renders against an unresolved venue; retry works; one venue needs no selector; multiple venues can be selected; no fabricated identity remains.
  - Checks: focused component tests, lint, build.

- [x] **WDR-2 — Preserve partial dashboard data and expose endpoint failures**
  - Route: inline fallback because the mandatory writer delegation is unavailable under the current account usage limit.
  - Dashboard and payments keep successful sections when a sibling request fails.
  - Courts distinguish load failure from an empty result and provide retry.
  - Schedule resets loading/error on reload, provides retry, and removes the unfinished list-mode action.
  - Acceptance: API errors never appear as legitimate zero/empty data; every failed screen has a retry path; successful sibling data remains visible.
  - Checks: focused page tests, full web tests, lint, build.

- [x] **WDR-3 — Cover active dashboard API paths**
  - Route: inline mechanical test extension.
  - Add path assertions for venue bootstrap/detail/update, dashboard stats, transaction stats/history/pending, courts, bookings, sports, and payment methods.
  - Acceptance: tests assert the exact backend routes and methods used by every active dashboard section.
  - Checks: `api-client.paths.test.ts`, full web tests.

## Progress

- Exploration complete through CodeGraph, production browser verification, and the prior audit.
- Delegated mapping was attempted; the worker could not start because the account usage limit was reached.

## Verification evidence

- WDR-1 RED: `npm test -- src/components/layout/dashboard-shell.test.tsx` — 5 tests failed against the previous shell behavior.
- WDR-1 GREEN: same focused command — 5/5 passed.
- WDR-1 lint: `npm run lint` — no warnings or errors.
- WDR-1 build: `npm run build` — compiled, typechecked, and generated all 16 static pages.
- WDR-1 runtime harness: production verification is pending deployment; component behavior is covered by the focused DOM test.
- WDR-1 rollback boundary: revert the venue-context, shell-client, sidebar, topbar, and dashboard-shell test changes in commit `3d80a3a`.
- WDR-2/3 focused contract test: `npm test -- src/lib/api-client.paths.test.ts` — 7/7 passed.
- WDR-2/3 full web suite: `npm test` — 22 files / 122 tests passed.
- WDR-2/3 lint: `npm run lint` — no warnings or errors.
- WDR-2/3 build: `npm run build` — compiled, typechecked, and generated all 16 static pages.
- WDR-2/3 runtime harness: production verification remains pending deployment; the static dashboard endpoint paths and all current web checks passed.
- WDR-2/3 rollback boundary: revert `407b339` to restore the previous all-or-nothing requests and unfinished schedule-list control.

## Commits

- `3d80a3a` — `fix(web): make dashboard venue shell truthful` (WDR-1, 290 authored changed lines).
- `407b339` — `fix(web): expose dashboard API failures` (WDR-2/WDR-3, 262 authored changed lines).

## Next step

Publish Slice 2 to main and verify production behavior for the dashboard, payments, courts, and schedule pages.
