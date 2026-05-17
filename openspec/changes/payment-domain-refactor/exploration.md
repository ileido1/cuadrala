# Exploration: Refactor global dominio pagos/monetización (fintech-grade)

| Campo | Valor |
|-------|-------|
| **Change** | `payment-domain-refactor` (Wave 1 de `api-architecture-refactor`) |
| **Relacionado** | `api-architecture-refactor`, `multi-currency-payments` (MCP) |
| **Programa padre** | [`../api-architecture-refactor/exploration.md`](../api-architecture-refactor/exploration.md) |
| **Estado** | Exploration complete |
| **Workspace** | `services/api` (primario), impacto secundario web/mobile vía contratos |

## Resumen ejecutivo

El bounded context de pagos en Cuadrala API (~**37 archivos** directamente relacionados, **~1.200 LOC** en los 5 núcleos) está implementado como **servicios procedurales + repos función** sin agregados de dominio, con **violaciones sistemáticas** de Clean Architecture (application→infrastructure, Prisma en use cases, routers que saltan application). El change `multi-currency-payments` ya asume `MoneyAmount`, `PaymentOrchestrator` y ports — construir MCP encima del AS-IS **multiplica deuda** y el bug conocido `amountTotal × 100` vs `paidAmountCents`.

**Recomendación:** change separado **`payment-domain-refactor` ANTES de MCP**, en cadena de PRs (strangler), con gate explícito: MCP schema/confirmación solo tras ports + use cases de confirmación/agregación en dominio limpio.

---

## 1. Bounded context map (AS-IS)

### 1.1 Núcleo monetización / transacciones

| Ruta | Rol | LOC aprox. | Notas |
|------|-----|------------|-------|
| `application/monetization.service.ts` | **God service** | 445 | Obligaciones match/reserva, confirm manual, summaries, subscription |
| `application/use_cases/confirm_transaction_as_venue_staff.use_case.ts` | Confirm staff | 118 | Prisma directo + repos infra |
| `infrastructure/repositories/transaction.repository.ts` | Persistencia TX | 271 | Funciones export; agregación reserva |
| `presentation/controllers/monetization.controller.ts` | HTTP | 197 | Llama service + UC staff |
| `presentation/routes/monetization.router.ts` | Rutas | — | |
| `presentation/validation/monetization.validation.ts` | Zod | 67 | En evolución MCP |
| `presentation/composition/venue_staff.composition.ts` | DI confirm | — | Inyecta `PRISMA` en UC |

**Flujos:**
- Crear obligaciones: `createMatchObligationsSV` / `createReservationObligationsSV`
- Confirmar: `patchConfirmTransactionManualCON` → `ConfirmTransactionAsVenueStaffUseCase` (no `confirmTransactionManualSV` del service)
- Agregación reserva: `updateReservationPaymentFromTransactionRepo` (SUM `amountTotal` × 100)
- Resúmenes: `getMatchTransactionsSummarySV`, `getReservationPaymentSummarySV`

### 1.2 Fee rules

| Ruta | Rol |
|------|-----|
| `domain/monetization/fee_calculation.ts` | Única lógica de dominio (fee %) |
| `infrastructure/repositories/fee_rule.repository.ts` | `findActiveFeeRuleForScopeRepo` — **sin port** |
| Prisma `FeeRule` | Global por `scope` (MATCH/RESERVATION), sin `venueId` |

### 1.3 Exchange rates

| Ruta | Rol |
|------|-----|
| `domain/ports/exchange_rate_repository.ts` | Port definido |
| `domain/entities/exchange_rate.entity.ts` | DTO |
| `infrastructure/repositories/exchange_rate.repository.ts` | Funciones Prisma — **no implementa el port como clase** |
| `presentation/routes/exchange_rate.router.ts` | **Bypass total**: importa infra + `fetch` dolarapi en router |
| `application/monetization.service.ts` | `convertAmountToBsSV` — **no usado en confirmación** |

