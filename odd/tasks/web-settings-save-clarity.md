# Clarify web settings save actions

## Objective
Make venue settings and payment-method saves unmistakably separate so users cannot receive a venue-success message while a payment-method edit remains unsaved.

## Problem
The page-level `Guardar cambios` button sits below the payment-method editor but only submits venue settings. Payment methods use their own inline `Actualizar` button. Clicking the page-level action shows `Cambios guardados`, which falsely implies the payment-method currency was persisted.

## Why
The issue was reproduced in production. The API persists `settlementCurrency` correctly when the inline payment-method form is submitted.

## Scope
- Move the venue save action before the payment-method section.
- Rename venue save action and confirmation to explicitly mention club data.
- Rename payment-method submit action and confirmation to explicitly mention the payment method.
- Add focused UI tests for the labels and payment-method update behavior.

## Constraints
- Do not change API or database contracts.
- Do not change payment data while testing locally.
- Preserve unrelated working-tree content.
- Artifact language follows the existing Spanish web UI.

## Authorized scope
User explicitly authorized correcting the misleading save flow.

## Acceptance criteria
- The venue action reads `Guardar datos del club`.
- Its success message reads `Datos del club guardados`.
- The payment-method edit action reads `Guardar método de pago`.
- Its success message reads `Método de pago guardado`.
- Payment-method update tests verify `settlementCurrency` is sent through the dedicated update call.
- Web tests, build, and lint pass.

## Checks
- Focused component test.
- `npm test` in `apps/web`.
- `npm run build` in `apps/web`.
- `npm run lint` in `apps/web`.
- Runtime: local/production UI check after delivery only if authorized.

## Progress
- [x] T1: Separate and relabel venue/payment-method save actions.
- [x] T2: Add focused component regression coverage.
- [x] T3: Verify and commit the work unit.

## Route and trigger evidence
- Route: direct inline; no subagent runtime is available.
- Writer trigger: two non-trivial files plus tests; delegation unavailable in this runtime.
- Forecast: ~120 authored changed lines; delivery strategy `ask-on-risk` under budget.

## Verification evidence
- Focused: `npm test -- --run src/components/settings/PaymentMethodsSettings.test.tsx` — 1 test passed.
- Full suite: `npm test` — 21 files, 116 tests passed.
- Build: `npm run build` — passed.
- Lint: `npm run lint` — passed with no warnings or errors.
- Runtime: production persistence was reproduced before implementation; no post-change deployment was authorized yet.
- Review assessment: medium risk (`executable_change`), `under_budget`; no native review due.
- Behavior commit: `f48050c` (`fix(web): clarify settings save actions`).

## Next step
Implement T1 and T2.
