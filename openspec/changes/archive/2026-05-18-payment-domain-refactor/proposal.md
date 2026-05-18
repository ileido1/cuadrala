# Proposal: Payment domain refactor (Wave 1)

| Campo | Valor |
|-------|-------|
| **Change** | `payment-domain-refactor` |
| **Padre** | `api-architecture-refactor` Wave 1 |
| **Gate** | Desbloquea `multi-currency-payments` |

## Intent

Migrar el bounded context de pagos de `monetization.service` + repos función a **ports → use cases → adapters → monetization.composition**, sin cambiar contratos HTTP ni schema MCP.

## Goals

- Ports TX, fee rule, match/reservation read para pagos
- Adapters Prisma; cero imports infra en application
- `PaymentOrchestrator` + UCs; controller solo composition
- Eliminar `infrastructure/legacy/monetization.service.ts`

## Non-goals

- Schema MCP (`settlementCurrency`, `effectiveDate`) — change `multi-currency-payments`
- Waves 2–6 del programa padre

## Approach

Strangler R1–R6; reutilizar `domain/money/` (Wave 0). Patrón gold: `transaction_receipts`.
