import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/tournaments_api.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/tournaments_repository.dart';

class _MockTournamentsApi extends Mock implements TournamentsApi {}

void main() {
  group('TournamentsRepository', () {
    test('getTournamentSchedule (404) devuelve empty en vez de lanzar', () async {
      final api = _MockTournamentsApi();
      final repo = TournamentsRepository(tournamentsApi: api);

      when(() => api.getTournamentScheduleEnvelope(tournamentId: any(named: 'tournamentId')))
          .thenThrow(
        const AppFailure(code: 'HTTP_404', message: 'No existe schedule.'),
      );

      final res = await repo.getTournamentSchedule(tournamentId: 't-1');
      expect(res.rounds, isEmpty);
    });

    test('generateTournamentSchedule (501) lanza unsupported', () async {
      final api = _MockTournamentsApi();
      final repo = TournamentsRepository(tournamentsApi: api);

      when(() => api.generateTournamentScheduleEnvelope(tournamentId: any(named: 'tournamentId')))
          .thenThrow(
        const AppFailure(code: 'HTTP_501', message: 'No soportado.'),
      );

      expect(
        () => repo.generateTournamentSchedule(tournamentId: 't-1'),
        throwsA(
          predicate(
            (e) => e is AppFailure && e.code == 'SCHEDULE_UNSUPPORTED',
          ),
        ),
      );
    });

    test('generateTournamentSchedule (409) lanza conflict', () async {
      final api = _MockTournamentsApi();
      final repo = TournamentsRepository(tournamentsApi: api);

      when(() => api.generateTournamentScheduleEnvelope(tournamentId: any(named: 'tournamentId')))
          .thenThrow(
        const AppFailure(code: 'HTTP_409', message: 'Conflicto.'),
      );

      expect(
        () => repo.generateTournamentSchedule(tournamentId: 't-1'),
        throwsA(
          predicate(
            (e) => e is AppFailure && e.code == 'SCHEDULE_CONFLICT',
          ),
        ),
      );
    });
  });
}