Prisma: `ExchangeRate` unique `(countryCode, currency)` — **sin `effectiveDate`** (bloquea MCP REQ-MCP-017).

### 1.4 Venue payment methods

| Ruta | Rol |
|------|-----|
| `domain/ports/venue_payment_method_repository.ts` | Port ✓ |
| `domain/entities/venue_payment_method.entity.ts` | DTO |
| `infrastructure/repositories/venue_payment_method.repository.ts` | Impl función (no adapter class) |
| `presentation/routes/venue_payment_method.router.ts` | CRUD en router — **sin use cases**, Prisma en router |

Sin `settlementCurrency` en schema (MCP lo añade).

### 1.5 Reservas / billing

| Ruta | Rol |
|------|-----|
| `domain/entities/reservation.entity.ts` | `paidAmountCents`, `paymentStatus` |
| `infrastructure/adapters/prisma_booking_repository.ts` | Crea reserva con totales |
| `infrastructure/adapters/prisma_reservation_repository.ts` | Lectura/actualización centavos |
| `application/use_cases/booking.use_cases.ts` | Booking (indirecto) |

### 1.6 Venue dashboard / reporting transacciones

| Ruta | Rol | Problema |
|------|-----|----------|
| `application/use_cases/venue_dashboard.use_cases.ts` | Revenue, trends | **Prisma directo**; solo `match→court→venue`, ignora reservas |
| `application/use_cases/venue_transactions.use_cases.ts` | Stats semanales | Idem; suma `amountTotal` sin moneda |
| `application/use_cases/list_venue_pending_transactions.use_case.ts` | Cola pendientes | Import infra repo; port staff ✓ |

### 1.7 Match obligations / payment info legacy

| Ruta | Rol |
|------|-----|
| `application/use_cases/get_match_payment_info.use_case.ts` | Lee `Venue.paymentHolder` etc. vía **Prisma** |
| Venue fields `paymentHolder`, `paymentBank`, … en schema | Legacy pre-`VenuePaymentMethod` |

### 1.8 Receipts (sub-contexto más limpio)

| Ruta | Rol |
|------|-----|
| `application/use_cases/upload_transaction_receipt.use_case.ts` | UC + ports ✓ |
| `application/use_cases/get_transaction_receipt.use_case.ts` | UC + ports ✓ |
| `infrastructure/adapters/prisma_transaction_receipt_*.ts` | Patrón adapter correcto |
| `presentation/composition/transaction_receipts.composition.ts` | Composition root ✓ |

**Referencia positiva:** receipts es el patrón target para el resto del BC.

### 1.9 Notifications payment pending

| Ruta | Rol |
|------|-----|
| `application/use_cases/create_payment_pending_notification_event.use_case.ts` | Desacoplado de TX |
| Wired desde `upload_transaction_receipt` | Evento match, no reserva |

### 1.10 Tests (cobertura)

| Archivo | Tipo |
|---------|------|
| `test/unit/monetization.validation.test.ts` | Contract Zod |
| `test/unit/monetization/convert_amount_to_bs.test.ts` | Función aislada |
| `test/integration/monetization.integration.test.ts` | DB: match obligations + fee (~170 LOC) |
| `test/integration/s28_01_transaction_receipts.http-db.integration.test.ts` | Receipts |

**Total tests monetización explícitos: 4 archivos.** Sin golden cross-currency, sin tests confirmación reserva, sin tests agregación.

---

## 2. Violaciones Clean Architecture (inventario)

### 2.1 Application → Infrastructure (pagos)

| Archivo | Imports infra |
|---------|---------------|
| `application/monetization.service.ts` | `fee_rule`, `match`, `reservation`, `transaction`, `user` repos |
| `application/use_cases/confirm_transaction_as_venue_staff.use_case.ts` | `transaction.repository` |
| `application/use_cases/list_venue_pending_transactions.use_case.ts` | `transaction.repository` |
| `application/use_cases/venue_dashboard.use_cases.ts` | `PRISMA` |
| `application/use_cases/venue_transactions.use_cases.ts` | `PRISMA` |

