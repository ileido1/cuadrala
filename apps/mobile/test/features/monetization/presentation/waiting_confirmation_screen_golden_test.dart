import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/data/exchange_rates_repository.dart';
import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/monetization/data/models/transaction_dto.dart';
import 'package:cuadrala_mobile/src/features/monetization/data/monetization_repository.dart';
import 'package:cuadrala_mobile/src/features/monetization/presentation/waiting_confirmation_screen.dart';

import '../../../helpers/golden_harness.dart';

final class _MockMonetizationRepository extends Mock
    implements MonetizationRepository {}

final class _MockExchangeRatesRepository extends Mock
    implements ExchangeRatesRepository {}

final _confirmedTx = TransactionDto(
  id: 'tx1',
  matchId: 'm1',
  userId: 'u1',
  amountBase: '50',
  feeAmount: '5',
  amountTotal: '55',
  status: 'CONFIRMED',
  paymentMethod: 'MANUAL',
  confirmedAt: DateTime.utc(2030, 6, 1, 18),
  createdAt: DateTime.utc(2030, 6, 1, 17),
);

//? Issue #116: waiting_confirmation_screen.dart ya tenía tests de
//? comportamiento pero ningún golden. Cubre el estado CONFIRMED: el estado
//? PENDING anima un spinner indeterminado y nunca asienta, así que no sirve
//? para un golden estable.
void main() {
  late _MockMonetizationRepository monetizationRepo;
  late _MockExchangeRatesRepository fxRepo;

  setUpAll(loadGoldenFonts);

  setUp(() async {
    await getIt.reset();
    monetizationRepo = _MockMonetizationRepository();
    fxRepo = _MockExchangeRatesRepository();
    when(() => fxRepo.listByCountry(countryCode: any(named: 'countryCode')))
        .thenAnswer((_) async => const []);
    when(() => monetizationRepo.listMyTransactions(limit: any(named: 'limit')))
        .thenAnswer(
      (_) async =>
          UserTransactionsResult(userId: 'u1', transactions: [_confirmedTx]),
    );
    getIt.registerSingleton<MonetizationRepository>(monetizationRepo);
    getIt.registerSingleton<ExchangeRatesRepository>(fxRepo);
  });

  tearDown(() async {
    await getIt.reset();
  });

  for (final brightness in Brightness.values) {
    testWidgets('Esperando confirmación — confirmado ${brightness.name}',
        (tester) async {
      await pumpGolden(
        tester,
        brightness: brightness,
        child: const WaitingConfirmationScreen(
          matchId: 'm1',
          amountPerPersonCents: 5000,
          matchTitle: 'Club Cuádrala',
          pricingCurrency: 'USD',
          transactionId: 'tx1',
        ),
      );
      await tester.pumpAndSettle();

      await expectLater(
        find.byKey(goldenKey),
        matchesGoldenFile(
          'goldens/waiting_confirmation_screen_confirmed_${brightness.name}.png',
        ),
      );
    });
  }
}
