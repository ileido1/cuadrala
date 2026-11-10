import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/data/exchange_rates_repository.dart';
import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/core/formatting/money_conversion.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/match_detail_dto.dart';
import 'package:cuadrala_mobile/src/features/monetization/data/monetization_repository.dart';
import 'package:cuadrala_mobile/src/features/monetization/data/models/transaction_dto.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/cubit/match_detail_cubit.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/cubit/match_detail_state.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_rating_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';

class _MockMatchesRepository extends Mock implements MatchesRepository {}

class _MockProfileRepository extends Mock implements ProfileRepository {}

class _MockMonetizationRepository extends Mock
    implements MonetizationRepository {}

class _MockExchangeRatesRepository extends Mock
    implements ExchangeRatesRepository {}

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
      bool affectsElo = true,
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
        affectsElo: affectsElo,
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

    group('load() con tasas de cambio', () {
      late _MockExchangeRatesRepository exchangeRatesRepository;

      setUp(() {
        exchangeRatesRepository = _MockExchangeRatesRepository();
        getIt.registerSingleton<ExchangeRatesRepository>(exchangeRatesRepository);
      });

      tearDown(() {
        getIt.unregister<ExchangeRatesRepository>();
      });

      blocTest<MatchDetailCubit, MatchDetailState>(
        'coloca las tasas reales en el estado cargado para habilitar el Bs secundario',
        setUp: () {
          when(() => matchesRepository.getMatchById(matchId))
              .thenAnswer((_) async => buildMatch());
          when(
            () => exchangeRatesRepository.listByCountry(
              countryCode: any(named: 'countryCode'),
            ),
          ).thenAnswer(
            (_) async => const [ExchangeRateRow(currency: 'USD', rateToBs: 50)],
          );
        },
        build: () => MatchDetailCubit(
          matchesRepository: matchesRepository,
          profileRepository: profileRepository,
          monetizationRepository: monetizationRepository,
          matchId: matchId,
        ),
        act: (cubit) => cubit.load(),
        expect: () => [
          const MatchDetailLoading(),
          isA<MatchDetailLoaded>().having(
            (s) => s.exchangeRates,
            'exchangeRates',
            const [ExchangeRateRow(currency: 'USD', rateToBs: 50)],
          ),
        ],
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
      // Bug reportado en vivo: el layout de cancha mostraba "Pagado"
      // hardcodeado para cualquier participante que no fuera el viewer
      // (court_view.dart vía match_detail_screen.dart _CourtSection.spot()),
      // sin consultar su pago real — por eso se veía invertido según quién
      // mirara. Acá se prueba que el cubit SÍ consulta la transacción real
      // de cada otro participante en vez de asumir que pagó.
      'load no marca pagado a otro participante sin transacción confirmada',
      build: () {
        when(() => matchesRepository.getMatchById(matchId)).thenAnswer(
          (_) async => buildMatch(
            participants: [
              MatchParticipantDto(
                userId: viewerId,
                joinedAt: DateTime.utc(2026, 5, 5),
              ),
              MatchParticipantDto(
                userId: 'user-2',
                joinedAt: DateTime.utc(2026, 5, 5),
              ),
            ],
          ),
        );
        when(
          () => monetizationRepository.listUserTransactions(
            userId: 'user-2',
            limit: any(named: 'limit'),
          ),
        ).thenAnswer(
          (_) async =>
              const UserTransactionsResult(userId: 'user-2', transactions: []),
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
        isA<MatchDetailLoaded>().having(
          (s) => s.participantsConfirmedPayment['user-2'],
          'user-2 confirmed',
          false,
        ),
      ],
    );

    blocTest<MatchDetailCubit, MatchDetailState>(
      'load marca pagado a otro participante con transacción confirmada real',
      build: () {
        when(() => matchesRepository.getMatchById(matchId)).thenAnswer(
          (_) async => buildMatch(
            participants: [
              MatchParticipantDto(
                userId: viewerId,
                joinedAt: DateTime.utc(2026, 5, 5),
              ),
              MatchParticipantDto(
                userId: 'user-2',
                joinedAt: DateTime.utc(2026, 5, 5),
              ),
            ],
          ),
        );
        when(
          () => monetizationRepository.listUserTransactions(
            userId: 'user-2',
            limit: any(named: 'limit'),
          ),
        ).thenAnswer(
          (_) async => UserTransactionsResult(
            userId: 'user-2',
            transactions: [
              TransactionDto(
                id: 'tx-2',
                matchId: matchId,
                userId: 'user-2',
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
        isA<MatchDetailLoaded>().having(
          (s) => s.participantsConfirmedPayment['user-2'],
          'user-2 confirmed',
          true,
        ),
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

    group('cambio de ELO del viewer (issue #129)', () {
      blocTest<MatchDetailCubit, MatchDetailState>(
        'load expone el cambio de ELO del viewer cuando el partido ya '
        'finalizó, afecta ELO y su historial ya tiene una fila para este '
        'match (las 4 confirmaciones ya cerraron el resultado)',
        build: () {
          when(() => matchesRepository.getMatchById(matchId)).thenAnswer(
            (_) async => buildMatch(status: 'FINISHED'),
          );
          when(
            () => profileRepository.getUserRatingHistory(
              userId: viewerId,
              categoryId: 'cat',
              limit: any(named: 'limit'),
            ),
          ).thenAnswer(
            (_) async => [
              // Fila más reciente pero de OTRO match: probar que no se
              // toma a ciegas la primera, sino la que matchea matchId.
              UserRatingHistoryItemDto(
                matchId: 'otro-match',
                resultId: 'r-0',
                previousRating: 1300,
                newRating: 1310,
                kFactor: 20,
                createdAt: DateTime.utc(2026, 5, 7),
              ),
              UserRatingHistoryItemDto(
                matchId: matchId,
                resultId: 'r-1',
                previousRating: 1240,
                newRating: 1254,
                kFactor: 20,
                createdAt: DateTime.utc(2026, 5, 6),
              ),
            ],
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
          isA<MatchDetailLoaded>().having(
            (s) => s.viewerEloChange,
            'viewerEloChange',
            isA<UserRatingHistoryItemDto>()
                .having((e) => e.previousRating, 'previousRating', 1240)
                .having((e) => e.newRating, 'newRating', 1254),
          ),
        ],
      );

      blocTest<MatchDetailCubit, MatchDetailState>(
        'load deja viewerEloChange en null cuando el partido finalizó pero '
        'las confirmaciones todavía no cerraron el resultado (sin fila en '
        'el historial para este match)',
        build: () {
          when(() => matchesRepository.getMatchById(matchId)).thenAnswer(
            (_) async => buildMatch(status: 'FINISHED'),
          );
          when(
            () => profileRepository.getUserRatingHistory(
              userId: viewerId,
              categoryId: 'cat',
              limit: any(named: 'limit'),
            ),
          ).thenAnswer((_) async => const []);
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
              .having((s) => s.viewerEloChange, 'viewerEloChange', isNull),
        ],
      );

      blocTest<MatchDetailCubit, MatchDetailState>(
        'load no consulta el historial de ELO si el partido no finalizó',
        build: () {
          when(() => matchesRepository.getMatchById(matchId))
              .thenAnswer((_) async => buildMatch(status: 'SCHEDULED'));
          return MatchDetailCubit(
            matchesRepository: matchesRepository,
            profileRepository: profileRepository,
            monetizationRepository: monetizationRepository,
            matchId: matchId,
          );
        },
        act: (cubit) => cubit.load(),
        verify: (_) {
          verifyNever(() => profileRepository.getUserRatingHistory(
                userId: any(named: 'userId'),
                categoryId: any(named: 'categoryId'),
                limit: any(named: 'limit'),
              ));
        },
      );

      blocTest<MatchDetailCubit, MatchDetailState>(
        'load no consulta el historial de ELO si el partido no afecta ELO '
        '(amistoso)',
        build: () {
          when(() => matchesRepository.getMatchById(matchId)).thenAnswer(
            (_) async => buildMatch(status: 'FINISHED', affectsElo: false),
          );
          return MatchDetailCubit(
            matchesRepository: matchesRepository,
            profileRepository: profileRepository,
            monetizationRepository: monetizationRepository,
            matchId: matchId,
          );
        },
        act: (cubit) => cubit.load(),
        verify: (_) {
          verifyNever(() => profileRepository.getUserRatingHistory(
                userId: any(named: 'userId'),
                categoryId: any(named: 'categoryId'),
                limit: any(named: 'limit'),
              ));
        },
      );
    });
  });
}