**Conteo archivos application en BC pagos con violación: 5/8** (62.5%).

### 2.2 Application → Prisma / generated

| Archivo | Uso |
|---------|-----|
| `monetization.service.ts` | `Prisma.Decimal` en lógica obligaciones |
| `confirm_transaction_as_venue_staff.use_case.ts` | `PrismaClient`, `prisma.transaction.update` |
| `get_match_payment_info.use_case.ts` | `PrismaClient` |

### 2.3 Presentation → Infrastructure (sin application)

| Archivo | Violación |
|---------|-----------|
| `presentation/routes/exchange_rate.router.ts` | Repo + HTTP externo en router |
| `presentation/routes/venue_payment_method.router.ts` | Repo funciones + `PRISMA` |

### 2.4 Domain gaps (modelo anémico)

| Esperado fintech | AS-IS |
|------------------|-------|
| Aggregate `PaymentObligation` / `Transaction` | No existe; filas Prisma passthrough |
| Aggregate `ReservationPayment` | Lógica en repo `updateReservationPaymentFromTransactionRepo` |
| `Money`, `Currency` VO | No existe |
| `TransactionRepository` port | **No existe** |
| `FeeRuleRepository` port | **No existe** (solo función infra) |
| Domain events (`PaymentConfirmed`) | No |
| Invariantes (no sum cross-currency) | No enforced |

### 2.5 Inconsistencia infra: `repositories/` vs `adapters/`

- **Receipts, venue staff, booking:** `infrastructure/adapters/prisma_*` implementando ports.
- **Transactions, fees, exchange rates, venue payment methods:** `infrastructure/repositories/*.ts` funciones sueltas.
- **Impacto:** MCP design asume adapters + mappers; refactor debe **unificar en adapters**.

### 2.6 Bug de dominio documentado (refactor blocker)

```232:234:services/api/src/infrastructure/repositories/transaction.repository.ts
  // amountTotal en transacciones está en unidades monetarias (ej. 8500 = Bs 8.500); paid/total en centavos.
  const PAID_MAJOR = Number((CONFIRMED._sum.amountTotal ?? new PrismaValue.Decimal(0)).toString());
  const PAID_CENTS = Math.round(PAID_MAJOR * 100);
```

Mezcla unidades + ausencia de `currencyCode` → incorrecto para MCP y para sedes USD.

---

## 3. Arquitectura objetivo (fintech / alineada MCP)

### 3.1 Domain (`src/domain/payment/` o `src/domain/money/`)

| Artefacto | Responsabilidad |
|-----------|-----------------|
| `CurrencyCode`, `MoneyAmount` | VO inmutables, ops solo misma moneda |
| `ExchangeRateSnapshot` | VO tasa + fecha |
| `Fee` / `FeeRule` (entity) | Regla venue-scoped (post-MCP schema) |
| `PaymentObligation` (aggregate) | TX: estados PENDING→CONFIRMED, invariantes monto |
| `ReservationPayment` (aggregate) | `total`, `paid`, `paymentStatus` en `pricingCurrency` |
| `MoneyConversionService` (port) | Conversión; sin Prisma |
| `TransactionRepository`, `ReservationPaymentRepository`, `ExchangeRateRepository`, `VenueFeeRuleRepository`, `CurrencyConversionRecordRepository` | Ports |
| `money_errors.ts` | Errores de dominio |
| Domain events (opcional P1) | `PaymentConfirmed`, `ObligationCreated` — outbox Fase 2 |

### 3.2 Application (`src/application/payment/`)

