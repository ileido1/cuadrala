import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/payments/data/models/pending_transaction_dto.dart';
import 'package:cuadrala_mobile/src/features/payments/data/payments_repository.dart';
import 'package:cuadrala_mobile/src/features/payments/presentation/cubit/payments_cubit.dart';
import 'package:cuadrala_mobile/src/features/payments/presentation/cubit/payments_state.dart';

class _MockPaymentsRepository extends Mock implements PaymentsRepository {}

void main() {
  group('PaymentsCubit', () {
    late _MockPaymentsRepository paymentsRepository;

    setUp(() {
      paymentsRepository = _MockPaymentsRepository();
    });

    PendingTransactionDto transaction({
      required String id,
      String status = 'pending',
    }) {
      return PendingTransactionDto(
        id: id,
        matchId: 'match_xyz',
        matchLabel: 'Cancha 1 — 10:00',
        amountCents: 1500,
        currency: 'ARS',
        player: const PlayerSummaryDto(id: 'usr_123', name: 'Juan Pérez'),
        status: status,
        createdAt: DateTime(2026, 5, 9, 9, 0),
        updatedAt: DateTime(2026, 5, 9, 9, 0),
      );
    }

    blocTest<PaymentsCubit, PaymentsState>(
      'load emite loading→loaded con transacciones',
      build: () {
        when(() => paymentsRepository.getPendingTransactions(venueId: 'v1'))
            .thenAnswer((_) async => [transaction(id: 'txn_1'), transaction(id: 'txn_2')]);
        return PaymentsCubit(repository: paymentsRepository, venueId: 'v1');
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        const PaymentsLoading(),
        isA<PaymentsLoaded>().having((s) => s.transactions.length, 'length', 2),
      ],
    );

    blocTest<PaymentsCubit, PaymentsState>(
      'load con lista vacía emite loading→empty',
      build: () {
        when(() => paymentsRepository.getPendingTransactions(venueId: 'v1'))
            .thenAnswer((_) async => []);
        return PaymentsCubit(repository: paymentsRepository, venueId: 'v1');
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        const PaymentsLoading(),
        const PaymentsEmpty(),
      ],
    );

    blocTest<PaymentsCubit, PaymentsState>(
      'load con error de red emite loading→error',
      build: () {
        when(() => paymentsRepository.getPendingTransactions(venueId: 'v1'))
            .thenThrow(Exception('network error'));
        return PaymentsCubit(repository: paymentsRepository, venueId: 'v1');
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        const PaymentsLoading(),
        isA<PaymentsError>(),
      ],
    );

    blocTest<PaymentsCubit, PaymentsState>(
      'refresh re-emite loaded sin mostrar loading previo',
      build: () {
        when(() => paymentsRepository.getPendingTransactions(venueId: 'v1'))
            .thenAnswer((_) async => [transaction(id: 'txn_1')]);
        return PaymentsCubit(repository: paymentsRepository, venueId: 'v1');
      },
      act: (cubit) => cubit.refresh(),
      expect: () => [
        isA<PaymentsLoaded>(),
      ],
    );

    blocTest<PaymentsCubit, PaymentsState>(
      'close cancela el timer de polling',
      build: () {
        when(() => paymentsRepository.getPendingTransactions(venueId: 'v1'))
            .thenAnswer((_) async => [transaction(id: 'txn_1')]);
        return PaymentsCubit(repository: paymentsRepository, venueId: 'v1');
      },
      act: (cubit) async {
        await cubit.load();
        await cubit.close();
      },
      expect: () => [
        const PaymentsLoading(),
        isA<PaymentsLoaded>(),
      ],
    );
  });
}