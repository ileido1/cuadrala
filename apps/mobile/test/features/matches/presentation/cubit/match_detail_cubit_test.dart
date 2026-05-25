import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/match_detail_dto.dart';
import 'package:cuadrala_mobile/src/features/monetization/data/monetization_repository.dart';
import 'package:cuadrala_mobile/src/features/monetization/data/models/transaction_dto.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/cubit/match_detail_cubit.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/cubit/match_detail_state.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';

class _MockMatchesRepository extends Mock implements MatchesRepository {}

class _MockProfileRepository extends Mock implements ProfileRepository {}

class _MockMonetizationRepository extends Mock
    implements MonetizationRepository {}

void main() {
  group('MatchDetailCubit', () {
    late _MockMatchesRepository matchesRepository;
    late _MockProfileRepository profileRepository;
    late _MockMonetizationRepository monetizationRepository;

    const matchId = 'match-1';
    const viewerId = 'user-1';

    MatchDetailDto buildMatch({
      List<MatchParticipantDto> participants = const [],
      int openSpots = 4,
      String status = 'SCHEDULED',
    }) {
      final now = DateTime.utc(2026, 5, 5, 12);
      return MatchDetailDto(
        id: matchId,
        sportId: 'sport',
        categoryId: 'cat',
        type: 'REGULAR',
        status: status,
        scheduledAt: now,
        pricePerPlayerCents: 1000,
        maxParticipants: 4,
        participantCount: participants.length,
        openSpots: openSpots,
        courtId: null,
        clubName: 'Club',
        courtName: 'Cancha 1',
        locationLabel: 'Dirección',
        tournamentId: null,
        participants: participants,
        createdAt: now,
        updatedAt: now,
      );
    }

    setUp(() {
      matchesRepository = _MockMatchesRepository();
      profileRepository = _MockProfileRepository();
      monetizationRepository = _MockMonetizationRepository();

      when(() => monetizationRepository.listMyTransactions(limit: any(named: 'limit')))
          .thenAnswer(
        (_) async => const UserTransactionsResult(
          userId: viewerId,
          transactions: [],
        ),
      );

      when(() => profileRepository.getMe()).thenAnswer(
        (_) async => const UserMeDto(
          id: viewerId,
          email: 'u@test.local',
          name: 'User',
          subscriptionType: 'FREE',
        ),
      );
    });

    blocTest<MatchDetailCubit, MatchDetailState>(
      'load emite loading→loaded con viewerUserId',
      build: () {
        when(() => matchesRepository.getMatchById(matchId))
            .thenAnswer((_) async => buildMatch());
        return MatchDetailCubit(
          matchesRepository: matchesRepository,
          profileRepository: profileRepository,
          monetizationRepository: monetizationRepository,
          matchId: matchId,
        );
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        const MatchDetailLoading(),
        isA<MatchDetailLoaded>().having((s) => s.viewerUserId, 'viewerUserId', viewerId),
      ],
    );

    blocTest<MatchDetailCubit, MatchDetailState>(
      'load marca pago confirmado del viewer',
      build: () {
        when(() => matchesRepository.getMatchById(matchId)).thenAnswer(
          (_) async => buildMatch(
            participants: [
              MatchParticipantDto(
                userId: viewerId,
                joinedAt: DateTime.utc(2026, 5, 5),
              ),
            ],
          ),
        );
        when(() => monetizationRepository.listMyTransactions(limit: any(named: 'limit')))
            .thenAnswer(
          (_) async => UserTransactionsResult(
            userId: viewerId,
            transactions: [
              TransactionDto(
                id: 'tx-1',
                matchId: matchId,
                userId: viewerId,
                amountBase: '10',
                feeAmount: '1',
                amountTotal: '11',
                status: 'CONFIRMED',
                paymentMethod: 'MANUAL',
                confirmedAt: DateTime.utc(2026, 5, 6),
                createdAt: DateTime.utc(2026, 5, 5),
              ),
            ],
          ),
        );
        return MatchDetailCubit(
          matchesRepository: matchesRepository,
          profileRepository: profileRepository,
          monetizationRepository: monetizationRepository,
          matchId: matchId,
        );
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        const MatchDetailLoading(),
        isA<MatchDetailLoaded>()
            .having((s) => s.viewerHasConfirmedPayment, 'paid', true),
      ],
    );

    blocTest<MatchDetailCubit, MatchDetailState>(
      'join llama repo y re-carga el match',
      build: () {
        when(() => matchesRepository.getMatchById(matchId))
            .thenAnswer((_) async => buildMatch());
        when(() => matchesRepository.joinMatch(matchId))
            .thenAnswer((_) async {});
        return MatchDetailCubit(
          matchesRepository: matchesRepository,
          profileRepository: profileRepository,
          monetizationRepository: monetizationRepository,
          matchId: matchId,
        );
      },
      act: (cubit) async {
        await cubit.load();
        await cubit.join();
      },
      verify: (_) {
        verify(() => matchesRepository.joinMatch(matchId)).called(1);
        verify(() => matchesRepository.getMatchById(matchId)).called(greaterThanOrEqualTo(2));
      },
    );

    blocTest<MatchDetailCubit, MatchDetailState>(
      'leave llama repo y re-carga el match',
      build: () {
        when(() => matchesRepository.getMatchById(matchId))
            .thenAnswer((_) async => buildMatch(participants: [MatchParticipantDto(userId: viewerId, joinedAt: DateTime.fromMillisecondsSinceEpoch(0))]));
        when(() => matchesRepository.leaveMatch(matchId))
            .thenAnswer((_) async {});
        return MatchDetailCubit(
          matchesRepository: matchesRepository,
          profileRepository: profileRepository,
          monetizationRepository: monetizationRepository,
          matchId: matchId,
        );
      },
      act: (cubit) async {
        await cubit.load();
        await cubit.leave();
      },
      verify: (_) {
        verify(() => matchesRepository.leaveMatch(matchId)).called(1);
        verify(() => matchesRepository.getMatchById(matchId)).called(greaterThanOrEqualTo(2));
      },
    );

    blocTest<MatchDetailCubit, MatchDetailState>(
      'join falla y deja actionMessage',
      build: () {
        when(() => matchesRepository.getMatchById(matchId))
            .thenAnswer((_) async => buildMatch());
        when(() => matchesRepository.joinMatch(matchId)).thenThrow(
          const AppFailure(code: 'FULL', message: 'Sin cupos.'),
        );
        return MatchDetailCubit(
          matchesRepository: matchesRepository,
          profileRepository: profileRepository,
          monetizationRepository: monetizationRepository,
          matchId: matchId,
        );
      },
      act: (cubit) async {
        await cubit.load();
        await cubit.join();
      },
      expect: () => [
        const MatchDetailLoading(),
        isA<MatchDetailLoaded>(),
        isA<MatchDetailLoaded>().having((s) => s.actionLoading, 'actionLoading', true),
        isA<MatchDetailLoaded>()
            .having((s) => s.actionMessage, 'actionMessage', 'Sin cupos.')
            .having((s) => s.actionMessageIsError, 'actionMessageIsError', true),
      ],
    );
  });
}