| Artefacto | Responsabilidad |
|-----------|-----------------|
| `PaymentOrchestrator` | Facade delgado; delega UC |
| `CreateReservationObligationUseCase` | |
| `CreateMatchObligationUseCase` | |
| `ConfirmManualPaymentUseCase` | Reemplaza Prisma en staff UC |
| `SyncReservationPaymentUseCase` | Agregación en pricing currency |
| `GetRateForReservationDayUseCase` | |
| `ListVenuePendingTransactionsUseCase` | Via port |
| `GetVenueTransactionStatsUseCase` | Reemplaza `venue_transactions` Prisma |
| `GetVenueDashboardRevenueUseCase` | Incluir reservas + moneda |

**Eliminar:** `monetization.service.ts` (migrar a UC + orquestador).

### 3.3 Infrastructure

| Artefacto | Responsabilidad |
|-----------|-----------------|
| `adapters/prisma_transaction_repository.ts` | Implementa port + UnitOfWork opcional |
| `adapters/prisma_exchange_rate_repository.ts` | Implementa port extendido |
| `adapters/prisma_venue_fee_rule_repository.ts` | |
| `adapters/prisma_money_conversion_service.ts` | Decimal half-up |
| `mappers/*_money.mapper.ts` | Prisma ↔ domain |
| `config/feature_flags.ts` | `MULTI_CURRENCY_PAYMENTS` (MCP) |

**Deprecar/mover:** `infrastructure/repositories/transaction.repository.ts` → adapter o borrar tras migración.

### 3.4 Presentation

| Artefacto | Responsabilidad |
|-----------|-----------------|
| `composition/monetization.composition.ts` | **Nuevo** — único wiring |
| Controllers skinny | Solo parse + UC |
| Routers | Sin imports infra |
| `exchange_rate` → UC + controller | |

---

## 4. Relación con `multi-currency-payments`

| Aspecto | MCP asume | AS-IS soporta |
|---------|-----------|---------------|
| `MoneyAmount` + ports | design.md §2–4 | No |
| `PaymentOrchestrator` | Sí | `monetization.service` monolítico |
| `effectiveDate` en ExchangeRate | Sí | No |
| `settlementCurrency` | Sí | No |
| Agregación pricing currency | Sí | Centavos ciegos |
| Clean UC confirm | Sí | Prisma en UC |

### Opciones

| Enfoque | Pros | Contras | Esfuerzo |
|---------|------|---------|----------|
| **A. Refactor-first** (`payment-domain-refactor` → MCP) | Base sólida; tests antes de schema; menos rework | Retrasa features MCP 1–2 sprints | Alto upfront, menor total |
| **B. Paralelo** (MCP schema + refactor) | Velocidad aparente | Doble migración; conflictos PR; lógica legacy + columnas nuevas | Muy alto riesgo |
| **C. MCP MVP shortcuts** (columnas sin domain) | Rápido | Rechazado por PO/usuario; deuda fintech | Bajo corto, alto largo |

**Decisión recomendada: A — Refactor-first**, con MCP **re-baselined**: Phase MCP-0 = consumir ports del refactor; MCP Phase 1 = schema + comportamiento multi-moneda.

**Secuencia:**
1. `payment-domain-refactor` — domain + ports + UC confirm/sync (sin columnas MCP)
2. `payment-domain-refactor` — strangler off `monetization.service`
3. `multi-currency-payments` PR1 schema + mappers
4. MCP PR2+ confirm cross-currency, web UI

---

## 5. Estrategia de migración (strangler)

### 5.1 Principios

- **Strangler fig:** nuevos UC detrás de mismos endpoints; service delega hasta borrado.
- **Feature flag:** `MULTI_CURRENCY_PAYMENTS` solo para **comportamiento** MCP, no para arquitectura.
- **Sin big-bang:** receipts y notifications no se tocan en PR1.
- **Unit of Work:** `$transaction` Prisma solo en adapter confirm (infra), no en application.

### 5.2 Orden de PRs sugerido (≤400 líneas c/u)

