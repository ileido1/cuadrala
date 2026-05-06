import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/monetization/data/monetization_api.dart';
import 'package:cuadrala_mobile/src/features/monetization/data/monetization_repository.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';

final class _MockMonetizationApi extends Mock implements MonetizationApi {}

final class _MockProfileRepository extends Mock implements ProfileRepository {}

void main() {
  group('MonetizationRepository', () {
    test('listMyTransactions parsea data.transactions', () async {
      final api = _MockMonetizationApi();
      final profile = _MockProfileRepository();
      final repo = MonetizationRepository(
        monetizationApi: api,
        profileRepository: profile,
      );

      when(() => profile.getMe()).thenAnswer(
        (_) async => const UserMeDto(
          id: 'u1',
          email: 'a@a.com',
          name: 'A',
          subscriptionType: 'FREE',
        ),
      );

      when(() => api.listUserTransactionsEnvelope(userId: any(named: 'userId'), limit: any(named: 'limit')))
          .thenAnswer(
        (_) async => {
          'data': <String, Object?>{
            'userId': 'u1',
            'transactions': [
              <String, Object?>{
                'id': 't1',
                'matchId': 'm1',
                'userId': 'u1',
                'amountBase': '50',
                'feeAmount': '5',
                'amountTotal': '55',
                'status': 'PENDING',
                'paymentMethod': 'MANUAL',
                'confirmedAt': null,
                'createdAt': '2026-05-05T00:00:00.000Z',
              },
            ],
          },
        },
      );

      final res = await repo.listMyTransactions();
      expect(res.userId, 'u1');
      expect(res.transactions, hasLength(1));
      expect(res.transactions.first.id, 't1');
      expect(res.transactions.first.status, 'PENDING');
    });

    test('getMatchTransactionsSummary lanza INVALID_RESPONSE si no hay data', () async {
      final api = _MockMonetizationApi();
      final profile = _MockProfileRepository();
      final repo = MonetizationRepository(
        monetizationApi: api,
        profileRepository: profile,
      );

      when(() => api.getMatchTransactionsSummaryEnvelope(matchId: any(named: 'matchId')))
          .thenAnswer((_) async => {'success': true});

      expect(
        () => repo.getMatchTransactionsSummary(matchId: 'm1'),
        throwsA(
          predicate(
            (e) => e is AppFailure && e.code == 'INVALID_RESPONSE',
          ),
        ),
      );
    });
  });
}

