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

      when(
        () => api.generateTournamentScheduleEnvelope(
          tournamentId: any(named: 'tournamentId'),
          body: any(named: 'body'),
        ),
      ).thenThrow(
        const AppFailure(code: 'HTTP_501', message: 'No soportado.'),
      );

      expect(
        () => repo.generateTournamentSchedule(
          tournamentId: 't-1',
          participantUserIds: const [],
        ),
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

      when(
        () => api.generateTournamentScheduleEnvelope(
          tournamentId: any(named: 'tournamentId'),
          body: any(named: 'body'),
        ),
      ).thenThrow(
        const AppFailure(code: 'HTTP_409', message: 'Conflicto.'),
      );

      expect(
        () => repo.generateTournamentSchedule(
          tournamentId: 't-1',
          participantUserIds: const [],
        ),
        throwsA(
          predicate(
            (e) => e is AppFailure && e.code == 'SCHEDULE_CONFLICT',
          ),
        ),
      );
    });

    test('inviteGuestToTournament posts {name,phone,email} and parses the guest registration',
        () async {
      final api = _MockTournamentsApi();
      final repo = TournamentsRepository(tournamentsApi: api);

      when(
        () => api.inviteGuestTournamentParticipantEnvelope(
          tournamentId: any(named: 'tournamentId'),
          body: any(named: 'body'),
        ),
      ).thenAnswer(
        (_) async => {
          'success': true,
          'message': 'Invitado agregado correctamente.',
          'data': {
            'id': 'reg-guest-1',
            'tournamentId': 't-1',
            'userId': null,
            'status': 'PENDING',
            'createdAt': '2024-01-01T00:00:00.000Z',
            'registrationType': 'GUEST',
            'guestName': 'Carlos',
            'guestPhone': '+584121234567',
            'registeredByUserId': 'organizer-1',
          },
        },
      );

      final result = await repo.inviteGuestToTournament(
        tournamentId: 't-1',
        name: 'Carlos',
        phone: '+584121234567',
      );

      expect(result.isGuest, isTrue);
      expect(result.guestName, 'Carlos');
      expect(result.status, 'PENDING');
      verify(
        () => api.inviteGuestTournamentParticipantEnvelope(
          tournamentId: 't-1',
          body: {'name': 'Carlos', 'phone': '+584121234567'},
        ),
      ).called(1);
    });

    test('inviteGuestToTournament (409 tournament closed) rethrows AppFailure unchanged',
        () async {
      final api = _MockTournamentsApi();
      final repo = TournamentsRepository(tournamentsApi: api);

      when(
        () => api.inviteGuestTournamentParticipantEnvelope(
          tournamentId: any(named: 'tournamentId'),
          body: any(named: 'body'),
        ),
      ).thenThrow(
        const AppFailure(code: 'TORNEO_CERRADO', message: 'El torneo no acepta invitados.'),
      );

      expect(
        () => repo.inviteGuestToTournament(tournamentId: 't-1', name: 'Carlos'),
        throwsA(predicate((e) => e is AppFailure && e.code == 'TORNEO_CERRADO')),
      );
    });

    test('confirmRegistration patches {status:CONFIRMED} and parses the updated registration',
        () async {
      final api = _MockTournamentsApi();
      final repo = TournamentsRepository(tournamentsApi: api);

      when(
        () => api.updateTournamentRegistrationStatusEnvelope(
          tournamentId: any(named: 'tournamentId'),
          registrationId: any(named: 'registrationId'),
          body: any(named: 'body'),
        ),
      ).thenAnswer(
        (_) async => {
          'success': true,
          'message': 'Inscripción confirmada correctamente.',
          'data': {
            'id': 'reg-guest-1',
            'tournamentId': 't-1',
            'userId': null,
            'status': 'CONFIRMED',
            'createdAt': '2024-01-01T00:00:00.000Z',
            'registrationType': 'GUEST',
            'guestName': 'Carlos',
          },
        },
      );

      final result = await repo.confirmRegistration(
        tournamentId: 't-1',
        registrationId: 'reg-guest-1',
      );

      expect(result.status, 'CONFIRMED');
      verify(
        () => api.updateTournamentRegistrationStatusEnvelope(
          tournamentId: 't-1',
          registrationId: 'reg-guest-1',
          body: {'status': 'CONFIRMED'},
        ),
      ).called(1);
    });

    test('confirmRegistration (403 non-organizer) rethrows AppFailure unchanged', () async {
      final api = _MockTournamentsApi();
      final repo = TournamentsRepository(tournamentsApi: api);

      when(
        () => api.updateTournamentRegistrationStatusEnvelope(
          tournamentId: any(named: 'tournamentId'),
          registrationId: any(named: 'registrationId'),
          body: any(named: 'body'),
        ),
      ).thenThrow(const AppFailure(code: 'NO_AUTORIZADO', message: 'No autorizado.'));

      expect(
        () => repo.confirmRegistration(tournamentId: 't-1', registrationId: 'reg-guest-1'),
        throwsA(predicate((e) => e is AppFailure && e.code == 'NO_AUTORIZADO')),
      );
    });

    test('removeRegistration calls DELETE with tournamentId and registrationId', () async {
      final api = _MockTournamentsApi();
      final repo = TournamentsRepository(tournamentsApi: api);

      when(
        () => api.deleteTournamentRegistration(
          tournamentId: any(named: 'tournamentId'),
          registrationId: any(named: 'registrationId'),
        ),
      ).thenAnswer((_) async {});

      await repo.removeRegistration(tournamentId: 't-1', registrationId: 'reg-guest-1');

      verify(
        () => api.deleteTournamentRegistration(
          tournamentId: 't-1',
          registrationId: 'reg-guest-1',
        ),
      ).called(1);
    });

    test('removeRegistration (409 tournament in progress) rethrows AppFailure unchanged',
        () async {
      final api = _MockTournamentsApi();
      final repo = TournamentsRepository(tournamentsApi: api);

      when(
        () => api.deleteTournamentRegistration(
          tournamentId: any(named: 'tournamentId'),
          registrationId: any(named: 'registrationId'),
        ),
      ).thenThrow(
        const AppFailure(code: 'TORNEO_CERRADO', message: 'El torneo ya está en curso.'),
      );

      expect(
        () => repo.removeRegistration(tournamentId: 't-1', registrationId: 'reg-guest-1'),
        throwsA(predicate((e) => e is AppFailure && e.code == 'TORNEO_CERRADO')),
      );
    });
  });
}

