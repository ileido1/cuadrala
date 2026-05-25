# Tasks: web-pending-payments-queue

## DAG

| ID | Tarea | Dep | Estado |
|----|-------|-----|--------|
| T1 | Spec + acceptance | — | done |
| T2 | Design | T1 | done |
| T3 | API mapper + repository includes | T2 | done |
| T4 | API receipt access staff | T2 | done |
| T5 | API use case DTO | T3 | done |
| T6 | Test mapper pending row | T3 | done |
| T7 | Web types + api-client | T5 | done |
| T8 | PaymentsList + drawer | T7 | done |
| T9 | Integrar tab en payments/page | T8 | done |
| T10 | Verifier typecheck/test/build | T6,T9 | in_progress |

## Pendiente opcional

- Confirmar por `transactionId` sin `reservationId` en drawer.
- Contract test HTTP pending shape.
- Montar `countryCode`/`timezone` en respuesta `venues/mine`.
