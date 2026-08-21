import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_registration_dto.dart';

void main() {
  group('TournamentRegistrationDto.fromJson', () {
    test('parses an AUTHENTICATED row with userId set and no guest fields', () {
      final dto = TournamentRegistrationDto.fromJson({
        'id': 'reg-1',
        'tournamentId': 't-1',
        'userId': 'user-1',
        'status': 'CONFIRMED',
        'createdAt': '2024-01-01T00:00:00.000Z',
        'registrationType': 'AUTHENTICATED',
      });

      expect(dto.userId, 'user-1');
      expect(dto.isGuest, isFalse);
      expect(dto.guestName, isNull);
      expect(dto.displayName, 'user-1');
    });

    test('parses a GUEST row with userId:null and guest fields set', () {
      final dto = TournamentRegistrationDto.fromJson({
        'id': 'reg-2',
        'tournamentId': 't-1',
        'userId': null,
        'status': 'PENDING',
        'createdAt': '2024-01-01T00:00:00.000Z',
        'registrationType': 'GUEST',
        'guestName': 'Carlos',
        'guestPhone': '+584121234567',
        'guestEmail': 'carlos@test.com',
        'registeredByUserId': 'organizer-1',
      });

      expect(dto.userId, isNull);
      expect(dto.isGuest, isTrue);
      expect(dto.guestName, 'Carlos');
      expect(dto.guestPhone, '+584121234567');
      expect(dto.guestEmail, 'carlos@test.com');
      expect(dto.registeredByUserId, 'organizer-1');
      expect(dto.displayName, 'Carlos');
    });

    test('defaults registrationType to AUTHENTICATED when absent (backward compat)', () {
      final dto = TournamentRegistrationDto.fromJson({
        'id': 'reg-3',
        'tournamentId': 't-1',
        'userId': 'user-3',
        'status': 'CONFIRMED',
        'createdAt': '2024-01-01T00:00:00.000Z',
      });

      expect(dto.registrationType, 'AUTHENTICATED');
      expect(dto.isGuest, isFalse);
    });
  });
}