| PR | Change | Contenido | Líneas est. |
|----|--------|-----------|-------------|
| R1 | `payment-domain-refactor` | Domain VOs + errores + ports + tests unit golden money ops | ~350 |
| R2 | `payment-domain-refactor` | Adapters: `PrismaTransactionRepository`, mappers; implement ports | ~380 |
| R3 | `payment-domain-refactor` | `ConfirmManualPaymentUseCase` + `SyncReservationPaymentUseCase`; staff UC delega | ~350 |
| R4 | `payment-domain-refactor` | Obligation UCs; `PaymentOrchestrator`; controller wiring | ~400 |
| R5 | `payment-domain-refactor` | Exchange rate + payment method UCs; routers sin infra | ~350 |
| R6 | `payment-domain-refactor` | Dashboard/stats UCs; delete `monetization.service.ts` | ~300 |
| M1 | `multi-currency-payments` | Prisma schema + migrations + seed rates | ~400 |
| M2+ | MCP | Confirm cross-currency, web, flag | per design.md §10 |

### 5.3 Qué eliminar al final de R6

| Eliminar / vaciar | Motivo |
|-------------------|--------|
| `application/monetization.service.ts` | Reemplazado por UC + orchestrator |
| `infrastructure/repositories/transaction.repository.ts` | Movido a adapter |
| `infrastructure/repositories/fee_rule.repository.ts` | → adapter |
| Lógica duplicada `confirmTransactionManualSV` | Un solo camino confirm |
| Imports directos infra en application (5 archivos) | Cero tolerancia post-R6 |

**No eliminar aún:** `repositories/reservation.repository.ts` (otros BC); unificar naming en iteración posterior global.

---

## 6. File manifest (create / move / delete)

### 6.1 Crear (~28 archivos)

```
services/api/src/domain/money/currency_code.ts
services/api/src/domain/money/money_amount.ts
services/api/src/domain/money/money_amount_ops.ts
services/api/src/domain/money/exchange_rate_snapshot.ts
services/api/src/domain/money/money_errors.ts
services/api/src/domain/payment/payment_obligation.entity.ts          # opcional aggregate
services/api/src/domain/payment/reservation_payment.entity.ts
services/api/src/domain/ports/transaction_repository.ts
services/api/src/domain/ports/reservation_payment_repository.ts
services/api/src/domain/ports/venue_fee_rule_repository.ts
services/api/src/domain/ports/money_conversion_service.ts
services/api/src/domain/ports/currency_conversion_record_repository.ts
services/api/src/application/payment/payment_orchestrator.ts
services/api/src/application/use_cases/create_match_obligation.use_case.ts
services/api/src/application/use_cases/create_reservation_obligation.use_case.ts
services/api/src/application/use_cases/confirm_manual_payment.use_case.ts
services/api/src/application/use_cases/sync_reservation_payment.use_case.ts
services/api/src/application/use_cases/get_rate_for_reservation_day.use_case.ts
services/api/src/application/use_cases/list_venue_pending_transactions.use_case.ts  # refactor
services/api/src/application/use_cases/get_venue_transaction_stats.use_case.ts
services/api/src/application/use_cases/get_venue_dashboard_stats.use_case.ts
services/api/src/application/use_cases/refresh_exchange_rates.use_case.ts
services/api/src/application/use_cases/crud_venue_payment_method.use_case.ts
services/api/src/application/dto/money.dto.ts
services/api/src/application/dto/confirm_payment_result.dto.ts
services/api/src/infrastructure/adapters/prisma_transaction_repository.ts
services/api/src/infrastructure/adapters/prisma_exchange_rate_repository.ts
services/api/src/infrastructure/adapters/prisma_venue_fee_rule_repository.ts
services/api/src/infrastructure/adapters/prisma_currency_conversion_record_repository.ts
services/api/src/infrastructure/services/prisma_money_conversion.service.ts
services/api/src/infrastructure/mappers/transaction_money.mapper.ts
services/api/src/infrastructure/mappers/reservation_money.mapper.ts
services/api/src/infrastructure/mappers/currency_code.mapper.ts
services/api/src/infrastructure/config/feature_flags.ts
services/api/src/presentation/composition/monetization.composition.ts
services/api/src/presentation/composition/exchange_rates.composition.ts
services/api/src/presentation/composition/venue_payment_methods.composition.ts
services/api/src/presentation/controllers/exchange_rates.controller.ts
services/api/src/test/unit/money_conversion.golden.test.ts
services/api/src/test/unit/payment_obligation.test.ts
services/api/src/test/unit/sync_reservation_payment.test.ts
```

