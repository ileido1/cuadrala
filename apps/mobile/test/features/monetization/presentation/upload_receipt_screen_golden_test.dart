import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/data/exchange_rates_repository.dart';
import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/monetization/data/monetization_repository.dart';
import 'package:cuadrala_mobile/src/features/monetization/presentation/upload_receipt_screen.dart';

import '../../../helpers/golden_harness.dart';

final class _MockMonetizationRepository extends Mock
    implements MonetizationRepository {}

final class _MockExchangeRatesRepository extends Mock
    implements ExchangeRatesRepository {}

//? Issue #116: upload_receipt_screen.dart ya tenía tests de comportamiento
//? pero ningún golden. Cubre el estado inicial, sin comprobante seleccionado.
void main() {
  late _MockExchangeRatesRepository fxRepo;

  setUpAll(loadGoldenFonts);

  setUp(() async {
    await getIt.reset();
    fxRepo = _MockExchangeRatesRepository();
    //? Sin tasas: el monto secundario usa DateTime.now() y volvería
    //? inestable el golden.
    when(() => fxRepo.listByCountry(countryCode: any(named: 'countryCode')))
        .thenAnswer((_) async => const []);
    getIt.registerSingleton<MonetizationRepository>(
      _MockMonetizationRepository(),
    );
    getIt.registerSingleton<ExchangeRatesRepository>(fxRepo);
  });

  tearDown(() async {
    await getIt.reset();
  });

  for (final brightness in Brightness.values) {
    testWidgets('Subir comprobante — vacío ${brightness.name}', (tester) async {
      await pumpGolden(
        tester,
        brightness: brightness,
        child: const UploadReceiptScreen(
          matchId: 'm1',
          transactionId: 'tx1',
          method: 'TRANSFER',
          amountPerPersonCents: 5000,
          matchTitle: 'Club Cuádrala',
          pricingCurrency: 'USD',
        ),
      );
      await tester.pumpAndSettle();

      await expectLater(
        find.byKey(goldenKey),
        matchesGoldenFile(
          'goldens/upload_receipt_screen_empty_${brightness.name}.png',
        ),
      );
    });
  }
}
