import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_schedule_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/tournaments_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_schedule_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_schedule_state.dart';

class _MockTournamentsRepository extends Mock
    implements TournamentsRepository {}

void main() {
  group('TournamentScheduleCubit', () {
    late _MockTournamentsRepository tournamentsRepository;

    setUp(() {
      tournamentsRepository = _MockTournamentsRepository();
    });

    const tournamentId = 't-1';

    blocTest<TournamentScheduleCubit, TournamentScheduleState>(
      'load (vacío) emite loading→empty',
      build: () {
        when(
          () => tournamentsRepository.getTournamentSchedule(
            tournamentId: tournamentId,
          ),
        ).thenAnswer((_) async => const TournamentScheduleDto(rounds: []));
        return TournamentScheduleCubit(
          tournamentsRepository: tournamentsRepository,
          tournamentId: tournamentId,
        );
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        const TournamentScheduleLoading(),
        const TournamentScheduleEmpty(),
      ],
    );

    blocTest<TournamentScheduleCubit, TournamentScheduleState>(
      'load (ok) emite loading→success',
      build: () {
        when(
          () => tournamentsRepository.getTournamentSchedule(
            tournamentId: tournamentId,
          ),
        ).thenAnswer(
          (_) async => const TournamentScheduleDto(
            rounds: [
              TournamentScheduleRoundDto(
                name: 'R1',
                matches: [
                  TournamentScheduleMatchDto(
                    id: 'm-1',
                    label: 'M1',
                    status: 'SCHEDULED',
                  ),
                ],
              ),
            ],
          ),
        );
        return TournamentScheduleCubit(
          tournamentsRepository: tournamentsRepository,
          tournamentId: tournamentId,
        );
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        const TournamentScheduleLoading(),
        isA<TournamentScheduleSuccess>(),
      ],
    );

    blocTest<TournamentScheduleCubit, TournamentScheduleState>(
      'generate (501) emite generating→unsupported',
      build: () {
        when(
          () => tournamentsRepository.generateTournamentSchedule(
            tournamentId: tournamentId,
          ),
        ).thenThrow(
          const AppFailure(code: 'HTTP_501', message: 'No soportado.'),
        );
        return TournamentScheduleCubit(
          tournamentsRepository: tournamentsRepository,
          tournamentId: tournamentId,
        );
      },
      act: (cubit) => cubit.generate(),
      expect: () => [
        const TournamentScheduleGenerating(),
        const TournamentScheduleUnsupported(),
      ],
    );

    blocTest<TournamentScheduleCubit, TournamentScheduleState>(
      'generate (409) emite generating→conflict',
      build: () {
        when(
          () => tournamentsRepository.generateTournamentSchedule(
            tournamentId: tournamentId,
          ),
        ).thenThrow(const AppFailure(code: 'HTTP_409', message: 'Conflicto.'));
        return TournamentScheduleCubit(
          tournamentsRepository: tournamentsRepository,
          tournamentId: tournamentId,
        );
      },
      act: (cubit) => cubit.generate(),
      expect: () => [
        const TournamentScheduleGenerating(),
        const TournamentScheduleConflict(),
      ],
    );

    blocTest<TournamentScheduleCubit, TournamentScheduleState>(
      'submitMatchResult (M11c): posts via the results endpoint, then reloads the schedule',
      build: () {
        when(
          () => tournamentsRepository.registerMatchResult(
            tournamentId: tournamentId,
            matchId: 'match-1',
            scores: const [
              TournamentScheduleMatchScoreDto(userId: 'u1', points: 6),
              TournamentScheduleMatchScoreDto(userId: 'u2', points: 3),
            ],
          ),
        ).thenAnswer((_) async {});
        when(
          () => tournamentsRepository.getTournamentSchedule(
            tournamentId: tournamentId,
          ),
        ).thenAnswer((_) async => const TournamentScheduleDto(rounds: []));
        return TournamentScheduleCubit(
          tournamentsRepository: tournamentsRepository,
          tournamentId: tournamentId,
        );
      },
      act: (cubit) => cubit.submitMatchResult(
        matchId: 'match-1',
        scores: const [
          TournamentScheduleMatchScoreDto(userId: 'u1', points: 6),
          TournamentScheduleMatchScoreDto(userId: 'u2', points: 3),
        ],
      ),
      expect: () => [
        const TournamentScheduleLoading(),
        const TournamentScheduleEmpty(),
      ],
      verify: (_) {
        verify(
          () => tournamentsRepository.registerMatchResult(
            tournamentId: tournamentId,
            matchId: 'match-1',
            scores: const [
              TournamentScheduleMatchScoreDto(userId: 'u1', points: 6),
              TournamentScheduleMatchScoreDto(userId: 'u2', points: 3),
            ],
          ),
        ).called(1);
      },
    );

    blocTest<TournamentScheduleCubit, TournamentScheduleState>(
      'submitMatchResult (M11c): a duplicate result (409) propagates and does not reload',
      build: () {
        when(
          () => tournamentsRepository.registerMatchResult(
            tournamentId: tournamentId,
            matchId: 'match-1',
            scores: any(named: 'scores'),
          ),
        ).thenThrow(
          const AppFailure(
            code: 'RESULTADO_YA_CARGADO',
            message: 'Ya cargado.',
          ),
        );
        return TournamentScheduleCubit(
          tournamentsRepository: tournamentsRepository,
          tournamentId: tournamentId,
        );
      },
      act: (cubit) => cubit.submitMatchResult(
        matchId: 'match-1',
        scores: const [
          TournamentScheduleMatchScoreDto(userId: 'u1', points: 6),
        ],
      ),
      expect: () => <TournamentScheduleState>[],
      errors: () => [isA<AppFailure>()],
      verify: (_) {
        verifyNever(
          () => tournamentsRepository.getTournamentSchedule(
            tournamentId: tournamentId,
          ),
        );
      },
    );

    blocTest<TournamentScheduleCubit, TournamentScheduleState>(
      'advanceGroupsPlusKnockout advances the phase then reloads the schedule',
      build: () {
        when(
          () => tournamentsRepository.advanceGroupsPlusKnockout(
            tournamentId: tournamentId,
          ),
        ).thenAnswer((_) async {});
        when(
          () => tournamentsRepository.getTournamentSchedule(
            tournamentId: tournamentId,
          ),
        ).thenAnswer(
          (_) async => const TournamentScheduleDto(
            rounds: [
              TournamentScheduleRoundDto(
                name: 'Ronda 3',
                matches: [
                  TournamentScheduleMatchDto(
                    id: '3-1',
                    label: 'Ana vs Bea',
                    status: 'SCHEDULED',
                    matchId: 'semifinal-1',
                  ),
                ],
              ),
            ],
          ),
        );
        return TournamentScheduleCubit(
          tournamentsRepository: tournamentsRepository,
          tournamentId: tournamentId,
        );
      },
      act: (cubit) => cubit.advanceGroupsPlusKnockout(),
      expect: () => [
        const TournamentScheduleLoading(),
        isA<TournamentScheduleSuccess>(),
      ],
      verify: (_) {
        verifyInOrder([
          () => tournamentsRepository.advanceGroupsPlusKnockout(
            tournamentId: tournamentId,
          ),
          () => tournamentsRepository.getTournamentSchedule(
            tournamentId: tournamentId,
          ),
        ]);
      },
    );
  });
}
