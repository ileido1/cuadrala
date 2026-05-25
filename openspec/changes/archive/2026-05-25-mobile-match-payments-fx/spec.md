# Spec: mobile-match-payments-fx

## REQ-1 Efectivo sin comprobante

**Given** jugador con transacción PENDING y medio `CASH` seleccionado  
**When** confirma método de pago  
**Then** NO navega a pantalla de upload  
**And** llega a pantalla de espera con estado PENDING  
**And** API rechaza POST receipt si medio es CASH

## REQ-2 Conversión a moneda de liquidación

**Given** obligación en USD, método liquida en BS, tasas disponibles para fecha del partido  
**When** jugador elige transferencia o pago móvil  
**Then** ve monto a pagar en BS calculado con `convertMinorBetweenCurrencies`  
**And** no puede continuar si falta tasa (`missing_rate`)

## REQ-3 Paridad algoritmo

**Given** mismos inputs que schedule web  
**When** se calcula liquidación  
**Then** usa `pickExchangeRateForDate` + tasas `GET /countries/:code/exchange-rates`

## REQ-4 Datos de sede

**Given** `venueId` en flujo de pago  
**When** bootstrap de pago  
**Then** carga `pricingCurrency`, `displayCurrency`, `countryCode`, `timezone` y `scheduledAt` del partido
