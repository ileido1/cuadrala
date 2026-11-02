# Cancha: "Pagado" hardcodeado para el otro participante

Branch: `fix/court-view-payment-status-per-participant`. Runner: `flutter test` en `apps/mobile/`.

## Specs

- **S1**: usuario reportó, con captura, "cuando estoy en la partida y yo pagué le dice pagado a al otro usuario y cuando me meto desde ese usuario me sale pagado la otra persona" — el estado de pago se ve invertido según quién mira la partida.
- **S2**: investigado y confirmado — NO es corrupción de datos en backend. `match_detail_screen.dart` `_CourtSection.spot()` (línea ~641) mostraba `CourtPlayerStatus.paid` **hardcodeado** para cualquier participante que no fuera el viewer, sin consultar su pago real. El propio viewer sí veía su estado real (`loaded.viewerHasConfirmedPayment`). El widget hermano `_PlayerTile` (fallback sin layout de cancha) ya hacía la consulta real por usuario — no se reusaba en `_CourtSection`.
- **S3**: fix — consultar el pago real de cada participante que no es el viewer (mismo endpoint `MonetizationRepository.listUserTransactions(userId: ...)` que ya usa `_PlayerTile`), calculado una vez en `MatchDetailCubit` y expuesto en `MatchDetailLoaded.participantsConfirmedPayment`.

## Tasks

| ID | Linked S# | Route | Status | Commit/Evidence |
|----|-----------|-------|--------|------------------|
| T1 | S1-S2 | inline (parent, codegraph_explore + grep) | done | causa raíz confirmada por lectura de código, no requirió reproducción en dispositivo |
| T2 | S3 | inline (parent) | done | ver Log |

## Log

- **L1**: Usuario mandó dos capturas de WhatsApp mostrando el mismo partido desde dos cuentas distintas, con el estado de pago invertido entre ellas. Se investigó con `codegraph_explore` + grep, encontrando el hardcode exacto en `match_detail_screen.dart:641` antes de tocar nada.
- Usuario confirmó implementar el fix ("Sí, implementalo ya") tras ver el diagnóstico con la línea exacta.
- Fix: `MatchDetailCubit._otherParticipantsConfirmedPayment()` (nuevo) consulta `listUserTransactions(userId: p.userId)` por cada participante que no es el viewer, en paralelo (`Future.wait`), y lo expone en `MatchDetailLoaded.participantsConfirmedPayment` (`Map<String, bool>`). `_CourtSection.spot()` ahora lee ese mapa en vez de asumir `paid`. Partidos gratis (`pricePerPlayerCents <= 0`) devuelven mapa vacío, igual que ya hacía `_viewerPaymentStatus` para el viewer — sin cambio de comportamiento ahí.
- RED: 2 tests nuevos en `match_detail_cubit_test.dart` (otro participante sin transacción confirmada → no debe verse pagado; con transacción confirmada real → sí) fallan por compilación contra el código viejo (campo no existía) → GREEN tras el fix.
- Regresión: `match_detail_cubit_test.dart` (8/8), `test/features/matches/` completo (115/115, sin cambios de comportamiento fuera de lo esperado). Suite completo: 1288/1288, `flutter analyze` limpio.
- Pendiente, reportado por el usuario en la misma conversación pero sin tocar en esta rama: "no hay forma de dejar la cola o hacer otra cola para otro día" en Quick Match — investigado y la funcionalidad **ya existe** (`quick_match_screen.dart`: botón "Salir de la cola" + `changeSchedule()`), accesible tocando la tarjeta "Tu búsqueda está activa" del home. No era un bug; queda pendiente confirmar con el usuario si lo encontró.
