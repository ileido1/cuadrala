# Tasks: payment-domain-refactor

## Wave 1 PRs

- [x] R0 — SDD artifacts (proposal, tasks; spec/design en exploration + código)
- [x] R1 — Ports payment TX/fee/match/reservation/user + DTOs
- [x] R2 — Prisma adapters (`prisma_payment_*`, `prisma_venue_fee_rule`)
- [x] R3 — Confirm/list/reject staff UCs vía `PaymentTransactionRepository`
- [x] R4 — Obligation + summary UCs + `PaymentOrchestrator` + `monetization.composition`
- [x] R5 — Exchange rate + venue payment method (routers → UC)
- [x] R6 — Venue dashboard/analytics UCs; delete `monetization.service.ts`
- [x] **GATE MCP** — `monetization.integration` + `payment_wave1_gate.integration` (DB)

## Verify

```bash
cd services/api && npm run typecheck && npm run lint && npm test
TEST_DATABASE_URL=... npm test -- monetization
```