### 6.2 Modificar (~15)

```
services/api/src/application/use_cases/confirm_transaction_as_venue_staff.use_case.ts
services/api/src/presentation/controllers/monetization.controller.ts
services/api/src/presentation/routes/exchange_rate.router.ts
services/api/src/presentation/routes/venue_payment_method.router.ts
services/api/src/presentation/composition/venue_staff.composition.ts
services/api/src/presentation/validation/monetization.validation.ts
services/api/src/domain/ports/exchange_rate_repository.ts
services/api/src/domain/monetization/fee_calculation.ts
services/api/prisma/schema.prisma                    # solo en fase MCP, no refactor puro
```

### 6.3 Eliminar tras strangler (~4)

```
services/api/src/application/monetization.service.ts
services/api/src/infrastructure/repositories/transaction.repository.ts
services/api/src/infrastructure/repositories/fee_rule.repository.ts
services/api/src/infrastructure/repositories/exchange_rate.repository.ts  # → adapter
```

### 6.4 Mantener sin cambio estructural (patrón referencia)

```
services/api/src/application/use_cases/upload_transaction_receipt.use_case.ts
services/api/src/application/use_cases/get_transaction_receipt.use_case.ts
services/api/src/presentation/composition/transaction_receipts.composition.ts
```

---

## 7. Riesgos y mitigaciones

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Timeline 2–3 sprints solo refactor | Alta | PRs ≤400 LOC; no mezclar schema MCP en R1–R4 |
| Regresión confirmación reserva | Alta | Integration tests confirm + sync antes de borrar service |
| Cobertura actual mínima (4 tests) | Alta | TDD golden + contract; gate CI paths conversión |
| Dashboard revenue incorrecto hoy (solo match) | Media | Corregir en R5 con tests explícitos reserva |
| Equipo paraleliza web MCP antes de API refactor | Media | Congelar contrato `MoneyAmount` en spec; mock hasta R4 |
| `venue_payment_method.router` acoplado | Media | PR5 dedicado |
| Dual carpeta repositories/ vs adapters/ | Baja | Solo tocar BC pagos; documentar convención |

---

## 8. Approaches (comparativa)

| Approach | Pros | Cons | Effort |
|----------|------|------|--------|
| **Refactor-first (recomendado)** | MCP encaja en design; invariantes money; elimina god service | Delay feature visible | High |
| **Parallel refactor + MCP** | — | Conflictos migración; dos fuentes verdad | Very High |
| **MCP on AS-IS** | Entrega rápida columnas | Prisma en UC; bug agregación perpetuado | Medium → debt ∞ |

---

## Recommendation

Ejecutar **`payment-domain-refactor` como change SDD independiente y prerequisito** de `multi-currency-payments`. Gate: MCP PR1 (schema) mergeable solo cuando existan `TransactionRepository` + `ConfirmManualPaymentUseCase` + tests golden sin imports infra en application.

**Ready for Proposal:** Sí → lanzar `sdd-propose` en `payment-domain-refactor`, luego actualizar MCP proposal con dependencia explícita.

---

## Métricas de exploración

| Métrica | Valor |
|---------|-------|
| Archivos BC pagos (find pattern) | **37** |
| LOC núcleo (5 archivos) | **~1.201** |
| Archivos application BC con violación CA | **5 / 8** (62%) |
| Ports domain existentes (pagos) | **5** (receipt×3, venue_payment_method, exchange_rate) |
| Ports domain faltantes | **≥4** (transaction, fee, conversion, reservation payment) |
| Tests monetización | **4** archivos |
| Entidades dominio Transaction | **0** |
