import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/tournaments/data/models/viewer_tournament_dto.dart';

void main() {
  group('ViewerTournamentDto', () {
    //? Forma real de GET /api/v1/users/me/tournaments
    //? (`tournament_query_repository.ts:81-90`): un `ViewerTournamentItemDTO`
    //? por torneo, con el torneo anidado bajo `tournament`.
    test('parses a confirmed registration nested under "tournament"', () {
      final json = {
        'tournament': {
          'id': 't-1',
          'name': 'Copa Cuádrala',
          'status': 'OPEN',
          'sportName': 'Padel',
          'categoryId': 'cat-1',
          'categoryName': '7ma',
          'startsAt': null,
          'registrationCount': 8,
        },
        'registrationStatus': 'CONFIRMED',
        'pendingInvitationId': null,
        'isOrganizer': false,
        'pendingRegistrationsCount': null,
      };

      final dto = ViewerTournamentDto.fromJson(json);

      expect(dto.tournament.id, 't-1');
      expect(dto.tournament.name, 'Copa Cuádrala');
      expect(dto.registrationStatus, 'CONFIRMED');
      expect(dto.pendingInvitationId, isNull);
      expect(dto.isOrganizer, false);
      expect(dto.pendingRegistrationsCount, isNull);
    });

    //? El organizador ve `pendingRegistrationsCount`; cualquier otro rol lo
    //? recibe en `null` (`tournament_query_repository.ts:88-89`).
    test('parses an invited organizer with a pending-registrations count', () {
      final json = {
        'tournament': {
          'id': 't-2',
          'name': 'Nocturno Chacao',
          'status': 'OPEN',
          'sportName': 'Padel',
          'categoryId': 'cat-2',
          'categoryName': '5ta',
          'startsAt': null,
          'registrationCount': 4,
        },
        'registrationStatus': null,
        'pendingInvitationId': 'inv-1',
        'isOrganizer': true,
        'pendingRegistrationsCount': 3,
      };

      final dto = ViewerTournamentDto.fromJson(json);

      expect(dto.tournament.id, 't-2');
      expect(dto.registrationStatus, isNull);
      expect(dto.pendingInvitationId, 'inv-1');
      expect(dto.isOrganizer, true);
      expect(dto.pendingRegistrationsCount, 3);
    });
  });
}
