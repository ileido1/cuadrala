import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_schedule_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/tournaments_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_schedule_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_schedule_state.dart';

class _MockTournamentsRepository extends Mock implements TournamentsRepository {}

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
        when(() => tournamentsRepository.getTournamentSchedule(tournamentId: tournamentId))
            .thenAnswer(
          (_) async => const TournamentScheduleDto(
            rounds: [],
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
        const TournamentScheduleEmpty(),
      ],
    );

    blocTest<TournamentScheduleCubit, TournamentScheduleState>(
      'load (ok) emite loading→success',
      build: () {
        when(() => tournamentsRepository.getTournamentSchedule(tournamentId: tournamentId))
            .thenAnswer(
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
            participantUserIds: any(named: 'participantUserIds'),
          ),
        ).thenThrow(
          const AppFailure(code: 'HTTP_501', message: 'No soportado.'),
        );
        return TournamentScheduleCubit(
          tournamentsRepository: tournamentsRepository,
          tournamentId: tournamentId,
        );
      },
      act: (cubit) => cubit.generate(participantUserIds: const []),
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
            participantUserIds: any(named: 'participantUserIds'),
          ),
        ).thenThrow(
          const AppFailure(code: 'HTTP_409', message: 'Conflicto.'),
        );
        return TournamentScheduleCubit(
          tournamentsRepository: tournamentsRepository,
          tournamentId: tournamentId,
        );
      },
      act: (cubit) => cubit.generate(participantUserIds: const []),
      expect: () => [
        const TournamentScheduleGenerating(),
        const TournamentScheduleConflict(),
      ],
    );
  });
}

