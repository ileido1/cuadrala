// ignore_for_file: depend_on_referenced_packages
// image_picker_platform_interface es dependencia transitiva de `image_picker`
// (ya en pubspec); se usa solo acá para falsear el picker en los tests sin
// agregar una dependencia directa nueva. Re-exporta XFile de `cross_file`.
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker_platform_interface/image_picker_platform_interface.dart';
import 'package:mocktail/mocktail.dart';
import 'package:plugin_platform_interface/plugin_platform_interface.dart';

import 'package:cuadrala_mobile/src/core/data/exchange_rates_repository.dart';
import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/core/formatting/money_conversion.dart';
import 'package:cuadrala_mobile/src/features/monetization/data/monetization_repository.dart';
import 'package:cuadrala_mobile/src/features/monetization/presentation/upload_receipt_screen.dart';

final class _MockMonetizationRepository extends Mock
    implements MonetizationRepository {}

final class _MockExchangeRatesRepository extends Mock
    implements ExchangeRatesRepository {}

final class _MockImagePickerPlatform extends Mock
    with MockPlatformInterfaceMixin
    implements ImagePickerPlatform {}

/// PNG 1x1 transparente válido — `Image.memory` necesita bytes decodificables
/// de verdad; basura como `[1, 2, 3]` revienta el decoder async del binding.
final _fakeImageBytes = Uint8List.fromList([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, //
  0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, //
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, //
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, //
  0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, //
  0x54, 0x78, 0x9C, 0x62, 0x00, 0x01, 0x00, 0x00, //
  0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, //
  0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, //
  0x42, 0x60, 0x82, //
]);

void main() {
  group('UploadReceiptScreen', () {
    late _MockMonetizationRepository monetizationRepo;
    late _MockExchangeRatesRepository fxRepo;
    late _MockImagePickerPlatform imagePickerPlatform;

    setUpAll(() {
      registerFallbackValue(ImageSource.gallery);
      registerFallbackValue(const ImagePickerOptions());
    });

    setUp(() async {
      await getIt.reset();

      monetizationRepo = _MockMonetizationRepository();
      fxRepo = _MockExchangeRatesRepository();
      when(() => fxRepo.listByCountry(countryCode: any(named: 'countryCode')))
          .thenAnswer((_) async => const []);
      getIt.registerSingleton<MonetizationRepository>(monetizationRepo);
      getIt.registerSingleton<ExchangeRatesRepository>(fxRepo);

      imagePickerPlatform = _MockImagePickerPlatform();
      ImagePickerPlatform.instance = imagePickerPlatform;
      when(
        () => imagePickerPlatform.getImageFromSource(
          source: any(named: 'source'),
          options: any(named: 'options'),
        ),
      ).thenAnswer(
        (_) async => XFile.fromData(
          _fakeImageBytes,
          path: 'receipt.jpg',
          mimeType: 'image/png',
        ),
      );
    });

    const screen = UploadReceiptScreen(
      matchId: 'm1',
      transactionId: 'tx1',
      method: 'TRANSFER',
      amountPerPersonCents: 5000,
      matchTitle: 'Club Palermo',
      pricingCurrency: 'USD',
    );

    /// Selecciona una imagen falsa y toca "Enviar comprobante".
    Future<void> selectImageAndUpload(WidgetTester tester) async {
      await tester.tap(find.text('Toca para seleccionar una imagen'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Enviar comprobante'));
      await tester.pump();
      await tester.pumpAndSettle();
    }

    testWidgets(
      'S7: muestra el mensaje real del AppFailure cuando la subida falla',
      (tester) async {
        when(
          () => monetizationRepo.uploadReceipt(
            transactionId: any(named: 'transactionId'),
            fileBytes: any(named: 'fileBytes'),
            fileName: any(named: 'fileName'),
          ),
        ).thenThrow(
          const AppFailure(
            code: 'UPLOAD_TOO_LARGE',
            message: 'El archivo supera el límite de 5MB.',
          ),
        );

        await tester.pumpWidget(const MaterialApp(home: screen));
        await tester.pumpAndSettle();

        await selectImageAndUpload(tester);

        expect(
          find.text('El archivo supera el límite de 5MB.'),
          findsOneWidget,
        );
        expect(find.text('No se pudo subir el comprobante.'), findsNothing);
      },
    );

    testWidgets(
      'S7: usa el mensaje genérico cuando el error no es un AppFailure',
      (tester) async {
        when(
          () => monetizationRepo.uploadReceipt(
            transactionId: any(named: 'transactionId'),
            fileBytes: any(named: 'fileBytes'),
            fileName: any(named: 'fileName'),
          ),
        ).thenThrow(Exception('boom'));

        await tester.pumpWidget(const MaterialApp(home: screen));
        await tester.pumpAndSettle();

        await selectImageAndUpload(tester);

        expect(find.text('No se pudo subir el comprobante.'), findsOneWidget);
      },
    );

    testWidgets(
      'S9: muestra el monto secundario en Bs cuando hay tasa de cambio',
      (tester) async {
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

        await tester.pumpWidget(const MaterialApp(home: screen));
        await tester.pumpAndSettle();

        // 5000 centavos USD * 50 Bs/USD = Bs. 2500.00.
        expect(find.textContaining('Bs. 2500.00'), findsOneWidget);
      },
    );

    testWidgets(
      'S9: no muestra monto secundario cuando no hay tasa de cambio',
      (tester) async {
        await tester.pumpWidget(const MaterialApp(home: screen));
        await tester.pumpAndSettle();

        expect(find.textContaining('Bs.'), findsNothing);
      },
    );
  });
}
