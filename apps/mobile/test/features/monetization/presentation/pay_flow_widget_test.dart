import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/monetization/data/monetization_repository.dart';
import 'package:cuadrala_mobile/src/features/monetization/data/models/transaction_dto.dart';
import 'package:cuadrala_mobile/src/features/monetization/presentation/pay_method_screen.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';

final class _MockProfileRepository extends Mock implements ProfileRepository {}

final class _MockMonetizationRepository extends Mock implements MonetizationRepository {}

void main() {
  group('Pay flow (widgets)', () {
    setUp(() async {
      await getIt.reset();
      final profileRepo = _MockProfileRepository();
      when(() => profileRepo.getMe()).thenAnswer(
        (_) async => const UserMeDto(
          id: 'u1',
          email: 'u@test.local',
          name: 'User',
          subscriptionType: 'FREE',
        ),
      );
      getIt.registerSingleton<ProfileRepository>(profileRepo);

      final monetizationRepo = _MockMonetizationRepository();
      when(() => monetizationRepo.listMyTransactions(limit: any(named: 'limit'))).thenAnswer(
        (_) async => UserTransactionsResult(
          userId: 'u1',
          transactions: [
            TransactionDto(
              id: 'tx1',
              matchId: 'm1',
              userId: 'u1',
              amountBase: '50',
              feeAmount: '5',
              amountTotal: '55',
              status: 'PENDING',
              paymentMethod: 'MANUAL',
              confirmedAt: null,
              createdAt: DateTime.utc(2026, 5, 5),
            ),
          ],
        ),
      );
      getIt.registerSingleton<MonetizationRepository>(monetizationRepo);
    });

    testWidgets('PayMethodScreen renderiza opciones y botón continuar', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: PayMethodScreen(
            matchId: 'm1',
            amountPerPersonCents: 5000,
            matchTitle: 'Club Palermo',
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.byKey(const Key('pay.method.screen')), findsOneWidget);
      expect(find.text('Transferencia bancaria'), findsOneWidget);
      expect(find.text('Efectivo'), findsOneWidget);
      expect(find.text('Continuar'), findsOneWidget);
    });
  });
}

