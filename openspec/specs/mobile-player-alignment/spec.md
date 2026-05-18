# Especificación: Mobile jugador-only — alineación pagos, partidas y reservas

| Campo | Valor |
|-------|-------|
| **Programa** | `mobile-player-alignment` |
| **Estado** | ✅ Archivado 2026-05-18 |
| **Archive** | [`openspec/changes/archive/2026-05-18-mobile-player-alignment/`](../../changes/archive/2026-05-18-mobile-player-alignment/) |
| **Decisión PO** | Mobile = **solo jugador**; staff = **solo web** |

## Propósito

Alinear `apps/mobile` al rol **jugador**: eliminar superficie staff obsoleta y cerrar brechas con API (reservas `PUBLISHED`, `MoneyAmount`, `openingHours`, polling de transacciones).

## Capabilities (fuente de verdad)

| Capability | Spec |
|------------|------|
| `mobile-player-only-surface` | [`../mobile-player-only-surface/spec.md`](../mobile-player-only-surface/spec.md) |
| `mobile-player-match-reservation` | [`../mobile-player-match-reservation/spec.md`](../mobile-player-match-reservation/spec.md) |
| `mobile-player-payments-ux` | [`../mobile-player-payments-ux/spec.md`](../mobile-player-payments-ux/spec.md) |
| `mobile-venue-opening-hours-client` | [`../mobile-venue-opening-hours-client/spec.md`](../mobile-venue-opening-hours-client/spec.md) |

## Deltas sobre capabilities existentes

- **`multi-currency-payments`:** mobile jugador solo lectura/formateo; sin confirmación manual ni CRUD métodos; Phase 2 «staff paridad mobile» descartada → staff en `apps/web`.
- **`monetization-transactions`:** `GET /matches/:id/transactions/summary` con `MoneyAmount`; mobile no llama `confirm-manual`; waiting poll por `Transaction.status`.

Ver detalle en archive `spec.md` sección «Deltas sobre capabilities existentes».

## Verificación

| Artefacto | Resultado |
|-----------|-----------|
| `verify-report.md` (archive) | **PASS** |
| `flutter test` | 102 ✅ |
| `npm test` | 452 ✅ |
| E2E manual | Pendiente — `manual-test-checklist.md` en archive |
