import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/data/exchange_rates_repository.dart';
import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/core/formatting/money_conversion.dart';
import 'package:cuadrala_mobile/src/features/monetization/data/models/transaction_dto.dart';
import 'package:cuadrala_mobile/src/features/monetization/data/monetization_repository.dart';
import 'package:cuadrala_mobile/src/features/monetization/presentation/waiting_confirmation_screen.dart';

final class _MockMonetizationRepository extends Mock
    implements MonetizationRepository {}

final class _MockExchangeRatesRepository extends Mock
    implements ExchangeRatesRepository {}

TransactionDto _tx(String status) => TransactionDto(
      id: 'tx1',
      matchId: 'm1',
      userId: 'u1',
      amountBase: '50',
      feeAmount: '5',
      amountTotal: '55',
      status: status,
      paymentMethod: 'MANUAL',
      confirmedAt: null,
      createdAt: DateTime.utc(2026, 5, 5),
    );

void main() {
  group('WaitingConfirmationScreen', () {
    late _MockMonetizationRepository monetizationRepo;
    late _MockExchangeRatesRepository fxRepo;

    setUp(() async {
      await getIt.reset();
      monetizationRepo = _MockMonetizationRepository();
      fxRepo = _MockExchangeRatesRepository();
      when(() => fxRepo.listByCountry(countryCode: any(named: 'countryCode')))
          .thenAnswer((_) async => const []);
      getIt.registerSingleton<MonetizationRepository>(monetizationRepo);
      getIt.registerSingleton<ExchangeRatesRepository>(fxRepo);
    });

    const screen = WaitingConfirmationScreen(
      matchId: 'm1',
      amountPerPersonCents: 5000,
      matchTitle: 'Club Palermo',
      pricingCurrency: 'USD',
      transactionId: 'tx1',
    );

    testWidgets(
      'S8: sigue pollando y refleja CONFIRMED (no rompe el flujo existente)',
      (tester) async {
        when(
          () => monetizationRepo.listMyTransactions(limit: any(named: 'limit')),
        ).thenAnswer(
          (_) async => UserTransactionsResult(
            userId: 'u1',
            transactions: [_tx('CONFIRMED')],
          ),
        );

        await tester.pumpWidget(const MaterialApp(home: screen));
        await tester.pumpAndSettle();

        expect(find.byKey(const Key('pay.waiting.screen')), findsOneWidget);
        expect(find.text('¡Pago confirmado!'), findsOneWidget);
        expect(find.text('Confirmado'), findsOneWidget);
      },
    );

    testWidgets(
      'S8: corta el polling tras el cutoff y muestra el estado "tardando más"',
      (tester) async {
        when(
          () => monetizationRepo.listMyTransactions(limit: any(named: 'limit')),
        ).thenAnswer(
          (_) async => UserTransactionsResult(
            userId: 'u1',
            transactions: [_tx('PENDING')],
          ),
        );

        await tester.pumpWidget(const MaterialApp(home: screen));
        await tester.pump();

        // Avanza el reloj falso más allá del cutoff (5 min) para que la
        // cadena de reintentos con backoff llegue a su fin sin esperar en
        // tiempo real.
        await tester.pump(const Duration(minutes: 6));
        await tester.pump();

        expect(
          find.text('Esto está tardando más de lo esperado'),
          findsOneWidget,
        );
        expect(find.text('Reintentar'), findsOneWidget);
        // El badge sigue diciendo "Pendiente": el status real no cambió,
        // solo se agotó el tiempo de espera del polling.
        expect(find.text('Pendiente'), findsOneWidget);

        await tester.tap(find.text('Reintentar'));
        await tester.pump();

        expect(find.text('Comprobante enviado'), findsOneWidget);
        expect(
          find.text('Esto está tardando más de lo esperado'),
          findsNothing,
        );
      },
    );

    testWidgets(
      'S9: muestra el monto secundario en Bs cuando hay tasa de cambio',
      (tester) async {
        when(
          () => monetizationRepo.listMyTransactions(limit: any(named: 'limit')),
        ).thenAnswer(
          (_) async => UserTransactionsResult(
            userId: 'u1',
            transactions: [_tx('PENDING')],
          ),
        );
        when(() => fxRepo.listByCountry(countryCode: any(named: 'countryCode')))
            .thenAnswer(
          (_) async => [
            ExchangeRateRow(
              currency: 'USD',
              rateToBs: 50,
              effectiveDate: localCalendarDateIsoSV(DateTime.now()),
            ),
          ],
        );

        // No usamos pumpAndSettle: con status PENDING el ícono es un
        // CircularProgressIndicator indeterminado que anima en bucle y
        // nunca deja de programar frames, así que pumpAndSettle nunca
        // "asienta" — se bombean frames puntuales en su lugar.
        await tester.pumpWidget(const MaterialApp(home: screen));
        await tester.pump();
        await tester.pump();

        // 5000 centavos USD * 50 Bs/USD = Bs. 2500.00.
        expect(find.textContaining('Bs. 2500.00'), findsOneWidget);
      },
    );

    testWidgets(
      'S9: no muestra monto secundario cuando no hay tasa de cambio',
      (tester) async {
        when(
          () => monetizationRepo.listMyTransactions(limit: any(named: 'limit')),
        ).thenAnswer(
          (_) async => UserTransactionsResult(
            userId: 'u1',
            transactions: [_tx('PENDING')],
          ),
        );

        await tester.pumpWidget(const MaterialApp(home: screen));
        await tester.pump();
        await tester.pump();

        expect(find.textContaining('Bs.'), findsNothing);
      },
    );
  });
}
