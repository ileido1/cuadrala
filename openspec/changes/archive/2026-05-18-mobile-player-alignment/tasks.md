# Tasks: mobile-player-alignment

## M1 — Limpieza staff (P0)
- [x] T1.1 Eliminar `features/backoffice_reservations/`
- [x] T1.2 Eliminar `features/payments/` y tests
- [x] T1.3 Quitar ruta `/venues/:id/schedule` y `Routes.backofficeSchedule`
- [x] T1.4 Limpiar DI en `service_locator.dart`
- [x] T1.5 `flutter analyze` + `flutter test`

## M2 — Partida + reserva publicada (P0)
- [x] T2.1 API: `CreateMatchUseCase` transacción Match + Reservation MATCH PUBLISHED
- [x] T2.2 API: tests unit create_match (409 reserva + pass venueId)
- [x] T2.3 Mobile: enviar `durationMinutes` en create match
- [x] T2.4 Mobile: manejo errores 409 existentes (sin cambio; ya en UI)

## M3 — Pagos jugador multi-moneda (P0/P1)
- [x] T3.1 API: payment-methods públicos (ya existía); summary legacy pendiente API
- [x] T3.2 Mobile: `VenuePaymentMethodDto` en monetization
- [x] T3.3 Mobile: PayMethodScreen usa payment-methods (+ fallback legacy)
- [x] T3.4 Mobile: formatMoney con pricingCurrency (venue detail)
- [x] T3.5 Mobile: quitar `confirmTransactionManual` del repo
- [x] T3.6 Mobile: WaitingConfirmationScreen poll estado

## M4 — Opening hours (P1)
- [x] T4.1 `core/venue/opening_hours.dart` + tests
- [x] T4.2 `VenueDto.openingHours` + getVenueDetail
- [x] T4.3 CreateMatchScreen picker acotado
