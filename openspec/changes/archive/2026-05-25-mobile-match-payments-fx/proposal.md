# Proposal: Pagos partida mobile — efectivo sin comprobante + FX USD→BS

## Alcance

1. **Efectivo (jugador):** tras elegir `CASH`, registrar selección y navegar a espera (`PENDING`) sin foto ni referencia.
2. **Transferencia / Pago móvil:** si `settlementCurrency` ≠ moneda de obligación (`pricingCurrency`), mostrar monto a liquidar en BS usando tasa del día del partido (paridad con `PaymentConfirmDialog` web).
3. **API:** rechazar upload de comprobante cuando el medio seleccionado es `CASH`.
4. **Fuera de alcance v1:** confirm MCP staff para partidos multi-moneda (se mantiene cola web actual).

## Enfoque

- Mobile: rama por `type` + utilidades `money_conversion` (espejo web).
- API: validación en `UploadTransactionReceiptUseCase`; `countryCode` en detalle de sede para tasas.
- Sin migración BD obligatoria (`VenuePaymentMethod.type` ya distingue CASH).

## Prioridad

P0 efectivo sin upload · P0 FX preview en mobile · P1 API guard receipt · P2 copy cola web efectivo
