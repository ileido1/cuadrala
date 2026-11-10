import 'dart:typed_data';

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/data/exchange_rates_repository.dart';
import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/core/formatting/money_conversion.dart';
import 'package:cuadrala_mobile/src/features/monetization/data/monetization_repository.dart';
import 'package:cuadrala_mobile/src/features/monetization/presentation/cubit/upload_receipt_cubit.dart';
import 'package:cuadrala_mobile/src/features/monetization/presentation/cubit/upload_receipt_state.dart';

class _MockMonetizationRepository extends Mock implements MonetizationRepository {}

class _MockExchangeRatesRepository extends Mock implements ExchangeRatesRepository {}

void main() {
  group('UploadReceiptCubit (issue #109)', () {
    late _MockMonetizationRepository monetizationRepository;
    late _MockExchangeRatesRepository exchangeRatesRepository;
    final bytes = Uint8List.fromList([1, 2, 3]);

    setUp(() {
      monetizationRepository = _MockMonetizationRepository();
      exchangeRatesRepository = _MockExchangeRatesRepository();
      registerFallbackValue(bytes);
      getIt.registerSingleton<ExchangeRatesRepository>(exchangeRatesRepository);
    });

    tearDown(() {
      getIt.unregister<ExchangeRatesRepository>();
    });

    blocTest<UploadReceiptCubit, UploadReceiptState>(
      'setImage coloca los bytes y el nombre de archivo en el estado',
      build: () => UploadReceiptCubit(
        monetizationRepository: monetizationRepository,
        transactionId: 'tx-1',
      ),
      act: (cubit) => cubit.setImage(bytes: bytes, fileName: 'foto.jpg'),
      expect: () => [
        isA<UploadReceiptState>()
            .having((s) => s.imageBytes, 'imageBytes', bytes)
            .having((s) => s.fileName, 'fileName', 'foto.jpg'),
      ],
    );

    blocTest<UploadReceiptCubit, UploadReceiptState>(
      'setImage usa un nombre por defecto cuando el picker no da uno',
      build: () => UploadReceiptCubit(
        monetizationRepository: monetizationRepository,
        transactionId: 'tx-1',
      ),
      act: (cubit) => cubit.setImage(bytes: bytes, fileName: ''),
      expect: () => [
        isA<UploadReceiptState>()
            .having((s) => s.fileName, 'fileName', 'receipt.jpg'),
      ],
    );

    blocTest<UploadReceiptCubit, UploadReceiptState>(
      'upload sin imagen seleccionada no hace nada',
      build: () => UploadReceiptCubit(
        monetizationRepository: monetizationRepository,
        transactionId: 'tx-1',
      ),
      act: (cubit) => cubit.upload(),
      expect: () => [],
      verify: (_) {
        verifyNever(() => monetizationRepository.uploadReceipt(
              transactionId: any(named: 'transactionId'),
              fileBytes: any(named: 'fileBytes'),
              fileName: any(named: 'fileName'),
            ));
      },
    );

    blocTest<UploadReceiptCubit, UploadReceiptState>(
      'upload exitoso marca completed=true',
      build: () {
        when(() => monetizationRepository.uploadReceipt(
              transactionId: any(named: 'transactionId'),
              fileBytes: any(named: 'fileBytes'),
              fileName: any(named: 'fileName'),
            )).thenAnswer((_) async => <String, Object?>{});
        return UploadReceiptCubit(
          monetizationRepository: monetizationRepository,
          transactionId: 'tx-1',
        );
      },
      act: (cubit) async {
        cubit.setImage(bytes: bytes, fileName: 'foto.jpg');
        await cubit.upload();
      },
      expect: () => [
        isA<UploadReceiptState>(), // setImage
        isA<UploadReceiptState>().having((s) => s.uploading, 'uploading', true),
        isA<UploadReceiptState>()
            .having((s) => s.uploading, 'uploading', false)
            .having((s) => s.completed, 'completed', true),
      ],
      verify: (_) {
        verify(() => monetizationRepository.uploadReceipt(
              transactionId: 'tx-1',
              fileBytes: bytes,
              fileName: 'foto.jpg',
            )).called(1);
      },
    );

    blocTest<UploadReceiptCubit, UploadReceiptState>(
      'S7: expone el mensaje real del AppFailure cuando la subida falla',
      build: () {
        when(() => monetizationRepository.uploadReceipt(
              transactionId: any(named: 'transactionId'),
              fileBytes: any(named: 'fileBytes'),
              fileName: any(named: 'fileName'),
            )).thenThrow(
          const AppFailure(
            code: 'UPLOAD_TOO_LARGE',
            message: 'El archivo supera el límite de 5MB.',
          ),
        );
        return UploadReceiptCubit(
          monetizationRepository: monetizationRepository,
          transactionId: 'tx-1',
        );
      },
      act: (cubit) async {
        cubit.setImage(bytes: bytes, fileName: 'foto.jpg');
        await cubit.upload();
      },
      expect: () => [
        isA<UploadReceiptState>(), // setImage
        isA<UploadReceiptState>().having((s) => s.uploading, 'uploading', true),
        isA<UploadReceiptState>()
            .having((s) => s.uploading, 'uploading', false)
            .having(
              (s) => s.errorMessage,
              'errorMessage',
              'El archivo supera el límite de 5MB.',
            )
            .having((s) => s.completed, 'completed', false),
      ],
    );

    blocTest<UploadReceiptCubit, UploadReceiptState>(
      'S7: usa el mensaje genérico cuando el error no es un AppFailure',
      build: () {
        when(() => monetizationRepository.uploadReceipt(
              transactionId: any(named: 'transactionId'),
              fileBytes: any(named: 'fileBytes'),
              fileName: any(named: 'fileName'),
            )).thenThrow(Exception('boom'));
        return UploadReceiptCubit(
          monetizationRepository: monetizationRepository,
          transactionId: 'tx-1',
        );
      },
      act: (cubit) async {
        cubit.setImage(bytes: bytes, fileName: 'foto.jpg');
        await cubit.upload();
      },
      expect: () => [
        isA<UploadReceiptState>(), // setImage
        isA<UploadReceiptState>().having((s) => s.uploading, 'uploading', true),
        isA<UploadReceiptState>().having(
          (s) => s.errorMessage,
          'errorMessage',
          'No se pudo subir el comprobante.',
        ),
      ],
    );

    blocTest<UploadReceiptCubit, UploadReceiptState>(
      'loadExchangeRates coloca las tasas en el estado',
      build: () {
        when(
          () => exchangeRatesRepository.listByCountry(
            countryCode: any(named: 'countryCode'),
          ),
        ).thenAnswer(
          (_) async => const [ExchangeRateRow(currency: 'USD', rateToBs: 50)],
        );
        return UploadReceiptCubit(
          monetizationRepository: monetizationRepository,
          transactionId: 'tx-1',
        );
      },
      act: (cubit) => cubit.loadExchangeRates(),
      expect: () => [
        isA<UploadReceiptState>().having(
          (s) => s.exchangeRates,
          'exchangeRates',
          const [ExchangeRateRow(currency: 'USD', rateToBs: 50)],
        ),
      ],
    );
  });
}
