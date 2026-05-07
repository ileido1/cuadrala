import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_scoreboard_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/tournaments_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_scoreboard_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_scoreboard_state.dart';

class _MockTournamentsRepository extends Mock implements TournamentsRepository {}

void main() {
  group('TournamentScoreboardCubit', () {
    late _MockTournamentsRepository tournamentsRepository;

    setUp(() {
      tournamentsRepository = _MockTournamentsRepository();
    });

    const tournamentId = 't-1';

    blocTest<TournamentScoreboardCubit, TournamentScoreboardState>(
      'load (vacío) emite loading→empty',
      build: () {
        when(() => tournamentsRepository.getTournamentScoreboard(tournamentId: tournamentId))
            .thenAnswer((_) async => const TournamentScoreboardDto(rows: []));
        return TournamentScoreboardCubit(
          tournamentsRepository: tournamentsRepository,
          tournamentId: tournamentId,
        );
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        const TournamentScoreboardLoading(),
        const TournamentScoreboardEmpty(),
      ],
    );

    blocTest<TournamentScoreboardCubit, TournamentScoreboardState>(
      'load (ok) emite loading→success',
      build: () {
        when(() => tournamentsRepository.getTournamentScoreboard(tournamentId: tournamentId))
            .thenAnswer(
          (_) async => const TournamentScoreboardDto(
            rows: [
              TournamentScoreboardRowDto(
                teamId: 'team-1',
                teamName: 'Equipo 1',
                points: 3,
              ),
            ],
          ),
        );
        return TournamentScoreboardCubit(
          tournamentsRepository: tournamentsRepository,
          tournamentId: tournamentId,
        );
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        const TournamentScoreboardLoading(),
        isA<TournamentScoreboardSuccess>()
            .having((s) => s.scoreboard.rows.length, 'rows.length', 1),
      ],
    );

    blocTest<TournamentScoreboardCubit, TournamentScoreboardState>(
      'load (error) emite loading→error',
      build: () {
        when(() => tournamentsRepository.getTournamentScoreboard(tournamentId: tournamentId))
            .thenThrow(
          const AppFailure(code: 'HTTP_500', message: 'Error cargando tabla.'),
        );
        return TournamentScoreboardCubit(
          tournamentsRepository: tournamentsRepository,
          tournamentId: tournamentId,
        );
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        const TournamentScoreboardLoading(),
        isA<TournamentScoreboardError>()
            .having((s) => s.message, 'message', 'Error cargando tabla.'),
      ],
    );
  });
}

