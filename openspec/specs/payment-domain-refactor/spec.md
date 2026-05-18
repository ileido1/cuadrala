# Capability: payment-domain-refactor (Wave 1)

| Campo | Valor |
|-------|-------|
| **Programa** | `api-architecture-refactor` Wave 1 |
| **Gate** | Prerequisito de `multi-currency-payments` |
| **Estado** | Archivado 2026-05-18 — implementado |

## Purpose

Migrar el bounded context de pagos de `monetization.service` y repos función a **ports → use cases → adapters → `monetization.composition`**, sin cambiar contratos HTTP ni schema MCP en este change.

## Requirements

### REQ-PAY-001 — Ports de persistencia

The system SHALL define domain ports for payment transactions, fee rules, match/reservation reads used by monetization, and venue staff checks.

### REQ-PAY-002 — Adapters Prisma

Infrastructure SHALL implement ports via `prisma_payment_*` adapters and mappers; application MUST NOT import Prisma or infrastructure.

### REQ-PAY-003 — Use cases staff

Confirm, reject, list pending, obligation creation, and payment summaries SHALL run through application use cases wired in `monetization.composition.ts`.

### REQ-PAY-004 — PaymentOrchestrator

A thin `PaymentOrchestrator` SHALL delegate to use cases; controllers MUST NOT call legacy services.

### REQ-PAY-005 — Eliminación legacy

`application/monetization.service.ts` (o equivalente legacy) MUST be removed after strangler R1–R6.

### REQ-PAY-006 — Gate MCP

`multi-currency-payments` schema and confirm behaviour MUST NOT start until Wave 1 gate tests pass (`monetization` integration, payment wave1 gate).

## Non-goals

- Schema MCP (`settlementCurrency`, `effectiveDate`, ledger) — ver `multi-currency-payments`
- Waves 2–6 del programa API padre

## Referencias

- Archive: `openspec/changes/archive/2026-05-18-payment-domain-refactor/`
- Exploración detallada: `exploration.md` en archive
