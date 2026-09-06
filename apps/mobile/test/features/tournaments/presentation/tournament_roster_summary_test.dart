import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_registration_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/tournament_roster_summary.dart';
import 'package:flutter_test/flutter_test.dart';

TournamentRegistrationDto regSV(String id, String status, {String? partner}) =>
    TournamentRegistrationDto(
      id: id,
      tournamentId: 't-1',
      userId: 'user-$id',
      userName: 'Jugador $id',
      status: status,
      createdAt: DateTime(2026),
      partnerRegistrationId: partner,
    );

void main() {
  group('summarizeRoster', () {
    test('should count confirmed and pending registrations', () {
      final s = summarizeRoster(
        registrations: [
          regSV('a', 'CONFIRMED'),
          regSV('b', 'CONFIRMED'),
          regSV('c', 'PENDING'),
        ],
        paired: false,
      );

      expect(s.confirmed, 2);
      expect(s.pending, 1);
    });

    test('should ignore withdrawn registrations', () {
      final s = summarizeRoster(
        registrations: [regSV('a', 'CONFIRMED'), regSV('b', 'WITHDRAWN')],
        paired: false,
      );

      expect(s.confirmed, 1);
      expect(s.hasUnresolved, isFalse);
    });

    //? En torneo individual nadie está "sin pareja": contarlo sería una
    //? advertencia falsa que aparecería en todos los torneos.
    test('should never report unpaired players in a singles tournament', () {
      final s = summarizeRoster(
        registrations: [regSV('a', 'CONFIRMED'), regSV('b', 'CONFIRMED')],
        paired: false,
      );

      expect(s.unpaired, 0);
      expect(s.warning, isNull);
    });

    test('should count who is missing a partner in a pairs tournament', () {
      final s = summarizeRoster(
        registrations: [
          regSV('a', 'CONFIRMED', partner: 'b'),
          regSV('b', 'CONFIRMED', partner: 'a'),
          regSV('c', 'CONFIRMED'),
        ],
        paired: true,
      );

      expect(s.unpaired, 1);
    });

    //? Se resuelven distinto: a los pendientes se los confirma, a los sin
    //? pareja hay que emparejarlos.
    test('should tell the two problems apart in the warning', () {
      final s = summarizeRoster(
        registrations: [
          regSV('a', 'PENDING', partner: 'b'),
          regSV('b', 'PENDING', partner: 'a'),
          regSV('c', 'CONFIRMED'),
        ],
        paired: true,
      );

      expect(s.warning, contains('2 inscripciones sin confirmar'));
      expect(s.warning, contains('1 jugador sin pareja'));
    });

    test('should use singular for a single pending registration', () {
      final s = summarizeRoster(
        registrations: [regSV('a', 'PENDING')],
        paired: false,
      );

      expect(s.warning, contains('1 inscripción sin confirmar'));
    });

    test('should say nothing when everything is resolved', () {
      final s = summarizeRoster(
        registrations: [
          regSV('a', 'CONFIRMED', partner: 'b'),
          regSV('b', 'CONFIRMED', partner: 'a'),
        ],
        paired: true,
      );

      expect(s.hasUnresolved, isFalse);
      expect(s.warning, isNull);
    });
  });
}
